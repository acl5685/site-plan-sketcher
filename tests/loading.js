const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: two rows of four parcels = x -300..100, y -225..75
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
const geo=()=>{t.click(t.$('#xGeo'));return JSON.parse(t.dl['site-plan.geojson']);};
const kinds=(g,k)=>g.features.filter(f=>f.properties.kind===k);
const bays=()=>kinds(geo(),'loading_bay').map(f=>f.geometry.coordinates[0].slice(0,4).map(t.toFt));
const box=r=>{const xs=r.map(p=>p[0]),ys=r.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];};
const info=()=>t.$('#aInfo').textContent,chk=()=>t.$('#checks').textContent,lit=()=>t.$$('.tool.on').map(b=>b.dataset.tool).join();
const imp=()=>t.num(t.stat('Impervious').s);
const flag=()=>(t.$$('#checks .flag').map(e=>e.textContent).find(x=>/^Loading/.test(x))||'');
const place=(type,w,d,st,x,y)=>{t.tab('build');t.click(t.$('.typebtn[data-type="'+type+'"]'));t.set('#tW',String(w));t.set('#tD',String(d));t.set('#tSt',String(st));t.set('#tRot','0');t.placeAt(x,y);t.tool('select');t.key('Escape');};

// ---- the tool
ok(!!t.$('[data-tool="loadzone"]')&&t.$('[data-tool="loadzone"]').textContent==='Loading zone','toolbar has a Loading zone button');
t.tool('loadzone');
ok(lit()==='loadzone'&&t.$('#areaKind').value==='load'&&/corners of the loading zone/.test(t.$('#hint').textContent),'it draws an area as a loading zone, with its own hint ('+lit()+')');
// 50 x 70 ft: 10 x 25 ft spaces (the Brecksville size for a building under 20,000 sf) side by side along the 70 ft side
await t.draw('loadzone',t.rectPts(-250,-200,-200,-130));
let a=t.proj().areas[0];
ok(a.kind==='load'&&a.name==='Loading zone 1'&&a.lb.w===10&&a.lb.l===25,'saved as Loading zone 1 with 10 x 25 ft spaces, the code size for a building under 20,000 sf ('+JSON.stringify(a.lb)+')');
ok(!t.$('#insA').hidden&&!t.$('#aLoad').hidden&&t.$('#aLoadFor').value==='small'&&t.$('#aPark').hidden&&t.$('#aLs').hidden,'selected, with the space size showing');
let B=bays().map(box);
ok(B.length===7&&B.every(b=>near(b[3]-b[1],10,0.05)&&near(b[2]-b[0],25,0.05)),'a 50 x 70 ft zone holds seven 10 x 25 ft spaces along its long side ('+B.length+')');
ok(B.every(b=>b[0]>=-250.05&&b[2]<=-199.95&&b[1]>=-200.05&&b[3]<=-129.95)&&B.every((b,i)=>B.every((c,j)=>i===j||b[3]<=c[1]+0.05||c[3]<=b[1]+0.05)),'inside the zone, side by side without overlapping');
ok(/3,50\d sf · 7 loading spaces of 10 × 25 ft, side by side · 1,75\d sf left to manoeuvre in/.test(info())&&/14 ft of clear height/.test(info()),'the inspector says so ('+info().slice(0,100)+')');
ok(t.layers('pLots').some(l=>l instanceof t.w.L.Polygon&&/load-path/.test(l.options.className||''))&&t.$$('.blabel').some(e=>/Loading/.test(e.textContent)&&/7 bays/.test(e.textContent)),'the spaces are drawn and labelled on the map');
ok(near(imp(),3500,40)&&t.num(t.stat('Green space').v)<100,'the zone counts as paved ('+imp()+' sf)');
// the larger size
t.set('#aLoadFor','large','change');B=bays().map(box);
ok(t.proj().areas[0].lb.w===14&&t.proj().areas[0].lb.l===50&&t.$('#aLL').value==='50'&&B.length===5&&B.every(b=>near(b[3]-b[1],14,0.05)&&near(b[2]-b[0],50,0.05)),'the 14 x 50 ft size for a building of 20,000 sf or more: five fit ('+B.length+')');
t.set('#aLW','16');ok(bays().length===4&&t.$('#aLoadFor').value==='custom','16 ft wide: four fit, and the size shows as custom');
t.set('#aLoadFor','small','change');ok(bays().length===7,'back to 10 x 25');
// ---- a kerbside zone: too shallow to back into, so the spaces go end to end
await t.draw('loadzone',t.rectPts(-150,-200,-40,-188));           // 110 x 12 ft
B=bays().filter(b=>box(b)[0]>-160).map(box);
ok(B.length===4&&B.every(b=>near(b[2]-b[0],25,0.05)&&near(b[3]-b[1],10,0.05))&&/4 loading spaces of 10 × 25 ft, end to end/.test(info()),'a 110 x 12 ft kerbside zone takes four spaces end to end ('+B.length+': '+info().slice(0,70)+')');
// too small
await t.draw('loadzone',t.rectPts(-20,-200,-12,-180));
ok(/too small for a 10 × 25 ft space/.test(info()),'an 8 x 20 ft patch says it is too small ('+info()+')');
t.key('Delete');

// ---- a loading zone inside a parking area is kept clear of stalls
t.key('Escape');await t.draw('parkarea',t.rectPts(-280,-60,-80,68));
const st=kinds(geo(),'parking_stall').length;
await t.draw('loadzone',t.rectPts(-200,-20,-150,48));
const st2=kinds(geo(),'parking_stall').map(f=>box(f.geometry.coordinates[0].slice(0,4).map(t.toFt)));
ok(st2.length<st&&st2.every(b=>b[2]<=-199.9||b[0]>=-150.1||b[3]<=-19.9||b[1]>=47.9),'stalls give way to a loading zone drawn in the lot ('+st+' → '+st2.length+')');
t.key('Delete');t.tool('select');t.key('Escape');

// ---- how many are required: Brecksville §1183.20(f), by each building's commercial floor area
ok(!flag()&&/Loading: 11 spaces drawn, 0 required \(§1183\.20\(f\)\)/.test(chk()),'with no commercial building none are required; the 11 drawn are counted ('+(chk().match(/Loading:[^.]*\./)||[''])[0]+')');
place('com',60,70,1,30,0);                                              // 4,200 sf
ok(!flag()&&/COM-1: under 5,000 sf of commercial floor area, so a receiving platform is asked for/.test(chk()),'under 5,000 sf: a receiving platform, no space');
const bl=()=>t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon);
const sel=i=>{bl()[i].fire('mousedown',{latlng:t.c,originalEvent:{}});t.M.fire('mouseup',{});};
// take the loading zones away, so the requirement shows
t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon&&!/plant-path/.test(l.options.className||'')).slice(0,2).forEach(l=>{l.fire('click',{latlng:t.c,originalEvent:{}});t.key('Delete');});
ok(t.proj().areas.filter(x=>x.kind==='load').length===0,'(loading zones removed for the next checks)');
sel(0);t.set('#iSt','2');                                               // 8,400 sf
ok(/^Loading 0 of 1 space drawn \(§1183\.20\(f\)\): COM-1 \(8,400 sf\) needs 1\./.test(flag()),'5,000 to 10,000 sf of retail needs 1 ('+flag()+')');
t.set('#iSt','4');                                                      // 16,800 sf
ok(/^Loading 0 of 2 spaces drawn .*COM-1 \(16,800 sf\) needs 2\.$/.test(flag()),'10,000 to 40,000 sf needs 2, and under 20,000 sf they may be 10 x 25 ft ('+flag()+')');
t.set('#iSt','5');                                                      // 21,000 sf
ok(/COM-1 \(21,000 sf\) needs 2\. 2 must be at least 14 × 50 ft, for a building of 20,000 sf or more \(§1183\.20\(e\)\); 0 are\./.test(flag()),'at 20,000 sf or more the spaces must be 14 x 50 ft ('+flag()+')');
t.set('#iSt','10');ok(/COM-1 \(42,000 sf\) needs 3\./.test(flag()),'40,000 to 100,000 sf needs 3');
t.tab('check');t.set('#sLoadRule','other','change');
ok(/COM-1 \(42,000 sf\) needs 2\./.test(flag())&&t.proj().set.loadRule==='other','the warehouse and service schedule asks for 2 at that size ('+flag().slice(0,80)+')');
t.set('#sLoadRule','off','change');ok(!flag()&&!/receiving platform/.test(chk()),'Do not check switches it off');
t.set('#sLoadRule','retail','change');
// a new zone now starts at the larger size, and satisfies the check
t.key('Escape');await t.draw('loadzone',t.rectPts(-290,-200,-200,-140));     // 90 x 60: three 14 x 50 spaces... or six along the 90 ft side
a=t.proj().areas.filter(x=>x.kind==='load')[0];
ok(a.lb.w===14&&a.lb.l===50,'with a 42,000 sf building on the plan a new zone starts with 14 x 50 ft spaces ('+JSON.stringify(a.lb)+')');
ok(!flag()&&/Loading: 6 spaces drawn, 3 required \(§1183\.20\(f\)\)/.test(chk()),'six 14 x 50 ft spaces meet the 3 required ('+(chk().match(/Loading:[^.]*\./)||[''])[0]+')');
t.set('#aLoadFor','small','change');
ok(/3 must be at least 14 × 50 ft.*; 0 are\./.test(flag()),'shrunk to 10 x 25 ft they no longer count for the large building ('+flag().slice(-70)+')');
t.set('#aLoadFor','large','change');

// ---- exports and round trips
const g=geo(),la=kinds(g,'area').filter(f=>f.properties.areaType==='Loading zone');
ok(la.length===1&&la[0].properties.loadingBays===6&&la[0].properties.bayWidthFt===14&&la[0].properties.bayLengthFt===50&&kinds(g,'loading_bay').length===6,'GeoJSON: the zone carries its space size and count, and each space is an outline');
t.click(t.$('#xCsv'));const csv=t.dl['building-schedule.csv'];
ok(/"Loading spaces provided","6"/.test(csv)&&/"Loading spaces required \(§1183\.20\)","3"/.test(csv),'CSV lists spaces provided and required');
t.click(t.$('#xDxf'));ok((t.dl['site-plan.dxf'].match(/POLYLINE\n8\nSTRIPING\n/g)||[]).length>=6,'DXF has the spaces on STRIPING');
const p=t.proj(),b=await boot();await openVia(b,file('p.json',p));
ok(b.proj().areas.filter(x=>x.kind==='load').length===1&&b.proj().set.loadRule==='retail'&&/6 spaces drawn, 3 required/.test(b.$('#checks').textContent),'the project file brings the zone and the rule back');
const c=await boot();await openVia(c,file('s.geojson',g));
ok(c.proj().areas.filter(x=>x.kind==='load'&&x.lb&&x.lb.l===50).length===1&&/6 spaces drawn/.test(c.$('#checks').textContent),'and so does the GeoJSON');
// copy
t.tool('select');t.key('Escape');t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon&&/load|#f08c00/.test((l.options.fillColor||'')+(l.options.className||''))).pop().fire('click',{latlng:t.c,originalEvent:{}});
t.key('c',{ctrlKey:true});t.key('Shift');t.cursorAt(-250,-60);t.keyup('Shift');t.key('v',{ctrlKey:true});
const cp=t.proj().areas;ok(cp[cp.length-1].kind==='load'&&/^Loading zone \d+$/.test(cp[cp.length-1].name)&&cp[cp.length-1].name!==a.name&&kinds(geo(),'loading_bay').length===12,'a copied zone gets the next number and its six spaces ('+cp[cp.length-1].name+')');
for(const x of [t,b,c])ok(x.errors.length===0,'no page errors ('+x.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
