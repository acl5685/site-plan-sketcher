const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: 400 ft (x -300..100) by 150 ft (y -225..-75)
const t=await boot();t.w.THREE={OrbitControls:function(){}};t.mode.dem=()=>270;
await t.freshSite(t.row(0,[0,1,2,3]));
const F=()=>t.proj().fences;
const hit=id=>Object.values(t.M._layers).find(l=>l.options&&l.options.fenceId===id);
const pickFence=async id=>{const l=hit(id);l.fire('mousedown',{latlng:t.c});l.fire('click',{latlng:t.c});t.M.fire('mouseup',{});await sleep(10);};
const handles=()=>Object.values(t.M._layers).filter(l=>l.options&&l.options.icon&&l.options.icon.options.className==='vh');
const rows=()=>t.$$('#plotTable tbody tr').map(r=>Array.from(r.cells).map(c=>c.textContent));
const num=s=>parseFloat(String(s).replace(/,/g,''));

// ---- the tool
ok(!!t.$('[data-tool="fence"]'),'Fence tool is in the toolbar');
t.tool('fence');
ok(!t.$('#drawbar').hidden&&/first corner again to close/.test(t.$('#hint').textContent),'choosing it shows the draw bar and the hint');
ok(Array.from(t.$('#fenceStyle').options).map(o=>o.value).join()==='privacy,picket,rail,chain,metal','five fence styles to choose from');
// an open run of 100 + 50 ft
await t.draw('fence',[[-250,-200],[-150,-200],[-150,-150]]);
ok(F().length===1&&F()[0].name==='Fence 1'&&F()[0].style==='privacy'&&F()[0].h===6&&!F()[0].closed,'a drawn line becomes Fence 1: wood privacy, 6 ft, open');
ok(!t.$('#insF').hidden&&t.$('#fName').value==='Fence 1','the new fence is selected and shown on the Build tab');
ok(/^150 ft long · 2 runs · about 20 posts/.test(t.$('#fInfo').textContent),'it is 150 ft long in 2 runs ('+t.$('#fInfo').textContent+')');
ok(/1 fence on the plan · 150 ft in all/.test(t.$('#fenceInfo').textContent),'the Fences section totals it');
// style defaults: picking a style for new fences sets that style's usual height
t.set('#fenceStyle','picket','change');
ok(t.$('#fenceH').value==='4','picking Picket for new fences sets the usual 4 ft height');
// a closed loop: click back on the first corner
t.tool('fence');
{const vs=t.$('#oVsnap');if(vs.checked)vs.click();
 [[-100,-200],[-40,-200],[-40,-140],[-100,-140],[-100,-200]].forEach(p=>{t.cursorAt(p[0],p[1]);t.M.fire('click',{latlng:t.ft(p[0],p[1])});});
 await sleep(20);vs.click();}
ok(F().length===2&&F()[1].closed===true&&F()[1].pts.length===4&&F()[1].style==='picket'&&F()[1].h===4,'clicking the first corner again closes the loop (4 corners, picket, 4 ft)');
ok(/^240 ft long · 4 runs · about 30 posts/.test(t.$('#fInfo').textContent),'the loop is 4 × 60 = 240 ft ('+t.$('#fInfo').textContent+')');
t.tool('select');

// ---- select, edit, move, rotate
const id1=F()[0].id,id2=F()[1].id;
t.key('Escape');ok(t.$('#insF').hidden,'Esc deselects');
await pickFence(id1);
ok(!t.$('#insF').hidden&&t.$('#fName').value==='Fence 1'&&!t.$('#selBar').hidden&&t.$('#selName').textContent==='Fence 1','clicking a fence selects it and shows the action bar');
ok(handles().length===3,'a selected fence has a handle on each corner ('+handles().length+')');
t.set('#fStyle','chain','change');t.set('#fH','5');t.set('#fName','Back fence');
ok(F()[0].style==='chain'&&F()[0].h===5&&F()[0].name==='Back fence','style, height and name are editable');
t.set('#fH','0');ok(F()[0].h===5,'a height under 1 ft is ignored');
// drag the end corner 50 ft further north
{const h=handles()[2];h.fire('dragstart');t.key('Shift');h.setLatLng(t.ft(-150,-100));h.fire('drag');t.keyup('Shift');h.fire('dragend');}
ok(near(t.toFt(F()[0].pts[2])[1],-100,0.1)&&/^200 ft long/.test(t.$('#fInfo').textContent),'dragging a corner handle reshapes it (now 200 ft)');
t.key('z',{ctrlKey:true});ok(near(t.toFt(F()[0].pts[2])[1],-150,0.1),'one undo puts the corner back');
await pickFence(id1);
const y0=t.toFt(F()[0].pts[0])[1];t.key('ArrowUp');
ok(near(t.toFt(F()[0].pts[0])[1],y0+1,0.01),'arrow keys nudge the fence 1 ft');
t.key('z',{ctrlKey:true});await pickFence(id1);
const before=F()[0].pts.map(p=>t.toFt(p));t.click(t.$('#sbRotL'));
const aft=F()[0].pts.map(p=>t.toFt(p)),len=P=>Math.hypot(P[1][0]-P[0][0],P[1][1]-P[0][1]);
ok(near(len(before),len(aft),0.01)&&!near(before[0][1],aft[0][1],0.5),'Rotate turns the fence and keeps its length');
t.key('z',{ctrlKey:true});
// closed checkbox
await pickFence(id1);t.$('#fClosed').checked=true;t.$('#fClosed').dispatchEvent(new t.w.Event('change',{bubbles:true}));
ok(F()[0].closed===true&&/3 runs/.test(t.$('#fInfo').textContent),'Closed loop joins the last corner to the first');
t.$('#fClosed').checked=false;t.$('#fClosed').dispatchEvent(new t.w.Event('change',{bubbles:true}));
ok(F()[0].closed===undefined,'and unticking opens it again');
// shift-click adds a fence to a group; delete
await pickFence(id1);hit(id2).fire('click',{latlng:t.c,originalEvent:{shiftKey:true}});
ok(/2/.test(t.$('#mCount').textContent)&&!t.$('#insM').hidden,'Shift+click selects two fences together');
t.key('Escape');await pickFence(id2);t.click(t.$('#fDel'));
ok(F().length===1&&F()[0].id===id1,'Delete fence removes the selected one');
t.key('z',{ctrlKey:true});ok(F().length===2,'undo brings it back');

// ---- 3D view, exports, round trips
t.click(t.$('#view3dBtn'));await sleep(200);
ok(/Fences: 2 · 390 ft/.test((t.$('#v3dFences')||{textContent:''}).textContent),'the 3D view lists 2 fences, 390 ft ('+(t.$('#v3dFences')||{textContent:''}).textContent+')');
t.click(t.$('#v3dClose'));
const p=t.proj();
t.click(t.$('#xGeo'));const gj=JSON.parse(t.dl['site-plan.geojson']),gf=gj.features.filter(f=>f.properties.kind==='fence');
ok(gf.length===2&&gf[0].properties.fenceStyle==='chain'&&gf[0].properties.heightFt===5&&gf[0].properties.lengthFt===150&&gf[0].properties.closed===false,'GeoJSON carries each fence with its style, height and length');
ok(gf[1].geometry.coordinates.length===5&&gf[1].properties.closed===true&&gf[1].properties.styleName==='Picket','a closed fence is exported as a closed line');
t.click(t.$('#xCsv'));const csv=t.dl['building-schedule.csv'];
ok(/"Back fence \(Chain link, 5 ft high\) length ft","150"/.test(csv)&&/"Fence length ft","390"/.test(csv),'CSV lists each fence and the total length');
t.click(t.$('#xDxf'));ok((t.dl['site-plan.dxf'].match(/POLYLINE\n8\nFENCES/g)||[]).length===2,'DXF puts the fences on a FENCES layer');
const a=await boot();await openVia(a,file('p.json',p));
ok(a.proj().fences.length===2&&a.proj().fences[1].closed===true,'opening the project file brings the fences back');
const b=await boot();await openVia(b,file('s.geojson',gj));
const bf=b.proj().fences;
ok(bf.length===2&&bf[0].style==='chain'&&bf[0].h===5&&bf[0].name==='Back fence'&&bf[1].closed===true&&bf[1].pts.length===4,'opening the GeoJSON brings them back with style, height and loop');
// New project clears them
t.click(t.$('#newBtn'));ok(F().length===0,'New project clears the fences');

// ---- lots inside a cut-out area, a home on each, and a fence round a lot
await t.freshSite(t.row(0,[0,1,2,3]));
t.tab('site');t.click(t.$('#splitShapeBtn'));
await t.draw('split',t.rectPts(-280,-205,-80,-105));   // a 200 × 100 ft area for homes
const byArea=()=>rows().slice().sort((p,q)=>num(p[1])-num(q[1]));
ok(rows().length===2&&near(num(byArea()[0][1]),20000,25),'a homes area cut out of the site is its own lot of 20,000 sf');
const restOutline=()=>{t.click(t.$('#xGeo'));return JSON.stringify(JSON.parse(t.dl['site-plan.geojson']).features.filter(f=>f.properties.kind==='lot').sort((p,q)=>q.properties.areaSf-p.properties.areaSf)[0].geometry.coordinates);};
const rest0=restOutline();
// two lines drawn just across the homes area divide it into three; they stop 5 ft outside it, inside the rest of the site
t.click(t.$('#splitBtn'));
await t.draw('split',[[-213,-210],[-213,-100]]);
await t.draw('split',[[-147,-210],[-147,-100]]);t.tool('select');
ok(rows().length===4,'two lines across the homes area make it three lots, four with the rest of the site ('+rows().length+')');
const small=byArea().slice(0,3).map(r=>num(r[1]));
ok(near(small[0],6600,20)&&near(small[1],6700,20)&&near(small[2],6700,20),'the three home lots are about 6,600, 6,700 and 6,700 sf ('+small.join(', ')+')');
ok(near(num(byArea()[3][1]),40000,40),'the rest of the site is still one lot of about 40,000 sf ('+byArea()[3][1]+')');
// the rest of the site keeps a clean outline: the lines that poke 5 ft into it leave no slits
ok(restOutline()===rest0,'and its outline is exactly what it was before the two lines');
// a line that only shaves a strip under 2 ft wide off a lot does not make a sliver "lot"
await t.draw('split',[[-285,-104],[-75,-104]]);t.tool('select');
ok(rows().length===4,'a line 1 ft inside a lot edge leaves the lots as they were, with no sliver lot ('+rows().length+')');
t.key('z',{ctrlKey:true});
// a home on each of the three lots
t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));
for(const x of[-246,-180,-113]){await sleep(600);t.M.fire('click',{latlng:t.ft(x,-155)});t.click(t.$('#pbAdd'));t.key('Escape');}
ok(t.proj().buildings.length===3&&byArea().slice(0,3).every(r=>/^SF-\d$/.test(r[3]))&&byArea()[3][3]==='—','clicking each lot and Add it puts one home on each ('+rows().map(r=>r[3]).join(', ')+')');
ok(!/Crosses a lot line|Closest approach/.test(t.$('#checks').textContent),'every home clears its own lot lines');
// fence the middle lot
await sleep(600);t.M.fire('click',{latlng:t.ft(-180,-108)});
ok(!t.$('#plotBar').hidden&&/^Lot \d · 6,[56]\d\d sf/.test(t.$('#pbName').textContent)&&!t.$('#pbFence').hidden,'the lot panel offers Fence this lot');
t.click(t.$('#pbFence'));
const lf=F()[0];
ok(F().length===1&&lf.closed===true&&lf.pts.length===4&&/^Lot \d fence$/.test(lf.name),'Fence this lot adds a closed fence on the lot\'s four corners, named for the lot');
ok(/^33\d ft long/.test(t.$('#fInfo').textContent)&&t.$('#plotBar').hidden,'it is the lot perimeter, 2 × (66 + 100) ≈ 332 ft ('+t.$('#fInfo').textContent+')');
ok(t.errors.length===0&&a.errors.length===0&&b.errors.length===0,'no page errors ('+t.errors.concat(a.errors,b.errors).join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
