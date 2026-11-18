const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: two rows of four parcels = x -300..100, y -225..75 (120,000 sf)
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
const imp=()=>t.num(t.stat('Impervious').s),green=()=>t.num(t.stat('Green space').v),chk=()=>t.$('#checks').textContent;
const geo=()=>{t.click(t.$('#xGeo'));return JSON.parse(t.dl['site-plan.geojson']);};
const kinds=(g,k)=>g.features.filter(f=>f.properties.kind===k);
const rl=()=>t.layers('pRoads').filter(l=>l instanceof t.w.L.Polygon);
const walkLayers=()=>rl().filter(l=>/walk-path/.test(l.options.className));
const box=ring=>{const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];};

// ---- the Sidewalk tool: a walk drawn by its line
ok(!!t.$('[data-tool="walk"]')&&t.$('[data-tool="walk"]').textContent==='Sidewalk','toolbar has a Sidewalk button');
t.tool('walk');
ok(!t.$('#drawbar').hidden&&/middle of the sidewalk/.test(t.$('#hint').textContent)&&t.$('#walkW').value==='5','Sidewalk is a drawing tool with its own hint; the width starts at 5 ft');
await t.draw('walk',[[-250,-150],[-50,-150]]);
let r=t.proj().roads;
ok(r.length===1&&r[0].walk===true&&r[0].name==='Sidewalk 1'&&r[0].width===5,'a 200 ft walk is saved as Sidewalk 1, 5 ft wide ('+JSON.stringify([r[0].name,r[0].width])+')');
ok(!t.$('#insR').hidden&&t.$('#rHead').textContent==='Selected sidewalk'&&t.$('#rSwRow').hidden&&/^200 ft long · 1,000 sf/.test(t.$('#rInfo').textContent),'it is selected: Selected sidewalk, 200 ft long, 1,000 sf ('+t.$('#rInfo').textContent+')');
ok(walkLayers().length===1&&walkLayers()[0].options.fillColor==='#dee2e6','drawn in light concrete, not as a road');
ok(near(imp(),1000+3.14*2.5*2.5,40)&&green()<100,'its 1,000 sf counts as impervious, and comes off green space ('+imp()+' sf, '+green()+'%)');
t.set('#rWidth','8');ok(t.proj().roads[0].width===8&&near(imp(),1600+3.14*16,60),'widened to 8 ft: 1,600 sf ('+imp()+')');
t.set('#rWidth','5');
// not a street: no road setback, and parking does not open onto it
t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','40');t.set('#tD','50');t.set('#tRot','0');t.placeAt(-150,-180);t.tool('select');t.key('Escape');
ok(/meets the current rules/.test(chk())&&!/road/.test(chk()),'a house 2.5 ft from the walk is not flagged for a road setback ('+chk().slice(0,60)+')');
t.key('z',{ctrlKey:true});
await t.draw('parkarea',t.rectPts(-240,-214,-60,-86));     // 180 x 128, the walk runs through the middle of it
const g1=geo(),st1=kinds(g1,'parking_stall').map(f=>f.geometry.coordinates[0].slice(0,4).map(t.toFt));
ok(st1.length>20&&st1.every(q=>{const b=box(q);return b[3]<=-152.4||b[1]>=-147.6;}),'a walk through a parking area is kept clear of stalls ('+st1.length+' stalls)');
ok(/no road reaches/.test(t.$('#aInfo').textContent),'and it does not count as the road the aisles need');
t.key('Delete');
// copy and paste
t.tool('select');const wl=walkLayers()[0];wl.fire('click',{latlng:t.ft(-150,-150),originalEvent:{}});
t.key('c',{ctrlKey:true});t.key('Shift');t.cursorAt(-150,-30);t.keyup('Shift');t.key('v',{ctrlKey:true});
r=t.proj().roads;ok(r.length===2&&r[1].walk===true&&r[1].name==='Sidewalk 2','a copied walk is Sidewalk 2');
t.key('Delete');

// ---- sidewalks along a road
t.key('Escape');t.set('#roadW','24');await t.draw('road',[[-280,0],[80,0]]);
t.tool('select');const road=()=>rl().find(l=>!/walk-path/.test(l.options.className));
road().fire('click',{latlng:t.ft(-100,0),originalEvent:{}});
ok(t.$('#rHead').textContent==='Selected road'&&!t.$('#rSwRow').hidden&&t.$('#rSw').value===''&&t.$$('#rSwRow .r-sw').every(e=>e.hidden),'a road has a Sidewalks along it setting, off to start');
const imp0=imp();
t.set('#rSw','both','change');
r=t.proj().roads.find(x=>!x.walk);
ok(r.sw&&r.sw.side==='both'&&r.sw.w===5&&r.sw.gap===0&&t.$('#rSwW').value==='5','Both sides: 5 ft walks at the road edge ('+JSON.stringify(r.sw)+')');
let g=geo(),sw=kinds(g,'sidewalk').filter(f=>f.properties.road==='Road 1').map(f=>box(f.geometry.coordinates[0].map(t.toFt)));
sw.sort((a,b)=>a[1]-b[1]);
ok(sw.length===2&&near(sw[0][1],-17,0.05)&&near(sw[0][3],-12,0.05)&&near(sw[1][1],12,0.05)&&near(sw[1][3],17,0.05),'the strips run 12 to 17 ft either side of the centre line ('+JSON.stringify(sw.map(b=>[b[1].toFixed(1),b[3].toFixed(1)]))+')');
ok(near(sw[0][0],-280,0.05)&&near(sw[0][2],80,0.05),'for the length of the road');
ok(near(imp()-imp0,2*360*5,60),'720 ft of 5 ft walk adds 3,600 sf of impervious ('+(imp()-imp0).toFixed(0)+')');
ok(/720 ft of sidewalk, 3,600 sf/.test(t.$('#rInfo').textContent),'the inspector says so ('+t.$('#rInfo').textContent+')');
ok(walkLayers().length===2,'both strips are drawn (plus the walk drawn earlier)');
// a tree lawn pushes the walk out, and is not paved
t.set('#rSwGap','6');g=geo();sw=kinds(g,'sidewalk').filter(f=>f.properties.road==='Road 1').map(f=>box(f.geometry.coordinates[0].map(t.toFt))).sort((a,b)=>a[1]-b[1]);
ok(near(sw[1][1],18,0.05)&&near(sw[1][3],23,0.05)&&near(imp()-imp0,3600,60)&&/4,320 sf of tree lawn/.test(t.$('#rInfo').textContent),'a 6 ft tree lawn moves the walk out to 18–23 ft without adding paving ('+t.$('#rInfo').textContent+')');
t.set('#rSwGap','0');t.set('#rSwW','6');ok(near(imp()-imp0,2*360*6,70),'6 ft walks: 4,320 sf');t.set('#rSwW','5');
// one side only: left is north for a road drawn west to east
t.set('#rSw','left','change');g=geo();sw=kinds(g,'sidewalk').filter(f=>f.properties.road==='Road 1').map(f=>box(f.geometry.coordinates[0].map(t.toFt)));
ok(sw.length===1&&near(sw[0][1],12,0.05)&&near(imp()-imp0,1800,40),'Left side only: one strip, on the north of a road drawn west to east');
t.set('#rSw','both','change');
// the road is still a street for buildings, and the strips stop the walks being double counted where a road crosses
t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(-100,45);t.tool('select');
// (the house is 42 x 55, so its south wall is at y 17.5: 5.5 ft from the road edge at 12, and 0.5 ft from the walk at 17)
ok(/5\.5′ to a road edge, setback is 10\.0′/.test(chk()),'the road setback is still measured to the road edge, not the sidewalk ('+chk().slice(0,120)+')');
t.key('Delete');
await t.draw('road',[[0,-60],[0,60]]);const impX=imp();
ok(near(impX-imp0,3600+24*120+3.14*144-24*24-2*5*24,120),'a road crossing takes its width out of both walks ('+(impX-imp0).toFixed(0)+')');
t.key('z',{ctrlKey:true});
// bends: the strip follows a corner at a constant offset
t.key('Escape');await t.draw('road',[[-250,-200],[-150,-200],[-150,-100]]);
t.tool('select');rl().filter(l=>!/walk-path/.test(l.options.className)).pop().fire('click',{latlng:t.ft(-200,-200),originalEvent:{}});
t.set('#rSw','right','change');
g=geo();const bend=kinds(g,'sidewalk').find(f=>f.properties.road==='Road 2').geometry.coordinates[0].slice(0,-1).map(t.toFt);
ok(bend.length===6&&bend.some(p=>near(p[0],-138,0.05)&&near(p[1],-212,0.05))&&bend.some(p=>near(p[0],-133,0.05)&&near(p[1],-217,0.05)),'around a right-angle bend the walk keeps its 12 and 17 ft offsets ('+JSON.stringify(bend.map(p=>p.map(v=>+v.toFixed(1))))+')');
t.key('Delete');

// ---- defaults for new roads
t.key('Escape');t.tab('build');t.set('#roadSw','both','change');t.set('#walkW','6');
await t.draw('road',[[-280,-190],[-200,-190]]);
r=t.proj().roads;const nr=r[r.length-1];
ok(nr.sw&&nr.sw.side==='both'&&nr.sw.w===6,'New roads get sidewalks: both sides, at the width set ('+JSON.stringify(nr.sw)+')');
t.key('z',{ctrlKey:true});t.set('#roadSw','','change');t.set('#walkW','5');

// ---- exports and round trips
g=geo();
ok(kinds(g,'sidewalk').length===3&&kinds(g,'sidewalk_centerline').length===1&&kinds(g,'road').length===1,'GeoJSON: the drawn walk, its centre line, and the two strips along the road ('+kinds(g,'sidewalk').length+')');
const rc=kinds(g,'road_centerline')[0].properties;ok(rc.sidewalks==='both'&&rc.sidewalkWidthFt===5&&rc.treeLawnFt===0,'the road centre line carries its sidewalk settings');
t.click(t.$('#xCsv'));const csv=t.dl['building-schedule.csv'];
ok(/"Sidewalk length ft","920"/.test(csv)&&/"Sidewalk area sf","4,?6\d\d"/.test(csv.replace(/,(?=\d{3}")/g,'')),'CSV: 920 ft of sidewalk and its area ('+(csv.match(/"Sidewalk[^\r\n]*/g)||[]).join(' ')+')');
t.click(t.$('#xDxf'));ok(/POLYLINE\n8\nHARDSCAPE\n/.test(t.dl['site-plan.dxf'])&&(t.dl['site-plan.dxf'].match(/POLYLINE\n8\nROADS\n/g)||[]).length===1,'DXF: walks on HARDSCAPE, the road alone on ROADS');
const p=t.proj(),a=await boot();await openVia(a,file('p.json',p));
ok(a.stat('Impervious').s===t.stat('Impervious').s&&a.proj().roads.filter(x=>x.walk).length===1,'the project file brings the sidewalks back ('+a.stat('Impervious').s+')');
const b=await boot();await openVia(b,file('s.geojson',g));
const br=b.proj().roads;
ok(br.length===2&&br.filter(x=>x.walk).length===1&&br.find(x=>!x.walk).sw.side==='both'&&near(b.num(b.stat('Impervious').s),imp(),30),'so does the GeoJSON ('+b.stat('Impervious').s+' vs '+t.stat('Impervious').s+')');
// 3D ground painting and the slope check are not upset by walks (the road slope check skips them)
for(const x of [t,a,b])ok(x.errors.length===0,'no page errors ('+x.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
