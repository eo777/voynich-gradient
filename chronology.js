"use strict";
// Chronology: gradual movement per step with numbered peaks, the group and family timing matrices with the same marks, and peak detail.
const CH={peak:null,mode:null,familyMode:null};
function syncModes(){
 if(!(CH.mode in TIMING_MODES[PD.axis]))CH.mode=defaultTimingMode(PD.axis);
 if(!(CH.familyMode in FAMILY_MODES[PD.axis]))CH.familyMode=defaultFamilyMode(PD.axis);
 $('timing-mode').innerHTML=modeOptions(TIMING_MODES,PD.axis,CH.mode);$('family-mode').innerHTML=modeOptions(FAMILY_MODES,PD.axis,CH.familyMode);
}
function renderMovement(){
 const m=PD.model,c=m.chronology,bl=m.boundaryLabels,peaks=c.peaks;
 let chart=lineChart([series(c.movement,'Movement',INK.combined,{width:2.4,dots:true})],bl,{width:1100,height:250,nodes:m.nodes.slice(1),observationUnit:'bifolium',title:'Gradual vocabulary movement per step',unit:'total variation',markers:peaks});
 chart=numberedMarkers(chart,bl,peaks);
 $('movement-content').innerHTML=`<article class="panel"><div class="panel-heading"><h3>Total variation between consecutive gradual word distributions</h3>${legendHtml([series([],'Movement',INK.combined),series([],'Numbered peaks',INK.jump)])}</div><div class="chart">${chart}</div><p class="chart-note">0 means identical fitted distributions; 1 would mean no spelling probability shared. Each step is plotted at its destination bifolium. ${peaks.length} peaks detected on Path ${PD.path}.</p></article>`;
}
function renderTiming(){
 const m=PD.model,peaks=m.chronology.peaks,steps=renderGroupTiming($('group-matrix'),CH.mode);
 $('timing-caption').textContent=timingCaption(CH.mode)+(steps?' Select a marked column to open that peak below, or a group row to open its card on the Component groups page.':' Select a group row to open its card on the Component groups page.');
 bindHeatmap($('group-matrix'),(id,col)=>{if(steps&&col!=null&&peaks.includes(col)){CH.peak=col;renderPeak();$('peak').scrollIntoView({behavior:'smooth',block:'start'});}else location.href=`behavior.html?path=${PD.path}#group-${id}`;});
}
function renderFamilies(){
 const m=PD.model,peaks=m.chronology.peaks,steps=renderFamilyTiming($('family-matrix'),CH.familyMode);
 $('family-caption').textContent=familyCaption(CH.familyMode)+(steps?' Select a marked column to open that peak below, or a family row to open its card on the Families page.':' The numbered lines sit between the bifolia each peak separates. Select a family row to open its card on the Families page.');
 bindHeatmap($('family-matrix'),(id,col)=>{if(steps&&col!=null&&peaks.includes(col)){CH.peak=col;renderPeak();$('peak').scrollIntoView({behavior:'smooth',block:'start'});}else location.href=`partitions.html?path=${PD.path}#card-${id}`;});
}
function renderButtons(){
 const m=PD.model,c=m.chronology;
 $('peak-buttons').innerHTML=c.peaks.map((i,n)=>`<button data-peak="${i}" class="${i===CH.peak?'sel':''}">${n+1} · ${esc(m.nodes[i].id)} → ${esc(m.nodes[i+1].id)} · ${esc(m.nodes[i].group)}${m.nodes[i].group!==m.nodes[i+1].group?' → '+esc(m.nodes[i+1].group):''} · ${fmt(c.movement[i],2)}</button>`).join('');
 $('peak-buttons').querySelectorAll('[data-peak]').forEach(b=>b.addEventListener('click',()=>{CH.peak=Number(b.dataset.peak);renderPeak();}));
}
function renderPeak(){
 const m=PD.model,i=CH.peak,M=m.matrices,n=m.chronology.peaks.indexOf(i)+1;if(i==null)return;renderButtons();
 const mode=CH.mode==='union'?'union':'normalized',groups=m.groups.groups.map(gr=>({gr,v:groupTiming(gr,mode)[i]})).sort((a,b)=>b.v-a.v),max=Math.max(...groups.map(g=>Math.abs(g.v)),1e-9);
 const rows=m.active.slice().sort((a,b)=>Math.abs(M.gradual_change[b][i])-Math.abs(M.gradual_change[a][i])).slice(0,14);
 const leaves=m.partitions.leaves.map((l,k)=>({k,l,d:l.gradual[i+1]-l.gradual[i]})).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)).slice(0,8);
 $('peak-detail').innerHTML=`<div class="detail-title"><h3>Peak ${n} · ${esc(m.nodes[i].id)} → ${esc(m.nodes[i+1].id)}</h3><p>Golf ${esc(m.nodes[i].group)}${m.nodes[i].group!==m.nodes[i+1].group?' → '+esc(m.nodes[i+1].group):''} · movement ${fmt(m.chronology.movement[i],3)} · Path ${PD.path}</p></div><div class="feature-grid"><article class="panel"><h3>Component groups across this step</h3><div class="gbars">${groups.map(g=>`<a href="behavior.html?path=${PD.path}#group-${g.gr.id}">Group ${g.gr.id}</a><div class="track"><i style="left:${g.v>=0?50:50-50*Math.abs(g.v)/max}%;width:${50*Math.abs(g.v)/max}%;background:${g.v>=0?'#188374':'#c06630'}"></i></div><strong>${signed(g.v,mode==='union'?0:2)}</strong>`).join('')}</div><p class="chart-note">${mode==='union'?'Carrier-union gradual change per 10,000 words.':'Mean RMS-scaled gradual change of the group’s effects.'} Teal rises, orange falls; the same values as the group timing column.</p></article>
 <article class="panel"><h3>Exclusive families across this step</h3><div class="gbars">${(()=>{const fm=Math.max(...leaves.map(x=>Math.abs(x.d)),1e-9);return leaves.map(x=>`<a class="word-form" href="partitions.html?path=${PD.path}#card-${x.k}" title="${esc(x.l.rule)}">${esc(x.l.name)}</a><div class="track"><i style="left:${x.d>=0?50:50-50*Math.abs(x.d)/fm}%;width:${50*Math.abs(x.d)/fm}%;background:${x.d>=0?'#188374':'#c06630'}"></i></div><strong>${signed(x.d,0)}</strong>`).join('');})()}</div><p class="chart-note">Change of fitted family volume per 10,000 words, eight largest. Families are disjoint, so these do not double-count a word.</p></article>
 <article class="panel" style="grid-column:1/-1"><h3>Largest construction changes</h3><div class="table-wrap"><table class="row-list"><thead><tr><th>Construction</th><th class="num">Gradual /10k</th><th class="num">Jump /10k</th><th>Group</th><th>Carrier tokens by family</th></tr></thead><tbody>${rows.map(r=>`<tr><td><button class="chip" data-feature="${esc(feature(r).name)}">${esc(feature(r).name)}</button></td><td class="num">${signed(M.gradual_change[r][i],1)}</td><td class="num">${signed(M.jump_change[r][i],1)}</td><td>${m.groupOf.get(r)??'—'}</td><td class="muted" style="font-size:12px">${esc(topFamilies(r))}</td></tr>`).join('')}</tbody></table></div><p class="chart-note">Among effects with their own gradual curve. Select a construction to open its curves.</p></article></div>`;
 $('peak-detail').querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>{location.href=`components.html?path=${PD.path}&component=${encodeURIComponent(b.dataset.feature)}`;}));
 setQuery({path:PD.path,peak:i});
}
function topFamilies(i){
 const m=PD.model,f=feature(i);
 if(!m.leafOf){m.leafOf=new Int16Array(m.words.length).fill(-1);m.partitions.leaves.forEach((l,k)=>l.members.forEach(w=>{m.leafOf[w]=k;}));}
 const t=new Map();for(const w of f.members){const k=m.leafOf[w];t.set(k,(t.get(k)||0)+m.words[w].count);}
 return [...t].sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k,n])=>`${m.partitions.leaves[k].name} ${pct(n/f.tokens)}`).join(' · ');
}
async function startChronology(path){
 $('status').textContent='Loading the positional fit…';
 try{await loadPositional(path);const m=PD.model,peaks=m.chronology.peaks,q=Number(query().get('peak'));
  CH.peak=peaks.includes(q)?q:peaks.reduce((best,i)=>m.chronology.movement[i]>m.chronology.movement[best]?i:best,peaks[0]);
  syncModes();renderMovement();renderTiming();renderFamilies();renderPeak();$('status').textContent=modelStatus();}
 catch(e){$('status').textContent=`Could not load the positional fit: ${e.message}`;console.error(e);}
}
$('timing-mode').addEventListener('change',e=>{CH.mode=e.target.value;renderTiming();renderPeak();});
$('family-mode').addEventListener('change',e=>{CH.familyMode=e.target.value;renderFamilies();});
axisControl(()=>{if(PD.model){syncModes();renderTiming();renderFamilies();renderPeak();}});
startChronology(pathControl('path',startChronology));
