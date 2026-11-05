(function () {
  'use strict';

  const E = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const q = (root, selector) => root.querySelector(selector);
  let current = null;
  let root = null;
  let timer = null;

  function defaultState(basin) {
    return {basin, view:'events', year:'all', kind:'all', search:'', event:0, step:0, files:{}, simulation:{donor:basin.id === 'rhine' ? 'mekong' : 'rhine', strategy:'foundation', interval:'daily', duration:10, progress:-1, complete:false, running:false}};
  }

  function installStyle() {
    if (document.getElementById('hydro-details-style')) return;
    const style = document.createElement('style');
    style.id = 'hydro-details-style';
    style.textContent = `
      .hd-root{--hd-blue:#1264a3;--hd-cyan:#188abc;--hd-ink:#15334a;--hd-muted:#708494;--hd-line:#dce7ee;--hd-pale:#e9f3f9;color:var(--hd-ink);font:13px/1.6 "Microsoft YaHei","PingFang SC",sans-serif;min-width:0}
      .hd-root *{box-sizing:border-box}.hd-root button,.hd-root input,.hd-root select{font:inherit}.hd-root button{cursor:pointer}.hd-root button:focus-visible,.hd-root a:focus-visible,.hd-root input:focus-visible,.hd-root select:focus-visible{outline:3px solid #65bbdf;outline-offset:2px}.hd-root h2,.hd-root h3,.hd-root h4,.hd-root p{margin:0}.hd-root button:disabled{opacity:.55;cursor:wait}
      .hd-lead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:20px}.hd-lead h2{font-size:23px;font-weight:600;letter-spacing:.3px}.hd-lead p{font-size:12px;color:var(--hd-muted);margin-top:5px}.hd-eyebrow{font-size:10px;font-weight:600;color:var(--hd-cyan);letter-spacing:2px;margin-bottom:5px}.hd-tag{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;border:1px solid #b9d9e8;background:#edf7fb;color:#287394;padding:3px 8px;border-radius:3px;font-size:10px}.hd-tag.amber{background:#fcf7ec;border-color:#e9dbb5;color:#92733b}.hd-tag.gray{background:#f4f7f9;border-color:#dce6ec;color:#788e9c}.hd-notice{border-left:3px solid #78b8d6;padding:9px 12px;background:#eff6fa;color:#537689;font-size:11px;margin:14px 0}.hd-note{color:var(--hd-muted);font-size:11px;line-height:1.8}.hd-button{border:1px solid #cbdce6;border-radius:4px;padding:8px 13px;background:#fff;color:#45677e;display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;white-space:nowrap;min-height:34px}.hd-button:hover{border-color:#8db6ce;background:#f1f8fb}.hd-button.primary{background:var(--hd-blue);border-color:var(--hd-blue);color:white}.hd-button.primary:hover{background:#0c538b}.hd-button svg{width:15px;height:15px}.hd-buttons{display:flex;gap:8px;flex-wrap:wrap}.hd-panel{border:1px solid var(--hd-line);background:white;border-radius:6px;overflow:hidden;min-width:0}.hd-panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 17px;border-bottom:1px solid #e5edf2}.hd-panel-head h3{font-size:14px;font-weight:600}.hd-panel-body{padding:17px}.hd-caption{font-size:10px;color:var(--hd-muted)}.hd-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 16px}.hd-stat{padding:17px 18px;background:white;border:1px solid var(--hd-line);border-radius:5px}.hd-stat-label{font-size:11px;color:var(--hd-muted)}.hd-stat-value{font:29px/1.4 "Segoe UI",sans-serif;letter-spacing:-.5px;margin:4px 0;color:#1a547f}.hd-stat-value small{font:11px "Microsoft YaHei",sans-serif;color:var(--hd-muted);letter-spacing:0;margin-left:7px}.hd-stat-sub{font-size:10px;color:#91a2ad}.hd-toolbar{display:flex;align-items:center;gap:9px;padding:13px 16px;border-bottom:1px solid #e5edf2;flex-wrap:wrap}.hd-toolbar input,.hd-toolbar select,.hd-field input,.hd-field select{padding:8px 10px;border:1px solid #d4e2eb;border-radius:4px;background:#fff;color:var(--hd-ink);min-width:0;min-height:35px}.hd-toolbar input{width:210px}.hd-toolbar select{max-width:140px}.hd-toolbar .hd-caption{margin-left:auto}.hd-table-wrap{overflow-x:auto}.hd-table{width:100%;border-collapse:collapse;text-align:left;font-size:11px;white-space:nowrap}.hd-table th{padding:10px 15px;background:#f7fafc;color:#7990a2;font-weight:500;border-bottom:1px solid #e4edf3}.hd-table td{padding:12px 15px;border-bottom:1px solid #edf2f5;color:#476277}.hd-table tr:last-child td{border-bottom:0}.hd-table tbody tr{cursor:pointer}.hd-table tbody tr:hover td{background:#f6fbfe}.hd-table tbody tr.is-selected td{background:#eef7fc}.hd-table tbody tr.is-selected td:first-child{box-shadow:inset 3px 0 #2496c3}.hd-event-link{border:0;background:none;padding:0;font-size:11px;color:#176aa0;cursor:pointer;text-align:left}.hd-kind{display:inline-flex;align-items:center;gap:6px}.hd-kind:before{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;background:#309bc6}.hd-kind.long:before{background:#7f9fbe}.hd-kind.short:before{background:#54b9b2}.hd-chart-box{margin-top:16px}.hd-chart{display:block;width:100%;height:auto;max-height:275px}.hd-chart text{font-family:"Segoe UI","Microsoft YaHei",sans-serif}.hd-chart-hit{cursor:crosshair}.hd-chart-hit:hover{fill:#1d81af;stroke:#fff;stroke-width:2}.hd-chart-foot{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:0 17px 13px;font-size:10px;color:var(--hd-muted)}.hd-legend{display:flex;gap:16px;align-items:center}.hd-legend span{display:inline-flex;align-items:center;gap:6px}.hd-legend i{width:16px;height:3px;background:#198ec4}.hd-legend i.rain{height:8px;width:7px;background:#93d1e4}.hd-empty{padding:32px;text-align:center;color:#8ca0ae;font-size:12px}.hd-sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.hd-source{padding:19px;border:1px solid var(--hd-line);border-radius:5px;background:#fff;min-width:0}.hd-source-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}.hd-source-icon{width:31px;height:31px;background:#eaf5fb;border:1px solid #d3e8f3;border-radius:5px;display:grid;place-items:center;color:#2480ae;font-size:13px}.hd-source h3{font-size:15px;margin-bottom:1px}.hd-source .hd-source-en{font:11px "Segoe UI",sans-serif;color:#8196a5;margin-bottom:12px}.hd-source p{font-size:11px;color:#657f90;min-height:38px;line-height:1.8}.hd-meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:15px 0;padding:11px 0;border-top:1px solid #edf2f5;border-bottom:1px solid #edf2f5;font-size:11px}.hd-meta span{display:block;color:#9aadba;font-size:10px;margin-bottom:3px}.hd-source-foot{display:flex;justify-content:space-between;align-items:center;gap:7px;flex-wrap:wrap}.hd-source-foot a{font-size:11px;color:#277da9;text-decoration:none}.hd-source-foot a:hover{text-decoration:underline}.hd-source-foot label{cursor:pointer}.hd-file-state{margin-top:9px;padding:8px 10px;background:#f3f8fb;font-size:10px;color:#638094;overflow-wrap:anywhere}.hd-hidden-input{position:absolute;clip:rect(0,0,0,0);width:1px;height:1px;overflow:hidden}.hd-workflow{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px}.hd-steps{background:white;border:1px solid var(--hd-line);border-radius:5px;overflow:hidden}.hd-step{display:flex;text-align:left;align-items:flex-start;gap:12px;padding:17px 14px;width:100%;border:0;border-bottom:1px solid #e8eff4;background:white;color:#577185;position:relative}.hd-step:last-child{border-bottom:0}.hd-step:hover{background:#f6fbfe}.hd-step.active{background:#edf6fb;box-shadow:inset 3px 0 #188abc}.hd-step-no{width:26px;height:26px;border:1px solid #c7dce8;border-radius:50%;display:grid;place-items:center;font:11px "Segoe UI",sans-serif;flex:none;color:#6893aa}.hd-step.active .hd-step-no{color:white;background:#1682b5;border-color:#1682b5}.hd-step b{display:block;font-size:12px;font-weight:500;margin:1px 0 3px}.hd-step small{display:block;font-size:9px;color:#98aab7}.hd-flow-content{padding:22px}.hd-flow-content h3{font-size:21px;color:#215775;margin-bottom:7px}.hd-flow-content>p{font-size:12px;color:#748c9d;line-height:1.9}.hd-io{display:grid;grid-template-columns:1fr 24px 1fr;gap:10px;align-items:center;margin:24px 0}.hd-io-box{border:1px solid #d8e7f0;border-radius:5px;padding:16px;align-self:stretch;background:#f8fbfd}.hd-io-box small{color:#82a3b7;letter-spacing:1px;font-size:10px}.hd-io-box h4{font-size:12px;font-weight:500;margin:7px 0;color:#3e6d88}.hd-io-box p{font-size:11px;color:#7c95a5;line-height:1.8}.hd-io-arrow{font-size:21px;color:#71a6c0;text-align:center}.hd-checklist{list-style:none;padding:0;margin:0}.hd-checklist li{padding:12px 0;border-bottom:1px solid #edf2f6;font-size:11px;color:#637f92;display:flex;align-items:center;gap:9px}.hd-checklist li:before{content:'○';color:#2c98c0}.hd-trace{margin-top:22px;padding:12px;background:#f1f7fa;font-size:10px;color:#7293a8;line-height:1.9;overflow-wrap:anywhere}.hd-sim-grid{display:grid;grid-template-columns:280px minmax(0,1fr);gap:16px}.hd-field{display:block;margin-bottom:15px}.hd-field>span{display:block;color:#748b9b;font-size:11px;margin-bottom:6px}.hd-field select,.hd-field input{width:100%}.hd-sim-target{padding:15px;background:linear-gradient(120deg,#edf7fc,#f9fcfd);border:1px solid #d2e6f0;border-radius:5px;margin-bottom:20px}.hd-sim-target small{font-size:10px;color:#7f9fb2}.hd-sim-target b{display:block;font-size:17px;color:#216b94;margin:5px 0 2px;font-weight:500}.hd-sim-target p{font-size:10px;color:#7a96a8}.hd-progress{display:flex;align-items:center;gap:13px;padding:12px 0;border-bottom:1px solid #edf3f6}.hd-progress:last-child{border-bottom:0}.hd-progress-mark{width:23px;height:23px;border:1px solid #d6e3ec;color:#a0b2bf;border-radius:50%;display:grid;place-items:center;font:10px "Segoe UI",sans-serif;flex:none}.hd-progress.done .hd-progress-mark{background:#e8f5fa;border-color:#add5e7;color:#2188b3}.hd-progress.active .hd-progress-mark{background:#188abc;border-color:#188abc;color:white;box-shadow:0 0 0 4px #e9f5fb}.hd-progress b{font-size:11px;font-weight:500;color:#6f8798}.hd-progress.done b,.hd-progress.active b{color:#296c90}.hd-progress small{font-size:9px;display:block;color:#a0b2bf}.hd-progress-state{font-size:9px;color:#8aa4b4;margin-left:auto}.hd-placeholder{padding:28px 16px;text-align:center;background:repeating-linear-gradient(0deg,#fff,#fff 33px,#f1f6f9 34px);border:1px dashed #d4e3ed;border-radius:5px;margin-top:18px;min-height:154px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#97adbb;font-size:11px}.hd-placeholder svg{width:52px;height:37px;margin-bottom:12px;opacity:.5}.hd-config-note{font-size:10px;color:#9bb0be;line-height:1.9;margin-top:12px}.hd-result-note{padding:9px 12px;background:#eff8fc;color:#6092aa;font-size:10px;margin-top:8px}.hd-flow-bottom{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:22px}
      @media(max-width:1000px){.hd-sim-grid{grid-template-columns:250px minmax(0,1fr)}.hd-workflow{grid-template-columns:190px minmax(0,1fr)}.hd-flow-content{padding:17px}.hd-io{gap:5px}.hd-io-box{padding:12px}.hd-source{padding:15px}.hd-table th,.hd-table td{padding:11px}}
      @media(max-width:760px){.hd-lead{gap:10px}.hd-lead h2{font-size:20px}.hd-lead>.hd-tag{display:none}.hd-stats{gap:7px}.hd-stat{padding:12px}.hd-stat-value{font-size:23px}.hd-stat-sub{font-size:9px}.hd-sources{grid-template-columns:1fr}.hd-workflow,.hd-sim-grid{grid-template-columns:1fr}.hd-steps{display:grid;grid-template-columns:repeat(3,1fr)}.hd-step{padding:11px 8px;gap:6px;border-right:1px solid #e8eff4}.hd-step small{display:none}.hd-step b{font-size:10px}.hd-step-no{width:21px;height:21px;font-size:9px}.hd-toolbar input{width:100%}.hd-toolbar select{flex:1;max-width:none}.hd-toolbar .hd-caption{width:100%;margin:0}.hd-io{grid-template-columns:1fr}.hd-io-arrow{transform:rotate(90deg)}.hd-panel-head{padding:13px}.hd-panel-body{padding:13px}.hd-flow-bottom{align-items:flex-start}.hd-chart-foot{font-size:9px}.hd-lead .hd-button{font-size:11px;padding:7px 10px}.hd-meta{margin:12px 0}}
    `;
    document.head.appendChild(style);
  }

  const downloadIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5"/></svg>';
  function download(name, content, type) {
    const blob = new Blob([content], {type:type || 'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function lead(label, title, text, button) {
    return '<header class="hd-lead"><div><div class="hd-eyebrow">'+E(label)+'</div><h2>'+E(title)+'</h2><p>'+E(text)+'</p></div>'+(button || '<span class="hd-tag">DEMO · 交互演示</span>')+'</header>';
  }

  function getEvents() {
    const n = String(current.basin.id).split('').reduce((a,c) => a+c.charCodeAt(0), 0);
    const years = [2001,2004,2008,2011,2015,2018,2021,2024];
    const kinds = ['降雨型','持续型','短历时'];
    return years.map((year,i) => {
      const month = (i*3+n)%5+5, day = (i*7+n)%22+1, days = 3+(i+n)%9;
      const start = new Date(Date.UTC(year, month-1, day));
      const end = new Date(start); end.setUTCDate(end.getUTCDate()+days-1);
      return {id:'DEMO-'+String(current.basin.id).toUpperCase().slice(0,3)+'-'+year+'-'+String(i+1).padStart(2,'0'),year,start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10),days,kind:kinds[i%3],index:i};
    });
  }

  function filteredEvents() {
    return getEvents().filter(e => (current.year==='all' || String(e.year)===current.year) && (current.kind==='all' || e.kind===current.kind) && (!current.search || (e.id+' '+e.start+' '+e.end+' '+e.kind).toLowerCase().includes(current.search.toLowerCase())));
  }

  function graph(seed, caption) {
    const W=760, H=238, left=47, right=47, top=27, bottom=35, n=22, width=W-left-right, height=H-top-bottom;
    const flow=Array.from({length:n},(_,i) => 11+64*Math.exp(-Math.pow((i-(8+seed%4))/3.1,2))+18*Math.exp(-Math.pow((i-15)/4,2))+(Math.sin(i*.8+seed)+1)*2);
    const rain=Array.from({length:n},(_,i)=> Math.max(0,32*Math.exp(-Math.pow((i-(5+seed%4))/2.2,2))+12*Math.exp(-Math.pow((i-12)/1.6,2))-2));
    const points=flow.map((v,i)=>[left+i*width/(n-1),top+height*(1-v/100)]);
    const path=points.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
    const fill=path+' L'+(left+width)+','+(top+height)+' L'+left+','+(top+height)+' Z';
    const grids=[0,25,50,75,100].map(v=>{const y=top+height*(1-v/100);return '<line x1="'+left+'" y1="'+y+'" x2="'+(W-right)+'" y2="'+y+'" stroke="#e8f0f5" stroke-dasharray="3 4"/><text x="'+(left-10)+'" y="'+(y+3)+'" text-anchor="end" font-size="9" fill="#91a8b8">'+v+'</text>';}).join('');
    const bars=rain.map((v,i)=>'<rect x="'+(left+i*width/(n-1)-4).toFixed(1)+'" y="'+top+'" width="8" height="'+(v/40*height*.43).toFixed(1)+'" rx="1" fill="#8dcfe3" opacity=".75"><title>第 '+(i+1)+' 时段 · 降雨示意 '+v.toFixed(1)+' mm</title></rect>').join('');
    const hits=points.map((p,i)=>'<circle class="hd-chart-hit" tabindex="0" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4.5" fill="transparent"><title>第 '+(i+1)+' 时段 · 径流归一化示意 '+flow[i].toFixed(1)+'</title></circle>').join('');
    const xlabels=[0,4,8,12,16,21].map(i=>'<text x="'+(left+i*width/(n-1))+'" y="'+(H-15)+'" text-anchor="middle" font-size="9" fill="#91a8b8">T+'+i+'</text>').join('');
    return '<svg class="hd-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+E(caption)+'，合成演示数据，横轴为相对时段，纵轴为归一化径流"><defs><linearGradient id="hd-flow-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#2997c6" stop-opacity=".18"/><stop offset="1" stop-color="#2997c6" stop-opacity=".015"/></linearGradient></defs><text x="'+left+'" y="14" font-size="9" fill="#8aa3b4">归一化径流 / 示意</text><text x="'+(W-right)+'" y="14" text-anchor="end" font-size="9" fill="#8aa3b4">降雨 / mm · 示意</text>'+grids+bars+'<path d="'+fill+'" fill="url(#hd-flow-fill)"/><path d="'+path+'" fill="none" stroke="#178ac1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+hits+xlabels+'</svg>';
  }

  function eventTable() {
    const events=filteredEvents();
    return '<div class="hd-table-wrap"><table class="hd-table"><thead><tr><th>事件编号</th><th>起止日期</th><th>历时</th><th>事件类型</th><th>来源状态</th></tr></thead><tbody>'+events.map(e=>'<tr data-event="'+e.index+'" class="'+(e.index===current.event?'is-selected':'')+'"><td><button class="hd-event-link" data-event="'+e.index+'">'+E(e.id)+'</button></td><td>'+e.start+' — '+e.end+'</td><td>'+e.days+' 天</td><td><span class="hd-kind '+(e.kind==='持续型'?'long':e.kind==='短历时'?'short':'')+'">'+e.kind+'</span></td><td><span class="hd-tag gray">合成示例</span></td></tr>').join('')+'</tbody></table>'+(events.length?'':'<div class="hd-empty">当前条件下没有演示事件，请调整筛选条件。</div>')+'</div>';
  }

  function chartPanel() {
    const e=getEvents().find(e=>e.index===current.event);
    return '<section class="hd-panel hd-chart-box"><div class="hd-panel-head"><h3>事件过程线 <span class="hd-caption">/ '+E(e.id)+'</span></h3><span class="hd-tag amber">示意过程线</span></div>'+graph(e.index+current.basin.id.length,'事件降雨与径流过程线')+'<div class="hd-chart-foot"><div class="hd-legend"><span><i></i>径流示意</span><span><i class="rain"></i>降雨示意</span></div><span>曲线由合成数据绘制 · 未接入历史过程线</span></div></section>';
  }

  function renderEvents() {
    const b=current.basin;
    root.innerHTML=lead('FLOOD EVENT CATALOG',b.name+' · 洪水事件','从流域进入事件目录，查看洪水数量、事件过程与处理来源。','<button class="hd-button" id="hd-export-events">'+downloadIcon+'导出筛选结果</button>')+
      '<div class="hd-stats"><div class="hd-stat"><div class="hd-stat-label">洪水事件数量</div><div class="hd-stat-value">'+E(b.eventCount)+'<small>场</small></div><div class="hd-stat-sub">演示数量 · 待替换为处理结果</div></div><div class="hd-stat"><div class="hd-stat-label">示例统计时段</div><div class="hd-stat-value" style="font-size:24px">2000—2024</div><div class="hd-stat-sub">时间范围仅用于展示</div></div><div class="hd-stat"><div class="hd-stat-label">本页代表事件</div><div class="hd-stat-value">08<small>条</small></div><div class="hd-stat-sub">可筛选 · 点击查看示意过程线</div></div></div>'+
      '<div class="hd-notice">数量、事件日期与过程线均为演示数据。后续接入原有处理流程生成的事件目录，并保留每场洪水的源记录、识别条件和处理批次。</div>'+
      '<section class="hd-panel"><div class="hd-panel-head"><h3>流域事件目录</h3><span class="hd-caption">合成示例 · 非历史实测统计</span></div><div class="hd-toolbar"><input id="hd-event-search" type="search" aria-label="搜索洪水事件" placeholder="搜索事件编号、日期或类型" value="'+E(current.search)+'"><select id="hd-event-year" aria-label="筛选事件年份"><option value="all">全部年份</option>'+getEvents().map(e=>'<option value="'+e.year+'" '+(String(e.year)===current.year?'selected':'')+'>'+e.year+' 年</option>').join('')+'</select><select id="hd-event-kind" aria-label="筛选事件类型"><option value="all">全部类型</option>'+['降雨型','持续型','短历时'].map(k=>'<option '+(current.kind===k?'selected':'')+'>'+k+'</option>').join('')+'</select><span class="hd-caption" id="hd-event-count">显示 '+filteredEvents().length+' / 8 条示例</span></div><div id="hd-event-table">'+eventTable()+'</div></section><div id="hd-event-chart">'+chartPanel()+'</div>';
    function updateList() {q(root,'#hd-event-table').innerHTML=eventTable();q(root,'#hd-event-count').textContent='显示 '+filteredEvents().length+' / 8 条示例';const visible=filteredEvents();if(!visible.length){q(root,'#hd-event-chart').innerHTML='<div class="hd-panel hd-chart-box hd-empty">没有匹配事件，暂不显示过程线。</div>';return;}if(!visible.some(e=>e.index===current.event)){current.event=visible[0].index;q(root,'#hd-event-table').innerHTML=eventTable();}q(root,'#hd-event-chart').innerHTML=chartPanel();}
    q(root,'#hd-event-search').addEventListener('input', e=>{current.search=e.target.value;updateList();});
    q(root,'#hd-event-year').addEventListener('change', e=>{current.year=e.target.value;updateList();});
    q(root,'#hd-event-kind').addEventListener('change', e=>{current.kind=e.target.value;updateList();});
    q(root,'#hd-event-table').addEventListener('click',e=>{const row=e.target.closest('[data-event]');if(row){current.event=Number(row.dataset.event);q(root,'#hd-event-table').innerHTML=eventTable();q(root,'#hd-event-chart').innerHTML=chartPanel();}});
    q(root,'#hd-export-events').onclick=()=>{const csv='\ufeff流域,事件编号,开始日期,结束日期,历时天数,类型,数据性质\r\n'+filteredEvents().map(e=>[b.name,e.id,e.start,e.end,e.days,e.kind,'合成演示数据，非实测'].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');download('HydroTransfer_'+b.id+'_演示事件.csv',csv,'text/csv;charset=utf-8');};
  }

  function catalogEntries() {
    const raw=window.HYDRO_CATALOG;
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.datasets)) return raw.datasets;
    if (raw && Array.isArray(raw.entries)) return raw.entries;
    return [];
  }

  function renderData() {
    const entries=catalogEntries();
    root.innerHTML=lead('OPEN DATA INPUTS',current.basin.name+' · 模拟输入','公开数据来源可追溯，流域级数据裁剪与质量检查在接入后开展。')+
      '<div class="hd-notice">HydroBASINS Level 8 边界与上下游拓扑属性已接入。气象和其他模型输入待处理，土壤与 LUCC 使用你后续提供的数据；选择本地文件仅记录文件信息，不代表完成空间处理或模型接入。</div>'+
      '<div class="hd-sources">'+(entries.length?entries.map((d,i)=>{
        const waiting=/soil|lucc|landcover/i.test(d.id)||/土壤|覆被|利用/.test(d.category||d.title||'');
        const item=current.files[d.id];
        const url=/^https?:\/\//i.test(d.url||'')?d.url:'#';
        return '<article class="hd-source"><div class="hd-source-head"><div class="hd-source-icon">'+['◫','☂','▧','▦','△','≈'][i%6]+'</div><span class="hd-tag '+(waiting?'amber':'')+'">'+E(waiting?'待用户接入':d.status||'公开数据来源')+'</span></div><h3>'+E(d.title||d.category||d.name)+'</h3><div class="hd-source-en">'+E(d.name)+'</div><p>'+E(d.description)+'</p><div class="hd-meta"><div><span>空间 / 时间分辨率</span>'+E(d.resolution||'以产品说明为准')+'</div><div><span>数据覆盖</span>'+E(d.coverage||'以产品说明为准')+'</div></div><div class="hd-source-foot"><a href="'+E(url)+'" target="_blank" rel="noopener noreferrer">查看公开来源 ↗</a><label class="hd-button" for="hd-file-'+i+'">选择本地文件</label><input class="hd-hidden-input" id="hd-file-'+i+'" type="file" data-id="'+E(d.id)+'" aria-label="选择'+E(d.title||d.name)+'本地文件" accept=".tif,.tiff,.nc,.zip,.csv,.json,.geojson,.gpkg,.shp,.dbf,.prj,.shx"></div><div class="hd-file-state" id="hd-file-state-'+i+'" '+(item?'':'hidden')+'>'+(item?E(item.name)+' · '+(item.size/1024/1024).toFixed(2)+' MB<br>本地文件已选择，尚未解析':'')+'</div></article>';
      }).join(''):'<div class="hd-empty">公开数据目录正在准备，土壤与 LUCC 数据待接入。</div>')+'</div>'+
      '<p class="hd-note" style="margin-top:17px">数据能否支持特定流域的模拟，仍取决于覆盖范围、时段、分辨率与质量检查。公开来源已知不等于流域输入已准备完成。</p>';
    root.querySelectorAll('input[type=file]').forEach(input=>input.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;current.files[input.dataset.id]={name:file.name,size:file.size,type:file.type,lastModified:file.lastModified};const box=q(root,'#'+input.id.replace('hd-file-','hd-file-state-'));box.hidden=false;box.textContent=file.name+' · '+(file.size/1024/1024).toFixed(2)+' MB — 本地文件已选择，尚未解析';}));
  }

  const stages=[
    {name:'流域边界准备',en:'BASIN BOUNDARIES',desc:'已接入 HydroBASINS v1c Level 8 的全球分区与原始拓扑属性，可查询完整上游范围。',input:'HydroBASINS Level 8 原始 Shapefile',inputDetail:'全球9个区域；原始ID、下游ID、本地面积与累计上游面积。',output:'可追溯流域单元',outputDetail:'洲 + 阶次 + 原始记录序号生成展示 ID；保留原始属性，地图几何单独概化。',checks:['核对原始坐标参考和选定记录的几何','按Level 8统计；使用UP_AREA筛选并检查上下游样本嵌套','地图简化边界仅用于展示，计算继续使用原始数据'],artifact:'HydroBASINS_v1c_Level08 / HYBAS_ID / basin_registry'},
    {name:'洪水事件整理',en:'FLOOD EVENT CATALOG',desc:'承接之前处理步骤产出的洪水记录，按流域匹配与汇总，形成可追溯事件目录。',input:'已处理洪水事件',inputDetail:'原始记录索引、事件起止时间、空间位置与识别条件。',output:'流域事件目录',outputDetail:'每个流域的事件数量、事件列表及来源链。',checks:['对照原有流程的事件定义与去重规则','完成事件与新流域边界的空间匹配','保留处理批次、源记录及质量标记'],artifact:'event_catalog / source_record / processing_batch'},
    {name:'公开输入组织',en:'OPEN DATA ASSEMBLY',desc:'汇集气象、地形、土壤、LUCC 等输入，按目标流域与事件时段组织数据。',input:'公开数据与用户数据',inputDetail:'气象强迫、地形 / 河网；用户提供的土壤和 LUCC。',output:'流域输入清单',outputDetail:'数据来源、时间覆盖、分辨率与待补数据项。',checks:['核验流域与事件时段的覆盖情况','统一坐标、时步与数据单位','完成缺测检查，保留处理与重采样记录'],artifact:'input_manifest / data_quality / temporal_coverage'},
    {name:'流域属性表征',en:'BASIN REPRESENTATION',desc:'整理与参数移植相关的气候、地形、土壤及地表覆盖特征，为流域对比提供输入。',input:'标准化输入数据',inputDetail:'流域边界、气象统计与静态下垫面信息。',output:'流域属性向量',outputDetail:'用于来源流域检索和目标流域描述的特征集合。',checks:['按已有模型要求确定属性与单位','记录每个特征的数据来源及计算方法','检查不同流域的属性口径是否一致'],artifact:'basin_attributes / feature_schema'},
    {name:'大模型参数移植',en:'PARAMETER TRANSFER',desc:'结合目标流域特征，展示来源流域选择、参数移植与适用性检查的衔接。',input:'属性与来源参数',inputDetail:'目标流域特征、来源流域参数与模型版本。',output:'目标流域参数方案',outputDetail:'移植策略、参数清单与来源记录。',checks:['连接已有大模型与参数移植方法','记录来源流域、模型版本及移植策略','校核参数范围与目标模型要求'],artifact:'transfer_config / model_version / parameter_set'},
    {name:'洪水模拟与展示',en:'FLOOD SIMULATION',desc:'以事件、输入和参数组织模拟任务，展示过程线及可追溯的结果说明。',input:'事件 + 输入 + 参数',inputDetail:'目标事件时段、流域输入清单与移植参数方案。',output:'洪水过程与任务记录',outputDetail:'模型结果、运行配置及评估信息（有观测时）。',checks:['运行前核对输入完整性与模型配置','记录运行状态、模型版本与输出路径','仅在具备观测数据时开展相应验证'],artifact:'run_config / hydrograph / evaluation_when_available'}
  ];

  function stageContent() {
    const s=stages[current.step];
    return '<div class="hd-flow-content"><div class="hd-eyebrow">STEP '+String(current.step+1).padStart(2,'0')+' / '+s.en+'</div><h3>'+s.name+'</h3><p>'+s.desc+'</p><div class="hd-io"><div class="hd-io-box"><small>INPUT</small><h4>'+s.input+'</h4><p>'+s.inputDetail+'</p></div><div class="hd-io-arrow">→</div><div class="hd-io-box"><small>OUTPUT</small><h4>'+s.output+'</h4><p>'+s.outputDetail+'</p></div></div><h4 style="font-size:12px;font-weight:500;color:#577c93">接入与检查要点</h4><ul class="hd-checklist">'+s.checks.map(v=>'<li>'+v+'</li>').join('')+'</ul><div class="hd-trace">建议保留的追溯字段<br><span style="font-family:Consolas,monospace">'+s.artifact+'</span></div><div class="hd-flow-bottom"><span class="hd-note">流程状态：待映射原有脚本与产物</span><button class="hd-button" id="hd-next-stage">'+(current.step===5?'回到第一步':'查看下一步 →')+'</button></div></div>';
  }

  function renderWorkflow() {
    root.innerHTML=lead('PROCESS & PROVENANCE','从全球流域到一次洪水模拟','以新的流域单元串起事件、输入与参数，让每个结果都有来源。','<button class="hd-button" id="hd-export-plan">'+downloadIcon+'导出接入清单</button>')+
      '<div class="hd-notice">原有流程脚本与产物待接入；当前展示建议步骤。具体的洪水识别方法、处理顺序和参数移植方法，以你的原有流程为准。</div><div class="hd-workflow"><nav class="hd-steps" aria-label="建议处理流程">'+stages.map((s,i)=>'<button class="hd-step '+(i===current.step?'active':'')+'" data-stage="'+i+'" aria-current="'+(i===current.step?'step':'false')+'"><span class="hd-step-no">'+String(i+1).padStart(2,'0')+'</span><span><b>'+s.name+'</b><small>'+s.en+'</small></span></button>').join('')+'</nav><section class="hd-panel" id="hd-stage-content">'+stageContent()+'</section></div>';
    function select(index) {current.step=index;root.querySelectorAll('[data-stage]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.stage)===index);b.setAttribute('aria-current',Number(b.dataset.stage)===index?'step':'false');});q(root,'#hd-stage-content').innerHTML=stageContent();q(root,'#hd-next-stage').onclick=()=>select((current.step+1)%stages.length);}
    root.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>select(Number(b.dataset.stage)));
    q(root,'#hd-next-stage').onclick=()=>select((current.step+1)%stages.length);
    q(root,'#hd-export-plan').onclick=()=>download('HydroTransfer_'+current.basin.id+'_流程接入清单.json',JSON.stringify({project:'HydroTransfer',basin:current.basin.name,status:'建议流程，待映射原有脚本与产物',stages:stages.map((s,i)=>({step:i+1,name:s.name,input:s.input,output:s.output,checks:s.checks,provenance:s.artifact}))},null,2));
  }

  const donors=[{id:'yangtze',name:'长江流域'},{id:'mekong',name:'湄公河流域'},{id:'rhine',name:'莱茵河流域'},{id:'amazon',name:'亚马孙河流域'},{id:'mississippi',name:'密西西比河流域'},{id:'congo',name:'刚果河流域'}];
  const progressStages=[['检查任务配置','演示：目标流域、事件与数据项'],['组织流域输入','演示：气象、地形、土壤与 LUCC'],['读取来源流域参数','演示：来源流域与参数版本'],['执行参数移植步骤','演示：将参数方案传入目标流域'],['生成示意过程线','合成曲线 · 未调用模型']];

  function progressMarkup() {
    const sim=current.simulation;
    return progressStages.map((s,i)=>'<div class="hd-progress '+(sim.complete||i<sim.progress?'done':i===sim.progress?'active':'')+'"><span class="hd-progress-mark">'+(sim.complete||i<sim.progress?'✓':String(i+1).padStart(2,'0'))+'</span><div><b>'+s[0]+'</b><small>'+s[1]+'</small></div><span class="hd-progress-state">'+(sim.complete||i<sim.progress?'演示完成':i===sim.progress?'正在播放':'等待演示')+'</span></div>').join('');
  }

  function simulationResult() {
    if(!current.simulation.complete)return '<div class="hd-placeholder"><svg viewBox="0 0 80 50" fill="none" stroke="#4492b5" stroke-width="2"><path d="M3 45h74M5 5v40M7 40l12-2 8-10 8-19 8 17 9 5 10 9 13 1"/></svg><span>配置后播放演示，查看参数移植到洪水过程线的衔接</span><span style="font-size:9px;margin-top:5px">当前未运行模型，尚无模拟结果</span></div>';
    const seed=current.simulation.donor.length+Number(current.simulation.duration);
    return '<div class="hd-panel" style="margin-top:18px"><div class="hd-panel-head"><h3>洪水过程展示</h3><span class="hd-tag amber">合成示意 · 未调用模型</span></div>'+graph(seed,'参数移植后洪水模拟流程演示')+'<div class="hd-chart-foot"><div class="hd-legend"><span><i></i>径流示意</span><span><i class="rain"></i>降雨示意</span></div><span>相对时段 T · 非模型计算值</span></div></div><div class="hd-result-note">演示已完成。该曲线用于说明输出形式，不表示模型精度、实际洪水规模或参数移植效果。</div>';
  }

  function renderSimulation() {
    const b=current.basin,sim=current.simulation;
    root.innerHTML=lead('PARAMETER TRANSFER & SIMULATION',b.name+' · 参数移植模拟','选择来源流域与移植方式，演示输入数据到洪水过程线的衔接。')+
      '<div class="hd-notice">当前为界面流程演示，未连接大模型、参数文件或水文计算引擎。来源流域和策略为可交互选项，过程线为合成示意数据。</div><div class="hd-sim-grid"><section class="hd-panel"><div class="hd-panel-head"><h3>任务配置</h3><span class="hd-caption">DEMO CONFIG</span></div><div class="hd-panel-body"><div class="hd-sim-target"><small>目标流域 / TARGET</small><b>'+E(b.name)+'</b><p>'+E(b.en)+' · '+E(b.region)+'</p></div><label class="hd-field"><span>来源流域 · 演示选择</span><select id="hd-donor">'+donors.filter(d=>d.id!==b.id).map(d=>'<option value="'+d.id+'" '+(sim.donor===d.id?'selected':'')+'>'+d.name+'</option>').join('')+'</select></label><label class="hd-field"><span>参数移植方式 · 示意配置</span><select id="hd-strategy"><option value="similarity" '+(sim.strategy==='similarity'?'selected':'')+'>流域相似性辅助移植</option><option value="foundation" '+(sim.strategy==='foundation'?'selected':'')+'>大模型引导参数移植</option><option value="regional" '+(sim.strategy==='regional'?'selected':'')+'>区域参数迁移</option></select></label><label class="hd-field"><span>展示时步</span><select id="hd-interval"><option value="daily" '+(sim.interval==='daily'?'selected':'')+'>逐日</option><option value="hourly" '+(sim.interval==='hourly'?'selected':'')+'>逐小时</option></select></label><label class="hd-field"><span>示例事件窗口 / 天</span><input id="hd-duration" type="number" min="3" max="30" step="1" value="'+sim.duration+'"></label><button class="hd-button primary" id="hd-play" style="width:100%" '+(sim.running?'disabled':'')+'>'+(sim.running?'演示播放中…':sim.complete?'↻ 重新播放模拟演示':'▷ 播放模拟演示')+'</button><button class="hd-button" id="hd-export-config" style="width:100%;margin-top:8px">'+downloadIcon+'导出任务配置</button><p class="hd-config-note">导出内容为演示配置。正式运行前需要接入输入数据、参数文件与计算引擎。</p></div></section><section class="hd-panel"><div class="hd-panel-head"><h3>演示运行过程</h3><span class="hd-tag gray">未调用模型</span></div><div class="hd-panel-body"><div id="hd-progress" aria-live="polite">'+progressMarkup()+'</div><div id="hd-result">'+simulationResult()+'</div></div></section></div>';
    function markChanged(){if(timer){clearTimeout(timer);timer=null;}sim.running=false;sim.progress=-1;sim.complete=false;q(root,'#hd-progress').innerHTML=progressMarkup();q(root,'#hd-result').innerHTML=simulationResult();const btn=q(root,'#hd-play');btn.disabled=false;btn.textContent='▷ 播放模拟演示';}
    ['donor','strategy','interval'].forEach(key=>q(root,'#hd-'+key).onchange=e=>{sim[key]=e.target.value;markChanged();});
    q(root,'#hd-duration').onchange=e=>{sim.duration=Math.max(3,Math.min(30,Math.round(Number(e.target.value)||10)));e.target.value=sim.duration;markChanged();};
    q(root,'#hd-play').onclick=()=>{
      sim.running=true;sim.complete=false;sim.progress=0;
      const button=q(root,'#hd-play');button.disabled=true;button.textContent='演示播放中…';q(root,'#hd-progress').innerHTML=progressMarkup();q(root,'#hd-result').innerHTML=simulationResult();
      function advance(){if(!root||current.view!=='simulation')return;sim.progress++;if(sim.progress>=progressStages.length){sim.running=false;sim.complete=true;q(root,'#hd-progress').innerHTML=progressMarkup();q(root,'#hd-result').innerHTML=simulationResult();button.disabled=false;button.textContent='↻ 重新播放模拟演示';timer=null;return;}q(root,'#hd-progress').innerHTML=progressMarkup();timer=setTimeout(advance,650);}
      timer=setTimeout(advance,650);
    };
    q(root,'#hd-export-config').onclick=()=>download('HydroTransfer_'+b.id+'_演示配置.json',JSON.stringify({project:'HydroTransfer',data_type:'demo_configuration',model_executed:false,target_basin:{id:b.id,name:b.name,boundary_source:b.boundarySource||'HydroBASINS v1c Level 8',source_record_id:b.sourceId||null,hydrobasins_level:b.level||null,upstream_area_km2:b.upstreamAreaKm2||null,area_km2:b.areaKm2||null},source_basin:sim.donor,transfer_strategy:sim.strategy,display_interval:sim.interval,event_window_days:sim.duration,inputs_status:'HydroBASINS Level 8 边界与拓扑属性已接入；事件及模型输入待接入',note:'界面演示配置，不包含真实模型参数或结果'},null,2));
  }

  function destroy() {if(timer){clearTimeout(timer);timer=null;}if(current&&current.simulation.running){current.simulation.running=false;current.simulation.progress=-1;}root=null;}
  function render(container, view, basin) {
    destroy();installStyle();
    if(!container||!basin)return;
    root=container;
    root.classList.add('hd-root');
    if(!current||current.basin.id!==basin.id)current=defaultState(basin);
    current.basin=basin;current.view=view;
    ({events:renderEvents,data:renderData,workflow:renderWorkflow,simulation:renderSimulation}[view]||renderEvents)();
  }
  window.HydroDetails={render,destroy};
})();
