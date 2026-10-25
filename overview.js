"use strict";
// Overview diagram: the same 50 bifolia on the index axis (equal spacing) and on the fitted path coordinate.
async function drawAxes(){
 const host=$('axis-diagram');if(!host)return;
 try{
  const nodes=(await readGz('assets/axes.json.gz?v=05cd033932')).paths['1'].nodes,n=nodes.length;
  const W=1100,L=40,R=40,pw=W-L-R,y1=46,y2=132,arcs=nodes.map(d=>d.arc),lo=Math.min(...arcs),hi=Math.max(...arcs);
  const xi=i=>L+pw*i/(n-1),xa=i=>L+pw*(arcs[i]-lo)/(hi-lo);
  const spans=golfSpans(nodes);let s=`<svg viewBox="0 0 ${W} 175" role="img" aria-label="The 50 bifolia on the index axis and on the path coordinate">`;
  s+=`<text x="${L}" y="14" class="motion-axis">Index axis · one equal column per bifolium (all charts and matrices)</text>`;
  for(const g of spans){const a=g.start?(xi(g.start-1)+xi(g.start))/2:L,b=g.end<n-1?(xi(g.end)+xi(g.end+1))/2:L+pw;s+=`<rect x="${a}" y="${y1-14}" width="${b-a}" height="28" fill="${groupFill(g.group)}"/><text x="${(a+b)/2}" y="${y1-18}" text-anchor="middle" class="motion-axis">${esc(g.group)}</text>`;}
  for(const g of spans){const a=g.start?(xa(g.start-1)+xa(g.start))/2:L,b=g.end<n-1?(xa(g.end)+xa(g.end+1))/2:L+pw;s+=`<rect x="${a}" y="${y2-14}" width="${Math.max(b-a,1)}" height="28" fill="${groupFill(g.group)}"/>`;}
  for(let i=0;i<n;i++)s+=`<line x1="${xi(i)}" y1="${y1+14}" x2="${xa(i)}" y2="${y2-14}" stroke="#9aa8ae" stroke-width=".7"/>`;
  for(let i=0;i<n;i++)s+=`<line x1="${xi(i)}" y1="${y1-14}" x2="${xi(i)}" y2="${y1+14}" stroke="#2e4753" stroke-width="1.4"><title>${esc(nodes[i].id)} · Golf ${esc(nodes[i].group)} · rank ${i+1} · path coordinate ${fmt(arcs[i],4)}</title></line><line x1="${xa(i)}" y1="${y2-14}" x2="${xa(i)}" y2="${y2+14}" stroke="#2e4753" stroke-width="1.4"><title>${esc(nodes[i].id)} · path coordinate ${fmt(arcs[i],4)}</title></line>`;
  s+=`<text x="${L}" y="${y2+34}" class="motion-axis">Path distance · the fitted coordinate, 0 to 1 (the slope is per unit of this axis)</text>`;
  s+=`<text x="${L}" y="${y1+30}" class="motion-axis">${esc(nodes[0].id)}</text><text x="${L+pw}" y="${y1+30}" text-anchor="end" class="motion-axis">${esc(nodes[n-1].id)}</text>`;
  const first4a=nodes.findIndex(d=>d.group==='4a');s+=`<text x="${xa(first4a)-6}" y="${y2-20}" text-anchor="end" class="motion-axis">five 4a bifolia within 0.1% →</text>`;
  host.innerHTML=s+'</svg>';
 }catch(e){host.innerHTML=`<p class="chart-note">Diagram unavailable: ${esc(e.message)}</p>`;}
}
drawAxes();
