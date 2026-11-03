const fs=require('fs');const {JSDOM}=require('jsdom');
let html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
html=html.replace(/<script src="[^"]*"><\/script>/g,'').replace(/<link[^>]*>/g,'');
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/'});
const w=dom.window;const errors=[];w.addEventListener('error',e=>errors.push(e.message));
Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 800}});
Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 600}});
w.eval(fs.readFileSync('node_modules/leaflet/dist/leaflet-src.js','utf8'));
w.eval(fs.readFileSync('node_modules/@turf/turf/turf.min.js','utf8'));
w.eval(fs.readFileSync('node_modules/proj4/dist/proj4.js','utf8'));
let M;const origMap=w.L.map;w.L.map=function(){M=origMap.apply(this,arguments);return M;};
w.eval(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
const $=s=>w.document.querySelector(s);const $$=s=>Array.from(w.document.querySelectorAll(s));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const sum=()=>$('#summary').textContent.replace(/\s+/g,' ');
const c=M.getCenter();
// ft -> latlng helper using map center (demo origin == center)
const ft=(x,y)=>{const kx=364.4*Math.cos(c.lat*Math.PI/180)*0+ (111412.84*Math.cos(c.lat*Math.PI/180)-93.5*Math.cos(3*c.lat*Math.PI/180))/0.3048, ky=364400;return w.L.latLng(c.lat+y/ky,c.lng+x/kx)};
// 1. clear project then add a clean single-family building near the west boundary of the sample site (site west edge x=-300)
click($('#clearPicks'));
console.log('after clear picks:',$('#parcelSummary').textContent);
// pick parcels tool, click two adjacent parcels via layer events
click($$('.tool')[1]);
let layers=[];M.eachLayer(l=>{if(l.eachLayer&&l.getLayers)l.eachLayer(g=>{if(g.feature&&g.feature.properties)layers.push(g)})});
function findParcels(){const out=[];M.eachLayer(l=>{ if(l.feature&&l.feature.properties&&l.feature.properties.PARCEL_ID)out.push(l)});return out}
let ps=findParcels();console.log('parcel layers',ps.length);
ps.filter(l=>['SAMPLE-1-1','SAMPLE-1-2','SAMPLE-2-1','SAMPLE-2-2'].includes(l.feature.properties.PARCEL_ID)).forEach(l=>l.fire('click',{latlng:c}));
console.log('picked:',$('#parcelSummary').textContent,'|',sum().slice(0,60));
// carve parcel SAMPLE-2-2
click($$('.tool')[2]);
findParcels().filter(l=>l.feature.properties.PARCEL_ID==='SAMPLE-2-2').forEach(l=>l.fire('click',{latlng:c}));
console.log('after carve:',sum().slice(0,60));
// road: click 3 points then Enter
click($$('.tool')[4]);
[[-290,-30],[-200,-30],[-120,-30]].forEach(p=>M.fire('click',{latlng:ft(...p)}));
M.fire('dblclick',{latlng:ft(-120,-30)});
console.log('roads in geojson later');
// building near west boundary: x=-300 edge; place with snapping
click($$('.tool')[5]);
$('#tW').value=40;$('#tD').value=60;$('#tW').dispatchEvent(new w.Event('input'));$('#tD').dispatchEvent(new w.Event('input'));
M.fire('mousemove',{latlng:ft(-268,-150)});
M.fire('click',{latlng:ft(-268,-150)});
console.log('check text:',$('#checks').textContent.replace(/\s+/g,' ').slice(0,300));
console.log('offsets table:',$('#iOffs').textContent.replace(/\s+/g,' '));
console.log('rotation field:',$('#iRot').value,'name:',$('#iName').value);
// key rotate: Q
$('#iRot').blur();
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'e',bubbles:true}));
console.log('rot after E:',$('#iRot').value);
// undo restores
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}));
console.log('rot after undo:',$('#iRot').value);
console.log('errors:',errors);
setTimeout(()=>process.exit(0),100);
