"use strict";
// Gradient matrix: every positional effect's fitted change per step, one heatmap row each.
const MX={field:'gradual_change',order:'ward',scope:'active',kind:'all',minTokens:100,search:'',normalize:false,feature:-1,node:null};
const FIELDS={gradual_change:['Gradual change per step','per 10,000 words per step',true],jump_change:['Signed jump per step','per 10,000 words per step',true],slope:['Gradual rate slope','per 10,000 per path unit',true],
 coefficient:['Own log-weight coefficient','log weight',true],coefficient_slope:['Own coefficient slope','log weight per path unit',true],gradual:['Gradual level','per 10,000 words',false],combined:['Gradual + jumps level','per 10,000 words',false],observed:['Observed rate','per 10,000 words',false],residual:['Observed minus gradual + jumps','per 10,000 words',true]};
function kindOk(f){
 if(MX.kind==='all')return true;
 if(MX.kind==='edge')return f.kind==='prefix'||f.kind==='suffix'||(f.kind==='position'&&!f.name.startsWith('interior:'));
 if(MX.kind==='interior')return f.kind==='position'&&f.name.startsWith('interior:');
 if(MX.kind==='anywhere')return f.kind==='pattern';
 if(MX.kind==='pair')return f.source==='ordered_pair';
 return f.kind==='interaction'&&f.source!=='ordered_pair';
}
function rowOrder(){
 const m=PD.model,s=MX.search.toLowerCase().replaceAll(' ','');
 let ids=MX.scope==='active'?m.active.slice():m.features.map((_,i)=>i);
 ids=ids.filter(i=>{const f=m.features[i];return f.tokens>=MX.minTokens&&kindOk(f)&&(!s||f.name.toLowerCase().replaceAll(' ','').includes(s)||f.aliases.some(a=>a.name.toLowerCase().includes(s)));});
 if(MX.order==='ward'){const rank=new Map(m.groups.order.map((i,k)=>[i,k]));ids.sort((a,b)=>(rank.has(a)?rank.get(a):1e6+m.features.length-m.features[a].tokens)-(rank.has(b)?rank.get(b):1e6+m.features.length-m.features[b].tokens));}
 else if(MX.order==='timing')ids.sort((a,b)=>m.summary[a].timing-m.summary[b].timing||m.summary[b].movement-m.summary[a].movement);
 else if(MX.order==='movement')ids.sort((a,b)=>m.summary[b].movement-m.summary[a].movement);
 else ids.sort((a,b)=>m.features[b].tokens-m.features[a].tokens);
 return ids;
}
function renderMatrix(){
 const m=PD.model,host=$('matrix-content');
 host.innerHTML=`<div class="toolbar">
  <label>Quantity<select id="mx-field">${Object.entries(FIELDS).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('')}</select></label>
  <label>Row order<select id="mx-order"><option value="ward">Ward · similar movement shapes</option><option value="timing">Movement timing · early to late</option><option value="movement">Total gradual movement</option><option value="tokens">Token support</option></select></label>
  <label>Rows<select id="mx-scope"><option value="active">Effects with their own gradual curve</option><option value="all">All eligible carrier populations</option></select></label>
  <label>Construction type<select id="mx-kind"><option value="all">All types</option><option value="edge">Word start or end</option><option value="interior">Interior spans</option><option value="anywhere">Anywhere in the word</option><option value="pair">Ordered pairs of spans</option><option value="co">Co-occurring patterns</option></select></label>
  <label>Minimum containing tokens<select id="mx-min">${[15,30,50,100,250,500,1000].map(v=>`<option value="${v}">${v}</option>`).join('')}</select></label>
  <label>Find<input id="mx-search" value="${esc(MX.search)}" placeholder="e.g. qok, suffix:edy" aria-label="Find a construction"></label>
  <label class="check"><input id="mx-norm" type="checkbox">Scale each row by its own RMS</label></div>
  <p id="mx-note" class="chart-note"></p><div id="mx-heat"></div><p id="mx-caption" class="chart-note"></p>`;
 $('mx-field').value=MX.field;$('mx-order').value=MX.order;$('mx-scope').value=MX.scope;$('mx-kind').value=MX.kind;$('mx-min').value=MX.minTokens;$('mx-norm').checked=MX.normalize;
 const bind=(id,key,parse=v=>v)=>$(id).addEventListener('change',e=>{MX[key]=parse(e.target.value);drawMatrix();});
 $('mx-field').addEventListener('change',e=>{MX.field=e.target.value;const axis=MX.field.endsWith('_change')?'steps':'bifolia';if(axis!==PD.axis){setAxisMode(axis);const sel=$('axis');if(sel)sel.value=axis;}drawMatrix();});bind('mx-order','order');bind('mx-scope','scope');bind('mx-kind','kind');bind('mx-min','minTokens',Number);
 $('mx-norm').addEventListener('change',e=>{MX.normalize=e.target.checked;drawMatrix();});
 let timer=null;$('mx-search').addEventListener('input',e=>{clearTimeout(timer);MX.search=e.target.value.trim();timer=setTimeout(drawMatrix,180);});
 drawMatrix();
}
function drawMatrix(){
 const m=PD.model,ids=rowOrder(),[title,unit,isSigned]=FIELDS[MX.field],M=m.matrices[MX.field],perStep=MX.field.endsWith('_change'),columns=perStep?m.nodes.slice(1):m.nodes;
 const rows=ids.map(i=>{const f=m.features[i],raw=M[i],scale=MX.normalize?Math.max(rms(raw),1e-9):1,values=raw.map(v=>v/scale);
  return {id:f.name,label:f.name,sub:f.active?'':'shared',values,tip:k=>{const n=columns[k],obs=m.matrices.observed[i][perStep?k+1:k],cnt=m.matrices.counts[i][perStep?k+1:k];
   return `${f.name} · ${n.id} · Golf ${n.group}\n${describeFeature(f)}\n${title}: ${fmt(raw[k],3)} ${unit}${MX.normalize?` (shown ÷ row RMS ${fmt(scale,3)})`:''}\n${perStep?`gradual ${fmt(m.matrices.gradual_change[i][k],3)} + jump ${fmt(m.matrices.jump_change[i][k],3)} since ${m.nodes[k].id}\n`:''}observed ${cnt} / ${n.N} words = ${fmt(obs,1)} per 10,000`;}};});
 $('mx-note').innerHTML=`<b>${rows.length} rows × ${columns.length} ${perStep?'steps':'bifolia'} · Path ${PD.path}.</b> ${MX.scope==='active'?`Of the ${m.features.length.toLocaleString()} eligible constructions, ${m.active.length} received their own gradual curve; the rest are shown as shared populations under “All eligible”.`:'Rows marked “shared” have no own gradual curve; their movement comes from overlapping effects and normalization.'} ${perStep?'Each column is the change from the preceding bifolium, plotted at the destination.':''} ${MX.order==='ward'?'Ward order groups similar normalized gradual slopes; shared populations follow by token support.':MX.order==='timing'?'Rows run early to late by the midpoint of their cumulative absolute gradual change.':''}`;
 $('mx-heat').innerHTML=rows.length?heatmap(rows,columns,{signed:isSigned,selected:MX.feature>=0?m.features[MX.feature].name:null,unit:MX.normalize?'row RMS units':''}):'<p class="empty">No rows match these filters. Lower the token minimum or clear the search.</p>';
 $('mx-caption').textContent=`${title}, ${unit}. One colour scale for all displayed rows, saturating at the 95th percentile of absolute values; hover a cell for the exact value, the paired gradual/jump split and the raw page counts. Columns stay in path order.`;
 bindHeatmap($('mx-heat'),(name,col)=>{MX.feature=featureIndex(name);MX.node=col==null?null:(perStep?col+1:col);renderDetail();drawMatrix();$('detail').scrollIntoView({behavior:'smooth',block:'start'});});
}
function renderDetail(){
 const m=PD.model,i=MX.feature;if(i<0){$('matrix-detail').innerHTML='<p class="empty">Select a row in the matrix.</p>';return;}
 const f=m.features[i],M=m.matrices,s=m.summary[i],labels=m.labels,bl=m.boundaryLabels;
 setQuery({path:PD.path,component:f.name});
 let html=`<div class="detail-title"><h3>${esc(f.name)}<span class="kind">${esc(kindLabel(f))}</span></h3><p>${esc(describeFeature(f))} · ${f.tokens.toLocaleString()} containing tokens in ${f.members.length.toLocaleString()} spellings · ${activeText(f)}${f.aliases.length?` · same carrier population as ${esc(f.aliases.map(a=>a.name).join(', '))}`:''}${m.groupOf.has(i)?` · Ward group ${m.groupOf.get(i)}`:''}</p><p class="scope"><a href="components.html?path=${PD.path}&component=${encodeURIComponent(f.name)}">Full component view: residual, own effect, contributions and carrier words</a></p></div>`;
 html+=`<div class="feature-grid">${chartPanel(`${f.name} · carrier rate`,[series(M.observed[i],'Observed',INK.observed,{dots:true,width:1}),series(M.gradual[i],'Gradual level',INK.gradual,{width:2.4}),series(M.combined[i],'Gradual + jumps',INK.combined,{dash:true})],labels,{unit:'per 10,000'},'Per 10,000 words in each bifolium. The gap between the blue and green curves is the fitted jump level at that point.')}
 ${chartPanel(`${f.name} · change at each step`,[series(M.gradual_change[i],'Gradual change',INK.gradual,{dots:true}),series(M.jump_change[i],'Signed jump',INK.jump,{dots:true})],bl,{unit:'per 10,000 per step'},'Exactly the heatmap values: this bifolium minus the preceding one. Gradual change + signed jump = combined change. A jump is a local level difference the smooth curve did not follow, mostly bifolium-specific variation, not a slope.')}</div>`;
 if(MX.node!=null){const n=m.nodes[MX.node];html+=`<article class="panel" style="margin-top:18px;max-width:760px"><h3>${esc(f.name)} inside ${esc(n.id)} · Golf ${esc(n.group)}</h3><div class="chart">${pageBars(f.members,MX.node,`${f.name} on the pages of ${n.id}`)}</div><p class="chart-note">${M.counts[i][MX.node]} containing words out of ${n.N}. Pages diagnose the pooled bifolium; no page-level trajectory is fitted.</p></article>`;}
 html+=`<div class="summary-grid" style="margin-top:18px">${metric(`${fmt(s.low,0)} → ${fmt(s.high,0)}`,'Gradual level, lowest to highest','per 10,000 words')}${metric(fmt(s.movement,0),'Total absolute gradual change','sum over 49 steps, per 10,000')}${metric(fmt(s.jump,0),'Total absolute jump','sum of |signed jumps|, per 10,000')}${metric(fmt(s.residual,0),'Residual after gradual + jumps','root mean square, per 10,000')}</div>`;
 $('matrix-detail').innerHTML=html;
}
async function startMatrix(path){
 try{$('status').textContent='Loading the positional fit…';await loadPositional(path);const m=PD.model;
  $('model-metrics').innerHTML=metric(m.active.toLocaleString?m.active.length.toLocaleString():m.active.length,'Effects with their own gradual curve',`of ${m.features.length.toLocaleString()} eligible constructions`)+metric(m.steps,'Step coefficients','bifolium-level differences the smooth curve does not follow')+metric(m.nodes.length,'Bifolia in path order',`${m.totalTokens.toLocaleString()} word tokens on ${m.pages.length} pages`)+metric(esc(m.model_id.replace('positional-composition-','')),'Model',`gradual penalty ${m.fit.lambda_group} · step penalty ${m.fit.lambda_jump}`);
  const q=query();if(q.get('component'))MX.feature=featureIndex(q.get('component'));if(MX.feature<0)MX.feature=m.groups.order[0];
  renderMatrix();renderDetail();$('status').textContent=modelStatus();
 }catch(e){$('status').textContent=`Could not load the gradient: ${e.message}`;console.error(e);}
}
// The global Columns switch chooses the default quantity family: per-bifolium values or per-step changes.
MX.field=axisControl(axis=>{if(!PD.model)return;MX.field=axis==='steps'?'gradual_change':'slope';$('mx-field').value=MX.field;drawMatrix();})==='steps'?'gradual_change':'slope';
startMatrix(pathControl('path',startMatrix));
