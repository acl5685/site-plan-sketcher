const {boot,ok,R,sleep,near}=require('./lib');
(async()=>{
// site: two rows of four parcels = x -300..100, y -225..75
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
const ctrl=k=>t.key(k,{ctrlKey:true});
const B=()=>t.proj().buildings,A=()=>t.proj().areas,at=b=>t.toFt(b.c);
const bl=()=>t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon);
const al=()=>t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon);
const mid=r=>{const xs=r.map(p=>p[0]),ys=r.map(p=>p[1]);return [(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];};
const toastTxt=()=>t.$('#toast').textContent;

// ---- one building: Ctrl+C, move the mouse, Ctrl+V
t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','40');t.set('#tD','50');t.set('#tSt','3');t.set('#tRot','0');t.placeAt(-200,-150);t.tool('select');
ok(!t.$('#selBar').hidden&&!t.$('#sbCopy').hidden,'the selection bar has a Copy button');
ctrl('v');ok(B().length===1,'Ctrl+V with nothing copied does nothing');
ctrl('c');ok(/Copied 1 shape/.test(toastTxt())&&B().length===1,'Ctrl+C copies the selected building ('+toastTxt()+')');
t.key('Shift');t.cursorAt(-80,-100);t.keyup('Shift');ctrl('v');
let b=B();
ok(b.length===2&&near(at(b[1])[0],-80,0.05)&&near(at(b[1])[1],-100,0.05),'Ctrl+V puts the copy with its centre at the mouse ('+at(b[1]).map(v=>v.toFixed(1))+')');
ok(b[1].name==='SF-2'&&b[1].w===40&&b[1].d===50&&b[1].st===3&&b[1].id!==b[0].id,'it is a new building, SF-2, with the same size and stories');
ok(near(at(b[0])[0],-200,0.05)&&near(at(b[0])[1],-150,0.05),'the original has not moved');
ok(!t.$('#insB').hidden&&t.$('#iName').value==='SF-2'&&/Pasted 1 shape at the mouse/.test(toastTxt()),'the copy is selected ('+toastTxt()+')');
ctrl('v');b=B();
ok(b.length===3&&near(at(b[2])[0],-70,0.05)&&near(at(b[2])[1],-110,0.05)&&b[2].name==='SF-3','pasting again on the same spot steps the next copy 10 ft aside ('+at(b[2]).map(v=>v.toFixed(1))+')');
ctrl('z');ok(B().length===2,'undo takes back one paste');
// the mouse is off the map: the copy goes beside the original
t.M.fire('mouseout',{});ctrl('v');b=B();
ok(b.length===3&&near(at(b[2])[0],-185,0.05)&&near(at(b[2])[1],-165,0.05)&&/beside the original/.test(toastTxt()),'with the mouse off the map the copy lands 15 ft beside the original ('+at(b[2]).map(v=>v.toFixed(1))+')');
ctrl('z');ctrl('z');ok(B().length===1,'undo, undo: back to one building');

// ---- typing in a box: Ctrl+C / Ctrl+V are left to the browser
bl()[0].fire('mousedown',{latlng:t.ft(-200,-150),originalEvent:{}});t.M.fire('mouseup',{});
const inp=t.$('#iName'),evt=k=>new t.w.KeyboardEvent('keydown',{key:k,ctrlKey:true,bubbles:true});
t.cursorAt(0,0);inp.dispatchEvent(evt('v'));
ok(B().length===1,'Ctrl+V while typing in a field does not paste a shape');

// ---- several shapes together keep their arrangement
t.set('#areaKind','land','change');await t.draw('area',t.rectPts(-150,-175,-110,-125));
t.set('#roadW','20');await t.draw('road',[[-250,-200],[-100,-200]]);
t.tool('select');t.key('Escape');
bl()[0].fire('mousedown',{latlng:t.ft(-200,-150),originalEvent:{}});t.M.fire('mouseup',{});
al()[0].fire('click',{latlng:t.ft(-130,-150),originalEvent:{shiftKey:true}});
ok(t.$('#mCount').textContent==='2','building and area are selected together');
ctrl('c');ok(/Copied 2 shapes/.test(toastTxt()),'Ctrl+C copies both ('+toastTxt()+')');
t.key('Shift');t.cursorAt(-150,0);t.keyup('Shift');ctrl('v');
b=B();let a=A();
const nb=at(b[1]),na=mid(a[1].ring.map(t.toFt));
ok(b.length===2&&a.length===2&&t.proj().roads.length===1,'both are pasted, and the road that was not selected is not');
ok(near(na[0]-nb[0],70,0.1)&&near(na[1]-nb[1],0,0.1),'they keep their spacing (area 70 ft east of the building: '+(na[0]-nb[0]).toFixed(1)+')');
// the pair spans x -220..-110, y -175..-125, so its middle (-165,-150) goes to the mouse (-150,0)
ok(near(nb[0],-185,0.1)&&near(nb[1],0,0.1),'and the middle of the group is at the mouse (building at '+nb.map(v=>v.toFixed(1))+')');
ok(t.$('#mCount').textContent==='2'&&!t.$('#insM').hidden&&a[1].name==='Landscaping','the two copies are selected as a group');
t.key('ArrowRight',{shiftKey:true});
ok(near(at(B()[1])[0],-180,0.1)&&near(at(B()[0])[0],-200,0.05),'so the arrow keys move the copies, not the originals');

// ---- cut
t.key('Escape');
al()[1].fire('click',{latlng:t.ft(-130,0),originalEvent:{}});
ctrl('x');ok(A().length===1&&/Cut 1 shape/.test(toastTxt()),'Ctrl+X removes the selected area ('+toastTxt()+')');
t.key('Shift');t.cursorAt(40,30);t.keyup('Shift');ctrl('v');
a=A();ok(a.length===2&&near(mid(a[1].ring.map(t.toFt))[0],40,0.1)&&near(mid(a[1].ring.map(t.toFt))[1],30,0.1),'and Ctrl+V puts it back at the mouse');

// ---- names, and what a copy carries with it
t.key('Escape');const rl=()=>t.layers('pRoads').filter(l=>l instanceof t.w.L.Polygon);
rl()[0].fire('click',{latlng:t.ft(-200,-200),originalEvent:{}});
ctrl('c');t.key('Shift');t.cursorAt(-175,-100);t.keyup('Shift');ctrl('v');
let r=t.proj().roads;
ok(r.length===2&&r[1].name==='Road 2'&&r[1].width===20&&near(t.toFt(r[1].pts[0])[0],-250,0.1)&&near(t.toFt(r[1].pts[0])[1],-100,0.1),'a road copy is Road 2, same width, same length ('+r[1].name+')');
t.set('#rName','Main St');ctrl('c');t.key('Shift');t.cursorAt(-175,-80);t.keyup('Shift');ctrl('v');
r=t.proj().roads;ok(r[2].name==='Main St copy','a shape you named gets "copy" after its name ('+r[2].name+')');
t.key('Delete');t.key('Escape');
// a parking area copies its stall settings and lays itself out again
await t.draw('parkarea',t.rectPts(-290,-60,-210,60));
t.tool('select');t.set('#aSW','9');
const stalls1=+t.stat('Parking').v.split(' / ')[0];
ctrl('c');t.key('Shift');t.cursorAt(-50,0);t.keyup('Shift');ctrl('v');
a=A();const pk=a[a.length-1];
ok(pk.kind==='park'&&pk.name==='Parking 2'&&pk.pk.w===9&&+t.stat('Parking').v.split(' / ')[0]===stalls1*2&&stalls1>0,'a parking area copy keeps its 9 ft stalls and doubles the count ('+stalls1+' → '+t.stat('Parking').v+')');
// a fence
t.key('Escape');await t.draw('fence',[[-290,-70],[-210,-70]]);t.tool('select');
ctrl('c');t.key('Shift');t.cursorAt(0,-150);t.keyup('Shift');ctrl('v');
const f=t.proj().fences;ok(f.length===2&&f[1].name==='Fence 2'&&f[1].style===f[0].style&&f[1].h===f[0].h,'a fence copy is Fence 2 in the same style');

// ---- Duplicate works for any shape, and for a group
t.key('Escape');al()[0].fire('click',{latlng:t.ft(-130,-150),originalEvent:{}});
ok(!t.$('#sbDup').hidden,'Duplicate shows for an area too');
const a0=A().length;t.click(t.$('#sbDup'));a=A();
const src=mid(a[0].ring.map(t.toFt)),dup=mid(a[a.length-1].ring.map(t.toFt));
ok(a.length===a0+1&&near(dup[0]-src[0],15,0.1)&&near(dup[1]-src[1],-15,0.1),'Duplicate sets a copy 15 ft beside it');
t.click(t.$('#sbCopy'));ok(/Copied 1 shape/.test(toastTxt()),'the Copy button copies');

// ---- into another project
t.key('Escape');bl()[0].fire('mousedown',{latlng:t.ft(-200,-150),originalEvent:{}});t.M.fire('mouseup',{});ctrl('c');
await t.freshSite(t.row(0,[0,1,2,3]));
ok(B().length===0,'new project is empty');
t.key('Shift');t.cursorAt(-100,-150);t.keyup('Shift');ctrl('v');
ok(B().length===1&&B()[0].name==='SF-1'&&near(at(B()[0])[0],-100,0.05),'what was copied can be pasted into a new project ('+(B()[0]||{}).name+')');
// a second window: the copy is kept in the browser
const u=await boot({});u.w.localStorage.setItem('sitePlanSketcher.clip.v1',t.w.localStorage.getItem('sitePlanSketcher.clip.v1'));
await u.freshSite(u.row(0,[0,1,2,3]));u.key('Shift');u.cursorAt(-100,-150);u.keyup('Shift');u.key('v',{ctrlKey:true});
ok(u.proj().buildings.length===1,'and in another window of the same browser');
// while drawing, Ctrl+V is ignored
t.tool('road');t.cursorAt(-250,-100);t.M.fire('click',{latlng:t.ft(-250,-100)});ctrl('v');
ok(B().length===1,'Ctrl+V does nothing in the middle of drawing a line');t.key('Escape');t.key('Escape');
for(const x of [t,u])ok(x.errors.length===0,'no page errors ('+x.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
