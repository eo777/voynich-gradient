// Renderer copied verbatim from app.js; SHA256 c2a0f6de12597832a50071b70eab9a0540a0dad52c3aca2c2cd98de07493811b
"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const fmt=(x,d=1)=>finite(x)?x.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=x=>fmt(x*100)+'%';
const sum=a=>a.reduce((s,v)=>s+(finite(v)?v:0),0);
const colors={observed:'#344653',fit:'#168374',smooth:'#3067aa',jump:'#8a629e',forecast:'#c06630'};
let data=null;
function golfSpans(nodes){
  const spans=[];
  for(let i=0;i<nodes.length;i++){
    const group=String(nodes[i].group||"Unclassified"),last=spans.at(-1);
    if(last?.group===group)last.end=i;
    else spans.push({group,start:i,end:i});
  }
  return spans;
}
function golfAxisLayout(nodes,left,pw,positions=null){
  const X=i=>positions?positions[Math.floor(i)]+(i-Math.floor(i))*(positions[Math.ceil(i)]-positions[Math.floor(i)]):left+pw*i/Math.max(1,nodes.length-1),rowEnds=[];
  const spans=golfSpans(nodes).map(span=>{
    const x1=span.start===0?left:X(span.start-.5),x2=span.end===nodes.length-1?left+pw:X(span.end+.5);
    const labelWidth=Math.max(18,span.group.length*6.6),center=(x1+x2)/2;
    const labelX=Math.max(left+labelWidth/2,Math.min(left+pw-labelWidth/2,center));
    let row=0;while(rowEnds[row]!=null&&rowEnds[row]+7>labelX-labelWidth/2)row++;
    rowEnds[row]=labelX+labelWidth/2;
    return {...span,x1,x2,center,labelX,row};
  });
  return {spans,rows:rowEnds.length};
}
function lineChart(series, labels, options={}) {
  const width=options.width||1000,left=57,right=17,top=14;
  const chartNodes=options.nodes||data?.nodes,chartUnit=options.observationUnit||data?.unit;
  const hasGroups=chartNodes?.length===labels.length;
  const coords=options.coordinates?.length===labels.length?options.coordinates:null;
  const positions=coords?coords.map(v=>left+(width-left-right)*(v-coords[0])/Math.max(1e-12,coords.at(-1)-coords[0])):null;
  const groupAxis=hasGroups?golfAxisLayout(chartNodes,left,width-left-right,positions):{spans:[],rows:0};
  const categorySpace=groupAxis.rows?18+groupAxis.rows*15:0;
  const height=(options.height||240)+categorySpace,bottom=43+categorySpace;
  const pw=width-left-right,ph=height-top-bottom;
  // stacked: draw the series as bands summing upward in series order (first series at the bottom).
  const stacked=!!options.stacked&&series.length>0;let stackBands=null;
  if(stacked){let base=Array(labels.length).fill(0);stackBands=series.map(s=>{const top=base.map((b,i)=>b+(finite(s.values[i])?s.values[i]:0));const band={base,top};base=top;return band;});}
  const all=stacked?stackBands.at(-1).top:series.flatMap(s=>s.values.filter(finite));
  if(!all.length)return '<p class="empty">No saved values for this chart.</p>';
  let lo=options.zero===false&&!stacked?Math.min(...all):Math.min(0,...all),hi=Math.max(...all);
  if(hi===lo){hi+=Math.abs(hi)*.1||1;lo=options.zero===false?lo-.1:lo;}
  const pad=stacked?0:(hi-lo)*.08;hi+=pad;if(lo<0)lo-=pad;
  const X=i=>positions?positions[i]:left+pw*i/Math.max(1,labels.length-1),Y=v=>top+ph*(hi-v)/(hi-lo);
  let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(options.title||"Trajectory chart")}. Golf 2.1 categories along ${coords?'actual path distance':`equally spaced ${chartUnit==="page"?"pages and panels":"bifolium ranks"}`}.">`;
  const golfColors=["#dcece8","#e8e3f1","#f4e7d1","#dce7f4","#f0e0e5","#e8ecd7","#e0edf0","#eee4d9","#e2e4f3","#e7ecdf","#ede3ec"];
  const golfOrder=["1a","1b","1.5a","2a","5a","6","3b","3a","3c","4c","4a"];
  const groupColor=group=>{const known=golfOrder.indexOf(group);let hash=0;for(const c of group)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;return golfColors[(known>=0?known:hash)%golfColors.length];};
  for(const span of groupAxis.spans){
    const name=esc(span.group),fill=groupColor(span.group),plotBottom=top+ph;
    svg+=`<rect class="golf-shade" x="${span.x1}" y="${top}" width="${span.x2-span.x1}" height="${ph}" fill="${fill}"/><rect x="${span.x1}" y="${plotBottom+5}" width="${span.x2-span.x1}" height="6" fill="${fill}"><title>Golf ${name}: ${esc(labels[span.start])} to ${esc(labels[span.end])}</title></rect>`;
    if(span.start>0)svg+=`<line class="golf-boundary" x1="${span.x1}" x2="${span.x1}" y1="${top}" y2="${plotBottom+11}"/>`;
    const labelY=plotBottom+25+span.row*15;
    if(span.row>0||Math.abs(span.labelX-span.center)>1)svg+=`<path class="golf-leader" d="M${span.center},${plotBottom+12} L${span.labelX},${labelY-11}"/>`;
    svg+=`<text class="golf-label" text-anchor="middle" x="${span.labelX}" y="${labelY}">${name}</text>`;
  }
  const axisDigits=options.axisDigits??(Math.abs(hi)>15?0:Math.abs(hi)<.01?Math.min(6,2-Math.floor(Math.log10(Math.max(Math.abs(hi),1e-8)))):1);
  for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4,y=Y(v);svg+=`<line class="gridline" x1="${left}" x2="${width-right}" y1="${y}" y2="${y}"/><text class="axis" text-anchor="end" x="${left-9}" y="${y+4}">${esc(options.percent?fmt(v*100,0)+"%":fmt(v,axisDigits))}</text>`;}
  if(lo<0&&hi>0)svg+=`<line x1="${left}" x2="${width-right}" y1="${Y(0)}" y2="${Y(0)}" stroke="#b4bfc4"/>`;
  if(stacked){
    for(let k=0;k<series.length;k++){const s=series[k],{base,top:tp}=stackBands[k],n=labels.length;let d="";for(let i=0;i<n;i++)d+=`${i?"L":"M"}${X(i).toFixed(2)},${Y(tp[i]).toFixed(2)} `;for(let i=n-1;i>=0;i--)d+=`L${X(i).toFixed(2)},${Y(base[i]).toFixed(2)} `;
      const vals=s.values.map(v=>finite(v)?v:0),imax=vals.indexOf(Math.max(...vals)),imin=vals.indexOf(Math.min(...vals)),u=options.unit||"";
      svg+=`<path class="stack-area" d="${d}Z" fill="${s.color||colors[s.key]||colors.fit}"><title>${esc(s.label)} · ${esc(fmt(vals[0],0))} → ${esc(fmt(vals.at(-1),0))} ${esc(u)} · largest ${esc(fmt(vals[imax],0))} at ${esc(labels[imax])} · smallest ${esc(fmt(vals[imin],0))} at ${esc(labels[imin])}</title></path>`;}
    for(const span of groupAxis.spans)if(span.start>0)svg+=`<line x1="${span.x1}" x2="${span.x1}" y1="${top}" y2="${top+ph}" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>`;
  }
  for(const i of options.markers||[])if(i>=0&&i<labels.length)svg+=`<line x1="${X(i)}" x2="${X(i)}" y1="${top}" y2="${top+ph}" stroke="#8a629e" stroke-width="1.5" stroke-dasharray="4 3"><title>Movement peak before ${esc(labels[i])}</title></line>`;
  const count=Math.min(options.ticks||7,labels.length);
  const ticks=new Set(Array.from({length:count},(_,i)=>{
    if(!positions)return Math.round(i*(labels.length-1)/Math.max(count-1,1));
    if(i===0)return 0;if(i===count-1)return labels.length-1;
    const target=left+pw*i/Math.max(count-1,1);
    return positions.reduce((best,x,j)=>Math.abs(x-target)<Math.abs(positions[best]-target)?j:best,0);
  }));
  const nested=chartUnit==="page"&&chartNodes.length===labels.length;
  for(const i of ticks){const anchor=i===0?"start":i===labels.length-1?"end":"middle";svg+=`<text class="axis" text-anchor="${anchor}" x="${X(i)}" y="${height-(nested?22:16)}">${esc(labels[i])}</text>`;if(nested)svg+=`<text class="axis" style="font-size:9px" text-anchor="${anchor}" x="${X(i)}" y="${height-7}">bif. ${esc(chartNodes[i].bifolium||"")}</text>`;}
  for(const s of stacked?[]:series){let path="",started=false;for(let i=0;i<s.values.length;i++){const v=s.values[i];if(!finite(v)){started=false;continue;}path+=`${started?"L":"M"}${X(i).toFixed(2)},${Y(v).toFixed(2)} `;started=true;}svg+=`<path d="${path}" fill="none" stroke="${s.color||colors[s.key]||colors.fit}" stroke-width="${s.width||2.2}" ${s.dash?'stroke-dasharray="5 4"':""}/>`;if(s.dots){for(let i=0;i<s.values.length;i++){const v=s.values[i];if(finite(v))svg+=`<circle cx="${X(i)}" cy="${Y(v)}" r="2.6" fill="${s.color||colors[s.key]}"><title>${esc(labels[i])}: ${esc(fmt(v,2))} ${esc(options.unit||"")}</title></circle>`;}}}
  svg+="</svg>";return svg;
}
