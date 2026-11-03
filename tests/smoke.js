const fs=require('fs');
const {JSDOM}=require('jsdom');
let html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
html=html.replace(/<script src="[^"]*"><\/script>/g,'').replace(/<link[^>]*>/g,'');
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/'});
const w=dom.window;
const errors=[];w.addEventListener('error',e=>errors.push(e.message));
Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 800}});
Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 600}});
w.fetch=async()=>{throw new Error('no network in test')};
w.eval(fs.readFileSync('node_modules/leaflet/dist/leaflet-src.js','utf8'));
w.eval(fs.readFileSync('node_modules/@turf/turf/turf.min.js','utf8'));
w.eval(fs.readFileSync('node_modules/proj4/dist/proj4.js','utf8'));
w.L.esri=undefined;
const app=html.match(/<script>([\s\S]*?)<\/script>/)[1];
try{w.eval(app);}catch(e){console.log('INIT ERROR',e.stack);process.exit(1);}
const $=s=>w.document.querySelector(s);
console.log('errors after init:',errors);
console.log('SUMMARY:',$('#summary').textContent.replace(/\s+/g,' '));
console.log('PARCELS:',$('#parcelSummary').textContent);
console.log('CHECKS:',$('#checks').textContent.replace(/\s+/g,' ').slice(0,400));
console.log('SCHED:',$('#sched').textContent.replace(/\s+/g,' ').slice(0,300));
// export tests
let dl={};w.URL.createObjectURL=b=>{return 'blob:x'};
const origBlob=w.Blob;w.Blob=function(parts,o){dl.last=parts.join('');return new origBlob(parts,o)};
const click=id=>$(id).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
w.HTMLAnchorElement.prototype.click=function(){dl[this.download]=dl.last};
click('#xGeo');const gj=JSON.parse(dl['site-plan.geojson']);
const kinds={};gj.features.forEach(f=>kinds[f.properties.kind]=(kinds[f.properties.kind]||0)+1);console.log('GEOJSON kinds',kinds);
click('#xCsv');console.log('CSV head:',dl['building-schedule.csv'].split('\r\n').slice(0,3).join(' | '));
click('#xDxf');const dxf=dl['site-plan.dxf'];console.log('DXF bytes',dxf.length,'POLYLINE count',(dxf.match(/POLYLINE/g)||[]).length,'sample coord',dxf.split('\n').slice(dxf.indexOf('VERTEX')>0?0:0).find((l,i,a)=>a[i-1]==='10'&&+l>1e5));
click('#xProj');const proj=JSON.parse(dl['site-plan-project.json']);console.log('PROJECT keys',Object.keys(proj).join(','),'parcels kept',proj.parcels.features.length);
// switch tools & interactions
$$=s=>Array.from(w.document.querySelectorAll(s));
$$('.tool').forEach(b=>{b.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));});
console.log('tool after loop:',$('#map').className);
// undo, new
click('#undoBtn');
click('#newBtn');
console.log('after New:',$('#summary').textContent.replace(/\s+/g,' ').slice(0,160));
console.log('final errors:',errors);
