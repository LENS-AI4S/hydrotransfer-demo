/* Canvas rendering avoids creating 190,675 SVG elements. Original records stay queryable. */
window.HydroBasinCanvas = class {
  constructor(layer, projection, svgPath, pick, hover) {
    this.layer=layer;this.projection=projection;this.svgPath=svgPath;this.pick=pick;this.hover=hover;
    this.node=layer.append('foreignObject').attr('width',1100).attr('height',600);
    this.canvas=this.node.append('xhtml:canvas').attr('width',3300).attr('height',1800).style('width','1100px').style('height','600px').style('display','block').node();
    this.ctx=this.canvas.getContext('2d');this.drawPath=d3.geoPath(projection).context(this.ctx);
    this.features=[];this.cells=new Map();this.bounds=new WeakMap();this.visible=true;this.lastHover=null;this.transform=d3.zoomIdentity;this.globalCache=new Map();
    this.node.on('mousemove',(event)=>{const f=this.hit(event);if(f!==this.lastHover){this.lastHover=f;this.hover(f,event);}else if(f)this.hover(f,event);}).on('mouseleave',()=>{this.lastHover=null;this.hover(null);}).on('click',(event)=>{const f=this.hit(event);if(f){event.stopPropagation();this.pick(f);}});
  }
  hit(event) {
    const [x,y]=d3.pointer(event,this.layer.node());
    const lonlat=this.projection.invert([x,y]);if(!lonlat)return null;
    const candidates=this.cells.get(Math.floor(x/20)+','+Math.floor(y/20))||[];
    for(let j=candidates.length-1;j>=0;j--){const f=candidates[j],b=this.bounds.get(f);if(x>=b[0][0]&&x<=b[1][0]&&y>=b[0][1]&&y<=b[1][1]&&d3.geoContains(f,lonlat))return f;}
    return null;
  }
  draw(collection) {
    this.features=collection.features.filter(f=>f.geometry);this.cells.clear();
    for(let i=0;i<this.features.length;i++){
      const f=this.features[i];let b=this.bounds.get(f);if(!b){b=this.svgPath.bounds(f);this.bounds.set(f,b);}
      if(!Number.isFinite(b[0][0]))continue;
      const x0=Math.max(-10,Math.floor(b[0][0]/20)),x1=Math.min(65,Math.floor(b[1][0]/20));
      const y0=Math.max(-10,Math.floor(b[0][1]/20)),y1=Math.min(40,Math.floor(b[1][1]/20));
      for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const key=x+','+y;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(f);}
    }
    this.canvas.dataset.featureCount=String(this.features.length);
    this.renderAt(this.transform);
  }
  renderAt(transform){
    const generation=this.renderGeneration=(this.renderGeneration||0)+1;
    this.transform=transform;const {x,y,k}=transform;
    this.node.attr('x',-x/k).attr('y',-y/k).attr('width',1100/k).attr('height',600/k);
    this.canvas.style.width=1100/k+'px';this.canvas.style.height=600/k+'px';
    this.ctx.setTransform(1,0,0,1,0,0);this.ctx.clearRect(0,0,3300,1800);
    const global=k===1&&x===0&&y===0,key=this.features.length;
    if(global&&this.globalCache.has(key)){this.ctx.drawImage(this.globalCache.get(key),0,0);this.canvas.dataset.zoom=String(k);this.canvas.dataset.rendering='false';this.canvas.setAttribute('aria-busy','false');return;}
    this.ctx.setTransform(3*k,0,0,3*k,3*x,3*y);this.ctx.lineWidth=(k>2?.65:.19)/k;this.ctx.strokeStyle='#83aec7';
    const colors=['#d8e8f1','#c9dfea','#d1e4ef','#bcd8e8','#d4e7ef','#c2dcea'],x0=-x/k,y0=-y/k,x1=(1100-x)/k,y1=(600-y)/k;
    let rendered=0,i=0;const features=this.features;
    this.canvas.dataset.rendering='true';this.canvas.setAttribute('aria-busy','true');
    const drawChunk=()=>{
      if(generation!==this.renderGeneration)return;
      const started=performance.now();
      while(i<features.length&&performance.now()-started<12){
        const f=features[i++],b=this.bounds.get(f);if(!b||b[1][0]<x0||b[0][0]>x1||b[1][1]<y0||b[0][1]>y1)continue;
        this.ctx.beginPath();this.drawPath(f);this.ctx.fillStyle=colors[Number(f.properties.HYBAS_ID||i)%6];this.ctx.fill();this.ctx.stroke();rendered++;
      }
      this.canvas.dataset.zoom=String(k);this.canvas.dataset.renderedFeatures=String(rendered);
      if(i<features.length){setTimeout(drawChunk,0);return;}
      this.canvas.dataset.rendering='false';this.canvas.setAttribute('aria-busy','false');
      if(global&&(key===190675||key===116697)){const copy=document.createElement('canvas');copy.width=3300;copy.height=1800;copy.getContext('2d').drawImage(this.canvas,0,0);this.globalCache.set(key,copy);}
    };
    drawChunk();
  }
  show(visible){this.visible=visible;this.node.style('display',visible?null:'none');}
};
