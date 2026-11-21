const {boot,ok,R,sleep,near}=require('./lib');
(async()=>{
// site: two rows of four parcels = 400 ft (x -300..100) by 300 ft (y -225..75)
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
const ring=i=>t.proj().areas[i].ring.map(t.toFt),prov=()=>+t.stat('Parking').v.split(' / ')[0];
const marks=cls=>Object.values(t.M._layers).filter(l=>l.options&&l.options.icon&&l.options.icon.options.className===cls);
const corners=()=>marks('vh'),mids=()=>marks('vh vhm');
const pull=(m,x,y,ev)=>{m.fire('dragstart');m.setLatLng(t.ft(x,y));m.fire('drag',ev||{});m.fire('dragend');};
const areaL=()=>t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon&&!/plant-path/.test(l.options.className||''));
const clickArea=async i=>{const l=areaL()[i];l.fire('mousedown',{latlng:t.c});l.fire('click',{latlng:t.c});t.M.fire('mouseup',{});await sleep(10);};
const dragFrom=async(layer,x0,y0,x1,y1)=>{layer.fire('mousedown',{latlng:t.ft(x0,y0),originalEvent:{}});t.key('Shift');t.M.fire('mousemove',{latlng:t.ft(x1,y1)});await sleep(40);t.M.fire('mouseup',{});await sleep(20);t.keyup('Shift');};

// ---- a parking area: 200 x 64 ft, two rows of 20 on one aisle
await t.draw('parkarea',t.rectPts(-250,-150,-50,-86));t.set('#aAng','90','change');t.tool('select');
const n0=prov();
ok(n0===40&&corners().length===4&&mids().length===4,'a selected parking area has a handle on each corner and one in the middle of each side ('+corners().length+' + '+mids().length+', '+n0+' stalls)');
ok(/drag it to move it/.test(t.$('#insA .shape-tip').textContent),'and its settings say how to reshape it');
// drag a corner: the outline follows, and the stalls are laid out again
const r0=ring(0),ci=r0.findIndex(p=>near(p[0],-50,0.5)&&near(p[1],-150,0.5));
t.key('Shift');pull(corners()[ci],-10,-150);t.keyup('Shift');
let r1=ring(0);
ok(near(r1[ci][0],-10,0.3)&&near(r1[ci][1],-150,0.3)&&r1.length===4,'dragging a corner moves just that corner ('+r1[ci].map(v=>v.toFixed(1))+')');
ok(prov()>n0,'and the bigger outline holds more stalls ('+n0+' → '+prov()+')');
t.key('z',{ctrlKey:true});ok(near(ring(0)[ci][0],-50,0.3)&&prov()===n0,'one undo puts the corner back');
// drag a mid-side handle: a new corner
await clickArea(0);
const mi=mids().findIndex(m=>{const p=t.toFt([m.getLatLng().lng,m.getLatLng().lat]);return near(p[1],-86,0.5);});
t.key('Shift');pull(mids()[mi],-150,-60);t.keyup('Shift');
r1=ring(0);
ok(r1.length===5&&r1.some(p=>near(p[0],-150,0.3)&&near(p[1],-60,0.3)),'dragging a mid-side handle pulls out a new corner ('+r1.length+' corners)');
ok(corners().length===5&&mids().length===5,'which gets handles of its own');
// double-click a corner: it goes
const ni=r1.findIndex(p=>near(p[0],-150,0.3)&&near(p[1],-60,0.3));
corners()[ni].fire('dblclick');
ok(ring(0).length===4&&prov()===n0,'double-clicking a corner removes it, back to the rectangle and its '+n0+' stalls');
corners()[0].fire('dblclick');ok(ring(0).length===3,'a fourth corner can go');
corners()[0].fire('dblclick');ok(ring(0).length===3,'but an outline keeps at least three');
t.key('z',{ctrlKey:true});await clickArea(0);
// a corner snaps to other shapes, but not to the area itself
t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','40');t.set('#tD','40');t.set('#tRot','0');t.placeAt(20,-150);   // building x 0..40, y -170..-130
t.tool('select');t.key('Escape');await clickArea(0);
const cj=ring(0).findIndex(p=>near(p[0],-50,0.5)&&near(p[1],-150,0.5));
pull(corners()[cj],-1.5,-131.5);
ok(near(ring(0)[cj][0],0,0.05)&&near(ring(0)[cj][1],-130,0.05),'a dragged corner snaps to the corner of a building nearby ('+ring(0)[cj].map(v=>v.toFixed(2))+')');
t.key('z',{ctrlKey:true});await clickArea(0);
const before=ring(0)[cj].slice();pull(corners()[cj],before[0]+0.8,before[1]+0.6);
ok(near(ring(0)[cj][0],before[0]+0.8,0.05)&&near(ring(0)[cj][1],before[1]+0.6,0.05),'and is not held by its own old position ('+ring(0)[cj].map(v=>v.toFixed(2))+')');
t.key('z',{ctrlKey:true});

// ---- drag the whole parking area
await clickArea(0);
const a0=ring(0);
await dragFrom(areaL()[0],-150,-118,-150,-88);
let a1=ring(0);
ok(a1.every((p,i)=>near(p[0],a0[i][0],0.1)&&near(p[1],a0[i][1]+30,0.1))&&prov()===n0,'pressing on the selected parking area and dragging moves all of it, stalls and all (30 ft north, still '+prov()+')');
ok(t.proj().areas.length===1&&!t.$('#insA').hidden,'it stays selected afterwards');
t.key('z',{ctrlKey:true});ok(near(ring(0)[0][1],a0[0][1],0.1),'one undo puts it back');
// not selected: a press and drag on it leaves it where it is (the map pans instead)
t.key('Escape');
await dragFrom(areaL()[0],-150,-118,-150,-88);
ok(near(ring(0)[0][1],a0[0][1],0.01),'an area that is not selected does not move when dragged across');
// its stalls can be grabbed too
await sleep(320);await clickArea(0);
const st=t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon&&l.options.color==='#f8f9fa')[0];
await dragFrom(st,-150,-140,-130,-140);
ok(near(ring(0)[0][0],a0[0][0]+20,0.1),'grabbing it by its stalls moves it as well');
t.key('z',{ctrlKey:true});

// ---- other shapes drawn point by point: open space, a road
t.set('#areaKind','open','change');await t.draw('area',t.rectPts(-250,0,-200,40));t.tool('select');await sleep(320);await clickArea(1);
ok(corners().length===4&&mids().length===4,'open space has the same handles');
t.key('Shift');pull(corners()[0],-270,-10);t.keyup('Shift');
ok(ring(1).some(p=>near(p[0],-270,0.3)&&near(p[1],-10,0.3)),'and its corners drag');
t.set('#roadW','24');await t.draw('road',[[-280,-200],[-100,-200]]);t.tool('select');
t.layers('pRoads').find(l=>l instanceof t.w.L.Polygon).fire('click',{latlng:t.c});
ok(corners().length===2&&mids().length===1,'a road has a handle at each end and one mid-way ('+corners().length+' + '+mids().length+')');
t.key('Shift');pull(mids()[0],-190,-180);t.keyup('Shift');
const rp=t.proj().roads[0].pts.map(t.toFt);
ok(rp.length===3&&near(rp[1][0],-190,0.3)&&near(rp[1][1],-180,0.3),'dragging the middle handle bends the road through a new point ('+rp.length+' points)');
corners()[1].fire('dblclick');ok(t.proj().roads[0].pts.length===2,'double-click straightens it again');
corners()[0].fire('dblclick');ok(t.proj().roads[0].pts.length===2,'a road keeps at least two points');
// a group has no corner handles
const sh={originalEvent:{shiftKey:true}};
t.key('Escape');areaL()[0].fire('click',Object.assign({latlng:t.c},sh));areaL()[1].fire('click',Object.assign({latlng:t.c},sh));
ok(t.$('#mCount').textContent==='2'&&corners().length===0&&mids().length===0,'with two shapes selected there are no corner handles');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
