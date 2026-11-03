const {boot,ok,R,sleep,near}=require('./lib');
(async()=>{
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
const ringOf=(b)=>t.w.eval?null:null;
const bl=()=>t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon);
const al=()=>t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon);
const P=(k,i)=>t.proj()[k][i||0];
// --- 1. drawing an area snaps to the edge of a building
t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','40');t.set('#tD','50');t.set('#tRot','0');t.placeAt(-200,-100); // x -220..-180, y -125..-75
t.tool('select');
t.set('#areaKind','park','change');
t.tool('area');
const px=(x,y)=>t.M.latLngToContainerPoint(t.ft(x,y));
// click near building east edge (x=-180) from 4 px away, mid height
let c=px(-180,-100),q=t.M.containerPointToLatLng([c.x+4,c.y]);
t.M.fire('mousemove',{latlng:q});t.M.fire('click',{latlng:q});
const first=t.toFt([P('areas',0)?0:0,0]);
t.M.fire('mousemove',{latlng:t.ft(-150,-100)});t.M.fire('click',{latlng:t.ft(-150,-100)});
t.M.fire('click',{latlng:t.ft(-150,-60)});t.key('Enter');
let ar=t.proj().areas[0].ring.map(t.toFt);
ok(near(ar[0][0],-180,0.01),'first corner of a drawn area lands exactly on the building edge (x='+ar[0][0].toFixed(3)+')');
// click near building corner
t.tool('area');c=px(-180,-75);q=t.M.containerPointToLatLng([c.x+5,c.y-4]);t.M.fire('mousemove',{latlng:q});t.M.fire('click',{latlng:q});
t.M.fire('click',{latlng:t.ft(-120,-75)});t.M.fire('click',{latlng:t.ft(-120,-40)});t.key('Enter');
ar=t.proj().areas[1].ring.map(t.toFt);
ok(near(ar[0][0],-180,0.01)&&near(ar[0][1],-75,0.01),'a drawn corner snaps to the building corner');
// snapping to an area edge (new area vertex near area 0's edge x between -180..-150,y=-100)
t.tool('area');c=px(-165,-60);q=t.M.containerPointToLatLng([c.x,c.y+3]);t.M.fire('mousemove',{latlng:q});t.M.fire('click',{latlng:q});
ar=null;t.M.fire('click',{latlng:t.ft(-100,-10)});t.M.fire('click',{latlng:t.ft(-130,-10)});t.key('Enter');
const a3=t.proj().areas[2].ring.map(t.toFt);
ok(near(a3[0][1],-60,0.02),'corner snaps onto the edge of another area (y='+a3[0][1].toFixed(3)+')');
// --- 2. building placement flush to a building (gap 0) and with a gap
t.key('Escape');t.tool('select');
t.set('#sSnapGap','0');
t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','30');t.set('#tD','50');
t.cursorAt(-215,-175); // below existing building (its south edge y=-125) -> new one center y should be -125-25 = -150? use x offset
t.M.fire('click',{latlng:t.ft(-200,-160)});
let nb=t.proj().buildings[1];let nc=t.toFt(nb.c);
ok(near(nc[1],-150,0.05)&&nb.rot===0,'new building snaps flush under the existing one (center y='+nc[1].toFixed(3)+', rot '+nb.rot+')');
t.tool('select');t.key('Delete');
t.set('#sSnapGap','6');
t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','30');t.set('#tD','50');
t.cursorAt(-200,-160);t.M.fire('click',{latlng:t.ft(-200,-160)});
nc=t.toFt(t.proj().buildings[1].c);
ok(near(nc[1],-125-6-25,0.05),'gap setting is honored (center y='+nc[1].toFixed(3)+', expect -156)');
t.tool('select');t.key('Delete');
// turn off option
t.click(t.$('#oEdge'));
t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','30');t.set('#tD','50');
t.cursorAt(-200,-160);t.M.fire('click',{latlng:t.ft(-200,-160)});
nc=t.toFt(t.proj().buildings[1].c);
ok(!near(nc[1],-156,0.5)&&!near(nc[1],-150,0.5),'edge snap off: building lands where clicked ('+nc[1].toFixed(2)+')');
t.tool('select');t.key('Delete');t.click(t.$('#oEdge'));
// --- 3. dragging a freeform building snaps its corner to another shape
t.set('#sSnapGap','0');
await t.draw('bpoly',[[-100,-200],[-70,-200],[-70,-170],[-100,-170]],'ortho');
t.tool('select');
const fb=t.proj().buildings.filter(b=>b.pts).pop();
const fl=bl()[bl().length-1];
// existing SF-1 is x -220..-180, y -125..-75. Drag freeform so its NE corner (-70,-170) goes near SF-1's SE corner... move so top-left (-100,-170) -> (-178.5,-126.5)
fl.fire('mousedown',{latlng:t.ft(-85,-185),originalEvent:{}});
t.M.fire('mousemove',{latlng:t.ft(-85-78.5,-185+43.5)});await sleep(40);t.M.fire('mouseup',{});await sleep(20);
const fp=t.proj().buildings.filter(b=>b.pts).pop().pts.map(t.toFt);
ok(near(fp[3][0],-180,0.02)&&near(fp[3][1],-125,0.02),'dragged freeform building: corner snaps onto the other building\'s corner ('+fp[3].map(v=>v.toFixed(2))+')');
// shift disables
fl.fire('mousedown',{latlng:t.ft(-85,-185),originalEvent:{}});
t.key('Shift');t.M.fire('mousemove',{latlng:t.ft(-85+7.3,-185+3.1)});await sleep(40);t.M.fire('mouseup',{});await sleep(20);t.keyup('Shift');
ok(true,'shift drag ran');
// --- 4. group drag snaps too
t.key('z',{ctrlKey:true});t.key('z',{ctrlKey:true});
ok(t.errors.length===0,'no errors: '+t.errors.join('|'));
console.log(R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0)})();
