const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: two rows of four parcels = 400 ft (x -300..100) by 300 ft (y -225..75)
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
const prov=()=>+t.stat('Parking').v.split(' / ')[0];
const lit=()=>t.$$('.tool.on').map(b=>b.dataset.tool).join();
const info=()=>t.$('#aInfo').textContent;
const geo=()=>{t.click(t.$('#xGeo'));return JSON.parse(t.dl['site-plan.geojson']);};
const kinds=(g,k)=>g.features.filter(f=>f.properties.kind===k);
const stalls=()=>kinds(geo(),'parking_stall').map(f=>f.geometry.coordinates[0].slice(0,4).map(t.toFt));
const mid=q=>[(q[0][0]+q[1][0]+q[2][0]+q[3][0])/4,(q[0][1]+q[1][1]+q[2][1]+q[3][1])/4];
const inBox=(q,x0,y0,x1,y1,e=0.06)=>q.every(p=>p[0]>=x0-e&&p[0]<=x1+e&&p[1]>=y0-e&&p[1]<=y1+e);
// do two stall rectangles overlap by more than a hair? (they are axis-parallel or turned together, so compare by centre spacing)
const tooClose=(S,w)=>{for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const a=mid(S[i]),b=mid(S[j]);if(Math.hypot(a[0]-b[0],a[1]-b[1])<w-0.05)return true;}return false;};

// ---- the tool
ok(!!t.$('[data-tool="parkarea"]')&&t.$('[data-tool="lot"]').textContent==='Parking row','toolbar has Parking area, and the line tool is now called Parking row');
t.tool('parkarea');
ok(lit()==='parkarea'&&t.$('#areaKind').value==='park'&&!t.$('#drawbar').hidden&&/corners of the parking area/.test(t.$('#hint').textContent),'Parking area starts an area drawn as parking, with its own hint ('+lit()+')');
t.tab('build');t.set('#areaKind','land','change');ok(lit()==='area','changing Draw as to landscaping lights the Area button instead');
t.tool('select');

// ---- a plain rectangle, no road: 200 x 128 ft holds two full modules (4 rows of 20), joined by one cross aisle
await t.draw('parkarea',t.rectPts(-250,-200,-50,-72));
let a=t.proj().areas[0];
ok(a.kind==='park'&&a.name==='Parking 1'&&a.pk&&a.pk.w===10&&a.pk.d===20&&a.pk.aisle===24&&a.pk.ang===90,'the area is saved with its stall settings ('+JSON.stringify(a.pk)+')');
ok(!t.$('#insA').hidden&&!t.$('#aPark').hidden&&t.$('#aLay').value==='lay','it is selected, with the parking settings showing');
let S1=stalls();
ok(S1.length===prov()&&prov()>=70&&prov()<=80,'two aisles of 10 x 20 stalls: 80 less the cross aisle that joins them ('+prov()+')');
ok(S1.every(q=>inBox(q,-250,-200,-50,-72)),'every stall is inside the outline');
ok(!tooClose(S1,10),'no two stalls overlap');
ok(new RegExp('^'+prov()+' stalls · 25,[56]\\d\\d sf paved · 3\\d\\d sf per stall').test(info()),'inspector gives stalls, paving and sf per stall ('+info()+')');
ok(/no road reaches it/.test(info())&&/Parking 1: no road reaches it/.test(t.$('#checks').textContent),'with no road at it, it says so');
ok(t.layers('pLots').filter(l=>l instanceof t.w.L.Polygon).length===2&&t.$$('.blabel').some(e=>e.textContent===prov()+' stalls'),'aisles and stalls are drawn, with the count as a label');
ok(near(t.num(t.stat('Impervious').s),25600,60)&&new RegExp(prov()+' striped').test(t.stat('Parking').s),'paving counts as impervious; the stalls count as striped ('+t.stat('Impervious').s+')');
const noRoad=prov();

// ---- a road through the middle: kept clear, aisles open onto it, nothing is double counted
t.set('#roadW','24');await t.draw('road',[[-150,-260],[-150,-20]]);
const S2=stalls(),imp2=t.num(t.stat('Impervious').s);
ok(S2.every(q=>{const xs=q.map(p=>p[0]);return Math.max(...xs)<=-162+0.1||Math.min(...xs)>=-138-0.1;}),'no stall touches the road (x -162..-138)');
ok(S2.every(q=>inBox(q,-250,-200,-50,-72))&&!tooClose(S2,10),'stalls stay inside the outline and clear of each other');
ok(S2.some(q=>mid(q)[0]<-162)&&S2.some(q=>mid(q)[0]>-138),'both sides of the road are filled');
ok(prov()===S2.length&&prov()>=60,'the count follows the layout ('+noRoad+' with no road, '+prov()+' with the road through it)');
// the road is 24 ft wide and runs 205 ft inside the site (y -225..-20) plus its round end; 128 ft of that is inside the
// parking outline, and must be counted once, as road
ok(near(imp2,25600-24*128+24*205+226,200),'road and parking are not counted twice in impervious ('+n(imp2)+', twice would be '+n(25600+24*205+226)+')');
t.tool('select');const al=()=>t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon);
al()[0].fire('click',{latlng:t.c});
ok(/the road through it is kept clear, leaving 2 parts/.test(info())&&!/no road reaches/.test(info()),'inspector: road kept clear, 2 parts, and the road reaches it ('+info()+')');
ok(!/no road reaches/.test(t.$('#checks').textContent),'the no-road note is gone');
const withRoad=prov();

// ---- settings: stall width, estimate instead of a layout, stalls opening onto the drive
t.set('#aSW','9');const nine=prov();ok(nine>withRoad&&t.proj().areas[0].pk.w===9,'9 ft stalls fit more ('+withRoad+' → '+nine+')');
t.set('#aSW','10');ok(prov()===withRoad,'back to 10 ft');
t.set('#aLay','est','change');
ok(!t.proj().areas[0].pk&&prov()===Math.floor(25600/320)&&stalls().length===0&&/about 80 stalls at 320 sf each/.test(info()),'Estimate from the square footage: 25,600 / 320 = 80, nothing drawn ('+prov()+')');
ok(t.$$('#aPark .a-lay').every(e=>e.hidden)&&!t.$('#aPlantRow').hidden,'the layout settings hide in estimate mode');
t.set('#aLay','lay','change');ok(prov()===withRoad&&t.proj().areas[0].pk.w===10,'Lay out stalls brings the layout back');
t.click(t.$('#aOnRoad'));
const onRoad=prov();ok(t.proj().areas[0].pk.road===true&&onRoad>=withRoad,'stalls may open onto the drive: at least as many ('+withRoad+' → '+onRoad+')');
ok(stalls().every(q=>{const xs=q.map(p=>p[0]);return Math.max(...xs)<=-162+0.1||Math.min(...xs)>=-138-0.1;}),'still no stall on the road itself');
t.click(t.$('#aOnRoad'));ok(prov()===withRoad&&!t.proj().areas[0].pk.road,'and off again');
t.set('#aAng','60','change');
const p60=t.proj().areas[0].pk;ok(p60.ang===60&&p60.aisle===16&&t.$('#aAisle').value==='16'&&prov()>0,'60° stalls switch to a 16 ft one-way aisle ('+prov()+' stalls)');
const S60=stalls();ok(S60.every(q=>Math.abs(Math.abs((q[1][0]-q[0][0])*(q[3][1]-q[0][1])-(q[1][1]-q[0][1])*(q[3][0]-q[0][0]))-10/Math.sin(Math.PI/3)*20)<1),'each 60° stall is a slanted 10 ft wide, 20 ft deep bay');
t.set('#aAng','90','change');ok(t.proj().areas[0].pk.aisle===24&&prov()===withRoad,'90° goes back to a 24 ft aisle');

// ---- a building and a planted island inside it are kept clear
t.tab('build');t.click(t.$('.typebtn[data-type="acc"]'));t.set('#tW','24');t.set('#tD','24');t.set('#tRot','0');t.placeAt(-100,-136);t.tool('select');t.key('Escape');
const S3=stalls();
ok(S3.length<withRoad&&!S3.some(q=>{const c=mid(q);return Math.abs(c[0]+100)<12&&Math.abs(c[1]+136)<12;})&&S3.every(q=>!q.some(p=>Math.abs(p[0]+100)<11.9&&Math.abs(p[1]+136)<11.9)),'a building inside takes its stalls out ('+withRoad+' → '+S3.length+')');
t.key('z',{ctrlKey:true});ok(prov()===withRoad,'undo puts them back');
t.tab('build');t.set('#areaKind','land','change');await t.draw('area',t.rectPts(-240,-150,-200,-120));
const S4=stalls();
ok(S4.length<withRoad&&S4.every(q=>!q.some(p=>p[0]>-240+0.1&&p[0]<-200-0.1&&p[1]>-150+0.1&&p[1]<-120-0.1)),'a landscaping area drawn inside becomes an island ('+S4.length+' stalls)');
ok(near(t.num(t.stat('Impervious').s),imp2-1200,60),'and its 1,200 sf comes off the paving ('+t.stat('Impervious').s+')');
t.key('z',{ctrlKey:true});

// ---- exports and round trips
const g=geo(),pa=kinds(g,'area')[0].properties;
ok(pa.stalls===withRoad&&pa.stallWidthFt===10&&pa.stallDepthFt===20&&pa.aisleWidthFt===24&&pa.stallAngleDeg===90&&kinds(g,'parking_stall').every(f=>f.properties.area==='Parking 1'),'GeoJSON: the area carries its settings and count, and each stall is a feature');
t.click(t.$('#xCsv'));ok(new RegExp('"Parking 1 stalls","'+withRoad+'"').test(t.dl['building-schedule.csv'])&&/Laid-out stalls \(parking areas\)/.test(t.dl['building-schedule.csv']),'CSV lists the stalls of each parking area');
t.click(t.$('#xDxf'));ok((t.dl['site-plan.dxf'].match(/POLYLINE\n8\nSTRIPING\n/g)||[]).length===withRoad,'DXF has every stall on STRIPING');
const p=t.proj(),b=await boot();await openVia(b,file('p.json',p));
ok(+b.stat('Parking').v.split(' / ')[0]===withRoad,'opening the project file gives the same layout');
const c=await boot();await openVia(c,file('s.geojson',g));
ok(c.proj().areas[0].pk&&c.proj().areas[0].pk.aisle===24&&+c.stat('Parking').v.split(' / ')[0]===withRoad,'opening the GeoJSON gives the same layout ('+c.stat('Parking').v+')');
// a project saved before this (no settings on the area) still counts by area
const old=JSON.parse(JSON.stringify(p));delete old.areas[0].pk;old.roads=[];
const d=await boot();await openVia(d,file('old.json',old));
ok(+d.stat('Parking').v.split(' / ')[0]===80&&d.layers('pLots').filter(l=>l instanceof d.w.L.Polygon).length===0,'an older project keeps its estimate until Lay out stalls is chosen ('+d.stat('Parking').v+')');
console.log('   counts: no road '+noRoad+', road through '+withRoad+', 9 ft '+nine+', onto road '+onRoad);

// ---- a road along one side: rows that run beside it are joined to it by a cross aisle
t.click(t.$('#newBtn'));await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.set('#roadW','24');await t.draw('road',[[-280,-60],[80,-60]]);          // road edge at y -72
await t.draw('parkarea',t.rectPts(-250,-200,-50,-72));                     // 200 x 128, road along the top
const S5=stalls();
ok(prov()===S5.length&&prov()>=70&&!/no road reaches/.test(info()),'beside a road: '+prov()+' stalls, all on aisles that reach it');
ok(S5.every(q=>inBox(q,-250,-200,-50,-72))&&!tooClose(S5,10),'inside the outline, none overlapping');

// ---- an L-shaped, turned outline still fills cleanly
t.click(t.$('#newBtn'));await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
const rot=(x,y)=>{const an=20*Math.PI/180;return [x*Math.cos(an)-y*Math.sin(an)-120,x*Math.sin(an)+y*Math.cos(an)-90];};
const Lpts=[[-100,-60],[100,-60],[100,10],[0,10],[0,70],[-100,70]].map(q=>rot(q[0],q[1]));
await t.draw('parkarea',Lpts);
const S6=stalls(),ring=Lpts;
const inRing=p=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b2=ring[j];if(((a[1]>p[1])!==(b2[1]>p[1]))&&(p[0]<(b2[0]-a[0])*(p[1]-a[1])/(b2[1]-a[1])+a[0]))c=!c;}return c;};
ok(S6.length>=30&&S6.every(q=>inRing(mid(q))&&q.every(pt=>inRing([pt[0]+(mid(q)[0]-pt[0])*0.02,pt[1]+(mid(q)[1]-pt[1])*0.02]))),'an L-shaped lot turned 20° holds '+S6.length+' stalls, all inside it');
ok(!tooClose(S6,10),'none overlapping');
const e0=S6[0],ang=Math.atan2(e0[1][1]-e0[0][1],e0[1][0]-e0[0][0])*180/Math.PI,offAxis=Math.abs(((ang-20)%90+90)%90);
ok(Math.min(offAxis,90-offAxis)<0.5,'the rows follow the edges of the outline ('+ang.toFixed(1)+'°)');
// between two arrangements with the same count the simpler one wins: an 84 ft strip gets one aisle, not rows and a cross aisle
await t.draw('parkarea',t.rectPts(10,-220,94,48));
const g7=geo(),of7=k=>kinds(g7,k).filter(f=>f.properties.area==='Parking 2').length;
ok(of7('parking_stall')===52&&of7('parking_aisle')===1,'an 84 x 268 ft strip: one aisle with two rows of 26 ('+of7('parking_stall')+' stalls, '+of7('parking_aisle')+' aisle)');
// too small for anything
await t.draw('parkarea',t.rectPts(-290,20,-260,50));
ok(/0 stalls/.test(info())&&/nothing fits yet: one row of stalls with its aisle needs 44 ft/.test(info()),'a 30 ft square says why nothing fits ('+info()+')');
t.key('Delete');

// ---- the sample project shows it off
const s=await boot();
const sp=+s.stat('Parking').v.split(' / ')[0],sa=s.proj().areas[0];
ok(sa.pk&&sp>=36&&!/no road reaches/.test(s.$('#checks').textContent),'the sample parking is laid out off its drive ('+s.stat('Parking').v+')');
for(const x of [t,b,c,d,s])ok(x.errors.length===0,'no page errors ('+x.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
function n(v){return Math.round(v).toLocaleString();}
})().catch(e=>{console.error(e);process.exit(1);});
