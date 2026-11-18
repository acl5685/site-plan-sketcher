const {boot,ok,R,sleep,near}=require('./lib');
const glb=name=>({name,arrayBuffer:async()=>new Uint8Array([0x67,0x6C,0x54,0x46,2,0,0,0,12,0,0,0]).buffer});
const addFiles=async(t,fs)=>{const i=t.$('#libFile');Object.defineProperty(i,'files',{value:fs,configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(60);};
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
const optVals=sel=>Array.from(sel.options).map(o=>o.value);
(async()=>{
const t=await boot();t.w.THREE={OrbitControls:function(){}};
t.mode.dem=()=>270;
await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
const pick=async pane=>{const l=t.layers(pane).find(l=>l instanceof t.w.L.Polygon);l.fire('mousedown',{latlng:t.c});l.fire('click',{latlng:t.c});t.M.fire('mouseup',{});await sleep(10);};
const props=()=>(t.$('#v3dProps')||{textContent:''}).textContent;
const open3d=async()=>{t.click(t.$('#view3dBtn'));await sleep(200);};
const close3d=()=>t.click(t.$('#v3dClose'));

// ---- library
t.tab('layers');await sleep(30);
ok(/Built in: Deciduous tree, Conifer, Shrub, Car/.test(t.$('#libList').textContent)&&/No models of your own yet/.test(t.$('#libList').textContent),'library starts with the built-in models only');
await addFiles(t,[glb('oak-tree.glb'),glb('sedan.glb'),glb('house.glb')]);
const kinds=()=>Array.from(t.$$('#libList select')).map(s=>s.value).join();
ok(kinds()==='tree,car,building','file names are guessed as tree, car and building ('+kinds()+')');
const sizes=Array.from(t.$$('#libList input')).map(i=>i.value+(i.disabled?'*':'')).join();
ok(sizes==='30,15,*','default sizes: tree 30 ft, car 15 ft, building fits the footprint ('+sizes+')');
ok(/Added oak-tree\.glb, sedan\.glb, house\.glb/.test(t.$('#toast').textContent),'a message says what was added');
await addFiles(t,[{name:'notes.glb',arrayBuffer:async()=>new TextEncoder().encode('hello world!').buffer}]);
ok(t.$('#toast').classList.contains('err')&&/not a binary glTF/.test(t.$('#toast').textContent),'a file that is not a .glb is refused with the Blender export steps');
// change what a model is and its size
{const sel=t.$$('#libList select')[2];sel.value='tree';sel.dispatchEvent(new t.w.Event('change',{bubbles:true}));}
ok(kinds()==='tree,car,tree'&&t.$$('#libList input')[2].value==='30','changing house.glb to a tree gives it the tree size');
{const sel=t.$$('#libList select')[2];sel.value='building';sel.dispatchEvent(new t.w.Event('change',{bubbles:true}));}
{const inp=t.$$('#libList input')[0];inp.value='45';inp.dispatchEvent(new t.w.Event('change',{bubbles:true}));}
ok(t.$$('#libList input')[0].value==='45','tree height is editable');

// ---- plants on an area
t.tab('build');await t.draw('area',t.rectPts(-280,-200,-180,-100));t.tool('select');await pick('pAreas');
ok(optVals(t.$('#aPlant')).join()===',builtin:tree1,builtin:tree2,builtin:shrub,oak-tree.glb','plant picker lists the built-in plants and tree-kind models only ('+optVals(t.$('#aPlant')).join()+')');
t.set('#aPlant','builtin:tree1','change');
ok(JSON.stringify(t.proj().areas[0].pm)==='{"m":"builtin:tree1","d":6}','choosing a plant saves it on the area at 6 per 1,000 sf');
await open3d();
const n1=+(props().match(/(\d+) plants/)||[])[1];
ok(n1>=54&&n1<=60,'10,000 sf at 6 per 1,000 sf is about 60 plants ('+n1+')');
close3d();await open3d();
ok(+(props().match(/(\d+) plants/)||[])[1]===n1,'the same plan always gets the same number of plants');
close3d();
t.set('#aDens','3');await open3d();
const n2=+(props().match(/(\d+) plants/)||[])[1];
ok(n2>=27&&n2<=30,'3 per 1,000 sf halves it ('+n2+')');
close3d();
// a model of your own, then take it out of the library
t.set('#aPlant','oak-tree.glb','change');
ok(t.proj().areas[0].pm.m==='oak-tree.glb'&&t.proj().areas[0].pm.d===3,'switching model keeps the density');
t.tab('layers');t.click(t.$$('#libList button[data-f="del"]')[0]);await sleep(40);
ok(!/oak-tree/.test(t.$('#libList').textContent),'Remove takes it out of the library');
await open3d();
ok(/Not in this browser’s library: oak-tree\.glb/.test(t.$('#v3dInfo').textContent),'an area that uses a removed model is flagged in the 3D view');
close3d();
t.tab('build');await pick('pAreas');
ok(optVals(t.$('#aPlant')).includes('oak-tree.glb')&&/not in library/.test(t.$('#aPlant').selectedOptions[0].textContent),'the picker still shows the missing model by name');
t.set('#aPlant','','change');ok(t.proj().areas[0].pm===undefined,'None clears it');

// ---- cars in a parking lot
t.tool('lot');await t.draw('lot',[[-250,-100],[-50,-100]]);t.tool('select');await pick('pLots');
ok(optVals(t.$('#pCars')).join()===',builtin:car,sedan.glb','car picker lists the built-in car and car-kind models only ('+optVals(t.$('#pCars')).join()+')');
t.set('#pCars','builtin:car','change');t.set('#pFill','100');
ok(JSON.stringify(t.proj().lots[0].pc)==='{"m":"builtin:car","f":100}','cars saved on the lot');
await open3d();
ok(/\b20 cars/.test(props()),'every one of the 20 stalls gets a car at 100% ('+props()+')');
close3d();
t.set('#pFill','0');await open3d();ok(!/car/.test(props()),'0% leaves the lot empty ('+props()+')');close3d();
t.set('#pFill','50');await open3d();
const nc=+(props().match(/(\d+) cars/)||[])[1];
ok(nc===10,'50% of 20 stalls is exactly 10 cars ('+nc+')');
close3d();await open3d();ok(+(props().match(/(\d+) cars/)||[])[1]===nc,'the same cars every time');close3d();

// ---- a model for a whole building
t.tool('building');t.placeAt(-100,-180);t.tool('select');
const bn=t.proj().buildings[0].name;
ok(optVals(t.$('#iModel')).join()===',house.glb','building picker lists building-kind models only ('+optVals(t.$('#iModel')).join()+')');
t.set('#iModel','house.glb','change');
ok(t.proj().buildings[0].mod==='house.glb','choosing a model saves it on the building');
await open3d();ok(/1 building model/.test(props()),'the 3D view counts it ('+props()+')');close3d();
t.set('#iModel','','change');ok(t.proj().buildings[0].mod===undefined,'Generated puts the normal building back');
t.set('#iModel','house.glb','change');

// ---- saved with the project and the GeoJSON; the files are not
const p=t.proj();ok(p.buildings[0].mod==='house.glb'&&p.lots[0].pc.f===50,'project file records the model names');
t.click(t.$('#xGeo'));const gj=JSON.parse(t.dl['site-plan.geojson']);
ok(gj.features.find(f=>f.properties.kind==='building').properties.model==='house.glb'&&gj.features.find(f=>f.properties.kind==='parking_aisle_centerline').properties.carModel==='builtin:car','GeoJSON export carries them');
const b=await boot();b.w.THREE={OrbitControls:function(){}};b.mode.dem=()=>270;
await openVia(b,file('s.geojson',gj));
ok(b.proj().buildings[0].mod==='house.glb'&&b.proj().lots[0].pc.m==='builtin:car'&&b.proj().lots[0].pc.f===50,'GeoJSON import brings the model choices back');
b.click(b.$('#view3dBtn'));await sleep(200);
ok(/Not in this browser’s library: house\.glb/.test(b.$('#v3dInfo').textContent)&&!/sedan/.test(b.$('#v3dInfo').textContent),'a browser without the file is told which model is missing (built-ins are always there)');
ok(/\d+ cars/.test(b.$('#v3dProps').textContent),'built-in cars still appear without any file');
ok(t.errors.length===0&&b.errors.length===0,'no page errors ('+t.errors.concat(b.errors).join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');
process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
