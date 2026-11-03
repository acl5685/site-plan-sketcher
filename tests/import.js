const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,text)=>({name,text:()=>Promise.resolve(typeof text==='string'?text:JSON.stringify(text))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
const exportGeo=t=>{t.click(t.$('#xGeo'));return JSON.parse(t.dl['site-plan.geojson']);};
const of=(g,k)=>g.features.filter(f=>f.properties.kind===k);
const sum=(a,fn)=>a.reduce((s,x)=>s+fn(x),0);
(async()=>{
// ---- source plan: project with every object type, loaded through the new open path
const A=await boot();await A.freshSite(A.row(0,[0,1,2,3]));
const base=A.proj(),L=A.ftLL;
const rect=(x0,y0,x1,y1)=>[L(x0,y0),L(x1,y0),L(x1,y1),L(x0,y1)];
base.buildings=[
  {id:101,type:'th',name:'TH-1',w:88,d:42,st:3,rot:30,units:null,c:L(-20,-185)},
  {id:102,type:'apt',name:'APT-1',w:60,d:60,st:4,rot:0,units:7,c:L(-200,-100)},
  {id:103,type:'mu',name:'MU-1',w:0,d:0,st:2,rot:0,units:null,custom:true,pts:[L(20,-150),L(70,-150),L(80,-130),L(45,-120),L(20,-130)],c:L(47,-136)}
];
base.roads=[{id:104,name:'Road 1',width:26,pts:[L(-300,-250),L(100,-250)]}];
base.lots=[
  {id:105,name:'Parking lot 1',pts:[L(-290,-165),L(-110,-165)],aisleW:24,stallW:10,stallD:20,angle:90,sides:'both'},
  {id:106,name:'Parking lot 2',pts:[L(0,-90),L(90,-90)],aisleW:0,stallW:8,stallD:22,angle:0,sides:'right'},
  {id:107,name:'Parking lot 3',pts:[L(-290,-100),L(-200,-100)],aisleW:0,stallW:10,stallD:20,angle:90,sides:'left'}
];
base.areas=[{id:108,kind:'park',name:'Parking',ring:rect(-290,-125,-260,-100)},{id:109,kind:'pond',name:'Detention / stormwater',ring:rect(-150,-120,-120,-95)}];
base.carveShapes=[{id:110,ring:rect(80,-225,100,-200)}];
base.nextId=111;base.counters={th:1,apt:1,mu:1,road:1,lot:3};
await openVia(A,file('plan-project.json',base));
const g1=exportGeo(A);
ok(of(g1,'building').length===3&&of(g1,'road').length===1,'source plan loaded from a project file');
ok(of(g1,'parking_stall').length>20,'source plan has striped stalls ('+of(g1,'parking_stall').length+')');
const siteAc=of(g1,'site_boundary')[0].properties.areaAc;

// ---- fresh app: drop the GeoJSON in
const B=await boot();
const gjText=JSON.stringify(g1);
// drag and drop onto the page
const ev=new B.w.Event('drop',{bubbles:true,cancelable:true});
Object.defineProperty(ev,'dataTransfer',{value:{types:['Files'],files:[file('site-plan.geojson',gjText)]}});
B.w.document.body.dispatchEvent(ev);
await sleep(80);
ok(/Rebuilt the plan from GeoJSON/.test(B.$('#toast').textContent),'drop shows a rebuilt message ('+B.$('#toast').textContent+')');
const g2=exportGeo(B);
for(const k of ['building','road','road_centerline','area','parcel','parking_aisle','parking_aisle_centerline']){
  ok(of(g1,k).length===of(g2,k).length,k+' count matches ('+of(g1,k).length+' vs '+of(g2,k).length+')');
}
ok(of(g1,'parking_stall').length===of(g2,'parking_stall').length,'stall count matches ('+of(g1,'parking_stall').length+' vs '+of(g2,'parking_stall').length+')');
const lotStalls=g=>{const m={};of(g,'parking_stall').forEach(f=>m[f.properties.lot]=(m[f.properties.lot]||0)+1);return JSON.stringify(m);};
ok(lotStalls(g1)===lotStalls(g2),'stalls per lot match '+lotStalls(g2));
ok(near(of(g2,'site_boundary')[0].properties.areaAc,siteAc,0.002),'site acreage matches incl. carve-out ('+of(g2,'site_boundary')[0].properties.areaAc+' vs '+siteAc+')');
const bk=g=>of(g,'building').map(f=>[f.properties.name,f.properties.type,f.properties.stories,f.properties.units,f.properties.footprintSf,f.properties.rotationDeg,f.properties.freeform].join('|')).sort();
ok(JSON.stringify(bk(g1))===JSON.stringify(bk(g2)),'building names, types, stories, units, footprints, rotation match');
const verts=g=>of(g,'building').map(f=>f.geometry.coordinates[0].slice(0,4).map(p=>p.map(v=>v.toFixed(6)).join(',')).join(';')).sort();
const maxd=(()=>{let m=0;const a=of(g1,'building'),b=of(g2,'building');a.forEach((f,i)=>{const o=b.find(x=>x.properties.name===f.properties.name);f.geometry.coordinates[0].forEach(p=>{const d=Math.min(...o.geometry.coordinates[0].map(q=>Math.hypot((p[0]-q[0])*B.kx,(p[1]-q[1])*B.ky)));m=Math.max(m,d);});});return m;})();
ok(maxd<0.05,'building corners within 0.05 ft ('+maxd.toFixed(4)+')');
const areaKinds=g=>of(g,'area').map(f=>f.properties.areaType+'|'+f.properties.areaSf).sort().join();
ok(areaKinds(g1)===areaKinds(g2),'areas keep type and size');
ok(of(g2,'road')[0].properties.widthFt===26,'road width kept');
ok(B.errors.length===0,'no page errors ('+B.errors.join('; ')+')');

// ---- project files still open, layouts files still open, plain parcel GeoJSON still loads parcels
const C=await boot();await openVia(C,file('p.json',A.proj()));
ok(of(exportGeo(C),'building').length===3,'project .json still opens');
const D=await boot();D.w.confirm=()=>true;
await openVia(D,file('parcels.geojson',D.mockParcels()));
ok(/parcels read from parcels\.geojson/.test(D.$('#toast').textContent),'plain parcel GeoJSON loads parcels');
await openVia(D,file('junk.json','{"hello":1}'));
ok(D.$('#toast').classList.contains('err'),'unrecognised file shows an error toast');
await openVia(D,file('bad.json','not json'));
ok(D.$('#toast').classList.contains('err'),'invalid JSON shows an error toast');
// opening over existing work asks first
const E=await boot();await openVia(E,file('p.json',A.proj()));let asked=0;E.w.confirm=()=>{asked++;return false;};
await openVia(E,file('p2.json',A.proj()));
ok(asked===1&&of(exportGeo(E),'building').length===3,'asks before replacing current plan; cancel keeps it');
// layouts file
const F=await boot();await openVia(F,file('l.json',{kind:'site-plan-layouts',v:1,layouts:[{name:'Opt A',proj:A.proj()}]}));
ok(/1 layout added/.test(F.$('#toast').textContent),'layouts file adds a layout');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});

