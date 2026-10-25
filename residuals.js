"use strict";
// Residual audit: concentration of residuals, construction drill-down with pages, held-page check on Path 1.
const RS={source:'full',scope:'active',count:60,order:'size',minTokens:100,standardize:true,feature:-1,node:null,held:null};
function residualRows(){
 const m=PD.model,R=RS.source==='heldpage'&&RS.held?RS.held:m.matrices.residual;
 let ids=(RS.scope==='active'?m.active:m.features.map((_,i)=>i)).filter(i=>feature(i).tokens>=RS.minTokens);
 const value=i=>R[i].map(v=>RS.standardize?v/m.summary[i].scale:v),size=new Map(ids.map(i=>[i,rms(value(i))]));
 ids.sort((a,b)=>size.get(b)-size.get(a));ids=ids.slice(0,RS.count);
 if(RS.order==='timing'){const peak=i=>{const v=value(i).map(Math.abs);return v.indexOf(Math.max(...v));};ids.sort((a,b)=>peak(a)-peak(b));}
 else if(RS.order==='name')ids.sort((a,b)=>feature(a).name.localeCompare(feature(b).name));
 return {ids,value,R};
}
function renderHotspots(){
 const m=PD.model,host=$('hotspot-content');
 host.innerHTML=`<div class="toolbar"><label>Residual<select id="rs-source"><option value="full">Full fit · observed − (gradual + jumps)</option>${RS.held?'<option value="heldpage">Held-page · against fits that excluded the page</option>':''}</select></label><label>Rows<select id="rs-scope"><option value="active">Effects with their own gradual curve</option><option value="all">All eligible constructions</option></select></label><label>Show<select id="rs-count">${[30,60,120,250].map(v=>`<option value="${v}">${v} largest</option>`).join('')}</select></label><label>Row order<select id="rs-order"><option value="size">Residual size</option><option value="timing">Peak timing · early to late</option><option value="name">Alphabetical</option></select></label><label>Minimum tokens<select id="rs-min">${[15,50,100,250,1000].map(v=>`<option value="${v}">${v}</option>`).join('')}</select></label><label class="check"><input id="rs-std" type="checkbox">Standardize by binomial scale</label></div><div class="feature-grid"><div id="rs-timeline"></div><div id="rs-top"></div></div><div id="rs-heat" style="margin-top:18px"></div><p id="rs-caption" class="chart-note"></p>`;
 $('rs-source').value=RS.source;$('rs-scope').value=RS.scope;$('rs-count').value=RS.count;$('rs-order').value=RS.order;$('rs-min').value=RS.minTokens;$('rs-std').checked=RS.standardize;
 const bind=(id,key,parse=v=>v)=>$(id).addEventListener('change',e=>{RS[key]=parse(e.target.value);drawHotspots();});
 bind('rs-source','source');bind('rs-scope','scope');bind('rs-count','count',Number);bind('rs-order','order');bind('rs-min','minTokens',Number);$('rs-std').addEventListener('change',e=>{RS.standardize=e.target.checked;drawHotspots();});
 drawHotspots();
}
function drawHotspots(){
 const m=PD.model,{ids,value,R}=residualRows(),unit=RS.standardize?'standardized':'per 10,000',held=RS.source==='heldpage';
 const perNode=src=>m.nodes.map((_,t)=>rms(m.active.filter(i=>feature(i).tokens>=RS.minTokens).map(i=>src[i][t]/m.summary[i].scale)));
 const tl=[series(perNode(m.matrices.residual),'Full fit',INK.jump,{dots:true,width:2.2})];if(RS.held)tl.push(series(perNode(RS.held),'Held-page fits',INK.gradual,{dots:true,width:2.2}));
 $('rs-timeline').innerHTML=chartPanel('Residual size along the order',tl,m.labels,{unit:'standardized RMS'},`Root mean square of standardized residuals over the ${m.active.filter(i=>feature(i).tokens>=RS.minTokens).length} own-curve effects with at least ${RS.minTokens} tokens. Higher means the fit explains that bifolium less well.`);
 const top=ids.slice(0,12).map(i=>{const v=value(i),k=v.map(Math.abs).indexOf(Math.max(...v.map(Math.abs)));return {i,k,v:v[k],raw:R[i][k]};});
 $('rs-top').innerHTML=`<article class="panel"><h3>Largest residual rows</h3><div class="table-wrap"><table class="row-list"><thead><tr><th>Construction</th><th class="num">RMS (${unit})</th><th>Largest at</th><th class="num">There (/10k)</th></tr></thead><tbody>${top.map(r=>`<tr class="pick" data-feature="${esc(feature(r.i).name)}" data-node="${r.k}"><td><span class="word-form">${esc(feature(r.i).name)}</span></td><td class="num">${fmt(rms(value(r.i)),2)}</td><td>${esc(m.nodes[r.k].id)} · ${esc(m.nodes[r.k].group)}</td><td class="num">${signed(r.raw,0)}</td></tr>`).join('')}</tbody></table></div><p class="chart-note">Select a row to inspect it with its pages.</p></article>`;
 const rows=ids.map(i=>({id:feature(i).name,label:feature(i).name,sub:feature(i).active?'':'shared',values:value(i),tip:k=>`${feature(i).name} · ${m.nodes[k].id} · Golf ${m.nodes[k].group}\n${held?'Held-page':'Full-fit'} residual ${signed(R[i][k],1)} per 10,000${RS.standardize?` (${signed(value(i)[k],2)} standardized)`:''}\nobserved ${fmt(m.matrices.observed[i][k],1)} · gradual + jumps ${fmt(m.matrices.combined[i][k],1)}`}));
 $('rs-heat').innerHTML=rows.length?heatmap(rows,m.nodes,{unit:unit,legend:'Orange observed below the fit · white zero · teal observed above the fit'}):'<p class="empty">No rows match these filters.</p>';
 $('rs-caption').textContent=`${rows.length} constructions with the largest root-mean-square ${held?'held-page':'full-fit'} residual, ordered ${RS.order==='size'?'by that size':RS.order==='timing'?'by the bifolium of their largest residual; this ordering itself creates diagonal bands':'alphabetically, independent of timing'}. Colour saturates at the 95th percentile; hover for exact values.`;
 bindHeatmap($('rs-heat'),(name,col)=>{RS.feature=featureIndex(name);if(col!=null)RS.node=col;openComponent();});
 $('rs-top').querySelectorAll('[data-feature]').forEach(r=>r.addEventListener('click',()=>{RS.feature=featureIndex(r.dataset.feature);RS.node=Number(r.dataset.node);openComponent();}));
}
function openComponent(){$('residual-component').value=feature(RS.feature).name;$('residual-node').value=String(RS.node);renderComponent();$('component').scrollIntoView({behavior:'smooth',block:'start'});}
function renderComponent(){
 const m=PD.model,i=featureIndex($('residual-component').value);if(i<0){$('residual-detail').innerHTML='<p class="note-box">Choose a construction from the suggestions.</p>';return;}
 RS.feature=i;RS.node=Number($('residual-node').value);const f=feature(i),M=m.matrices,n=RS.node,s=m.summary[i];
 const res=[series(M.residual[i],'Full-fit residual',INK.observed,{dots:true,width:2.2}),series(M.jump[i],'Fitted jump level',INK.jump,{dash:true})];if(RS.held)res.push(series(RS.held[i],'Held-page residual',INK.gradual,{dots:true,width:1.4}));
 const lo=Math.max(0,n-1),hi=Math.min(m.nodes.length-1,n+2),pages=m.pages.filter(p=>p.node>=lo&&p.node<=hi).sort((a,b)=>a.node-b.node||a.id.localeCompare(b.id)),ws=new Set(f.members.map(j=>m.words[j].word));
 const pageRate=p=>{let c=0;for(const [w,k] of Object.entries(p.counts))if(ws.has(w))c+=k;return 1e4*c/p.N;};
 const pnodes=pages.map(p=>({id:p.id,group:m.nodes[p.node].group,bifolium:m.nodes[p.node].id}));
 $('residual-detail').innerHTML=`<div class="detail-title"><h3>${esc(f.name)}<span class="kind">${esc(kindLabel(f))}</span></h3><p>${esc(describeFeature(f))} · ${f.tokens.toLocaleString()} tokens · residual RMS ${fmt(s.residual,1)} per 10,000 (${fmt(s.residual/s.scale,2)} standardized) · ${activeText(f)} · <a href="components.html?path=${PD.path}&component=${encodeURIComponent(f.name)}">full curves and drivers</a></p></div><div class="feature-grid">${chartPanel(`${f.name} · carrier rate`,[series(M.observed[i],'Observed',INK.observed,{dots:true,width:1}),series(M.gradual[i],'Gradual level',INK.gradual,{width:2.4}),series(M.combined[i],'Gradual + jumps',INK.combined,{dash:true})],m.labels,{unit:'per 10,000'})}${chartPanel(`${f.name} · residual and jump level`,res,m.labels,{unit:'per 10,000',zero:true},'The residual is observed minus gradual + jumps. The dashed violet line is the jump level the fit already absorbed; a residual that tracks it would mean the jumps are too small or too large.')}</div><article class="panel" style="margin-top:18px"><div class="panel-heading"><h3>Pages from ${esc(m.nodes[lo].id)} to ${esc(m.nodes[hi].id)}</h3>${legendHtml([series([],'Observed page rate',INK.observed),series([],'Bifolium gradual level',INK.gradual),series([],'Bifolium gradual + jumps',INK.combined)])}</div><div class="chart">${lineChart([series(pages.map(pageRate),'Observed page rate',INK.observed,{dots:true,width:1}),series(pages.map(p=>M.gradual[i][p.node]),'Gradual',INK.gradual,{width:2.4}),series(pages.map(p=>M.combined[i][p.node]),'Combined',INK.combined,{dash:true})],pages.map(p=>p.id),{width:1100,height:260,nodes:pnodes,observationUnit:'page',ticks:pages.length,title:`${f.name} on individual pages`,unit:'per 10,000'})}</div><p class="chart-note">Each dot is one page; the fitted curves are constant within a bifolium because the model has no page-level term. Spread among the pages of one bifolium is variation the fit cannot represent; a shared offset of all its pages is a missed change.</p></article>`;
 setQuery({path:PD.path,component:f.name,node:n});
}
function renderHeldPage(){
 const m=PD.model;if(!RS.held){$('heldpage-content').innerHTML=`<p class="note-box">${PD.path==='1'?'The held-page residuals (assets/positional_response.json.gz) are not available.':'Held-page fits were computed on Path 1 only. Switch to Path 1 to see them.'}</p>`;return;}
 const ids=m.active.filter(i=>feature(i).tokens>=100),full=rms(ids.flatMap(i=>m.matrices.residual[i].map(v=>v/m.summary[i].scale))),held=rms(ids.flatMap(i=>RS.held[i].map(v=>v/m.summary[i].scale)));
 const worst=ids.map(i=>({i,d:rms(RS.held[i].map(v=>v/m.summary[i].scale))-rms(m.matrices.residual[i].map(v=>v/m.summary[i].scale))})).sort((a,b)=>b.d-a.d).slice(0,10);
 $('heldpage-content').innerHTML=`<div class="summary-grid"><div class="metric"><div class="value">${fmt(full,3)}</div><div class="label">Full-fit residual</div><div class="detail">standardized RMS, ${ids.length} own-curve effects with ≥100 tokens</div></div><div class="metric"><div class="value">${fmt(held,3)}</div><div class="label">Held-page residual</div><div class="detail">pages scored by fits that excluded them</div></div><div class="metric"><div class="value">${fmt(100*(held/full-1),1)}%</div><div class="label">Increase when the page is held out</div><div class="detail">small means the curves are not shaped by the page they describe</div></div></div><article class="panel"><h3>Constructions whose fit depends most on the page itself</h3><p>${componentChips(worst.map(w=>w.i))}</p><p class="chart-note">Largest increase of standardized residual RMS from full fit to held-page fit. Select one to inspect it above with the held-page residual drawn in blue.</p></article>`;
 $('heldpage-content').querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>{RS.feature=featureIndex(b.dataset.feature);RS.node=RS.node??0;openComponent();}));
}
async function startResiduals(path){
 $('status').textContent='Loading the positional fit…';
 try{await loadPositional(path);const m=PD.model;RS.held=null;
  if(PD.path==='1'){try{const r=await loadResponse();if(r.heldpage_residual?.length===m.features.length)RS.held=r.heldpage_residual;}catch(e){console.warn(e);}}
  if(RS.source==='heldpage'&&!RS.held)RS.source='full';
  $('component-names').innerHTML=datalistOptions();$('residual-node').innerHTML=nodeOptions();
  const q=query();const want=featureIndex(q.get('component')||'cth');RS.feature=want>=0?want:m.active[0];RS.node=q.get('node')!=null?Number(q.get('node')):m.matrices.residual[RS.feature].map(Math.abs).indexOf(Math.max(...m.matrices.residual[RS.feature].map(Math.abs)));
  $('residual-component').value=feature(RS.feature).name;$('residual-node').value=String(RS.node);
  renderHotspots();renderComponent();renderHeldPage();$('status').textContent=modelStatus();
 }catch(e){$('status').textContent=`Could not load the positional fit: ${e.message}`;console.error(e);}
}
$('residual-form').addEventListener('submit',e=>{e.preventDefault();renderComponent();});$('residual-node').addEventListener('change',renderComponent);
startResiduals(pathControl('path',startResiduals));
