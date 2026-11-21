const {boot,ok,R,sleep}=require('./lib');
(async()=>{
// The animated scene needs WebGL, which the test browser does not have; what it will show is listed in the 3D view's
// notes, worked out from the plan, and that is what is checked here.
// site: two rows of four parcels = 400 ft (x -300..100) by 300 ft (y -225..75)
const t=await boot();t.w.THREE={OrbitControls:function(){}};t.mode.dem=()=>270;
await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
const open3d=async()=>{t.click(t.$('#view3dBtn'));await sleep(200);};
const close3d=()=>t.click(t.$('#v3dClose'));
const scene=async()=>{await open3d();const s=(t.$('#v3dScene')||{textContent:''}).textContent;close3d();return s;};
const num=(s,re)=>+((s.match(re)||[])[1]||0);
const skip=()=>{if(!t.$('#lsAsk').hidden)t.click(t.$('#lsSkip'));};

ok(!!t.$('#v3dPlay')&&/eating in the courtyard/.test(t.$('#v3dPlay').title),'the 3D view has a Play scene button that says what it shows');
let s=await scene();
ok(/nothing to animate yet/.test(s),'an empty plan says there is nothing to animate yet ('+s+')');
// ---- a road: cars
t.set('#roadW','24');await t.draw('road',[[-290,-200],[90,-200]]);
s=await scene();ok(num(s,/(\d+) cars?/)===2&&!/eating|children/.test(s),'a 380 ft road gets two cars and nothing else ('+s+')');
// ---- a sidewalk: people walking
await t.draw('walk',[[-290,-170],[90,-170]]);
s=await scene();ok(num(s,/(\d+) walking/)===3,'a 380 ft sidewalk gets three people walking ('+s+')');
// ---- a courtyard (plaza): café tables with people eating, a couple talking, people strolling round it
t.set('#areaKind','hard','change');await t.draw('area',t.rectPts(-250,-140,-190,-80));        // 60 x 60 ft = 3,600 sf
s=await scene();
const tables=num(s,/at (\d+) tables?/),eating=num(s,/(\d+) eating/);
ok(tables>=1&&tables<=6&&eating>=tables*2&&eating<=tables*4,'the courtyard gets café tables, each with two to four people eating ('+s+')');
ok(num(s,/(\d+) walking/)>3,'and people strolling round it as well as along the sidewalk ('+num(s,/(\d+) walking/)+')');
ok(/2 talking/.test(s),'and a couple standing talking');
ok(num(s,/(\d+) children playing/)>=3,'at 3,600 sf it has room for children playing too ('+s+')');
// a small courtyard: a table, but no children running through it
t.click(t.$('#newBtn'));await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.set('#areaKind','hard','change');await t.draw('area',t.rectPts(-250,-140,-220,-110));        // 30 x 30 ft
s=await scene();ok(num(s,/at (\d+) tables?/)===1&&!/children/.test(s),'a 30 ft courtyard gets one table and no ball games ('+s+')');
// ---- lawns: children playing and a picnic; planted beds are left alone
t.click(t.$('#newBtn'));await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.set('#areaKind','open','change');await t.draw('area',t.rectPts(-250,-150,-150,-50));         // 100 x 100 ft of open space
s=await scene();
ok(num(s,/(\d+) children playing/)>=3&&/picnic/.test(s)&&!/tables?/.test(s),'open space gets children playing and a picnic, not café tables ('+s+')');
t.click(t.$('#newBtn'));await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.set('#areaKind','land','change');await t.draw('area',t.rectPts(-250,-150,-150,-50));
if(!t.$('#lsAsk').hidden)t.click(t.$('#lsAsk [data-use="screen"]'));
s=await scene();ok(!/children|eating/.test(s),'a screening bed is planting, so nobody sits or plays in it ('+s+')');
t.set('#aUse','lawn','change');
s=await scene();ok(/children playing/.test(s),'changed to lawn, the children come out ('+s+')');
// ---- nobody sits in a building or on a walk
t.click(t.$('#newBtn'));await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.set('#areaKind','hard','change');await t.draw('area',t.rectPts(-250,-140,-190,-80));
t.click(t.$('.typebtn[data-type="com"]'));t.set('#tW','58');t.set('#tD','58');t.set('#tRot','0');t.placeAt(-220,-110); // a building over nearly all of it
s=await scene();ok(!/eating|children|talking/.test(s),'a plaza under a building has no tables ('+s+')');
// the same plan gives the same scene every time
t.key('z',{ctrlKey:true});const s1=await scene(),s2=await scene();
ok(s1===s2&&/eating/.test(s1),'the scene is the same each time it is opened ('+s1+')');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
