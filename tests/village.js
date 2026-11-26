const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: two rows of four parcels = 400 ft (x -300..100) by 300 ft (y -225..75)
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
const B=i=>t.proj().buildings[i];
const lay=c=>t.layers('pBldg').filter(l=>new RegExp('(^| )'+c+'( |$)').test((l.options||{}).className||''));
const flat=a=>a.length&&a[0].lat===undefined?a.reduce((o,x)=>o.concat(x.length&&x[0].lat===undefined?flat(x):[x]),[]):[a];
const rings=l=>flat(l.getLatLngs()).map(r=>r.map(p=>t.toFt([p.lng,p.lat])));
const area=r=>Math.abs(r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2);
const geo=()=>{t.click(t.$('#xGeo'));return JSON.parse(t.dl['site-plan.geojson']);};
const gb=()=>geo().features.filter(f=>f.properties.kind==='building').map(f=>f.properties);
const pick=async i=>{t.tool('select');t.key('Escape');await sleep(520);const l=t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon&&!/ent-mark|row-part|porch-strip/.test(l.options.className||''))[i];l.fire('mousedown',{latlng:t.c});l.fire('click',{latlng:t.c});t.M.fire('mouseup',{});await sleep(10);};

// ---- a long two-story mixed-use building, 200 x 50 ft
t.click(t.$('.typebtn[data-type="mu"]'));t.set('#tW','200');t.set('#tD','50');t.set('#tSt','2');t.set('#tRot','0');t.placeAt(-100,-100);
await pick(0);
ok(B(0).w===200&&B(0).st===2&&!t.$('#iRowL').hidden&&!t.$('#iRow').checked&&!t.$('#iPorch').checked&&t.$('#iRoofMat').value==='','a mixed-use building offers Village row, a covered porch and a roofing choice, all off to begin with');
ok(Array.from(t.$('#iRoofMat').options).map(o=>o.value).join()===',white,grey,char,bronze','roofing: asphalt shingles, or standing-seam metal in four colours');
ok(lay('row-part').length===0&&lay('porch-strip').length===0,'nothing extra is drawn on the plan yet');

// ---- village row: one building, drawn as a row of parts
t.click(t.$('#iRow'));
ok(B(0).row===true&&t.proj().buildings.length===1,'ticking Village row keeps it one building');
let parts=lay('row-part').length?rings(lay('row-part')[0]):[];
ok(parts.length===6,'a 200 ft frontage is divided into six parts, about 34 ft each ('+parts.length+')');
ok(near(parts.reduce((s,r)=>s+area(r),0),200*50,2)&&parts.every(r=>r.length===4),'the parts are rectangles that fill the footprint exactly, with nothing left over');
const ws=parts.map(r=>Math.max(...r.map(p=>p[0]))-Math.min(...r.map(p=>p[0])));
ok(ws.every(w=>w>=20&&w<=50)&&new Set(ws.map(w=>w.toFixed(1))).size>1,'they are of differing widths, like buildings put up one at a time ('+ws.map(w=>w.toFixed(0)).join(', ')+' ft)');
ok(parts.every(r=>near(Math.max(...r.map(p=>p[1]))-Math.min(...r.map(p=>p[1])),50,0.1)),'each runs the full depth of the building');
const before=JSON.stringify(parts);t.key('ArrowRight');t.key('ArrowLeft');
ok(JSON.stringify(rings(lay('row-part')[0]))===before,'the division is the same every time it is drawn');
{const p0=gb();ok(p0.length===1&&p0[0].footprintSf===10000&&p0[0].gfaSf===20000,'the footprint and floor area are still counted as one building ('+p0[0].gfaSf+' sf)');}

// ---- covered porch and roofing
t.click(t.$('#iPorch'));
let ps=lay('porch-strip').length?rings(lay('porch-strip')[0])[0]:null;
ok(B(0).porch===true&&!!ps&&near(area(ps),200*8,2),'ticking the porch draws an 8 ft deep strip along the whole entrance wall ('+(ps?area(ps).toFixed(0):'none')+' sf)');
ok(ps.every(p=>p[1]<=-125+0.1||p[1]>=-75-0.1),'outside the building, on one of its long sides');
t.set('#iRoofMat','char','change');ok(B(0).rm==='char','the roofing can be set to charcoal standing-seam metal');
t.set('#iRoof','gable','change');ok(B(0).roof==='gable'&&rings(lay('row-part')[0]).length===6,'a Roof chosen on the building applies to every part of the row');
t.set('#iRoof','','change');
// the two-material facade can be chosen on its own
t.click(t.$('#iFacade button[data-fa="village"]'));ok(B(0).fa==='village'&&t.$('#iFacade button.on').textContent==='Brick & clapboard','Brick & clapboard can be picked as a facade');

// ---- it is saved, exported and reopened
let p=gb()[0];
ok(p.villageRow===true&&p.porch===true&&p.roofing==='char'&&p.facade==='village','GeoJSON records the village row, the porch and the roofing');
// ---- one look for every store
t.click(t.$('.typebtn[data-type="com"]'));t.set('#tW','120');t.set('#tD','50');t.set('#tSt','1');t.placeAt(-100,10);
t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(60,-180);
await pick(0);t.click(t.$('#iLookAll'));
ok(B(1).row===true&&B(1).porch===true&&B(1).rm==='char'&&B(1).fa==='village'&&!B(2).row&&!B(2).porch,'Use this look for all stores carries the row, porch and roofing to the other store, not to the house');
await pick(2);ok(t.$('#iRowL').hidden,'a house is not offered Village row');
await pick(1);t.click(t.$('#iRow'));ok(!B(1).row,'and it can be switched off again on any one building');
const g=geo();t.click(t.$('#newBtn'));await openVia(t,file('plan.geojson',g));
const b0=t.proj().buildings.find(x=>x.w===200);
ok(!!b0&&b0.row===true&&b0.porch===true&&b0.rm==='char'&&b0.fa==='village'&&lay('row-part').length===1,'opening the GeoJSON brings the village row back, parts and all');
// a short building is too small to divide
t.click(t.$('.typebtn[data-type="com"]'));t.set('#tW','40');t.set('#tD','40');t.placeAt(40,40);
const n=t.proj().buildings.length;await pick(n-1);t.click(t.$('#iRow'));
ok(t.proj().buildings[n-1].row===true&&lay('row-part').length===1,'a 40 ft building has no room for more than one part, so it stays whole');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
