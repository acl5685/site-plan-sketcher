const {boot,ok,R,sleep,near}=require('./lib');
(async()=>{
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(-250,-120);t.placeAt(-150,-120);
t.set('#areaKind','land','change');await t.draw('area',t.rectPts(-60,-150,-20,-100));
t.set('#roadW','20');await t.draw('road',[[-280,-190],[-100,-190]]);
t.tool('select');
const bl=()=>t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon);
const al=()=>t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon);
const rl=()=>t.layers('pRoads').filter(l=>l instanceof t.w.L.Polygon);
const sh={originalEvent:{shiftKey:true}};
const P=()=>({b:t.proj().buildings.map(b=>t.toFt(b.c)),a:t.proj().areas[0].ring.map(t.toFt),r:t.proj().roads[0].pts.map(t.toFt)});
// shift-click toggling
bl()[0].fire('mousedown',Object.assign({latlng:t.ft(-250,-120)},sh));
ok(t.$('#insM').hidden,'one shift-click selects a single shape (no group panel yet)');
bl()[1].fire('mousedown',Object.assign({latlng:t.ft(-150,-120)},sh));
ok(!t.$('#insM').hidden&&t.$('#mCount').textContent==='2','second shift-click starts a group of 2');
al()[0].fire('click',Object.assign({latlng:t.c},sh));
rl()[0].fire('click',Object.assign({latlng:t.c},sh));
ok(t.$('#mCount').textContent==='4','building, building, area and road all join the group');
ok(t.$('#insB').hidden&&t.$('#insA').hidden&&t.$('#insR').hidden,'single-shape panels hidden during a group');
al()[0].fire('click',Object.assign({latlng:t.c},sh));
ok(t.$('#mCount').textContent==='3','shift-click again removes a shape');
al()[0].fire('click',Object.assign({latlng:t.c},sh));
// move via fields
const p0=P();
t.set('#mDx','12');t.set('#mDy','-7');t.click(t.$('#mMove'));
let p1=P();
ok(near(p1.b[0][0]-p0.b[0][0],12,0.02)&&near(p1.b[1][1]-p0.b[1][1],-7,0.02)&&near(p1.a[0][0]-p0.a[0][0],12,0.02)&&near(p1.r[1][1]-p0.r[1][1],-7,0.02),'Move applies the same shift to buildings, area and road');
// arrows
t.key('ArrowLeft',{shiftKey:true});let p2=P();
ok(near(p2.b[0][0]-p1.b[0][0],-5,0.02)&&near(p2.a[2][0]-p1.a[2][0],-5,0.02)&&near(p2.r[0][0]-p1.r[0][0],-5,0.02),'Shift+arrow moves the whole group 5 ft');
t.key('ArrowUp');let p3=P();ok(near(p3.b[1][1]-p2.b[1][1],1,0.02)&&near(p3.r[0][1]-p2.r[0][1],1,0.02),'arrow moves the group 1 ft');
// group drag
bl()[0].fire('mousedown',{latlng:t.ft(-243,-127),originalEvent:{}});
t.M.fire('mousemove',{latlng:t.ft(-223,-107)});await sleep(40);t.M.fire('mouseup',{});await sleep(20);
let p4=P();
ok(near(p4.b[0][0]-p3.b[0][0],20,0.1)&&near(p4.b[1][0]-p3.b[1][0],20,0.1)&&near(p4.a[0][0]-p3.a[0][0],20,0.1)&&near(p4.r[1][1]-p3.r[1][1],20,0.1),'dragging one member drags the whole group (20 east, 20 north)');
t.key('z',{ctrlKey:true});let p5=P();ok(near(p5.b[0][0],p3.b[0][0],0.05),'one undo reverses the whole drag');
ok(t.$('#insM').hidden,'undo drops the selection');
await sleep(350);
bl()[0].fire('mousedown',Object.assign({latlng:t.c},sh));
bl()[1].fire('mousedown',Object.assign({latlng:t.c},sh));
al()[0].fire('click',Object.assign({latlng:t.c},sh));
const q0=P();const d0=Math.hypot(q0.b[0][0]-q0.b[1][0],q0.b[0][1]-q0.b[1][1]);
const rot0=t.proj().buildings[0].rot;
t.key('e');t.key('e');t.key('e');t.key('e');t.key('e');t.key('e'); // 6 x 15 = 90 clockwise
const q1=P(),d1=Math.hypot(q1.b[0][0]-q1.b[1][0],q1.b[0][1]-q1.b[1][1]);
ok(near(d0,d1,0.05),'rotation keeps distance between buildings');
ok(near(Math.abs(q1.b[0][1]-q1.b[1][1]),d0,0.1),'90 degree turn swaps the east-west gap into a north-south gap');
ok(near(((t.proj().buildings[0].rot-rot0)%360+360)%360,270,0.01),'each rectangle turns 90 clockwise (rot ccw-positive: -90)');
console.log('AREA',JSON.stringify(t.proj().areas[0].ring.map(t.toFt).map(p=>p.map(v=>+v.toFixed(1)))),t.proj().areas.length);const ring=t.proj().areas[0].ring.map(t.toFt),w=Math.hypot(ring[1][0]-ring[0][0],ring[1][1]-ring[0][1]);
ok(near(w,40,0.1)&&Math.abs(ring[1][0]-ring[0][0])<0.1,'area rotated too: its 40 ft side now runs north-south');
t.key('q');t.key('q');t.key('q');t.key('q');t.key('q');t.key('q');
const q2=P();ok(near(q2.b[0][0],q0.b[0][0],0.05)&&near(q2.b[0][1],q0.b[0][1],0.05),'Q reverses E exactly');
// clear / Esc
t.key('Escape');ok(t.$('#insM').hidden,'Escape clears the group');
// marquee: drag a box around the two buildings only (x -300..-100, y -170..-70)
t.M.fire('mousedown',{latlng:t.ft(-305,-70),containerPoint:t.M.latLngToContainerPoint(t.ft(-305,-70)),originalEvent:{shiftKey:true}});
t.M.fire('mousemove',{latlng:t.ft(-100,-175),containerPoint:t.M.latLngToContainerPoint(t.ft(-100,-175))});
t.M.fire('mouseup',{});await sleep(10);
const m1=t.$('#mCount').textContent;
ok(!t.$('#insM').hidden&&m1==='2','marquee selects shapes fully inside the box ('+m1+')');
// marquee over everything
t.key('Escape');
t.M.fire('mousedown',{latlng:t.ft(-320,-300),containerPoint:t.M.latLngToContainerPoint(t.ft(-320,-300)),originalEvent:{shiftKey:true}});
t.M.fire('mousemove',{latlng:t.ft(150,100),containerPoint:t.M.latLngToContainerPoint(t.ft(150,100))});
t.M.fire('mouseup',{});await sleep(10);
ok(t.$('#mCount').textContent==='4','marquee around everything selects all 4');
t.M.fire('click',{latlng:t.ft(0,0)});
ok(!t.$('#insM').hidden,'the click that ends a marquee does not clear the selection');
// delete group
t.click(t.$('#mDel'));
const pr=t.proj();ok(pr.buildings.length===0&&pr.areas.length===0&&pr.roads.length===0,'Delete selected removes the whole group');
t.key('z',{ctrlKey:true});const pr2=t.proj();ok(pr2.buildings.length===2&&pr2.areas.length===1&&pr2.roads.length===1,'one undo restores all of them');
// freeform building in group
t.tab('build');await t.draw('bpoly',[[-20,-60],[20,-60],[20,-30],[-20,-30]],'ortho');
t.tool('select');
const f=t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon);
f[0].fire('mousedown',Object.assign({latlng:t.c},sh));
const fb=t.proj().buildings.filter(b=>b.pts)[0];const fp0=fb.pts.map(t.toFt);
console.log('FP',t.$('#mCount').textContent,t.$('#insM').hidden,t.proj().buildings.length);t.key('ArrowRight');const fp1=t.proj().buildings.filter(b=>b.pts)[0].pts.map(t.toFt);
ok(near(fp1[0][0]-fp0[0][0],1,0.02),'freeform building moves with the group');
t.key('e');
const fq=t.proj().buildings.filter(b=>b.pts)[0].pts.map(t.toFt);
ok(near(Math.hypot(fq[1][0]-fq[0][0],fq[1][1]-fq[0][1]),40,0.05),'freeform side length survives group rotation');
ok(t.errors.length===0,'no page errors: '+t.errors.join('|'));
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0)})();
