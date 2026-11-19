const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: two rows of four parcels = 400 ft (x -300..100) by 300 ft (y -225..75)
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
const B=i=>t.proj().buildings[i];
const pick=async i=>{t.tool('select');t.key('Escape');const l=t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon&&!/ent-mark/.test(l.options.className||''))[i];l.fire('mousedown',{latlng:t.c});l.fire('click',{latlng:t.c});t.M.fire('mouseup',{});await sleep(10);};
const flat=a=>Array.isArray(a)&&a.length&&a[0].lat===undefined?a.reduce((o,x)=>o.concat(Array.isArray(x)&&x.length&&x[0].lat===undefined?flat(x):[x]),[]):[a];
const doors=()=>{const l=t.layers('pBldg').filter(l=>/ent-mark/.test((l.options||{}).className||''));return l.reduce((o,m)=>o.concat(flat(m.getLatLngs()).map(r=>r.map(p=>t.toFt([p.lng,p.lat])))),[]);};
const geo=()=>{t.click(t.$('#xGeo'));return JSON.parse(t.dl['site-plan.geojson']);};
const gb=()=>geo().features.filter(f=>f.properties.kind==='building').map(f=>f.properties);

// ---- a store beside a plaza: its entrances can be turned to face the courtyard
t.click(t.$('.typebtn[data-type="com"]'));t.set('#tW','60');t.set('#tD','40');t.set('#tSt','1');t.set('#tRot','0');t.placeAt(-200,-100); // x -230..-170, y -120..-80
t.set('#areaKind','hard','change');await t.draw('area',t.rectPts(-150,-130,-90,-70));                                          // plaza to the east
await pick(0);
ok(t.$('#iEnt').value===''&&doors().length===0&&!t.$('#iEntAll').hidden,'a store starts with entrances facing the nearest road, and no markers on the plan');
t.set('#iEnt','court','change');
let dd=doors();
ok(B(0).ent==='court'&&dd.length===2,'Courtyard: the 40 ft wall gets two shopfront doors ('+dd.length+')');
ok(dd.every(d=>near(d[0][0],-170,0.06)&&near(d[1][0],-170,0.06)&&d[2][0]>-170+2),'they are on the east wall, pointing out toward the plaza ('+JSON.stringify(dd[0].map(p=>p.map(v=>+v.toFixed(1))))+')');
t.set('#iEnt','n','change');dd=doors();
ok(B(0).ent==='n'&&dd.length===3&&dd.every(d=>near(d[0][1],-80,0.06)&&d[2][1]>-80+2),'North: three doors along the 60 ft north wall ('+dd.length+')');
ok(gb()[0].entrancesFace==='n','GeoJSON says which way the entrances face');
t.key('z',{ctrlKey:true});await pick(0);
ok(B(0).ent!=='n'&&t.$('#iEnt').value===(B(0).ent||''),'undo takes the entrance side back, and the menu follows ('+B(0).ent+')');
t.set('#iEnt','','change');ok(B(0).ent===undefined&&doors().length===0&&gb()[0].entrancesFace==='road','back to automatic: no markers, GeoJSON says road');
// the plaza on the other side
t.set('#iEnt','court','change');
await t.draw('area',t.rectPts(-290,-130,-240,-70));await pick(0);                                                              // a second plaza, to the west and nearer (10 ft away)
dd=doors();ok(dd.length===2&&dd.every(d=>near(d[0][0],-230,0.06)&&d[2][0]<-230-2),'with a nearer plaza on the west, the doors move to the west wall');
// ---- every store at once
t.click(t.$('.typebtn[data-type="mu"]'));t.set('#tW','60');t.set('#tD','40');t.set('#tRot','0');t.placeAt(-200,0);
t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(-20,-150);
await pick(0);t.set('#iEnt','s','change');t.click(t.$('#iEntAll'));
ok(B(0).ent==='s'&&B(1).ent==='s'&&B(2).ent===undefined,'Use for all stores sets commercial and mixed-use buildings, and leaves the house alone ('+[B(0).ent,B(1).ent,B(2).ent]+')');
await pick(2);ok(t.$('#iEntAll').hidden&&t.$('#iEnt').value==='','a house has the choice of side, but not the all-stores button');
t.set('#iEnt','e','change');ok(doors().filter(d=>d[2][0]>Math.max(d[0][0],d[1][0])+2).length===1,'a house gets one door marker, on its east wall');

// ---- home styles
const lit=()=>t.$$('.tool.on').map(b=>b.dataset.tool).join();
ok(t.$$('#tHome option').length===13,'twelve home styles to choose from');
t.set('#tHome','ranch','change');
ok(t.$('#tW').value==='62'&&t.$('#tD').value==='32'&&t.$('#tSt').value==='1'&&lit()==='building','Ranch sets a 62 x 32 ft single story and is ready to place ('+t.$('#tW').value+' x '+t.$('#tD').value+')');
t.placeAt(40,-180);t.placeAt(40,-120);
let n=t.proj().buildings.length,h1=B(n-2),h2=B(n-1);
ok(h1.type==='sf'&&h1.name==='Ranch 1'&&h2.name==='Ranch 2'&&h1.home==='ranch'&&h1.roof==='hip'&&h1.w===62&&h1.st===1,'a placed Ranch is a single-family home named Ranch 1, with a hip roof ('+h1.name+', '+h2.name+')');
t.set('#tHome','duplex','change');t.placeAt(-60,20);n=t.proj().buildings.length;
ok(B(n-1).type==='th'&&B(n-1).name==='Duplex 1'&&gb()[n-1].units===2&&gb()[n-1].homeStyle==='Duplex','a Duplex is a row of two homes ('+gb()[n-1].units+' units)');
t.click(t.$('.typebtn[data-type="sf"]'));ok(t.$('#tHome').value==='','choosing a plain building type clears the home style');
t.placeAt(-120,40);n=t.proj().buildings.length;ok(/^SF-/.test(B(n-1).name)&&!B(n-1).home,'and the next one is a plain single-family building again ('+B(n-1).name+')');
// ---- saved and opened again
const g=geo();t.click(t.$('#newBtn'));await openVia(t,file('plan.geojson',g));
const bs=t.proj().buildings,rb=bs.filter(b=>b.name==='Ranch 1')[0];
ok(bs.length===n&&bs[0].ent==='s'&&bs[2].ent==='e'&&rb&&rb.home==='ranch'&&rb.roof==='hip','entrance sides and home styles come back when the GeoJSON is opened ('+bs.length+' buildings)');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
