const {boot,ok,R,sleep,near}=require('./lib');
(async()=>{
// site: one row of four parcels = 400 x 150 ft = 60,000 sf (x -300..100, y -225..-75)
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]));
const g=()=>t.stat('Green space'),lit=()=>t.$$('.tool.on').map(b=>b.dataset.tool).join();
const chk=()=>t.$('#checks').textContent;
ok(!!t.$('[data-tool="green"]')&&t.$('[data-tool="green"]').textContent==='Green space','toolbar has a Green space button');
ok(g().v==='100.0%'&&/60,0\d\d sf not built on or paved/.test(g().s),'an empty site is all green space ('+JSON.stringify(g())+')');
// ---- drawing green space
t.tool('green');
ok(lit()==='green'&&t.$('#areaKind').value==='land'&&/corners of the green space/.test(t.$('#hint').textContent),'Green space starts an area drawn as landscaping, with its own hint ('+lit()+')');
await t.draw('green',t.rectPts(-290,-215,-190,-165));
const a=t.proj().areas[0];
ok(a.kind==='land'&&!t.$('#insA').hidden&&/5,00\d sf/.test(t.$('#aInfo').textContent)&&t.$('#aPark').hidden,'it makes a 5,000 sf landscaped area and selects it ('+t.$('#aInfo').textContent.slice(0,40)+')');
ok(g().v==='100.0%'&&/5,00\d sf drawn as landscaping/.test(g().s),'drawing it does not change the share, and the figure says how much is drawn ('+g().s+')');
t.tool('select');t.key('Escape');t.tool('area');ok(lit()==='green','the Area tool lights Green space while it is set to draw landscaping');
t.set('#areaKind','open','change');ok(lit()==='area','and Area for the other kinds');t.tool('select');
// ---- what takes green space away
t.tab('build');t.click(t.$('.typebtn[data-type="com"]'));t.set('#tW','100');t.set('#tD','60');t.set('#tSt','1');t.set('#tRot','0');t.placeAt(-50,-150);t.tool('select');t.key('Escape');
ok(near(t.num(g().v),90,0.05),'a 6,000 sf building leaves 90% ('+g().v+')');
t.set('#areaKind','hard','change');await t.draw('area',t.rectPts(-180,-215,-120,-165));t.tool('select');t.key('Escape');
ok(near(t.num(g().v),85,0.05),'a 3,000 sf plaza leaves 85% ('+g().v+')');
t.set('#areaKind','pond','change');await t.draw('area',t.rectPts(-180,-150,-120,-100));t.tool('select');t.key('Escape');
ok(near(t.num(g().v),80,0.05)&&near(t.num(t.stat('Impervious').v),15,0.05),'a 3,000 sf pond is not green space either, though it is not impervious ('+g().v+')');
await t.draw('parkarea',t.rectPts(-290,-150,-200,-86));t.tool('select');t.key('Escape');      // 90 x 64 = 5,760 sf
ok(near(t.num(g().v),80-9.6,0.1),'5,760 sf of parking leaves 70.4% ('+g().v+')');
// ---- the minimum
t.tab('check');ok(t.$('#sGreenMin').value==='0'&&!/Green space/.test(chk()),'no minimum by default, so no flag');
t.set('#sGreenMin','60');
ok(!/Green space is/.test(chk())&&/minimum 60\.0%/.test(g().s)&&/good/.test(t.$$('#summary .stat').find(s=>s.querySelector('.k').textContent==='Green space').className),'with a 60% minimum the plan passes, and the figure shows the minimum ('+g().s+')');
t.set('#sGreenMin','75');
ok(/Green space is 70\.4% of the site, minimum is 75\.0%\. Short by 2,7[5-9]\d sf\./.test(chk())&&/bad/.test(t.$$('#summary .stat').find(s=>s.querySelector('.k').textContent==='Green space').className),'at 75% it is flagged with the shortfall ('+chk().slice(0,160)+')');
ok(!/meets the current rules/.test(chk()),'and the all-clear line goes');
// saved with the project, and in the CSV
const p=t.proj();ok(p.set.greenMin===75,'the minimum is saved in the project');
t.click(t.$('#xCsv'));const csv=t.dl['building-schedule.csv'];
ok(/"Green space %","70\.4"/.test(csv)&&/"Landscaping and open space drawn sf","500\d"/.test(csv),'the CSV lists green space');
t.set('#sGreenMin','0');ok(!/Green space is/.test(chk()),'0 turns the check off');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
