const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: two rows of four parcels = 400 ft (x -300..100) by 300 ft (y -225..75)
const t=await boot();const ALL=t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3]));
t.w.confirm=()=>true;
const geo=()=>{t.click(t.$('#xGeo'));return JSON.parse(t.dl['site-plan.geojson']);};
const lots=()=>geo().features.filter(f=>f.properties.kind==='lot'&&!f.properties.notALot);
const notLots=()=>geo().features.filter(f=>f.properties.kind==='lot'&&f.properties.notALot);
const ring=f=>f.geometry.coordinates[0].map(q=>t.toFt(q));
const bx=r=>[Math.min(...r.map(p=>p[0])),Math.min(...r.map(p=>p[1])),Math.max(...r.map(p=>p[0])),Math.max(...r.map(p=>p[1]))];
const roads=()=>t.proj().roads.map(r=>({name:r.name,w:r.width,sub:r.sub,pts:r.pts.map(q=>t.toFt(q))}));
const go=async(x,y)=>{t.click(t.$('#yGo'));t.cursorAt(x,y);t.M.fire('click',{latlng:t.ft(x,y)});await sleep(20);};
const res=()=>t.$('#yRes')?t.$('#yRes').textContent:'';
const rows=()=>t.$$('#yTable tbody tr').map(r=>Array.from(r.children).map(c=>c.textContent));

// ---- nothing to lay out without a site
t.click(t.$('#newBtn'));t.tab('site');
ok(!!t.$('#ySec')&&!!t.$('[data-tool="yield"]'),'the Site tab has Most lots that fit, and the toolbar a Most lots tool');
t.click(t.$('#yGo'));
ok(/Pick the parcels/.test(t.$('#toast').textContent)&&!t.$('[data-tool="yield"]').classList.contains('on'),'without a site it asks for the parcels first');

await t.freshSite(ALL);t.tab('site');
ok(t.$('#yHome').value==='colonial'&&t.$('#sLotW').value==='60'&&t.$('#sYFront').value==='30'&&t.$('#sYSide').value==='10'&&t.$('#sYRear').value==='30'&&t.$('#sRowW').value==='50'&&t.$('#sPaveW').value==='24',
  'it starts with a Colonial, 60 ft lots, 30 / 10 / 30 ft setbacks, a 50 ft right-of-way and 24 ft of pavement');
ok(t.$$('#yHome option').length>=10&&t.$$('#yHome option').some(o=>/Duplex.*2 homes/.test(o.textContent)),'the home can be any house style, or a duplex, triplex or fourplex');

// ---- the button asks where the street comes in
t.click(t.$('#yGo'));
ok(t.$('[data-tool="yield"]').classList.contains('on')&&/where the new street comes in/.test(t.$('#hint').textContent),'pressing the button asks for a click where the new street comes in');
t.cursorAt(-100,-200);
ok(t.layers('pDraw').length>=2,'moving the mouse shows where the street would start, on the nearest edge of the site');
t.M.fire('click',{latlng:t.ft(-100,-200)});await sleep(20);
ok(t.$('[data-tool="select"]').classList.contains('on'),'after the click the Select tool is back');

// ---- one straight street up the middle, five lots on each side
let rd=roads();
ok(rd.length===1&&rd[0].name==='Street A'&&rd[0].w===24&&rd[0].sub===1,'one new street is drawn, 24 ft of pavement');
ok(near(rd[0].pts[0][0],-100,0.1)&&near(rd[0].pts[0][1],-225,0.1)&&near(rd[0].pts[1][0],-100,0.1)&&near(rd[0].pts[1][1],75,0.5),'it starts on the edge nearest the click and runs straight across the site ('+rd[0].pts.map(p=>p.map(v=>v.toFixed(0))).join(' to ')+')');
let L=lots();
ok(L.length===10,'ten lots are laid out ('+L.length+')');
ok(L.every(f=>near(f.properties.areaSf,10500,2)),'each is 60 × 175 ft = 10,500 sf ('+L.map(f=>f.properties.areaSf).join(', ')+')');
ok(L.every(f=>{const b=bx(ring(f));return near(b[2]-b[0],175,0.2)&&near(b[3]-b[1],60,0.2)&&(near(b[2],-125,0.2)||near(b[0],-75,0.2));}),'every lot fronts on the street: its front line is the edge of the 50 ft right-of-way');
ok(L.map(f=>f.properties.name).join()===Array.from({length:10},(_,i)=>'Lot '+(i+1)).join(),'they are numbered Lot 1 to Lot 10');
let NL=notLots();
ok(NL.length===1&&NL[0].properties.name==='Street right-of-way'&&near(NL[0].properties.areaSf,15000,3),'the street right-of-way is its own piece, 50 × 300 ft, and is not counted as a lot');
let p=t.proj();
ok(p.buildings.length===10&&p.buildings.every(b=>b.home==='colonial'&&b.w===40&&b.d===30&&b.sub===1&&/^Colonial \d+$/.test(b.name)),'a Colonial stands on every lot');
ok(p.buildings.every(b=>{const c=t.toFt(b.c);return near(Math.abs(c[0]+100),25+30+15,0.1)&&near(Math.abs(((b.rot%180)+180)%180),90,0.1);}),'each home sits on the 30 ft front setback line, its long side to the street');
ok(p.areas.length===10&&p.areas.every(a=>a.kind==='park'&&a.name==='Driveway'&&a.sub===1),'and has a driveway out to the pavement');
ok(/^10 lots · 10 new homes · 3\.6 per acre/.test(res()),'the panel reports 10 lots, 10 new homes, 3.6 per acre ('+res()+')');
ok(/All 10 buildings meet the current rules/.test(t.$('#checks').textContent),'every home passes the setback and spacing checks');
ok(t.stat('Parking').v==='20 / 20'&&!/striped/.test(t.$('#parkNotes')?t.$('#parkNotes').textContent:t.$('#pane-check').textContent),'the driveways count as two spaces a home, and are not taken for a parking lot ('+t.stat('Parking').v+')');
ok(!/Shape \d/.test(t.$('#plotList').textContent)&&t.$$('#plotTable tbody tr').length===11,'the Lots table lists the ten lots and the street, with no button for each lot shape');

// ---- other homes from the same way in
let T=rows();
// columns: home, least lot width, lots, homes (dwellings), per acre
ok(T.length>=10&&T.some(r=>/^Colonial/.test(r[0])&&r[2]==='10')&&/^Colonial/.test(t.$('#yTable tr.on td').textContent)&&!t.$('#yTable tr.on button'),'a table compares the home styles from the same starting point; the one on the plan is marked');
const dup=T.find(r=>/^Duplex/.test(r[0])),est=T.find(r=>/^Estate/.test(r[0]));
ok(dup&&dup[1]==='64'&&+dup[3]===2*+dup[2]&&est&&est[1]==='92'&&+est[2]<10,'wider homes need wider lots (an estate home 92 ft, so fewer lots) and a duplex counts two homes a lot ('+dup+' / '+est+')');
ok(T.filter(r=>/★/.test(r[0])).length>=1&&T.filter(r=>/★/.test(r[0])).every(r=>+r[3]===Math.max(...T.map(q=>+q[3]))),'the style with the most homes is starred');
ok(t.$$('#yTable th').length===5&&/44 × 40 ft/.test(t.$('#yTable button[data-yhome="duplex"]').title),'each home’s name is a button, with its size as a tip, so the table fits the side panel');
t.click(t.$('#yTable button[data-yhome="duplex"]'));await sleep(20);
p=t.proj();L=lots();
ok(t.$('#yHome').value==='duplex'&&p.buildings.every(b=>b.home==='duplex'&&b.type==='th')&&L.length===+dup[2]&&p.buildings.length===L.length,'pressing a home lays the site out again for it: '+L.length+' duplex lots');
ok(new RegExp('^'+L.length+' lots · '+L.length+' new homes \\('+2*L.length+' dwellings\\)').test(res()),'and the count says how many dwellings that is ('+res()+')');
ok(roads().length===2&&L.every(f=>f.properties.areaSf>=64*90-2),'ten duplex lots need a cross street; every lot still has its width and depth ('+roads().map(r=>r.name).join(', ')+')');
ok(/All \d+ buildings meet/.test(t.$('#checks').textContent),'and still passes the checks');

// ---- the rules: the same numbers as the Lots and Check settings, and Update lays it out again
t.set('#yHome','colonial','change');t.set('#yPat','spine','change');t.click(t.$('#yAgain'));await sleep(20);
ok(roads().length===1&&lots().length===10,'One straight street is kept to when it is chosen as the street layout');
t.set('#sYLotMin','12000');
ok(t.$('#sLotMin').value==='12000'&&t.$$('#checks .flag').filter(f=>/minimum lot area/.test(f.textContent)).length===10&&!/Street right-of-way.*minimum lot area/.test(t.$('#checks').textContent),
  'the minimum lot area is the same number as under Lots; raising it flags the ten lots, never the street');
t.click(t.$('#yAgain'));await sleep(20);L=lots();
ok(L.length===8&&L.every(f=>f.properties.areaSf>=12000)&&!/minimum lot area/.test(t.$('#checks').textContent),'Update lays it out again: eight wider lots, each at least 12,000 sf ('+L.map(f=>f.properties.areaSf).join(', ')+')');
t.set('#sYLotMin','0');t.set('#sYSide','15');
ok(t.$('#sSetback').value==='15'&&t.proj().set.setback===15,'the side setback is the Check tab’s setback to a property line');
t.click(t.$('#yAgain'));await sleep(20);L=lots();
ok(L.length===8&&L.every(f=>{const b=bx(ring(f));return near(b[3]-b[1],75,0.2);})&&/All 8 buildings meet/.test(t.$('#checks').textContent),'with 15 ft side setbacks a Colonial needs 70 ft, so four 75 ft lots a side');
t.set('#sYSide','10');t.set('#sYFront','50');t.click(t.$('#yAgain'));await sleep(20);
ok(t.proj().buildings.every(b=>near(Math.abs(t.toFt(b.c)[0]+100),25+50+15,0.1)),'a 50 ft front setback moves every home back to 50 ft from the street line');
t.set('#sYFront','30');t.set('#sRowW','60');t.set('#sPaveW','28');t.click(t.$('#yAgain'));await sleep(20);
ok(roads()[0].w===28&&near(notLots()[0].properties.areaSf,18000,3)&&lots().every(f=>near(f.properties.areaSf,60*170,2)),'a 60 ft right-of-way with 28 ft of pavement takes 5 ft off the depth of every lot');
t.set('#sRowW','50');t.set('#sPaveW','24');t.set('#yPat','best','change');
t.click(t.$('#yDrive'));t.click(t.$('#yAgain'));await sleep(20);
ok(t.proj().areas.length===0&&t.stat('Parking').v==='0 / 20','driveways can be left off');
t.click(t.$('#yDrive'));t.click(t.$('#yAgain'));await sleep(20);

// ---- one undo takes the whole layout back; Remove this layout leaves what was drawn by hand
t.key('z',{ctrlKey:true});await sleep(20);
ok(t.proj().areas.length===0&&lots().length===10,'Ctrl+Z steps back one layout at a time');
t.tab('build');t.click(t.$('.typebtn[data-type="acc"]'));t.placeAt(-250,-190);t.tab('site');
t.click(t.$('#yAgain'));await sleep(20);p=t.proj();
ok(lots().length===10&&p.buildings.filter(b=>b.sub).length===9&&p.buildings.filter(b=>!b.sub).length===1&&/1 lot keeps the building already on it/.test(t.$('#yOut').textContent),
  'a lot with a building already on it keeps that building and gets no new home');
ok(!t.$('#yClear').hidden&&!t.$('#yAgain').hidden,'Update and Remove this layout show once there is a layout');
t.click(t.$('#yClear'));await sleep(20);p=t.proj();
ok(p.splits.length===0&&p.roads.length===0&&p.areas.length===0&&p.buildings.length===1&&p.buildings[0].type==='acc'&&t.$('#yClear').hidden&&t.$('#yOut').textContent==='','Remove this layout takes away the lots, street, homes and driveways, and leaves the garage');
t.key('z',{ctrlKey:true});await sleep(20);ok(lots().length===10,'and that can be undone');
t.click(t.$('#yClear'));await sleep(20);t.tool('select');t.key('Escape');
{const b=t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon)[0];b.fire('mousedown',{latlng:t.c});b.fire('click',{latlng:t.c});t.M.fire('mouseup',{});t.key('Delete');await sleep(20);}
ok(t.proj().buildings.length===0,'(the garage is deleted again)');

// ---- starting near a corner keeps the whole street on the site
await go(-298,-225);rd=roads();
ok(near(rd[0].pts[0][0],-275,0.1)&&near(rd[0].pts[0][1],-225,0.1),'a click at the corner starts the street 25 ft in, so its right-of-way lies along the side line ('+rd[0].pts[0].map(v=>v.toFixed(0))+')');
ok(lots().length>=10&&/buildings meet/.test(t.$('#checks').textContent),'and the lots are laid out on the one side that has room ('+lots().length+')');
// ---- lots made by hand are still lots
await go(-100,-225);
const before=lots().length;
// ---- the best way in
t.click(t.$('#yAuto'));await sleep(40);
ok(lots().length>before&&lots().length===12,'Find the best way in tries each side and keeps the most: 12 lots from the west side against '+before);
ok((near(roads()[0].pts[0][0],-300,0.1)||near(roads()[0].pts[0][0],100,0.1))&&roads()[0].pts[0][1]>-225&&roads()[0].pts[0][1]<75,'the street now comes in from one of the long sides ('+roads()[0].pts[0].map(v=>v.toFixed(0))+')');

// ---- saved, reopened and exported
const saved=t.proj(),g=geo(),n0=lots().length;
ok(saved.splits.every(s=>s.sub===1&&s.shape)&&saved.set.yAt&&saved.set.yHome==='colonial'&&saved.set.lotW===60,'the layout and its rules are saved with the project');
ok(g.features.filter(f=>f.properties.kind==='lot_line').every(f=>f.properties.laidOut===true),'GeoJSON marks the laid-out lot shapes');
t.click(t.$('#newBtn'));await openVia(t,file('p.json',saved));t.tab('site');
ok(lots().length===n0&&notLots().length===1&&!t.$('#yAgain').hidden&&/^12 lots/.test(res()),'opening the project brings the lots and the street back, ready to Update');
t.click(t.$('#newBtn'));await openVia(t,file('plan.geojson',g));
ok(lots().length===n0&&notLots().length===1&&notLots()[0].properties.name==='Street right-of-way','opening the GeoJSON keeps the street apart from the lots too');

// ---- the sheet counts lots, not the street
t.tab('export');t.click(t.$('#xSheet'));
const txt=Array.from(t.$$('#sheetView svg text')).map(e=>e.textContent);
ok(txt.includes('Lots')&&txt.some(s=>/^12 · smallest [\d,]+ sf$/.test(s))&&txt.some(s=>/^LOT 12/.test(s))&&txt.some(s=>/STREET A/.test(s))&&txt.some(s=>/^STREET RIGHT-OF-WAY/.test(s)),'the site plan sheet shows 12 lots, the smallest of them, and the new street');
ok(txt.filter(s=>/^Colonial \d+$/.test(s)).length>=12&&txt.filter(s=>s==='2 stories').length===12&&txt.filter(s=>s==='1,200 sf').length===12,'at 1 in = 40 ft each home has room for its name, floors and floor area ('+txt.filter(s=>/Colonial|stor|1,200/.test(s)).slice(0,4).join(' | ')+')');
t.set('#shScale','100','change');
{const tx=Array.from(t.$$('#sheetView svg text')).map(e=>e.textContent);
 ok(tx.filter(s=>/^Colonial \d+$/.test(s)).length>=12&&tx.filter(s=>s==='40 × 30').length>=12&&!tx.includes('2 stories')&&!tx.some(s=>/^40 × 30 ft · 2 stories$/.test(s)),'drawn smaller, at 1 in = 100 ft, homes carry their name and size only, so the labels stay inside them ('+tx.filter(s=>/Colonial|40 ×|stor/.test(s)).slice(0,4).join(' | ')+')');}
t.set('#shScale','auto','change');
t.click(t.$('#shClose'));t.tab('site');t.set('#sLotMin','9000');t.tab('export');t.click(t.$('#xSheet'));
{const tx=Array.from(t.$$('#sheetView svg text')).map(e=>e.textContent);ok(tx.includes('Smallest lot')&&tx.includes('9,000 sf min'),'with a minimum lot area set, the zoning check on the sheet compares the smallest lot with it');}
t.set('#shPage','2','change');
{const tx=Array.from(t.$$('#sheetView svg text')).map(e=>e.textContent);
 ok(tx.includes('LOT SCHEDULE')&&tx.includes('12 lots')&&tx.includes('Street right-of-way')&&tx.filter(s=>/^Lot \d+$/.test(s)).length===12,'the data sheet has a lot schedule: the twelve lots, their total, and the street apart');
 ok(tx.includes('12 buildings')&&tx.some(s=>/^each: 1 dwelling × 2/.test(s))&&tx.includes('24'),'and the parking table takes the twelve homes together: 2 spaces each, 24 required');}
t.click(t.$('#shClose'));t.tab('site');t.set('#sLotMin','0');

// ---- a site too small for a street and a lot
await t.freshSite(t.row(0,[0]));t.tab('site');await go(-250,-225);
ok(t.proj().roads.length===0&&/No lot fits/.test(t.$('#toast').textContent),'on a 100 ft wide parcel nothing fits, and it says so rather than drawing a street');
t.click(t.$('#yAuto'));
ok(t.proj().roads.length===0&&/No lot fits/.test(t.$('#toast').textContent),'Find the best way in says the same');
t.key('Escape');
// ---- an L-shaped site and a larger one
await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1])));t.tab('site');await go(-200,-225);
L=lots();
ok(L.length===8&&L.every(f=>f.properties.areaSf>=5400-2)&&/All 8 buildings meet/.test(t.$('#checks').textContent),'an L-shaped site is laid out with a cross street: 8 lots, all passing');
await t.freshSite([0,1,2].map(r=>t.row(r,[0,1,2,3,4,5])).flat());t.tab('site');
t.set('#sLotW','40');t.set('#yHome','cottage','change');
const t0=Date.now();await go(0,-225);const ms=Date.now()-t0;
L=lots();
ok(L.length===36&&roads().length===3&&/All 36 buildings meet/.test(t.$('#checks').textContent),'a 6 acre site takes a street with two cross streets and 36 cottage lots, all passing ('+L.length+', '+ms+' ms)');
ok(L.every(f=>f.properties.areaSf>=40*92-2)&&t.proj().splits.length===36,'every lot shape made a lot of at least the width and depth asked for');
ok(ms<4000,'in reasonable time ('+ms+' ms)');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
