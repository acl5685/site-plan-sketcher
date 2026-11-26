const {boot,ok,R,sleep,near}=require('./lib');
const file=(name,obj)=>({name,text:()=>Promise.resolve(JSON.stringify(obj))});
const openVia=async(t,f)=>{const i=t.$('#openProj');Object.defineProperty(i,'files',{value:[f],configurable:true});i.dispatchEvent(new t.w.Event('change',{bubbles:true}));await sleep(80);};
(async()=>{
// site: two rows of four parcels = 400 ft (x -300..100) by 300 ft (y -225..75)
const t=await boot();await t.freshSite(t.row(0,[0,1,2,3]).concat(t.row(1,[0,1,2,3])));
t.tab('build');
const svg=()=>t.$('#sheetView svg');
const texts=()=>Array.from(svg().querySelectorAll('text')).map(e=>e.textContent);
const has=s=>texts().some(x=>x===s);
const dims=()=>Array.from(svg().querySelectorAll('text.sh-dim')).map(e=>e.textContent);
const pdf=()=>{t.click(t.$('#shPdf'));return t.dl['site-plan.pdf'];};
const strs=p=>(p.match(/\((?:\\.|[^\\()])*\) Tj/g)||[]).map(s=>s.slice(1,-4));
// the value on the same row of the title block as a label
const rowOf=label=>{const all=Array.from(svg().querySelectorAll('text')),a=all.find(e=>e.textContent===label);if(!a)return null;
  const y=a.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/)[2];return all.filter(e=>e!==a&&e.getAttribute('transform').indexOf(' '+y+')')>0).map(e=>e.textContent);};

// ---- the plan: a townhome row 88 x 42 ft near the south-west corner, a road, and a store
t.click(t.$('.typebtn[data-type="th"]'));t.set('#tW','88');t.set('#tD','42');t.set('#tSt','3');t.set('#tRot','0');t.placeAt(-200,-150);
t.click(t.$('.typebtn[data-type="com"]'));t.set('#tW','80');t.set('#tD','60');t.set('#tSt','1');t.placeAt(-20,-150);
t.set('#roadW','24');await t.draw('road',[[-290,-40],[90,-40]]);
t.tool('select');t.key('Escape');

// ---- the Export tab opens the sheet
t.tab('export');
ok(!!t.$('#xSheet')&&/PDF/.test(t.$('#xSheet').textContent)&&t.$('#sheet').hidden,'the Export tab has a Site plan sheet (PDF) button, and the sheet is not showing yet');
t.click(t.$('#xSheet'));
ok(!t.$('#sheet').hidden&&!!svg(),'pressing it opens the sheet over the map, with the page drawn');
ok(svg().getAttribute('viewBox')==='0 0 1224 792','it starts on Tabloid paper, 11 x 17 in, landscape ('+svg().getAttribute('viewBox')+')');
// 400 x 300 ft has to fit a frame of about 916 x 734 points with 44 points kept clear all round: 1 in = 40 ft
ok(has('SCALE: 1 in = 40 ft')&&/1 in = 40 ft on Tabloid/.test(t.$('#sheetNote').textContent)&&/100%/.test(t.$('#sheetNote').textContent),'the scale is the largest standard one the site fits at, 1 in = 40 ft, and the note says to print at 100%');

// ---- the title block
ok(has('SITE PLAN')&&has('SITE DATA')&&has('ZONING CHECK')&&has('BUILDING SCHEDULE')&&has('LEGEND')&&has('N'),'the title block has the sheet name, north arrow, site data, zoning check, building schedule and legend');
t.click(t.$('#xCsv'));const csv=t.dl['building-schedule.csv'];
const cv=k=>(csv.match(new RegExp('"'+k+'","([^"]*)"'))||[])[1];
const siteTxt=(+cv('Site area acres')).toFixed(2)+' ac · '+(+cv('Site area sf')).toLocaleString()+' sf';
ok((rowOf('Site area')||[]).join()===siteTxt&&near(+cv('Site area sf'),120000,300),'site area: 400 x 300 ft, about 120,000 sf, the same figure the schedule (CSV) gives ('+rowOf('Site area')+')');
ok((rowOf('Buildings')||[]).join()==='2 · 8,496 sf footprint','buildings: two, 3,696 + 4,800 sf ('+rowOf('Buildings')+')');
ok((rowOf('Building coverage')||[]).join()==='7.1%'&&(rowOf('Gross floor area')||[]).join()==='15,888 sf'&&(rowOf('Floor area ratio')||[]).join()==='0.13','coverage 7.1%, floor area 3 x 3,696 + 4,800 = 15,888 sf, ratio 0.13');
ok((rowOf('Parking spaces')||[])[0]===cv('Parking provided')+' shown · '+cv('Parking required')+' required','parking shown and required are the same figures the schedule (CSV) gives ('+rowOf('Parking spaces')+')');
ok(has('TH-1')&&has('Townhome row')&&has('88 × 42')&&has('3,696')&&has('11,088')&&has('Total')&&has('15,888'),'the building schedule lists each building with its size, floors, footprint and floor area, and a total');
// zoning check: the store's south wall is at y = -180, 45 ft from the south line at -225; the row's east wall is at
// x = -156 and the store's west wall at -60, 96 ft apart
const z=rowOf('Building to property line');
ok(!!z&&z[0]==='10.0′ min'&&z[1]==='45.0′','nearest property line: 45.0 ft shown against the 10 ft required ('+z+')');
const zb=rowOf('Building to building');ok(!!zb&&zb[1]==='96.0′','building to building: 96.0 ft between the row and the store ('+zb+')');
const zr=rowOf('Building to road edge');ok(!!zr&&zr[1]==='68.0′','building to road edge: 68.0 ft from the store to the 24 ft road ('+zr+')');
ok((rowOf('Items flagged on the Check tab')||[]).length===2,'and it says how many items the Check tab flags');

// ---- dimensions
const d0=dims();
ok(d0.filter(x=>x==='400.0′').length===2&&d0.filter(x=>x==='300.0′').length===2,'every side of the site is dimensioned: 400.0 ft twice and 300.0 ft twice ('+d0.filter(x=>/^[34]00/.test(x)).join(', ')+')');
ok(d0.includes('88.0′')&&d0.includes('42.0′')&&d0.includes('80.0′')&&d0.includes('60.0′'),'each building has its width and depth written along its walls');
ok(d0.includes('54.0′')&&d0.includes('45.0′')&&d0.filter(x=>x==='96.0′').length===1,'offsets: 54.0 ft from the row and 45.0 ft from the store to the south line, and the 96.0 ft gap between them once, not from both sides ('+d0.join(' ')+')');
ok(has('ROAD · 24 FT WIDE')||texts().some(x=>/· 24 FT WIDE$/.test(x)),'the road is labelled with its width');
t.click(t.$('#shDims'));
ok(!dims().includes('400.0′')&&!dims().includes('88.0′')&&dims().includes('45.0′')&&has('88 × 42 ft · 3 stories'),'unticking Dimensions takes the side lengths off (the size moves into the building label) and leaves the offsets');
t.click(t.$('#shDims'));
t.set('#shOffs','none','change');ok(!dims().includes('45.0′')&&dims().includes('400.0′'),'Offsets: None takes the offsets off and leaves the dimensions');
const nMin=(t.set('#shOffs','min','change'),dims().length);t.set('#shOffs','all','change');
ok(dims().length>nMin,'Offsets: Every wall shows more of them than Closest of each kind ('+dims().length+' against '+nMin+')');
t.set('#shOffs','min','change');

// ---- a building too close to the line is called out in red
t.click(t.$('#shClose'));ok(t.$('#sheet').hidden,'Back to plan closes the sheet');
t.tab('build');t.click(t.$('.typebtn[data-type="sf"]'));t.set('#tW','40');t.set('#tD','30');t.set('#tSt','2');t.placeAt(-275,20);   // 5 ft off the west line
t.tool('select');t.key('Escape');t.tab('export');t.click(t.$('#xSheet'));
const bad=Array.from(svg().querySelectorAll('text.sh-dim')).filter(e=>/min 10\.0/.test(e.textContent));
ok(bad.length===1&&bad[0].textContent==='5.0′ (min 10.0′)'&&bad[0].getAttribute('fill')==='#c92a2a','a house 5 ft from the line is dimensioned in red, with the minimum beside it ('+bad.map(e=>e.textContent)+')');
ok(rowOf('Building to property line')[1]==='5.0′'&&has('Under the required distance'),'the zoning check shows 5.0 ft, and the legend explains the red');

// ---- title, paper, scale and black and white
t.set('#shTitle','Maple Court');t.set('#shSub','100 Main Street, Brecksville');t.set('#shBy','A. Planner');t.set('#shNum','C-2');
ok(has('Maple Court')&&has('100 Main Street, Brecksville')&&has('A. Planner')&&has('C-2'),'the title, address, author and sheet number typed in are on the sheet');
t.set('#shPaper','letter','change');
ok(svg().getAttribute('viewBox')==='0 0 792 612'&&has('SCALE: 1 in = 80 ft'),'on Letter paper the page is 8.5 x 11 in and the scale drops to 1 in = 80 ft');
t.set('#shPaper','archd','change');
ok(svg().getAttribute('viewBox')==='0 0 2592 1728'&&has('SCALE: 1 in = 20 ft'),'on Arch D, 24 x 36 in, it is drawn at 1 in = 20 ft');
t.set('#shScale','50','change');ok(has('SCALE: 1 in = 50 ft'),'a scale can be chosen instead of the best fit');
t.set('#shScale','auto','change');t.set('#shPaper','tabloid','change');
const fills=()=>Array.from(svg().querySelectorAll('path')).map(e=>e.getAttribute('fill')).filter(f=>f&&f!=='none');
const grey=f=>f.slice(1,3)===f.slice(3,5)&&f.slice(3,5)===f.slice(5,7);
ok(fills().some(f=>!grey(f)),'in colour, buildings are tinted by type');
t.click(t.$('#shBw'));ok(fills().every(grey)&&bad.length===1,'Black and white leaves nothing but black, white and greys');
t.click(t.$('#shBw'));

// ---- the PDF
const p=pdf();
ok(/^%PDF-1\.4\n/.test(p)&&/%%EOF\n$/.test(p),'Download PDF saves site-plan.pdf, a PDF file');
ok(/\/MediaBox \[0 0 1224 792\]/.test(p)&&/\/BaseFont \/Helvetica /.test(p)&&/\/BaseFont \/Helvetica-Bold /.test(p),'one Tabloid page, in the built-in Helvetica fonts');
ok(!/[^\x0a\x20-\x7e]/.test(p),'it is plain ASCII throughout, so byte positions can be counted as characters');
{const xr=+p.match(/startxref\n(\d+)\n%%EOF/)[1],tab=p.slice(xr).split('\n'),n=+tab[1].split(' ')[1];let good=tab[0]==='xref'&&n===8;
 for(let i=1;i<n;i++){const off=+tab[2+i].slice(0,10);if(p.substr(off,(i+' 0 obj').length)!==i+' 0 obj'||tab[2+i].length!==19)good=false;}
 ok(good,'its cross-reference table points at every one of its '+(n-1)+' objects');
 const len=+p.match(/\/Length (\d+) >>\nstream\n/)[1],s0=p.indexOf('stream\n')+7;
 ok(p.substr(s0+len,9)==='endstream','and the page content is exactly as long as it says ('+len+' bytes)');}
const ps=strs(p);
ok(ps.includes('Maple Court')&&ps.includes('SITE DATA')&&ps.includes('SCALE: 1 in = 40 ft')&&ps.includes(siteTxt.split('·').join('\\267')),'the PDF carries the same title, scale and site figures as the page on screen');
ok(ps.includes("400.0'")&&ps.includes("5.0' \\(min 10.0'\\)")&&ps.includes('88 \\327 42'),'and the same dimensions, with the special characters (×, ·, the foot mark) encoded for the PDF');
ok(ps.length===texts().length,'every piece of text on screen is in the PDF, no more and no fewer ('+ps.length+')');
ok(/\/Title \(Maple Court\)/.test(p)&&/q [\d.]+ [\d.]+ [\d.]+ [\d.]+ re W n/.test(p)&&/ B\*\n/.test(p),'it is titled, and the drawing is clipped to its frame');
t.set('#shPaper','letter','change');ok(/\/MediaBox \[0 0 792 612\]/.test(pdf()),'the PDF follows the paper size chosen');
t.set('#shPaper','tabloid','change');

// ---- saved with the project
const proj=t.proj();
ok(proj.sheet&&proj.sheet.title==='Maple Court'&&proj.sheet.num==='C-2'&&proj.sheet.paper==='tabloid','the sheet settings are saved in the project file');
t.key('Escape');ok(t.$('#sheet').hidden,'Escape closes the sheet');
const nb=proj.buildings.length;
t.click(t.$('#xSheet'));t.key('Delete');t.key('z',{ctrlKey:true});
ok(t.proj().buildings.length===nb,'while the sheet is up, Delete and Ctrl+Z do not reach the plan underneath');
t.set('#shTitle','Something else');t.click(t.$('#shClose'));
t.w.confirm=()=>true;await openVia(t,file('p.json',proj));
t.click(t.$('#xSheet'));ok(t.$('#shTitle').value==='Maple Court'&&has('Maple Court')&&has('C-2'),'opening the project brings the title and sheet number back');
t.click(t.$('#shClose'));

// ---- lots, and an empty plan
t.tab('site');await t.draw('split',[[-100,-240],[-100,90]]);t.tool('select');t.key('Escape');
t.click(t.$('#xSheet'));
ok(texts().some(x=>/^LOT 1 · [\d,]+ sf$/.test(x))&&texts().some(x=>/^LOT 2 · /.test(x))&&has('Lot line')&&(rowOf('Lots')||[]).join()==='2','with the site split in two, each lot is named with its area, and the lot line is in the legend');
ok(dims().filter(x=>x==='300.0′').length>=3&&dims().includes('200.0′'),'each lot has its own sides dimensioned: the 300 ft lot line once, and 200 ft frontages ('+dims().filter(x=>/00\.0′$/.test(x)).join(', ')+')');
t.click(t.$('#shClose'));
t.click(t.$('#newBtn'));t.click(t.$('#xSheet'));
ok(has('Nothing to draw yet')&&/nothing to put on the sheet/i.test(t.$('#sheetNote').textContent)&&/^%PDF/.test(pdf()),'an empty plan says there is nothing to draw yet, and still makes a valid page');
ok(t.errors.length===0,'no page errors ('+t.errors.join('; ')+')');
console.log('\n'+R.pass+' passed, '+R.fails.length+' failed');R.fails.forEach(f=>console.log(' - '+f));process.exit(R.fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
