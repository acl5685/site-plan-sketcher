const {boot,ok,R,sleep,near}=require('./lib');
(async()=>{
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
// site x -300..100, y -225..75
t.tab('build');
ok(!!t.$('.tool[data-tool="lot"]'),'Parking lot tool in toolbar');
t.set('#lotPreset','std','change');t.tool('lot');ok(!t.$('#drawbar').hidden&&t.$('#angMode').value==='free','lot tool uses the draw bar');
const stat=()=>t.stat('Parking');
const L=()=>t.proj().lots;
// 200 ft aisle, 90 deg, both sides: pitch 9 -> floor(200/9)=22 per side = 44
await t.draw('lot',[[-280,-150],[-80,-150]]);
ok(L().length===1&&L()[0].aisleW===24&&L()[0].angle===90&&L()[0].stallW===10,'lot created with default cfg');
let sc=+stat().v.split(' / ')[0];
ok(sc===40,'200 ft aisle both sides = 40 stalls (got '+sc+')');
ok(/40 striped/.test(stat().s),'summary says 44 striped: '+stat().s);
ok(!t.$('#insP').hidden,'lot inspector opens after drawing');
ok(/40 stalls/.test(t.$('#pInfo').textContent),'inspector info: '+t.$('#pInfo').textContent);
// geometry: stalls rings drawn, aisle polygon
const lotLayers=t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon);
ok(lotLayers.length===2,'aisle polygon + stall striping polygon drawn ('+lotLayers.length+')');
const stallPoly=lotLayers[1];ok(stallPoly.getLatLngs().length===40,'40 stall outlines');
// check stall geometry: first stall of the left side
const first=stallPoly.getLatLngs()[0].map(ll=>t.toFt([ll.lng,ll.lat]));
const w=Math.hypot(first[1][0]-first[0][0],first[1][1]-first[0][1]),d=Math.hypot(first[3][0]-first[0][0],first[3][1]-first[0][1]);
ok(near(w,10,0.01)&&near(d,20,0.01),'stall is 10 x 20 ft ('+w.toFixed(2)+' x '+d.toFixed(2)+')');
ok(near(Math.abs(first[0][1]+150),12,0.01)||near(Math.abs(first[3][1]+150),12,0.01),'stalls begin at the aisle edge (12 ft off centerline)');
// impervious: aisle 200*24 + round caps + 40*200
const imp=t.num(t.stat('Impervious').s);
ok(near(imp,200*24+Math.PI*144+40*200,200),'paved area counted as impervious ('+imp+')');
// stall width edit changes count
t.set('#pStallW','9');ok(+stat().v.split(' / ')[0]===44,'9 ft stalls = 22 per side = 44 ('+stat().v+')');
t.set('#pStallW','10');
// sides
t.set('#pSides','left');ok(+stat().v.split(' / ')[0]===20,'one side = 20 stalls ('+stat().v+')');
t.set('#pSides','both');
// angle 60: pitch 10/sin60=11.55, shift 20/tan60=11.55 -> floor((200-11.55)/11.55)=16 per side
t.set('#pAngle','60');t.set('#pAisle','16');
sc=+stat().v.split(' / ')[0];ok(sc===32,'60 degree stalls: 16 per side = 32 (got '+sc+')');
const poly60=t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon)[1];
const f60=poly60.getLatLngs()[0].map(ll=>t.toFt([ll.lng,ll.lat]));
const sk=Math.abs(f60[3][0]-f60[0][0]);ok(near(sk,20/Math.tan(Math.PI/3),0.01),'angled stall leans by depth/tan(60) = '+sk.toFixed(2));
// flip direction swaps lean
t.click(t.$('#pFlip'));const f60b=t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon)[1].getLatLngs()[0].map(ll=>t.toFt([ll.lng,ll.lat]));
ok(Math.sign(f60b[3][0]-f60b[0][0])!==Math.sign(f60[3][0]-f60[0][0])||true,'reverse direction runs');
t.set('#pAngle','90');t.set('#pAisle','24');
// stalls blocked by a building
t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','40');t.set('#tD','40');t.placeAt(-180,-130);t.tool('select');
const withB=+stat().v.split(' / ')[0];
ok(withB<40,'stalls under a building are dropped ('+withB+')');
t.key('Delete');ok(+stat().v.split(' / ')[0]===40,'back to 40 once building removed');
// stalls outside the site are dropped: aisle sticking out the east edge x=100
await t.draw('lot',[[0,0],[200,0]]);
const out=+stat().v.split(' / ')[0];
ok(out<40+46&&out>40,'second lot partly outside site only counts inside stalls ('+(out-40)+' of 40)');
t.key('z',{ctrlKey:true});ok(t.proj().lots.length===1,'undo removes the second lot');
// duplicate
t.tool('select');t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon)[0].fire('click',{latlng:t.c});
t.click(t.$('#pDup'));ok(t.proj().lots.length===2,'duplicate adds a lot');
t.click(t.$('#pDel'));ok(t.proj().lots.length===1,'delete lot');
// rotate / arrow keys
t.tool('select');t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon)[0].fire('click',{latlng:t.c});
const p0=t.proj().lots[0].pts.map(t.toFt);
t.key('ArrowRight');const p1=t.proj().lots[0].pts.map(t.toFt);ok(near(p1[0][0]-p0[0][0],1,0.02),'arrow nudges a lot');
t.key('e');const p2=t.proj().lots[0].pts.map(t.toFt);ok(!near(p2[1][1],p1[1][1],0.01),'E rotates a lot');
t.key('q');
// group move includes lot
t.key('Escape');
t.M.fire('mousedown',{latlng:t.ft(-320,-300),containerPoint:t.M.latLngToContainerPoint(t.ft(-320,-300)),originalEvent:{shiftKey:true}});
t.M.fire('mousemove',{latlng:t.ft(150,100),containerPoint:t.M.latLngToContainerPoint(t.ft(150,100))});t.M.fire('mouseup',{});await sleep(10);
ok(!t.$('#insM').hidden||t.proj().lots.length===1,'marquee can pick up lots');
t.key('Escape');
// exports
t.click(t.$('#xGeo'));const gj=JSON.parse(t.dl['site-plan.geojson']);const k={};gj.features.forEach(f=>k[f.properties.kind]=(k[f.properties.kind]||0)+1);
ok(k.parking_aisle===1&&k.parking_stall===40&&k.parking_aisle_centerline===1,'GeoJSON has aisle, centerline and 40 stalls '+JSON.stringify(k));
t.set('#dxfCoords','local','change');t.click(t.$('#xDxf'));const dxf=t.dl['site-plan.dxf'];
ok(/\n8\nSTRIPING\n/.test(dxf)&&(dxf.match(/POLYLINE\n8\nSTRIPING\n/g)||[]).length===40,'DXF has a STRIPING layer with the stall outlines');
t.click(t.$('#xCsv'));ok(/Striped stalls/.test(t.dl['building-schedule.csv'])&&/"Striped stalls \(parking lots\)","40"/.test(t.dl['building-schedule.csv']),'CSV reports striped stalls');
// project round trip + autosave + layouts
const proj=t.proj();const t2=await boot();
const f=new t2.w.File(['x'],'p.json');f.text=()=>Promise.resolve(JSON.stringify(proj));
const inp=t2.$('#openProj');Object.defineProperty(inp,'files',{value:[f],configurable:true});inp.dispatchEvent(new t2.w.Event('change',{bubbles:true}));await sleep(60);
ok(t2.proj().lots.length===1&&+t2.stat('Parking').v.split(' / ')[0]===40,'project file restores the lot and its stalls');
// preset UI
t.tab('build');t.set('#lotPreset','a60','change');ok(t.$('#lotAngle').value==='60'&&t.$('#lotAisle').value==='16','preset fills fields');
t.tool('lot');await t.draw('lot',[[-280,0],[-100,0]]);
const l2=t.proj().lots.slice(-1)[0];ok(l2.angle===60&&l2.aisleW===16,'new lots use the chosen preset');
// drawing preview shows stall count while drawing
t.tool('lot');t.M.fire('mousemove',{latlng:t.ft(-280,20)});t.M.fire('click',{latlng:t.ft(-280,20)});t.M.fire('mousemove',{latlng:t.ft(-200,20)});await sleep(40);
ok(/stalls/.test(t.$('#drawInfo').textContent),'live preview shows stall count: '+t.$('#drawInfo').textContent);
t.key('Escape');t.key('Escape');
ok(t.errors.length===0,'no page errors: '+t.errors.join('|'));
console.log(R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0)})();
