const fs=require('fs');const {JSDOM}=require('jsdom');
let html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
html=html.replace(/<script src="[^"]*"><\/script>/g,'').replace(/<link[^>]*>/g,'');
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/'});
const w=dom.window;const errors=[];w.addEventListener('error',e=>errors.push(e.message));
Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 800}});
Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 600}});
w.eval(fs.readFileSync('node_modules/leaflet/dist/leaflet-src.js','utf8'));
w.eval(fs.readFileSync('node_modules/@turf/turf/turf.min.js','utf8'));
w.eval(fs.readFileSync('node_modules/proj4/dist/proj4.js','utf8'));
let M;const om=w.L.map;w.L.map=function(){M=om.apply(this,arguments);return M;};
w.eval(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
const $=s=>w.document.querySelector(s),$$=s=>Array.from(w.document.querySelectorAll(s));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const c=M.getCenter();
const kx=(111412.84*Math.cos(c.lat*Math.PI/180)-93.5*Math.cos(3*c.lat*Math.PI/180))/0.3048,ky=364400;
const ft=(x,y)=>w.L.latLng(c.lat+(y+400)/ky,c.lng+(x+400)/kx); // offset south-west of demo site, clear of demo parcels? just a free area
let fails=0;const ok=(cnd,m)=>{if(!cnd){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const nBldg=()=>($('#sched').querySelectorAll('tbody tr').length-1);
const n0=nBldg();const sleep=ms=>new Promise(r=>setTimeout(r,ms));(async()=>{
click($('[data-tool="bpoly"]'));
ok(!$('#drawbar').hidden,'draw bar visible for Draw building');
ok($('#angMode').value==='ortho','building tool defaults to right angles');
// corner 1
M.fire('click',{latlng:ft(0,0)});
// move roughly east with a bit of drift: ortho should lock to exact east
M.fire('mousemove',{latlng:ft(40,-3)});await sleep(60);
ok($('#drawInfo').textContent.startsWith('Side 40.0'),'ortho locks first side to 40.0 ft ('+$('#drawInfo').textContent+')');
M.fire('click',{latlng:ft(40,-3)});
// north, typed 25
M.fire('mousemove',{latlng:ft(41,20)});
const lb=$('#lenBox');
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'2',bubbles:true}));
ok(w.document.activeElement===lb&&lb.value==='2','typing a digit focuses the length box');
lb.value='25';lb.dispatchEvent(new w.Event('input'));
ok($('#drawInfo').textContent.startsWith('Side 25.0'),'preview shows typed 25.0 ft side ('+$('#drawInfo').textContent+')');
lb.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
// west typed 40
M.fire('mousemove',{latlng:ft(10,25)});
lb.value='40';lb.dispatchEvent(new w.Event('input'));
lb.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
// finish with Enter (no typed value)
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
ok(nBldg()===n0+1,'building created ('+nBldg()+' buildings)');
const lens=$$('.segIn').map(i=>parseFloat(i.value));
console.log('side lengths:',lens);
ok(lens.length===4&&lens[0]===40&&lens[1]===25&&lens[2]===40&&lens[3]===25,'sides are exactly 40 / 25 / 40 / 25');
ok(/1,000 sf footprint/.test($('#iInfo').textContent),'footprint 1,000 sf ('+$('#iInfo').textContent+')');
ok($('#iW').closest('.rect-only').hidden,'width/depth hidden for freeform');
// edit side 1 to 60 -> neighbor slides, rectangle stays square
const s1=$$('.segIn')[0];s1.value='60';s1.dispatchEvent(new w.Event('change'));
const lens2=$$('.segIn').map(i=>parseFloat(i.value));console.log('after edit:',lens2);
ok(lens2[0]===60&&lens2[1]===25&&lens2[2]===60&&lens2[3]===25,'stretching side 1 to 60 keeps the shape square');
ok(/1,500 sf footprint/.test($('#iInfo').textContent),'footprint now 1,500 sf');
// handles in select tool
click($('[data-tool="select"]'));
ok($$('.vh').length===4,'four corner handles shown ('+$$('.vh').length+')');
// free-angle triangle closing on first point
click($('[data-tool="bpoly"]'));
$('#angMode').value='free';$('#angMode').dispatchEvent(new w.Event('change'));
const A=ft(100,0),B=ft(140,0),C=ft(120,30);
M.fire('click',{latlng:A});M.fire('mousemove',{latlng:B});M.fire('click',{latlng:B});M.fire('mousemove',{latlng:C});M.fire('click',{latlng:C});
M.fire('mousemove',{latlng:A});M.fire('click',{latlng:A});
ok(nBldg()===n0+2,'clicking the first corner closes the shape ('+nBldg()+' buildings)');
const lens3=$$('.segIn').map(i=>parseFloat(i.value));console.log('triangle sides:',lens3);
ok(lens3.length===3,'closed shape has 3 sides, no duplicate corner');
// export includes freeform flag
let dl={};w.URL.createObjectURL=()=>'blob:x';const OB=w.Blob;w.Blob=function(p,o){dl.last=p.join('');return new OB(p,o)};
w.HTMLAnchorElement.prototype.click=function(){dl[this.download]=dl.last};
click($('#xGeo'));const gj=JSON.parse(dl['site-plan.geojson']);
const ff=gj.features.filter(f=>f.properties.kind==='building'&&f.properties.freeform);
ok(ff.length===2,'GeoJSON marks 2 freeform buildings');
click($('#xDxf'));ok(/BUILDINGS/.test(dl['site-plan.dxf']),'DXF still exports');
// undo removes last building
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}));
ok(nBldg()===n0+1,'undo removes the triangle');
console.log('errors:',errors);ok(errors.length===0,'no page errors');
console.log(fails?('FAILED '+fails):'ALL DRAW TESTS PASS');
setTimeout(()=>process.exit(fails?1:0),100);})();
