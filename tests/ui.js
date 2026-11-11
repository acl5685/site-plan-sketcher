const {boot,ok,R,sleep,near}=require('./lib');
(async()=>{
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]));
const handle=()=>Object.values(t.M._layers).find(l=>l.options&&l.options.icon&&l.options.icon.options.className==='rh');
const selectFirst=async pane=>{const l=t.layers(pane).find(l=>l instanceof t.w.L.Polygon);l.fire('mousedown',{latlng:t.c});l.fire('click',{latlng:t.c});t.M.fire('mouseup',{});await sleep(10);};
const b0=()=>t.proj().buildings[0];
t.tab('build');t.tool('building');t.placeAt(-200,-150);t.tool('select');t.key('Escape');
ok(t.$('#selBar').hidden,'no action bar before anything is selected');
ok(!handle(),'no rotate handle before anything is selected');
await selectFirst('pBldg');
ok(!t.$('#selBar').hidden&&t.$('#selName').textContent===b0().name,'selecting a building shows the action bar with its name');
ok(!t.$('#sbDup').hidden,'Duplicate is offered for a building');
// rotate buttons
const r0=b0().rot;
t.click(t.$('#sbRotL'));ok(near(b0().rot,r0+15,1e-6),'Rotate left turns it 15° counter-clockwise');
t.click(t.$('#sbRotR'));t.click(t.$('#sbRotR'));ok(near(b0().rot,r0-15,1e-6),'Rotate right twice ends 15° clockwise');
t.key('z',{ctrlKey:true});ok(near(b0().rot,r0,1e-6),'undo steps the rotation back');
// rotate handle: starts beyond the far side of the building; dragging it due east of the centre turns the building -90°
ok(t.$('#selBar').hidden,'undo deselects, which hides the bar');
await selectFirst('pBldg');
let h=handle();ok(!!h,'a rotate handle sits by the selected building');
const cft=t.toFt(b0().c),hft=t.toFt([h.getLatLng().lng,h.getLatLng().lat]);
ok(near(hft[0],cft[0],0.5)&&hft[1]>cft[1]+b0().d/2,'handle starts straight past the building\'s far side');
h.fire('dragstart');h.setLatLng(t.ft(cft[0]+120,cft[1]));h.fire('drag');h.fire('dragend');
ok(near(b0().rot,-90,1e-6),'dragging the handle a quarter turn sets rotation to -90° ('+b0().rot+')');
t.key('z',{ctrlKey:true});ok(near(b0().rot,r0,1e-6),'one undo restores the angle from before the drag');
// Shift snaps the handle to the rotation step
await selectFirst('pBldg');h=handle();
h.fire('dragstart');h.setLatLng(t.ft(cft[0]+100*Math.cos(57*Math.PI/180),cft[1]+100*Math.sin(57*Math.PI/180)));h.fire('drag',{originalEvent:{shiftKey:true}});h.fire('dragend');
ok(near(b0().rot,-30,1e-6),'with Shift a 33° turn snaps to 30° ('+b0().rot+')');
// duplicate, delete, done
t.click(t.$('#sbDup'));ok(t.proj().buildings.length===2,'Duplicate adds a second building');
t.click(t.$('#sbDel'));ok(t.proj().buildings.length===1,'Delete removes the selected one');
await selectFirst('pBldg');t.click(t.$('#sbDone'));
ok(t.$('#selBar').hidden&&!handle(),'Done deselects and hides the bar and the handle');
// areas rotate with the handle too, keeping their size
await t.draw('area',t.rectPts(-80,-200,-20,-120));t.tool('select');await selectFirst('pAreas');
ok(!t.$('#selBar').hidden&&t.$('#sbDup').hidden,'an area gets the bar without Duplicate');
const a0=t.proj().areas[0].ring.map(p=>t.toFt(p));h=handle();ok(!!h,'an area gets a rotate handle');
h.fire('dragstart');h.setLatLng(t.ft(-50+150,-160));h.fire('drag');h.fire('dragend');
const a1=t.proj().areas[0].ring.map(p=>t.toFt(p)),ar=r=>Math.abs(r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2);
ok(near(ar(a0),ar(a1),1)&&near(a1[0][0],-90,0.6)&&near(a1[0][1],-130,0.6),'area turned -90° about its centre, same size ('+a1[0].map(v=>v.toFixed(1))+')');
// drawing tools hide the bar
t.tool('road');ok(t.$('#selBar').hidden,'switching to a drawing tool hides the bar');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
