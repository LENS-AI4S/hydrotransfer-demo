(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], assets=window.HydroAssets;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=n=>n==null||!Number.isFinite(Number(n))?'—':Number(n).toLocaleString('zh-CN',{maximumFractionDigits:1});
  const geo=()=>window.HYDRO_GEO;
  const regionNames={'1':'非洲','2':'欧洲和中东','3':'西伯利亚','4':'亚洲','5':'澳大利亚和大洋洲','6':'南美洲','7':'北美洲','8':'加拿大北部','9':'格陵兰'};
  const references=[{id:'yangtze',name:'长江',en:'Yangtze',center:[108,30]},{id:'mekong',name:'湄公河',en:'Mekong',center:[104,18]},{id:'rhine',name:'莱茵河',en:'Rhine',center:[7,49]},{id:'amazon',name:'亚马孙',en:'Amazon',center:[-61,-5]},{id:'mississippi',name:'密西西比河',en:'Mississippi',center:[-92,37]},{id:'congo',name:'刚果河',en:'Congo',center:[23,0]}];
  const views={overview:'流域地图',data:'数据立方体',results:'研究结果',reports:'报告与判定',simulation:'参数模拟',workflow:'处理流程',inputs:'输入数据登记'};
  const native=new Map(),units=new Map(),parents=new Map(),regionPromises=new Map(),loadedRegions=new Set();
  let selectedUnit=null,selected=null,view='data',imported=null,mapReady=false,mapPromise=null,directoryPromise=null,connectionCache=null;
  let projection,path,svg,mapRoot,riverLayer,upstreamLayer,downstreamLayer,currentLayer,hoverLayer,markerLayer,zoom,canvas,focused=false,fullUpstream=false;
  let viewToken=0,selectionToken=0,researchToken=0,toastTimer,pickerReturn=null,maskPromise=null,riversPromise=null,frameRequest=null;
  function normalize(collection){
    for(const f of collection.features||[]){if(!f.geometry)continue;const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];
      for(const rings of polygons)if(d3.geoArea({type:'Polygon',coordinates:rings})>2*Math.PI)rings.forEach(r=>r.reverse());}return collection;
  }
  normalize(geo().land);normalize(geo().majorBasins);normalize(geo().basins);
  for(const f of geo().basins.features){native.set(f.properties.id,f);units.set(f.properties.id,f);}
  function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3800);}
  function download(name,value,type='application/json'){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function openDialog(title,body){$('#dialogTitle').textContent=title;$('#dialogContent').innerHTML=body;$('#infoDialog').showModal();}
  function closeMenu(){const was=!$('#appMenu').hidden;$('#appMenu').hidden=true;$('#appMenuButton').setAttribute('aria-expanded','false');return was;}
  function activeFeature(){return window.HYDRO_NATIVE_BOUNDARIES?.[selected?.sourceId]||selectedUnit;}
  function syncSelected(f,custom=false){
    selectedUnit=f;const p=f.properties||{};
    selected={id:String(p.id||p.HYBAS_ID||'custom'),sourceId:custom?null:String(p.HYBAS_ID||p.id),name:custom?(p.name||'导入流域'):'分区 '+(p.HYBAS_ID||p.id),en:'HydroBASINS',region:custom?'导入边界':p.region||regionNames[String(p.id)[0]],center:d3.geoCentroid(f),level:custom?null:8,areaKm2:p.SUB_AREA??p.area,upstreamAreaKm2:p.UP_AREA,boundarySource:custom?'用户 GeoJSON':'HydroBASINS v1c Level 8',sourceAttributes:p};
    fullUpstream=false;connectionCache=null;
  }
  syncSelected(native.get('4080933560')||native.values().next().value);
  async function ensureDirectory(){
    if(directoryPromise)return directoryPromise;
    directoryPromise=assets.script('assets/basin-directory.js').then(()=>{
      const d=window.HYDRO_BASIN_DIRECTORY;
      for(let i=0;i<d.ids.length;i++){const id=String(d.ids[i]),next=d.next[i];if(!units.has(id))units.set(id,{type:'Feature',properties:{id,HYBAS_ID:d.ids[i],NEXT_DOWN:next},geometry:null});
        if(next){const key=String(next);if(!parents.has(key))parents.set(key,[]);parents.get(key).push(id);}}
      connectionCache=null;
    }).catch(e=>{directoryPromise=null;throw e;});return directoryPromise;
  }
  async function ensureRegion(code){
    code=String(code);if(!/^[1-9]$/.test(code))throw Error('无法识别区域');if(loadedRegions.has(code))return;
    if(regionPromises.has(code))return regionPromises.get(code);
    $('#mapLoadStatus').textContent='正在载入'+regionNames[code]+'详细边界…';
    const task=assets.script('assets/hydrobasins-l08-'+code+'.js').then(()=>{
      const features=geo().basins.features;normalize({features});
      for(const f of features){native.set(f.properties.id,f);units.set(f.properties.id,f);}loadedRegions.add(code);geo().basins.features=[...native.values()];
      if(selected?.sourceId&&native.has(selected.sourceId)){const before=fullUpstream;syncSelected(native.get(selected.sourceId));fullUpstream=before;}
      connectionCache=null;if(mapReady)drawMap();renderDetail();$('#mapLoadStatus').textContent='已载入 '+number(native.size)+' 个详细分区';
    }).catch(e=>{regionPromises.delete(code);$('#mapLoadStatus').textContent='区域载入失败，可重新选择区域重试';throw e;});regionPromises.set(code,task);return task;
  }
  function connections(){return connectionCache||(connectionCache=HydroTopology.trace(selectedUnit,units,parents));}
  async function ensureConnections(){
    if(!selected?.sourceId||imported)return;await ensureDirectory();const r=connections();
    const regions=new Set([selected.sourceId[0],...r.upstream.map(f=>f.properties.id[0]),...r.downstream.map(f=>f.properties.id[0])]);
    await Promise.all([...regions].map(ensureRegion));connectionCache=null;renderDetail();highlight();
  }
  function visibleCollection(){const filtered=$('#areaFilter').value==='up200_3000';return {type:'FeatureCollection',features:imported?.features||[...native.values()].filter(f=>!filtered||(f.properties.UP_AREA>=200&&f.properties.UP_AREA<=3000))};}
  function drawMap(){if(!mapReady)return;const filtered=$('#areaFilter').value==='up200_3000';canvas.custom=!!imported;canvas.draw(visibleCollection(),filtered);canvas.show($('#basinToggle').checked);highlight();
    $('#visibleBasinCount').textContent=imported?'导入 '+number(imported.features.length)+' 个面':filtered?'全球筛选 '+number(geo().source.up_area_200_3000_count)+' 个分区':'全球 '+number(geo().source.total_count)+' 个分区';
    $('#boundaryQualityNote').textContent=imported?'当前为本地导入边界。':filtered?'按累计上游面积筛选；空白不表示缺失，候选出口可能嵌套。':'边界为概化显示，计算使用原始数据。';
  }
  function renderDetail(){
    const f=selectedUnit,p=f?.properties||{},custom=!!imported&&!selected?.sourceId;if(!f)return;
    const r=selected.sourceId&&window.HYDRO_BASIN_DIRECTORY?connections():null;
    $('#basinDetail').innerHTML=`<div class="inspector-heading"><h2>${esc(selected.name)}</h2><p class="basin-subtitle">${esc(selected.region||'')} ${custom?'':selected.sourceId?'· 本地汇水单元':'· 大流域参考范围'}</p><svg class="basin-outline" viewBox="0 0 230 90" aria-hidden="true" id="basinOutline"></svg></div><div class="basin-measures"><div><small>${selected.sourceId||custom?'本地面积 / km²':'参考范围 / km²'}</small><b>${number(p.SUB_AREA??p.area)}</b></div><div><small>${selected.sourceId?'累计上游 / km²':'包含分区 / 个'}</small><b>${number(selected.sourceId?p.UP_AREA:p.unitCount)}</b></div></div><section class="topology-summary" aria-label="上下游关联"><h3>上下游关系</h3><div class="topology-counts"><div class="topology-up"><i></i><b id="upstreamCount">${r?number(r.upstream.length):'—'}</b><small>上游分区</small></div><div class="topology-current"><i></i><b>1</b><small>当前</small></div><div class="topology-down"><i></i><b id="downstreamCount">${r?number(r.downstream.length):'—'}</b><small>下游分区</small></div></div><p>${custom?'导入边界未提供原生拓扑。':r?'依据 NEXT_DOWN 追踪；高亮的是分区面，河网单独叠加。':'打开地图后载入原生拓扑。'}</p>${r?.virtualLinks?`<p class="topology-note">含 ${r.virtualLinks} 处内流区虚拟连接，请核查出口。</p>`:''}<div class="topology-focus"><button id="showLocal">本区</button><button id="showUpstream" ${selected.sourceId?'':'disabled'}>完整上游</button><button id="showConnections" ${selected.sourceId?'':'disabled'}>上下游全貌</button></div></section><div class="basin-detail-actions"><button class="button primary" data-view="data">查看数据立方体</button><button class="button" data-view="results">查看研究结果</button></div><details><summary>原始属性</summary><table class="basin-attribute-table"><tbody>${Object.entries(p).filter(([k])=>/^[A-Z_]+$/.test(k)).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table><button class="text-button" data-inspect-selected>查看属性说明</button></details>`;
    if(f.geometry){const shape=activeFeature(),mini=d3.geoMercator().fitExtent([[8,5],[222,85]],shape);d3.select('#basinOutline').append('path').attr('d',d3.geoPath(mini)(shape)).attr('fill','#e7edf2').attr('stroke','#7f9db4').attr('stroke-width',1);}
    $('#showLocal').onclick=()=>{fullUpstream=false;focusFeature(activeFeature());};
    $('#showUpstream').onclick=async()=>{await ensureConnections();fullUpstream=true;focusFeature({type:'FeatureCollection',features:[selectedUnit,...connections().upstream].filter(f=>f.geometry)});};
    $('#showConnections').onclick=async()=>{await ensureConnections();fullUpstream=false;focusConnections();};
  }
  function highlight(){
    if(!mapReady)return;for(const layer of [upstreamLayer,downstreamLayer,currentLayer])layer.selectAll('*').remove();if(!$('#basinToggle').checked||!selectedUnit)return;
    const add=(layer,features,kind,fill,stroke,opacity,width)=>{features=features.filter(f=>f.geometry);if(!features.length)return;layer.append('path').datum({type:'FeatureCollection',features}).attr('class','topology-'+kind).attr('data-feature-count',features.length).attr('d',path).attr('fill',fill).attr('fill-opacity',opacity).attr('stroke',stroke).attr('stroke-width',width).attr('vector-effect','non-scaling-stroke');};
    if(!imported&&selected.sourceId){const r=connections();add(upstreamLayer,r.upstream,'upstream','#36a2af','#328f9e',.17,.75);add(downstreamLayer,r.downstream,'downstream','#d8a45b','#b98137',.24,.9);}
    add(currentLayer,[activeFeature()],'selected','#2d6fa4','#245c8a',.22,1.8);
  }
  function hover(f,e){if(!mapReady)return;hoverLayer.selectAll('*').remove();if(!f){$('#mapTooltip').hidden=true;return;}
    hoverLayer.append('path').datum(f).attr('d',path).attr('fill','none').attr('stroke','#6f8497').attr('stroke-width',1).attr('vector-effect','non-scaling-stroke');
    const p=f.properties,b=$('#mapStage').getBoundingClientRect();$('#mapTooltip').innerHTML=`${esc(p.id||p.name||'导入边界')}<small>本地 ${number(p.SUB_AREA??p.area)} km² · 上游 ${number(p.UP_AREA)} km²</small>`;$('#mapTooltip').hidden=false;$('#mapTooltip').style.left=Math.max(8,Math.min(e.clientX-b.left+12,b.width-230))+'px';$('#mapTooltip').style.top=Math.max(10,e.clientY-b.top-55)+'px';
  }
  function focusFeature(f){if(!mapReady||!f)return;const b=path.bounds(f);if(!Number.isFinite(b[0][0]))return;focused=true;const k=Math.max(1,Math.min(140,.72/Math.max((b[1][0]-b[0][0])/1100,(b[1][1]-b[0][1])/600))),cx=(b[0][0]+b[1][0])/2,cy=(b[0][1]+b[1][1])/2;svg.transition().duration(350).call(zoom.transform,d3.zoomIdentity.translate(550,300).scale(k).translate(-cx,-cy));$('#worldView').classList.remove('active');$('#basinView').classList.add('active');}
  function focusConnections(){const r=connections();focusFeature({type:'FeatureCollection',features:[selectedUnit,...r.upstream,...r.downstream].filter(f=>f.geometry)});}
  function worldView(){if(!mapReady)return;focused=false;svg.transition().duration(350).call(zoom.transform,d3.zoomIdentity);$('#worldView').classList.add('active');$('#basinView').classList.remove('active');}
  async function regionAt(lonlat){
    if(!maskPromise)maskPromise=assets.image('assets/basin-regions.png').then(im=>{const c=document.createElement('canvas');c.width=720;c.height=360;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);return ctx;});
    const ctx=await maskPromise,x=Math.min(719,Math.max(0,Math.floor((lonlat[0]+180)*2))),y=Math.min(359,Math.max(0,Math.floor((90-lonlat[1])*2)));
    for(const [dx,dy]of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0]]){const r=ctx.getImageData(Math.max(0,Math.min(719,x+dx)),Math.max(0,Math.min(359,y+dy)),1,1).data[0];if(r>=1&&r<=9)return String(r);}return null;
  }
  async function mapPick(f,e){
    if(imported){if(f){syncSelected(f,true);renderDetail();highlight();}return;}
    const token=++selectionToken;
    if(!f){const point=d3.zoomTransform(svg.node()).invert(d3.pointer(e,svg.node())),ll=projection.invert(point),region=await regionAt(ll);if(!region)return;await ensureRegion(region);if(token!==selectionToken)return;f=canvas.hit(e);}
    if(!f)return;syncSelected(f);renderDetail();highlight();await ensureConnections();if(token!==selectionToken)return;
    updateHash();if(pickerReturn){const destination=pickerReturn;pickerReturn=null;$('#pickerNotice').hidden=true;await changeView(destination);}else if(focused)focusFeature(selectedUnit);
  }
  async function loadRivers(){
    if(!riversPromise)riversPromise=Promise.all([assets.script('assets/rivers-global.js'),assets.script('assets/rivers-detail.js')]).catch(e=>{riversPromise=null;throw e;});return riversPromise;
  }
  const riverBounds=new WeakMap();
  async function getRiverFeatures(bounds){await loadRivers();const all=[...(window.HYDRO_RIVERS_GLOBAL?.features||[]),...(window.HYDRO_RIVERS_DETAIL?.features||[])];
    if(!bounds)return all;return all.filter(f=>{let b=riverBounds.get(f);if(!b){b=d3.geoBounds(f);riverBounds.set(f,b);}return b[1][0]>=bounds[0]&&b[0][0]<=bounds[2]&&b[1][1]>=bounds[1]&&b[0][1]<=bounds[3];});}
  async function drawRivers(){if(!mapReady)return;riverLayer.style('display',$('#riverToggle').checked?null:'none');if(!$('#riverToggle').checked)return;
    try{const features=await getRiverFeatures();riverLayer.selectAll('*').remove();riverLayer.append('path').datum({type:'FeatureCollection',features}).attr('d',path).attr('fill','none').attr('stroke','#508fb6').attr('stroke-width',.75).attr('stroke-opacity',.8).attr('vector-effect','non-scaling-stroke');}catch{$('#mapLoadStatus').textContent='河网载入失败，可重开图层重试';}}
  async function ensureMap(){
    if(mapPromise)return mapPromise;
    mapPromise=(async()=>{
      projection=d3.geoNaturalEarth1().rotate([-8,0]).scale(185).translate([550,330]);path=d3.geoPath(projection);svg=d3.select('#worldMap');mapRoot=svg.append('g');
      canvas=new HydroBasinCanvas(mapRoot.append('g'),projection,path,(f,e)=>mapPick(f,e).catch(e=>toast(e.message)),hover);
      riverLayer=mapRoot.append('g').attr('pointer-events','none');upstreamLayer=mapRoot.append('g').attr('pointer-events','none');downstreamLayer=mapRoot.append('g').attr('pointer-events','none');currentLayer=mapRoot.append('g').attr('pointer-events','none');hoverLayer=mapRoot.append('g').attr('pointer-events','none');markerLayer=mapRoot.append('g').style('display','none');
      const markers=markerLayer.selectAll('g').data(references).join('g').attr('class','marker-group').attr('transform',d=>`translate(${projection(d.center)})`).attr('tabindex',0).attr('role','button').attr('aria-label',d=>d.name+'参考范围').on('click',(e,d)=>{e.stopPropagation();selectReference(d.id);}).on('keydown',(e,d)=>{if(e.key==='Enter'){e.stopPropagation();selectReference(d.id);}});
      markers.append('circle').attr('class','marker-dot').attr('r',3).attr('fill','#9b865e').attr('stroke','#fff').attr('stroke-width',1);markers.append('text').attr('class','marker-text').attr('x',7).attr('y',3).text(d=>d.name);
      zoom=d3.zoom().scaleExtent([.8,160]).translateExtent([[-600,-350],[1700,950]]).on('zoom',e=>{mapRoot.attr('transform',e.transform);const k=e.transform.k;markerLayer.selectAll('circle').attr('r',3/k);markerLayer.selectAll('text').style('font-size',11/k+'px');if(!frameRequest)frameRequest=requestAnimationFrame(()=>{frameRequest=null;canvas.renderAt(d3.zoomTransform(svg.node()));});}).on('end',async e=>{canvas.renderAt(e.transform);if(!imported&&e.transform.k>2.5){const ll=projection.invert(e.transform.invert([550,300])),r=await regionAt(ll);if(r)ensureRegion(r).catch(e=>toast(e.message));}});
      svg.call(zoom).on('dblclick.zoom',null);svg.on('mousemove.coords',e=>{const ll=projection.invert(d3.zoomTransform(svg.node()).invert(d3.pointer(e,svg.node())));if(ll)$('#mapCoordinate').textContent=`${ll[1].toFixed(2)}° / ${ll[0].toFixed(2)}°`;});
      mapReady=true;drawMap();
      const [all,filtered]=await Promise.all([assets.image('assets/l8-overview.png'),assets.image('assets/l8-overview-filtered.png'),ensureDirectory()]);canvas.setOverview(all,filtered);$('#mapLoading').hidden=true;renderDetail();
      ensureConnections().catch(e=>toast(e.message));drawRivers();return true;
    })().catch(e=>{mapPromise=null;$('#mapLoading').innerHTML='地图暂未载入。<button class="text-button" id="retryMap">重试</button>';$('#retryMap').onclick=()=>location.reload();throw e;});return mapPromise;
  }
  async function selectBasinById(id,options={}){
    const ticket=++selectionToken;id=String(id).trim();if(!/^\d{10}$/.test(id))throw Error('请输入完整的10位 HYBAS_ID');
    if(!native.has(id))await ensureRegion(id[0]);if(ticket!==selectionToken)return null;const f=native.get(id);if(!f)throw Error('未找到此流域编号');
    syncSelected(f);renderDetail();highlight();if(mapReady)ensureConnections().catch(e=>toast(e.message));
    if(options.view)await changeView(options.view,true);else if(view!=='overview')await renderCurrentDetail();
    if(ticket!==selectionToken)return null;if(options.eventId)window.HydroResearch?.selectEvent(options.eventId);updateHash();return f;
  }
  function selectReference(id){const r=references.find(x=>x.id===id),f=geo().majorBasins.features.find(f=>f.properties.sampleId===id);if(!r||!f)return;selectedUnit=f;selected={id:r.id,name:r.name+'参考范围',sourceId:null,region:'大流域定位',center:r.center,boundarySource:'HydroBASINS MAIN_BAS 合并'};connectionCache=null;renderDetail();highlight();focusFeature(f);}
  function updateHash(){const id=selected?.sourceId;history.replaceState(null,'','#'+view+(id?'?basin='+id:''));}
  async function changeView(next,keepRequest=false){
    if(!keepRequest){selectionToken++;researchToken++;}
    next=next==='cube'?'data':next==='events'?'results':next;if(!views[next])return;const changed=next!==view;view=next;if(changed)window.scrollTo({top:0,behavior:'auto'});const token=++viewToken;
    $('#overviewView').hidden=view!=='overview';$('#detailView').hidden=view==='overview';$$('.primary-nav [data-view]').forEach(b=>{const on=b.dataset.view===view;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    closeMenu();document.title=views[view]+' · HydroTransfer';updateHash();
    window.HydroResearch?.destroy?.();window.HydroCube?.destroy?.();window.HydroDetails?.destroy?.();window.HydroReport?.destroy?.();
    if(view==='overview'){renderDetail();await ensureMap();return;}
    $('#detailView').innerHTML='<div class="workspace-loading" role="status">正在载入工作区…</div>';
    try{if(view==='data')await assets.group('cube');else if(view==='results')await assets.group('results');else if(view==='reports')await assets.group('report');else await assets.group('details');if(token===viewToken)await renderCurrentDetail();}
    catch(e){if(token===viewToken){$('#detailView').innerHTML='<div class="empty-state"><h2>资源暂未载入</h2><p>请检查网络后重试。</p><button class="button" id="retryView">重新载入</button></div>';$('#retryView').onclick=()=>changeView(view);}console.warn(e.message);}
  }
  async function renderCurrentDetail(){
    if(view==='overview')return;
    if(view==='data')window.HydroCube?.render($('#detailView'),selected);else if(view==='results')window.HydroResearch?.render($('#detailView'),selected);else if(view==='reports')window.HydroReport?.render($('#detailView'),selected);else window.HydroDetails?.render($('#detailView'),view==='inputs'?'data':view,selected);
  }
  async function openResearchEvent(id){
    const ticket=++researchToken,event=window.HydroReport?.getEvent(id);if(!event)return;
    const summary=document.querySelector('#rrCredibility');if(summary)summary.setAttribute('aria-busy','true');
    try{await assets.script('assets/research-results.js');if(ticket!==researchToken)return;await selectBasinById(event.hybas_id,{view:'results',eventId:id});}
    catch(e){toast('候选详情载入失败，请重试。');throw e;}finally{summary?.removeAttribute('aria-busy');}
  }
  function openBasinPicker(returnView='data'){pickerReturn=returnView;$('#pickerNotice').hidden=false;changeView('overview');}
  function showSources(){const s=geo().source;openDialog('数据来源',`<div class="source-card"><b>HydroBASINS v1c · Level 8</b><p>全球 ${number(s.total_count)} 个本地分区，原始13项字段保留。地图先载入全球概览，详细几何按区域读取；地图几何做过显示概化。</p><p>SUB_AREA 为本地面积，UP_AREA 为出口以上累计上游面积。NEXT_DOWN 为同层级连接，内流区可能包含虚拟连接。</p><a href="${s.url}" target="_blank" rel="noopener">产品与文档 ↗</a></div><div class="source-card"><b>河网</b><p>独立的公开河网图层；全球概览展示主要河道，已有案例范围使用更详细河段。线和面各自保留来源，不根据分区中心连线生成河道。</p><a href="https://www.hydrosheds.org/products/hydrorivers" target="_blank" rel="noopener">HydroRIVERS ↗</a></div>${(window.HYDRO_CATALOG||[]).map(c=>`<div class="source-card"><b>${esc(c.name)}</b><p>${esc(c.description)}</p><a href="${esc(c.url)}" target="_blank" rel="noopener">来源 ↗</a></div>`).join('')}<div class="source-card"><b>研究报告</b><p>以正式报告 v5 及其原始判定表为依据。候选来源与最终确认洪水数不同，时间可信等级尚未评定。</p></div>`);}
  function inspectFeature(){const p=selectedUnit?.properties||{};openDialog('边界属性',`<p>地图表示本地分区。完整上游集水范围由 NEXT_DOWN 反向追踪组成，面积口径需区分。</p><table>${Object.entries(p).filter(([k])=>/^[A-Z_]+$/.test(k)).map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`);}
  let searchToken=0;
  async function search(){const q=$('#basinSearch').value.trim().toLowerCase(),token=++searchToken;const matches=references.filter(r=>(r.name+' '+r.en).toLowerCase().includes(q));
    let found=[];if(q.length>=3&&/^\d+$/.test(q)){if(!window.HYDRO_BASIN_DIRECTORY)await ensureDirectory();if(token!==searchToken)return;found=window.HYDRO_BASIN_DIRECTORY.ids.filter(id=>String(id).includes(q)).slice(0,16);}
    $('#searchResults').innerHTML=found.map(id=>{const f=native.get(String(id));return `<button data-search-unit="${id}"><span>${id}</span><small>${regionNames[String(id)[0]]}${f?' · '+number(f.properties.UP_AREA)+' km²':''}</small></button>`;}).join('')+matches.map(r=>`<button data-search-reference="${r.id}"><span>${r.name}</span><small>大流域参考范围</small></button>`).join('')||'<p>输入流域名称或至少3位编号；点击结果载入所在区域。</p>';$('#searchResults').hidden=false;
  }
  async function importBoundary(file){if(!file)return;try{if(file.size>35*1024*1024)throw Error('请选择35 MB以下的文件');const obj=JSON.parse(await file.text()),fc=obj.type==='FeatureCollection'?obj:obj.type==='Feature'?{type:'FeatureCollection',features:[obj]}:null;if(!fc?.features.length||fc.features.length>20000)throw Error('支持1–20,000个GeoJSON面');for(const f of fc.features){if(!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('只支持面几何');const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const rings of polys)for(const ring of rings){if(ring.length<4||ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])throw Error('边界环需要首尾闭合');for(const p of ring)if(!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90)throw Error('需要WGS84经纬度坐标');}}imported=normalize(fc);await changeView('overview');syncSelected(imported.features[0],true);drawMap();renderDetail();focusFeature(imported);toast('已导入 '+fc.features.length+' 个面，文件仅在本机读取。');}catch(e){toast(e.message);}finally{$('#boundaryFile').value='';}}
  window.HydroTransferUI={selectBasinById,openBasinPicker,getSelected:()=>selected,getSelectedFeature:activeFeature,getFeature:id=>window.HYDRO_NATIVE_BOUNDARIES?.[String(id)]||native.get(String(id))||null,getRiverFeatures,loadAsset:assets.script,openResearchEvent};
  window.HydroTransferState={get selected(){return selected;},get selectedUnit(){return selectedUnit;},get visibleCount(){return visibleCollection().features.length;},get source(){return geo().source;},get upstreamCount(){return connections().upstream.length;},get downstreamCount(){return connections().downstream.length;},get loadedRegions(){return [...loadedRegions];}};
  document.addEventListener('click',e=>{
    const picker=e.target.closest('[data-pick-basin]');if(picker){openBasinPicker(picker.dataset.returnView||view);return;}
    const nav=e.target.closest('[data-view]');if(nav){e.preventDefault();changeView(nav.dataset.view);return;}
    const unit=e.target.closest('[data-search-unit],[data-research-basin]');if(unit){$('#searchResults').hidden=true;selectBasinById(unit.dataset.searchUnit||unit.dataset.researchBasin,{view:pickerReturn||view}).then(()=>{if(pickerReturn){pickerReturn=null;$('#pickerNotice').hidden=true;}if(view==='overview'){ensureConnections().then(focusConnections);}updateHash();}).catch(e=>toast(e.message));return;}
    const ref=e.target.closest('[data-search-reference]');if(ref){$('#searchResults').hidden=true;selectReference(ref.dataset.searchReference);return;}
    if(e.target.closest('[data-inspect-selected]'))inspectFeature();if(!e.target.closest('.map-search'))$('#searchResults').hidden=true;if(!e.target.closest('.header-actions'))closeMenu();if(!e.target.closest('.map-layer-control')){$('#layersPopover').hidden=true;$('#layersBtn').setAttribute('aria-expanded','false');}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#searchResults').hidden=true;$('#layersPopover').hidden=true;$('#layersBtn').setAttribute('aria-expanded','false');if(closeMenu())$('#appMenuButton').focus();}});
  $('#appMenuButton').onclick=()=>{const open=$('#appMenu').hidden;$('#appMenu').hidden=!open;$('#appMenuButton').setAttribute('aria-expanded',String(open));if(open)$('#appMenu button').focus();};
  $('#sourceBtn').onclick=()=>{closeMenu();showSources();};$('#mapSources').onclick=showSources;
  $('#aboutBtn').onclick=()=>{closeMenu();openDialog('关于 HydroTransfer','<p>面向日尺度连续径流研究的全球流域数据与多来源洪水证据浏览平台。</p><p>当前提供真实边界、只读地理数据预览、来源候选和正式报告。参数移植与模型计算仍为演示接口。</p>');};
  $('#closeDialog').onclick=()=>$('#infoDialog').close();
  $('#exportProject').onclick=async()=>{closeMenu();if(selected.sourceId)await ensureDirectory();const r=selected.sourceId?connections():null;download('HydroTransfer-config.json',{project:'HydroTransfer',selected_basin:selected,boundary_source:selected.boundarySource,scope:fullUpstream?'upstream':'local',topology:r?{upstream_ids:r.upstream.map(f=>f.properties.id),downstream_ids:r.downstream.map(f=>f.properties.id)}:null,area_filter:$('#areaFilter').value,time_step:'daily',model_executed:false,exported_at:new Date().toISOString()});};
  $('#basinSearch').addEventListener('input',()=>search().catch(e=>toast(e.message)));$('#basinSearch').addEventListener('focus',()=>search().catch(e=>toast(e.message)));$('#basinSearch').addEventListener('keydown',e=>{if(e.key==='Enter')$('#searchResults button')?.click();});
  $('#worldView').onclick=worldView;$('#resetMap').onclick=worldView;$('#basinView').onclick=()=>ensureConnections().then(focusConnections);$('#zoomIn').onclick=()=>mapReady&&svg.transition().duration(180).call(zoom.scaleBy,1.5);$('#zoomOut').onclick=()=>mapReady&&svg.transition().duration(180).call(zoom.scaleBy,1/1.5);
  $('#layersBtn').onclick=()=>{const open=$('#layersPopover').hidden;$('#layersPopover').hidden=!open;$('#layersBtn').setAttribute('aria-expanded',String(open));};$('#basinToggle').onchange=()=>{canvas?.show($('#basinToggle').checked);highlight();};$('#riverToggle').onchange=drawRivers;$('#markerToggle').onchange=e=>markerLayer?.style('display',e.target.checked?null:'none');$('#areaFilter').onchange=drawMap;
  $('#mapRegion').onchange=async e=>{const code=e.target.value;if(code==='auto')return;await ensureRegion(code);if($('#mapRegion').value===code)focusFeature({type:'FeatureCollection',features:[...native.values()].filter(f=>f.properties.id[0]===code)});};
  $('#referenceSelect').onchange=e=>selectReference(e.target.value);
  $('#orderHelp').onclick=()=>openDialog('层级与面积口径','<p>Level 8 是 Pfafstetter 分区层级。SUB_AREA 表示本地面积；UP_AREA 表示其出口以上累计上游集水面积。</p><p>面积筛选只改变显示范围，不改变上下游拓扑。200–3000 km²对应116,697个候选出口，可能彼此嵌套。</p>');
  $('#importBoundary').onclick=()=>{closeMenu();openDialog('导入边界','<p>支持WGS84 GeoJSON面文件，最多35 MB、20,000个面。导入文件只在当前浏览器读取。</p><button class="button primary" id="chooseBoundary">选择文件</button> <button class="button" id="restoreBoundary">恢复默认边界</button>');};
  $('#dialogContent').addEventListener('click',e=>{if(e.target.id==='chooseBoundary'){$('#infoDialog').close();$('#boundaryFile').click();}if(e.target.id==='restoreBoundary'){imported=null;syncSelected(native.get('4080933560')||native.values().next().value);drawMap();renderDetail();$('#infoDialog').close();worldView();}});$('#boundaryFile').onchange=e=>importBoundary(e.target.files[0]);
  $('#finishBasinPick').onclick=()=>{const to=pickerReturn||'data';pickerReturn=null;$('#pickerNotice').hidden=true;changeView(to);};$('#cancelBasinPick').onclick=()=>{const to=pickerReturn||'data';pickerReturn=null;$('#pickerNotice').hidden=true;changeView(to);};
  window.addEventListener('hashchange',()=>{const [route,params]=location.hash.slice(1).split('?'),id=new URLSearchParams(params||'').get('basin');if(id&&id!==selected?.sourceId)selectBasinById(id,{view:route}).catch(e=>toast(e.message));else if(views[route]&&view!==route)changeView(route);});
  const [initial,params]=location.hash.slice(1).split('?'),id=new URLSearchParams(params||'').get('basin');
  if(id&&id!==selected.sourceId)selectBasinById(id,{view:views[initial]?initial:'data'}).catch(e=>{toast(e.message);changeView('data');});else changeView(views[initial]?initial:'overview');
})();
