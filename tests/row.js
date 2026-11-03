const {boot,ok,R,near}=require('./lib');
(async()=>{
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
const stat=()=>t.stat('Parking'),n=()=>+stat().v.split(' / ')[0];
ok(t.$('#lotPreset').value==='row'&&t.$('#lotAisle').value==='0'&&t.$('#lotSides').value==='left','default is a row of stalls, no aisle');
t.tool('lot');await t.draw('lot',[[-250,-100],[-50,-100]]);
let lot=t.proj().lots[0];
ok(lot&&lot.aisleW===0,'lot has no aisle');
ok(n()===20,'200 ft row of 10 ft stalls = 20 ('+stat().v+')');
// only one side, no paved aisle
ok(t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon).length===1,'only the stall polygons are drawn (no aisle road)');
ok(near(t.num(t.stat('Impervious').s),20*200,5),'paved area = stalls only ('+t.stat('Impervious').s+')');
// stalls on the left of travel (west->east = north side): y>-100
const rings=t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon)[0].getLatLngs();
const ys=rings.flat(2).map(ll=>t.toFt([ll.lng,ll.lat])[1]);
ok(Math.min(...ys)>-100.01&&Math.max(...ys)<-100+20.01,'stalls sit 20 ft deep on one side of the line');
t.tool('select');
// flip side with Flip
t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon)[0].fire('click',{latlng:t.c});
t.click(t.$('#pFlip'));
const ys2=t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon)[0].getLatLngs().flat(2).map(ll=>t.toFt([ll.lng,ll.lat])[1]);
ok(n()===20&&Math.max(...ys2)<-100+0.01&&Math.min(...ys2)>-100-20.01,'Flip puts the stalls on the other side ('+Math.min(...ys2).toFixed(1)+'..'+Math.max(...ys2).toFixed(1)+')');
// parallel: angle 0, 8 wide x 22 long -> floor(200/22)=9
t.set('#pAngle','0');t.set('#pStallW','8');t.set('#pStallD','22');
ok(n()===9,'parallel 22 ft stalls on 200 ft = 9 ('+stat().v+')');
const ys3=t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon)[0].getLatLngs().flat(2).map(ll=>t.toFt([ll.lng,ll.lat])[1]);
ok(near(Math.max(...ys3)-Math.min(...ys3),8,0.05),'parallel stalls are 8 ft off the line ('+(Math.max(...ys3)-Math.min(...ys3)).toFixed(2)+')');
t.set('#pStallD','20');ok(n()===10,'20 ft parallel stalls = 10');
// preset
t.tab('build');t.set('#lotPreset','par','change');ok(t.$('#lotAngle').value==='0'&&t.$('#lotStallD').value==='22'&&t.$('#lotAisle').value==='0','parallel preset fills fields');
// exports don't lose row lots
t.click(t.$('#xGeo'));const gj=JSON.parse(t.dl['site-plan.geojson']);const k={};gj.features.forEach(x=>k[x.properties.kind]=(k[x.properties.kind]||0)+1);
ok(k.parking_stall===10&&!k.parking_aisle,'GeoJSON: stalls only ('+JSON.stringify(k)+')');
t.set('#dxfCoords','local','change');t.click(t.$('#xDxf'));
ok((t.dl['site-plan.dxf'].match(/POLYLINE\n8\nSTRIPING\n/g)||[]).length===10,'DXF stalls');
// duplicate offsets stalls clear of the original
t.click(t.$('#pDup'));ok(t.proj().lots.length===2,'duplicate row');
ok(t.errors.length===0,'no errors '+t.errors.join());
console.log(R.pass,'passed',R.fails.length,'failed');
})();
