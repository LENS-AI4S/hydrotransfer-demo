(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=v=>v!=null&&Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{maximumFractionDigits:1}):'—';
  const references=[
    {id:'yangtze',name:'长江流域',en:'Yangtze',region:'亚洲',eventCount:32,climate:'季风气候',center:[108,30],label:[111,34]},
    {id:'mekong',name:'湄公河流域',en:'Mekong',region:'亚洲',eventCount:26,climate:'热带季风',center:[104,18],label:[115,14]},
    {id:'rhine',name:'莱茵河流域',en:'Rhine',region:'欧洲',eventCount:18,climate:'温带海洋性',center:[7,49],label:[9,54]},
    {id:'amazon',name:'亚马孙流域',en:'Amazon',region:'南美洲',eventCount:42,climate:'热带雨林',center:[-61,-5],label:[-56,0]},
    {id:'mississippi',name:'密西西比河流域',en:'Mississippi',region:'北美洲',eventCount:31,climate:'多气候带',center:[-92,37],label:[-94,43]},
    {id:'congo',name:'刚果河流域',en:'Congo',region:'非洲',eventCount:24,climate:'赤道湿润',center:[23,0],label:[25,6]}
  ];
  const views={overview:'全球流域',results:'研究成果',events:'研究成果',data:'数据立方体',cube:'数据立方体',workflow:'数据处理流程',simulation:'参数移植与模拟'};
  let selected=references[0],selectedUnit=null,view='overview',imported=null,mapReady=false,focused=false,fullUpstream=false;
  let svg,root,majorLayer,upstreamLayer,downstreamLayer,hoverLayer,markerLayer,projection,path,zoom,canvas,toastTimer;
  const unitIndex=new Map(),upstreamIndex=new Map();let catchmentCache=null,connectionCache=null;
  const geo=()=>window.HYDRO_GEO;
  function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
  function download(name,value,type='application/json'){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function openDialog(title,body){$('#dialogTitle').textContent=title;$('#dialogContent').innerHTML=body;$('#infoDialog').showModal();}
  function majorFeature(b){return geo()?.majorBasins.features.find(f=>f.properties.sampleId===b.id);}
  function activeFeature(){return selectedUnit||majorFeature(selected);}
  function connections(){return connectionCache||(connectionCache=HydroTopology.trace(selectedUnit,unitIndex,upstreamIndex));}
  function topologySummary(){
    const r=connections(),notes=[];
    if(!r.upstream.length)notes.push('没有上游连接记录');
    if(!r.downstream.length)notes.push('没有后续下游连接记录');
    if(r.virtualLinks)notes.push(`含 ${number(r.virtualLinks)} 处虚拟连接，需核查内流区标志`);
    if(r.unresolvedDownstreamId)notes.push(`下游记录 ${r.unresolvedDownstreamId} 未载入`);
    if(r.cycleDetected)notes.push('检测到环路，追踪已终止');
    return `<section class="topology-summary" aria-label="上下游关联"><h3>上下游关联<small>点击分区自动更新</small></h3><div class="topology-counts"><div class="topology-up"><i></i><b id="upstreamCount">${number(r.upstream.length)}</b><small>上游分区</small></div><div class="topology-current"><i></i><b>1</b><small>当前分区</small></div><div class="topology-down"><i></i><b id="downstreamCount">${number(r.downstream.length)}</b><small>下游分区</small></div></div><p>上游含所有汇入分区；下游沿连接路径至终点。</p>${notes.length?`<p class="topology-note">${esc(notes.join('；'))}。</p>`:''}</section>`;
  }
  function normalizeGeo(collection){
    function orient(g){if(!g)return;const polygons=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];for(const rings of polygons)if(d3.geoArea({type:'Polygon',coordinates:rings})>2*Math.PI)rings.forEach(r=>r.reverse());}
    if(collection.type==='FeatureCollection')collection.features.forEach(f=>orient(f.geometry));else orient(collection.geometry);
    return collection;
  }
  function sourceMetrics(){
    const all=imported?.features||geo().basins.features;
    const filtered=!imported&&$('#areaFilter').value==='up200_3000';
    const features=filtered?all.filter(f=>f.properties.UP_AREA>=200&&f.properties.UP_AREA<=3000):all;
    $('#boundaryCaption').innerHTML=`${imported?'导入边界':'Level 8 子流域'}<span class="metric-icon">◎</span>`;
    $('#boundaryCount').innerHTML=`${number(imported?all.length:geo().source.total_count)}<small>个</small>`;
    $('#boundaryMeta').textContent=imported?'本地 GeoJSON · 已导入':'HydroBASINS v1c · 全球 9 个区域';
    $('#visibleBasinCount').textContent=filtered?`显示 ${number(features.length)} 个 · 按上游面积筛选`:`当前 ${number(features.length)} 个 · 全部显示`;
    $('#boundaryQualityNote').textContent=filtered?'当前只显示上游面积 200–3000 km² 的分区，筛选后的空白不表示数据缺失。 ':'';
    $('#mapLevel').textContent=imported?'CUSTOM':'LEVEL 08';$('#orderSelect').disabled=!!imported;$('#areaFilter').disabled=!!imported;
    $('#mapAttribution').textContent=imported?'用户边界 · 陆地：Natural Earth':'边界：HydroBASINS v1c Level 8 · 陆地：Natural Earth';
    return {type:'FeatureCollection',features};
  }
  function drawMap(){if(!mapReady)return;canvas.draw(sourceMetrics());highlight();}
  function renderBasins(){if($('#pilotList'))$('#pilotList').innerHTML=(window.HydroResearch?.cases()||[]).map(c=>`<button class="basin-item ${selectedUnit?.properties.id===c.hybas_id?'active':''}" data-research-basin="${c.hybas_id}"><span class="basin-dot"></span><span>${c.city}关联流域</span><small>${c.events.length} 条</small></button>`).join('');$('#basinList').innerHTML=references.map(b=>`<button class="basin-item ${!selectedUnit&&selected.id===b.id?'active':''}" data-basin="${b.id}"><span class="basin-dot"></span><span>${b.name}</span><small>${b.region}</small></button>`).join('');}
  function renderDetail(){
    const f=activeFeature(),p=f?.properties||{},isUnit=!!selectedUnit;
    $('#basinDetail').innerHTML=`<div class="detail-eyebrow">SELECTED BASIN <span>${isUnit?'Level 8 分区':'大流域参考'}</span></div><div class="basin-heading"><h2>${esc(selected.name)}</h2><p>${isUnit?'HYDROBASINS · LEVEL 08':esc(selected.en.toUpperCase())+' RIVER BASIN'}</p><svg class="basin-outline" viewBox="0 0 80 50" aria-hidden="true" id="basinOutline"></svg></div><div class="basin-tags"><span>${esc(selected.region)}</span><span>${isUnit?(p.ENDO?'内流区':'外流区'):esc(selected.climate)}</span></div><div class="basin-measures"><div><small>${isUnit?'分区本地面积':'参考流域面积'} / km²</small><b>${number(p.area)}</b></div><div><small>${isUnit?'累计上游面积 / km²':'包含 L8 分区'}</small><b>${number(isUnit?p.UP_AREA:p.unitCount)}</b></div><div class="source-key"><small>${isUnit?'HYBAS_ID':'MAIN_BAS'}</small><button class="map-tab" data-inspect-selected>${esc(isUnit?p.HYBAS_ID:p.MAIN_BAS)} ↗</button></div></div>${isUnit?topologySummary():''}<div class="basin-info"><div class="info-row"><span>边界来源</span><b>HydroBASINS v1c</b></div><div class="info-row"><span>洪水事件</span><b class="pending">真实目录待接入</b></div><div class="info-row"><span>气象 / 土壤 / LUCC</span><b class="pending">待处理</b></div></div><div class="data-status"><p>${isUnit?'深蓝为当前分区，青色为上游，橙色为下游。关联范围按完整拓扑展示，可超出面积筛选范围。':'由同一 MAIN_BAS 的 Level 8 分区合并，用于区域定位。点击地图分区可查看上下游关联。'}</p></div><div class="basin-detail-actions">${isUnit?`<button class="button primary" id="showConnections">查看上下游全貌 <span>↗</span></button><div class="topology-focus"><button class="map-tab" id="showUpstream">聚焦上游范围</button><button class="map-tab" id="showLocal">聚焦当前分区</button></div>`:''}<button class="button" data-view="simulation">进入参数移植演示 <span>↗</span></button><button class="button" data-view="results">${window.HydroResearch?.getCase(p.id)?'查看已有系列结果':'查看已接入试点成果'} <span>→</span></button></div>`;
    if(f&&window.d3){const mini=d3.geoMercator().fitExtent([[3,3],[77,47]],f);d3.select('#basinOutline').append('path').attr('d',d3.geoPath(mini)(f)).attr('fill','#cde4ef').attr('stroke','#9bc6db').attr('stroke-width','.7');}
    const pilotResult=window.HydroResearch?.getCase(p.id);if(pilotResult){const info=$('.basin-info');if(info)info.innerHTML=`<div class="info-row"><span>已有来源候选</span><b>${pilotResult.events.length} 条 · 待核定</b></div><div class="info-row"><span>多模态证据</span><b>文本 / 流量 / SAR / MODIS</b></div>`;}
    if($('#showConnections'))$('#showConnections').onclick=focusConnections;
    if($('#showUpstream'))$('#showUpstream').onclick=()=>{fullUpstream=true;focusBasin();};
    if($('#showLocal'))$('#showLocal').onclick=()=>{fullUpstream=false;focusBasin();};
  }
  function selectUnit(f,move=false){
    if(imported){inspectFeature(f,true);return;}
    selectedUnit=f;fullUpstream=false;catchmentCache=null;connectionCache=null;const p=f.properties;
    selected={id:p.id,name:'子流域 '+p.id,en:'HydroBASINS '+p.id,region:p.region,eventCount:'—',climate:'待提取',center:d3.geoCentroid(f),sourceId:p.id,level:8,areaKm2:p.area,upstreamAreaKm2:p.UP_AREA,boundarySource:'HydroBASINS v1c Level 8',sourceAttributes:p};
    hoverLayer?.selectAll('*').remove();$('#mapTooltip').hidden=true;renderBasins();renderDetail();highlight();if(move||focused)focusConnections();if(view!=='overview')renderCurrentDetail();
  }
  function selectReference(id,move=false){const b=references.find(x=>x.id===id);if(!b)return;selected=b;selectedUnit=null;hoverLayer?.selectAll('*').remove();$('#mapTooltip').hidden=true;fullUpstream=false;catchmentCache=null;connectionCache=null;renderBasins();renderDetail();highlight();if(move||focused)focusBasin();if(view!=='overview')renderCurrentDetail();}
  function upstreamFeature(){
    if(!selectedUnit)return activeFeature();
    return catchmentCache||(catchmentCache={type:'FeatureCollection',features:[selectedUnit,...connections().upstream]});
  }
  function highlight(){
    if(!mapReady)return;
    for(const layer of [majorLayer,upstreamLayer,downstreamLayer])layer.selectAll('*').remove();
    if(!imported&&$('#basinToggle').checked){
      const add=(layer,features,category,fill,stroke,opacity,width)=>{
        if(!features.length)return;
        layer.append('path').datum({type:'FeatureCollection',features}).attr('class',`topology-${category}`).attr('data-feature-count',features.length).attr('d',path).attr('fill',fill).attr('fill-opacity',opacity).attr('stroke',stroke).attr('stroke-width',width).attr('vector-effect','non-scaling-stroke').attr('pointer-events','none');
      };
      if(selectedUnit){
        const r=connections();
        add(upstreamLayer,r.upstream,'upstream','#29b8c9','#13899a',.72,.7);
        add(downstreamLayer,r.downstream,'downstream','#e8a04a','#b87022',.85,.9);
        add(majorLayer,[selectedUnit],'selected','#165e9b','#073e6b',.95,1.7);
      }else if(activeFeature())add(majorLayer,[activeFeature()],'reference','#378eb7','#237eaa',.25,.8);
    }
    markerLayer.selectAll('.marker-dot').attr('fill',d=>!selectedUnit&&d.id===selected.id?'#1769a6':'#bb9553');
  }
  function hover(f,event){
    hoverLayer.selectAll('*').remove();if(!f){$('#mapTooltip').hidden=true;return;}
    hoverLayer.append('path').datum(f).attr('d',path).attr('fill','none').attr('stroke','#325d78').attr('stroke-width',.7).attr('vector-effect','non-scaling-stroke').attr('pointer-events','none');
    const p=f.properties,r=$('#mapStage').getBoundingClientRect();$('#mapTooltip').innerHTML=`${esc(p.HYBAS_ID?'HYBAS '+p.HYBAS_ID:p.name||p.id||'导入边界')}<small>本地 ${number(p.SUB_AREA??p.area)} km² · 上游 ${number(p.UP_AREA)} km²</small>`;$('#mapTooltip').hidden=false;$('#mapTooltip').style.left=Math.min(event.clientX-r.left+12,r.width-250)+'px';$('#mapTooltip').style.top=Math.max(12,event.clientY-r.top-45)+'px';
  }
  function inspectFeature(f,custom=false){
    if(!f)return;const p=f.properties;const fields=custom?Object.entries(p):Object.entries(p).filter(([k])=>/^[A-Z_]+$/.test(k));
    openDialog(custom?'导入边界属性':p.referenceOnly?'参考流域属性':'HydroBASINS · '+p.id,`<p>${p.referenceOnly?'同一主流域的 L8 单元合并参考边界。':'Level 8 本地分区；原始数值字段完整保留，地图几何仅作展示概化。'}</p>${p.UP_AREA!=null?`<div class="property-grid"><div><span>本地面积 SUB_AREA</span><b>${number(p.SUB_AREA)} km²</b></div><div><span>完整上游面积 UP_AREA</span><b>${number(p.UP_AREA)} km²</b></div></div><div class="notice">上游面积可用于出口规模筛选。单个多边形通常仅表示本地汇水区；右侧可聚焦上游范围，或查看上下游全貌。</div>`:''}<div class="source-card">${fields.map(([k,v])=>`<p><b>${esc(k)}</b>：${esc(v)}</p>`).join('')}</div>`);
  }
  function worldView(){if(!mapReady)return;focused=false;svg.transition().duration(450).call(zoom.transform,d3.zoomIdentity);$('#worldView').classList.add('active');$('#basinView').classList.remove('active');}
  function focusFeature(f){if(!mapReady)return;focused=true;if(!f)return;const b=path.bounds(f),scale=Math.max(1,Math.min(140,.65/Math.max((b[1][0]-b[0][0])/1100,(b[1][1]-b[0][1])/600))),center=[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2];svg.transition().duration(500).call(zoom.transform,d3.zoomIdentity.translate(550,300).scale(scale).translate(-center[0],-center[1]));$('#worldView').classList.remove('active');$('#basinView').classList.add('active');}
  function focusBasin(){focusFeature(fullUpstream?upstreamFeature():activeFeature());}
  function focusConnections(){
    if(!selectedUnit){focusBasin();return;}
    fullUpstream=false;const r=connections();
    focusFeature({type:'FeatureCollection',features:[selectedUnit,...r.upstream,...r.downstream]});
  }
  function changeView(next){if(!views[next])return;view=next;$('#overviewView').hidden=view!=='overview';$('#detailView').hidden=view==='overview';$('#breadcrumbCurrent').textContent=views[view];$$('[data-view]').forEach(b=>{if(b.classList.contains('nav-item')||b.classList.contains('rail-btn')){b.classList.toggle('active',b.dataset.view===(view==='cube'?'data':view));if(b.dataset.view===(view==='cube'?'data':view))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}});if(view!=='overview')renderCurrentDetail();else{window.HydroDetails?.destroy?.();window.HydroResearch?.destroy?.();window.HydroCube?.destroy?.();}history.replaceState(null,'','#'+view);}
  function renderCurrentDetail(){window.HydroDetails?.destroy?.();window.HydroResearch?.destroy?.();window.HydroCube?.destroy?.();if(view==='results'||view==='events')window.HydroResearch.render($('#detailView'),selected);else if(view==='data'||view==='cube')window.HydroCube?.render($('#detailView'),selected);else window.HydroDetails?.render($('#detailView'),view,selected);}
  function showSources(){const s=geo().source;openDialog('数据来源与接入状态',`<div class="notice">当前边界来自 HydroBASINS v1c Level 8。五个Level 8试点已接入来源候选、文本、流量、SAR与MODIS成果；最终事件采用待核定。参数移植与模拟尚未执行模型。</div><div class="source-card"><b>HydroBASINS · Level 8</b><p>全球 ${number(s.total_count)} 个分区，覆盖 9 个区域，南极洲除外。源网格 15 角秒，赤道附近约 500 m；北纬 60° 以北的数据质量较低。</p><p>原始 HYBAS_ID、NEXT_DOWN、MAIN_BAS、SUB_AREA、UP_AREA 等字段保留。地图采用共享拓扑概化，正式计算使用共享盘中的原始 Shapefile。</p><p>累计上游面积 200–3000 km² 的候选出口共 ${number(s.up_area_200_3000_count)} 个，可能存在嵌套，不代表独立河流数。</p><p>${esc(s.citation)}</p><a href="${s.url}" target="_blank" rel="noopener noreferrer">官方数据 ↗</a> · <a href="${s.technical_documentation}" target="_blank" rel="noopener noreferrer">字段说明 ↗</a></div><div class="source-card"><b>河网与参考流域</b><p>HydroBASINS 提供分区及拓扑，不包含河道中心线。河网待单独接入。六个大流域参考由同一 MAIN_BAS 的 L8 分区合并。</p></div><div class="source-card"><b>Natural Earth</b><p>陆地背景，不参与研究流域面积计算。</p></div><h3>公开输入来源</h3>${(window.HYDRO_CATALOG||[]).map(c=>`<div class="source-card"><b>${esc(c.name)}</b><p>${esc(c.description)}</p><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">官方来源 ↗</a></div>`).join('')}`);}
  function search(){const q=$('#basinSearch').value.trim().toLowerCase(),refs=references.filter(b=>!q||(b.name+' '+b.en+' '+b.region).toLowerCase().includes(q));const units=q.length>=3?geo().basins.features.filter(f=>f.properties.id.includes(q)).slice(0,10):[];$('#searchResults').innerHTML=refs.map(b=>`<button data-search-basin="${b.id}"><span>${b.name}</span><small>大流域参考</small></button>`).join('')+units.map(f=>`<button data-search-unit="${f.properties.id}"><span>HYBAS ${f.properties.id}</span><small>上游 ${number(f.properties.UP_AREA)} km²</small></button>`).join('')||'<p>可搜索大流域名称或 HYBAS_ID。</p>';$('#searchResults').hidden=false;}
  async function importBoundary(file){if(!file)return;try{if(file.size>35*1024*1024)throw Error('请选择 35 MB 以下的文件');const obj=JSON.parse(await file.text()),fc=obj.type==='FeatureCollection'?obj:obj.type==='Feature'?{type:'FeatureCollection',features:[obj]}:null;if(!fc?.features.length||fc.features.length>20000)throw Error('支持 1–20,000 个 GeoJSON 面边界');for(const f of fc.features){if(!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('仅支持 Polygon / MultiPolygon');const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const rings of polygons){if(!rings.length)throw Error('边界不能为空');for(const ring of rings){if(ring.length<4||ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])throw Error('边界环必须首尾闭合');for(const c of ring)if(!Number.isFinite(c[0])||!Number.isFinite(c[1])||Math.abs(c[0])>180||Math.abs(c[1])>90)throw Error('需要 WGS84 经纬度');}}}imported=normalizeGeo(fc);drawMap();worldView();toast(`已导入 ${fc.features.length} 个边界`);}catch(e){toast(e.message);}finally{$('#boundaryFile').value='';}}
  function initMap(){
    if(!window.d3||!geo()||geo().basins.features.length!==geo().source.total_count){$('#mapLoading').textContent='数据未完整加载，请刷新或检查地理数据文件。';return;}
    normalizeGeo(geo().land);normalizeGeo(geo().basins);normalizeGeo(geo().majorBasins);
    for(const f of geo().basins.features){const p=f.properties;unitIndex.set(p.id,f);if(p.NEXT_DOWN){const id=String(p.NEXT_DOWN);if(!upstreamIndex.has(id))upstreamIndex.set(id,[]);upstreamIndex.get(id).push(p.id);}}
    for(const b of references){const p=majorFeature(b)?.properties;if(p){b.sourceId=p.id;b.areaKm2=p.area;b.area=number(p.area)+' km²';b.boundarySource='HydroBASINS v1c · MAIN_BAS union';}}
    projection=d3.geoNaturalEarth1().rotate([-8,0]).scale(185).translate([550,330]);path=d3.geoPath(projection);svg=d3.select('#worldMap');root=svg.append('g');
    root.append('path').datum(d3.geoGraticule().step([30,30])()).attr('d',path).attr('fill','none').attr('stroke','#d4e5ef').attr('stroke-width','.5').attr('stroke-dasharray','2,4');
    root.append('path').datum(geo().land).attr('d',path).attr('fill','#e2edf2').attr('stroke','#adcbdc').attr('stroke-width','.55');
    canvas=new HydroBasinCanvas(root.append('g').attr('class','basin-layer'),projection,path,(f)=>{selectUnit(f);if(window.HydroResearch?.getCase(f.properties.id))changeView('results');},hover);
    upstreamLayer=root.append('g').attr('class','upstream-layer').attr('pointer-events','none');downstreamLayer=root.append('g').attr('class','downstream-layer').attr('pointer-events','none');majorLayer=root.append('g').attr('class','major-layer');hoverLayer=root.append('g').attr('pointer-events','none');markerLayer=root.append('g').attr('class','marker-layer');
    const markers=markerLayer.selectAll('g').data(references).join('g').attr('class','marker-group').attr('transform',d=>`translate(${projection(d.center)})`).attr('tabindex',0).attr('role','button').attr('aria-label',d=>`选择${d.name}参考`).on('click',(e,d)=>{e.stopPropagation();selectReference(d.id);}).on('keydown',(e,d)=>{if(e.key==='Enter'){e.preventDefault();selectReference(d.id);}});
    markers.append('circle').attr('class','marker-halo').attr('r',9).attr('fill','#bb955335');markers.append('circle').attr('class','marker-dot').attr('r',3.5).attr('fill','#bb9553').attr('stroke','white').attr('stroke-width','1.4');markers.append('text').attr('class','marker-text').attr('x',d=>projection(d.label)[0]-projection(d.center)[0]).attr('y',d=>projection(d.label)[1]-projection(d.center)[1]).text(d=>d.name.replace('流域',''));
    zoom=d3.zoom().scaleExtent([.8,160]).translateExtent([[-600,-350],[1700,950]]).on('zoom',e=>{root.attr('transform',e.transform);const k=e.transform.k;markerLayer.selectAll('.marker-dot').attr('r',3.5/k);markerLayer.selectAll('.marker-halo').attr('r',9/k);markerLayer.selectAll('.marker-text').style('font-size',`${11/k}px`);}).on('end',e=>canvas.renderAt(e.transform));svg.call(zoom).on('dblclick.zoom',null);
    svg.on('mousemove.coords',e=>{const c=projection.invert(d3.zoomTransform(svg.node()).invert(d3.pointer(e,svg.node())));if(c&&Math.abs(c[1])<=90)$('#mapCoordinate').textContent=`${Math.abs(c[1]).toFixed(2)}° ${c[1]<0?'S':'N'}  ${Math.abs(c[0]).toFixed(2)}° ${c[0]<0?'W':'E'}`;});
    mapReady=true;drawMap();$('#mapLoading').hidden=true;window.HydroResearch?.overview($('#researchOverview'));
    const main=majorFeature(references[0]).properties.MAIN_BAS;
    const first=unitIndex.get('4080933560')||geo().basins.features.find(f=>f.properties.MAIN_BAS===main&&f.properties.UP_AREA>=2000&&f.properties.UP_AREA<=10000&&f.properties.SUB_AREA/f.properties.UP_AREA<.5&&upstreamIndex.has(f.properties.id)&&unitIndex.has(String(f.properties.NEXT_DOWN)))||geo().basins.features[0];selectUnit(first);
    window.HydroTransferState={get selected(){return selected;},get selectedUnit(){return selectedUnit;},get visibleCount(){return canvas.features.length;},get source(){return geo().source;},get upstreamCount(){return selectedUnit?connections().upstream.length:0;},get downstreamCount(){return selectedUnit?connections().downstream.length:0;}};
  }
  document.addEventListener('click',e=>{const pilot=e.target.closest('[data-research-basin]');if(pilot){const f=unitIndex.get(pilot.dataset.researchBasin);if(f){const destination=(view==='data'||view==='cube')?'data':'results';selectUnit(f);changeView(destination);window.scrollTo({top:0,behavior:'smooth'});}return;}const v=e.target.closest('[data-view]');if(v){e.preventDefault();changeView(v.dataset.view);return;}const ref=e.target.closest('[data-basin],[data-search-basin]');if(ref){selectReference(ref.dataset.basin||ref.dataset.searchBasin,!!ref.dataset.searchBasin);$('#searchResults').hidden=true;return;}const u=e.target.closest('[data-search-unit]');if(u){selectUnit(unitIndex.get(u.dataset.searchUnit),true);$('#searchResults').hidden=true;return;}if(e.target.closest('[data-inspect-selected]')){inspectFeature(activeFeature());return;}if(!e.target.closest('.map-search'))$('#searchResults').hidden=true;if(!e.target.closest('.map-layer-control')){$('#layersPopover').hidden=true;$('#layersBtn').setAttribute('aria-expanded','false');}});
  $('#sourceBtn').onclick=showSources;$('#mapSources').onclick=showSources;
  $('#aboutBtn').onclick=()=>openDialog('关于 HydroTransfer','<p>当前主分区为 HydroBASINS Level 8，支持真实边界、原始拓扑属性和完整上游范围查询。五个试点已接入真实处理成果及逐日MODIS播放；参数移植与模拟仍为界面演示，尚未执行模型。</p>');
  $('#closeDialog').onclick=()=>$('#infoDialog').close();
  $('#exportProject').onclick=()=>{download('HydroTransfer-Level8-config.json',{project:'HydroTransfer',mode:'demonstration',boundary_source:'HydroBASINS v1c',level:8,selected_basin:selected,topology_selection:selectedUnit&&!imported?{upstream_ids:connections().upstream.map(f=>f.properties.id),downstream_ids:connections().downstream.map(f=>f.properties.id),virtual_connections:connections().virtualLinks}:null,selected_scope:selectedUnit?(fullUpstream?'upstream':'local'):'main_basin_reference',upstream_unit_ids:selectedUnit&&fullUpstream?upstreamFeature().features.map(f=>f.properties.id):null,research_scope:{area_field:'UP_AREA',area_range_km2:$('#areaFilter').value==='up200_3000'?[200,3000]:null,area_range_status:'optional_display_filter',time_step:'daily',task:'continuous_runoff',nested_outlets:'require independent sample selection'},map_area_filter:$('#areaFilter').value,current_feature_count:sourceMetrics().features.length,source:geo().source,model_executed:false,exported_at:new Date().toISOString()});toast('Level 8 配置已导出。');};
  $('#basinSearch').addEventListener('input',search);$('#basinSearch').addEventListener('focus',search);$('#basinSearch').addEventListener('keydown',e=>{if(e.key==='Escape')$('#searchResults').hidden=true;if(e.key==='Enter')$('#searchResults button')?.click();});
  $('#zoomIn').onclick=()=>mapReady&&svg.transition().duration(200).call(zoom.scaleBy,1.5);$('#zoomOut').onclick=()=>mapReady&&svg.transition().duration(200).call(zoom.scaleBy,1/1.5);$('#resetMap').onclick=worldView;$('#worldView').onclick=worldView;$('#basinView').onclick=()=>selectedUnit?focusConnections():focusBasin();
  $('#layersBtn').onclick=()=>{const el=$('#layersPopover');el.hidden=!el.hidden;$('#layersBtn').setAttribute('aria-expanded',String(!el.hidden));};
  $('#basinToggle').onchange=e=>{canvas?.show(e.target.checked);highlight();};$('#markerToggle').onchange=e=>markerLayer?.style('display',e.target.checked?null:'none');$('#areaFilter').onchange=()=>{drawMap();toast($('#areaFilter').value==='all'?'已恢复全部 Level 8 分区':'按累计上游面积筛选，候选出口可能嵌套。');};
  $('#orderHelp').onclick=()=>openDialog('Level 8 与面积口径',`<p>当前使用 HydroBASINS Pfafstetter Level 8，与 Strahler 河流阶次不同。全球共有 ${number(geo().source.total_count)} 个同层级分区。</p><p><b>SUB_AREA</b> 是分区本地面积；<b>UP_AREA</b> 是其出口以上累计集水面积。可按 UP_AREA 筛选模拟出口规模，具体研究范围另行确定。</p><p>当前累计上游面积 200–3000 km² 的候选出口有 ${number(geo().source.up_area_200_3000_count)} 个，存在嵌套，尚未作为独立样本定案。默认地图展示全部分区。</p>`);
  $('#importBoundary').onclick=()=>openDialog('导入流域边界','<p>支持 WGS84 经纬度 GeoJSON 面边界，文件不超过35 MB，最多20,000个单元。</p><button class="button primary" id="chooseBoundary">选择 GeoJSON 文件</button> <button class="button" id="restoreBoundary">恢复 HydroBASINS Level 8</button>');
  $('#dialogContent').addEventListener('click',e=>{if(e.target.id==='chooseBoundary'){$('#infoDialog').close();$('#boundaryFile').click();}if(e.target.id==='restoreBoundary'){imported=null;drawMap();$('#infoDialog').close();worldView();toast('已恢复 HydroBASINS Level 8。');}});$('#boundaryFile').addEventListener('change',e=>importBoundary(e.target.files[0]));
  renderBasins();initMap();changeView(views[location.hash.slice(1)]?location.hash.slice(1):'overview');
})();
