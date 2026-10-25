"use strict";
// Families: the exclusive partition tree, split inspection and leaf volumes.
const FM={split:'r'};
function collectLeaves(node,out=[]){if('leaf' in node)out.push(node.leaf);else{collectLeaves(node.yes,out);collectLeaves(node.no,out);}return out;}
function population(node){const m=PD.model,ids=[];for(const l of collectLeaves(node))ids.push(...m.partitions.leaves[l].members);return ids;}
function sums(ids){const m=PD.model,n=m.nodes.length,g=Array(n).fill(0),c=Array(n).fill(0);for(const i of ids){const wg=m.word_gradual[i],wc=m.word_counts[i];for(let t=0;t<n;t++){g[t]+=wg[t];c[t]+=wc[t];}}return {gradual:g,counts:c,observed:c.map((v,t)=>1e4*v/m.N[t])};}
function treeMarkup(node,path='r'){
 const m=PD.model;
 if('leaf' in node){const l=m.partitions.leaves[node.leaf];return `<div class="leaf" id="leaf-${node.leaf}"><strong>${esc(l.name)}</strong><span class="rule">${esc(l.rule)}</span><p>${l.tokens.toLocaleString()} tokens · ${l.types.toLocaleString()} spellings · ${l.hapaxes.toLocaleString()} hapaxes · <a href="#card-${node.leaf}">card</a></p></div>`;}
 const split=m.partitions.splits.find(s=>s.parent===node.label),tokens=sum(population(node).map(i=>m.words[i].count));
 return `<div class="branch"><div class="node">${esc(familyLabel(node.label))}<small>${tokens.toLocaleString()} tokens</small></div><p class="split">split by <button data-split="${path}" class="${FM.split===path?'sel':''}">${esc(feature(node.component).name)}</button>${split?` · share range ${fmt(100*(Math.max(...split.share)-Math.min(...split.share)),1)} pp · score ${fmt(split.score,3)}`:''}</p><div class="children">${treeMarkup(node.yes,path+'y')}${treeMarkup(node.no,path+'n')}</div></div>`;
}
function findNode(path){let n=PD.model.partitions.tree;for(const c of path.slice(1))n=c==='y'?n.yes:n.no;return n;}
function renderTree(){
 const m=PD.model,p=m.partitions;
 $('tree-summary').innerHTML=`<strong>${p.leaves.length} exclusive families from ${p.splits.length} splits.</strong> ${esc(p.note)} Select a split to inspect it.`;
 $('tree-content').innerHTML=treeMarkup(p.tree);
 $('tree-content').querySelectorAll('[data-split]').forEach(b=>b.addEventListener('click',()=>{FM.split=b.dataset.split;renderTree();renderSplit();$('split').scrollIntoView({behavior:'smooth',block:'start'});}));
}
function renderSplit(){
 const m=PD.model,node=findNode(FM.split),f=feature(node.component),split=m.partitions.splits.find(s=>s.parent===node.label),yes=sums(population(node.yes)),no=sums(population(node.no));
 const observedShare=yes.counts.map((v,t)=>v+no.counts[t]>0?v/(v+no.counts[t]):null),fittedShare=split?split.share:yes.gradual.map((v,t)=>v/(v+no.gradual[t]));
 $('split-content').innerHTML=`<div class="detail-title"><h3>${esc(f.name)} within ${esc(familyLabel(node.label))}</h3><p>${esc(describeFeature(f))}. Fitted share ${pct(fittedShare[0])} at ${esc(m.nodes[0].id)} → ${pct(fittedShare.at(-1))} at ${esc(m.nodes.at(-1).id)}; range ${fmt(100*(Math.max(...fittedShare)-Math.min(...fittedShare)),1)} percentage points. <a href="components.html?path=${PD.path}&component=${encodeURIComponent(f.name)}">Construction curves</a></p></div><div class="feature-grid">${chartPanel(`Share of ${f.name} within the parent population`,[series(fittedShare,'Fitted share',SERIES[0],{width:2.6}),series(observedShare,'Observed share',INK.observed,{dots:true,width:0.8,dash:true})],m.labels,{percent:true,unit:'share'},'Fitted share = gradual volume of the “+” branch divided by the parent’s gradual volume. Observed share uses raw counts and is empty where the parent has no tokens.')}${chartPanel('Volume on each side',[series(yes.gradual,`with ${f.name}`,SERIES[0],{width:2.4}),series(no.gradual,`without ${f.name}`,SERIES[1],{width:2.4}),series(yes.observed,'with · observed',SERIES[0],{dots:true,width:0.6,dash:true}),series(no.observed,'without · observed',SERIES[1],{dots:true,width:0.6,dash:true})],m.labels,{unit:'per 10,000'},'Per 10,000 words. The two sides are disjoint populations and sum to the parent.')}</div>`;
}
function renderLeaves(){
 const m=PD.model,leaves=m.partitions.leaves,normalized=$('leaf-scale').value==='normalized',pal=[...SERIES,'#a26436','#5b8790','#967d21','#6d4f8f','#2f7f5f','#b0653f','#4a6fa5','#8c5f73'];
 const curves=leaves.map((l,k)=>series(l.gradual.map(v=>normalized?v/Math.max(...l.gradual):v),l.name,pal[k%pal.length],{width:1.8}));
 $('leaf-overview').innerHTML=chartPanel(normalized?'Exclusive families · each relative to its own maximum':'Exclusive families · fitted gradual volume, stacked',curves,m.labels,{width:1100,height:normalized?330:420,percent:normalized,stacked:!normalized,unit:normalized?'share of own maximum':'per 10,000'},normalized?'Each curve divided by its own maximum, to compare timing; use the per-10,000 mode to compare volume.':'Per 10,000 words. The sixteen bands sum to 10,000 at every bifolium; no word is counted twice. Bands stack in the order of the cards below; hover a band for its range.');
 $('leaf-overview').querySelector('.legend').classList.toggle('swatches',!normalized);
 $('leaf-cards').innerHTML=leaves.map((l,k)=>{const words=rankByCount(l.members);return `<article class="event-card" id="card-${k}" style="border-left-color:${pal[k%pal.length]}"><h3 class="word-form">${esc(l.name)}</h3><p class="rule">${esc(l.rule)}</p><div class="tags"><span>${l.tokens.toLocaleString()} tokens</span><span>${l.types.toLocaleString()} spellings</span><span>${l.hapaxes.toLocaleString()} hapaxes</span></div><div class="chart">${lineChart([series(l.observed,'Observed',INK.muted,{dots:true,width:1}),series(l.gradual,'Fitted gradual',pal[k%pal.length],{width:2.6})],m.labels,{width:600,height:180,nodes:m.nodes,observationUnit:'bifolium',title:l.label,unit:'per 10,000'})}</div><p>${wordButtons(words,10)}</p><p class="chart-note">${l.template==='*'?'Defined by exclusions only; the template * stands for any word.':`Template ${esc(l.template)} matches ${pct(l.match)} of the family's tokens.`} Largest word ${esc(m.words[words[0]].word)}, ${pct(m.words[words[0]].count/l.tokens)}.</p></article>`;}).join('');
 $('leaf-cards').querySelectorAll('[data-word]').forEach(b=>b.addEventListener('click',()=>{location.href=`behavior.html?path=${PD.path}&word=${encodeURIComponent(b.dataset.word)}#word-detail`;}));
}
async function startFamilies(path){
 $('status').textContent='Loading the positional fit…';
 try{await loadPositional(path);renderTree();renderSplit();renderLeaves();$('status').textContent=modelStatus();
  const anchor=location.hash&&document.querySelector(location.hash);if(anchor)anchor.scrollIntoView();}
 catch(e){$('status').textContent=`Could not load the positional fit: ${e.message}`;console.error(e);}
}
$('leaf-scale').addEventListener('change',renderLeaves);
startFamilies(pathControl('path',startFamilies));
