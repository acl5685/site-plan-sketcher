const {boot,ok,R,sleep,near}=require('./lib');
(async()=>{
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
const al=()=>t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon);
const bl=()=>t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon);
const ang=(r)=>Math.atan2(r[1][1]-r[0][1],r[1][0]-r[0][0])*180/Math.PI;
const ring=()=>t.proj().areas[0].ring.map(t.toFt);
// area slightly rotated, inside parcel
t.set('#areaKind','park','change');await t.draw('area',[[-250,-200],[-200,-200],[-200,-160],[-250,-160]],'free');
t.tool('select');al()[0].fire('click',{latlng:t.c});
ok(/square to the nearest edge/.test(t.$('#aInfo').textContent),'axis-aligned area reads "square to the nearest edge": '+t.$('#aInfo').textContent);
const key=(k,o)=>t.key(k,Object.assign({code:'Key'+k.toUpperCase()},o||{}));
key('e',{shiftKey:true});ok(near(ang(ring()),-1,0.001),'Shift+E turns 1 degree clockwise ('+ang(ring()).toFixed(4)+')');
key('e',{altKey:true,key:'é'});ok(near(ang(ring()),-1.1,0.001),'Alt+E turns 0.1 degree ('+ang(ring()).toFixed(4)+')');
ok(/1\.1° off the nearest edge/.test(t.$('#aInfo').textContent),'inspector shows how far off: '+t.$('#aInfo').textContent);
key('q',{altKey:true,key:'œ'});key('q',{shiftKey:true});
ok(near(ang(ring()),0,0.001),'Q undoes E exactly (back to '+ang(ring()).toFixed(5)+')');
// type odd angle then square
t.set('#aRotBy','7.3','change');ok(near(ang(ring()),-7.3,0.001),'rotate by 7.3 clockwise');
t.click(t.$('#aSq'));ok(near(ang(ring()),0,0.001)||near(Math.abs(ang(ring())),90,0.001),'Square to nearest edge returns it to parallel ('+ang(ring()).toFixed(4)+')');
ok(/Turned 7\.30°/.test(t.$('#hint').textContent),'hint says what it did: '+t.$('#hint').textContent);
t.click(t.$('#aSq'));ok(/Already square/.test(t.$('#hint').textContent),'second press says already square');
t.key('z',{ctrlKey:true});t.key('z',{ctrlKey:true});
// roads
t.set('#roadW','20');await t.draw('road',[[-280,-100],[-180,-90]],'free');t.tool('select');
t.layers('pRoads').find(l=>l instanceof t.w.L.Polygon).fire('click',{latlng:t.c});
const rp=()=>t.proj().roads[0].pts.map(t.toFt);
ok(Math.abs(ang(rp()))>5,'road starts ~5.7 off ('+ang(rp()).toFixed(2)+')');
t.click(t.$('#rSq'));ok(near(ang(rp()),0,0.001),'road squared to the property line ('+ang(rp()).toFixed(4)+')');
// freeform building: rotate fields + square
await t.draw('bpoly',[[-100,-200],[-60,-200],[-60,-170],[-100,-170]],'ortho');
ok(!t.$('#iFree').hidden,'freeform controls shown');
const fp=()=>t.proj().buildings.filter(b=>b.pts).pop().pts.map(t.toFt);
t.set('#iRotBy','12.5','change');ok(near(ang(fp()),-12.5,0.001),'freeform: rotate by 12.5 ('+ang(fp()).toFixed(3)+')');
ok(/12\.5° off the nearest edge/.test(t.$('#iInfo').textContent),'freeform info shows the error: '+t.$('#iInfo').textContent);
t.click(t.$('#iSq'));ok(near(ang(fp()),0,0.001),'freeform squared');
t.click(t.$('#iRotL'));ok(near(ang(fp()),15,0.001),'freeform rotate button = 15');
t.click(t.$('#iRotR'));ok(near(ang(fp()),0,0.001),'and back');
// rect building rotation field takes decimals
t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(-150,-120);t.tool('select');
t.set('#iRot','2.4');ok(t.proj().buildings.slice(-1)[0].rot===2.4,'rect building accepts 2.4 degrees');
key('e',{altKey:true,key:'é'});ok(near(t.proj().buildings.slice(-1)[0].rot,2.3,0.0001),'Alt+E on a building: 2.3 ('+t.proj().buildings.slice(-1)[0].rot+')');
// group square
t.key('Escape');
const L0=t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon);
L0[L0.length-1].fire('mousedown',{latlng:t.c,originalEvent:{shiftKey:true}});
const bs=t.proj().buildings;
// select all by marquee
t.key('Escape');
t.M.fire('mousedown',{latlng:t.ft(-320,-300),containerPoint:t.M.latLngToContainerPoint(t.ft(-320,-300)),originalEvent:{shiftKey:true}});
t.M.fire('mousemove',{latlng:t.ft(150,100),containerPoint:t.M.latLngToContainerPoint(t.ft(150,100))});t.M.fire('mouseup',{});await sleep(10);
ok(!t.$('#insM').hidden,'group selected');
t.key('e',{code:'KeyE',shiftKey:true});t.key('q',{code:'KeyQ',shiftKey:true});
t.click(t.$('#mSq'));
ok(/Turned|Already/.test(t.$('#hint').textContent),'group square runs: '+t.$('#hint').textContent);
// group drag snapping to a stationary building
t.key('Escape');
ok(t.errors.length===0,'no errors: '+t.errors.join('|'));
console.log(R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0)})();
