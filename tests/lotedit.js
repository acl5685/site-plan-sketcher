const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: two rows of four parcels = 400 ft (x -300..100) by 300 ft (y -225..75)
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
const marks=cls=>Object.values(t.M._layers).filter(l=>l.options&&l.options.icon&&l.options.icon.options.className===cls);
const corners=()=>marks('vh'),movers=()=>marks('vh vmv'),dims=()=>marks('dim road lot-dim').map(m=>parseFloat(m.options.icon.options.html.replace(/<[^>]+>/g,'')));
const at=m=>t.toFt([m.getLatLng().lng,m.getLatLng().lat]);
const pull=(m,x,y)=>{m.fire('dragstart');m.setLatLng(t.ft(x,y));m.fire('drag');m.fire('dragend');};
const clickMap=async(x,y)=>{t.M.fire('click',{latlng:t.ft(x,y)});await sleep(10);};
const bar=()=>t.$('#plotBar').hidden?'':t.$('#pbName').textContent;
const sf=()=>+(bar().match(/([\d,]+) sf/)||['','0'])[1].replace(/,/g,'');
const splits=()=>t.proj().splits.map(s=>s.pts.map(t.toFt));

// ---- two lots made by one line down the middle (x = -100)
await t.draw('split',[[-100,-240],[-100,90]]);t.tool('select');
await clickMap(-200,-75);
ok(/^Lot 1/.test(bar())&&near(sf(),60000,60),'clicking inside a lot selects it: Lot 1, 60,000 sf ('+bar()+')');
ok(corners().length===2&&movers().length===1,'its lot line gets a handle at each end and one to slide it ('+corners().length+' + '+movers().length+')');
ok(/drag the square handles/.test(t.$('#pbEdit').textContent),'and the lot bar says how to resize it');
let d=dims();
ok(d.length===4&&d.filter(v=>near(v,200,0.6)).length===2&&d.filter(v=>near(v,300,0.6)).length===2,'the four sides of the lot are labelled with their lengths ('+d.join(', ')+')');
// slide the whole line 50 ft east: the lot grows by 50 x 300
const mv=movers()[0],m0=at(mv);
pull(mv,m0[0]+50,m0[1]);
ok(splits()[0].every(p=>near(p[0],-50,0.05))&&near(sf(),75000,80),'sliding the line 50 ft east makes the lot 250 ft wide: 75,000 sf ('+bar()+')');
ok(/^Lot 1/.test(bar())&&dims().filter(v=>near(v,250,0.6)).length===2,'the same lot stays selected, and its sides now read 250 ft ('+dims().join(', ')+')');
t.key('z',{ctrlKey:true});await clickMap(-200,-75);
ok(splits()[0].every(p=>near(p[0],-100,0.05))&&near(sf(),60000,60),'one undo puts the line back');
// drag one end: the line leans, the lot is no longer a rectangle
const top=corners().find(m=>at(m)[1]>0);
t.key('Shift');pull(top,-40,90);t.keyup('Shift');
ok(splits()[0].some(p=>near(p[0],-40,0.3))&&splits()[0].some(p=>near(p[0],-100,0.3))&&sf()>60000,'dragging one end of the line leans it and changes the lot ('+bar()+')');
t.key('z',{ctrlKey:true});
// the lot on the other side shares the line
await clickMap(0,-75);
ok(/^Lot 2/.test(bar())&&corners().length===2&&movers().length===1,'the lot on the other side of the line can move it too ('+bar()+')');
t.key('Escape');ok(t.$('#plotBar').hidden&&corners().length===0&&movers().length===0,'Escape lets go of the lot and its handles');

// ---- a lot cut out as a shape (Cut out lot): its corners drag, and only its own shape gets handles
await t.draw('cutlot',t.rectPts(-280,-200,-220,-120));t.tool('select');
await clickMap(-250,-160);
ok(near(sf(),4800,10)&&corners().length===4&&movers().length===1,'a cut-out lot of 60 x 80 ft: 4,800 sf, four corner handles and one to slide it ('+bar()+', '+corners().length+')');
d=dims();ok(d.length===4&&d.filter(v=>near(v,60,0.3)).length===2&&d.filter(v=>near(v,80,0.3)).length===2,'its sides read 60 and 80 ft ('+d.join(', ')+')');
const ne=corners().find(m=>near(at(m)[0],-220,0.5)&&near(at(m)[1],-120,0.5)),se=corners().find(m=>near(at(m)[0],-220,0.5)&&near(at(m)[1],-200,0.5));
t.key('Shift');pull(ne,-200,-120);t.keyup('Shift');
await clickMap(-250,-160);
const se2=corners().find(m=>near(at(m)[0],-220,0.5)&&near(at(m)[1],-200,0.5));
t.key('Shift');pull(se2,-200,-200);t.keyup('Shift');
await clickMap(-250,-160);
ok(near(sf(),6400,12)&&dims().filter(v=>near(v,80,0.3)).length===4,'pulling its two east corners out 20 ft makes it 80 x 80 ft: 6,400 sf ('+bar()+')');
const mv2=movers()[0],p2=at(mv2);pull(mv2,p2[0]+30,p2[1]);
await clickMap(-220,-160);
ok(near(sf(),6400,12)&&t.proj().splits[1].pts.map(t.toFt).every(p=>p[0]>=-250.1&&p[0]<=-169.9),'sliding it 30 ft east moves the whole lot, same size ('+bar()+')');

// ---- a carve-out: click inside it, drag a corner
t.key('Escape');
const site0=t.stat('Site area').v;
await t.draw('carvepoly',t.rectPts(0,-50,60,10));t.tool('select');
const site1=t.stat('Site area').v;
await clickMap(30,-20);
ok(site0!==site1&&t.w.document.querySelectorAll('.carve-sel').length>=0&&corners().length===4&&movers().length===1,'clicking inside a carved-out shape selects it, with handles on its corners ('+corners().length+')');
d=dims();ok(d.length===4&&d.every(v=>near(v,60,0.3)),'its sides are labelled: 60 ft each ('+d.join(', ')+')');
const cc=corners().find(m=>near(at(m)[0],60,0.5)&&near(at(m)[1],10,0.5));
t.key('Shift');pull(cc,90,10);t.keyup('Shift');
ok(t.proj().carveShapes[0].ring.map(t.toFt).some(p=>near(p[0],90,0.3)&&near(p[1],10,0.3))&&dims().filter(v=>near(v,90,0.3)).length===1,'dragging a corner makes the carve-out bigger: one side now reads 90 ft ('+dims().join(', ')+')');
t.key('z',{ctrlKey:true});ok(t.proj().carveShapes[0].ring.map(t.toFt).every(p=>p[0]<=60.1),'undo restores it');
t.key('Escape');ok(corners().length===0,'Escape lets go');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
