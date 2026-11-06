/* Supplied formal report and derived read-only evidence tables. */
(() => {
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const data=()=>window.HYDRO_REPORT;
  const assetUrl=path=>window.HydroAssets?.url(path)||path;
  const rows=()=>data()?.credibility_rows||[];
  const getEvent=id=>rows().find(r=>r.id===id);
  const getCredibilityRows=id=>id?rows().filter(r=>r.hybas_id===String(id)):rows();
  const positive=s=>['识别到','有异常','有记录'].includes(s)||/^\d+条$/.test(s);
  const statusCell=(r,key,binary)=>{
    const label=r.statuses[key],code=r.binary[key],meaning=data()?.semantics?.channels?.[key]?.[code]||label;
    const type=code==='NA'?'unavailable':code==='1'?'positive':'neutral';
    return `<td class="report-status ${type}">${binary?`<span class="report-code" title="${esc(label+'。'+meaning)}">${esc(code)}</span><small>${esc(label)}</small>`:`<span>${esc(label)}</span>`}</td>`;
  };
  function credibilityHtml(hybasId,options={}){
    const items=options.rows||getCredibilityRows(hybasId),binary=!!options.binary;
    return `<section class="report-summary ${options.compact?'compact':''}"><div class="report-summary-heading"><div><h2>可信洪水事件</h2><span>${items.length} 项来源—流域案例</span></div><div class="report-coding" role="group" aria-label="判定表显示方式"><button data-report-coding="words" aria-pressed="${!binary}">结果文字</button><button data-report-coding="binary" aria-pressed="${binary}">0 / 1 状态</button></div></div><div class="report-table-scroll"><table class="report-credibility"><thead><tr><th rowspan="2" scope="col" title="正式报告中的 E01–E11，筛选后保留原编号">案例编号</th><th rowspan="2" scope="col" title="B01–B05 为报告内流域编号；HYBAS_ID 为 HydroBASINS 官方编号">流域编号</th><th rowspan="2" scope="col">MODIS</th><th rowspan="2" scope="col">GloFAS</th><th rowspan="2" scope="col">SAR</th><th colspan="3" scope="colgroup">文本</th><th rowspan="2" scope="col">MODIS 与<br>目录日期</th><th rowspan="2" scope="col">时间可信等级</th></tr><tr><th scope="col">EM-DAT</th><th scope="col">DFO</th><th scope="col">Groundsource</th></tr></thead><tbody>${items.map(r=>`<tr class="${r.id===options.selectedId?'report-selected':''}" data-report-row="${r.id}"><th scope="row"><button class="report-event-button" data-report-event="${r.id}" aria-label="查看 ${r.no} 的证据" ${r.id===options.selectedId?'aria-current="true"':''}>${r.no}</button></th><td><b>${r.basin_label}</b><small>HYBAS_ID ${r.hybas_id}</small></td>${['modis','hydrology','sar','emdat','dfo','groundsource'].map(k=>statusCell(r,k,binary)).join('')}<td>${esc(r.modis_date_relation)}</td><td class="report-unassessed">${r.temporal_confidence}</td></tr>`).join('')||'<tr><td colspan="10" class="report-empty">没有符合条件的案例。</td></tr>'}</tbody></table></div><p class="report-summary-note">E 为报告案例编号，B 为报告流域编号，筛选后保留原编号。时间可信等级均未评定，洪水起止日期均未确定。1 表示检出、匹配或有记录；0 表示未形成有效识别或无对应记录；NA 表示无可用模态证据、覆盖未知或格点不适用，具体含义见各列说明。它们都不是最终洪水判定。</p><details class="report-definitions"><summary>判定含义与来源关系</summary><dl><div><dt>MODIS</dt><dd>是否识别到水体变化；日期是否与目录事件重叠单独列出。当前6项为1，另5项因有效光学证据不足保留原始NA，报告显示“未识别”，不改写成0。</dd></div><div><dt>GloFAS</dt><dd>是否匹配到流量异常。当前10项为1；B01出口格点不代表目标流域，保留NA并显示“无法匹配”，不计为0或无异常。</dd></div><div><dt>SAR</dt><dd>是否有匹配的检测记录。当前5项为1，另6项无关联记录且覆盖状态未知，保留NA；无检测记录不能当作已观测的无水日，也不等于无洪水。</dd></div><div><dt>文本</dt><dd>EM-DAT、DFO 是建档来源；Groundsource 是补充结构化文本。目录记录不作为对自身记录的独立验证，三个文本子类也不计为三个独立模态。</dd></div></dl></details></section>`;
  }
  function attachSummary(host,hybasId,options={}){
    let binary=!!options.binary;
    const paint=()=>{
      host.innerHTML=credibilityHtml(hybasId,{...options,binary});
      host.querySelectorAll('[data-report-coding]').forEach(b=>b.onclick=()=>{binary=b.dataset.reportCoding==='binary';paint();});
      host.querySelectorAll('[data-report-event]').forEach(b=>b.onclick=()=>options.onSelect?.(b.dataset.reportEvent));
    };
    paint();return {destroy:()=>{}};
  }
  function tableHtml(table){
    return `<div class="report-document-table"><table><caption>${esc(table.caption)}</caption><thead>${table.rows.slice(0,table.header_rows).map(row=>`<tr>${row.map(c=>`<th colspan="${c.colspan}" rowspan="${c.rowspan}" scope="${c.colspan>1?'colgroup':'col'}">${esc(c.text).replace(/\n/g,'<br>')}</th>`).join('')}</tr>`).join('')}</thead><tbody>${table.rows.slice(table.header_rows).map(row=>`<tr>${row.map(c=>`<td colspan="${c.colspan}" rowspan="${c.rowspan}">${esc(c.text).replace(/\n/g,'<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  const download=(name,value,type='text/csv;charset=utf-8')=>{
    const blob=new Blob([value],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  function csv(content){return '\ufeff'+content.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');}
  function summaryCsv(items){
    return csv([['报告案例编号','报告流域编号','HYBAS_ID','GBFEID','目录记录','MODIS结果','GloFAS结果','SAR结果','EM-DAT','DFO','Groundsource条数','MODIS与目录日期','洪水起止日期','时间可信等级','MODIS状态码','GloFAS状态码','SAR状态码','Groundsource状态码'],
      ...items.map(r=>[r.no,r.basin_label,r.hybas_id,r.id,r.source_event,r.statuses.modis,r.statuses.hydrology,r.statuses.sar,r.statuses.emdat,r.statuses.dfo,r.text_count,r.modis_date_relation,r.flood_dates,r.temporal_confidence,r.binary.modis,r.binary.hydrology,r.binary.sar,r.binary.groundsource])]);
  }
  function eventDetails(r){
    if(!r)return '';
    return `<section class="report-event-detail"><header><div><h2>${r.no} · ${r.basin_label}</h2><p>${esc(r.source_event)} · HYBAS_ID ${r.hybas_id}</p></div><button class="button" data-report-open-results="${r.id}">查看图像与过程 →</button></header><div class="report-event-sources"><section><h3>文本</h3><dl><div><dt>EM-DAT</dt><dd>${esc(r.sources.emdat||'无对应记录')}</dd></div><div><dt>DFO</dt><dd>${esc(r.sources.dfo||'无对应记录')}</dd></div><div><dt>Groundsource</dt><dd>${r.text_count} 条 · ${esc(r.dates.groundsource)}</dd></div></dl></section><section><h3>MODIS</h3><p>${esc(r.statuses.modis)}；与目录日期${esc(r.modis_date_relation)}。</p><p>${r.optical.selected_method?`${r.optical.selected_method==='fixed'?'固定阈值':'Otsu'} · ${r.optical.onset} 至 ${r.optical.end} · 峰值 ${r.optical.peak_date}`:'当前分析没有形成有效的水体变化过程。'}</p></section><section><h3>GloFAS</h3><p>${esc(r.statuses.hydrology)} · ${esc(r.dates.hydrology)}</p>${r.hybas_id==='4080477690'?'<p class="report-mapping-note">该格点汇水范围与目标流域不匹配，保留过程记录，但不作为目标流域的匹配结果。</p>':''}</section><section><h3>SAR</h3><p>${esc(r.statuses.sar)} · ${r.counts.sar} 条影像日期记录</p><p>${esc(r.dates.sar)}</p></section></div><p class="report-event-conclusion">洪水起止日期：${r.flood_dates}；时间可信等级：${r.temporal_confidence}。这些记录尚未汇总为经过独立验证的洪水事件。</p><details><summary>标识与原始记录明细</summary><p class="report-gbfeid">GBFEID ${r.id}</p><div class="report-record-lists"><section><h3>Groundsource</h3>${r.groundsource_records.map(t=>`<p><code>${esc(t.uuid)}</code><span>${t.start} — ${t.end}</span></p>`).join('')}</section><section><h3>SAR</h3>${r.sar_records.map(s=>`<p><code>${esc(s.image)}</code><span>${s.date} · ${s.point_count} 个检测点</span></p>`).join('')||'<p>无匹配记录。</p>'}</section></div></details></section>`;
  }
  let root=null,tab='summary',filter='',query='',tableId='table-7',selectedId=null;
  function render(host){root=host;if(!data()){host.innerHTML='<p class="report-empty">报告数据尚未载入。</p>';return;}draw();}
  function filtered(){return getCredibilityRows(filter).filter(r=>!query||[r.no,r.basin_label,r.hybas_id,r.source_event].join(' ').toLowerCase().includes(query));}
  function draw(){
    const d=data(),items=filtered(),selected=getEvent(selectedId),pdf=d.files.find(f=>f.url.endsWith('.pdf')),word=d.files.find(f=>f.url.endsWith('.docx'));
    root.innerHTML=`<section class="report-page"><header class="report-page-heading"><div><h1>证据与报告</h1><p>正式报告 · ${d.report_date} · 观测期 ${d.observation_period}</p></div><div class="report-file-actions">${pdf?`<a class="button" href="${assetUrl(pdf.url)}" target="_blank" rel="noopener">阅读 PDF <span>↗</span></a>`:''}${word?`<a class="button" href="${assetUrl(word.url)}" download="${esc(word.name)}">下载 Word</a>`:''}</div></header><nav class="report-tabs" aria-label="报告内容"><button data-report-tab="summary" aria-current="${tab==='summary'?'page':'false'}">判定总表</button><button data-report-tab="report" aria-current="${tab==='report'?'page':'false'}">正式报告</button><button data-report-tab="tables" aria-current="${tab==='tables'?'page':'false'}">表格数据 <small>17</small></button></nav>${tab==='summary'?`<div class="report-filter-toolbar"><label>流域<select id="reportBasin" aria-label="筛选报告流域"><option value="">全部流域</option>${d.basins.map(b=>`<option value="${b.hybas_id}" ${filter===b.hybas_id?'selected':''}>${b.label} · ${b.hybas_id}</option>`).join('')}</select></label><label class="report-search"><span class="sr-only">搜索报告案例</span><input id="reportSearch" type="search" aria-label="搜索报告案例" placeholder="搜索 E 编号、HYBAS_ID 或来源记录" value="${esc(query)}"></label><button class="button" id="reportExport">导出当前表格</button></div><div id="reportSummaryHost"></div>${selected?eventDetails(selected):'<p class="report-selection-hint">点选案例编号，展开各来源结果与记录日期。</p>'}`:tab==='report'?documentHtml():`<div class="report-table-toolbar"><label>报告表格<select id="reportTable" aria-label="选择报告表格">${d.tables.map(t=>`<option value="${t.id}" ${tableId===t.id?'selected':''}>${esc(t.caption)}</option>`).join('')}</select></label><button class="button" id="reportTableExport">导出 CSV</button></div><article class="report-table-panel">${tableHtml(d.tables.find(t=>t.id===tableId))}</article><p class="report-summary-note">保留正式报告中的合并表头与原始结果文字；CSV 将合并单元格展开为重复值。</p>`}<footer class="report-provenance"><span>源报告 ${d.revision} · ${d.totals.pages} 页 · ${d.totals.tables} 表 · ${d.totals.figures} 图</span><details><summary>版本与校验</summary><p>${esc(d.source_title)}</p><p>SHA-256 <code>${d.docx_sha256}</code></p><p>本页由提供的正式报告与同目录数据只读导出，没有更改原始科学结果。</p></details></footer></section>`;
    root.querySelectorAll('[data-report-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.reportTab;draw();});
    if(tab==='summary'){
      attachSummary(root.querySelector('#reportSummaryHost'),null,{rows:items,selectedId,onSelect:id=>{selectedId=id;draw();root.querySelector('.report-event-detail')?.scrollIntoView({behavior:'smooth',block:'nearest'});}});
      root.querySelector('#reportBasin').onchange=e=>{filter=e.target.value;selectedId=null;draw();};
      root.querySelector('#reportSearch').oninput=e=>{query=e.target.value.trim().toLowerCase();const h=root.querySelector('#reportSummaryHost');attachSummary(h,null,{rows:filtered(),selectedId,onSelect:id=>{selectedId=id;draw();}});};
      root.querySelector('#reportExport').onclick=()=>download('HydroTransfer_可信洪水事件.csv',summaryCsv(filtered()));
      root.querySelectorAll('[data-report-open-results]').forEach(b=>b.onclick=()=>{const r=getEvent(b.dataset.reportOpenResults);window.HydroTransferUI?.selectBasinById(r.hybas_id,{view:'results',eventId:r.id});});
    } else if(tab==='tables'){
      root.querySelector('#reportTable').onchange=e=>{tableId=e.target.value;draw();};
      root.querySelector('#reportTableExport').onclick=()=>{const t=d.tables.find(t=>t.id===tableId);download(`HydroTransfer_表${t.number}.csv`,csv(t.expanded));};
    } else root.querySelectorAll('[data-report-section]').forEach(b=>b.onclick=()=>root.querySelector('#'+b.dataset.reportSection)?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  function documentHtml(){
    const d=data(),toc=d.blocks.filter(b=>b.type==='heading'&&b.level===1);
    return `<div class="report-reading-layout"><nav class="report-outline" aria-label="报告章节">${toc.map(b=>`<button data-report-section="${b.id}">${esc(b.text)}</button>`).join('')}</nav><article class="report-document"><header><h2>${esc(d.source_title)}</h2><p>${d.report_date} · ${d.observation_period}</p></header>${d.blocks.map(b=>{
      if(b.type==='heading')return `<h${b.level+1} id="${b.id}">${esc(b.text)}</h${b.level+1}>`;
      if(b.type==='paragraph')return `<p>${esc(b.text)}</p>`;
      if(b.type==='caption')return `<p class="report-caption">${esc(b.text)}</p>`;
      if(b.type==='table')return tableHtml(d.tables.find(t=>t.id===b.id));
      if(b.type==='figure')return `<figure><img src="${assetUrl(b.src)}" alt="${esc(b.caption)}" loading="lazy" decoding="async"><figcaption>${esc(b.caption)}</figcaption></figure>`;
      return '';
    }).join('')}</article></div>`;
  }
  window.HydroReport={render,destroy:()=>{root=null;},getEvent,getCredibilityRows,credibilityHtml,attachSummary,tableHtml};
})();
