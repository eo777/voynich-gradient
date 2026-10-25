"use strict";
let mds=null, selected=0;
const initialParams=new URLSearchParams(location.search);
const anchors=['prefix:qok','prefix:qot','suffix:edy','suffix:ol','prefix:cho','eo','cth','ckh','ch','sh','ed','dy'];
const kinds=['prefix','suffix','interior','ordered pair','anywhere','co-occurrence'];
const kindColors=['#3067aa','#168374','#a5659b','#bf7a36','#738746','#b75270'];
const inspectColors=['#153e53','#cb8334','#8d64ae','#27977f'];
// Official Golf 2.1 profiles, copied from apps/clustermatrix/golf-v21.json.
// Keep the standalone package independent of the source app at runtime.
const golf21Colors={"1a":"#256db2","1b":"#8bbcf0","1.5a":"#20a4c4","2a":"#098f84","2c":"#929c20","3a":"#c44383","3b":"#8c5438","3c":"#684bc4","3d-c":"#526675","3d-l":"#92b6ae","4a":"#db7b23","4b":"#9b5720","4c":"#b18b12","5a":"#d94f4f","5b":"#78818f","5c":"#ee967c","6":"#42482c"};
function source(){return $('curve-source').value;}
function mode(aspect){return mds.maps[`${source()}_${aspect}`];}
function peakAt(i,aspect){
  // Use the saved uncentered curve, not the mean-centered MDS comparison vector.
  const values=mds.features[i].curves[mode(aspect).source_matrix];
  const magnitude=Math.max(...values.map(Math.abs)),tolerance=1e-12+magnitude*1e-9;
  const ties=values.map((v,j)=>j).filter(j=>Math.abs(Math.abs(values[j])-magnitude)<=tolerance);
  const index=ties[0],node=mds.nodes[index];
  return {index,node,value:values[index],magnitude,ties};
}
function peakText(i,aspect){
  const p=peakAt(i,aspect),unit=source()==='usage'?(aspect==='level'?'per 10,000':'per 10,000 / path unit'):(aspect==='level'?'log weight':'log weight / path unit');
  const value=Math.abs(p.value)<.01?p.value.toPrecision(3):fmt(p.value,2);
  const tied=p.ties.length>1?`; tied at ${p.ties.map(j=>`${mds.nodes[j].id} (${mds.nodes[j].group})`).join(', ')}; earliest used for color`:'';
  return `Peak magnitude: Golf ${p.node.group} · ${p.node.id} · ${value} ${unit}${tied}`;
}
function kindOf(f){
  if(f.source==='ordered_pair')return 'ordered pair';
  if(f.kind==='position')return f.name.split(':')[0];
  if(f.kind==='prefix'||f.kind==='suffix')return f.kind;
  return f.kind==='interaction'?'co-occurrence':'anywhere';
}
function pointColor(i,aspect){
  const f=mds.features[i];
  if($('color-mode').value==='golf_peak')return golf21Colors[peakAt(i,aspect).node.group]||'#78818f';
  return $('color-mode').value==='group'?mds.palette[f.group-1]:kindColors[kinds.indexOf(kindOf(f))];
}
function describe(){
  $('source-description').innerHTML=source()==='usage'
    ? '<strong>Full-model usage:</strong> each curve is the fitted total frequency of words containing that feature. It includes the effects of all their other constructions. Similar curves can arise partly because their word populations overlap.'
    : '<strong>Own contribution:</strong> each curve is the feature’s own gradual log-weight contribution, before combining it with other features and normalizing word probabilities. This is closer to comparing the 544 model terms themselves. A tiny coefficient is still shown at full normalized size; check its strength below.';
  const colorMode=$('color-mode').value;
  const labels=colorMode==='golf_peak'?[...new Set(mds.nodes.map(n=>n.group))].map(g=>[golf21Colors[g],g]):colorMode==='group'?mds.palette.map((c,i)=>[c,`Group ${i+1}`]):kinds.map((k,i)=>[kindColors[i],k]);
  $('color-legend').innerHTML=labels.map(([c,s])=>`<span style="--c:${c}">${esc(s)}</span>`).join('');
  $('color-note').hidden=colorMode!=='golf_peak';
  $('color-note').textContent=source()==='usage'
    ? 'Official Golf 2.1 colors. Left: section containing the highest gradual usage. Right: section containing the strongest absolute slope (increase or decrease). Peaks use the saved raw curves; tied peaks use the earliest bifolium. Hover a point for details.'
    : 'Official Golf 2.1 colors. Left: section of the largest absolute own coefficient. Right: section of the largest absolute coefficient slope. Peaks use the saved raw curves; tied peaks use the earliest bifolium. Hover a point for details.';
}
function mapSVG(aspect){
  const map=mode(aspect), xy=map.coordinates, W=600,H=530,L=45,R=22,T=24,B=38;
  const x=xy.map(p=>p[0]),y=xy.map(p=>p[1]);
  const midX=(Math.min(...x)+Math.max(...x))/2,midY=(Math.min(...y)+Math.max(...y))/2;
  // One common scale on both axes is essential: preserve Euclidean distances.
  const scale=Math.min((W-L-R)/(Math.max(...x)-Math.min(...x)),(H-T-B)/(Math.max(...y)-Math.min(...y)))*.88;
  const X=v=>L+(W-L-R)/2+(v-midX)*scale,Y=v=>T+(H-T-B)/2-(v-midY)*scale;
  let svg=`<svg class="mds-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(map.title)}: 544 feature points. Search a feature or select a point to inspect its curves.">`;
  for(let v=-1;v<=1;v+=.5){
    if(X(v)>L&&X(v)<W-R)svg+=`<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H-B}" stroke="#e8ede9"/><text class="map-axis" x="${X(v)}" y="${H-B+18}" text-anchor="middle">${v}</text>`;
    if(Y(v)>T&&Y(v)<H-B)svg+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e8ede9"/><text class="map-axis" x="${L-8}" y="${Y(v)+4}" text-anchor="end">${v}</text>`;
  }
  const neighbors=new Set(map.neighbors[selected].slice(0,3));
  const order=[...xy.keys()].filter(i=>i!==selected).concat(selected);
  for(const i of order){const f=mds.features[i],sel=i===selected;
    if(neighbors.has(i))svg+=`<circle cx="${X(x[i])}" cy="${Y(y[i])}" r="7" fill="none" stroke="#8e9ba1" stroke-width="1.1"/>`;
    const golf=$('color-mode').value==='golf_peak',peak=golf?peakText(i,aspect):'';
    svg+=`<circle class="mds-dot${sel?' selected':''}${golf?' golf-peak':''}" cx="${X(x[i])}" cy="${Y(y[i])}" r="${sel?6:3.7}" fill="${pointColor(i,aspect)}" data-index="${i}" data-aspect="${aspect}" tabindex="${sel?0:-1}" aria-label="${esc(f.name)}; ${f.tokens} carrier tokens${golf?'; '+esc(peak):''}"><title>${esc(f.name)} · ${f.tokens.toLocaleString()} carrier tokens${golf?' · '+esc(peak):''}</title></circle>`;
  }
  // Sparse labels are annotation only; all 544 points remain selectable.
  const used=[];
  const candidates=[selected,...anchors.map(n=>mds.features.findIndex(f=>f.name===n)).filter(i=>i>=0&&i!==selected)];
  for(const i of candidates){
    const text=mds.features[i].name,w=text.length*6.5;
    let pos=null;
    for(const [dx,dy] of [[9,-9],[9,18],[-w-9,-9],[-w-9,18],[9,-23],[9,32]]){
      const left=X(x[i])+dx,top=Y(y[i])+dy-12,box=[left,top,left+w,top+15];
      if(left<L||left+w>W-R||top<0||top+15>H-B)continue;
      if(!used.some(a=>box[0]<a[2]+3&&box[2]>a[0]-3&&box[1]<a[3]+3&&box[3]>a[1]-3)){pos=box;break;}
    }
    if(pos){used.push(pos);svg+=`<text class="mds-label" x="${pos[0]}" y="${pos[1]+12}" ${i===selected?'font-weight="bold"':''}>${esc(text)}</text>`;}
  }
  svg+=`<text class="map-axis" text-anchor="middle" x="${W/2}" y="${H-3}">MDS dimension 1 · axes are not time</text></svg>`;
  return svg;
}
function drawMaps(){
  describe();
  for(const aspect of ['level','slope']){
    const map=mode(aspect),m=map.metrics;
    $(`map-${aspect}`).innerHTML=mapSVG(aspect);
    $(`map-${aspect}`).parentElement.querySelector('h2').textContent=map.title;
    $(`metrics-${aspect}`).innerHTML=`Distance rank correlation <strong>${fmt(m.distance_rank_correlation,2)}</strong> · ten-neighbor recall <strong>${pct(m.mean_neighbor_recall_10)}</strong> · relative distance error ${pct(m.relative_distance_rmse)}`;
  }
}
function overlap(a,b){const A=new Set(a.members),B=new Set(b.members);let both=0;for(const i of A)if(B.has(i))both++;return both/(A.size+B.size-both);}
function inspect(){
  const aspect=$('neighbor-metric').value,map=mode(aspect),f=mds.features[selected];
  const near=map.neighbors[selected].slice(0,3),ids=[selected,...near];
  $('selection-title').textContent=f.name;
  $('feature-search').value=f.name;
  const peak=Math.max(...f.curves.coefficient.map(Math.abs));
  $('selection-support').innerHTML=`${fmt(f.tokens,0)} observed carrier tokens · ${fmt(f.types,0)} spellings · ${esc(kindOf(f))} · maximum absolute own log-weight ${peak.toPrecision(3)}. Examples: <code>${f.examples.map(esc).join(', ')}</code>.${f.aliases.length?` <span>Same observed population as ${f.aliases.slice(0,5).map(esc).join(', ')}${f.aliases.length>5?'…':''}.</span>`:''}`;
  $('neighbors').innerHTML=near.map((j,k)=>{const b=mds.features[j],sim=map.neighbor_similarity[selected][k];return `<button type="button" data-neighbor="${j}"><strong>${esc(b.name)}</strong><small>${aspect==='level'?'Curve correlation':'Slope cosine'} ${fmt(sim,3)} · ${fmt(b.tokens,0)} tokens</small><small>Shared spellings: ${pct(overlap(f,b))} of their union</small></button>`;}).join('');
  const normalized=ids.map((i,k)=>({values:map.normalized[i],label:mds.features[i].name,color:inspectColors[k],width:k===0?3:2}));
  const rawKey=source()==='usage'?'gradual':'coefficient';
  const raw=ids.map((i,k)=>({...normalized[k],values:mds.features[i].curves[rawKey]}));
  $('curve-legend').innerHTML=ids.map((i,k)=>`<span style="--c:${inspectColors[k]}">${esc(mds.features[i].name)}</span>`).join('');
  $('normalized-title').textContent=aspect==='level'?'Curve shapes · centered and normalized':'Slope shapes · normalized, sign preserved';
  $('raw-title').textContent=source()==='usage'?'Gradual usage · per 10,000 words':'Own contribution · log weight';
  const labels=mds.nodes.map(n=>n.id),opt={nodes:mds.nodes,observationUnit:'bifolium',width:640,height:250};
  $('normalized-chart').innerHTML=lineChart(normalized,labels,{...opt,title:$('normalized-title').textContent});
  $('raw-chart').innerHTML=lineChart(raw,labels,{...opt,title:$('raw-title').textContent});
}
function persist(){const p=new URLSearchParams({feature:mds.features[selected].name,source:source(),neighbors:$('neighbor-metric').value,color:$('color-mode').value});history.replaceState(null,'',`?${p}${location.hash}`);}
function select(i,aspect){selected=i;if(aspect)$('neighbor-metric').value=aspect;drawMaps();inspect();persist();}
function search(){
  const q=$('feature-search').value.trim().toLowerCase();
  const i=mds.features.findIndex(f=>f.name.toLowerCase()===q||f.aliases.some(a=>a.toLowerCase()===q));
  const fallback=i>=0?i:mds.features.findIndex(f=>f.name.toLowerCase()===`prefix:${q}`);
  if(fallback>=0){select(fallback);$('status').textContent='544 features · 50 bifolia · Path 1';}
  else $('status').textContent='Choose a listed active feature; the map includes all 544.';
}
function tooltip(event){
  const dot=event.target.closest('.mds-dot'),box=$('map-tooltip');
  if(!dot){box.hidden=true;return;}
  const f=mds.features[+dot.dataset.index];
  box.innerHTML=`<strong>${esc(f.name)}</strong><br>${fmt(f.tokens,0)} tokens · ${fmt(f.types,0)} spellings<br>Select to compare full curves and neighbors.`;
  if($('color-mode').value==='golf_peak')box.innerHTML+=`<br>${esc(peakText(+dot.dataset.index,dot.dataset.aspect))}`;
  const bounds=dot.getBoundingClientRect(),x=event.clientX??bounds.x,y=event.clientY??bounds.y;
  box.style.left=Math.max(5,Math.min(innerWidth-300,x+16))+'px';box.style.top=Math.max(5,Math.min(innerHeight-100,y+14))+'px';box.hidden=false;
}
async function boot(){
  try{
    const response=await fetch('feature-mds-data.json.gz?v=52444dc0a1');if(!response.ok)throw Error(`Data request failed: ${response.status}`);
    mds=JSON.parse(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text());
    data={nodes:mds.nodes,unit:'bifolium'};
    $('feature-options').innerHTML=mds.features.map(f=>`<option value="${esc(f.name)}">${fmt(f.tokens,0)} tokens</option>`).join('');
    if(initialParams.get('source')==='own')$('curve-source').value='own';
    if(initialParams.get('neighbors')==='slope')$('neighbor-metric').value='slope';
    if(['group','kind','golf_peak'].includes(initialParams.get('color')))$('color-mode').value=initialParams.get('color');
    selected=Math.max(0,mds.features.findIndex(f=>f.name===(initialParams.get('feature')||'suffix:edy')));
    select(selected);$('status').textContent='544 features · 50 bifolia · Path 1';
    $('curve-source').addEventListener('change',()=>select(selected));
    $('color-mode').addEventListener('change',()=>{drawMaps();persist();});
    $('neighbor-metric').addEventListener('change',()=>{inspect();persist();});
    $('feature-search').addEventListener('change',search);
    $('feature-search').addEventListener('keydown',e=>{if(e.key==='Enter')search();});
    $('maps').addEventListener('click',e=>{const dot=e.target.closest('.mds-dot');if(dot)select(+dot.dataset.index,dot.dataset.aspect);});
    $('maps').addEventListener('keydown',e=>{const dot=e.target.closest('.mds-dot');if(dot&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(+dot.dataset.index,dot.dataset.aspect);}});
    $('maps').addEventListener('pointermove',tooltip);
    $('maps').addEventListener('pointerleave',()=>$('map-tooltip').hidden=true);
    $('neighbors').addEventListener('click',e=>{const b=e.target.closest('[data-neighbor]');if(b)select(+b.dataset.neighbor);});
  }catch(error){$('status').textContent=error.message;$('status').className='error';}
}
boot();
