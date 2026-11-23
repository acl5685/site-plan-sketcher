const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: two rows of four parcels = 400 ft (x -300..100) by 300 ft (y -225..75). Its north edge is y = 75.
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
const A=i=>t.proj().aprons[i||0];
const geo=()=>{t.click(t.$('#xGeo'));return JSON.parse(t.dl['site-plan.geojson']);};
const kinds=(g,k)=>g.features.filter(f=>f.properties.kind===k);
const ringFt=f=>f.geometry.coordinates[0].slice(0,-1).map(t.toFt);
const apL=()=>t.layers('pRoads').filter(l=>/apron-path/.test((l.options||{}).className||''));
const cls=c=>t.layers('pRoads').filter(l=>new RegExp('(^| )'+c+'( |$)').test((l.options||{}).className||''));
const info=()=>t.$('#xInfo').textContent;
const place=async(x,y)=>{t.tool('apron');t.M.fire('click',{latlng:t.ft(x,y)});await sleep(10);};
const px=(x,y,dx,dy)=>{const c=t.M.latLngToContainerPoint(t.ft(x,y));return t.M.containerPointToLatLng([c.x+(dx||0),c.y+(dy||0)]);};

// ---- the tool
ok(!!t.$('[data-tool="apron"]')&&t.$('[data-tool="apron"]').closest('.tgrp').querySelector('.tlab').textContent==='Roads & parking','the toolbar has an Apron tool, with the roads and parking');
ok(Array.from(t.$('#apronType').options).map(o=>o.value).join()==='full,res,riro,rin,rout,blvd,three,truck'&&t.$('#apronType').value==='full','the Build tab offers the eight kinds of apron, starting on full access');
t.tool('apron');ok(/Click where a drive meets the street/.test(t.$('#hint').textContent)&&t.$$('.tool.on')[0].dataset.tool==='apron','choosing it says what to do');

// ---- placing one: it lands on the site edge and faces out
await place(-100,79);
let a=A();
ok(t.proj().aprons.length===1&&a.type==='full'&&a.name==='Apron 1'&&a.w===26&&a.r===20&&a.depth===12,'a click near the north edge places a full-access apron: 26 ft throat, 20 ft radius, 12 ft deep ('+JSON.stringify({w:a.w,r:a.r,d:a.depth})+')');
let pf=t.toFt(a.pt);
ok(near(pf[0],-100,0.05)&&near(pf[1],75,0.05)&&near(a.dir,90,0.2),'it sits on the property line, facing north out of the site ('+pf.map(v=>v.toFixed(1))+', '+a.dir+'°)');
ok(!t.$('#insX').hidden&&t.$('#focusName').textContent==='Apron 1'&&t.$('#side').classList.contains('focus')&&t.$('#xType').value==='full'&&t.$('#xW').value==='26','it is selected, and the side panel shows its settings');
let g=geo(),af=kinds(g,'apron')[0],ar=ringFt(af);
ok(af.properties.lanesIn===1&&af.properties.lanesOut===1&&af.properties.typeName==='Full access, two-way','GeoJSON lists it: one lane in, one out');
ok(ar.every(p=>p[1]>=73-0.05&&p[1]<=87+0.05&&p[0]>=-125-0.05&&p[0]<=-75+0.05)&&ar.some(p=>near(p[0],-125,0.1)&&near(p[1],87,0.1))&&ar.some(p=>near(p[0],-75,0.1)&&near(p[1],87,0.1)),'the paving runs from the property line to the street 12 ft out, flaring by its corner radius to 50 ft wide at the street');
ok(kinds(g,'sight_triangle').length===2&&cls('apron-sight').length===2,'it has a sight triangle each way, drawn while it is selected');
ok(cls('apron-bar').length===1&&cls('apron-arrow').length===1&&cls('apron-line').length===1&&cls('apron-walk').length===1,'with a stop bar, lane arrows, a centre line and the sidewalk carried across');
ok(/1 in, 1 out/.test(info())&&/sight triangles clear for 280 ft/.test(info()),'the panel sums it up ('+info().slice(0,90)+')');

// ---- the eight kinds
const as=v=>{t.set('#xType',v,'change');const gg=geo();return {a:A(),p:kinds(gg,'apron')[0].properties,isl:kinds(gg,'apron_island'),sight:kinds(gg,'sight_triangle').length};};
let q=as('riro');
ok(q.a.w===44&&q.isl.length===1&&q.isl[0].properties.planted===false&&q.sight===1,'right-in / right-out: 44 ft throat, a raised triangle in the mouth, and a sight line to the left only');
q=as('rin');ok(q.p.lanesIn===1&&q.p.lanesOut===0&&q.sight===0&&cls('apron-bar').length===0&&t.$('#xSd').closest('.field').hidden,'right-in only: one lane in, no exit, so no stop bar and no sight triangle');
q=as('rout');ok(q.p.lanesIn===0&&q.p.lanesOut===1&&q.sight===1&&t.$('#xRt').disabled,'right-out only: one lane out, and no right-turn lane to offer');
q=as('blvd');ok(q.a.w===40&&q.isl.length===1&&q.isl[0].properties.planted===true&&cls('apron-median').length===1,'divided entrance: a planted median between the lanes');
q=as('three');ok(q.a.w===38&&q.p.lanesOut===2&&cls('apron-line').length===2,'three-lane: one in, a left-out and a right-out, with a lane line between them');
q=as('truck');ok(q.a.w===38&&q.a.r===40&&q.p.cornerRadiusFt===40,'truck entrance: 38 ft throat and 40 ft radii');
q=as('res');ok(q.a.w===12&&q.a.r===4&&q.p.markings===false&&t.$('#xMarks').disabled&&cls('apron-arrow').length===0,'residential driveway: 12 ft wide, no markings');
q=as('full');
// ---- its sizes
t.set('#xW','30');t.set('#xR','8');t.set('#xDepth','10');
ar=ringFt(kinds(geo(),'apron')[0]);
ok(A().w===30&&A().r===8&&A().depth===10&&ar.some(p=>near(p[0],-123,0.1)&&near(p[1],85,0.1)),'throat, radius and depth can be typed: 30 ft with 8 ft radii is 46 ft wide at the street, 10 ft out');
t.set('#xR','20');t.set('#xDepth','12');t.set('#xW','26');

// ---- a dedicated right-turn lane
t.click(t.$('#xRt'));
g=geo();let rt=kinds(g,'right_turn_lane')[0],rr=rt?ringFt(rt):[];
ok(A().rt===true&&!!rt&&rt.properties.storageFt===100&&rt.properties.taperFt===60&&rt.properties.widthFt===12,'ticking it adds a 12 ft right-turn lane: 100 ft of storage and a 60 ft taper');
ok(rr.every(p=>p[0]<=-100&&p[1]>=75-0.05&&p[1]<=87+0.05)&&rr.some(p=>near(p[0],-285,0.2))&&/right-turn lane: 100 ft of storage and a 60 ft taper/.test(info()),'it runs along the street upstream of the entrance (to the left, looking out), 185 ft back ('+Math.min(...rr.map(p=>p[0])).toFixed(0)+')');
t.set('#xRtLen','150');ok(A().rtLen===150&&ringFt(kinds(geo(),'right_turn_lane')[0]).some(p=>near(p[0],-335,0.2)),'its storage length can be changed');
t.click(t.$('#xRt'));ok(!A().rt&&kinds(geo(),'right_turn_lane').length===0,'and it can be taken off again');

// ---- sight triangle: something in the way is named
await t.draw('fence',[[-200,72],[-120,72]]);t.tool('select');await sleep(320);
apL()[0].fire('click',{latlng:t.c});await sleep(10);
ok(/sight triangles clear/.test(info()),'a fence 3 ft inside the line is clear of the sight triangle while the street is 12 ft out');
t.set('#xDepth','4');
ok(/in the sight triangle: Fence 1/.test(info()),'with the street only 4 ft out the driver waits further back, and the fence is in the way ('+info().slice(-110)+')');
t.tab('check');ok(/Apron 1: Fence 1 stands in its sight triangle/.test(t.$('#checks').textContent),'the Check tab flags it');t.tab('build');
t.set('#xDepth','12');
// ---- throat length: parking too close to the street
await t.draw('parkarea',t.rectPts(-130,8,-70,72));t.tool('select');await sleep(320);
apL()[0].fire('click',{latlng:t.c});await sleep(10);
ok(/ft from the property line to the nearest parking stall: short of the 40 ft/.test(info()),'parking right behind the entrance is called out as too short a throat ('+(info().match(/· (\d+) ft from the property line/)||[])[1]+' ft)');
t.tab('check');ok(/Apron 1: only \d+ ft from the property line to the nearest parking stall/.test(t.$('#checks').textContent),'and flagged on the Check tab');t.tab('build');

// ---- moving it: drag along the edge, keys, delete
const p0=t.toFt(A().pt);
apL()[0].fire('mousedown',{latlng:t.ft(-100,78),originalEvent:{}});t.M.fire('mousemove',{latlng:px(-100,78,2,1)});await sleep(30);t.M.fire('mouseup',{});await sleep(20);
ok(near(t.toFt(A().pt)[0],p0[0],1e-6),'a click with a slip of the hand does not move it');
await sleep(320);
apL()[0].fire('mousedown',{latlng:t.ft(-100,78),originalEvent:{}});t.M.fire('mousemove',{latlng:t.ft(-40,83)});await sleep(30);t.M.fire('mouseup',{});await sleep(20);
pf=t.toFt(A().pt);
ok(near(pf[0],-40,0.1)&&near(pf[1],75,0.05)&&near(A().dir,90,0.2),'dragging it slides it along the site edge, still on the line and facing out ('+pf.map(v=>v.toFixed(1))+')');
t.key('z',{ctrlKey:true});await sleep(320);apL()[0].fire('click',{latlng:t.c});await sleep(10);
ok(near(t.toFt(A().pt)[0],-100,0.1),'one undo puts it back');
// round the corner onto the east edge (x = 100): it turns to face east
apL()[0].fire('mousedown',{latlng:t.ft(-100,78),originalEvent:{}});t.M.fire('mousemove',{latlng:t.ft(104,-60)});await sleep(30);t.M.fire('mouseup',{});await sleep(20);
pf=t.toFt(A().pt);
ok(near(pf[0],100,0.05)&&near(pf[1],-60,0.1)&&near(normA(A().dir),0,0.2),'dragged to the east edge it turns to face east ('+pf.map(v=>v.toFixed(1))+', '+A().dir+'°)');
function normA(d){d=((d%360)+360)%360;return d>180?d-360:d;}
t.key('z',{ctrlKey:true});await sleep(320);apL()[0].fire('click',{latlng:t.c});await sleep(10);
t.key('e');ok(near(A().dir,75,0.01),'E turns it 15° clockwise');t.key('q');
t.key('ArrowRight',{shiftKey:true});ok(near(t.toFt(A().pt)[0],-95,0.02),'Shift+arrow nudges it 5 ft');t.key('ArrowLeft',{shiftKey:true});
t.click(t.$('#xFlip'));ok(near(normA(A().dir),-90,0.2),'Flip turns it to face the other way');
t.click(t.$('#xSnap'));ok(near(A().dir,90,0.2),'Snap to site edge faces it out again');
ok(t.$('#sbCopy').hidden&&t.$('#sbDup').hidden&&!t.$('#sbDel').hidden,'the map bar offers Delete for an apron, but not Copy or Duplicate');
t.key('c',{ctrlKey:true});t.key('v',{ctrlKey:true});ok(t.proj().aprons.length===1,'Ctrl+C / Ctrl+V leave it alone');
t.click(t.$('#focusDel'));ok(t.proj().aprons.length===0&&t.$('#insX').hidden,'Delete removes it');
t.key('z',{ctrlKey:true});ok(t.proj().aprons.length===1,'and undo brings it back');

// ---- on a drawn road: centred on it, and as wide
t.set('#roadW','30');await t.draw('road',[[40,-100],[40,120]]);
t.set('#apronType','blvd','change');
ok(t.$$('.tool.on')[0].dataset.tool==='apron','choosing a kind on the Build tab picks up the Apron tool');
t.set('#apronType','full','change');await place(52,81);
a=A(1);pf=t.toFt(a.pt);
ok(near(pf[0],40,0.05)&&near(pf[1],75,0.05)&&a.w===30&&a.name==='Apron 2','clicked 12 ft off a road that crosses the edge, the apron centres on the road and takes its 30 ft width ('+pf.map(v=>v.toFixed(1))+', '+a.w+' ft)');
// ---- off the site
await place(-100,200);
ok(t.proj().aprons.length===3&&/not on an edge of the site/.test(t.$('#toast').textContent)&&near(t.toFt(A(2).pt)[1],200,0.05),'a click nowhere near the site still places one, and says it is not on an edge');
t.key('Delete');ok(t.proj().aprons.length===2,'Delete takes it away');

// ---- saved, exported, reopened
t.tool('select');await sleep(320);apL()[0].fire('click',{latlng:t.c});await sleep(10);
t.set('#xType','riro','change');t.click(t.$('#xRt'));t.set('#xSd','390');t.click(t.$('#xWalk'));
g=geo();
t.click(t.$('#xCsv'));
ok(/"Apron","Type","Throat ft"/.test(t.dl['building-schedule.csv'])&&/"Apron 1","Right-in \/ right-out","44"/.test(t.dl['building-schedule.csv']),'the CSV lists the aprons');
t.click(t.$('#newBtn'));ok(t.proj().aprons.length===0,'New project clears them');
await openVia(t,file('plan.geojson',g));
const b=t.proj().aprons;
ok(b.length===2&&b[0].type==='riro'&&b[0].w===44&&b[0].rt===true&&b[0].sd===390&&b[0].walk===false&&near(b[0].dir,90,0.2)&&b[1].type==='full'&&b[1].w===30,'opening the GeoJSON brings both aprons back as they were ('+b.map(x=>x.type+' '+x.w).join(', ')+')');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
