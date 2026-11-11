const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
const M2FT=3.28084;
(async()=>{
// ground rises 5% to the east: 270 m at the map center
const t=await boot();
t.mode.dem=(lng,lat)=>270+(lng-t.c.lng)*t.kx*0.05/M2FT;
t.w.THREE={OrbitControls:function(){}}; // no WebGL in jsdom: the panel still reports terrain numbers
await t.freshSite(t.row(0,[0,1,2,3]));   // 400 ft east-west site
const p=t.proj();
p.buildings=[{id:50,type:'th',name:'TH-1',w:88,d:42,st:3,rot:0,units:null,c:t.ftLL(-200,-150)},{id:51,type:'apt',name:'APT-1',w:88,d:42,st:4,rot:90,units:null,c:t.ftLL(0,-150)}];
p.nextId=52;delete p.set.storyH; // an older save without the new setting
await openVia(t,file('p.json',p));
ok(t.$('#sStoryH').value==='11','older project gets the default story height (11 ft)');
ok(t.$('#v3d').hidden,'3D view starts closed');
t.click(t.$('#view3dBtn'));await sleep(150);
ok(!t.$('#v3d').hidden&&t.$('#view3dBtn').classList.contains('on'),'3D view opens');
ok(t.demReq===1,'one elevation request ('+t.demReq+')');
const info=()=>t.$('#v3dInfo').textContent;
ok(/TEST_LIDAR_2019/.test(info())&&/3DEP 1 m/.test(info()),'names the lidar survey and resolution');
const fall=+(info().match(/([\d.]+) ft of fall/)||[])[1];
ok(near(fall,20,0.15),'site fall = 5% of 400 ft = 20 ft ('+fall+')');
const row=n=>t.$$('#v3dBldg tr').map(r=>Array.from(r.cells).map(c=>c.textContent)).find(c=>c[0]===n)||[];
ok(near(parseFloat(row('TH-1')[1]),4.4,0.1),'88 ft wide building across the slope: 4.4 ft ground change ('+row('TH-1')[1]+')');
ok(near(parseFloat(row('APT-1')[1]),2.1,0.1),'turned 90°: 42 ft across the slope = 2.1 ft ('+row('APT-1')[1]+')');
const pad=parseFloat(row('TH-1')[2].replace(/,/g,''));
ok(near(pad,270*M2FT+0.05*(-200),0.15),'auto pad is the average ground under the building: '+pad+' ft');
ok(/did not load/.test(info()),'missing WebGL library is reported, not thrown');
ok(/3:00 pm/.test(t.$('#v3dTime').textContent),'sun time label');
// edits redraw without downloading the terrain again
t.set('#sStoryH','14');await sleep(400);
ok(t.demReq===1,'changing the plan reuses the terrain grid ('+t.demReq+' requests)');
ok(t.proj().set.storyH===14,'story height is saved in the project');
ok(/14\.0 ft per story/.test(info()),'panel shows the new story height');
// facades: five choices, defaults by type, saved with the building and carried through GeoJSON
ok(t.$$('#iFacade button').map(b=>b.getAttribute('data-fa')).join()==='brick,siding,stone,stucco,glass','five facade options');
{const l=t.layers('pBldg').find(l=>l instanceof t.w.L.Polygon);l.fire('mousedown',{latlng:t.c});t.M.fire('mouseup',{});await sleep(10);}
const selName=t.$('#iName').value,defFa={th:'brick',apt:'stucco'}[t.proj().buildings.find(b=>b.name===selName).type];
ok(t.$('#iFacade button.on')&&t.$('#iFacade button.on').getAttribute('data-fa')===defFa,'selected building shows its default facade ('+defFa+')');
t.click(t.$('#iFacade button[data-fa="glass"]'));
ok(t.proj().buildings.find(b=>b.name===selName).fa==='glass'&&t.$('#iFacade button.on').getAttribute('data-fa')==='glass','clicking Glass sets the facade');
t.click(t.$('#xGeo'));const gj=JSON.parse(t.dl['site-plan.geojson']);
ok(gj.features.find(f=>f.properties.kind==='building'&&f.properties.name===selName).properties.facade==='glass','GeoJSON export carries the facade');
const t2=await boot();await openVia(t2,{name:'p.geojson',text:()=>Promise.resolve(JSON.stringify(gj))});
ok(t2.proj().buildings.find(b=>b.name===selName).fa==='glass','GeoJSON import restores the facade');
t.key('z',{ctrlKey:true});
ok(t.proj().buildings.find(b=>b.name===selName).fa!=='glass','undo reverts the facade');
t.click(t.$('#v3dClose'));
ok(t.$('#v3d').hidden&&!t.$('#view3dBtn').classList.contains('on'),'Back to 2D closes the view');
// ---- terrain checks in the 2D plan: slope flags, pad elevation, cut and fill
t.tab('check');t.click(t.$('#tOn'));await sleep(120);
ok(t.demReq===1,'turning terrain checks on reuses the grid the 3D view loaded ('+t.demReq+' requests)');
ok(/20\.0 ft of fall/.test(t.$('#tSite').textContent)&&/5\.0% average slope/.test(t.$('#tSite').textContent),'site fall and slope ('+t.$('#tSite').textContent+')');
const earth=t.$('#tEarth').textContent.replace(/,/g,'').match(/cut (\d+) cy · fill (\d+) cy/)||[];
ok(near(+earth[1],111,5)&&near(+earth[2],111,5),'auto pads balance: about 111 cy cut and 111 cy fill ('+t.$('#tEarth').textContent+')');
ok(!/slope, limit/.test(t.$('#checks').textContent),'5% ground passes the 15% building limit');
t.set('#sSlopeB','4');
ok(/TH-1 Existing ground under it averages 5\.0% slope, limit is 4\.0%/.test(t.$('#checks').textContent),'building slope flag appears when the limit drops to 4%');
t.set('#sSlopeB','15');
{const l=t.layers('pBldg').find(l=>l instanceof t.w.L.Polygon);l.fire('mousedown',{latlng:t.c});t.M.fire('mouseup',{});await sleep(10);}
const pn=t.$('#iName').value,across=pn==='TH-1'?88:42,along=pn==='TH-1'?42:88,bx=pn==='TH-1'?-200:0,low=270*M2FT+0.05*(bx-across/2);
ok(/\(auto\)/.test(t.$('#iPad').placeholder)&&/cut \d+ cy · fill \d+ cy/.test(t.$('#iTerr').textContent),'inspector shows the auto pad and earthwork ('+t.$('#iTerr').textContent+')');
t.set('#iPad',low.toFixed(2));
const it=t.$('#iTerr').textContent.replace(/,/g,'').match(/cut (\d+) cy · fill (\d+) cy/),wedge=across*(across*0.05)/2*along/27;
ok(near(+it[1],wedge,wedge*0.04+2)&&+it[2]<=1,pn+' pad at its low edge: all cut, about '+Math.round(wedge)+' cy ('+it[0]+')');
ok(near(t.proj().buildings.find(b=>b.name===pn).pad,low,0.01),'pad elevation is saved with the building');
t.set('#iPad','');
ok(t.proj().buildings.find(b=>b.name===pn).pad===null,'clearing the field returns to the auto pad');
t.tab('build');t.tool('road');await t.draw('road',[[-290,-100],[-110,-100]]);
t.tool('lot');await t.draw('lot',[[-250,-200],[-50,-200]]);t.tool('select');
ok(/steepest 20 ft: 5\.0%/.test(t.$('#tRows').textContent)&&/steepest stall: 5\.0%/.test(t.$('#tRows').textContent),'road grade and stall slope are listed ('+t.$('#tRows').textContent+')');
ok(!/Steepest 20 ft|stalls sit on/.test(t.$('#checks').textContent),'5% passes the default road (10%) and parking (5%) limits');
t.set('#sSlopeR','4');t.set('#sSlopeP','4');
ok(/Road 1 Steepest 20 ft stretch of existing ground is 5\.0%, limit is 4\.0%/.test(t.$('#checks').textContent),'road grade flag');
ok(/20 of 20 stalls sit on existing ground steeper than 4\.0% \(steepest 5\.0%\)/.test(t.$('#checks').textContent),'parking slope flag ('+t.$('#checks').textContent.slice(0,200)+')');
t.click(t.$('#xCsv'));ok(/Building pad cut cy/.test(t.dl['building-schedule.csv']),'CSV schedule carries the earthwork totals');
// terrain area: only the site and its surroundings are downloaded, and a smaller area reloads a smaller grid
ok(/800 × 550 ft loaded/.test(t.$('#tInfo').textContent),'default loads the site plus 200 ft ('+t.$('#tInfo').textContent.slice(0,90)+')');
t.set('#tPad','40');await sleep(150);
ok(t.demReq===2&&/480 × 230 ft loaded/.test(t.$('#tInfo').textContent),'"Site only" reloads a 480 × 230 ft grid ('+t.demReq+' requests)');
ok(t.proj().set.demPad===40,'terrain area is saved with the project');
t.click(t.$('#tOn'));
ok(!/Steepest 20 ft|stalls sit on/.test(t.$('#checks').textContent)&&!t.$('#tSite'),'turning terrain off removes its flags');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
// service down: flat ground with a message
const f=await boot();f.mode.demFail=true;f.w.THREE={OrbitControls:function(){}};
await f.freshSite(f.row(0,[0,1]));f.click(f.$('#view3dBtn'));await sleep(150);
ok(/Terrain unavailable/.test(f.$('#v3dInfo').textContent)&&/503/.test(f.$('#v3dInfo').textContent),'service failure is explained ('+f.$('#v3dInfo').textContent.slice(0,80)+')');
f.click(f.$('#v3dClose'));f.click(f.$('#tOn'));await sleep(120);
ok(!f.$('#tOn').checked&&/Terrain could not load/.test(f.$('#toast').textContent),'terrain checks switch themselves off when the service fails');
// nothing drawn: no view, a message instead
const e=await boot();e.click(e.$('#newBtn'));e.click(e.$('#view3dBtn'));await sleep(50);
ok(e.$('#v3d').hidden&&/Pick parcels or draw/.test(e.$('#toast').textContent),'empty plan asks for a site first');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
