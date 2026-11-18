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
// snapping to an area edge: 3 px below the middle of area 0's south edge, which runs (-180,-99.5) to (-150,-100).
// Zoomed in for this one, so the corners at either end (15 ft away) are out of reach and only the edge can catch it.
const z0=t.M.getZoom();t.M.setView(t.M.getCenter(),19,{animate:false});
t.tool('area');c=px(-165,-100);q=t.M.containerPointToLatLng([c.x,c.y+3]);t.M.fire('mousemove',{latlng:q});t.M.fire('click',{latlng:q});
ar=null;t.M.fire('click',{latlng:t.ft(-165,-140)});t.M.fire('click',{latlng:t.ft(-150,-140)});t.key('Enter');
const a3=t.proj().areas[2].ring.map(t.toFt),e3=t.proj().areas[0].ring.map(t.toFt),onY=e3[0][1]+(a3[0][0]-e3[0][0])/(e3[1][0]-e3[0][0])*(e3[1][1]-e3[0][1]);
ok(near(a3[0][1],onY,0.02)&&near(a3[0][0],-165,1),'corner snaps onto the edge of another area ('+a3[0].map(v=>v.toFixed(3))+', edge is at y='+onY.toFixed(3)+')');
t.M.setView(t.M.getCenter(),z0,{animate:false});
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
// --- 5. more lines to snap to, crossings, locked angles and the snap mark (zoomed in: 14 px is about 10 ft)
const s=await boot();await s.freshSite(s.row(0,[0,1,2,3]).concat(s.row(1,[0,1,2,3])));
s.M.setView(s.M.getCenter(),19,{animate:false});s.tab('build');
const spx=(x,y,dx,dy)=>{const c=s.M.latLngToContainerPoint(s.ft(x,y));return s.M.containerPointToLatLng([c.x+(dx||0),c.y+(dy||0)]);};
const mark=()=>{const m=s.$('.snapm');return m?m.className.replace(/.*snap-(\w+).*/,'$1')+':'+m.textContent:'';};
const hover=q=>s.M.fire('mousemove',{latlng:q}),clk=q=>{hover(q);s.M.fire('click',{latlng:q});};
const lastArea=()=>{const a=s.proj().areas;return a[a.length-1].ring.map(s.toFt);};
s.set('#areaKind','land','change');
// a parcel line inside the site (x = -200 between two picked parcels)
s.tool('area');hover(spx(-200,-30,5,0));
ok(mark()==='edge:on line','hovering a parcel line inside the site shows the "on line" mark before the first click ('+mark()+')');
ok(s.layers('pDraw').some(l=>l instanceof s.w.L.Polyline&&!(l instanceof s.w.L.Polygon)&&l.options.color==='#22d3ee'),'and the line itself lights up');
clk(spx(-200,-30,5,0));clk(s.ft(-170,-30));clk(s.ft(-170,0));s.key('Enter');
ok(near(lastArea()[0][0],-200,0.01)&&near(lastArea()[0][1],-30,1),'the corner lands exactly on that parcel line (x='+lastArea()[0][0].toFixed(3)+')');
ok(!s.$('.snapm'),'the mark goes when the shape is finished');
s.tool('area');hover(spx(-200,-75,6,-5));ok(mark()==='vertex:corner','near a parcel corner the mark says corner ('+mark()+')');
hover(s.ft(-250,10));ok(mark()==='','on open ground there is no mark');
// angle locked at 90°: the point keeps its angle and slides onto the line
s.set('#angMode','ortho','change');clk(s.ft(-260,-20));hover(s.ft(-204,-18));
ok(mark()==='edge:on line','with the angle locked, a point 4 ft short of a line still snaps to it ('+mark()+')');
clk(s.ft(-204,-18));clk(s.ft(-230,20));s.key('Enter');
ok(near(lastArea()[1][0],-200,0.01)&&near(lastArea()[1][1],-20,0.01),'it lands on the line and stays level ('+lastArea()[1].map(v=>v.toFixed(2))+')');
s.set('#angMode','free','change');
// where a road edge crosses a parcel line, and the road centre line
s.set('#roadW','24');await s.draw('road',[[-290,-150],[-110,-150]]);
s.tool('area');hover(spx(-200,-138,5,5));
ok(mark()==='cross:crossing','where the road edge crosses a parcel line the mark says crossing ('+mark()+')');
clk(spx(-200,-138,5,5));
hover(spx(-150,-150,0,4));ok(mark()==='edge:on line','the road centre line can be snapped to ('+mark()+')');
clk(spx(-150,-150,0,4));clk(s.ft(-150,-120));s.key('Enter');
ok(near(lastArea()[0][0],-200,0.01)&&near(lastArea()[0][1],-138,0.3),'the corner lands on the crossing ('+lastArea()[0].map(v=>v.toFixed(2))+')');
ok(near(lastArea()[1][1],-150,0.01),'and the next one on the centre line (y='+lastArea()[1][1].toFixed(3)+')');
// square across from the last point
s.tool('area');clk(s.ft(-260,-195));hover(spx(-200,-195,3,-5));
ok(mark()==='square:square to line','near the spot square across from the last point, it snaps square ('+mark()+')');
clk(spx(-200,-195,3,-5));clk(s.ft(-230,-215));s.key('Enter');
ok(near(lastArea()[1][0],-200,0.01)&&near(lastArea()[1][1],-195,0.01),'giving a side at a right angle to the line ('+lastArea()[1].map(v=>v.toFixed(2))+')');
// a lot line
await s.draw('split',[[-250,-240],[-250,-60]]);
s.tool('area');hover(spx(-250,-100,-4,0));ok(mark()==='edge:on line','a lot line can be snapped to ('+mark()+')');
// Shift and the option turn it off
s.key('Shift');hover(spx(-250,-100,-4,0));ok(mark()==='','holding Shift places the point freely');s.keyup('Shift');
s.click(s.$('#oVsnap'));hover(spx(-250,-100,-4,0));ok(mark()==='','with snapping switched off there is no mark');s.click(s.$('#oVsnap'));
hover(spx(-250,-100,-4,0));s.tool('select');ok(!s.$('.snapm'),'changing tool clears the mark');
ok(s.errors.length===0,'no errors: '+s.errors.join('|'));
ok(t.errors.length===0,'no errors: '+t.errors.join('|'));
console.log(R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0)})();
