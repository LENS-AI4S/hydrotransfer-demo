/* Presentation of saved research outputs, never a scientific computation job. */
(() => {
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=(x,d=0)=>x==null?'—':Number(x).toLocaleString('zh-CN',{maximumFractionDigits:d});
  const data=()=>window.HYDRO_RESULTS;
  let active=null,timer=null,frame=0,host=null;
  const stop=()=>{clearInterval(timer);timer=null;};
  const cases=()=>data()?.cases||[];
  const getCase=id=>cases().find(c=>c.hybas_id===String(id));
  const currentEvent=()=>active?.case.events.find(e=>e.id===active.event);
  function caseCards(){return cases().map(c=>`<button class="rr-case-card" data-research-basin="${c.hybas_id}"><span>${esc(c.city)}<small>关联流域 · ${c.hybas_id}</small></span><b>${c.events.length}<small>条来源候选</small></b><em>${c.events.filter(e=>e.modis.frames.length).length} 项动态 MODIS</em></button>`).join('');}
  function overview(root){if(!root||!data())return;root.innerHTML=`<div class="rr-overview-title"><div><span class="eyebrow">CONNECTED RESEARCH RESULTS</span><h2>已接入的五流域成果</h2><p>点选一个流域，查看来源候选、流量和逐日遥感结果。</p></div><span class="rr-tag">${data().run_id} · v2</span></div><div class="rr-case-grid">${caseCards()}</div>`;}
  function plot(series,{unit='',threshold=null,event=null,cursor=null,height=174}={}){
    if(!series.length)return '<div class="rr-empty">没有已接入的时间序列。</div>';
    const width=680,margin={left:58,right:16,top:19,bottom:30};
    const times=series.map(r=>new Date(r[0]+'T00:00:00Z'));
    const x=d3.scaleUtc().domain(d3.extent(times)).range([margin.left,width-margin.right]);
    const max=d3.max(series,r=>r[1]??0)||1;
    const y=d3.scaleLinear().domain([0,Math.max(max,threshold||0)*1.12]).nice().range([height-margin.bottom,margin.top]);
    const svg=d3.create('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('class','rr-chart').attr('role','img').attr('aria-label',unit+'实际处理序列');
    if(event){const l=Math.max(margin.left,x(new Date(event.start+'T00:00:00Z'))),r=Math.min(width-margin.right,x(new Date(event.end+'T00:00:00Z')));if(r>=l)svg.append('rect').attr('x',l).attr('y',margin.top).attr('width',Math.max(2,r-l)).attr('height',height-margin.bottom-margin.top).attr('fill','#e9edf1');}
    svg.append('g').attr('transform',`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.utcFormat('%m-%d')));
    svg.append('g').attr('transform',`translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(width-margin.left-margin.right))).call(g=>g.selectAll('.tick line').attr('stroke','#e7eef3'));
    svg.append('path').datum(series).attr('fill','none').attr('stroke','#197fb4').attr('stroke-width',2).attr('d',d3.line().defined(r=>r[1]!=null).x(r=>x(new Date(r[0]+'T00:00:00Z'))).y(r=>y(r[1])));
    if(threshold!=null)svg.append('line').attr('x1',margin.left).attr('x2',width-margin.right).attr('y1',y(threshold)).attr('y2',y(threshold)).attr('stroke','#bd944d').attr('stroke-dasharray','5 4');
    if(cursor){const cx=x(new Date(cursor+'T00:00:00Z'));if(cx>=margin.left&&cx<=width-margin.right)svg.append('line').attr('x1',cx).attr('x2',cx).attr('y1',margin.top).attr('y2',height-margin.bottom).attr('stroke','#e48650').attr('stroke-width',1.5);}
    svg.append('text').attr('x',margin.left).attr('y',11).attr('fill','#8197a6').attr('font-size',10).text(unit);
    svg.selectAll('.domain').attr('stroke','#cbdce7');svg.selectAll('.tick text').attr('fill','#8197a6').attr('font-size',10);
    return svg.node().outerHTML;
  }
  function timeline(e){
    const groups=[['来源记录',[{date:e.start,end_date:e.end}]],['MODIS候选',e.modis.peak_date?[{date:e.modis.onset||e.modis.peak_date,end_date:e.modis.end||e.modis.peak_date}]:[]],['文本匹配',e.links.filter(x=>x.channel==='text')],['流量候选',e.links.filter(x=>x.channel==='hydrology')],['SAR记录',e.links.filter(x=>x.channel==='sar')]];
    const dates=groups.flatMap(g=>g[1].flatMap(r=>[r.date,r.end_date||r.date])).filter(Boolean);
    const start=d3.min(dates),end=d3.max(dates);if(!start)return '';
    const x=d3.scaleUtc().domain([new Date(start+'T00:00:00Z'),new Date(end+'T00:00:00Z')]).range([100,660]);
    if(start===end)x.domain([new Date(Date.parse(start)-86400000),new Date(Date.parse(end)+86400000)]);
    const colors=['#8598aa','#218cba','#59a69f','#577eb7','#c2985a'];
    return `<svg class="rr-chart" viewBox="0 0 680 160" role="img" aria-label="来源与多模态证据时间线">${groups.map(([label,items],i)=>`<text x="5" y="${25+i*25}" fill="#7d95a6" font-size="10">${label}</text><line x1="100" x2="660" y1="${21+i*25}" y2="${21+i*25}" stroke="#e5edf3"/>${items.filter(r=>r.date).map(r=>`<rect x="${x(new Date(r.date+'T00:00:00Z'))}" y="${16+i*25}" width="${Math.max(4,x(new Date((r.end_date||r.date)+'T00:00:00Z'))-x(new Date(r.date+'T00:00:00Z')))}" height="10" rx="2" fill="${colors[i]}" opacity=".75"/>`).join('')}${!items.length?`<text x="112" y="${25+i*25}" fill="#a4b2bd" font-size="9">无已关联记录</text>`:''}`).join('')}<text x="100" y="153" fill="#8ca0ae" font-size="10">${start}</text><text x="660" y="153" text-anchor="end" fill="#8ca0ae" font-size="10">${end}</text></svg>`;
  }
  function statusCards(e){const n=e.counts;return `<div class="rr-status-grid"><article><small>文本</small><b>已匹配 ${n.text||0} 条</b><span>证据采用待核定</span></article><article><small>GloFAS</small><b>${n.hydrology?'关联 '+n.hydrology+' 个高流量候选':'未关联高流量候选'}</b><span>模型格点序列</span></article><article><small>MODIS</small><b>${e.modis.selected_method?'选中光学候选':'证据不足'}</b><span>${e.modis.selected_method?e.modis.selected_method.toUpperCase()+' · '+e.modis.frames.length+' 日序列':'未生成逐日结果'}</span></article><article><small>SAR</small><b>${n.sar?'关联 '+n.sar+' 条检测证据':'无关联检测记录'}</b><span>观测覆盖状态未知</span></article></div>`;}
  function render(root,basin){
    stop();host=root;
    const c=getCase(basin?.sourceId||basin?.id);
    if(!c){active=null;root.innerHTML=`<section class="rr-results"><div class="rr-head"><div><span class="eyebrow">RESEARCH RESULTS</span><h2>五流域成果浏览</h2><p>${basin?.sourceId?'当前选中分区尚未接入处理成果。':''}选择下方任一试点，直接展开已有系列结果。</p></div></div><div class="rr-case-grid">${caseCards()}</div>${projectCard()}</section>`;bindArchitecture();return;}
    const previous=active?.case.id===c.id?active.event:null;
    active={case:c,event:previous||c.events.find(e=>e.modis.frames.length&&e.modis.source_window_overlap===true)?.id||c.events.find(e=>e.modis.frames.length)?.id||c.events[0].id};
    renderEvent();
  }
  function projectCard(){const s=data().source_repo;return `<section class="rr-project"><div><b>代码框架与 GitHub 项目</b><p>GUFE → GBFE 流域处理 → 只读成果适配 → 地图与多模态结果。参数移植与模拟接口待接入。</p></div><button class="button" id="rrArchitecture">查看设计框架</button><a class="button" href="https://github.com/LENS-AI4S/hydrotransfer-demo" target="_blank" rel="noopener noreferrer">GitHub 展示项目 ↗</a></section>`;}
  function renderEvent(){
    stop();const c=active.case,e=currentEvent();frame=Math.max(0,e.modis.frames.findIndex(f=>f.day===e.modis.peak_date));
    const mapping=c.mapping,range=e.modis.frames.map(f=>f.day);range.push(e.start,e.end);
    const from=new Date(d3.min(range)+'T00:00:00Z');from.setUTCDate(from.getUTCDate()-12);
    const to=new Date(d3.max(range)+'T00:00:00Z');to.setUTCDate(to.getUTCDate()+12);
    const flow=c.flow.filter(r=>r[0]>=from.toISOString().slice(0,10)&&r[0]<=to.toISOString().slice(0,10));
    active.flow=flow;
    host.innerHTML=`<section class="rr-results"><div class="rr-head"><div><span class="eyebrow">CONNECTED RESEARCH RESULTS · ${data().run_id}</span><h2>${esc(c.name)}<small>Level 8 · ${c.hybas_id}</small></h2><p>本地面积 ${num(c.area,1)} km² · 累计上游面积 ${num(c.up_area,1)} km² · ${c.events.length} 条来源候选</p></div><span class="rr-tag">真实处理成果</span></div><div class="rr-case-tabs">${cases().map(x=>`<button class="${x.id===c.id?'active':''}" data-research-basin="${x.hybas_id}">${x.city}</button>`).join('')}</div><div class="rr-event-toolbar"><label>来源候选 <select id="rrEvent" aria-label="选择来源候选">${c.events.map(x=>`<option value="${x.id}"${x.id===e.id?' selected':''}>${esc(x.source_event)} · ${esc(x.start)}</option>`).join('')}</select></label><span>${e.start} — ${e.end}</span><span class="rr-tag amber">最终事件采用待核定</span></div>${statusCards(e)}<div class="rr-main-grid"><section class="rr-panel"><div class="rr-panel-title"><h3>MODIS 逐日结果</h3><span>${e.modis.frames.length?'真实栅格按日回放':'静态识别对照'}</span></div>${e.modis.frames.length?`<div class="rr-player"><div class="rr-image-stage"><img id="rrFrame" alt="所选日期的MODIS候选水体掩膜"/><span id="rrFrameDay"></span></div><div class="rr-play-controls"><button id="rrPlay" class="button primary">▶ 播放</button><button id="rrPrev" class="button" aria-label="上一日">‹</button><input id="rrSlider" aria-label="MODIS 日期" type="range" min="0" max="${e.modis.frames.length-1}" value="${frame}"/><button id="rrNext" class="button" aria-label="下一日">›</button><select id="rrSpeed" aria-label="播放速度"><option value="900">1×</option><option value="450">2×</option><option value="1800">0.5×</option></select></div><div class="rr-frame-metrics" id="rrFrameMetrics"></div><p class="rr-image-legend"><i></i>蓝色：候选水体　<span>灰色：缺测 / 无参考值</span></p><p class="rr-caption">${e.modis.display_note}</p></div>`:`<img class="rr-comparison" src="${e.modis.comparison}" alt="固定阈值与Otsu识别对照"/><p class="rr-caption">本项未通过光学支持规则；保留原始对照结果，没有逐日播放数据。</p>`}</section><section class="rr-panel"><div class="rr-panel-title"><h3>流量与光学面积过程</h3><span>来源日期区间为灰色背景</span></div><div class="rr-panel-body"><div class="rr-chart-title">GloFAS 流量 · ${esc(mapping.grid_id)}</div><div id="rrFlowChart">${plot(flow,{unit:'流量 / m³·s⁻¹',threshold:c.threshold,event:e})}</div><p class="rr-caption">虚线：长期基准高流量进入阈值 ${num(c.threshold,2)} m³/s。</p><div class="rr-mapping ${c.id==='case_01'?'problem':''}">${c.id==='case_01'?'北京格点不能代表所选完整流域':'候选出口映射待核验'} · 面积比 ${num(mapping.upstream_area_ratio,3)} · IoU ${num(mapping.catchment_iou,3)}</div><div class="rr-chart-title">MODIS 候选水体面积</div><div id="rrAreaChart">${e.modis.frames.length?plot(e.modis.frames.map(f=>[f.day,f.water_km2]),{unit:'面积 / km²',event:e}):'<div class="rr-empty">本项没有逐日面积结果。</div>'}</div><p class="rr-caption">${e.modis.source_window_overlap===false?'候选过程与原来源日期区间不相交。':e.modis.selected_method?'光学候选及其时间范围尚未确认来源归属。':'光学证据不足。'}</p></div></section></div><section class="rr-panel rr-timeline"><div class="rr-panel-title"><h3>多模态证据时间线</h3><span>保留各来源实际时间</span></div><div class="rr-panel-body">${timeline(e)}</div></section><div class="rr-secondary-grid"><section class="rr-panel"><div class="rr-panel-title"><h3>文本与 SAR 已有结果</h3></div><div class="rr-panel-body"><div class="rr-mini-metrics"><div><b>${num(c.text_count)}</b><span>流域内文本记录</span></div><div><b>${num(c.sar_points)}</b><span>SAR 检测点</span></div><div><b>${num(c.sar_evidence)}</b><span>SAR 影像日期证据</span></div></div><canvas id="rrSarMap" width="900" height="420" class="rr-sar-map" role="img" aria-label="SAR检测点空间分布"></canvas><p class="rr-caption">青色：本流域全观测期检测点；橙色：当前候选关联日期的点。由检测点位置绘制，不是原始SAR影像。</p><p class="rr-caption">当前来源候选已关联：文本 ${e.counts.text||0} 条、SAR ${e.counts.sar||0} 条。匹配与检测记录均保留，证据采用尚待核定。</p><details><summary>查看当前候选证据明细（${e.links.length} 条）</summary><div class="rr-table-wrap"><table><thead><tr><th>模态</th><th>日期</th><th>来源</th><th>处理观测</th><th>采用状态</th></tr></thead><tbody>${e.links.map(l=>`<tr><td>${({text:'文本',hydrology:'流量',sar:'SAR',modis:'MODIS'})[l.channel]}</td><td>${l.date||'未提供'}</td><td title="${esc(l.record)}">${esc(l.source)}</td><td>${esc(({positive:'有证据记录',insufficient:'证据不足',negative:'未检出',unknown:'未知'})[l.observation]||l.observation)}</td><td>${l.review_status==='pending'?'待核定':esc(l.review_status)}</td></tr>`).join('')}</tbody></table></div></details></div></section><section class="rr-panel"><div class="rr-panel-title"><h3>已有基础数据</h3><span>全球资产状态快照</span></div><div class="rr-panel-body rr-inputs">${data().inputs.map(x=>`<div><b>${x.name}</b><span>${x.status}</span><small>${x.scope}</small></div>`).join('')}</div></section></div>${e.modis.frames.length?`<details class="rr-panel rr-original"><summary>固定阈值 / Otsu 原始对照图</summary><img class="rr-comparison" src="${e.modis.comparison}" alt="MODIS原始识别对照"/></details>`:''}${projectCard()}<footer class="rr-provenance"><span>GBFEID：${e.id}</span><span>成果包 SHA-256：${data().bundle_sha256.slice(0,16)}…</span><span>快照：${data().generated_at}</span></footer></section>`;
    host.querySelector('#rrEvent').onchange=ev=>{active.event=ev.target.value;renderEvent();};
    if(e.modis.frames.length){
      host.querySelector('#rrPlay').onclick=()=>{if(timer){stop();host.querySelector('#rrPlay').textContent='▶ 播放';}else{host.querySelector('#rrPlay').textContent='Ⅱ 暂停';timer=setInterval(()=>{frame=(frame+1)%e.modis.frames.length;updateFrame();},Number(host.querySelector('#rrSpeed').value));}};
      host.querySelector('#rrSlider').oninput=ev=>{frame=Number(ev.target.value);updateFrame();};
      host.querySelector('#rrPrev').onclick=()=>{frame=Math.max(0,frame-1);updateFrame();};host.querySelector('#rrNext').onclick=()=>{frame=Math.min(e.modis.frames.length-1,frame+1);updateFrame();};
      host.querySelector('#rrSpeed').onchange=()=>{if(timer){stop();timer=setInterval(()=>{frame=(frame+1)%e.modis.frames.length;updateFrame();},Number(host.querySelector('#rrSpeed').value));}};
      updateFrame();
    }
    renderSar();
    for(const image of host.querySelectorAll('.rr-comparison'))image.onclick=()=>{stop();const button=host.querySelector('#rrPlay');if(button)button.textContent='▶ 播放';document.querySelector('#dialogTitle').textContent='MODIS 原始识别对照';const copy=image.cloneNode();copy.className='rr-full-image';document.querySelector('#dialogContent').replaceChildren(copy);document.querySelector('#infoDialog').showModal();};
    bindArchitecture();
  }
  function renderSar(){
    const canvas=host?.querySelector('#rrSarMap'),c=active?.case;if(!canvas||!c)return;
    const f=window.HYDRO_GEO.basins.features.find(f=>f.properties.id===c.hybas_id);if(!f)return;
    const ctx=canvas.getContext('2d'),projection=d3.geoMercator().fitExtent([[15,15],[435,195]],f);
    ctx.scale(2,2);ctx.clearRect(0,0,450,210);ctx.fillStyle='#f6fafc';ctx.fillRect(0,0,450,210);
    const shape=d3.geoPath(projection).context(ctx);ctx.beginPath();shape(f);ctx.fillStyle='#e5f1f6';ctx.fill();ctx.strokeStyle='#8bb5ca';ctx.lineWidth=.8;ctx.stroke();
    const dates=new Set(currentEvent().links.filter(l=>l.channel==='sar').map(l=>l.date));
    for(const point of c.sar_coordinates||[]){const xy=projection(point);ctx.fillStyle=dates.has(point[2])?'#dc9650':'#218fb4';ctx.globalAlpha=.6;ctx.fillRect(xy[0]-1,xy[1]-1,2,2);}ctx.globalAlpha=1;
  }
  function updateFrame(){
    const e=currentEvent(),f=e.modis.frames[frame];if(!f||!host)return;
    const img=host.querySelector('#rrFrame');img.src=f.image||'';img.style.visibility=f.image?'visible':'hidden';img.parentElement.dataset.missing=f.image?'':'缺少该日栅格';img.dataset.day=f.day;
    host.querySelector('#rrFrameDay').textContent=f.day;host.querySelector('#rrSlider').value=frame;
    host.querySelector('#rrFrameMetrics').innerHTML=`<b>${f.water_km2==null?'无有效观测':num(f.water_km2,3)+' km²'}</b><span>观测覆盖 ${f.observed_fraction==null?'未知':num(f.observed_fraction*100,1)+'%'}</span><span>严格晴空 ${f.clear_fraction==null?'未知':num(f.clear_fraction*100,1)+'%'}</span>`;
    host.querySelector('#rrAreaChart').innerHTML=plot(e.modis.frames.map(x=>[x.day,x.water_km2]),{unit:'面积 / km²',event:e,cursor:f.day});
    host.querySelector('#rrFlowChart').innerHTML=plot(active.flow,{unit:'流量 / m³·s⁻¹',threshold:active.case.threshold,event:e,cursor:f.day});
  }
  function bindArchitecture(){const b=host?.querySelector('#rrArchitecture');if(!b)return;b.onclick=()=>{document.querySelector('#dialogTitle').textContent='HydroTransfer 初步代码框架';document.querySelector('#dialogContent').innerHTML='<div class="rr-architecture"><article><b>01 · 科学处理层</b><p>复用 GUFE → GBFE：流域身份、来源候选、文本、GloFAS、MODIS、SAR、证据关联。</p><code>basin-flood-events/src/gbfe/</code></article><article><b>02 · 成果适配层</b><p>只读既有成果包、逐日栅格、流量 CSV；校验版本和面积，导出轻量快照。</p><code>scripts/export_research_results.py</code></article><article><b>03 · 展示层</b><p>全球地图、上下游高亮、五试点、逐候选多模态结果与 MODIS 日期播放。</p><code>dist/research-results.js</code></article><article><b>04 · 模型接口层</b><p>后续接入流域输入、来源参数、参数移植与模型计算。当前尚无真实模拟结果。</p></article></div>';document.querySelector('#infoDialog').showModal();};}
  window.HydroResearch={cases,getCase,overview,render,destroy:stop};
})();
