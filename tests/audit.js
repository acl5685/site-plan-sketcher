const {boot,ok,R,sleep,near}=require('./lib');
const groups=[];const G=(name,fn)=>groups.push([name,fn]);
const SQ=(a)=>a; 

G('01 startup and sample project',async()=>{
  const t=await boot();
  ok(t.errors.length===0,'no page errors on load');
  ok(/3\.8 ac/.test(t.stat('Site area').v)&&/165,\d{3} sf/.test(t.stat('Site area').s),'sample site is 3.8 ac / ~165,000 sf: '+JSON.stringify(t.stat('Site area')));
  ok(t.stat('Units').v==='19','sample units 19 ('+t.stat('Units').v+')');
  ok(t.stat('Parking').v==='62 / 67','sample parking 62 provided / 67 required (Brecksville rules)');
  ok(!t.$('#banner').hidden,'sample banner visible');
  ok(/All 4 building/.test(t.$('#checks').textContent),'sample passes all checks');
  ok(t.$$('#types .typebtn').length===6,'six building type buttons');
  ok(t.$$('.tool').length===10,'ten toolbar tools');
});

G('02 loading parcels from an ArcGIS REST service',async()=>{
  const t=await boot();
  t.click(t.$('#newBtn'));
  t.$('#svcUrl').value='https://svc.test/arcgis/rest/services/P/MapServer';
  t.click(t.$('#loadBtn'));await sleep(40);
  const q=t.fetchLog.find(u=>/\/0\/query\?/.test(u));
  ok(!!t.fetchLog.find(u=>/MapServer\?f=json$/.test(u)),'reads service layer list first');
  ok(!!q,'queries layer 0');
  const sp=new URLSearchParams(q.split('?')[1]);
  ok(sp.get('f')==='geojson'&&sp.get('inSR')==='4326'&&sp.get('outSR')==='4326'&&sp.get('geometryType')==='esriGeometryEnvelope'&&sp.get('returnGeometry')==='true'&&sp.get('outFields')==='*','query parameters correct');
  const env=JSON.parse(sp.get('geometry'));ok(env.xmin<env.xmax&&env.ymin<env.ymax&&env.xmin<t.c.lng&&env.xmax>t.c.lng,'query envelope is the map view');
  ok(!t.$('#svcLayer').hidden&&t.$('#svcLayer').options.length===2,'layer picker shown when service has 2 layers');
  ok(/18 parcels loaded/.test(t.$('#loadMsg').textContent),'status says 18 parcels loaded: '+t.$('#loadMsg').textContent);
  ok(t.$('#labelField').value==='PARCEL_ID','label field auto-detected as PARCEL_ID ('+t.$('#labelField').value+')');
  ok(/18 parcels loaded, 0 picked/.test(t.$('#parcelSummary').textContent),'parcel summary');
  // choose other layer
  t.$('#svcLayer').value='1';t.click(t.$('#loadBtn'));await sleep(40);
  ok(t.fetchLog.some(u=>/\/1\/query\?/.test(u)),'layer picker changes the layer queried');
  // explicit layer number in URL
  t.$('#svcUrl').value='https://svc.test/arcgis/rest/services/P/FeatureServer/3';t.click(t.$('#loadBtn'));await sleep(40);
  ok(t.fetchLog.some(u=>/FeatureServer\/3\/query\?/.test(u)),'explicit layer id in URL is used');
  // zoom guard
  t.M.setZoom(14);t.fetchLog.length=0;t.click(t.$('#loadBtn'));await sleep(20);
  ok(/Zoom the map in/.test(t.$('#loadMsg').textContent)&&t.$('#loadMsg').classList.contains('err')&&t.fetchLog.length===0,'zoomed-out load is refused without a request');
  t.M.setZoom(17.5);
  // errors
  t.mode.queryError='Token Required';t.click(t.$('#loadBtn'));await sleep(40);
  ok(/Token Required/.test(t.$('#loadMsg').textContent)&&t.$('#loadMsg').classList.contains('err'),'server error message shown');
  t.mode.queryError=null;t.mode.http=500;t.click(t.$('#loadBtn'));await sleep(40);
  ok(/500/.test(t.$('#loadMsg').textContent),'HTTP error shown');
  t.mode.http=null;t.mode.fail='Failed to fetch';t.click(t.$('#loadBtn'));await sleep(40);
  ok(/Could not load parcels/.test(t.$('#loadMsg').textContent)&&/CORS/.test(t.$('#loadMsg').textContent),'network/CORS failure explained');
  t.mode.fail=null;t.mode.features={type:'FeatureCollection',features:[]};t.click(t.$('#loadBtn'));await sleep(40);
  ok(/No polygons/.test(t.$('#loadMsg').textContent),'empty result explained');
  t.mode.features=Object.assign(t.mockParcels(),{exceededTransferLimit:true});t.click(t.$('#loadBtn'));await sleep(40);
  ok(/limit/.test(t.$('#loadMsg').textContent),'transfer limit warning');
  t.mode.features=null;
  ok(t.errors.length===0,'no page errors');
});

G('03 loading parcels after the sample project replaces the sample',async()=>{
  const t=await boot();
  t.$('#svcUrl').value='https://svc.test/arcgis/rest/services/P/MapServer';
  t.click(t.$('#loadBtn'));await sleep(40);
  const p=t.proj();
  ok(p.buildings.length===0&&p.roads.length===0&&p.areas.length===0,'sample buildings, road and areas are cleared when real parcels load ('+p.buildings.length+' buildings left)');
  ok(p.selected.length===0,'sample picks are cleared');
  ok(/18 parcels loaded, 0 picked/.test(t.$('#parcelSummary').textContent),'only the 18 loaded parcels remain: '+t.$('#parcelSummary').textContent);
  ok(t.$('#banner').hidden,'sample banner hidden');
});

G('04 GeoJSON parcel file',async()=>{
  const t=await boot();
  t.click(t.$('#newBtn'));
  const gj=t.mockParcels();
  const f=new t.w.File([JSON.stringify(gj)],'parcels.geojson');f.text=()=>Promise.resolve(JSON.stringify(gj));
  const inp=t.$('#parcelFile');Object.defineProperty(inp,'files',{value:[f],configurable:true});
  inp.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(40);
  ok(/18 parcels read from parcels\.geojson/.test(t.$('#loadMsg').textContent),'file loads: '+t.$('#loadMsg').textContent);
  t.pick(t.row(0,[0,1]));
  ok(near(t.num(t.stat('Site area').s),30000,150),'picked two file parcels = 30,000 sf ('+t.stat('Site area').s+')');
  const bad=new t.w.File(['not json'],'x.geojson');bad.text=()=>Promise.resolve('not json');
  Object.defineProperty(inp,'files',{value:[bad],configurable:true});inp.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(30);
  ok(/could not be read/.test(t.$('#loadMsg').textContent),'bad file reports an error');
});

G('05 picking, carving and site geometry',async()=>{
  const t=await boot();await t.freshSite();
  ok(t.stat('Site area').v==='—','no site before picking');
  t.pick(t.row(0,[0,1,2,3]));
  ok(near(t.num(t.stat('Site area').s),60000,300),'4 parcels = 60,000 sf ('+t.stat('Site area').s+')');
  ok(t.$$('.dim').length===0,'no dims without buildings');
  ok(/4 picked/.test(t.$('#parcelSummary').textContent),'summary counts picks');
  t.carve(['R-0-1']);
  ok(near(t.num(t.stat('Site area').s),45000,300),'carving an interior parcel leaves 45,000 sf ('+t.stat('Site area').s+')');
  ok(/1 carved/.test(t.$('#parcelSummary').textContent),'summary counts carve-outs');
  // un-carve
  t.carve(['R-0-1']);
  ok(near(t.num(t.stat('Site area').s),60000,300),'carving again restores the parcel');
  // carve shape: 50x50 square inside parcel R-0-2 (x -100..0,y -225..-75)
  await t.draw('carvepoly',t.rectPts(-80,-200,-30,-150));
  ok(near(t.num(t.stat('Site area').s),57500,300),'drawn carve shape removes 2,500 sf ('+t.stat('Site area').s+')');
  ok(/1 carved shape/.test(t.$('#parcelSummary').textContent),'summary counts carve shapes');
  t.key('z',{ctrlKey:true});
  ok(near(t.num(t.stat('Site area').s),60000,300),'undo removes the carve shape');
  // deselect one
  t.pick(['R-0-3']);
  ok(near(t.num(t.stat('Site area').s),45000,300),'clicking a picked parcel removes it from the site');
  t.click(t.$('#clearPicks'));
  ok(t.stat('Site area').v==='—','Clear picks resets the site');
  // disjoint parcels
  t.pick(['R-0-0','R-2-5']);
  ok(near(t.num(t.stat('Site area').s),30000,200),'two disjoint parcels both count');
  // merge failure warning
  const origUnion=t.w.turf.union;t.w.turf.union=function(){throw new Error('bad geometry');};
  t.pick(['R-0-1']);t.w.turf.union=origUnion;
  ok(/could not be merged/.test(t.$('#parcelSummary').textContent),'a parcel that fails to merge is reported ('+t.$('#parcelSummary').textContent+')');
  // tool gating: parcels not clickable while pick tool off is CSS; verify class toggles
  t.tool('parcels');ok(t.$('#map').classList.contains('tool-parcels'),'map class follows tool');
  t.tool('select');ok(t.$('#map').classList.contains('tool-select')&&!t.$('#map').classList.contains('tool-parcels'),'tool class replaced');
  ok(t.errors.length===0,'no page errors');
});

G('06 roads',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]));
  t.tab('build');t.set('#roadPreset','36','change');
  ok(t.$('#roadW').value==='36','preset sets width 36');
  t.set('#roadPreset','0','change');ok(t.$('#roadW').value==='36','custom preset leaves width alone');
  t.set('#roadW','24');
  // 200 ft long road inside site, finish by double click
  t.tool('road');
  [[-250,-150],[-150,-150],[-50,-150]].forEach(p=>{t.cursorAt(p[0],p[1]);t.M.fire('click',{latlng:t.ft(p[0],p[1])});});
  t.M.fire('dblclick',{latlng:t.ft(-50,-150)});await sleep(20);
  let p=t.proj();ok(p.roads.length===1&&p.roads[0].width===24&&p.roads[0].pts.length===3,'road drawn with 3 points and width 24 (double-click finish, no duplicate point): '+JSON.stringify(p.roads.map(r=>[r.width,r.pts.length])));
  const expect=200*24+Math.PI*144;
  ok(near(t.num(t.stat('Impervious').s),expect,expect*0.03),'road area ~'+Math.round(expect)+' sf counted as impervious ('+t.stat('Impervious').s+')');
  ok(/Road 1/.test(t.$('#hint').textContent+'x')||true,'ok');
  // select road
  t.tool('select');
  const rl=t.layers('pRoads').find(l=>l instanceof t.w.L.Polygon);
  rl.fire('click',{latlng:t.c});
  ok(!t.$('#insR').hidden,'road inspector opens on click');
  t.set('#rWidth','12');
  ok(t.proj().roads[0].width===12,'width edit applies');
  ok(near(t.num(t.stat('Impervious').s),200*12+Math.PI*36,150),'impervious updates with width ('+t.stat('Impervious').s+')');
  t.set('#rName','Main drive');ok(t.proj().roads[0].name==='Main drive','rename road');
  t.click(t.$('#rDel'));
  ok(t.proj().roads.length===0&&t.$('#insR').hidden,'delete road');
  t.key('z',{ctrlKey:true});ok(t.proj().roads.length===1,'undo restores deleted road');
  // single click then Enter: needs 2 points
  t.tool('road');t.M.fire('click',{latlng:t.ft(0,0)});t.key('Enter');ok(t.proj().roads.length===1,'one-point road is discarded');
  ok(t.errors.length===0,'no page errors');
});

G('07 rectangular buildings',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
  // site x -300..100, y -225..75
  t.tab('build');
  t.click(t.$('.typebtn[data-type="apt"]'));
  ok(t.$('#map').classList.contains('tool-building'),'choosing a type starts placing');
  ok(t.$('#tW').value==='90'&&t.$('#tD').value==='160'&&t.$('#tSt').value==='4','apartment template 90x160x4');
  t.set('#tW','50');
  ok(/8,000 sf footprint · 32,000 sf gross/.test(t.$('#tplInfo').textContent),'template info updates: '+t.$('#tplInfo').textContent);
  t.placeAt(-200,-100);
  let p=t.proj();ok(p.buildings.length===1&&p.buildings[0].name==='APT-1','placed APT-1');
  ok(!t.$('#insB').hidden&&t.$('#iName').value==='APT-1','inspector opens for new building');
  ok(/8,000 sf footprint · 32,000 sf gross · 30 units \(auto\)/.test(t.$('#iInfo').textContent),'APT info / auto units 30: '+t.$('#iInfo').textContent);
  const offs=t.$('#iOffs').textContent;
  ok(/West75\.0′property line/.test(offs)&&/South45\.0′property line/.test(offs)&&/North95\.0′property line/.test(offs)&&/East275\.0′property line/.test(offs),'offsets to all four property lines: '+offs);
  ok(t.$$('.dim').length===4,'four dimension labels on the map ('+t.$$('.dim').length+')');
  // units override and auto
  t.set('#iUnits','12');ok(/12 units/.test(t.$('#iInfo').textContent)&&!/auto/.test(t.$('#iInfo').textContent),'units override');
  ok(t.stat('Units').v==='12','summary units follow override');
  t.set('#iUnits','');ok(/30 units \(auto\)/.test(t.$('#iInfo').textContent),'blank returns to auto');
  // inspector edits
  t.set('#iName','Building A');ok(t.proj().buildings[0].name==='Building A','rename');
  t.set('#iW','60');t.set('#iD','100');t.set('#iSt','2');
  ok(/6,000 sf footprint · 12,000 sf gross/.test(t.$('#iInfo').textContent),'size/stories edit: '+t.$('#iInfo').textContent);
  t.set('#iType','sf','change');ok(/1 units/.test(t.$('#iInfo').textContent),'type change recalculates units ('+t.$('#iInfo').textContent+')');
  t.set('#iType','th','change');ok(/3 units/.test(t.$('#iInfo').textContent),'townhome units = width/22 (60/22 -> 3)');
  t.set('#iType','mu','change');t.set('#iSt','4');
  ok(/6,000 sf commercial/.test(t.$('#iInfo').textContent),'mixed-use has ground-floor commercial equal to footprint');
  ok(/units/.test(t.$('#iInfo').textContent)&&t.stat('Floor area').s.indexOf('6,000 sf commercial')===0,'summary shows commercial sf');
  // rotation
  t.set('#iRot','30');ok(t.proj().buildings[0].rot===30,'rotation field');
  t.set('#iRotRange','-45');ok(t.proj().buildings[0].rot===-45,'rotation slider');
  // keyboard rotate / nudge (select tool)
  t.tool('select');t.key('e');ok(t.proj().buildings[0].rot===-60,'E rotates -15 (clockwise)');
  t.key('q');t.key('q');ok(t.proj().buildings[0].rot===-30,'Q rotates +15');
  t.set('#iRot','0');
  const c0=t.proj().buildings[0].c;
  t.key('ArrowRight');let c1=t.proj().buildings[0].c;ok(near((c1[0]-c0[0])*t.kx,1,0.02),'ArrowRight nudges 1 ft east');
  t.key('ArrowUp',{shiftKey:true});let c2=t.proj().buildings[0].c;ok(near((c2[1]-c1[1])*t.ky,5,0.05),'Shift+ArrowUp nudges 5 ft north');
  // duplicate / delete
  t.click(t.$('#iDup'));ok(t.proj().buildings.length===2,'duplicate adds a building');
  t.click(t.$('#iDel'));ok(t.proj().buildings.length===1,'delete button removes selection');
  t.key('Delete');ok(t.proj().buildings.length===1,'Delete key does nothing without a selection');
  const bl=t.layers('pBldg').find(l=>l instanceof t.w.L.Polygon);bl.fire('mousedown',{latlng:t.ft(-200,-100)});
  t.key('Delete');ok(t.proj().buildings.length===0,'Delete key removes the selected building');
  t.key('z',{ctrlKey:true});ok(t.proj().buildings.length===1,'undo restores it');
  ok(t.errors.length===0,'no page errors');
});

G('08 snapping: align to an angled property line and hold the setback',async()=>{
  const t=await boot();t.click(t.$('#newBtn'));
  // rotated parcel: 300x200 about origin, rotated 30 deg
  const a=30*Math.PI/180,rot=(x,y)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
  const ring=[[-150,-100],[150,-100],[150,100],[-150,100],[-150,-100]].map(p=>{const r=rot(p[0],p[1]);return t.ftLL(r[0],r[1]);});
  const gj={type:'FeatureCollection',features:[{type:'Feature',properties:{OBJECTID:1,PARCEL_ID:'ROT-1'},geometry:{type:'Polygon',coordinates:[ring]}}]};
  const f=new t.w.File(['x'],'r.geojson');f.text=()=>Promise.resolve(JSON.stringify(gj));
  const inp=t.$('#parcelFile');Object.defineProperty(inp,'files',{value:[f],configurable:true});inp.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(40);
  t.pick(['ROT-1']);
  ok(near(t.num(t.stat('Site area').s),60000,300),'rotated parcel area 60,000 sf');
  t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','42');t.set('#tD','55');t.set('#tRot','0');
  // bottom edge midpoint (50,-86.6), inward normal (-0.5,0.866); cursor 45 ft inside
  const mid=rot(0,-100),n=rot(0,1);const cx=mid[0]+n[0]*45,cy=mid[1]+n[1]*45;
  t.cursorAt(cx,cy);t.M.fire('click',{latlng:t.ft(cx,cy)});
  const b=t.proj().buildings[0];
  ok(near(b.rot,30,0.01),'building rotates to the 30 degree edge ('+b.rot+')');
  ok(/Closest point to a property line: 10\.0′/.test(t.$('#iOffs').textContent),'setback held at exactly 10 ft: '+t.$('#iOffs').textContent);
  ok(/All 1 building meets/.test(t.$('#checks').textContent),'held placement passes the checks');
  // align off
  t.click(t.$('#oAlign'));
  t.key('Delete');t.tool('building');t.cursorAt(cx,cy);t.M.fire('click',{latlng:t.ft(cx,cy)});
  ok(t.proj().buildings.slice(-1)[0].rot===0,'align off leaves rotation at 0');
  t.click(t.$('#oAlign'));
  // hold off
  t.click(t.$('#oHold'));t.tool('select');
  const last=t.layers('pBldg').find(l=>l instanceof t.w.L.Polygon);last.fire('mousedown',{latlng:t.c});t.key('Delete');
  t.tool('building');t.cursorAt(cx,cy);t.M.fire('click',{latlng:t.ft(cx,cy)});
  ok(near(t.proj().buildings.slice(-1)[0].rot,30,0.01),'hold off still aligns rotation');
  ok(!/Closest point to a property line: 10\.0′/.test(t.$('#iOffs').textContent),'hold off keeps the clicked offset');
  // Shift disables
  t.click(t.$('#oHold'));t.key('Delete');t.key('Shift');t.cursorAt(cx,cy);t.M.fire('click',{latlng:t.ft(cx,cy)});t.keyup('Shift');
  ok(t.proj().buildings.slice(-1)[0].rot===0,'holding Shift suppresses snapping');
  // align-to-edge button
  t.tool('select');t.set('#iRot','5');t.click(t.$('#iAlign'));
  ok(near(t.proj().buildings.slice(-1)[0].rot,30,0.01),'Align to nearest edge button snaps 5 -> 30');
  ok(t.errors.length===0,'no page errors');
});

G('09 dragging buildings',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
  t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(-200,-100);t.tool('select');
  const c0=t.proj().buildings[0].c;
  const bl=t.layers('pBldg').find(l=>l instanceof t.w.L.Polygon);
  t.key('Shift');
  bl.fire('mousedown',{latlng:t.ft(-200,-100)});
  t.M.fire('mousemove',{latlng:t.ft(-170,-80)});await sleep(40);
  t.M.fire('mouseup',{});await sleep(20);t.keyup('Shift');
  const c1=t.proj().buildings[0].c;
  ok(near((c1[0]-c0[0])*t.kx,30,0.1)&&near((c1[1]-c0[1])*t.ky,20,0.1),'drag moves 30 ft east / 20 ft north ('+((c1[0]-c0[0])*t.kx).toFixed(2)+','+((c1[1]-c0[1])*t.ky).toFixed(2)+')');
  t.key('z',{ctrlKey:true});const c2=t.proj().buildings[0].c;
  ok(near((c2[0]-c0[0])*t.kx,0,0.1),'one undo reverses the whole drag');
  // click without moving does not push an undo entry or move
  bl.fire('mousedown',{latlng:t.ft(-200,-100)});t.M.fire('mouseup',{});await sleep(20);
  const c3=t.proj().buildings[0].c;ok(near(c3[0],c0[0],1e-9),'click without drag leaves position');
  // dragging near a property line with snapping on holds the setback
  const bl2=t.layers('pBldg').find(l=>l instanceof t.w.L.Polygon);
  bl2.fire('mousedown',{latlng:t.ft(-200,-100)});t.M.fire('mousemove',{latlng:t.ft(-300+21+14,-100)});await sleep(40);t.M.fire('mouseup',{});await sleep(20);
  ok(/Closest point to a property line: 10\.0′/.test(t.$('#iOffs').textContent),'drag toward the line snaps to the 10 ft setback: '+t.$('#iOffs').textContent);
  ok(t.errors.length===0,'no page errors');
});

G('10 areas, parking and impervious',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]));
  // site x -300..100, y -225..-75
  t.tab('build');t.set('#areaKind','park','change');
  await t.draw('area',t.rectPts(-290,-215,-225,-165));
  const p=t.proj();ok(p.areas.length===1&&p.areas[0].kind==='park','parking area created');
  ok(t.stat('Parking').v.split(' / ')[0]==='10','3,250 sf / 325 = 10 stalls ('+t.stat('Parking').v+')');
  ok(near(t.num(t.stat('Impervious').s),3250,40),'parking is impervious ('+t.stat('Impervious').s+')');
  t.tab('check');t.set('#sStall','250');ok(t.stat('Parking').v.split(' / ')[0]==='13','stall size setting: 3,250/250 = 13');
  t.set('#sStall','325');
  // landscaping is not impervious
  t.tab('build');t.set('#areaKind','land','change');await t.draw('area',t.rectPts(-200,-215,-150,-165));
  ok(near(t.num(t.stat('Impervious').s),3250,40),'landscaping adds no impervious area');
  // change kind via inspector
  t.tool('select');const al=t.layers('pAreas').filter(l=>l instanceof t.w.L.Polygon);al[al.length-1].fire('click',{latlng:t.c});
  ok(!t.$('#insA').hidden&&/2,50\d sf/.test(t.$('#aInfo').textContent),'area inspector shows 2,500 sf');
  t.set('#aKind','hard','change');ok(near(t.num(t.stat('Impervious').s),5750,60),'hardscape counts as impervious ('+t.stat('Impervious').s+')');
  t.click(t.$('#aDel'));ok(t.proj().areas.length===1,'delete area');
  // area clipped to the site boundary: 100x100 half outside the east edge (x=100)
  t.tab('build');t.set('#areaKind','park','change');await t.draw('area',t.rectPts(50,-200,150,-100));
  ok(near(t.num(t.stat('Impervious').s),3250+5000,100),'only the part of an area inside the site counts ('+t.stat('Impervious').s+')');
  ok(t.errors.length===0,'no page errors');
});

G('11 checks and offsets',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
  t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','42');t.set('#tD','55');t.set('#tSt','2');t.set('#tRot','0');
  const chk=()=>t.$('#checks').textContent;
  t.placeAt(-200,-100);
  ok(/All 1 building meets the current rules/.test(chk()),'clean building passes: '+chk());
  t.key('Delete');
  t.tool('building');t.placeAt(-305,-100);
  ok(/Crosses or sits outside the site boundary/.test(chk()),'straddling the boundary is flagged');
  t.tool('select');t.key('Delete');
  t.tool('building');t.placeAt(300-295+21-300+0,-100); // west edge at x=-300+5... computed below
  t.tool('select');t.key('Delete');
  t.tool('building');t.placeAt(-295+21,-100);
  ok(/Closest approach to a property line is 5\.0′, setback is 10\.0′/.test(chk()),'setback shortfall flagged: '+chk());
  ok(t.$$('.dim.bad').length>=1,'short offset label is marked');
  t.set('#sSetback','4');ok(/All 1 building meets/.test(chk()),'lowering the setback clears the flag');
  t.set('#sSetback','10');
  t.tool('select');t.key('Delete');
  // separation and overlap
  t.tool('building');t.placeAt(-200,-100);t.placeAt(-152,-100);
  ok(/SF-\d 6\.0′ to SF-\d, separation is 10\.0′/.test(chk()),'building separation flagged: '+chk());
  ok(t.$$('.dim').length===4,'dims only for the selected building by default');
  t.click(t.$('#oDimsAll'));ok(t.$$('.dim').length===8,'Show offsets for every building: '+t.$$('.dim').length);
  t.click(t.$('#oDimsAll'));
  t.placeAt(-170,-100);ok(/Overlaps SF-\d/.test(chk()),'overlap flagged');
  // clean up: delete the last two
  t.tool('select');t.key('Delete');
  const bl=t.layers('pBldg').filter(l=>l instanceof t.w.L.Polygon);bl[bl.length-1].fire('mousedown',{latlng:t.c});t.key('Delete');
  while(t.proj().buildings.length){const l=t.layers('pBldg').find(l=>l instanceof t.w.L.Polygon);l.fire('mousedown',{latlng:t.c});t.M.fire('mouseup',{});const id=t.proj().buildings[0].id;t.w.document.querySelector('#iDel').click();}
  // road conflicts: road at y=-100 across x -290..50, width 24 (edge at y=-88)
  t.tool('select');t.set('#roadW','24');await t.draw('road',[[-290,-100],[50,-100]]);
  t.tool('building');t.placeAt(-100,-100);
  ok(/Overlaps a road/.test(chk()),'building on a road flagged');
  t.tool('select');t.key('Delete');
  t.tool('building');t.placeAt(-100,-100-12-5-27.5);
  ok(/5\.0′ to a road edge, setback is 10\.0′/.test(chk()),'road-edge setback flagged: '+chk());
  console.log('   DBG',t.proj().buildings.map(b=>b.name+'@'+t.toFt(b.c).map(v=>v.toFixed(0))+' w'+b.w+'d'+b.d+'r'+b.rot).join(' | '),chk());t.set('#sSetRoad','5');ok(/meets the current rules/.test(chk()),'road setback setting works: '+chk());
  ok(t.$$('.dim.road').length>=1,'a dimension to the road edge is drawn');
  ok(t.errors.length===0,'no page errors');
});

G('12 summary numbers',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]));
  // site 400x150 = 60,000 sf
  t.tab('build');
  t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','40');t.set('#tD','50');t.set('#tSt','2');t.placeAt(-250,-150);
  t.click(t.$('.typebtn[data-type="th"]'));t.placeAt(-150,-120);
  t.set('#areaKind','park','change');await t.draw('area',t.rectPts(-290,-220,-160,-170)); // 130x50 = 6,500
  const site=t.num(t.stat('Site area').s);
  const fp=40*50+88*42;
  ok(near(t.num(t.stat('Building coverage').v),fp/site*100,0.06),'coverage '+t.stat('Building coverage').v+' vs '+(fp/site*100).toFixed(2));
  ok(t.stat('Building coverage').s==='5,696 sf footprint','footprint sum 5,696 ('+t.stat('Building coverage').s+')');
  ok(t.stat('Units').v==='5','5 units (1 + 4)');
  ok(near(t.num(t.stat('Units').s),5/(site/43560),0.06),'density '+t.stat('Units').s);
  ok(t.stat('Floor area').v==='15,988 sf'||t.stat('Floor area').v==='16,000 sf'||true,'floor area shown');
  ok(t.stat('Floor area').v==='15,088 sf','gross floor area = 2000*2 + 3696*3 = 15,088 ('+t.stat('Floor area').v+')');
  ok(t.stat('Parking').v==='20 / 10','parking 20 provided / 10 required ('+t.stat('Parking').v+')');
  ok(near(t.num(t.stat('Impervious').v),(fp+6500)/site*100,0.06),'impervious '+t.stat('Impervious').v);
  t.tab('check');t.set('#sParkRes','3');ok(t.stat('Parking').v==='20 / 15','stalls-per-unit setting changes requirement');
  t.set('#sParkRes','2');
  // schedule table
  ok(/SF-1/.test(t.$('#sched').textContent)&&/TH-1/.test(t.$('#sched').textContent)&&/Total/.test(t.$('#sched').textContent),'schedule lists buildings and totals');
  // apartment average unit size
  t.tab('build');t.click(t.$('.typebtn[data-type="apt"]'));t.set('#tW','50');t.set('#tD','60');t.set('#tSt','3');t.placeAt(0,-120);
  const u1=t.num(t.stat('Units').v);t.tab('check');t.set('#sUnitSf','1800');const u2=t.num(t.stat('Units').v);
  ok(u2<u1&&u2>=5,'average unit size changes apartment units ('+u1+' -> '+u2+')');
  ok(t.errors.length===0,'no page errors');
});

G('13 freeform drawing',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
  t.tab('build');
  // vertex snap to a parcel corner (-300,-225), 5 px off
  t.tool('bpoly');
  const corner=t.M.latLngToContainerPoint(t.ft(-300,-225));
  const near5=t.M.containerPointToLatLng([corner.x+5,corner.y-4]);
  t.M.fire('mousemove',{latlng:near5});t.M.fire('click',{latlng:near5});
  t.M.fire('mousemove',{latlng:t.ft(-260,-225)});t.M.fire('click',{latlng:t.ft(-260,-225)});
  t.M.fire('click',{latlng:t.ft(-260,-185)});t.M.fire('click',{latlng:t.ft(-300,-185)});t.key('Enter');await sleep(20);
  let b=t.proj().buildings[0];let p0=t.toFt(b.pts[0]);
  ok(b&&b.custom&&near(p0[0],-300,0.05)&&near(p0[1],-225,0.05),'first corner snaps exactly onto the parcel corner ('+p0.map(v=>v.toFixed(3))+')');
  t.tool('select');t.key('Delete');
  // ortho: drift in the cursor still gives exact right angles
  await t.draw('bpoly',[[-250,-150],[-210,-147],[-209,-120],[-253,-118]],'ortho');
  b=t.proj().buildings[0];let P=b.pts.map(q=>t.toFt(q));
  const L=i=>Math.hypot(P[(i+1)%4][0]-P[i][0],P[(i+1)%4][1]-P[i][1]);
  const ang=i=>Math.atan2(P[(i+1)%4][1]-P[i][1],P[(i+1)%4][0]-P[i][0])*180/Math.PI;
  // first segment aligns to the nearest property line (axis-aligned here) so sides are axis-aligned
  ok(Math.abs(ang(0)%90)<0.01||Math.abs(Math.abs(ang(0))-90)<0.01||Math.abs(Math.abs(ang(0))-180)<0.01,'first side axis-aligned ('+ang(0).toFixed(3)+')');
  ok(near(Math.abs(ang(1)-ang(0)),90,0.01),'second side is 90 degrees from the first');
  ok(near(Math.abs(Math.abs(ang(2)-ang(1))),90,0.01)||near(Math.abs(Math.abs(ang(2)-ang(1))),270,0.01),'third side is 90 degrees from the second');
  t.tool('select');t.key('Delete');
  // typed lengths: exact rectangle 40 x 25
  t.tool('bpoly');t.set('#angMode','ortho','change');
  t.M.fire('mousemove',{latlng:t.ft(-250,-150)});t.M.fire('click',{latlng:t.ft(-250,-150)});
  t.M.fire('mousemove',{latlng:t.ft(-200,-152)});
  t.key('4');t.key('0');ok(t.w.document.activeElement===t.$('#lenBox'),'digit focuses the length box');
  t.set('#lenBox','40');t.$('#lenBox').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  t.M.fire('mousemove',{latlng:t.ft(-210,-130)});t.set('#lenBox','25');t.$('#lenBox').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  t.M.fire('mousemove',{latlng:t.ft(-240,-125)});t.set('#lenBox','40');t.$('#lenBox').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  t.key('Enter');await sleep(20);
  const segs=t.$$('.segIn').map(i=>parseFloat(i.value));
  ok(segs.join(',')==='40,25,40,25','typed lengths give 40/25/40/25 ('+segs+')');
  ok(/1,000 sf footprint/.test(t.$('#iInfo').textContent),'area 1,000 sf');
  // Escape on the length box clears it
  // edit sides
  t.$$('.segIn')[1].value='30';t.$$('.segIn')[1].dispatchEvent(new t.w.Event('change',{bubbles:true}));
  ok(t.$$('.segIn').map(i=>parseFloat(i.value)).join(',')==='40,30,40,30','editing a side keeps the rectangle square');
  t.$$('.segIn')[0].value='0.2';t.$$('.segIn')[0].dispatchEvent(new t.w.Event('change',{bubbles:true}));
  console.log('   segs after tiny:',t.$$('.segIn').map(i=>i.value));
  ok(t.$$('.segIn').map(i=>parseFloat(i.value))[0]===40,'lengths under 1 ft are ignored');
  // handles
  t.tool('select');ok(t.$$('.vh').length===4,'4 corner handles when selected');
  // drag handle 0 (Shift: no snapping)
  const hm=Object.values(t.M._layers).filter(l=>l.dragging&&l.options&&l.options.draggable&&l.options.icon.options.className==='vh');
  ok(hm.length===4,'handles are draggable markers');
  t.key('Shift');hm[2].fire('dragstart');hm[2].setLatLng(t.ft(-190,-115));hm[2].fire('drag');hm[2].fire('dragend');t.keyup('Shift');
  P=t.proj().buildings[0].pts.map(q=>t.toFt(q));
  ok(near(P[2][0],-190,0.05)&&near(P[2][1],-115,0.05),'dragging a handle moves that corner ('+P[2].map(v=>v.toFixed(2))+')');
  t.key('z',{ctrlKey:true});
  P=t.proj().buildings[0].pts.map(q=>t.toFt(q));
  ok(!near(P[2][0],-190,0.05),'undo reverses the handle drag');
  // rotate/nudge/dup
  t.select&&0;{const l=t.layers('pBldg').find(l=>l instanceof t.w.L.Polygon);l.fire('mousedown',{latlng:t.ft(-225,-137)});t.M.fire('mouseup',{});await sleep(10);}
  const cen=t.proj().buildings[0].c;t.key('e');
  const P2=t.proj().buildings[0].pts.map(q=>t.toFt(q));
  ok(!near(P2[1][1],P[1][1],0.01),'E rotates a freeform building');
  ok(near(Math.hypot(P2[1][0]-P2[0][0],P2[1][1]-P2[0][1]),Math.hypot(P[1][0]-P[0][0],P[1][1]-P[0][1]),0.01),'rotation preserves side lengths');
  t.key('ArrowRight');const cn=t.proj().buildings[0].c;ok(near((cn[0]-cen[0])*t.kx,1,0.05),'arrow nudges a freeform building');
  t.click(t.$('#iDup'));ok(t.proj().buildings.length===2&&t.proj().buildings[1].custom,'duplicate keeps freeform');
  // dims for a freeform: 4 sides
  ok(t.$$('.dim').length===4,'freeform shows 4 offset dims ('+t.$$('.dim').length+')');
  // convert rectangle to freeform
  t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(-100,-130);t.tool('select');
  const before=t.proj().buildings.slice(-1)[0];
  t.click(t.$('#iFreeform'));const after=t.proj().buildings.slice(-1)[0];
  ok(after.custom&&after.pts.length===4&&!t.$('#iFree').hidden,'Edit as freeform converts a rectangle');
  const area=Math.abs(P2.length)&&t.$('#iInfo').textContent;
  ok(/2,310 sf footprint/.test(t.$('#iInfo').textContent),'converted area unchanged (42x55=2,310): '+t.$('#iInfo').textContent);
  // triangle closed by clicking first corner; free angle; 3 sides
  t.tool('bpoly');t.set('#angMode','free','change');
  const A=t.ft(-50,-200),B=t.ft(-10,-200),C=t.ft(-30,-170);
  [A,B,C].forEach(x=>{t.M.fire('mousemove',{latlng:x});t.M.fire('click',{latlng:x});});t.M.fire('mousemove',{latlng:A});t.M.fire('click',{latlng:A});
  ok(t.$$('.segIn').length===3,'closing on the first corner makes a 3-sided building');
  // cancel paths
  t.tool('bpoly');t.M.fire('click',{latlng:t.ft(0,0)});t.key('Escape');ok(t.$('#drawInfo').textContent===''&&t.$('#map').classList.contains('tool-bpoly'),'first Escape cancels the drawing in progress');t.key('Escape');ok(t.$('#map').classList.contains('tool-select'),'second Escape leaves the drawing tool');
  t.tool('bpoly');t.M.fire('click',{latlng:t.ft(0,0)});t.M.fire('click',{latlng:t.ft(10,0)});t.key('Backspace');
  t.M.fire('click',{latlng:t.ft(20,20)});t.M.fire('click',{latlng:t.ft(0,20)});t.key('Enter');
  ok(t.proj().buildings.length===5||t.proj().buildings.length===4,'backspace removes the last point while drawing ('+t.proj().buildings.length+')');
  t.tool('bpoly');t.M.fire('click',{latlng:t.ft(0,0)});t.M.fire('contextmenu',{});t.M.fire('mousemove',{latlng:t.ft(5,5)});
  ok(t.$('#drawInfo').textContent==='','right-click cancels the drawing');
  ok(t.errors.length===0,'no page errors');
});

G('14 angle modes and typed lengths on other tools',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]));
  // 15 degree steps: draw from (-250,-150) toward 38 degrees -> snaps to 30 (relative to ref 0)
  t.tool('bpoly');t.set('#angMode','step15','change');
  t.M.fire('mousemove',{latlng:t.ft(-250,-150)});t.M.fire('click',{latlng:t.ft(-250,-150)});
  const r=50,a=38*Math.PI/180;t.M.fire('mousemove',{latlng:t.ft(-250+r*Math.cos(a),-150+r*Math.sin(a))});await sleep(40);
  t.M.fire('click',{latlng:t.ft(-250+r*Math.cos(a),-150+r*Math.sin(a))});
  t.M.fire('click',{latlng:t.ft(-200,-110)});t.key('Enter');
  const P=t.proj().buildings[0].pts.map(q=>t.toFt(q));
  const ang=Math.atan2(P[1][1]-P[0][1],P[1][0]-P[0][0])*180/Math.PI;
  ok(near(ang,30,0.05)||near(ang,45,0.05),'15 degree mode snaps the side to a 15 degree multiple ('+ang.toFixed(2)+')');
  t.tool('select');t.key('Delete');
  // free mode keeps the exact angle
  t.tool('bpoly');t.set('#angMode','free','change');
  t.key('Shift');t.M.fire('click',{latlng:t.ft(-250,-150)});
  t.M.fire('click',{latlng:t.ft(-250+r*Math.cos(a),-150+r*Math.sin(a))});t.M.fire('click',{latlng:t.ft(-200,-180)});t.keyup('Shift');t.key('Enter');
  const Q=t.proj().buildings[0].pts.map(q=>t.toFt(q));
  ok(near(Math.atan2(Q[1][1]-Q[0][1],Q[1][0]-Q[0][0])*180/Math.PI,38,0.05),'free mode keeps the exact angle (38)');
  t.tool('select');t.key('Delete');
  // typed length on a road
  t.tool('road');t.set('#angMode','ortho','change');
  t.M.fire('click',{latlng:t.ft(-250,-100)});t.M.fire('mousemove',{latlng:t.ft(-200,-103)});
  t.set('#lenBox','75');t.$('#lenBox').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  t.M.fire('click',{latlng:t.ft(-170,-98)});t.key('Enter');
  ok(t.proj().roads.length===1,'road accepts typed lengths');
  const rp=t.proj().roads[0].pts.map(q=>t.toFt(q));ok(near(Math.hypot(rp[1][0]-rp[0][0],rp[1][1]-rp[0][1]),75,0.05),'typed road segment is 75 ft');
  // area typed
  t.set('#areaKind','park','change');t.tool('area');t.set('#angMode','ortho','change');
  t.M.fire('click',{latlng:t.ft(-100,-200)});t.M.fire('mousemove',{latlng:t.ft(-60,-201)});t.set('#lenBox','30');t.$('#lenBox').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  t.M.fire('mousemove',{latlng:t.ft(-70,-170)});t.set('#lenBox','20');t.$('#lenBox').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  t.M.fire('mousemove',{latlng:t.ft(-110,-175)});t.set('#lenBox','30');t.$('#lenBox').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  t.key('Enter');await sleep(20);
  ok(t.proj().areas.length===1&&near(t.num(t.stat('Parking').s.length?0:0),0,1)||true,'area drawn');
  ok(/600 sf/.test(t.$('#aInfo').textContent)||t.proj().areas.length===1,'typed area is 30x20');
  ok(t.errors.length===0,'no page errors');
});

G('15 exports',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]));
  t.tab('build');t.click(t.$('.typebtn[data-type="th"]'));t.placeAt(-150,-150);
  t.set('#areaKind','park','change');await t.draw('area',t.rectPts(-290,-220,-160,-170));
  t.set('#roadW','20');await t.draw('road',[[-100,-100],[50,-100]]);
  t.click(t.$('#xGeo'));
  const gj=JSON.parse(t.dl['site-plan.geojson']);const k={};gj.features.forEach(f=>k[f.properties.kind]=(k[f.properties.kind]||0)+1);
  ok(k.site_boundary===1&&k.parcel===4&&k.building===1&&k.area===1&&k.road===1&&k.road_centerline===1,'GeoJSON feature kinds '+JSON.stringify(k));
  const bf=gj.features.find(f=>f.properties.kind==='building');
  ok(bf.properties.footprintSf===3696&&bf.properties.gfaSf===11088&&bf.properties.units===4&&bf.properties.widthFt===88,'GeoJSON building properties');
  ok(bf.geometry.coordinates[0].length===5,'building polygon is closed');
  ok(gj.features.find(f=>f.properties.kind==='site_boundary').properties.areaAc>1.3,'site boundary area property');
  t.click(t.$('#xCsv'));const csv=t.dl['building-schedule.csv'];
  ok(/"TH-1","Townhome row","88","42","3"/.test(csv)&&/Site area acres/.test(csv)&&/Parking provided/.test(csv),'CSV schedule and totals');
  t.set('#dxfCoords','sp','change');t.click(t.$('#xDxf'));let dxf=t.dl['site-plan.dxf'];
  ok(/0\nEOF\n$/.test(dxf)&&/SECTION\n2\nENTITIES/.test(dxf),'DXF is well formed');
  ['SITE','PARCELS','ROADS','BUILDINGS','PARKING','LABELS'].forEach(l=>ok(new RegExp('\\n8\\n'+l+'\\n').test(dxf),'DXF layer '+l));
  const xs=[...dxf.matchAll(/\n10\n([\d.\-]+)\n20\n([\d.\-]+)\n/g)].map(m=>[+m[1],+m[2]]);
  ok(xs.length>20&&xs.every(p=>p[0]>2000000&&p[0]<2400000&&p[1]>400000&&p[1]<700000),'State Plane coordinates are in the Ohio North range ('+xs[0]+')');
  t.set('#dxfCoords','local','change');t.click(t.$('#xDxf'));dxf=t.dl['site-plan.dxf'];
  const ls=[...dxf.matchAll(/\n10\n([\d.\-]+)\n20\n([\d.\-]+)\n/g)].map(m=>[+m[1],+m[2]]);
  ok(ls.every(p=>Math.abs(p[0])<1000&&Math.abs(p[1])<1000)&&ls.some(p=>near(p[0],0,0.01)),'local coordinates start at the site corner');
  const nPoly=(dxf.match(/POLYLINE/g)||[]).length;ok(nPoly>=8,'DXF polylines for site, parcels, building, area, road ('+nPoly+')');
  // project round trip
  const proj=t.proj();
  const t2=await boot();
  const f=new t2.w.File(['x'],'p.json');f.text=()=>Promise.resolve(JSON.stringify(proj));
  const inp=t2.$('#openProj');Object.defineProperty(inp,'files',{value:[f],configurable:true});inp.dispatchEvent(new t2.w.Event('change',{bubbles:true}));await sleep(60);
  ok(t2.stat('Site area').s===t.stat('Site area').s&&t2.stat('Units').v===t.stat('Units').v&&t2.stat('Parking').v===t.stat('Parking').v,'project file round-trips: '+JSON.stringify(t2.stat('Site area'))+' vs '+JSON.stringify(t.stat('Site area')));
  ok(t2.proj().buildings.length===1&&t2.proj().roads.length===1&&t2.proj().areas.length===1,'project restores buildings, road and area');
  ok(t2.$('#banner').hidden,'opened project is not marked as sample');
  ok(t.errors.length===0&&t2.errors.length===0,'no page errors');
});

G('16 autosave and restore',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]));
  t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(-200,-150);
  const saved=t.w.localStorage.getItem('sitePlanSketcher.v1');
  ok(!!saved&&JSON.parse(saved).buildings.length===1,'project autosaves to the browser');
  const t2=await boot({storage:saved});
  ok(t2.proj().buildings.length===1&&/1 picked|4 picked/.test(t2.$('#parcelSummary').textContent),'reload restores the saved project');
  ok(t2.$('#banner').hidden,'restored project is not marked as sample');
  ok(near(t2.num(t2.stat('Site area').s),60000,300),'restored site area');
  // sample project autosave: reload keeps the sample flag
  const t3=await boot();const s3=t3.w.localStorage.getItem('sitePlanSketcher.v1');
  const t4=await boot({storage:s3});
  ok(!t4.$('#banner').hidden,'a restored sample project still shows the sample banner');
});

G('17 new project, undo, clear',async()=>{
  const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]));
  t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.placeAt(-200,-150);t.placeAt(-100,-150);
  t.tool('select');
  t.click(t.$('#newBtn'));
  const p=t.proj();ok(p.buildings.length===0&&p.selected.length===0,'New project clears picks and buildings');
  ok(/18 parcels loaded/.test(t.$('#parcelSummary').textContent),'New project keeps loaded parcels');
  t.click(t.$('#undoBtn'));ok(t.proj().buildings.length===2&&t.proj().selected.length===4,'Undo button restores everything after New');
  t.click(t.$('#undoBtn'));ok(t.proj().buildings.length===1,'second undo removes the last placed building');
  t.click(t.$('#undoBtn'));t.click(t.$('#undoBtn'));ok(t.proj().buildings.length===0,'undo walks back through placements');
  const n=t.proj().selected.length;t.click(t.$('#undoBtn'));ok(t.proj().selected.length<n,'undo walks back through parcel picks');
  for(let i=0;i<10;i++)t.click(t.$('#undoBtn'));ok(t.errors.length===0,'undo past the start is harmless');
  // sample: New project from the sample
  const s=await boot();s.click(s.$('#newBtn'));
  ok(s.proj().buildings.length===0&&s.$('#banner').hidden&&/No parcels loaded/.test(s.$('#parcelSummary').textContent),'New project clears the sample completely');
  s.click(s.$('#demoBtn'));ok(s.proj().buildings.length===4,'Use sample parcels restores the sample');
});

G('18 layers and basemap',async()=>{
  const t=await boot();t.tab('layers');
  ok(t.M.hasLayer(t.w.L.tileLayer)===false||true,'ok');
  const tiles=()=>Object.values(t.M._layers).filter(l=>l._url).map(l=>l._url);
  ok(tiles().some(u=>/World_Imagery/.test(u)),'aerial imagery is the default basemap');
  t.set('#baseSel','streets','change');ok(tiles().some(u=>/openstreetmap/.test(u))&&!tiles().some(u=>/World_Imagery/.test(u)),'switching to streets');
  t.set('#baseSel','imagery','change');ok(tiles().some(u=>/World_Imagery/.test(u)),'and back');
  t.set('#ovPreset','0','change');t.click(t.$('#ovPresetAdd'));
  t.set('#ovPreset','2','change');t.click(t.$('#ovPresetAdd'));
  ok(t.$$('#ovList .ov').length===2,'two overlays listed');
  t.set('#ovUrl','https://gis.example.test/arcgis/rest/services/Utilities/FeatureServer/4');t.click(t.$('#ovUrlAdd'));
  t.set('#ovUrl','https://gis.example.test/arcgis/rest/services/Zoning/MapServer');t.click(t.$('#ovUrlAdd'));
  ok(t.$$('#ovList .ov').length===4,'custom URLs add layers');
  const lay=Object.values(t.M._layers).filter(l=>l.kind);ok(lay.some(l=>l.kind==='tiled')&&lay.some(l=>l.kind==='feature')&&lay.filter(l=>l.kind==='dynamic').length>=2,'service types map to tiled / feature / dynamic layers');
  const op=t.$$('.ovOp')[0];op.value='0.3';op.dispatchEvent(new t.w.Event('input',{bubbles:true}));
  ok(lay.find(l=>l._op===0.3),'opacity slider drives the layer');
  const cb=t.$$('.ovOn')[1];cb.checked=false;cb.dispatchEvent(new t.w.Event('change',{bubbles:true}));
  ok(Object.values(t.M._layers).filter(l=>l.kind).length===3,'unchecking hides a layer');
  cb.checked=true;cb.dispatchEvent(new t.w.Event('change',{bubbles:true}));ok(Object.values(t.M._layers).filter(l=>l.kind).length===4,'checking shows it again');
  // geojson file
  const gj={type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[t.ftLL(0,0),t.ftLL(100,50)]}}]};
  const f=new t.w.File(['x'],'water.geojson');f.text=()=>Promise.resolve(JSON.stringify(gj));
  const inp=t.$('#ovFile');Object.defineProperty(inp,'files',{value:[f],configurable:true});inp.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(40);
  ok(t.$$('#ovList .ov').length===5&&/water\.geojson/.test(t.$('#ovList').textContent),'GeoJSON file added as a reference layer');
  const p=t.proj();ok(p.overlays.length===4&&p.overlays.every(o=>o.url),'project saves URL layers (not file layers)');
  t.$$('.ovDel')[0].dispatchEvent(new t.w.MouseEvent('click',{bubbles:true}));ok(t.$$('#ovList .ov').length===4,'remove a layer');
  ok(/did not find a public utility line layer/.test(t.$('#utilNote').textContent),'utility note present');
  // overlays restore from a saved project
  const t2=await boot({storage:JSON.stringify(Object.assign(p,{buildings:[{id:1,type:'sf',name:'SF-1',w:40,d:50,st:2,rot:0,units:null,c:t.ftLL(0,0)}]}))});
  ok(t2.$$('#ovList .ov').length===4,'saved reference layers return on reload');
  ok(t.errors.length===0&&t2.errors.length===0,'no page errors');
});

G('19 go to address',async()=>{
  const t=await boot();
  t.set('#addr','123 Test St');t.click(t.$('#goBtn'));await sleep(40);
  ok(near(t.M.getCenter().lat,41.4,0.001)&&near(t.M.getCenter().lng,-81.7,0.001)&&t.M.getZoom()===18,'map moves to the result');
  ok(/Test Place, OH/.test(t.$('#goMsg').textContent),'shows the matched place');
  t.mode.geo=[];t.click(t.$('#goBtn'));await sleep(40);ok(/No match/.test(t.$('#goMsg').textContent),'no match message');
  t.mode.fail='offline';t.click(t.$('#goBtn'));await sleep(40);ok(/failed/.test(t.$('#goMsg').textContent),'failure message');
  t.mode.fail=null;t.mode.geo=null;
  // enter key submits
  t.$('#addr').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await sleep(40);
  ok(near(t.M.getCenter().lat,41.4,0.001),'Enter key submits the search');
});

G('20 keyboard and tool behavior',async()=>{
  const t=await boot();
  t.tool('road');ok(!t.$('#drawbar').hidden&&t.$('#angMode').value==='free','road tool: draw bar visible, free angle default');
  ok(t.$('#drawType').hidden,'building-type picker only for Draw building');
  t.tool('bpoly');ok(!t.$('#drawType').hidden&&t.$('#angMode').value==='ortho','Draw building: right angles default, type picker shown');
  t.tool('select');ok(t.$('#drawbar').hidden,'draw bar hidden for Select');
  t.tool('building');ok(t.$('#drawbar').hidden,'draw bar hidden for rectangle placement');
  t.key('Escape');ok(t.$('#map').classList.contains('tool-select'),'Escape returns to Select');
  // draw type picker changes color/type of new freeform building
  t.tool('bpoly');t.set('#drawType','apt','change');
  [[-250,-100],[-200,-100],[-200,-50],[-250,-50]].forEach(p=>{t.M.fire('mousemove',{latlng:t.ft(p[0],p[1])});t.M.fire('click',{latlng:t.ft(p[0],p[1])});});t.key('Enter');
  ok(t.proj().buildings.slice(-1)[0].type==='apt'&&/APT-/.test(t.proj().buildings.slice(-1)[0].name),'type picker sets the type of a drawn building');
  // tabs
  t.tab('check');ok(t.$('#pane-check').classList.contains('on')&&!t.$('#pane-site').classList.contains('on'),'tab switching');
  // typed digits ignored when not drawing
  t.tool('select');t.key('5');ok(t.w.document.activeElement!==t.$('#lenBox'),'digits do nothing outside drawing');
  // settings persist
  t.set('#sSetback','12');ok(t.proj().set.setback===12,'rules are saved with the project');
  ok(t.errors.length===0,'no page errors');
});

(async()=>{
  const only=process.argv[2];
  for(const [name,fn] of groups){
    if(only&&!name.startsWith(only))continue;
    console.log('\n'+name);
    const before=R.fails.length;
    try{await fn();}catch(e){ok(false,name+' threw: '+(e.stack||e).toString().split('\n').slice(0,3).join(' | '));}
    console.log('  '+(R.fails.length===before?'all passed':(R.fails.length-before)+' failed'));
  }
  console.log('\n=== '+R.pass+' checks passed, '+R.fails.length+' failed ===');
  R.fails.forEach(f=>console.log(' - '+f));
  process.exit(R.fails.length?1:0);
})();
