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
t.tab('build');t.set('#areaKind','open','change');ok(lit()==='area','changing what the Area tool draws to open space lights the Area button instead');
t.tool('select');

// ---- a plain rectangle, no road: 200 x 128 ft holds two full modules (4 rows of 20), joined by one cross aisle
await t.draw('parkarea',t.rectPts(-250,-200,-50,-72));
let a=t.proj().areas[0];
ok(a.kind==='park'&&a.name==='Parking 1'&&a.pk&&a.pk.w===10&&a.pk.d===20&&a.pk.aisle===24&&a.pk.ang==='auto'&&t.$('#aAng').value==='auto'&&t.$('#aPar').checked,'the area is saved with its stall settings: best-fit angle, parallel fill on ('+JSON.stringify(a.pk)+')');
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

// ---- narrow strips: one clean aisle, not a comb of stub aisles
const fresh=async()=>{t.click(t.$('#newBtn'));await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));};
const feat=()=>{const g=geo();return {st:kinds(g,'parking_stall'),ai:kinds(g,'parking_aisle'),area:kinds(g,'area')[0].properties};};
await fresh();await t.draw('parkarea',t.rectPts(-280,-60,-72,-8));            // 208 x 52 ft
let F=feat();
ok(F.ai.length===1&&F.st.length===29&&F.area.parallelStalls===9,'a 52 ft deep strip: one aisle, 20 stalls on one side and 9 parallel ones on the other ('+F.st.length+' stalls, '+F.ai.length+' aisle, '+F.area.parallelStalls+' parallel)');
ok(F.st.filter(f=>f.properties.angleDeg===0).length===9&&F.st.filter(f=>f.properties.angleDeg===0).every(f=>f.properties.widthFt===8&&f.properties.depthFt===22),'the parallel stalls are listed as 8 x 22 ft at 0°');
ok(/9 of them parallel/.test(info()),'the inspector says so ('+info().slice(0,90)+')');
ok(stalls().every(q=>inBox(q,-280,-60,-72,-8)),'all inside the outline');
t.click(t.$('#aPar'));F=feat();
ok(t.proj().areas[0].pk.par===false&&F.area.parallelStalls===0&&F.ai.length===1&&F.st.length===20,'with parallel fill off it is the single row of 20 ('+F.st.length+')');
t.click(t.$('#aPar'));ok(prov()===29&&t.proj().areas[0].pk.par===undefined,'and back on');
// 59 ft deep: two rows of 90° stalls need 64 ft, so the old answer was three stub aisles off a cross aisle (22 stalls)
await fresh();await t.draw('parkarea',t.rectPts(-280,-60,-72,-1));
t.set('#aAng','auto','change'); // new areas start with the settings last used, which the checks above left at 90°
F=feat();
ok(F.ai.length===1&&F.st.length===34&&F.area.stallAngleBestFit===true&&F.st.every(f=>f.properties.angleDeg===60),'a 59 ft deep strip: best fit uses 60° stalls both sides of one aisle, 34 stalls ('+F.st.length+' stalls, '+F.ai.length+' aisle)');
ok(/best fit used 60° stalls on a one-way aisle/.test(info()),'the inspector says which angle it used');
t.set('#aAng','90','change');F=feat();
ok(F.ai.length===1&&F.st.length===29&&t.proj().areas[0].pk.ang===90,'held to 90° it is still one aisle: 20 stalls and 9 parallel ('+F.st.length+' stalls, '+F.ai.length+' aisle)');
t.set('#aAng','auto','change');ok(prov()===34,'Best fit brings the 60° layout back');
// ---- a strip beside a road: the road is the aisle, when stalls are allowed to open onto it
// road up the middle at x 0, 24 ft wide (edge at x -12); a strip 23 ft deep and 160 ft long drawn against that edge
await fresh();t.set('#roadW','24');await t.draw('road',[[0,-210],[0,60]]);
await t.draw('parkarea',t.rectPts(-35,-150,-12,10));t.set('#aAng','auto','change');
F=feat();
ok(F.st.length<=4&&/16 would fit if stalls opened straight onto the road beside it/.test(info()),'on its own a 23 ft strip holds next to nothing (no rows of little pockets), and it says 16 would fit off the road ('+F.st.length+' stalls: '+info().slice(0,140)+')');
t.click(t.$('#aOnRoad'));F=feat();
const S7=stalls();
ok(F.st.length===16&&F.ai.length===0&&F.st.every(f=>f.properties.angleDeg===90),'ticked: 16 stalls at 90° straight off the road, no aisle of their own ('+F.st.length+' stalls, '+F.ai.length+' aisles)');
ok(S7.every(q=>inBox(q,-35,-150,-12,10))&&S7.every(q=>q.some(p=>near(p[0],-12,0.06)))&&!tooClose(S7,10),'every stall is in the strip, with its open end on the road edge');
ok(!/no road reaches/.test(info())&&!/would fit if/.test(info()),'and the notes about the road are gone');
// drawn 2 ft short of the road edge: still counts as beside it
await fresh();await t.draw('road',[[0,-210],[0,60]]);
await t.draw('parkarea',t.rectPts(-37,-150,-14,10));
ok(t.$('#aOnRoad').checked&&prov()===16,'a strip drawn 2 ft short of the road edge still opens onto it ('+prov()+'; the setting carries over to the next area)');
// a 16 ft drive is too narrow to back out of a 90° stall: best fit turns the stalls to 60°
await fresh();t.set('#roadW','16');await t.draw('road',[[0,-210],[0,60]]);
await t.draw('parkarea',t.rectPts(-31,-150,-8,10));F=feat();
ok(F.st.length===12&&F.st.every(f=>f.properties.angleDeg===60),'beside a 16 ft drive best fit uses 60° stalls: 12 of them ('+F.st.length+' at '+(F.st[0]||{properties:{}}).properties.angleDeg+'°)');
t.set('#aAng','90','change');ok(prov()<12,'held to 90° they do not fit off that drive ('+prov()+')');
// 12 ft deep: only parallel stalls fit
await fresh();t.set('#roadW','24');await t.draw('road',[[0,-210],[0,60]]);
await t.draw('parkarea',t.rectPts(-24,-150,-12,10));t.set('#aAng','auto','change');F=feat();
ok(F.st.length===7&&F.st.every(f=>f.properties.angleDeg===0),'a 12 ft deep strip beside the road takes 7 parallel stalls ('+F.st.length+')');
t.click(t.$('#aOnRoad'));ok(prov()===0&&!t.proj().areas[0].pk.road,'and none once stalls may not open onto the road ('+prov()+', '+JSON.stringify(t.proj().areas[0].pk)+')');
// ---- lighting (Brecksville §1183.16): poles at the heads of stalls, every stall within reach of one
await fresh();await t.draw('parkarea',t.rectPts(-280,-200,-80,-72));               // 200 x 128 ft
const lights=()=>kinds(geo(),'light_pole').map(f=>t.toFt(f.geometry.coordinates));
let LP=lights(),SS=stalls();
ok(t.$('#aLights').checked&&t.$('#aLH').value==='25'&&t.$('#aLM').value==='20000'&&LP.length>=3&&LP.length<=8,'a new parking area gets light poles: 25 ft, 20,000 lumens each ('+LP.length+' poles for 200 x 128 ft)');
ok(SS.every(q=>LP.some(p=>Math.hypot(mid(q)[0]-p[0],mid(q)[1]-p[1])<=60.01)),'every stall is within 60 ft of a pole (2.4 times its height)');
ok(LP.every(p=>SS.some(q=>q.some(c=>Math.hypot(c[0]-p[0],c[1]-p[1])<0.1))),'every pole stands at the head of a stall, not in an aisle');
const lum=LP.length*20000/25600;
const shown=+(info().match(/light poles at 25 ft: ([\d.]+) lumens per sf \(minimum ¼, §1183\.16\(a\)\)/)||[])[1];
ok(near(shown,lum,0.02),'the inspector gives lumens per square foot against the ¼ minimum ('+(info().match(/\d+ light poles[^·]*/)||[''])[0]+')');
ok(t.layers('pFence').filter(l=>/light-pole/.test((l.options||{}).className||'')).length===LP.length&&t.layers('pFence').filter(l=>/light-pool/.test((l.options||{}).className||'')).length===LP.length,'each pole is drawn with the ground it lights');
const ga=kinds(geo(),'area')[0].properties;ok(ga.lightPoles===LP.length&&ga.poleHeightFt===25&&near(ga.lumensPerSf,lum,0.01),'GeoJSON carries the poles and the light level');
t.click(t.$('#xCsv'));ok(new RegExp('"Parking 1 light poles \\(25 ft, 20000 lumens each\\)","'+LP.length+'"').test(t.dl['building-schedule.csv']),'CSV lists the poles');
t.set('#aLH','40');const LP40=lights();ok(LP40.length<LP.length&&t.proj().areas[0].pk.lh===40,'taller poles reach further, so fewer are needed ('+LP.length+' → '+LP40.length+')');
t.set('#aLH','25');t.set('#aLM','1000');
ok(/lumens per sf, under the ¼ lumen minimum \(§1183\.16\(a\)\)/.test(info()),'dim fixtures are called out as under the minimum ('+(info().match(/\d+ light poles[^·]*/)||[''])[0]+')');
t.set('#aLM','20000');
t.click(t.$('#aLights'));ok(lights().length===0&&t.proj().areas[0].pk.lt===false&&!/light pole/.test(info())&&t.$$('#aPark .a-lt').every(e=>e.hidden),'unticked: no poles');
t.click(t.$('#aLights'));ok(lights().length===LP.length,'and back');
// near the property line (the site's south edge is y -225)
await fresh();await t.draw('parkarea',t.rectPts(-280,-222,-80,-178));   // one row and its aisle, 3 ft off the south line
ok(/\d+ of them within 25 ft of the property line: shield those so no light falls beyond it \(§1183\.16\(b\)\)/.test(info()),'poles beside the property line get the shielding note ('+(info().match(/\d+ of them within[^·]*/)||[''])[0]+')');
// ---- unused paving and Trim
await fresh();await t.draw('parkarea',t.rectPts(-280,-110,-5,-25));              // 275 x 85 ft: only 64 ft of depth is needed
const before=prov(),impB=t.num(t.stat('Impervious').s),greenB=t.num(t.stat('Green space').v);
ok(before===54&&/[56],\d\d\d sf \(2[4-7]%\) of the outline is not used/.test(info())&&!t.$('#aTrimRow').hidden,'an 85 ft deep lot holds 54 stalls and says a quarter of it is unused ('+info().slice(0,120)+')');
t.click(t.$('#aTrim'));
const ring2=t.proj().areas[0].ring.map(t.toFt),ys2=ring2.map(p=>p[1]),dep=Math.max(...ys2)-Math.min(...ys2);
ok(prov()===54&&near(dep,64,0.2),'Trim unused paving pulls it in to 64 ft deep with the same 54 stalls ('+prov()+' stalls, '+dep.toFixed(1)+' ft)');
ok(near(impB-t.num(t.stat('Impervious').s),275*21,400)&&t.num(t.stat('Green space').v)>greenB&&t.$('#aTrimRow').hidden,'the paving given up comes off impervious and adds to green space, and the button goes ('+t.stat('Impervious').s+')');
ok(/Trimmed [56],\d\d\d sf/.test(t.$('#toast').textContent),'it says what it did ('+t.$('#toast').textContent+')');
t.key('z',{ctrlKey:true});ok(near(t.num(t.stat('Impervious').s),impB,5),'undo puts the outline back');
// ---- the sample project shows it off
const s=await boot();
const sp=+s.stat('Parking').v.split(' / ')[0],sa=s.proj().areas[0];
ok(sa.pk&&sp>=36&&!/no road reaches/.test(s.$('#checks').textContent),'the sample parking is laid out off its drive ('+s.stat('Parking').v+')');
for(const x of [t,b,c,d,s])ok(x.errors.length===0,'no page errors ('+x.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
function n(v){return Math.round(v).toLocaleString();}
})().catch(e=>{console.error(e);process.exit(1);});
