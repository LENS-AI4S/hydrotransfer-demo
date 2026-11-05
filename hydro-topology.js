/* Directed HydroBASINS relationships; never infer connectivity from proximity. */
window.HydroTopology = {
  trace(selected, units, parents) {
    const result={upstream:[],downstream:[],virtualLinks:0,cycleDetected:false,unresolvedDownstreamId:null};
    if(!selected)return result;
    const start=String(selected.properties.id),seenUp=new Set([start]),queue=[start];
    while(queue.length){
      const id=queue.pop();
      for(const parent of parents.get(id)||[]){
        const key=String(parent);
        if(key===start)result.cycleDetected=true;
        if(seenUp.has(key))continue;
        seenUp.add(key);const feature=units.get(key);
        if(feature){result.upstream.push(feature);queue.push(key);}
      }
    }
    const seenDown=new Set([start]);let current=selected;
    while(current){
      const next=Number(current.properties.NEXT_DOWN||0);
      if(!next)break;
      const id=String(next);
      if(seenDown.has(id)){result.cycleDetected=true;break;}
      seenDown.add(id);current=units.get(id);
      if(!current){result.unresolvedDownstreamId=id;break;}
      result.downstream.push(current);
    }
    // A malformed cycle must not paint the same unit in both directions.
    result.upstream=result.upstream.filter(f=>!seenDown.has(String(f.properties.id)));
    const related=[selected,...result.upstream,...result.downstream];
    const relatedIds=new Set(related.map(f=>String(f.properties.id)));
    result.virtualLinks=related.filter(f=>Number(f.properties.ENDO)===2&&Number(f.properties.NEXT_DOWN)>0&&relatedIds.has(String(f.properties.NEXT_DOWN))).length;
    return result;
  }
};
