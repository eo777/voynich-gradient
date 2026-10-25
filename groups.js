"use strict";
// Component groups: Ward groups of gradual slopes, overlap cohorts, pairwise map, construction and word lookups.
const GP={a:-1,b:-1,sets:null,mode:null};
const memberSet=i=>{if(!GP.sets[i])GP.sets[i]=new Set(feature(i).members);return GP.sets[i];};
function renderGroups(){
 const m=PD.model,g=m.groups;
 $('group-summary').innerHTML=`<strong>${g.groups.length} groups of the ${m.active.length} effects with their own gradual curve.</strong> ${esc(g.normalization)} Each group's volume is the union of its carrier words, counted once.`;
 if(!(GP.mode in TIMING_MODES[PD.axis]))GP.mode=defaultTimingMode(PD.axis);
 $('group-matrix').innerHTML=`<div class="toolbar"><label>Group timing · values<select id="group-timing-mode">${modeOptions(TIMING_MODES,PD.axis,GP.mode)}</select></label></div><div id="group-timing"></div><p id="group-timing-caption" class="chart-note"></p>`;
 const draw=()=>{const steps=renderGroupTiming($('group-timing'),GP.mode);$('group-timing-caption').textContent=`${timingCaption(GP.mode)} Teal rises or above, orange falls or below; the numbered lines are the movement peaks of the Chronology page${steps?'':', placed between the bifolia they separate'}. The Columns control above switches every timing matrix between bifolia and steps. Select a group row to jump to its card.`;
  bindHeatmap($('group-timing'),id=>{document.getElementById('group-'+id)?.scrollIntoView({behavior:'smooth',block:'start'});});};
 $('group-timing-mode').addEventListener('change',e=>{GP.mode=e.target.value;draw();});draw();
 $('group-cards').innerHTML=g.groups.map(gr=>{const words=rankByCount(gr.members),rare=words.filter(i=>m.words[i].count<=4);
  return `<article class="event-card group-card" id="group-${gr.id}"><h3>Group ${gr.id} · ${gr.components.length} effects · ${gr.tokens.toLocaleString()} union tokens</h3><p>${componentChips(gr.components,14)}</p>${gr.components.length>14?`<details class="data-details"><summary>All ${gr.components.length} effects</summary><p>${componentChips(gr.components)}</p></details>`:''}<div class="tags"><span>${words.length.toLocaleString()} carrier spellings</span><span>${rare.length.toLocaleString()} rare spellings</span></div><div class="feature-grid">${chartPanel('Carrier-word union · per 10,000',[series(gr.observed,'Observed union',INK.muted,{dots:true,width:1}),series(gr.gradual,'Fitted gradual union',INK.gradual,{width:3})],m.labels,{unit:'per 10,000'},'Every word carrying at least one effect of the group, counted once. Fitted values sum the joint model’s word probabilities.')}${PD.axis==='steps'?chartPanel('Mean gradual change per step · effects scaled by their own RMS',[series(groupTiming(gr,'normalized'),'Mean scaled change per step',INK.combined,{width:2.4,dots:true})],m.boundaryLabels,{unit:'row-RMS units',zero:true,markers:m.chronology.peaks},'The group’s row of the timing matrix; dashed lines are the Chronology peaks. Jumps are excluded.'):chartPanel('Mean unit-norm gradual slope at each bifolium',[series(gr.normalized_slope,'Mean unit-norm slope',INK.combined,{width:2.4})],m.labels,{unit:'unit-norm slope',zero:true,markers:m.chronology.peaks.map(i=>i+.5)},'The shape that defines the group, per unit of path distance; dashed lines are the Chronology peaks, between the bifolia they separate. Jumps are excluded.')}</div><p><strong>Carrier examples:</strong> ${wordButtons(words,8)}</p><p><strong>Rare examples:</strong> ${wordButtons(rare,8)||'none'}</p></article>`;}).join('');
}
function cohorts(a,b){
 const m=PD.model,A=memberSet(a),B=memberSet(b),n=m.nodes.length,rate=[0,1,2,3].map(()=>Array(n).fill(0)),count=[0,1,2,3].map(()=>Array(n).fill(0));
 m.words.forEach((w,i)=>{const c=2*A.has(i)+B.has(i);if(!c&&!m.word_counts[i].some(v=>v))return;const g=m.word_gradual[i],k=m.word_counts[i];for(let t=0;t<n;t++){rate[c][t]+=g[t];count[c][t]+=k[t];}});
 return {rate,count:count.map(r=>r.map((v,t)=>1e4*v/m.N[t])),raw:count};
}
function renderPair(){
 const m=PD.model,a=featureIndex($('pair-a').value),b=featureIndex($('pair-b').value);
 if(a<0||b<0){$('pair-detail').innerHTML='<p class="note-box">Choose two construction names from the suggestions.</p>';return;}
 GP.a=a;GP.b=b;const A=feature(a),B=feature(b),c=cohorts(a,b),labels=m.labels,SA=memberSet(a),SB=memberSet(b);
 const joint=rankByCount([...SA].filter(i=>SB.has(i))),tot=c.raw.map(r=>sum(r)),nested=a===b||![...SA].some(i=>!SB.has(i))||![...SB].some(i=>!SA.has(i));
 const ratio=(x,y)=>x.map((v,t)=>v+y[t]>1e-9?v/(v+y[t]):null);
 const shareWith=ratio(c.rate[3],c.rate[1]),shareWithout=ratio(c.rate[3].map(()=>0).map((_,t)=>c.rate[2][t]),c.rate[0]),obsWith=ratio(c.raw[3],c.raw[1]),obsWithout=ratio(c.raw[2],c.raw[0]);
 const odds=m.nodes.map((_,t)=>nested?null:Math.log2(Math.max(c.rate[3][t]*c.rate[0][t],1e-9)/Math.max(c.rate[1][t]*c.rate[2][t],1e-9)));
 const obsOdds=m.nodes.map((_,t)=>nested||!(c.raw[3][t]&&c.raw[0][t]&&c.raw[1][t]&&c.raw[2][t])?null:Math.log2(c.raw[3][t]*c.raw[0][t]/(c.raw[1][t]*c.raw[2][t])));
 let html=nested?`<p class="warn-box">${a===b?'These names select the same population.':'One population is nested in the other, so there is no “A without B” or “B without A” cohort to compare; the shares below are the nested share.'}</p>`:'';
 html+=`<div class="feature-grid"><article class="panel"><h3>${esc(A.name)} + ${esc(B.name)} in actual words</h3><div class="tags"><span>${joint.length.toLocaleString()} shared spellings</span><span>${tot[3].toLocaleString()} shared tokens</span><span>${joint.filter(i=>m.words[i].count===1).length} hapaxes</span></div><p class="scope">Both: ${tot[3].toLocaleString()} tokens · A only: ${tot[2].toLocaleString()} · B only: ${tot[1].toLocaleString()} · neither: ${tot[0].toLocaleString()}.</p><p>${wordButtons(joint,12)||'No word carries both.'}</p><h4>Rare shared forms</h4><p>${wordButtons(joint.filter(i=>m.words[i].count<=4),12)||'None'}</p>${joint.length?`<p class="chart-note">Largest shared word: <strong>${esc(m.words[joint[0]].word)}</strong>, ${pct(m.words[joint[0]].count/Math.max(tot[3],1))} of the shared tokens.</p>`:''}</article>
 ${chartPanel('The shared and exclusive cohorts · fitted gradual volume',[series(c.rate[3],'Both',SERIES[2],{width:2.6}),series(c.rate[2],`${A.name} only`,SERIES[0]),series(c.rate[1],`${B.name} only`,SERIES[1]),series(c.count[3],'Both · observed',SERIES[2],{dots:true,width:0.6,dash:true})],labels,{unit:'per 10,000'},'Per 10,000 words. The three cohorts are disjoint, so unlike construction totals they never count a token twice.')}</div>`;
 if(!nested)html+=`<div class="feature-grid" style="margin-top:18px">${chartPanel(`Share of ${A.name} among words with and without ${B.name}`,[series(shareWith,`with ${B.name}`,SERIES[2],{width:2.4}),series(shareWithout,`without ${B.name}`,SERIES[0],{width:2.4}),series(obsWith,'with · observed',SERIES[2],{dots:true,width:0.6,dash:true}),series(obsWithout,'without · observed',SERIES[0],{dots:true,width:0.6,dash:true})],labels,{percent:true,unit:'share'},'Parallel curves suggest the two effects stack; diverging shares suggest the response depends on context. Neither establishes independence or causation.')}${chartPanel('Fitted association of the two constructions',[series(odds,'log₂ odds ratio · fitted',INK.jump,{width:2.4}),series(obsOdds,'log₂ odds ratio · observed',INK.jump,{dots:true,width:0.6,dash:true})],labels,{unit:'log₂ odds ratio',zero:true},'Zero means the two constructions combine as if independent at that position. Observed points appear only where all four cohorts have tokens.')}</div>`;
 $('pair-detail').innerHTML=html;renderMap();
}
function pairValue(a,b,mode){
 const m=PD.model;if(mode==='overlap'){const A=memberSet(a),B=memberSet(b);let n=0;for(const i of A)if(B.has(i))n++;return n/(A.size+B.size-n);}
 const x=m.matrices.gradual_change[a],y=m.matrices.gradual_change[b];let xy=0,xx=0,yy=0;for(let i=0;i<x.length;i++){xy+=x[i]*y[i];xx+=x[i]**2;yy+=y[i]**2;}return xx*yy>1e-18?xy/Math.sqrt(xx*yy):null;
}
function renderMap(){
 if(GP.a<0)return;const m=PD.model,mode=$('map-mode').value,scope=$('map-scope').value;
 let ids=scope==='focus'?m.active.filter(i=>i!==GP.a).sort((p,q)=>Math.abs(pairValue(GP.a,q,mode)??0)-Math.abs(pairValue(GP.a,p,mode)??0)).slice(0,22):m.active.slice().sort((p,q)=>feature(q).tokens-feature(p).tokens).slice(0,22);
 ids=[...new Set([...ids,GP.a,GP.b])];ids.sort((p,q)=>(m.groupOf.get(p)??99)-(m.groupOf.get(q)??99)||feature(q).tokens-feature(p).tokens);
 const left=150,top=130,cell=30,W=left+cell*ids.length+25,H=top+cell*ids.length+25;
 let svg=`<h3>${mode==='motion'?'Which gradual changes move together?':'Which constructions select the same words?'}</h3><p class="chart-note">${mode==='motion'?'Cosine similarity of the two step-change curves. Teal moves together; orange moves oppositely. Shared or nested words can produce similarity without a separate coordinated change.':'Jaccard overlap of the two carrier-word populations. This measures literal membership, not a transformation.'} Rows and columns are ordered by Ward group.</p><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pairwise construction matrix">`;
 ids.forEach((a,i)=>{svg+=`<text x="${left-8}" y="${top+i*cell+19}" text-anchor="end" class="golf-label">${esc(feature(a).name)}</text><text transform="translate(${left+i*cell+18},${top-10}) rotate(-55)" class="golf-label">${esc(feature(a).name)}</text>`;});
 ids.forEach((a,i)=>ids.forEach((b,j)=>{const v=a===b?null:pairValue(a,b,mode);svg+=`<rect x="${left+j*cell}" y="${top+i*cell}" width="${cell-1}" height="${cell-1}" fill="${a===b?'#e3e6e4':finite(v)?heatColor(v,1,mode==='motion'):'#e9eceb'}" data-pair="${a},${b}" tabindex="0" role="button" aria-label="${esc(feature(a).name)} and ${esc(feature(b).name)}"><title>${esc(feature(a).name)} + ${esc(feature(b).name)}: ${finite(v)?fmt(v,3):'—'}</title></rect>`;}));
 $('map-chart').innerHTML=svg+'</svg>';
}
function renderComponent(){
 const m=PD.model,i=featureIndex($('component-name').value);if(i<0){$('component-content').innerHTML='<p class="note-box">Choose a construction from the suggestions.</p>';return;}
 const f=feature(i),M=m.matrices,words=rankByCount(f.members),rare=words.filter(w=>m.words[w].count<=4);
 $('component-content').innerHTML=`<div class="tags"><span>${f.tokens.toLocaleString()} containing tokens</span><span>${words.length.toLocaleString()} spellings</span><span>${rare.length.toLocaleString()} rare spellings</span><span>${m.groupOf.has(i)?`Ward group ${m.groupOf.get(i)}`:'no own gradual curve'}</span><span>${esc(kindLabel(f))}</span></div><p class="scope">${esc(describeFeature(f))}. <a href="components.html?path=${PD.path}&component=${encodeURIComponent(f.name)}">Full curves, residual and drivers</a> · <button class="text-button" data-use-a="${esc(f.name)}">Use as construction A</button></p><div class="feature-grid">${chartPanel(`${f.name} · carrier rate`,[series(M.observed[i],'Observed',INK.observed,{dots:true,width:1}),series(M.gradual[i],'Gradual level',INK.gradual,{width:2.4}),series(M.combined[i],'Gradual + jumps',INK.combined,{dash:true})],m.labels,{unit:'per 10,000'})}${chartPanel(`${f.name} · change at each step`,[series(M.gradual_change[i],'Gradual change',INK.gradual,{dots:true}),series(M.jump_change[i],'Signed jump',INK.jump,{dots:true})],m.boundaryLabels,{unit:'per 10,000 per step'})}<article class="panel"><h3>Words selected by this construction</h3><p>${wordButtons(words,14)}</p><h4>Rare and hapax carriers</h4><p>${wordButtons(rare,20)||'None'}</p><details class="data-details"><summary>All ${words.length} carrier spellings</summary><p>${wordButtons(words)}</p></details></article><article class="panel"><h3>Effects sharing the most words</h3><p>${componentChips(m.active.filter(j=>j!==i).map(j=>[j,pairValue(i,j,'overlap')]).sort((p,q)=>q[1]-p[1]).slice(0,14).map(p=>p[0]))}</p><p class="chart-note">Ranked by Jaccard overlap of carrier words among effects with their own curve. Select one to compare it with ${esc(f.name)} above.</p></article></div>`;
}
function renderWord(){
 const m=PD.model,name=$('word-name').value.trim(),i=m.wordIndex.get(name);if(i==null){$('word-content').innerHTML='<p class="note-box">That spelling is not in the corpus.</p>';return;}
 const w=m.words[i],obs=m.word_counts[i].map((v,t)=>1e4*v/m.N[t]),byGroup=new Map();
 for(const c of w.components){const g=feature(c).active?m.groupOf.get(c):0;if(!byGroup.has(g))byGroup.set(g,[]);byGroup.get(g).push(c);}
 const groups=[...byGroup.keys()].sort((a,b)=>a-b);
 $('word-content').innerHTML=`<div class="tags"><span>${w.count} observed token${w.count===1?'':'s'}</span><span>${w.components.length} construction memberships</span><span>${w.components.filter(c=>feature(c).active).length} with their own gradual curve</span></div><div class="feature-grid">${chartPanel(`${name} · observed and fitted rate`,[series(obs,'Observed',INK.observed,{dots:true,width:1}),series(m.word_gradual[i],'Fitted gradual',INK.gradual,{width:2.4}),series(m.word_combined[i],'Gradual + jumps',INK.combined,{dash:true})],m.labels,{unit:'per 10,000'},'The fitted curve is this spelling’s probability in the joint model, per 10,000 words. It is composed from the effects below; the word has no independent trajectory.')}<article class="panel"><h3>Constructions this word carries, by group</h3>${groups.map(g=>`<p><strong>${g?`Group ${g}`:'No own gradual curve'}:</strong> ${componentChips(byGroup.get(g))}</p>`).join('')}<p class="chart-note">Dashed chips are eligible constructions whose own gradual term is zero in this fit.</p></article></div>`;
 setQuery({path:PD.path,word:name});
}
async function startGroups(path){
 $('status').textContent='Loading the positional fit…';
 try{await loadPositional(path);const m=PD.model;GP.sets=Array(m.features.length).fill(null);
  $('component-names').innerHTML=datalistOptions();$('word-names').innerHTML=m.words.map(w=>`<option value="${esc(w.word)}">`).join('');
  const q=query();if(q.get('component')&&featureIndex(q.get('component'))>=0)$('component-name').value=feature(featureIndex(q.get('component'))).name;if(q.get('word'))$('word-name').value=q.get('word');
  if(featureIndex($('pair-a').value)<0)$('pair-a').value=feature(m.active[0]).name;if(featureIndex($('pair-b').value)<0)$('pair-b').value=feature(m.active[1]).name;
  renderGroups();renderPair();renderComponent();renderWord();$('status').textContent=modelStatus();
  const anchor=location.hash&&document.querySelector(location.hash);if(anchor)anchor.scrollIntoView();
 }catch(e){$('status').textContent=`Could not load the positional fit: ${e.message}`;console.error(e);}
}
$('pair-form').addEventListener('submit',e=>{e.preventDefault();renderPair();});$('component-form').addEventListener('submit',e=>{e.preventDefault();renderComponent();});$('word-form').addEventListener('submit',e=>{e.preventDefault();renderWord();});
['map-mode','map-scope'].forEach(id=>$(id).addEventListener('change',renderMap));
document.addEventListener('click',e=>{
 const f=e.target.closest('[data-feature]'),w=e.target.closest('[data-word]'),p=e.target.closest('[data-pair]'),a=e.target.closest('[data-use-a]');
 if(f){$('component-name').value=f.dataset.feature;renderComponent();$('component-detail').scrollIntoView({behavior:'smooth'});}
 if(w){$('word-name').value=w.dataset.word;renderWord();$('word-detail').scrollIntoView({behavior:'smooth'});}
 if(p){const [x,y]=p.dataset.pair.split(',').map(Number);$('pair-a').value=feature(x).name;$('pair-b').value=feature(y).name;renderPair();$('overlap').scrollIntoView({behavior:'smooth'});}
 if(a){$('pair-a').value=a.dataset.useA;renderPair();$('overlap').scrollIntoView({behavior:'smooth'});}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-pair]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
axisControl(()=>{if(PD.model){GP.mode=null;renderGroups();}});
startGroups(pathControl('path',startGroups));
