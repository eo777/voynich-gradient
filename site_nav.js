"use strict";
// One menu for every page. Each page carries an empty <nav class="package-nav"></nav>
// placeholder; this script fills it and marks the page the reader is on.
(function(){
 const pages=[
  ['./','Overview'],
  ['matrix.html','Gradient matrix'],
  ['components.html','Component curves'],
  ['behavior.html','Component groups'],
  ['feature-mds.html','Curve MDS'],
  ['page-mds.html','Page MDS'],
  ['partitions.html','Families'],
  ['chronology.html','Chronology'],
  ['residuals.html','Residual audit'],
  ['https://github.com/eo777/voynich-gradient/tree/main/data','Data tables (CSV)'],
  ['https://github.com/eo777/voynich-gradient#readme','Package documentation']];
 let nav=document.querySelector('nav.package-nav');
 if(!nav){nav=document.createElement('nav');nav.className='package-nav';document.body.prepend(nav);}
 nav.setAttribute('aria-label','Voynich gradients');
 const here=decodeURIComponent(location.pathname.split('/').pop()||'index.html');
 nav.replaceChildren(...pages.map(([href,label])=>{
  const a=document.createElement('a');a.href=href;a.textContent=label;
  if((href==='./'?'index.html':href)===here)a.setAttribute('aria-current','page');
  return a;
 }));
})();
