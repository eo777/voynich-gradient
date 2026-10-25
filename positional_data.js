"use strict";
// Shared loader and drawing helpers for the positional-composition pages.
// Every page reads one asset per path, assets/positional_path{1,3}.json.gz, and
// draws with the lineChart renderer in behavior_charts.js. Nothing is refitted here.
const PD={cache:{},model:null,path:'1',response:null};
const GROUP_ORDER=['1a','1b','1.5a','2a','5a','6','3b','3a','3c','4c','4a'];
const GROUP_FILL=['#dcece8','#e8e3f1','#f4e7d1','#dce7f4','#f0e0e5','#e8ecd7','#e0edf0','#eee4d9','#e2e4f3','#e7ecdf','#ede3ec'];
const SERIES=['#3067aa','#168374','#c07135','#8a629e','#ba5174','#748a38','#4c8b9e','#8d783c'];
const INK={observed:'#344653',gradual:'#3067aa',combined:'#168374',jump:'#8a629e',residual:'#c07135',muted:'#a1aaae'};
function groupFill(g){const k=GROUP_ORDER.indexOf(g);let h=0;for(const c of String(g))h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;return GROUP_FILL[(k>=0?k:h)%GROUP_FILL.length];}
const mean=a=>{const f=a.filter(finite);return f.length?sum(f)/f.length:NaN;};
const rms=a=>{const f=a.filter(finite);return f.length?Math.sqrt(f.reduce((s,x)=>s+x*x,0)/f.length):NaN;};
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const diff=a=>a.slice(1).map((v,i)=>v-a[i]);
const absSum=a=>sum(a.map(Math.abs));
const quantile=(values,q)=>{const v=values.filter(finite).sort((a,b)=>a-b);return v.length?v[Math.min(v.length-1,Math.floor(v.length*q))]:1;};
const signed=(x,d=1)=>(x>=0?'+':'−')+fmt(Math.abs(x),d);
async function readGz(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: ${r.status}`);return JSON.parse(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text());}
async function readJSON(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: ${r.status}`);return r.json();}
const POSITIONAL_ASSETS={1:'assets/positional_path1.json.gz?v=977c567667',3:'assets/positional_path3.json.gz?v=e2c9097fdd'};
async function loadPositional(path){
 path=String(path)==='3'?'3':'1';
 if(!PD.cache[path]){const m=await readGz(POSITIONAL_ASSETS[path]);indexModel(m);PD.cache[path]=m;}
 PD.path=path;PD.model=PD.cache[path];data={nodes:PD.model.nodes,unit:'bifolium'};return PD.model;
}
async function loadResponse(){if(!PD.response)PD.response=await readGz('assets/positional_response.json.gz?v=591f76d20c');return PD.response;}
function indexModel(m){
 m.byName=new Map();m.features.forEach((f,i)=>{m.byName.set(f.name,i);m.byName.set(f.id,i);});
 m.features.forEach((f,i)=>f.aliases.forEach(a=>{if(!m.byName.has(a.name))m.byName.set(a.name,i);}));
 m.wordIndex=new Map(m.words.map((w,i)=>[w.word,i]));
 m.labels=m.nodes.map(n=>n.id);m.boundaryLabels=m.nodes.slice(1).map(n=>n.id);m.N=m.nodes.map(n=>n.N);
 // Exclusive families: number, glyph template and match share come from the asset (src/voynich_gradients/families.py); the rule is the definition.
 for(const l of m.partitions.leaves){l.rule=familyLabel(l.label);l.name=`${l.number} · ${l.template}`;}
 m.totalTokens=sum(m.words.map(w=>w.count));m.active=m.features.map((_,i)=>i).filter(i=>m.features[i].active);
 m.groupOf=new Map();m.groups.groups.forEach(g=>g.components.forEach(c=>m.groupOf.set(c,g.id)));
 const M=m.matrices;
 m.summary=m.features.map((f,i)=>{
  const gc=M.gradual_change[i],jc=M.jump_change[i],g=M.gradual[i],prevalence=f.tokens/m.totalTokens;
  const cum=[];let acc=0;const total=absSum(gc);for(const v of gc){acc+=Math.abs(v);cum.push(acc);}
  return {tokens:f.tokens,types:f.members.length,mean:mean(M.observed[i]),low:Math.min(...g),high:Math.max(...g),largest:Math.max(...gc.map(Math.abs)),
   movement:total,jump:absSum(jc),residual:rms(M.residual[i]),own:f.rms,scale:Math.max(Math.sqrt(prevalence*(1-prevalence))*1e4,10),
   timing:total>0?cum.findIndex(c=>c>=total/2):gc.length/2};
 });
}
const feature=i=>PD.model.features[i];
const featureIndex=name=>{const i=PD.model.byName.get(String(name??'').trim());return i==null?-1:i;};
function kindLabel(f){
 if(f.source==='ordered_pair')return 'ordered pair';
 if(f.kind==='position')return f.name.split(':')[0];
 if(f.kind==='pattern')return 'anywhere';
 if(f.kind==='interaction')return 'co-occurrence';
 return f.kind;
}
function describeFeature(f){
 const g=f.units&&f.units.length?f.units.join(''):f.name;
 if(f.source==='ordered_pair'){const [a,b]=f.name.split(' >> ');return `${spanText(a)} immediately followed by ${spanText(b)}`;}
 if(f.kind==='position')return spanText(f.name);
 if(f.kind==='prefix')return `${g} at the start of the word`;
 if(f.kind==='suffix')return `${g} at the end of the word`;
 if(f.kind==='interaction')return `${f.name.replace(' & ',' and ')} both present in the word`;
 return `${g} anywhere in the word`;
}
function spanText(name){const [pos,g]=name.split(':');return pos==='prefix'?`${g} opening a longer word`:pos==='suffix'?`${g} closing a longer word`:`${g} inside the word, glyphs on both sides`;}
const activeText=f=>f.active?'own gradual effect selected':'no own gradual effect; shared effects still move its words';
// Chart helpers. Series carry label and color; the legend is drawn from them.
function legendHtml(series){return `<div class="legend">${series.map(s=>`<span style="--c:${s.color||INK.gradual}">${esc(s.label)}</span>`).join('')}</div>`;}
function chartPanel(title,series,labels,options={},note=''){
 const nodes=options.nodes||(labels.length===PD.model.nodes.length?PD.model.nodes:PD.model.nodes.slice(1));
 return `<article class="panel chart-panel"><div class="panel-heading"><h3>${esc(title)}</h3>${legendHtml(series)}</div><div class="chart">${lineChart(series,labels,{width:650,height:230,title,observationUnit:'bifolium',...options,nodes})}</div>${note?`<p class="chart-note">${note}</p>`:''}</article>`;
}
function series(values,label,color,extra={}){return {values,label,color,...extra};}
function markers(svg,positions,labels,color='#7f4f78'){
 // Vertical reference lines added to a lineChart; positions are label indices.
 const width=+svg.match(/viewBox="0 0 (\d+)/)[1],left=57,right=17,pw=width-left-right;
 const X=i=>left+pw*i/Math.max(1,labels.length-1);
 return svg.replace('</svg>',positions.map(i=>`<line x1="${X(i)}" x2="${X(i)}" y1="14" y2="${+svg.match(/<line class="gridline"[^>]*y1="([\d.]+)"/g)?.at(-1)?.match(/y1="([\d.]+)"/)[1]||200}" stroke="${color}" stroke-dasharray="4 3"/>`).join('')+'</svg>');
}
// Numbered badges on a lineChart drawn with options.markers; positions are label indices.
function numberedMarkers(svg,labels,positions,color='#7f4f78'){
 const width=+svg.match(/viewBox="0 0 (\d+)/)[1],left=57,pw=width-left-17,X=i=>left+pw*i/Math.max(1,labels.length-1);
 return svg.replace('</svg>',positions.map((i,n)=>`<rect x="${X(i)-9}" y="14" width="18" height="15" rx="3" fill="${color}"/><text x="${X(i)}" y="25" text-anchor="middle" fill="white" font-size="10" font-weight="700">${n+1}</text>`).join('')+'</svg>');
}
const familyLabel=l=>l.replace(/^All words ?/,'')||'All words';
function heatColor(v,limit,signed=true,gamma=1){
 const t=Math.pow(Math.min(1,Math.abs(v)/Math.max(limit,1e-12)),gamma),base=signed?(v>=0?[24,131,116]:[192,102,48]):[104,77,151];
 return `rgb(${base.map(c=>Math.round(250+(c-250)*t)).join(',')})`;
}
// Global column axis for the timing matrices, remembered across pages (URL ?axis= wins, then localStorage).
// 'bifolia': one column per bifolium (values at each bifolium). 'steps': one column per change between consecutive bifolia.
const AXIS_LABELS={bifolia:'Bifolia · one column per bifolium',steps:'Steps · one column per change between bifolia'};
function axisMode(){const q=query().get('axis');if(q in AXIS_LABELS)return q;try{const v=localStorage.getItem('vg-axis');if(v in AXIS_LABELS)return v;}catch(e){}return 'bifolia';}
function setAxisMode(v){PD.axis=v;try{localStorage.setItem('vg-axis',v);}catch(e){}setQuery({axis:v});}
function axisControl(onChange){
 PD.axis=axisMode();const host=document.querySelector('.controls');if(!host)return PD.axis;
 const label=document.createElement('label');label.innerHTML=`Columns<select id="axis">${Object.entries(AXIS_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>`;
 host.insertBefore(label,host.querySelector('#status'));const sel=label.querySelector('select');sel.value=PD.axis;
 sel.addEventListener('change',()=>{setAxisMode(sel.value);onChange(sel.value);});return PD.axis;
}
// Timing matrices shared by the Component groups and Chronology pages: the same quantities, the same axis, the
// same numbered peak marks. 'slope' is the per-path-distance derivative the Ward grouping used.
const TIMING_MODES={bifolia:{slope:'Unit-norm gradual slope at each bifolium · the Ward grouping basis',level:'Carrier-union gradual level minus the group’s mean · per 10,000'},
 steps:{normalized:'Gradual change per step · each effect scaled by its own RMS',union:'Carrier-union gradual change per step · per 10,000'}};
const FAMILY_MODES={bifolia:{level:'Family volume minus its mean · per 10,000',zlevel:'Family volume minus its mean · each family scaled by its own SD'},
 steps:{raw:'Family volume change per step · per 10,000',zchange:'Family volume change per step · each family scaled by its own RMS'}};
const isStepMode=mode=>['normalized','union','raw','zchange'].includes(mode);
function defaultTimingMode(axis){return axis==='steps'?'normalized':'slope';}
function defaultFamilyMode(axis){return axis==='steps'?'raw':'level';}
function modeOptions(table,axis,current){return Object.entries(table[axis]).map(([k,v])=>`<option value="${k}"${k===current?' selected':''}>${v}</option>`).join('');}
function groupTiming(gr,mode){
 const m=PD.model;
 if(mode==='slope')return gr.normalized_slope;
 if(mode==='level'){const mu=mean(gr.gradual);return gr.gradual.map(v=>v-mu);}
 if(mode==='union')return diff(gr.gradual);
 const acc=Array(m.nodes.length-1).fill(0);
 for(const i of gr.components){const gc=m.matrices.gradual_change[i],s=Math.max(rms(gc),1e-9);gc.forEach((v,k)=>{acc[k]+=v/s;});}
 return acc.map(v=>v/gr.components.length);
}
function peakMarks(stepColumns=true){return PD.model.chronology.peaks.map((i,n)=>({col:stepColumns?i:i+.5,label:String(n+1)}));}
function timingUnit(mode){return mode==='union'||mode==='level'?'per 10,000':mode==='slope'?'unit-norm slope':'row-RMS units';}
function renderGroupTiming(host,mode){
 const m=PD.model,steps=isStepMode(mode),columns=steps?m.nodes.slice(1):m.nodes,name=(TIMING_MODES.steps[mode]||TIMING_MODES.bifolia[mode]||mode).split(' · ')[0];
 const rows=m.groups.groups.map(gr=>{const values=groupTiming(gr,mode);return {id:String(gr.id),label:`Group ${gr.id} · ${gr.components.length} effects`,values,tip:k=>`Group ${gr.id} · ${steps?`${m.nodes[k].id} → ${m.nodes[k+1].id}`:m.nodes[k].id} · Golf ${columns[k].group}\n${name}: ${fmt(values[k],3)}\nExamples: ${gr.components.slice(0,5).map(i=>feature(i).name).join(', ')}`};});
 host.innerHTML=heatmap(rows,columns,{rowHeight:36,unit:timingUnit(mode),gamma:steps?.5:1,marks:peakMarks(steps)});
 return steps;
}
function familyTiming(l,mode){
 if(mode==='level'||mode==='zlevel'){const mu=mean(l.gradual),d=l.gradual.map(v=>v-mu);if(mode==='level')return d;const s=Math.max(rms(d),1e-9);return d.map(v=>v/s);}
 const d=diff(l.gradual);if(mode==='zchange'){const s=Math.max(rms(d),1e-9);return d.map(v=>v/s);}return d;
}
function renderFamilyTiming(host,mode){
 const m=PD.model,steps=isStepMode(mode),columns=steps?m.nodes.slice(1):m.nodes;
 const rows=m.partitions.leaves.map((l,k)=>{const values=familyTiming(l,mode);return {id:String(k),label:l.name,values,tip:j=>`${l.name} (${l.rule}) · ${steps?`${m.nodes[j].id} → ${m.nodes[j+1].id}`:m.nodes[j].id} · Golf ${columns[j].group}\n${steps?`Family volume change ${signed(diff(l.gradual)[j],1)} per 10,000 (${fmt(l.gradual[j],0)} → ${fmt(l.gradual[j+1],0)})`:`Family volume ${fmt(l.gradual[j],0)} per 10,000; mean ${fmt(mean(l.gradual),0)}`}${mode==='zchange'||mode==='zlevel'?` · ${signed(values[j],2)} scaled`:''}`};});
 host.innerHTML=heatmap(rows,columns,{rowHeight:30,unit:mode==='raw'||mode==='level'?'per 10,000':'scaled',gamma:steps?.5:1,marks:peakMarks(steps)});
 return steps;
}
function timingCaption(mode){
 return mode==='slope'?'The analytic derivative of each effect’s gradual rate per unit of geometric path distance, scaled to unit length and averaged within the group; this is the shape the Ward grouping was computed on. Where neighbouring bifolia share almost the same coordinate, a small volume change appears as a large slope; the Steps axis shows the volume change itself.':
  mode==='level'?'Each group’s carrier-word union volume at each bifolium, minus the group’s mean over the path, per 10,000 words: teal where the group is above its usual volume, orange below.':
  mode==='union'?'Change of each group’s carrier-word union volume from the preceding bifolium, per 10,000 words; large groups dominate.':
  'Each effect’s change from the preceding bifolium is divided by its own root mean square before averaging, so a group’s colour shows the direction its members share, not the volume of its frequent constructions.';
}
function familyCaption(mode){
 return mode==='level'?'Each family’s fitted volume at each bifolium minus its mean over the path, per 10,000 words. Families are disjoint and sum to 10,000, so a family above its mean is matched by others below theirs in the same column.':
  mode==='zlevel'?'Each family’s volume deviation from its own mean, divided by its own standard deviation, so small families are as visible as large ones.':
  mode==='raw'?'Change of each family’s fitted volume from the preceding bifolium, per 10,000 words. The sixteen changes sum to zero at every step.':
  'Each family’s step changes divided by their own root mean square, so small families are as visible as large ones.';
}
// Rows: [{id,label,sub?,values,tip(i)}]. Columns: nodes (50) or boundary destinations (49).
// marks: [{col,label}] draws a numbered dashed line through column col (same numbering as numberedMarkers).
function heatmap(rows,columns,{signed=true,limit=null,selected=null,rowHeight=23,unit='',legend='',marks=[],gamma=1}={}){
 const W=1320,L=228,R=18,cw=(W-L-R)/columns.length,T=62,top=marks.length?26:0,H=top+rowHeight*rows.length+8;
 if(limit==null)limit=quantile(rows.flatMap(r=>r.values.map(Math.abs)),.95)||1;
 const spans=golfSpans(columns);
 let head=`<svg viewBox="0 0 ${W} ${T}" class="heat-head" role="img" aria-label="Golf sections and colour scale"><text x="${L}" y="14" class="motion-axis">Golf sections · each column is one bifolium in path order</text>`;
 for(const s of spans){const x=L+s.start*cw,w=(s.end-s.start+1)*cw;head+=`<rect x="${x}" y="22" width="${w}" height="21" fill="${groupFill(s.group)}"/><text x="${x+w/2}" y="37" text-anchor="middle" class="motion-axis">${esc(s.group)}</text>`;}
 for(let k=0;k<80;k++)head+=`<rect x="${W-470+k*3}" y="50" width="3.1" height="9" fill="${heatColor(signed?limit*(k/79*2-1):limit*k/79,limit,signed,gamma)}"/>`;
 head+=`<text x="${W-477}" y="58" text-anchor="end" class="motion-axis">${signed?'≤ −':'0 '}${signed?fmt(limit,2):''}</text><text x="${W-222}" y="58" class="motion-axis">≥ ${signed?'+':''}${fmt(limit,2)}${unit?' '+esc(unit):''}${gamma!==1?' · square-root colour scale':''}</text><text x="${L}" y="58" class="motion-axis">${esc(legend||(signed?'Orange decreases · white zero · teal increases':'White zero · purple larger'))}</text></svg>`;
 let body=`<svg viewBox="0 0 ${W} ${H+64}" class="heat-body" role="img" aria-label="Heatmap, one row per construction, one column per bifolium">`;
 for(const mk of marks){const x=L+(mk.col+.5)*cw;body+=`<line x1="${x}" x2="${x}" y1="${top-4}" y2="${H-8}" stroke="#7f4f78" stroke-width="1.4" stroke-dasharray="4 3"/><rect x="${x-9}" y="2" width="18" height="16" rx="3" fill="#7f4f78"/><text x="${x}" y="14" text-anchor="middle" fill="#fff" font-size="10.5" font-weight="700">${esc(mk.label)}</text>`;}
 rows.forEach((r,k)=>{
  const y=top+k*rowHeight,sel=r.id===selected;
  body+=`<g class="heat-row" role="button" tabindex="0" data-row="${esc(r.id)}" aria-label="Inspect ${esc(r.label)}"><rect x="0" y="${y}" width="${L-6}" height="${rowHeight}" fill="${sel?'#e3efed':'white'}"/><text x="${L-12}" y="${y+rowHeight/2+4}" text-anchor="end" class="heat-label${sel?' sel':''}">${esc(r.label)}</text>`;
  if(r.sub)body+=`<text x="6" y="${y+rowHeight/2+4}" class="heat-sub">${esc(r.sub)}</text>`;
  r.values.forEach((v,i)=>{body+=`<rect data-col="${i}" x="${L+i*cw}" y="${y}" width="${cw+.2}" height="${rowHeight-.8}" fill="${finite(v)?heatColor(v,limit,signed,gamma):'#e3e6e8'}"><title>${esc(r.tip?r.tip(i):`${r.label} · ${columns[i].id}: ${fmt(v,3)}`)}</title></rect>`;});
  body+='</g>';
 });
 for(const s of spans)body+=`<line x1="${L+s.start*cw}" x2="${L+s.start*cw}" y1="${top}" y2="${H-8}" stroke="white" stroke-width="1.8"/>`;
 columns.forEach((n,i)=>body+=`<text transform="translate(${L+(i+.5)*cw},${H+6}) rotate(65)" class="motion-axis">${esc(n.id)}</text>`);
 return `<div class="heat-wrap"><div class="heat-sticky">${head}</div>${body}</svg></div>`;
}
function bindHeatmap(host,onRow){
 for(const row of host.querySelectorAll('[data-row]')){
  const choose=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();const col=e.target.dataset?.col;onRow(row.dataset.row,col==null?null:Number(col));};
  row.addEventListener('click',choose);row.addEventListener('keydown',choose);
 }
}
// Pages of one bifolium: observed rate of a word set on each page, as bars.
function pageBars(members,nodeIndex,title){
 const m=PD.model,ws=new Set(members.map(i=>m.words[i].word)),pages=m.pages.filter(p=>p.node===nodeIndex);
 if(!pages.length)return '<p class="empty">No pages recorded for this bifolium.</p>';
 const rates=pages.map(p=>{let c=0;for(const [w,n] of Object.entries(p.counts))if(ws.has(w))c+=n;return {page:p,c,rate:1e4*c/p.N};});
 const W=650,H=200,Lx=48,Tp=18,B=50,pw=W-Lx-12,ph=H-Tp-B,hi=Math.max(1,...rates.map(r=>r.rate))*1.12,cw=pw/rates.length;
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">`;
 for(let i=0;i<4;i++){const v=hi*i/3,y=Tp+ph*(1-v/hi);svg+=`<line x1="${Lx}" x2="${W-12}" y1="${y}" y2="${y}" class="gridline"/><text x="${Lx-7}" y="${y+4}" text-anchor="end" class="axis">${fmt(v,0)}</text>`;}
 rates.forEach((r,i)=>{const x=Lx+i*cw,h=ph*r.rate/hi;svg+=`<rect x="${x+3}" y="${Tp+ph-h}" width="${Math.max(1,cw-6)}" height="${h}" fill="#3c9291"><title>${esc(r.page.id)}: ${r.c} / ${r.page.N} = ${fmt(r.rate)} per 10,000</title></rect><text transform="translate(${x+cw/2},${Tp+ph+10}) rotate(50)" class="axis">${esc(r.page.id)}</text>`;});
 return svg+'</svg>';
}
function metric(value,label,detail=''){return `<div class="metric"><div class="value">${value}</div><div class="label">${label}</div>${detail?`<div class="detail">${detail}</div>`:''}</div>`;}
function wordButtons(ids,limit=ids.length){const m=PD.model;return ids.slice(0,limit).map(i=>`<button class="word-chip" data-word="${esc(m.words[i].word)}">${esc(m.words[i].word)} <small>${m.words[i].count}</small></button>`).join(' ');}
function componentChips(ids,limit=ids.length){const m=PD.model;return ids.slice(0,limit).map(i=>`<button class="chip${m.features[i].active?'':' inactive'}" data-feature="${esc(m.features[i].name)}" title="${esc(describeFeature(m.features[i]))}">${esc(m.features[i].name)}</button>`).join(' ');}
const rankByCount=ids=>[...ids].sort((a,b)=>PD.model.words[b].count-PD.model.words[a].count);
// URL state shared by the pages.
const query=()=>new URL(location.href).searchParams;
function setQuery(values){const u=new URL(location.href);for(const [k,v] of Object.entries(values)){if(v==null||v==='')u.searchParams.delete(k);else u.searchParams.set(k,v);}history.replaceState(null,'',u);}
function pathControl(id,onChange){const el=$(id);el.value=query().get('path')==='3'?'3':'1';el.addEventListener('change',()=>{setQuery({path:el.value});onChange(el.value);});return el.value;}
function nodeOptions(selected=null){return PD.model.nodes.map((n,i)=>`<option value="${i}"${i===selected?' selected':''}>${esc(n.id)} · ${esc(n.group)}</option>`).join('');}
function featureOptions(ids){return ids.map(i=>`<option value="${esc(feature(i).name)}">${esc(feature(i).name)} · ${feature(i).tokens.toLocaleString()} tokens${feature(i).active?'':' · no own effect'}</option>`).join('');}
function datalistOptions(){return PD.model.features.map(f=>`<option value="${esc(f.name)}">${esc(kindLabel(f))} · ${f.tokens.toLocaleString()} tokens</option>`).join('');}
function modelStatus(){const m=PD.model;return `Path ${PD.path} · ${m.active.length} selected gradual effects · ${m.steps} step coefficients · ${m.features.length.toLocaleString()} eligible effects · ${m.nodes.length} bifolia`;}
