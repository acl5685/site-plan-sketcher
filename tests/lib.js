const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const HTML=()=>fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').replace(/<script src="[^"]*"><\/script>/g,'').replace(/<link[^>]*>/g,'');
const LIBS=['node_modules/leaflet/dist/leaflet-src.js','node_modules/@turf/turf/turf.min.js','node_modules/proj4/dist/proj4.js'].map(f=>fs.readFileSync(f,'utf8'));
const R={pass:0,fails:[]};
function ok(c,m){if(c)R.pass++;else{R.fails.push(m);console.log('  FAIL',m);}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const near=(a,b,e)=>Math.abs(a-b)<=e;
const KX=(lat)=>(111412.84*Math.cos(lat*Math.PI/180)-93.5*Math.cos(3*lat*Math.PI/180))/0.3048;
const KY=(lat)=>(111132.92-559.82*Math.cos(2*lat*Math.PI/180)+1.175*Math.cos(4*lat*Math.PI/180))/0.3048;

async function boot(o){
  o=o||{};
  const html=HTML();
  // jsdom has no canvas; silence its "getContext not implemented" notices (page errors are still collected below)
  const vc=new VirtualConsole();
  if(vc.forwardTo)vc.forwardTo(console,{jsdomErrors:'none'});else vc.sendTo(console,{omitJSDOMErrors:true});
  vc.on('jsdomError',e=>{if(!/Not implemented/.test(e.message))console.error(e.message);});
  const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/',virtualConsole:vc});
  const w=dom.window,t={w,errors:[],fetchLog:[],mode:{},dl:{},mockCount:0};
  w.addEventListener('error',e=>t.errors.push(e.message));
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 800}});
  Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 600}});
  if(o.storage)w.localStorage.setItem('sitePlanSketcher.v1',o.storage);
  if(o.layouts)w.localStorage.setItem('sitePlanSketcher.layouts.v1',o.layouts);
  LIBS.forEach(s=>w.eval(s));
  const mk=kind=>opts=>{const g=w.L.layerGroup();g.kind=kind;g.opts=opts;g.setOpacity=v=>{g._op=v};return g;};
  w.L.esri={dynamicMapLayer:mk('dynamic'),tiledMapLayer:mk('tiled'),featureLayer:mk('feature')};
  let M;const om=w.L.map;w.L.map=function(){M=om.apply(this,arguments);return M;};
  // downloads
  w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
  const OB=w.Blob;w.Blob=function(p,op){t.lastBlob=p.join('');return new OB(p,op);};
  w.HTMLAnchorElement.prototype.click=function(){t.dl[this.download]=t.lastBlob;};
  w.fetch=async url=>mockFetch(t,String(url));
  w.eval(HTML().match(/<script>([\s\S]*?)<\/script>/)[1]);
  t.M=M;t.$=s=>w.document.querySelector(s);t.$$=s=>Array.from(w.document.querySelectorAll(s));
  t.c=M.getCenter();t.kx=KX(t.c.lat);t.ky=KY(t.c.lat);
  t.ft=(x,y)=>w.L.latLng(t.c.lat+y/t.ky,t.c.lng+x/t.kx);
  t.ftLL=(x,y)=>[t.c.lng+x/t.kx,t.c.lat+y/t.ky];
  t.toFt=ll=>[(ll[0]-t.c.lng)*t.kx,(ll[1]-t.c.lat)*t.ky];
  t.click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  t.key=(k,opt)=>w.document.dispatchEvent(new w.KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},opt||{})));
  t.keyup=k=>w.document.dispatchEvent(new w.KeyboardEvent('keyup',{key:k,bubbles:true}));
  t.set=(sel,v,ev)=>{const e=t.$(sel);e.value=v;e.dispatchEvent(new w.Event(ev||'input',{bubbles:true}));};
  t.tool=n=>t.click(t.$('[data-tool="'+n+'"]'));
  t.tab=n=>t.click(t.$('.tabs [data-tab="'+n+'"]'));
  t.stat=label=>{const el=t.$$('#summary .stat').find(s=>s.querySelector('.k').textContent===label);return el?{v:el.querySelector('.v').textContent,s:el.querySelector('.s').textContent}:null;};
  t.num=s=>parseFloat(String(s).replace(/,/g,''));
  t.proj=()=>{t.click(t.$('#xProj'));return JSON.parse(t.dl['site-plan-project.json']);};
  t.layers=pane=>Object.values(M._layers).filter(l=>l.options&&l.options.pane===pane);
  t.parcelLayer=id=>Object.values(M._layers).find(l=>l.feature&&l.feature.properties&&l.feature.properties.PARCEL_ID===id);
  t.pick=ids=>{t.tool('parcels');ids.forEach(id=>{const l=t.parcelLayer(id);if(l)l.fire('click',{latlng:t.c});});t.tool('select');};
  t.carve=ids=>{t.tool('carve');ids.forEach(id=>t.parcelLayer(id).fire('click',{latlng:t.c}));t.tool('select');};
  t.cursorAt=(x,y)=>{t.M.fire('mousemove',{latlng:t.ft(x,y)});};
  t.placeAt=(x,y,snap)=>{ if(!snap)t.key('Shift');t.cursorAt(x,y);t.M.fire('click',{latlng:t.ft(x,y)});if(!snap)t.keyup('Shift');};
  t.draw=async(tool,pts,mode,finish)=>{
    const vs=t.$('#oVsnap');const was=vs.checked;if(was&&!t.keepSnap)vs.click();
    t.tool(tool);if(mode){t.set('#angMode',mode,'change');}
    pts.forEach(p=>{t.cursorAt(p[0],p[1]);t.M.fire('click',{latlng:t.ft(p[0],p[1])});});
    if(finish!==false)t.key('Enter');
    await sleep(20);
    if(was&&!t.$('#oVsnap').checked)t.$('#oVsnap').click();
  };
  t.rectPts=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  t.freshSite=async(ids)=>{
    t.click(t.$('#newBtn'));
    t.$('#svcUrl').value='https://svc.test/arcgis/rest/services/P/MapServer';
    t.click(t.$('#loadBtn'));await sleep(40);
    if(ids)t.pick(ids);
  };
  t.row=(r,cs)=>cs.map(c=>'R-'+r+'-'+c);
  t.mockParcels=()=>{
    const feats=[];
    for(let r=0;r<3;r++)for(let c=0;c<6;c++){
      const x0=-300+c*100,y0=-225+r*150;
      feats.push({type:'Feature',properties:{OBJECTID:r*6+c+1,PARCEL_ID:'R-'+r+'-'+c,OWNER:'Owner '+(r*6+c)},
        geometry:{type:'Polygon',coordinates:[[t.ftLL(x0,y0),t.ftLL(x0+100,y0),t.ftLL(x0+100,y0+150),t.ftLL(x0,y0+150),t.ftLL(x0,y0)]]}});
    }
    return {type:'FeatureCollection',features:feats};
  };
  return t;
}
function mockFetch(t,url){
  t.fetchLog.push(url);const m=t.mode;
  if(m.fail)throw new Error(m.fail);
  const ok_=obj=>({ok:true,status:200,json:async()=>obj});
  if(/nominatim/.test(url))return ok_(m.geo||[{lat:'41.4',lon:'-81.7',display_name:'Test Place, OH'}]);
  // USGS 3DEP elevation: raw float32 metres, north row first, then a 1-bit mask; m.dem(lng,lat) gives the ground
  if(/ImageServer\/exportImage/.test(url)){
    if(m.demFail)return {ok:false,status:503,arrayBuffer:async()=>new ArrayBuffer(0)};
    const sz=url.match(/size=(\d+),(\d+)/),bb=decodeURIComponent(url.match(/bbox=([^&]+)/)[1]).split(',').map(Number);
    const nx=+sz[1],ny=+sz[2],a=new Float32Array(nx*ny+Math.ceil(nx*ny/32));
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const lng=bb[0]+(i+0.5)/nx*(bb[2]-bb[0]),lat=bb[3]-(j+0.5)/ny*(bb[3]-bb[1]);a[j*nx+i]=m.dem?m.dem(lng,lat):270;}
    t.demReq=(t.demReq||0)+1;return {ok:true,status:200,arrayBuffer:async()=>a.buffer};
  }
  if(/ImageServer\/getSamples/.test(url))return ok_({samples:[{value:'270',rasterId:7,resolution:1}]});
  if(/ImageServer\/query/.test(url))return ok_({features:[{attributes:{Name:'TEST_LIDAR_2019'}}]});
  if(/\?f=json$/.test(url))return ok_({layers:[{id:0,name:'Parcels'},{id:1,name:'Annotation'}]});
  if(/\/query\?/.test(url)){
    if(m.http)return {ok:false,status:m.http,json:async()=>({})};
    if(m.queryError)return ok_({error:{message:m.queryError}});
    if(m.features)return ok_(m.features);
    return ok_(t.mockParcels());
  }
  throw new Error('unmocked '+url);
}
module.exports={boot,ok,R,sleep,near,KX,KY};
