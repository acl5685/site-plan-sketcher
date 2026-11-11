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
// ---- cut a shape out as its own lot, then click it to see what fits
t.key('z',{ctrlKey:true});t.key('z',{ctrlKey:true}); // back to: no lot lines... (undo the removal, then the line)
t.click(t.$('#newBtn'));await t.freshSite(t.row(0,[0,1,2,3]));
t.tab('site');t.click(t.$('#splitShapeBtn'));
ok(t.$('#splitMode').value==='shape'&&!t.$('#splitMode').hidden,'Cut out a shape switches the tool to shape mode');
await t.draw('split',t.rectPts(-250,-200,-150,-100));t.tool('select');
ok(rows().length===2,'a 100 ft square drawn on the site becomes its own lot ('+rows().length+' lots)');
ok(near(num(rows()[0][1]),10000,15)&&near(num(rows()[1][1]),50000,60),'the cut-out is 10,000 sf and the rest about 50,000 sf ('+rows()[0][1]+', '+rows()[1][1]+')');
ok(t.proj().splits[0].shape===true&&/Shape 1/.test(t.$('#splitList').textContent),'saved as a shape and listed as Shape 1');
// click inside the new lot
await sleep(600);
ok(t.$('#plotBar').hidden,'no lot panel until a lot is clicked');
t.M.fire('click',{latlng:t.ft(-200,-150)});
ok(!t.$('#plotBar').hidden&&/^Lot 1 · (9,99|10,00)\d sf/.test(t.$('#pbName').textContent),'clicking in the lot opens its panel ('+t.$('#pbName').textContent+')');
const pi=t.$('#pbInfo').textContent.replace(/,/g,''),env=+(pi.match(/setback: (\d+) sf/)||[])[1],mr=pi.match(/Largest building: (\d+) × (\d+) ft = (\d+) sf footprint (\d+) sf on (\d+) stor/)||[];
ok(near(env,6400,40),'buildable area inside 10 ft setbacks is about 80 × 80 = 6,400 sf ('+env+')');
ok(+mr[1]>=77&&+mr[1]<=80&&+mr[2]>=77&&+mr[2]<=80&&+mr[3]===mr[1]*mr[2],'largest building is about 80 × 80 ft ('+mr[1]+' × '+mr[2]+')');
ok(+mr[4]===mr[3]*mr[5],'floor area = footprint × stories from the Build tab ('+mr[4]+' on '+mr[5]+')');
// a wider setback shrinks it
t.tab('check');t.set('#sSetback','20');
const mr2=t.$('#pbInfo').textContent.match(/Largest building: (\d+) × (\d+) ft/)||[];
ok(+mr2[1]>=57&&+mr2[1]<=60&&+mr2[2]>=57&&+mr2[2]<=60,'with 20 ft setbacks it drops to about 60 × 60 ft ('+mr2[1]+' × '+mr2[2]+')');
t.set('#sSetback','10');
// add the building: it lands in the lot and meets the setback
const nb0=t.proj().buildings.length;t.click(t.$('#pbAdd'));
const nbs=t.proj().buildings,added=nbs[nbs.length-1],at=t.toFt(added.c);
ok(nbs.length===nb0+1&&t.$('#plotBar').hidden,'Add it places one building and closes the panel');
ok(near(at[0],-200,1.5)&&near(at[1],-150,1.5)&&added.w>=77&&added.d>=77,'it sits in the middle of the lot at full size ('+at.map(v=>v.toFixed(1))+', '+added.w+' × '+added.d+')');
ok(!new RegExp(added.name+' (Closest|Crosses)').test(checks()),'and it passes the setback and lot-line checks');
ok(rows()[0][3]===added.name,'the Lots panel lists it under Lot 1');
// the other lot, Esc, and a click outside any lot
t.key('Escape');await sleep(600);t.M.fire('click',{latlng:t.ft(0,-150)});
ok(/^Lot 2/.test(t.$('#pbName').textContent)&&!t.$('#plotBar').hidden,'clicking the rest of the site opens Lot 2');
t.key('Escape');ok(t.$('#plotBar').hidden,'Esc closes the lot panel');
t.M.fire('click',{latlng:t.ft(-200,-150+500)});ok(t.$('#plotBar').hidden,'a click outside every lot opens nothing');
// GeoJSON round trip keeps the shape
t.click(t.$('#xGeo'));const gj2=JSON.parse(t.dl['site-plan.geojson']);
const c2=await boot();await openVia(c2,file('s.geojson',gj2));
ok(c2.proj().splits.length===1&&c2.proj().splits[0].shape===true&&c2.$$('#plotTable tbody tr').length===2,'GeoJSON brings the cut-out lot back');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
