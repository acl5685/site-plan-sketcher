const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: 400 ft (x -300..100) by 150 ft (y -225..-75) = 60,000 sf
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]));
const rows=()=>t.$$('#plotTable tbody tr').map(r=>Array.from(r.cells).map(c=>c.textContent));
const num=s=>parseFloat(String(s).replace(/,/g,''));
const checks=()=>t.$('#checks').textContent;
ok(!!t.$('[data-tool="split"]')&&!t.$('#plotTable'),'Split lots tool exists; no lots before a line is drawn');
// a townhome row 5 ft west of where the lot line will go: fine against the site, short against the lot line
t.tab('build');t.tool('building');t.placeAt(-149,-150);t.tool('select');t.key('Escape');
ok(!/property line/.test(checks()),'building is clear of the site boundary before the split');
const siteBefore=t.stat('Site area').s;
await t.draw('split',[[-100,-260],[-100,-40]]);t.tool('select');
ok(rows().length===2,'one line across the site makes 2 lots ('+rows().length+')');
ok(rows()[0][0]==='Lot 1'&&rows()[1][0]==='Lot 2','lots are numbered west to east');
ok(near(num(rows()[0][1]),30000,20)&&near(num(rows()[1][1]),30000,20),'each lot is about 30,000 sf ('+rows()[0][1]+', '+rows()[1][1]+')');
ok(rows()[0][3]==='TH-1'&&rows()[1][3]==='—','the building is listed under the lot it stands in');
ok(near(num(rows()[0][4]),12.3,0.2),'lot coverage = 3,696 / 30,000 = 12.3% ('+rows()[0][4]+')');
ok(/TH-1 Closest approach to a property line is 5\.0′, setback is 10\.0′/.test(checks()),'the lot line now counts as a property line for the setback');
ok(t.stat('Site area').s===siteBefore,'site area is unchanged by the split ('+t.stat('Site area').s+')');
// straddling the line
t.tool('building');t.placeAt(-100,-110);t.tool('select');t.key('Escape');
ok(/TH-2 Crosses a lot line or sits outside the site/.test(checks()),'a building across the line is flagged');
t.key('z',{ctrlKey:true});
// minimum lot area
t.tab('site');t.set('#sLotMin','40000');
ok(/Lot 1 is 29,99\d sf, minimum lot area is 40,000 sf/.test(checks())&&/Lot 2 is/.test(checks()),'lots under the minimum are flagged');
t.set('#sLotMin','0');ok(!/minimum lot area/.test(checks()),'0 turns the minimum off');
// a line that stops inside the site does not split it; it can be removed from the list
await t.draw('split',[[-50,-150],[50,-150]]);t.tool('select');
ok(rows().length===2&&t.$$('#splitList button').length===2,'a line that does not cross leaves 2 lots but is listed');
t.click(t.$$('#splitList button')[1]);
ok(t.proj().splits.length===1&&rows().length===2,'removing it from the list leaves the first line');
// a second crossing line makes four lots, numbered north row first
await t.draw('split',[[-340,-150],[140,-150]]);t.tool('select');
ok(rows().length===4&&rows().every(r=>near(num(r[1]),15000,20)),'two crossing lines make 4 lots of about 15,000 sf');
t.key('z',{ctrlKey:true});ok(rows().length===2,'undo removes the last lot line');
// saved with the project and carried through GeoJSON
const p=t.proj();ok(p.splits.length===1&&p.set.lotMin===0,'lot lines and the minimum are saved in the project');
t.click(t.$('#xGeo'));const gj=JSON.parse(t.dl['site-plan.geojson']),k=n=>gj.features.filter(f=>f.properties.kind===n);
ok(k('lot').length===2&&k('lot_line').length===1&&near(k('lot')[0].properties.areaSf,30000,20),'GeoJSON carries the lots and the lot line');
t.click(t.$('#xCsv'));ok(/Lot 1 area sf/.test(t.dl['building-schedule.csv']),'CSV lists lot areas');
const a=await boot();await openVia(a,file('p.json',p));
ok(a.$$('#plotTable tbody tr').length===2,'opening the project file brings the lots back');
const b=await boot();await openVia(b,file('s.geojson',gj));
ok(b.$$('#plotTable tbody tr').length===2,'opening the GeoJSON brings the lots back');
// remove all
t.click(t.$('#splitClear'));
ok(!t.$('#plotTable')&&t.proj().splits.length===0&&t.$('#splitClear').hidden,'Remove all lot lines returns to one site');
ok(!/property line/.test(checks()),'the setback flag goes with the lot line');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
