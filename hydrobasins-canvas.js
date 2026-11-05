/* Viewport-sized canvas: no SVG foreignObject clipping at large zoom. */
window.HydroBasinCanvas=class{
  constructor(layer,projection,svgPath,pick,hover){
    this.layer=layer;this.projection=projection;this.svgPath=svgPath;this.pick=pick;this.hover=hover;
    this.svg=layer.node().ownerSVGElement;this.stage=this.svg.parentNode;
    this.canvas=document.createElement('canvas');this.canvas.className='basin-canvas';this.canvas.setAttribute('aria-hidden','true');this.stage.insertBefore(this.canvas,this.svg);
    this.ctx=this.canvas.getContext('2d');this.drawPath=d3.geoPath(projection).context(this.ctx);
    this.features=[];this.cells=new Map();this.bounds=new WeakMap();this.visible=true;this.transform=d3.zoomIdentity;
    d3.select(this.svg).on('mousemove.basins',e=>{const f=this.hit(e);this.hover(f,e);}).on('mouseleave.basins',()=>this.hover(null)).on('click.basins',e=>{if(e.defaultPrevented||e.target.closest('.marker-group'))return;this.pick(this.hit(e),e);});
    this.resize=new ResizeObserver(()=>this.renderAt(this.transform));this.resize.observe(this.stage);
  }
  setOverview(all,filtered){this.overview=all;this.filteredOverview=filtered;this.renderAt(this.transform);}
  hit(event){
    const [x,y]=d3.pointer(event,this.layer.node()),lonlat=this.projection.invert([x,y]);if(!lonlat)return null;
    const candidates=this.cells.get(Math.floor(x/20)+','+Math.floor(y/20))||[];
    for(let j=candidates.length-1;j>=0;j--){const f=candidates[j],b=this.bounds.get(f);if(x>=b[0][0]&&x<=b[1][0]&&y>=b[0][1]&&y<=b[1][1]&&d3.geoContains(f,lonlat))return f;}return null;
  }
  draw(collection,filtered=false){
    this.filtered=filtered;this.features=collection.features.filter(f=>f.geometry);this.cells.clear();
    for(const f of this.features){let b=this.bounds.get(f);if(!b){b=this.svgPath.bounds(f);this.bounds.set(f,b);}if(!Number.isFinite(b[0][0]))continue;
      for(let x=Math.max(-10,Math.floor(b[0][0]/20));x<=Math.min(65,Math.floor(b[1][0]/20));x++)for(let y=Math.max(-10,Math.floor(b[0][1]/20));y<=Math.min(40,Math.floor(b[1][1]/20));y++){const key=x+','+y;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(f);}}
    this.canvas.dataset.featureCount=this.features.length;this.renderAt(this.transform);
  }
  renderAt(t){
    const generation=this.renderGeneration=(this.renderGeneration||0)+1;this.transform=t;
    const w=this.stage.clientWidth,h=this.stage.clientHeight;if(!w||!h)return;
    const ratio=Math.min(window.devicePixelRatio||1,2),cw=Math.round(w*ratio),ch=Math.round(h*ratio);
    if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;}
    const fit=Math.min(w/1100,h/600),ox=(w-1100*fit)/2,oy=(h-600*fit)/2,{x,y,k}=t,ctx=this.ctx;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cw,ch);
    ctx.setTransform(ratio*fit*k,0,0,ratio*fit*k,ratio*(ox+fit*x),ratio*(oy+fit*y));
    ctx.beginPath();this.drawPath(window.HYDRO_GEO.land);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#c3cdd5';ctx.lineWidth=.55/(k*fit);ctx.stroke();
    if(!this.visible){this.canvas.dataset.rendering='false';return;}
    const base=this.filtered?this.filteredOverview:this.overview;if(base&&!this.custom&&k<3)ctx.drawImage(base,0,0,1100,600);
    ctx.lineWidth=.58/(k*fit);ctx.strokeStyle='#b4c1cb';ctx.fillStyle='#fff';
    const x0=-x/k,y0=-y/k,x1=(1100-x)/k,y1=(600-y)/k,features=this.features;let i=0,rendered=0;
    this.canvas.dataset.rendering='true';
    const chunk=()=>{if(generation!==this.renderGeneration)return;const start=performance.now();
      while(i<features.length&&performance.now()-start<10){const f=features[i++],b=this.bounds.get(f);if(!b||b[1][0]<x0||b[0][0]>x1||b[1][1]<y0||b[0][1]>y1)continue;
        ctx.beginPath();this.drawPath(f);ctx.fill();ctx.stroke();rendered++;}
      this.canvas.dataset.zoom=String(k);this.canvas.dataset.renderedFeatures=String(rendered);
      if(i<features.length)setTimeout(chunk,0);else this.canvas.dataset.rendering='false';};chunk();
  }
  show(value){this.visible=value;this.renderAt(this.transform);}
};
