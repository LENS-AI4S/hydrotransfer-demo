"""Read-only NAS cube preview service. No raw-file, array or arbitrary-area API."""
from collections import OrderedDict, defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import hashlib, hmac, io, json, math, os, re, threading, time
from urllib.parse import urlsplit
import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling
from PIL import Image
import xarray as xr
import zarr

FIELDS={
 'soil_sand':('砂粒含量','% 质量',0,100,'soil'),
 'soil_silt':('粉粒含量','% 质量',0,100,'soil'),
 'soil_clay':('黏粒含量','% 质量',0,100,'soil'),
 'soil_bulk':('土壤容重','g/cm³',0,2,'soil'),
 'soil_org_carbon':('有机碳','% 质量',0,10,'soil'),
 'soil_ph_water':('水浸 pH','pH',0,14,'soil'),
 'soil_total_n':('全氮','g/kg',0,10,'soil'),
 'soil_awc_rootzone':('根区有效储水量','mm',0,300,'root'),
 'elevation':('地形高程','m',0,3000,'dem'),
 'land_cover':('土地覆盖','原始分类编码',0,0,'landcover')}
DEPTHS=['0–20 cm','20–40 cm','40–60 cm','60–80 cm','80–100 cm','100–150 cm','150–200 cm']
LAND_CODES=[10,11,12,20,51,52,61,62,71,72,81,82,91,92,120,121,122,130,140,150,152,153,181,182,183,184,185,186,187,190,200,201,202,210,220]
LAND_NAMES=['雨养耕地','草本覆盖耕地','乔木 / 灌木耕地','灌溉耕地','疏林常绿阔叶林','密林常绿阔叶林','疏林落叶阔叶林','密林落叶阔叶林','疏林常绿针叶林','密林常绿针叶林','疏林落叶针叶林','密林落叶针叶林','疏林混交林','密林混交林','灌丛','常绿灌丛','落叶灌丛','草地','地衣与苔藓','稀疏植被','稀疏灌丛','稀疏草本','沼泽林','沼泽','洪泛平地','盐渍地','红树林','盐沼','潮滩','不透水面','裸地','固结裸地','未固结裸地','水体','永久冰雪']
LAND_HEX=['#ffff64','#ffff64','#ffff00','#aaf0f0','#4c7300','#006400','#aac800','#00a000','#005000','#003c00','#286400','#285000','#a0b432','#788200','#966400','#964b00','#966400','#ffb432','#ffdcd2','#ffebaf','#ffd278','#ffebaf','#00a884','#73ffdf','#9ebbd7','#828282','#f57ab6','#66cdab','#444f89','#c31400','#fff5d7','#dcdcdc','#fff5d7','#0046c8','#ffffff']
LAND_CLASSES=list(zip(LAND_NAMES,LAND_HEX))
LAND_CODE_COLORS={code:tuple(int(color[i:i+2],16) for i in [1,3,5]) for code,color in zip(LAND_CODES,LAND_HEX)}
COLOR_SOURCES={
 'landcover':{'name':'GLC_FCS30D 官方用户指南 · 35类RGB','url':'https://zenodo.org/records/15063683/files/GLC_FCS30D%20UserGuides.pdf'},
 'soil':{'name':'ColorBrewer 连续属性顺序色标','url':'https://github.com/axismaps/colorbrewer'},
 'dem':{'name':'GMT geo 陆地高程色标（重标度至当前范围）','url':'https://github.com/GenericMappingTools/gmt/blob/master/share/cpt/gmt/geo.cpt'}}
_SCHEMES={
 'YlOrBr':['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#993404','#662506'],
 'Oranges':['#fff5eb','#fee6ce','#fdd0a2','#fdae6b','#fd8d3c','#f16913','#d94801','#a63603','#7f2704'],
 'YlGn':['#ffffe5','#f7fcb9','#d9f0a3','#addd8e','#78c679','#41ab5d','#238443','#006837','#004529'],
 'YlGnBu':['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#253494','#081d58'],
 'geo':['#006147','#107a2f','#e8d77d','#a14300','#643219','#6e6d6c','#fffefd']}
SCHEME_KEYS={'soil_sand':'YlOrBr','soil_clay':'Oranges','soil_org_carbon':'YlGn','soil_awc_rootzone':'YlGnBu','elevation':'geo','soil_moisture':'YlGnBu'}
def palette_for(key):
    anchors=_SCHEMES[SCHEME_KEYS.get(key,'YlOrBr')]
    rgb=np.asarray([[int(c[i:i+2],16) for i in [1,3,5]] for c in anchors])
    return np.asarray([np.interp(np.linspace(0,len(anchors)-1,12),np.arange(len(anchors)),rgb[:,i]) for i in range(3)]).T.round().astype('uint8')

def geometry_bounds(geometry):
    pts=[]
    def collect(a):
        if len(a)>1 and isinstance(a[0],(int,float)):pts.append(a[:2])
        else:
            for x in a:collect(x)
    collect(geometry['coordinates']);a=np.asarray(pts)
    return [*a.min(axis=0),*a.max(axis=0)]

class CubePreview:
    def __init__(self,root,basin_config):
        self.root=Path(root)
        self.basins={str(f['properties']['HYBAS_ID']):f for f in json.loads(Path(basin_config).read_text(encoding='utf-8'))['features']}
        if not 1<=len(self.basins)<=20:raise ValueError('Configure 1–20 allowed basins')
        self.info={k:json.loads((self.root/f'{k}_ready.json').read_text(encoding='utf-8')) for k in ['soil','landcover','dem']}
        self.landcover={2020:self.info['landcover']}
        for year in [2000,2005,2010,2015]:
            path=self.root/f'landcover_{year}_ready.json'
            if path.exists():self.landcover[year]=json.loads(path.read_text(encoding='utf-8'))
        self.land_classes_by_year={}
        self.store=zarr.storage.ZipStore(self.asset_path(self.info['soil']['lookup']),mode='r')
        self.lookup=xr.open_zarr(self.store,consolidated=True)
        self.cache=OrderedDict();self.lock=threading.Lock();self.spatial={};self.field_arrays={};self.present_classes={}

    def asset_path(self,value):
        original=Path(value)
        if original.exists():return original
        normalized=str(value).replace('\\','/')
        if '/data/' not in normalized:raise ValueError('Asset must be inside the mounted data directory')
        relative=normalized.rsplit('/data/',1)[1]
        candidate=(self.root.parent/relative).resolve()
        if not candidate.is_relative_to(self.root.parent.resolve()):raise ValueError('Asset outside data mount')
        return candidate

    def catalog(self):
        return {'service':'HydroTransfer protected cube preview','schema_version':1,
            'basins':[{'hybas_id':key,'name':f['properties'].get('city',key)} for key,f in self.basins.items()],
            'variables':[{'key':k,'name':v[0],'unit':v[1],'min':v[2],'max':v[3],'kind':v[4]} for k,v in FIELDS.items()],
            'depths':DEPTHS,'landcover_year':2020,'landcover_years':sorted(self.landcover),'preview_long_edge_cells':96,'continuous_color_bins':12,
            'raw_download':False,'array_access':False,'point_values':False,
            'note':'固定试点的低分辨率预览图；不提供原始文件、数值数组或任意范围请求。图片本身仍可被保存。'}

    def read_raster(self,path,shape,tr,resampling=Resampling.nearest):
        out=np.full(shape,np.nan,dtype='float32')
        with rasterio.open(self.asset_path(path)) as src:
            reproject(rasterio.band(src,1),out,src_transform=src.transform,src_crs=src.crs,src_nodata=src.nodata,
                dst_transform=tr,dst_crs='EPSG:4326',dst_nodata=np.nan,resampling=resampling)
        return out

    def render(self,basin,key,depth,year=2020):
        if basin not in self.basins or key not in FIELDS:raise ValueError('Unknown selection')
        kind=FIELDS[key][4]
        if kind=='landcover' and year not in self.landcover:raise ValueError('Land-cover year not ready')
        if not 0<=depth<7 or (kind!='soil' and depth!=0):raise ValueError('Invalid depth')
        cache_key=(basin,key,depth,year if kind=='landcover' else None)
        with self.lock:
            if cache_key in self.cache:
                self.cache.move_to_end(cache_key);return self.cache[cache_key]
            f=self.basins[basin];bounds=geometry_bounds(f['geometry']);w,s,e,n=bounds
            # Small fixed grid and quantized colors, regardless of user-supplied parameters.
            dx=e-w;dy=n-s
            width=max(4,round(96*dx/max(dx,dy)));height=max(4,round(96*dy/max(dx,dy)))
            shape=(height,width);tr=from_bounds(*bounds,width,height)
            mask=geometry_mask([f['geometry']],out_shape=shape,transform=tr,invert=True,all_touched=False)
            if kind in ['soil','root']:
                if basin not in self.spatial:
                    a=self.read_raster(self.info['soil']['cog'],shape,tr)
                    self.spatial[basin]=np.clip(np.where(np.isfinite(a),a,0).astype(int),0,self.lookup.sizes['soil_unit']-1)
                ids=self.spatial[basin]
                if key not in self.field_arrays:self.field_arrays[key]=self.lookup[key.removeprefix('soil_')].values
                values=self.field_arrays[key]
                if kind=='soil':a=values[depth,ids]
                else:a=values[ids]
            elif kind=='landcover':
                a=self.read_raster(self.landcover[year]['native_cog'],shape,tr)
                a[np.isin(a,[0,250,255])]=np.nan
            else:
                a=np.full(shape,np.nan,dtype='float32')
                for tile in self.info['dem']['tiles']:
                    l,b,r,t=tile['bbox']
                    if r>w and l<e and t>s and b<n:
                        v=self.read_raster(tile['path'],shape,tr,Resampling.average);a=np.where(np.isfinite(v),v,a)
            good=mask&np.isfinite(a);picture=np.zeros((*shape,4),dtype='uint8')
            picture[mask]=[187,199,208,255]
            if kind=='landcover':
                codes=np.where(good,a,-1).astype(int)
                classes=sorted(int(c) for c in np.unique(codes[good]))
                self.land_classes_by_year.setdefault(basin,{})[str(year)]=classes
                if year==2020:self.present_classes[basin]=classes
                for code,color in LAND_CODE_COLORS.items():picture[(codes==code)&good,:3]=color
            else:
                lo,hi=FIELDS[key][2:4];bins=np.floor(np.clip((np.nan_to_num(a)-lo)/(hi-lo),0,1)*11).astype(int)
                picture[good,:3]=palette_for(key)[bins[good]]
            picture[good,3]=255
            image=Image.fromarray(picture);scale=8
            image=image.resize((width*scale,height*scale),Image.Resampling.NEAREST)
            buf=io.BytesIO();image.save(buf,format='PNG');result=buf.getvalue()
            self.cache[cache_key]=result
            while len(self.cache)>48:self.cache.popitem(last=False)
            return result

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def headers_out(self,status,content_type='application/json',length=0):
        self.send_response(status);self.send_header('Content-Type',content_type)
        self.send_header('Content-Length',str(length));self.send_header('Cache-Control','private, no-store')
        self.send_header('X-Content-Type-Options','nosniff');self.send_header('X-Robots-Tag','noindex, noarchive')
        origin=self.headers.get('Origin')
        if origin in self.server.origins:
            self.send_header('Access-Control-Allow-Origin',origin);self.send_header('Vary','Origin')
            self.send_header('Access-Control-Allow-Headers','Authorization');self.send_header('Access-Control-Allow-Methods','GET, OPTIONS')
        self.end_headers()
    def json_out(self,status,obj):
        b=json.dumps(obj,ensure_ascii=False).encode();self.headers_out(status,length=len(b));self.wfile.write(b)
    def do_OPTIONS(self):
        if self.headers.get('Origin') not in self.server.origins:self.json_out(403,{'error':'Origin not allowed'});return
        self.headers_out(204)
    def do_GET(self):
        path=urlsplit(self.path).path
        if path=='/health':self.json_out(200,{'service':'HydroTransfer cube preview','ready':True});return
        origin=self.headers.get('Origin')
        if origin and origin not in self.server.origins:self.json_out(403,{'error':'Origin not allowed'});return
        if not hmac.compare_digest(self.headers.get('Authorization',''),'Bearer '+self.server.token):
            self.json_out(401,{'error':'Preview access code required'});return
        with self.server.rate_lock:
            now=time.monotonic();hits=self.server.hits[self.client_address[0]]
            while hits and hits[0]<now-60:hits.popleft()
            if len(hits)>=45:self.json_out(429,{'error':'Too many preview requests'});return
            hits.append(now)
        if path=='/api/cube/catalog':self.json_out(200,self.server.cube.catalog());return
        match=re.fullmatch(r'/api/cube/preview/(\d{10})/([a-z_]+)/([0-6])(?:/(2000|2005|2010|2015|2020))?\.png',path)
        if not match or urlsplit(self.path).query:
            self.json_out(404,{'error':'No raw file or array endpoint'});return
        try:
            if match[4] and match[2]!='land_cover':raise ValueError('Year only applies to land cover')
            b=self.server.cube.render(match[1],match[2],int(match[3]),year=int(match[4] or 2020))
            self.headers_out(200,'image/png',len(b));self.wfile.write(b)
        except ValueError:self.json_out(400,{'error':'Selection is not allowed'})
        except Exception:self.json_out(503,{'error':'Preview temporarily unavailable'})

def main():
    token=os.environ.get('CUBE_PREVIEW_TOKEN','')
    if len(token)<16:raise SystemExit('Set CUBE_PREVIEW_TOKEN to a private random value of at least 16 characters')
    root=os.environ['HYDRO_CUBE_ROOT'];config=os.environ['CUBE_BASINS_FILE']
    server=ThreadingHTTPServer((os.environ.get('CUBE_BIND','127.0.0.1'),int(os.environ.get('CUBE_PORT','8767'))),Handler)
    server.token=token;server.origins=set(os.environ.get('CUBE_ALLOWED_ORIGINS','http://127.0.0.1:8766').split(','))
    server.rate_lock=threading.Lock();server.hits=defaultdict(deque);server.cube=CubePreview(root,config)
    print('Protected cube preview ready; raw downloads and array endpoints disabled.',flush=True)
    server.serve_forever()
if __name__=='__main__':main()
