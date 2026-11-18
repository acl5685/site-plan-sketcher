const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: two rows of four parcels = x -300..100, y -225..75
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
const geo=()=>{t.click(t.$('#xGeo'));return JSON.parse(t.dl['site-plan.geojson']);};
const kinds=(g,k)=>g.features.filter(f=>f.properties.kind===k);
const plants=(name)=>kinds(geo(),'plant').filter(f=>!name||f.properties.area===name).map(f=>({p:t.toFt(f.geometry.coordinates),k:f.properties.plant}));
const plan=()=>t.$$('#aPlan tbody tr').map(r=>Array.from(r.cells).map(c=>c.textContent));
const num=s=>parseFloat(String(s).replace(/,/g,''));
const plantLayers=()=>t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon&&/plant-path/.test(l.options.className||''));
const ask=()=>t.$('#lsAsk');

// ---- drawing a green space asks what it is for
await t.draw('green',t.rectPts(-280,-200,-80,-170));                 // a 200 x 30 ft strip
ok(!ask().hidden&&/What is this landscaping for\?/.test(ask().textContent)&&ask().querySelectorAll('[data-use]').length===5,'after a green space is drawn the map asks what it is for, with five choices');
ok(!t.$('#aLs').hidden&&t.$('#aUse').value===''&&t.$('#aPlan').textContent===''&&plantLayers().length===0,'until then it is plain landscaping: no plan, nothing planted');
// ---- screening
t.click(ask().querySelector('[data-use="screen"]'));
let a=t.proj().areas[0];
ok(ask().hidden&&a.ls&&a.ls.use==='screen'&&a.name==='Screening'&&t.$('#aUse').value==='screen','Screening is saved on the area, which is renamed to match ('+a.name+')');
let P=plan();
ok(P.length===2&&/^Evergreen trees/.test(P[0][0])&&/arborvitae/.test(P[0][0])&&/red cedar/.test(P[0][0])&&/12 ft apart/.test(P[0][2])&&/^Large shrubs/.test(P[1][0])&&/viburnum/.test(P[1][0]),'the plan lists evergreen trees and large shrubs, with suggested species and spacing ('+P.map(r=>r[0].slice(0,24)+': '+r[1]).join(' | ')+')');
let pl=plants(),ev=pl.filter(x=>x.k==='Evergreen tree'),sh=pl.filter(x=>x.k==='Large shrub');
ok(ev.length===num(P[0][1])&&sh.length===num(P[1][1])&&ev.length>=30&&ev.length<=36,'a 200 x 30 ft screen takes about 33 evergreens in two staggered rows ('+ev.length+' trees, '+sh.length+' shrubs)');
ok(pl.every(x=>x.p[0]>-280&&x.p[0]<-80&&x.p[1]>-200&&x.p[1]<-170),'every plant is inside the area');
const rowsY=[...new Set(ev.map(x=>Math.round(x.p[1])))].sort((p,q)=>p-q);
ok(rowsY.length>=2&&near(rowsY[1]-rowsY[0],12,0.6),'the evergreens stand in rows 12 ft apart ('+rowsY.join(', ')+')');
const r0=ev.filter(x=>Math.round(x.p[1])===rowsY[0]).map(x=>x.p[0]).sort((p,q)=>p-q),r1=ev.filter(x=>Math.round(x.p[1])===rowsY[1]).map(x=>x.p[0]).sort((p,q)=>p-q);
ok(near(r0[1]-r0[0],12,0.05)&&near(Math.abs(r1[0]-r0[0])%12,6,0.05),'12 ft apart along the row, each row offset half a space from the next');
ok(sh.every(s=>ev.every(e=>Math.hypot(s.p[0]-e.p[0],s.p[1]-e.p[1])>=4.4)),'no shrub is planted on top of a tree');
ok(plantLayers().length===2&&/Screening planting: \d+ evergreen trees, \d+ large shrubs/.test(t.$('#toast').textContent),'the plants are drawn on the map and a note says what was planned ('+t.$('#toast').textContent.slice(0,70)+')');
ok(t.$('#aPlantRow').hidden,'the manual Plants in 3D picker steps aside for the plan');
const nScreen=pl.length;
// ---- the other purposes, from the inspector
t.set('#aUse','decor','change');P=plan();pl=plants();
ok(t.proj().areas[0].name==='Decorative planting'&&P.length===3&&/^Ornamental trees/.test(P[0][0])&&/redbud/.test(P[0][0])&&/^Shrubs/.test(P[1][0])&&/hydrangea/.test(P[1][0])&&/^Perennials and grasses/.test(P[2][0])&&/coneflower/.test(P[2][0]),'Decorative: ornamental trees, shrubs in groups, perennials ('+P.map(r=>r[0].slice(0,18)+': '+r[1]).join(' | ')+')');
ok(pl.filter(x=>x.k==='Ornamental tree').length>=8&&pl.filter(x=>x.k==='Ornamental tree').length<=10&&near(num(P[2][1]),6000*0.33/2.25,12)&&pl.length<nScreen,'about 9 small trees at 22 ft, and perennials for a third of the bed at 18 in ('+P[0][1]+' trees, '+P[2][1]+' perennials)');
t.set('#aUse','shade','change');P=plan();pl=plants();
ok(/^Shade trees/.test(P[0][0])&&/swamp white oak/.test(P[0][0])&&pl.length===num(P[0][1])&&pl.length>=5&&pl.length<=6&&/6,00\d sf/.test(P[1][1]),'Shade trees: 5 or 6 canopy trees 35 ft apart over lawn ('+P[0][1]+')');
t.set('#aUse','rain','change');P=plan();
ok(t.proj().areas[0].name==='Rain garden'&&/river birch/.test(P[0][0])&&/buttonbush/.test(P[1][0])&&/swamp milkweed/.test(P[2][0])&&near(num(P[2][1]),3600,12),'Rain garden: wet-tolerant trees, shrubs and plugs ('+P.map(r=>r[1]).join(', ')+')');
t.set('#aUse','lawn','change');P=plan();
ok(P.length===1&&/^Lawn/.test(P[0][0])&&/6,00\d sf/.test(P[0][1])&&plants().length===0&&plantLayers().length===0,'Lawn: just the grass, nothing drawn');
t.set('#aUse','','change');
ok(!t.proj().areas[0].ls&&t.proj().areas[0].name==='Landscaping'&&t.$('#aPlan').textContent===''&&!t.$('#aPlantRow').hidden,'Not set: back to plain landscaping, with the manual picker');
t.set('#aName','North buffer');t.set('#aUse','screen','change');
ok(t.proj().areas[0].name==='North buffer','an area you named yourself keeps its name');

// ---- plants keep clear of what is in the way
t.tab('build');t.click(t.$('.typebtn[data-type="acc"]'));t.set('#tW','24');t.set('#tD','24');t.set('#tRot','0');t.placeAt(-180,-185);t.tool('select');t.key('Escape');
pl=plants('North buffer');
ok(pl.length<nScreen&&pl.every(x=>!(Math.abs(x.p[0]+180)<11.9&&Math.abs(x.p[1]+185)<11.9)),'nothing is planted under a building ('+nScreen+' → '+pl.length+')');
t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon)[0].fire('mousedown',{latlng:t.ft(-180,-185),originalEvent:{}});t.M.fire('mouseup',{});t.key('Delete');
ok(plants('North buffer').length===nScreen,'and they come back when it goes');

// ---- "Not now", and the question going away
await t.draw('green',t.rectPts(-50,-200,50,-100));
ok(!ask().hidden,'a second green space asks again');
t.click(t.$('#lsSkip'));ok(ask().hidden&&!t.proj().areas[1].ls,'Not now leaves it as plain landscaping');
await t.draw('green',t.rectPts(-50,-60,50,40));ok(!ask().hidden,'asked for a third');
t.tool('select');t.key('Escape');ok(ask().hidden,'deselecting the area drops the question');
// a small bed still gets one tree
t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon&&!/plant-path/.test(l.options.className||''))[2].fire('click',{latlng:t.ft(0,0),originalEvent:{}});
t.set('#aUse','shade','change');ok(plants('Shade trees').length>=4,'the 100 ft square gets its shade trees ('+plants('Shade trees').length+')');
await t.draw('green',t.rectPts(-280,-60,-268,-48));t.click(ask().querySelector('[data-use="decor"]'));
ok(plants('Decorative planting').filter(x=>x.k==='Ornamental tree').length===1,'a 12 ft bed still gets one ornamental tree');

// ---- 3D models, exports and round trips
t.tool('select');t.key('Escape');
const g=geo(),sa=kinds(g,'area').find(f=>f.properties.name==='North buffer').properties;
ok(sa.landscapePurpose==='screen'&&sa.landscapePurposeName==='Screening'&&sa.planting.length===2&&/^\d+ evergreen trees \(12 ft apart/.test(sa.planting[0])&&/arborvitae/.test(sa.planting[0]),'GeoJSON: the area carries its purpose and planting schedule ('+sa.planting[0].slice(0,60)+')');
const gp=kinds(g,'plant');ok(gp.length>nScreen&&gp.every(f=>f.geometry.type==='Point'&&f.properties.spreadFt>0&&f.properties.suggested),'and every tree and shrub is a point with its kind, spread and suggested species ('+gp.length+')');
t.click(t.$('#xCsv'));const csv=t.dl['building-schedule.csv'];
ok(/"North buffer \(screening\): evergreen trees","\d+","American arborvitae[^"]*","12 ft apart/.test(csv),'CSV has the planting schedule ('+(csv.match(/"North buffer[^\r\n]*/)||[''])[0].slice(0,80)+')');
const p=t.proj(),b=await boot();await openVia(b,file('p.json',p));
ok(b.proj().areas[0].ls.use==='screen'&&b.layers('pAreas').filter(l=>/plant-path/.test((l.options||{}).className||'')).length>=2,'the project file brings the plans back');
const c=await boot();await openVia(c,file('s.geojson',g));
ok(c.proj().areas.filter(x=>x.ls).length===3&&c.proj().areas.find(x=>x.name==='North buffer').ls.use==='screen','and so does the GeoJSON');
// copy and paste keeps the purpose
t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon&&!/plant-path/.test(l.options.className||''))[0].fire('click',{latlng:t.ft(-180,-185),originalEvent:{}});
t.key('c',{ctrlKey:true});t.key('Shift');t.cursorAt(-180,-120);t.keyup('Shift');t.key('v',{ctrlKey:true});
const cp=t.proj().areas;ok(cp[cp.length-1].ls&&cp[cp.length-1].ls.use==='screen'&&plants('North buffer').length===2*nScreen,'a copied screen is planted the same way ('+plants('North buffer').length+' plants in the two)');
for(const x of [t,b,c])ok(x.errors.length===0,'no page errors ('+x.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
