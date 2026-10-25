"use strict";
let pm=null,profileSources={},selection={unit:'pages',index:0},comparison=0;
const pageParams=new URLSearchParams(location.search);
const metric=()=>$('distance').value;
const isGradual=()=>pm.profile_source==='gradual';
const part=u=>pm[u];
const mapping=u=>part(u).maps[metric()];
const selectedItem=()=>part(selection.unit).items[selection.index];
const profile=(u,i)=>part(u).rates?.[i]||part(u).counts[i].map(v=>v/part(u).items[i].N);
const officialColor=r=>pm.palette[r.group].color;
const distanceText=v=>v===0?'0 · identical profile':v<.0001?v.toExponential(2):fmt(v,4);
function drawPageMap(unit){
 const p=part(unit),m=mapping(unit),xy=m.coordinates,W=600,H=530,L=35,R=25,T=25,B=30;
 const xx=xy.map(v=>v[0]),yy=xy.map(v=>v[1]),xmin=Math.min(...xx),xmax=Math.max(...xx),ymin=Math.min(...yy),ymax=Math.max(...yy);
 const scale=.87*Math.min((W-L-R)/(xmax-xmin),(H-T-B)/(ymax-ymin));
 const X=v=>L+(W-L-R)/2+(v-(xmin+xmax)/2)*scale,Y=v=>T+(H-T-B)/2-(v-(ymin+ymax)/2)*scale;
 const current=selectedItem(),nearest=new Set(selection.unit===unit?m.neighbors[selection.index].slice(0,5):[]);
 let svg=`<svg class="mds-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${p.items.length} ${unit} compared using 544 ${isGradual()?'gradual estimated':'observed'} construction frequencies">`;
 svg+=`<line x1="${L}" x2="${W-R}" y1="${H-B}" y2="${H-B}" stroke="#dce3df"/><line x1="${L}" x2="${L}" y1="${T}" y2="${H-B}" stroke="#dce3df"/>`;
 for(let k=0;k<5;k++){const v=xmin+(xmax-xmin)*k/4;svg+=`<text class="map-axis" x="${X(v)}" y="${H-B+16}" text-anchor="middle">${fmt(v,2)}</text>`;}
 const order=[...p.items.keys()].sort((a,b)=>+(p.items[a].node===current.node)-+(p.items[b].node===current.node));
 for(const i of order){const r=p.items[i],sel=selection.unit===unit&&selection.index===i,member=r.node===current.node;
  if(nearest.has(i))svg+=`<circle cx="${X(xx[i])}" cy="${Y(yy[i])}" r="8" fill="none" stroke="#91a29f"/>`;
  const attrs=`class="mds-dot page-dot${sel?' selected':member?' member':''}" fill="${officialColor(r)}" data-unit="${unit}" data-index="${i}" tabindex="${sel?0:-1}" aria-label="${esc(r.id)}; Golf ${esc(r.group)}; ${r.N} tokens"`;
  const title=`<title>${esc(r.id)} · Golf ${esc(r.group)} · ${r.N} tokens · ${esc(r.bifolium)}</title>`;
  if(isGradual()&&unit==='pages'){
   const peers=xy.map((v,j)=>v[0]===xx[i]&&v[1]===yy[i]?j:-1).filter(j=>j>=0),k=peers.indexOf(i),rad=peers.some(j=>p.items[j].node===current.node)?9:7,cx=X(xx[i]),cy=Y(yy[i]);
   const a=2*Math.PI*k/peers.length-Math.PI/2,b=2*Math.PI*(k+1)/peers.length-Math.PI/2;
   if(peers.length===1)svg+=`<circle ${attrs} cx="${cx}" cy="${cy}" r="${rad}">${title}</circle>`;
   else svg+=`<path ${attrs} d="M ${cx} ${cy} L ${cx+rad*Math.cos(a)} ${cy+rad*Math.sin(a)} A ${rad} ${rad} 0 ${b-a>Math.PI?1:0} 1 ${cx+rad*Math.cos(b)} ${cy+rad*Math.sin(b)} Z">${title}</path>`;
  }else svg+=`<circle ${attrs} cx="${X(xx[i])}" cy="${Y(yy[i])}" r="${sel?6.5:unit==='pages'?4.8:6}">${title}</circle>`;
 }
 const fixed=unit==='pages'?['f1r','f18r','f18v','f44v','f87v','f90r','f116r','f85r1']:['A:1-8','O:87-90','T:103-116'];
 const ids=[...p.items.keys()].filter(i=>p.items[i].node===current.node||fixed.includes(p.items[i].id));
 const occupied=[];
 for(const i of ids){const label=p.items[i].id,w=label.length*6.6;for(const [dx,dy] of [[8,-8],[8,17],[-w-8,-8],[-w-8,17]]){
  const box=[X(xx[i])+dx,Y(yy[i])+dy-12,X(xx[i])+dx+w,Y(yy[i])+dy+3];
  if(box[0]<L||box[2]>W-R||box[1]<0||box[3]>H-B||occupied.some(b=>box[0]<b[2]+3&&box[2]>b[0]-3&&box[1]<b[3]+2&&box[3]>b[1]-2))continue;
  occupied.push(box);svg+=`<text class="mds-label" x="${box[0]}" y="${box[1]+12}">${esc(label)}</text>`;break;
 }}
 svg+=`<text class="map-axis" x="${W/2}" y="${H-1}" text-anchor="middle">MDS dimension 1 · arbitrary orientation</text></svg>`;
 $(`page-map-${unit}`).innerHTML=svg;
 const q=m.metrics;$(`page-metrics-${unit}`).innerHTML=`${isGradual()?'On the 50 bifolium profiles: ':''}distance rank correlation <strong>${fmt(q.distance_rank_correlation,2)}</strong> · ten-neighbor recall <strong>${pct(q.neighbor_recall_10)}</strong> · relative distance error ${pct(q.relative_distance_rmse)}`;
}
function draw(){
 const gradual=isGradual();
 $('status').textContent=`207 pages · 50 bifolia · ${gradual?'gradual estimates':'observed frequencies'}`;
 $('pages-title').textContent=gradual?`207 pages · ${pm.distinct_profiles} shared positions`:'207 pages';
 $('bifolia-title').textContent=gradual?'50 gradual bifolium profiles':'50 pooled bifolia';
 $('source-note').textContent=gradual
  ? `Gradual estimates only: expected counts are split in proportion to page token totals. Pages from one bifolium have identical rates and share a position. The 50 bifolia have ${pm.distinct_profiles} distinct profiles because some fitted stretches are flat. Each disk has one slice per page, colored by its Golf assignment; select a slice or search a page.`
  : 'Observed token counts: pages retain their individual construction frequencies. The bifolium panel pools counts before calculating rates. Short pages have noisier estimates.';
 $('map-note').textContent=gradual
  ? 'Both panels use the same MDS of 50 equally weighted gradual profiles; page copies do not add independent observations. The abrupt component is excluded. Coordinates reflect the fitted Path 1 model, not an independent chronology test. Gray means no reviewed Golf assignment.'
  : 'The bifolium panel pools counts; it does not average page coordinates. Each map has arbitrary axes and its own scale. Pages use their reviewed Golf assignments; bifolia use their existing Path 1 labels. Gray means unassigned.';
 $('inspect-heading').textContent=gradual?'CHECK THE GRADUAL ESTIMATES':'CHECK THE OBSERVED COUNTS';
 $('distance-note').textContent=metric()==='js'
  ? 'Jensen–Shannon compares the presence/absence rate of each construction. All 544 features contribute equally; related overlapping features can contribute together.'
  : 'Euclidean distance compares the frequency differences directly. Larger absolute rate differences have more influence; no feature is standardized by its variance.';
 $('figure-link').href=`figures/page_feature_mds_${gradual?'gradual_':''}${metric()}.png`;
 $('data-link').href=gradual?'page-mds-gradual-data.json.gz?v=be3ea217e2':'page-mds-data.json.gz?v=e2cd4ffa34';
 for(const u of ['pages','bifolia'])drawPageMap(u);
 inspectPage();
}
function binaryEntropy(v){return v<=0||v>=1?0:-v*Math.log2(v)-(1-v)*Math.log2(1-v);}
function inspectPage(){
 const u=selection.unit,p=part(u),i=selection.index,r=p.items[i],map=mapping(u);
 $('page-selection').textContent=r.id;
 $('page-meta').textContent=`Golf ${r.group} · ${r.N.toLocaleString()} word tokens · ${u==='pages'?'bifolium '+r.bifolium:r.members.length+' pages'} · ${r.support||'No reviewed assignment'}`;
 const node=pm.bifolia.items[r.node];
 $('allocation-note').textContent=isGradual()?(u==='pages'
  ? `${r.id} receives ${pct(r.N/node.N)} of ${node.id}’s expected feature counts (${r.N} of ${node.N} tokens). Its fitted rates are identical to the other pages in that bifolium.`
  : 'Expected counts use the saved gradual carrier rates multiplied by this bifolium’s token total; abrupt step effects are omitted.') : '';
 $('page-search').value=u==='pages'?r.id:'';
 $('member-pages').innerHTML=u==='bifolia'||isGradual()?node.members.map(id=>`<button data-page="${esc(id)}" aria-pressed="${id===r.id}">${esc(id)}</button>`).join(''):'';
 $('page-neighbors').innerHTML=map.neighbors[i].slice(0,5).map((j,k)=>`<button data-compare="${j}" aria-pressed="${j===comparison}"><strong>${esc(p.items[j].id)}</strong><small>Golf ${esc(p.items[j].group)} · ${p.items[j].N} tokens</small><small>Distance ${distanceText(map.neighbor_distances[i][k])}</small></button>`).join('');
 const other=p.items[comparison],a=profile(u,i),b=profile(u,comparison);
 const contributions=a.map((v,j)=>metric()==='js'?Math.max(0,binaryEntropy((v+b[j])/2)-(binaryEntropy(v)+binaryEntropy(b[j]))/2):(v-b[j])**2);
 const total=sum(contributions),ids=[...a.keys()].sort((j,k)=>contributions[k]-contributions[j]).slice(0,10);
 $('difference-title').textContent=`What separates ${r.id} and ${other.id}?`;
 $('difference-bars').innerHTML=total<1e-16?'<p>The selected construction profiles are identical.</p>':ids.map(j=>{const share=contributions[j]/total;return `<div class="distance-row"><a href="components.html?path=1&component=${encodeURIComponent(pm.features[j].name)}">${esc(pm.features[j].name)}</a><div class="distance-track"><span style="width:${100*contributions[j]/contributions[ids[0]]}%"></span></div><span>${pct(share)}</span><span class="distance-values">${fmt(a[j]*1e4)} → ${fmt(b[j]*1e4)} per 10k</span></div>`;}).join('');
}
function persistPage(){const p=new URLSearchParams({unit:selection.unit,item:selectedItem().id,distance:metric(),source:isGradual()?'gradual':'observed'});history.replaceState(null,'',`?${p}${location.hash}`);}
function choose(unit,index){selection={unit,index};comparison=mapping(unit).neighbors[index][0];draw();persistPage();}
function findPage(){const id=$('page-search').value.trim(),index=pm.pages.items.findIndex(r=>r.id===id);if(index>=0)choose('pages',index);}
function showPageTooltip(e){const dot=e.target.closest('.page-dot'),box=$('map-tooltip');if(!dot){box.hidden=true;return;}const r=part(dot.dataset.unit).items[+dot.dataset.index];box.innerHTML=`<strong>${esc(r.id)}</strong><br>Golf ${esc(r.group)} · ${r.N} tokens<br>Bifolium ${esc(r.bifolium)}<br>${esc(r.support||'No reviewed assignment')}`;box.style.left=Math.max(5,Math.min(innerWidth-300,e.clientX+15))+'px';box.style.top=Math.max(5,Math.min(innerHeight-125,e.clientY+15))+'px';box.hidden=false;}
async function startPageMDS(){try{
 const sources=await Promise.all(['observed','gradual'].map(async source=>{
  const response=await fetch(source==='gradual'?'page-mds-gradual-data.json.gz?v=be3ea217e2':'page-mds-data.json.gz?v=e2cd4ffa34');if(!response.ok)throw Error(`Data request failed: ${response.status}`);
  return JSON.parse(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text());
 }));
 profileSources={observed:sources[0],gradual:sources[1]};
 $('profile-source').value=pageParams.get('source')==='gradual'?'gradual':'observed';
 pm=profileSources[$('profile-source').value];
 $('page-options').innerHTML=pm.pages.items.map(r=>`<option value="${esc(r.id)}">Golf ${esc(r.group)} · ${r.bifolium}</option>`).join('');
 $('page-legend').innerHTML=pm.group_order.map(g=>`<span style="--c:${pm.palette[g].color}" title="${esc(pm.palette[g].label)}">${esc(g)}</span>`).join('');
 if(pageParams.get('distance')==='rate')$('distance').value='rate';
 const u=pageParams.get('unit')==='bifolia'?'bifolia':'pages',id=pageParams.get('item')||'f1r';
 choose(u,Math.max(0,part(u).items.findIndex(r=>r.id===id)));
 $('profile-source').addEventListener('change',()=>{pm=profileSources[$('profile-source').value];choose(selection.unit,selection.index);});
 $('distance').addEventListener('change',()=>choose(selection.unit,selection.index));
 $('page-search').addEventListener('change',findPage);$('page-search').addEventListener('keydown',e=>{if(e.key==='Enter')findPage();});
 $('page-maps').addEventListener('click',e=>{const dot=e.target.closest('.page-dot');if(dot)choose(dot.dataset.unit,+dot.dataset.index);});
 $('page-maps').addEventListener('keydown',e=>{const dot=e.target.closest('.page-dot');if(dot&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose(dot.dataset.unit,+dot.dataset.index);}});
 $('page-maps').addEventListener('pointermove',showPageTooltip);$('page-maps').addEventListener('pointerleave',()=>$('map-tooltip').hidden=true);
 $('page-neighbors').addEventListener('click',e=>{const b=e.target.closest('[data-compare]');if(b){comparison=+b.dataset.compare;inspectPage();}});
 $('member-pages').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)choose('pages',pm.pages.items.findIndex(r=>r.id===b.dataset.page));});
}catch(error){$('status').textContent=error.message;$('status').className='error';}}
startPageMDS();
