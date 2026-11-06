/* Presentation of saved research outputs, never a scientific computation job. */
(() => {
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=(x,d=0)=>x==null?'—':Number(x).toLocaleString('zh-CN',{maximumFractionDigits:d});
  const data=()=>window.HYDRO_RESULTS;
  let active=null,timer=null,frame=0,host=null,sourceTab="overview",selectedBasin=null;
  const stop=()=>{clearInterval(timer);timer=null;};
  const cases=()=>data()?.cases||[];
  const getCase=id=>cases().find(c=>c.hybas_id===String(id));
  const reportFor=e=>window.HydroReport?.getEvent?.(e.id);
  const eventNumber=e=>reportFor(e)?.no||'';
  function compareEvents(a,b){const an=eventNumber(a),bn=eventNumber(b);if(an&&bn)return an.localeCompare(bn,undefined,{numeric:true});if(an)return -1;if(bn)return 1;return String(a.start).localeCompare(String(b.start))||String(a.source_event).localeCompare(String(b.source_event))||a.id.localeCompare(b.id);}
  const orderedEvents=c=>[...(c?.events||[])].sort(compareEvents);
  const firstEvent=(c,previous)=>c.events.some(e=>e.id===previous)?previous:orderedEvents(c)[0]?.id;
  const eventLabel=e=>{const number=eventNumber(e),r=reportFor(e),month=(r?.dates?.start_precision||e.precision)==='month';return (number?number+' · ':'')+e.source_event+' · '+(month?e.start.slice(0,7)+'（月精度）':e.start)+(e.end!==e.start?' — '+e.end:'');};
  const currentEvent=()=>active?.case.events.find(e=>e.id===active.event);
  function overview(root){if(!root||!data())return;root.innerHTML=`<div class="rr-overview-inline"><div><b>已有研究成果</b><span>${cases().length} 个分区 · ${data().totals.source_anchors} 条来源候选</span></div><button class="button" data-view="results">查看判定总览 →</button></div>`;}
  const reportEvent=()=>window.HydroReport?.getEvent?.(currentEvent()?.id);
  const sourceWindow=(e,r)=>((r?.dates?.start_precision||e.precision)==='month'?'来源可能窗口 ':'来源时段 ')+e.start+' — '+e.end+((r?.dates?.start_precision||e.precision)==='month'?'（起始为月精度）':'');
  function chooseEvent(id){const c=cases().find(c=>c.events.some(e=>e.id===id));if(!c)return;const same=active?.case.id===c.id;active={case:c,event:id};sourceTab='overview';if(!same&&window.HydroTransferUI?.selectBasinById){window.HydroTransferUI.selectBasinById(c.hybas_id,{view:'results'});return;}renderEvent();host.querySelector('#rrCandidate')?.scrollIntoView({behavior:'smooth',block:'start'});}
  function openResearchEvent(id){
    if(data()){chooseEvent(id);return;}
    const button=host?.querySelector('[data-report-event="'+id+'"]');if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
    const action=window.HydroTransferUI?.openResearchEvent;
    if(!action){if(button){button.disabled=false;button.removeAttribute('aria-busy');}return;}
    Promise.resolve(action(id)).catch(()=>{const area=host?.querySelector('#rrSourceLoadStatus');if(area)area.textContent='该案例的影像与过程载入失败，请点击案例重试。';if(button){button.disabled=false;button.removeAttribute('aria-busy');}});
  }
  function renderReportOnly(){
    const id=String(selectedBasin?.sourceId||selectedBasin?.id||''),rows=window.HydroReport?.getCredibilityRows?.(id)||[];
    const outside=id&&!rows.length;
    host.innerHTML='<section class="rr-results"><section class="rr-summary" aria-label="可信洪水事件"><div id="rrCredibility"></div></section><section class="rr-candidate rr-empty-state"><h2>'+ (outside?'当前分区尚未接入事件成果':'选择案例查看分来源结果')+'</h2><p>'+ (outside?'上方总表列出已完成的来源候选；当前分区不会套用其他流域的数据。':'先浏览来源与多模态判定。点击案例后再载入影像、过程线和原始证据。')+'</p><p id="rrSourceLoadStatus" role="status"></p><button class="button" data-pick-basin data-return-view="results">从地图选择流域</button></section></section>';
    const area=host.querySelector('#rrCredibility');
    if(window.HydroReport?.attachSummary)window.HydroReport.attachSummary(area,undefined,{compact:true,onSelect:openResearchEvent});
    else area.innerHTML='<div class="rr-empty">判定表正在载入。</div>';
  }
  function selectCase(id){const c=getCase(id);if(!c)return;active={case:c,event:firstEvent(c,active?.case.id===c.id?active.event:null)};sourceTab='overview';if(window.HydroTransferUI?.selectBasinById)window.HydroTransferUI.selectBasinById(id,{view:'results'});else renderEvent();}
  function summaryHtml(){return `<div class="rr-summary-heading"><h2>可信洪水事件</h2><span>正式事件采用待核定</span></div><p class="rr-caption">正式报告判定表尚未载入。下表仅列来源候选，不以证据数量代替可信度。</p><div class="rr-table-wrap"><table class="rr-table"><thead><tr><th>流域</th><th>来源候选</th><th>来源时段</th><th>状态</th><th></th></tr></thead><tbody>${cases().flatMap(c=>orderedEvents(c).map(e=>({c,e}))).sort((a,b)=>compareEvents(a.e,b.e)).map(({c,e})=>`<tr><td>${esc(c.city)}</td><td>${esc(eventNumber(e)?eventNumber(e)+' · ':'')}${esc(e.source_event)}</td><td>${e.start} — ${e.end}</td><td>待核定</td><td><button class="rr-row-action" data-rr-event="${e.id}">查看</button></td></tr>`).join('')}</tbody></table></div>`;}
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
    svg.append('text').attr('x',margin.left).attr('y',11).attr('fill','#64707d').attr('font-size',11).text(unit);
    svg.selectAll('.domain').attr('stroke','#cbdce7');svg.selectAll('.tick text').attr('fill','#64707d').attr('font-size',11);
    return svg.node().outerHTML;
  }
  function timeline(e){
    const groups=[['来源记录',[{date:e.start,end_date:e.end}]],['MODIS候选',e.modis.peak_date?[{date:e.modis.onset||e.modis.peak_date,end_date:e.modis.end||e.modis.peak_date}]:[]],['文本匹配',e.links.filter(x=>x.channel==='text')],['流量候选',e.links.filter(x=>x.channel==='hydrology')],['SAR记录',e.links.filter(x=>x.channel==='sar')]];
    const dates=groups.flatMap(g=>g[1].flatMap(r=>[r.date,r.end_date||r.date])).filter(Boolean);
    const start=d3.min(dates),end=d3.max(dates);if(!start)return '';
    const x=d3.scaleUtc().domain([new Date(start+'T00:00:00Z'),new Date(end+'T00:00:00Z')]).range([100,660]);
    if(start===end)x.domain([new Date(Date.parse(start)-86400000),new Date(Date.parse(end)+86400000)]);
    const colors=['#8598aa','#218cba','#59a69f','#577eb7','#c2985a'];
    return `<svg class="rr-chart" viewBox="0 0 680 160" role="img" aria-label="来源与多模态证据时间线">${groups.map(([label,items],i)=>`<text x="5" y="${25+i*25}" fill="#596573" font-size="11">${label}</text><line x1="100" x2="660" y1="${21+i*25}" y2="${21+i*25}" stroke="#e5edf3"/>${items.filter(r=>r.date).map(r=>`<rect x="${x(new Date(r.date+'T00:00:00Z'))}" y="${16+i*25}" width="${Math.max(4,x(new Date((r.end_date||r.date)+'T00:00:00Z'))-x(new Date(r.date+'T00:00:00Z')))}" height="10" rx="2" fill="${colors[i]}" opacity=".75"/>`).join('')}${!items.length?`<text x="112" y="${25+i*25}" fill="#7a8490" font-size="10">无已关联记录</text>`:''}`).join('')}<text x="100" y="153" fill="#64707d" font-size="11">${start}</text><text x="660" y="153" text-anchor="end" fill="#64707d" font-size="11">${end}</text></svg>`;
  }
  function render(root,basin){stop();host=root;selectedBasin=basin;host.classList.remove('hd-root');const c=getCase(basin?.sourceId||basin?.id),old=active;if(!c)active=null;else{if(old?.case.id!==c.id)sourceTab='overview';active={case:c,event:firstEvent(c,old?.case.id===c.id?old.event:null)};}renderEvent();}
  function projectCard(){return `<details class="rr-method-details"><summary>数据来源与代码框架</summary><div class="rr-method-body"><p>来源候选和证据采用状态保留在成果包中，来源记录不等于跨来源去重后的独立洪水数。参数移植与真实水文模拟接口尚待接入。</p><div class="rr-input-list">${data().inputs.map(x=>`<div><b>${esc(x.name)}</b><span>${esc(x.status)}</span><small>${esc(x.scope)}</small></div>`).join('')}</div><div class="rr-method-actions"><button class="button" id="rrArchitecture">查看代码框架</button><a class="button" href="https://github.com/LENS-AI4S/hydrotransfer-demo" target="_blank" rel="noopener noreferrer">GitHub 项目 ↗</a><button class="button" data-view="data">浏览数据立方体</button></div><p class="rr-provenance">成果包 ${esc(data().run_id)} · SHA-256 ${esc(data().bundle_sha256)}<br>快照 ${esc(data().generated_at)}</p></div></details>`;}
  function renderEvent(){
    stop();if(!data()){renderReportOnly();return;}
    const c=active?.case,e=currentEvent(),r=reportEvent();
    if(e){frame=Math.max(0,e.modis.frames.findIndex(f=>f.day===e.modis.peak_date));const range=e.modis.frames.map(f=>f.day);range.push(e.start,e.end);const from=new Date(d3.min(range)+'T00:00:00Z'),to=new Date(d3.max(range)+'T00:00:00Z');from.setUTCDate(from.getUTCDate()-12);to.setUTCDate(to.getUTCDate()+12);active.flow=c.flow.filter(v=>v[0]>=from.toISOString().slice(0,10)&&v[0]<=to.toISOString().slice(0,10));}
    host.innerHTML=`<section class="rr-results"><div class="rr-context"><label>已有成果<select id="rrBasin" aria-label="选择已有成果流域"><option value="">选择已完成分区</option>${cases().map(x=>`<option value="${x.hybas_id}"${c?.id===x.id?' selected':''}>${esc(x.city)} · ${x.hybas_id}</option>`).join('')}</select></label><button class="button" data-pick-basin data-return-view="results">从地图选择流域</button><a class="rr-text-link" href="#reports" data-view="reports">报告与判定口径 ↗</a></div><section class="rr-summary" aria-label="可信洪水事件"><div id="rrCredibility"></div></section><section class="rr-candidate" id="rrCandidate">${e?`<div class="rr-candidate-heading"><div><h2>${r?.no?esc(r.no)+' · ':''}${esc(e.source_event)}</h2><p class="rr-candidate-id">唯一 ID：${esc(e.id)}</p><p>${r?.basin_label?'报告流域 '+esc(r.basin_label)+' · ':''}${esc(c.city)}关联分区 · ${esc(sourceWindow(e,r))}</p></div><label class="rr-event-select">切换候选<select id="rrEvent" aria-label="选择来源候选">${orderedEvents(c).map(x=>`<option value="${x.id}"${x.id===e.id?' selected':''}>${esc(eventLabel(x))}</option>`).join('')}</select></label></div><nav class="rr-source-tabs" aria-label="分来源结果">${[['overview','来源与时间'],['hydrology','水文过程'],['modis','MODIS 影像'],['sar','SAR 检测'],['evidence','证据明细']].map(([id,title])=>`<button data-rr-tab="${id}" class="${sourceTab===id?'active':''}" aria-pressed="${sourceTab===id}">${title}</button>`).join('')}</nav><div class="rr-source-body">${sourceContent(c,e,r)}</div>`:'<div class="rr-empty-state"><h2>当前分区尚未接入事件成果</h2><p>可在上方总表查看已完成的来源候选，或继续从全球地图选择流域。未接入分区不会显示其他流域的结果。</p><button class="button" data-pick-basin data-return-view="results">选择流域</button></div>'}</section>${projectCard()}</section>`;
    const summary=host.querySelector('#rrCredibility');if(window.HydroReport?.attachSummary)window.HydroReport.attachSummary(summary,undefined,{compact:true,selectedId:e?.id,onSelect:chooseEvent});else summary.innerHTML=summaryHtml();
    summary.querySelectorAll('[data-rr-event]').forEach(b=>b.onclick=()=>chooseEvent(b.dataset.rrEvent));
    host.querySelector('#rrBasin').onchange=ev=>{if(ev.target.value)selectCase(ev.target.value);};
    if(e){host.querySelector('#rrEvent').onchange=ev=>{active.event=ev.target.value;sourceTab='overview';renderEvent();};host.querySelectorAll('[data-rr-tab],[data-open-source]').forEach(b=>b.onclick=()=>{sourceTab=b.dataset.rrTab||b.dataset.openSource;renderEvent();});}
    if(e&&sourceTab==='modis'&&e.modis.frames.length){
      const start=()=>{timer=setInterval(()=>{frame=(frame+1)%e.modis.frames.length;updateFrame();},Number(host.querySelector('#rrSpeed').value));};
      host.querySelector('#rrPlay').onclick=()=>{if(timer){stop();host.querySelector('#rrPlay').textContent='▶ 播放';}else{host.querySelector('#rrPlay').textContent='Ⅱ 暂停';start();}};
      host.querySelector('#rrSlider').oninput=ev=>{frame=Number(ev.target.value);updateFrame();};host.querySelector('#rrPrev').onclick=()=>{frame=Math.max(0,frame-1);updateFrame();};host.querySelector('#rrNext').onclick=()=>{frame=Math.min(e.modis.frames.length-1,frame+1);updateFrame();};host.querySelector('#rrSpeed').onchange=()=>{if(timer){stop();start();}};updateFrame();
    }
    if(e&&sourceTab==='sar')renderSar();
    for(const image of host.querySelectorAll('.rr-comparison'))image.onclick=()=>{stop();const b=host.querySelector('#rrPlay');if(b)b.textContent='▶ 播放';document.querySelector('#dialogTitle').textContent='MODIS 原始识别对照';const copy=image.cloneNode();copy.className='rr-full-image';document.querySelector('#dialogContent').replaceChildren(copy);document.querySelector('#infoDialog').showModal();};
    bindArchitecture();
  }
  function sourceContent(c,e,r){
    if(sourceTab==='hydrology')return `<div class="rr-source-title"><h3>GloFAS 流量过程</h3><span>候选格点 ${esc(c.mapping.grid_id)}</span></div><div class="rr-mapping ${c.id==='case_01'?'problem':''}">${c.id==='case_01'?'北京格点不能代表所选完整流域':'候选出口映射待核验'} · 面积比 ${num(c.mapping.upstream_area_ratio,3)} · IoU ${num(c.mapping.catchment_iou,3)}</div>${plot(active.flow,{unit:'流量 / m³·s⁻¹',threshold:c.threshold,event:e,height:240})}<p class="rr-caption">虚线：长期基准高流量进入阈值 ${num(c.threshold,2)} m³/s；灰色背景：来源可能日期窗口。流量是模型格点序列。</p><div class="rr-source-facts"><div><span>高流量关联</span><b>${e.counts.hydrology||0} 条</b></div><div><span>报告判定</span><b>${esc(r?.statuses?.hydrology||'待核定')}</b></div><div><span>本地 / 累计上游面积</span><b>${num(c.area,1)} / ${num(c.up_area,1)} km²</b></div></div>`;
    if(sourceTab==='modis')return modisContent(e);
    if(sourceTab==='sar')return `<div class="rr-source-title"><h3>SAR 检测分布</h3><span>${num(c.sar_points)} 个流域内检测点</span></div><canvas id="rrSarMap" width="1200" height="580" class="rr-sar-map" role="img" aria-label="SAR检测点空间分布"></canvas><div class="rr-source-facts"><div><span>影像日期证据</span><b>${num(c.sar_evidence)} 条</b></div><div><span>当前候选关联</span><b>${e.counts.sar||0} 条</b></div><div><span>报告判定</span><b>${esc(r?.statuses?.sar||'待核定')}</b></div></div><p class="rr-caption">青色为本流域全观测期检测点，橙色为当前候选关联日期的点。展示检测点位置，不是原始 SAR 影像；无关联记录不表示已证明无洪水，观测覆盖状态仍未知。</p>`;
    if(sourceTab==='evidence')return `<div class="rr-source-title"><h3>当前候选证据</h3><span>${e.links.length} 条关联</span></div><div class="rr-table-wrap"><table class="rr-table"><thead><tr><th>模态</th><th>日期</th><th>来源</th><th>处理观测</th><th>采用状态</th></tr></thead><tbody>${e.links.map(l=>`<tr><td>${({text:'文本',hydrology:'流量',sar:'SAR',modis:'MODIS'})[l.channel]}</td><td>${esc(l.date||'未提供')}</td><td title="${esc(l.record)}">${esc(l.source)}</td><td>${esc(({positive:'有证据记录',insufficient:'证据不足',negative:'未检出',unknown:'未知'})[l.observation]||l.observation)}</td><td>${l.review_status==='pending'?'待核定':esc(l.review_status)}</td></tr>`).join('')}</tbody></table></div>`;
    const s=r?.statuses||{},n=r?.counts||{},src=r?.sources||{};
    return `<div class="rr-overview-grid"><section><div class="rr-source-title"><h3>来源与文本关联</h3><span>各来源分别保留</span></div><div class="rr-table-wrap"><table class="rr-table"><thead><tr><th>来源</th><th>当前结果</th><th>记录标识 / 范围</th></tr></thead><tbody><tr><td>EM-DAT</td><td>${esc(s.emdat||'未提供分来源判定')}</td><td>${esc(src.emdat||'—')}</td></tr><tr><td>DFO</td><td>${esc(s.dfo||'未提供分来源判定')}</td><td>${esc(src.dfo||'—')}</td></tr><tr><td>GroundSource</td><td>${esc(s.groundsource||'未提供分来源判定')}</td><td>${n.groundsource==null?'—':num(n.groundsource)+' 条文本记录'}</td></tr></tbody></table></div><p class="rr-caption">来源目录标记表示候选是否被该来源收录，匹配与记录标记不等于独立验证或正式采用。</p></section><section><div class="rr-source-title"><h3>当前判定</h3></div><dl class="rr-assessment"><div><dt>独立洪水起止</dt><dd>${esc(r?.flood_dates||'未确定')}</dd></div><div><dt>时间可信度</dt><dd>${esc(r?.temporal_confidence||'未评定')}</dd></div><div><dt>最终事件采用</dt><dd>${esc(r?.final_status||'待核定')}</dd></div><div><dt>文本关联</dt><dd>${num(e.counts.text||0)} 条</dd></div></dl></section></div><section class="rr-timeline"><div class="rr-source-title"><h3>多模态时间线</h3><span>保留实际来源日期</span></div>${timeline(e)}${e.modis.source_window_overlap===false?'<p class="rr-caution">光学候选过程与原来源日期区间不相交，不能直接认定属于同一次事件。</p>':''}</section><div class="rr-source-shortcuts"><button class="button" data-open-source="hydrology">查看水文过程</button><button class="button" data-open-source="modis">查看 MODIS ${e.modis.frames.length?'逐日影像':'对照结果'}</button><button class="button" data-open-source="sar">查看 SAR 分布</button><button class="button" data-open-source="evidence">查看 ${e.links.length} 条证据</button></div>`;
  }
  function modisContent(e){const m=e.modis;return `<div class="rr-source-title"><h3>MODIS ${m.frames.length?'逐日影像':'识别对照'}</h3><span>${m.selected_method?esc(m.selected_method.toUpperCase())+' · '+m.frames.length+' 日序列':'光学证据不足'}</span></div>${m.frames.length?`<div class="rr-modis-grid"><div class="rr-player"><div class="rr-image-stage"><img id="rrFrame" alt="所选日期的MODIS候选水体掩膜"/><span id="rrFrameDay"></span></div><div class="rr-play-controls"><button id="rrPlay" class="button primary">▶ 播放</button><button id="rrPrev" class="button" aria-label="上一日">‹</button><input id="rrSlider" aria-label="MODIS 日期" type="range" min="0" max="${m.frames.length-1}" value="${frame}"/><button id="rrNext" class="button" aria-label="下一日">›</button><select id="rrSpeed" aria-label="播放速度"><option value="900">1×</option><option value="450">2×</option><option value="1800">0.5×</option></select></div><div class="rr-frame-metrics" id="rrFrameMetrics"></div><p class="rr-image-legend"><i></i>候选水体　<span>灰色：缺测 / 无参考值</span></p></div><div class="rr-modis-charts"><h4>候选水体面积</h4><div id="rrAreaChart"></div><h4>对应流量过程</h4><div id="rrFlowChart"></div></div></div><p class="rr-caption">${esc(m.display_note)}</p><details class="rr-original"><summary>固定阈值 / Otsu 原始识别对照</summary><img class="rr-comparison" src="${m.comparison}" alt="MODIS原始识别对照"/></details>`:`<img class="rr-comparison" src="${m.comparison}" alt="固定阈值与Otsu识别对照"/><p class="rr-caption">本项未通过光学支持规则，保留原始识别对照，没有生成逐日播放数据。</p>`}${m.source_window_overlap===false?'<p class="rr-caution">候选过程与原来源日期区间不相交，来源归属待核定。</p>':''}`;}
  function renderSar(){
    const canvas=host?.querySelector('#rrSarMap'),c=active?.case;if(!canvas||!c)return;
    const points=c.sar_coordinates||[],f=window.HydroTransferUI?.getFeature?.(c.hybas_id)||window.HYDRO_GEO?.basins?.features.find(f=>f.properties.id===c.hybas_id),fit=f||{type:'MultiPoint',coordinates:points.map(p=>p.slice(0,2))};if(!f&&!points.length)return;
    const ctx=canvas.getContext('2d'),projection=d3.geoMercator().fitExtent([[25,20],[575,270]],fit);
    ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,600,290);ctx.fillStyle='#f8fafb';ctx.fillRect(0,0,600,290);
    if(f){const shape=d3.geoPath(projection).context(ctx);ctx.beginPath();shape(f);ctx.fillStyle='#eef2f5';ctx.fill();ctx.strokeStyle='#aab6bf';ctx.lineWidth=.7;ctx.stroke();}
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
  function bindArchitecture(){
    const button=host?.querySelector('#rrArchitecture');if(!button)return;
    button.onclick=()=>{document.querySelector('#dialogTitle').textContent='代码框架';document.querySelector('#dialogContent').innerHTML='<ol class="rr-architecture"><li><b>科学处理</b><p>GUFE → GBFE：流域身份、来源候选、文本、水文、MODIS、SAR 与证据关联。</p><code>basin-flood-events/src/gbfe/</code></li><li><b>只读成果适配</b><p>读取既有成果包、逐日栅格与流量 CSV，校验版本和面积后输出展示快照。</p><code>scripts/export_research_results.py</code></li><li><b>界面与数据浏览</b><p>全球流域选择、上下游关系、可信度总表、分来源结果、数据立方体和正式报告。</p></li><li><b>模型接口</b><p>参数移植与真实模型计算尚待接入。模拟页目前使用合成过程线展示操作形式。</p></li></ol>';document.querySelector('#infoDialog').showModal();};
  }
  window.HydroResearch={cases,getCase,overview,render,selectEvent:openResearchEvent,destroy:stop};
})();
