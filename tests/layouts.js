const {boot,ok,R,sleep,near}=require('./lib');
(async()=>{
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.w.confirm=()=>true;let promptVal='Renamed';t.w.prompt=()=>promptVal;
t.tab('layouts');await sleep(10);
ok(/Nothing saved yet/.test(t.$('#lyList').textContent),'empty state');
// layout A: one SF
t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(-200,-100);t.tool('select');
t.tab('layouts');
t.set('#lyName','Option A');t.click(t.$('#lySave'));
ok(t.$$('#lyList .card').length===1&&/Option A/.test(t.$('#lyList').textContent),'layout A saved and listed');
ok(/1 units/.test(t.$('#lyList').textContent)||/1 units/.test(t.$('#lyCompare').textContent),'summary stored: '+t.$('#lyList .note').textContent);
// make layout B: add two more buildings + area
t.tab('build');t.click(t.$('.typebtn[data-type="th"]'));t.placeAt(-100,-150);t.placeAt(-100,-60);t.tool('select');
t.set('#areaKind','park','change');await t.draw('area',t.rectPts(-290,-215,-230,-165));
t.tab('layouts');
ok(/Current plan/.test(t.$('#lyCompare').textContent),'compare shows the current plan');
ok(/changed since saved/.test(t.$('#lyList').textContent),'open layout A is marked changed');
t.set('#lyName','Option B');t.click(t.$('#lySave'));
ok(t.$$('#lyList .card').length===2,'two layouts');
const rows=[...t.$$('#lyCompare tbody tr')].map(r=>r.textContent);
ok(rows.length===3&&/Option A1/.test(rows[0])&&/Option B/.test(rows[1]),'compare table has A, B and current: '+rows.map(r=>r.slice(0,40)).join(' | '));
const units=[...t.$$('#lyCompare tbody tr')].map(r=>r.children[1].textContent);
ok(units[0]==='1'&&units[1]==='9'||units[1]==='8'||+units[1]>1,'units differ between A and B: '+units);
// open A
const openBtns=[...t.$$('#lyList [data-ly="open"]')];openBtns[0].click();
ok(t.proj().buildings.length===1&&t.proj().areas.length===0,'opening A restores one building and no area');
ok(/18 parcels loaded/.test(t.$('#parcelSummary').textContent),'surrounding loaded parcels are kept when opening a layout: '+t.$('#parcelSummary').textContent);
t.tab('layouts');ok(/· open$/.test(t.$('#lyList .card .note').textContent.trim())||/· open/.test(t.$('#lyList').textContent)&&!/changed since/.test(t.$('#lyList .card').textContent),'A shown as open and unchanged');
[...t.$$('#lyList [data-ly="open"]')][1].click();
ok(t.proj().buildings.length===3&&t.proj().areas.length===1,'opening B restores 3 buildings and the area');
t.key('z',{ctrlKey:true});ok(t.proj().buildings.length===1,'opening a layout can be undone');
// save over
[...t.$$('#lyList [data-ly="open"]')][0].click();
t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(-100,-100);t.tool('select');
t.tab('layouts');[...t.$$('#lyList [data-ly="update"]')][0].click();
[...t.$$('#lyList [data-ly="open"]')][1].click();[...t.$$('#lyList [data-ly="open"]')][0].click();
ok(t.proj().buildings.length===2,'Save over replaced layout A with 2 buildings');
// rename, duplicate, download, delete
[...t.$$('#lyList [data-ly="rename"]')][0].click();ok(/Renamed/.test(t.$('#lyList').textContent),'rename');
[...t.$$('#lyList [data-ly="dup"]')][0].click();ok(t.$$('#lyList .card').length===3&&/Renamed copy/.test(t.$('#lyList').textContent),'duplicate');
[...t.$$('#lyList [data-ly="dl"]')][0].click();
ok(!!t.dl['renamed.json']&&JSON.parse(t.dl['renamed.json']).buildings.length===2,'download gives a project file: '+Object.keys(t.dl).join(','));
[...t.$$('#lyList [data-ly="del"]')][2].click();ok(t.$$('#lyList .card').length===2,'delete');
// csv + bundle
t.click(t.$('#lyCsv'));ok(/Layout","Units"/.test(t.dl['layout-comparison.csv'])&&/Option B/.test(t.dl['layout-comparison.csv']),'comparison CSV');
t.click(t.$('#lyAll'));const bundle=JSON.parse(t.dl['site-plan-layouts.json']);ok(bundle.kind==='site-plan-layouts'&&bundle.layouts.length===2,'bundle download');
// persistence
const saved=t.w.localStorage.getItem('sitePlanSketcher.layouts.v1');
const t2=await boot({layouts:saved});t2.tab('layouts');await sleep(10);
ok(t2.$$('#lyList .card').length===2,'layouts survive a reload');
// import bundle into a fresh app
const t3=await boot();
const f=new t3.w.File(['x'],'b.json');f.text=()=>Promise.resolve(JSON.stringify(bundle));
const inp=t3.$('#lyImport');Object.defineProperty(inp,'files',{value:[f],configurable:true});inp.dispatchEvent(new t3.w.Event('change',{bubbles:true}));await sleep(30);
ok(t3.$$('#lyList .card').length===2,'import a bundle');
[...t3.$$('#lyList [data-ly="open"]')][0].click();
ok(t3.proj().buildings.length===2&&t3.proj().selected.length>0&&t3.$('#banner').hidden,'opening an imported layout in a new session brings back its parcels and buildings');
// import a project file
const pf=new t3.w.File(['x'],'my plan.json');pf.text=()=>Promise.resolve(JSON.stringify(t.proj()));
Object.defineProperty(inp,'files',{value:[pf],configurable:true});inp.dispatchEvent(new t3.w.Event('change',{bubbles:true}));await sleep(30);
ok(t3.$$('#lyList .card').length===3&&/my plan/.test(t3.$('#lyList').textContent),'import a plain project file as a layout');
const bad=new t3.w.File(['x'],'bad.json');bad.text=()=>Promise.resolve('{"a":1}');
Object.defineProperty(inp,'files',{value:[bad],configurable:true});inp.dispatchEvent(new t3.w.Event('change',{bubbles:true}));await sleep(30);
ok(/could not be imported/.test(t3.$('#lyList').textContent),'bad import reported');
ok(t.errors.length===0&&t2.errors.length===0&&t3.errors.length===0,'no page errors '+[...t.errors,...t3.errors].join('|'));
console.log(R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0)})();
