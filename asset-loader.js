/* Resources are fetched only for the workspace that needs them. Offline builds use the same API. */
(() => {
  const inflight=new Map();
  function url(name){if(/^(data:|blob:)/.test(name))return name;return window.HYDRO_OFFLINE_FILES?.[name]||(name+'?v='+(window.HYDRO_RESOURCES?.build||'8'));}
  function script(name){
    if(inflight.has(name))return inflight.get(name);
    const promise=new Promise((resolve,reject)=>{
      const offline=window.HYDRO_OFFLINE_SCRIPTS?.[name];
      if(offline!=null){try{new Function(offline)();resolve();}catch(e){reject(e);}return;}
      const tag=document.createElement('script');tag.src=url(name);tag.async=true;
      tag.onload=resolve;tag.onerror=()=>{inflight.delete(name);tag.remove();reject(new Error('资源加载失败，请重试。'));};document.head.appendChild(tag);
    });inflight.set(name,promise);promise.catch(()=>inflight.delete(name));return promise;
  }
  const groups={
    cube:['assets/cube-previews.js','assets/cube-discharge-catalog.js','cube-viewer.js'],
    report:['assets/report-data.js','report-viewer.js'],
    results:['assets/report-data.js','report-viewer.js','research-results.js','global-results.js'],
    details:['detail-views.js']
  };
  async function group(name){for(const file of groups[name]||[])await script(file);}
  const image=name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url(name);});
  window.HydroAssets={url,script,group,image,groups};
})();
