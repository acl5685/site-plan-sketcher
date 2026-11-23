const {boot,ok,R,sleep,near}=require('./lib');
(async()=>{
// site: two rows of four parcels = 400 ft (x -300..100) by 300 ft (y -225..75)
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
const bL=()=>t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon&&!/ent-mark/.test(l.options.className||''));
const aL=()=>t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon&&!/plant-path/.test(l.options.className||''));
const px=(x,y,dx,dy)=>{const c=t.M.latLngToContainerPoint(t.ft(x,y));return t.M.containerPointToLatLng([c.x+(dx||0),c.y+(dy||0)]);};
// press at a point, move the pointer by so many pixels, let go, then the click that follows
const press=async(layer,x,y,dx,dy)=>{
  layer.fire('mousedown',{latlng:t.ft(x,y),originalEvent:{}});
  t.M.fire('mousemove',{latlng:px(x,y,dx,dy)});await sleep(40);
  t.M.fire('mouseup',{});await sleep(20);
  layer.fire('click',{latlng:px(x,y,dx,dy)});await sleep(10);
};
const keyOn=(el,key)=>el.dispatchEvent(new t.w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));

// ---- a click with an unsteady hand does not move anything
t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','40');t.set('#tD','40');t.set('#tRot','0');t.placeAt(-200,-100);
t.tool('select');t.key('Escape');
const B=()=>t.proj().buildings[0],c0=t.toFt(B().c);
await press(bL()[0],-200,-100,2,1);
ok(near(t.toFt(B().c)[0],c0[0],1e-6)&&near(t.toFt(B().c)[1],c0[1],1e-6),'clicking a building while the pointer slips 2 pixels selects it and leaves it exactly where it was');
ok(!t.$('#insB').hidden,'and it is selected');
t.key('z',{ctrlKey:true});
ok(t.proj().buildings.length===0,'so the click left nothing of its own to undo: undo goes back to before the building was placed ('+t.proj().buildings.length+' buildings)');
t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','40');t.set('#tD','40');t.set('#tRot','0');t.placeAt(-200,-100);t.tool('select');t.key('Escape');await sleep(520);
await press(bL()[0],-200,-100,14,0);
ok(t.toFt(B().c)[0]>c0[0]+2,'dragging it 14 pixels does move it ('+(t.toFt(B().c)[0]-c0[0]).toFixed(1)+' ft)');
t.key('z',{ctrlKey:true});
// the same for a selected area
t.set('#areaKind','open','change');await t.draw('area',t.rectPts(-100,-150,-40,-90));t.tool('select');await sleep(320);
aL()[0].fire('click',{latlng:t.ft(-70,-120)});await sleep(10);
const r0=JSON.stringify(t.proj().areas[0].ring);
await press(aL()[0],-70,-120,3,-2);
ok(JSON.stringify(t.proj().areas[0].ring)===r0&&!t.$('#insA').hidden,'clicking a selected area with a 3 pixel slip does not nudge it');
await sleep(320);await press(aL()[0],-70,-120,20,0);
ok(JSON.stringify(t.proj().areas[0].ring)!==r0,'a real drag still moves it');
t.key('z',{ctrlKey:true});await sleep(320);

// ---- Delete from the side panel
aL()[0].fire('click',{latlng:t.ft(-70,-120)});await sleep(10);
ok(!t.$('#insA').hidden,'the area is selected');
keyOn(t.$('#aName'),'Delete');
ok(t.proj().areas.length===1,'Delete typed into the Name box edits the name, not the plan');
keyOn(t.$('#aName'),'Backspace');ok(t.proj().areas.length===1,'nor does Backspace there');
keyOn(t.$('#aKind'),'Delete');
ok(t.proj().areas.length===0&&t.$('#insA').hidden,'with a menu in the panel focused (after changing a setting), Delete removes the selected shape');
// Ctrl+Z pressed while that menu still has the keyboard undoes the plan; in a text box it stays with the text
const ctrlZ=el=>el.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true}));
ctrlZ(t.$('#aName'));ok(t.proj().areas.length===0,'Ctrl+Z in a text box is left to the text box');
ctrlZ(t.$('#aKind'));ok(t.proj().areas.length===1,'Ctrl+Z from a menu undoes the deletion');
// and the keyboard is let go of when the selection is dropped
await sleep(320);aL()[0].fire('click',{latlng:t.ft(-70,-120)});await sleep(10);
t.$('#aKind').focus();ok(t.w.document.activeElement===t.$('#aKind'),'a menu in the panel has the keyboard');
t.key('Escape');ok(t.w.document.activeElement!==t.$('#aKind'),'dropping the selection gives the keyboard back to the plan');
await sleep(320);aL()[0].fire('click',{latlng:t.ft(-70,-120)});await sleep(10);
keyOn(t.$('#aKind'),'ArrowDown');ok(t.proj().areas.length===1&&JSON.stringify(t.proj().areas[0].ring)===r0,'arrow keys in a menu still belong to the menu: the shape is not nudged');
t.key('Delete');ok(t.proj().areas.length===0,'Delete with nothing focused works as before');

// ---- a small area under a big one can still be clicked
await t.draw('area',t.rectPts(-90,-140,-60,-110));                  // 30 x 30 ft, drawn first
await t.draw('area',t.rectPts(-150,-200,0,-50));t.tool('select');   // 150 x 150 ft, drawn over it
const small=aL()[0],big=aL()[1];
ok(small._path&&big._path&&!!(big._path.compareDocumentPosition(small._path)&4),'a small area drawn before a big one over it is lifted on top, so it can be clicked');
ok(t.proj().areas[0].ring.length===4&&near(Math.abs(t.toFt(t.proj().areas[0].ring[0])[0]-t.toFt(t.proj().areas[0].ring[1])[0])+Math.abs(t.toFt(t.proj().areas[0].ring[0])[1]-t.toFt(t.proj().areas[0].ring[1])[1]),30,0.5),'the order they are saved in is unchanged');

// ---- Delete on lots and carve-outs
t.click(t.$('#newBtn'));await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
const clickMap=async(x,y)=>{t.M.fire('click',{latlng:t.ft(x,y)});await sleep(10);};
await t.draw('carvepoly',t.rectPts(0,-50,60,10));t.tool('select');
await clickMap(30,-20);
ok(t.proj().carveShapes.length===1,'a carve-out is selected');
t.key('Delete');ok(t.proj().carveShapes.length===0,'Delete removes the selected carve-out');
t.key('z',{ctrlKey:true});ok(t.proj().carveShapes.length===1,'undo brings it back');
t.key('Escape');
await t.draw('split',[[-100,-240],[-100,90]]);t.tool('select');
await clickMap(-200,-75);
ok(!t.$('#plotBar').hidden&&!t.$('#pbDel').hidden,'a lot made by one lot line offers Remove lot line');
t.key('Delete');
ok(t.proj().splits.length===0&&t.$('#plotBar').hidden,'Delete removes that line, joining the lots again');
t.key('z',{ctrlKey:true});
await t.draw('split',[[-200,-240],[-200,90]]);t.tool('select');
await clickMap(-150,-75);                                         // the middle lot, between the two lines
ok(!t.$('#plotBar').hidden&&t.$('#pbDel').hidden,'a lot between two lot lines does not offer to remove "the" line');
t.key('Delete');
ok(t.proj().splits.length===2&&/bounded by 2 lot lines/.test(t.$('#toast').textContent),'Delete there removes nothing and says why ('+t.$('#toast').textContent.slice(0,60)+')');
await clickMap(-250,-75);t.click(t.$('#pbDel'));
ok(t.proj().splits.length===1&&t.proj().splits[0].pts.map(t.toFt).every(p=>near(p[0],-100,0.05)),'the end lot has one line: the button removes just that one');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
