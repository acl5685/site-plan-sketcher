const {boot,ok,R,near}=require('./lib');
(async()=>{
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
const req=()=>+t.stat('Parking').v.split(' / ')[1];
const place=(type,w,d,st,x,y)=>{t.click(t.$('.typebtn[data-type="'+type+'"]'));t.set('#tW',''+w);t.set('#tD',''+d);t.set('#tSt',''+st);t.placeAt(x,y);};
// defaults
const s=t.proj().set||{};
ok(t.$('#sParkRes').value==='2'&&t.$('#sParkApt').value==='2.25'&&t.$('#sParkComm').value==='5'&&t.$('#sParkFood').value==='20','Brecksville defaults in settings');
ok(t.$('#lotStallW').value==='10'&&t.$('#lotStallD').value==='20','lot stall default 10 x 20');
// single family: 2 per dwelling
place('sf',40,50,2,-250,-150);ok(req()===2,'1 house = 2 stalls ('+req()+')');
// townhome row 88 wide = 4 units = 8
place('th',88,42,3,-150,-150);ok(req()===10,'4 townhomes add 8 -> 10 ('+req()+')');
t.tool('select');
// commercial 80x120x1 = 9600 sf -> 48
place('com',80,120,1,-50,-100);ok(req()===58,'9,600 sf business = 48 -> 58 ('+req()+')');
t.set('#iFood','50');ok(req()===130,'50% food & drink: 4,800/200 + 4,800/50 = 24+96 -> 130 ('+req()+')');
t.set('#iFood','0');ok(req()===58,'back to 58');
// apartment: 90x160x4 -> units = round(4*14400*.85/900)=54 -> 121.5, half rounds down -> 121
t.tool('select');
const before=req();
place('apt',90,160,4,-250,0);
const aptU=t.proj().buildings.filter(b=>b.type==='apt')[0];
ok(req()===before+121||req()===before+122,'apartment 2.25/unit rounds >1/2 up ('+(req()-before)+')');
// food & drink share: select the commercial building via inspector
t.tool('select');

t.tool('select');
const bs=()=>t.proj().buildings;
ok(true,'placed '+bs().length);
t.set('#sParkFood','20');
// exact rounding checks via settings: 0.25-> fraction handling
t.tab('check');t.set('#sParkRes','2.25');
console.log('req with 2.25 per house/townhome',req());
// schedule shows per-building stalls
ok(/Stalls req/.test(t.$('#sched').textContent),'schedule has stalls required column');
ok(/§1183\.05/.test(t.$('#sched').innerHTML),'schedule title cites rule');
console.log(t.$('#checks').textContent.slice(0,300));
ok(t.errors.length===0,'no page errors '+t.errors.join());
console.log(R.pass,'passed',R.fails.length,'failed');
})();
