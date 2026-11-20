import {printInk} from '../real-surfaces/print-ink.mjs';
import * as THREE from 'three';
import {RoundedBoxGeometry} from '../../node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

const templates = new Map();
const surfaces = new Map();
const tau = Math.PI * 2;
const teal = '#3d9e99', mint = '#a4c87a', coral = '#df785e', gold = '#ebae4b';
const blue = '#507dc0', plum = '#a572bc', cream = '#fff0ce', graphite = '#394d58', rose = '#db7895';
function surface(color, finish = 'lacquer') {
  const key = color + finish;
  if (!surfaces.has(key)) {
    const polymer = {roughness: .27, clearcoat: .76, clearcoatRoughness: .15};
    const attributes = {
      lacquer: polymer,
      satin: {roughness: .52, clearcoat: .24},
      ribbon: {roughness: .48, sheen: .75, sheenColor: new THREE.Color(color), sheenRoughness: .42},
      glass: {roughness: .16, clearcoat: .94, clearcoatRoughness: .08},
      metal: {metalness: .72, roughness: .39},
      lit: {...polymer, emissive: color, emissiveIntensity: .18},
    };
    surfaces.set(key, new THREE.MeshPhysicalMaterial({color, ...attributes[finish]}));
  }
  return surfaces.get(key);
}
function mesh(g, geom, color, x, y, z, finish) {
  const item = new THREE.Mesh(geom, surface(color, finish));
  g.add(item);
  item.position.set(x, y, z);
  return item;
}
function box(g, color, x, y, z, w, h, d, r, finish) {
  return mesh(g, new RoundedBoxGeometry(w, h, d, 3, r), color, x, y, z, finish);
}
function sph(g, color, x, y, z, sx, sy, sz, finish) {
  const piece = mesh(g, new THREE.SphereGeometry(1, 24, 16), color, x, y, z, finish);
  piece.scale.set(sx, sy, sz);
  return piece;
}
function cyl(g, color, x, y, z, top, bottom, length, finish, degrees = 0) {
  const item = mesh(g, new THREE.CylinderGeometry(top, bottom, length, 32), color, x, y, z, finish);
  item.rotation.z = degrees;
  return item;
}
function tubing(g, color, coordinates, radius, finish) {
  const route = new THREE.CatmullRomCurve3(coordinates.map(point => new THREE.Vector3(...point)));
  return mesh(g, new THREE.TubeGeometry(route, 28, radius, 10), color, 0, 0, 0, finish);
}
function tilt(item, angle = .32) {
  item.rotation.set(angle, -.25, -.12);
  return item;
}

function bowlingBall(color = '#397dbc') {
  const g = new THREE.Group(), r = .439;
  const body = new THREE.SphereGeometry(r, 64, 48), p = body.attributes.position;
  const holes = [[-.112, -.011], [.101, -.043], [.023, .166]];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y <= 0) continue;
    for (const [hx, hz] of holes) {
      const distance = Math.hypot(x - hx, z - hz);
      p.setY(i, p.getY(i) - .115 * Math.max(0, 1 - distance / .083) ** .50);
    }
  }
  body.computeVertexNormals();
  mesh(g, body, color, 0, 0, 0, 'glass');
  const shadow = color === '#397dbc' ? '#2c526b' : new THREE.Color(color).multiplyScalar(.42).getStyle();
  for (const [x, z] of holes) sph(g, shadow, x, Math.sqrt(r * r - x * x - z * z) - .073, z, .043, .014, .043, 'satin');
  return tilt(g);
}
function bowlingPin(color = '#e77d9c') {
  const g = new THREE.Group();
  const profile = [
    [0,-.469],[.124,-.463],[.157,-.368],[.172,-.260],[.157,-.154],
    [.113,-.065],[.081,.040],[.069,.151],[.078,.241],[.096,.335],
    [.073,.411],[0,.452],
  ];
  mesh(g, new THREE.LatheGeometry(profile.map(([x,y]) => new THREE.Vector2(x,y)), 40), color, 0, 0, 0);
  for (const [y, r] of [[.081,.080],[.137,.077]]) cyl(g, cream, 0, y, 0, r, r, .036, 'satin');
  g.rotation.set(1.34, -.09, -.31);
  return g;
}
function gift(color, band) {
  const g = new THREE.Group();
  box(g, color, 0, -.044, 0, .668, .397, .596, .047, 'satin');
  box(g, color, 0, .183, 0, .716, .130, .639, .047);
  box(g, band, 0, .251, 0, .110, .018, .637, .008, 'ribbon');
  box(g, band, 0, .251, 0, .716, .018, .107, .008, 'ribbon');
  for (const x of [-1, 1]) {
    box(g, band, x * .333, -.030, 0, .018, .434, .107, .008, 'ribbon');
    box(g, band, 0, -.030, x * .298, .11, .434, .018, .008, 'ribbon');
    tubing(g, band, [[0,.279,0],[x*.11,.360,-.016],[x*.205,.365,-.027],[x*.223,.298,-.019],[x*.11,.280,-.019],[0,.279,0]],.033,'ribbon');
    tubing(g, band, [[0,.28,0],[x*.080,.267,.076],[x*.143,.269,.134],[x*.164,.270,.150]],.025,'ribbon');
  }
  sph(g, band, 0, .285, 0, .055, .044, .050, 'ribbon');
  return tilt(g,.51);
}
function controls(g, x, z, y, step = 1) {
  box(g, graphite, x, y, z, .141 * step, .040, .052 * step, .013, 'satin');
  box(g, graphite, x, y, z, .052 * step, .045, .141 * step, .013, 'satin');
  for (const [j,[dx,dz]] of [[0,[-.056,0]],[1,[0,-.057]],[2,[.056,0]],[3,[0,.057]]]) {
    cyl(g,[coral, gold, mint, blue][j],-x+dx*step,y-.005,z+dz*step,.024*step,.026*step,.032);
  }
}
function gamepad() {
  const g = new THREE.Group();
  box(g, '#c1c5ee', 0, 0, -.046, .702, .185, .43, .080);
  for (const x of [-1, 1]) {
    const grip = box(g, '#c1c5ee', x * .252, -.042, .104, .239, .205, .463, .100);
    grip.rotation.y = x * -.26;
    cyl(g, graphite, x * .112, .099, .047, .046, .039, .059, 'satin');
  }
  controls(g, -.234, -.068, .110);
  return tilt(g, .18);
}
function handheld() {
  const g = new THREE.Group();
  box(g, teal, 0, 0, 0, .522, .161, .822, .070);
  box(g, graphite, 0, .086, -.141, .418, .036, .423, .064, 'satin');
  box(g, '#648c8f', 0, .106, -.151, .315, .014, .302, .044, 'glass');
  for(const [x,z,w,d] of [[-.040,-.154,.095,.032],[-.073,-.189,.032,.062],[.067,-.105,.042,.042]]) {
    box(g, '#a9be85', x,.115,z,w,.004,d,.002,'lit');
  }
  controls(g, -.128, .177, .096, .86);
  for (let i = 0; i < 4; i++) box(g, graphite,.055+i*.033,.083,.319,.012,.015,.071,.004,'satin');
  return tilt(g, .22);
}
function toyTruck() {
  const g = new THREE.Group();
  box(g, coral, 0, -.088, 0, .787, .114, .41, .040);
  box(g, gold, -.21, .055, 0, .338, .295, .42, .063);
  box(g, '#629dad', -.266, .114, 0, .152, .141, .426, .025, 'glass');
  box(g, teal, .195, .044, 0, .403, .164, .404, .046);
  for (const side of [-1, 1]) {
    box(g, teal, .194, .121, side * .190, .399, .185, .056, .027);
    for (const x of [-.238,.252]) {
      const wheel = cyl(g, graphite, x, -.105, side * .220, .113, .113, .080, 'satin');
      const hub = cyl(g, cream, x, -.105, side * .263, .058, .058, .019);
      wheel.rotation.x = hub.rotation.x = Math.PI / 2;
    }
  }
  box(g, mint,.388,.111,0,.04,.17,.354,.018);
  return tilt(g, .52);
}
function robot() {
  const g = new THREE.Group();
  box(g, teal, 0, -.024, .072, .440, .246, .360, .064);
  box(g, cream, 0, .021, -.260, .390, .232, .273, .065);
  box(g, graphite, 0, .145, -.242, .268, .028, .133, .028, 'glass');
  for (const side of [-1, 1]) {
    cyl(g, gold, side * .059, .166, -.242, .024, .026, .019, 'lit');
    const arm = box(g, coral, side * .274, -.026, .057, .126, .176, .338, .046);
    arm.rotation.y = side * -.24;
    box(g, gold, side * .122, -.040, .345, .170, .183, .210, .044);
  }
  for(const x of [-.078,0,.078]) cyl(g, cream,x,.112,.101,.022,.025,.030);
  tubing(g, graphite, [[0,.009,-.365],[0,.026,-.430],[.024,.057,-.485]],.022,'metal');
  sph(g, coral,.025,.061,-.479,.040,.040,.040);
  return tilt(g, .22);
}
function rubik() {
  const g = new THREE.Group(), pitch = .212, outside = .327;
  box(g, graphite, 0, 0, 0, .643, .641, .641, .061, 'satin');
  for (const face of [
    [gold,0,1,0],[cream,0,-1,0],[coral,0,0,1],[mint,0,0,-1],[teal,1,0,0],[blue,-1,0,0],
  ]) {
    const [color,x,y,z] = face;
    for (let row = -1; row <= 1; row++) for (let col = -1; col <= 1; col++) {
      box(g, color, x * outside + (x ? 0 : col*pitch), y*outside + (y ? 0 : row*pitch),
        z*outside + (z ? 0 : (y ? row : col)*pitch), x ? .027 : .185, y ? .027 : .185, z ? .027 : .185, .013);
    }
  }
  return tilt(g,.43);
}
function television() {
  const g = new THREE.Group();
  box(g, '#e2945e', 0, 0, .015, .764, .259, .557, .093);
  box(g, cream, -.099, .143, .020, .494, .058, .359, .061);
  box(g, '#4b7280', -.101, .173, .019, .403, .038, .278, .055, 'glass');
  for (const z of [-.068,.087]) cyl(g, '#a55c42', .243, .141, z, .051,.051,.037);
  for (const x of [-.257,.269]) box(g, '#926e54', x,-.146,.130,.104,.080,.197,.026,'satin');
  for(const x of [-1,1]) tubing(g, graphite, [[.03,.026,-.222],[.044+x*.09,.065,-.321],[.052+x*.176,.101,-.405]],.013,'metal');
  return tilt(g, .28);
}
function camera(color = '#507a61', rainbow = false) {
  const g = new THREE.Group();
  box(g, color, 0, 0, .027, .745, .226, .496, .073, 'satin');
  box(g, '#9faaad', 0, .004, -.171, .760, .239, .153, .053, 'metal');
  for (const [r,y,color,finish] of [[.202,.111,graphite,'satin'],[.178,.170,'#a8ada8','metal'],[.153,.211,graphite,'satin'],[.119,.242,'#5692a5','glass']]) {
    cyl(g,color,-.046,y,.043,r,r,.050,finish);
  }
  sph(g, '#3f6477',-.046,.252,.043,.106,.030,.106,'glass');
  box(g, cream,.249,.131,-.103,.128,.033,.101,.012,'lit');
  if(rainbow){
    const tones=['#df8472','#e4bc75','#8caa76','#769fb4','#a286b5'];
    tones.forEach((tone,i)=>box(g,tone,.223,.118,.052+.043*i,.155,.022,.041,.007));
  }
  cyl(g, graphite,.250,.019,-.235,.050,.050,.054,'satin',Math.PI / 2).rotation.x = Math.PI/2;
  return tilt(g,.24);
}
function drum() {
  const g = new THREE.Group();
  cyl(g, coral, 0, 0, 0, .355, .319, .344);
  cyl(g, cream, 0, .180, 0, .371, .371, .045, 'satin');
  cyl(g, gold, 0, -.159, 0, .344, .344, .074, 'metal');
  for (let i=0;i<8;i++) {
    const angle=i*tau/8, next=angle+.16;
    tubing(g, cream, [[.351*Math.sin(angle),.145,.351*Math.cos(angle)],[.343*Math.sin(next),.002,.343*Math.cos(next)],[.322*Math.sin(angle),-.147,.322*Math.cos(angle)]],.014,'ribbon');
  }
  for (const index of [-1,1]) {
    const stick = box(g,'#c09360',index*.10,.238,.026,.047,.040,.67,.018,'satin');
    stick.rotation.y=index*.27;
    sph(g,gold,index*.02,.241,-.293,.032,.029,.036);
  }
  return tilt(g,.36);
}
function clarinet() {
  const g = new THREE.Group();
  cyl(g,'#43476b',0,-.042,0,.067,.082,.704,'glass');
  const flare = [[.080,-.325],[.090,-.382],[.129,-.432],[.157,-.449],[.126,-.450],[.076,-.405],[.070,-.330]];
  mesh(g,new THREE.LatheGeometry(flare.map(p=>new THREE.Vector2(...p)),36),'#43476b',0,0,0,'glass');
  box(g, graphite, 0, .371, 0, .103, .193, .106, .035, 'satin');
  for (const y of [-.225,-.121,.01,.128,.229]) {
    const pad = cyl(g,'#d6ccbb',.053,y,.037,.031,.031,.045,'metal',Math.PI/2);
    pad.rotation.x=.26;
  }
  for (const y of [-.292,.280]) cyl(g,'#d6ccbb',0,y,0,.072,.072,.026,'metal');
  g.rotation.set(1.35,0,-.42);
  return g;
}
function maraca() {
  const g = new THREE.Group();
  const bulb = sph(g, coral,0,.160,0,.236,.264,.19);
  const p = bulb.geometry.attributes.position, colors=[];
  const pink=new THREE.Color('#e47970'),yellow=new THREE.Color('#f4ce77'),green=new THREE.Color('#79b89f');
  for (let i=0;i<p.count;i++){
    const angle=Math.atan2(p.getX(i),p.getZ(i));
    const y=p.getY(i)+.06*Math.sin(angle*6);
    colors.push(...(Math.abs(y-.16)<.102?yellow:y<-.26?green:pink).toArray());
  }
  bulb.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  bulb.material=new THREE.MeshPhysicalMaterial({color:'#ffffff',vertexColors:true,roughness:.38,clearcoat:.51});
  cyl(g,'#b88350',0,-.226,0,.057,.084,.44,'satin');
  sph(g,gold,0,-.438,0,.09,.05,.084);
  g.rotation.set(1.36,0,-.40);
  return g;
}
function harp(color = '#c78a51') {
  const g = new THREE.Group();
  const curve=[[-.363,.037,.267],[-.339,.05,-.313],[-.251,.035,-.400],[-.046,.027,-.332],[.140,.038,-.197],[.349,.047,.004],[.242,.05,.238],[-.363,.037,.267]];
  tubing(g,color,curve,.057);
  for (const [x,front,back] of [[-.24,.217,-.361],[-.13,.214,-.348],[-.022,.211,-.295],[.079,.199,-.237],[.179,.193,-.162],[.265,.118,-.074]]) {
    box(g,'#f0d59b',x,.028,(front+back)/2,.020,.025,front-back,.007,'metal');
  }
  box(g,'#b87849',-.077,.027,.261,.676,.129,.139,.056);
  return tilt(g,.25);
}
function trumpet(brass = '#d99935') {
  const g = new THREE.Group();
  const profile=[[.049,-.178],[.056,-.115],[.062,.009],[.078,.125],[.120,.208],[.190,.281],[.199,.297],[.168,.296],[.119,.267],[.059,.117],[.039,-.176]];
  const bell=mesh(g,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),48),brass,.15,.036,-.12,'metal');
  bell.rotation.z=-Math.PI/2;
  tubing(g,brass,[[-.425,.031,-.135],[-.230,.031,-.135],[.238,.038,-.135],[.357,.020,-.024],[.347,.025,.104],[.185,.018,.163],[-.256,.039,.162],[-.341,.046,.112],[-.292,.052,.020],[.057,.065,.021]],.039,'metal');
  for(const x of [-.16,-.026,.103]){
    cyl(g,brass,x,.068,.013,.042,.042,.225,'metal');
    cyl(g,cream,x,.192,.013,.041,.041,.032,'metal');
  }
  return tilt(g,.37);
}
function cornCan() {
  const g=new THREE.Group();
  const label=Object.assign(document.createElement('canvas'),{width:512,height:256});
  const ctx=label.getContext('2d');
  ctx.fillStyle='#e6ae37';ctx.fillRect(0,0,512,256);
  ctx.fillStyle='#3f7660';ctx.fillRect(0,18,512,35);ctx.fillRect(0,213,512,28);
  for(const x of [24,280,536]){
    ctx.fillStyle='#fff0bc';ctx.beginPath();ctx.roundRect(x-115,68,230,113,27);ctx.fill();
    ctx.fillStyle='#254331';ctx.font='700 61px sans-serif';ctx.textAlign='center';printInk(ctx,'甜玉米',x,139);
  }
  const map=new THREE.CanvasTexture(label);map.colorSpace=THREE.SRGBColorSpace;
  const can=cyl(g,cream,0,0,0,.267,.267,.674,'satin');
  can.material=new THREE.MeshPhysicalMaterial({map,roughness:.46,clearcoat:.40});
  for(const y of [-.334,.333])cyl(g,'#b0b7b5',0,y,0,.278,.278,.040,'metal');
  const tab=mesh(g,new THREE.TorusGeometry(.057,.014,8,18),'#c8cecb',.008,.363,.020,'metal');
  tab.rotation.x=Math.PI/2;
  g.rotation.set(.91,0,-.34);
  return g;
}
function earOfCorn() {
  const g=new THREE.Group();
  sph(g,gold,0,0,0,.169,.123,.408,'satin');
  for(let r=0;r<13;r++){
    const z=(r-6)*.056, width=.166*Math.sqrt(1-(z/.414)**2);
    for(let c=0;c<9;c++){
      const a=c*tau/9+(r%2)*.16;
      sph(g,c%3?'#edbf45':'#f9d772',width*Math.sin(a),width*.74*Math.cos(a),z,.040,.034,.036,'satin');
    }
  }
  for(const side of [-1,1]){
    const husk=sph(g,'#779c57',side*.095,-.04,.166,.100,.058,.302,'satin');
    husk.rotation.y=side*.36;
  }
  return tilt(g,.14);
}
function taco() {
  const g=new THREE.Group();
  const points=[];
  for(let i=0;i<=20;i++){
    const a=i*Math.PI/20;
    points.push(new THREE.Vector3(Math.cos(a)*.41,-.113+Math.sin(a)*.24,.041));
  }
  const shape=new THREE.Shape();
  shape.moveTo(points[0].x,points[0].y);
  points.slice(1).forEach(point=>shape.lineTo(point.x,point.y));
  shape.closePath();
  for(const z of [-.118,.118]){
    const shell=mesh(g,new THREE.ExtrudeGeometry(shape,{depth:.013,bevelThickness:.037,bevelSize:.043,bevelSegments:4,steps:1}),gold,0,0,z,'satin');
    shell.rotation.x=z<0?.21:-.21;
  }
  for(let i=0;i<13;i++){
    const a=(i+.5)*Math.PI/13,x=.375*Math.cos(a),y=-.08+.229*Math.sin(a);
    sph(g,i%2?'#749857':'#9ab862',x,y,0,.078,.042,.142,'satin');
    if(i%2===0)box(g,coral,x-.017,y+.026,.034,.074,.039,.065,.013);
    else box(g,cream,x,y+.020,-.016,.068,.035,.07,.010);
  }
  return tilt(g,.71);
}
function watermelon() {
  const g=new THREE.Group();
  const layers=[['#466e4a',.433,.056],['#acc774',.411,.066],['#e86571',.382,.086]];
  for(const [color,r,height] of layers){
    const shape=new THREE.Shape();
    shape.moveTo(-r,-.06);
    shape.quadraticCurveTo(-r,.098,0,.322*(r/.433));
    shape.quadraticCurveTo(r,.098,r,-.06);
    shape.quadraticCurveTo(0,-.157,-r,-.06);
    const layer=mesh(g,new THREE.ExtrudeGeometry(shape,{depth:height,bevelThickness:.018,bevelSize:.019,bevelSegments:4,steps:1}),color,0,(.43-r)*1.1,0);
    layer.rotation.x=-Math.PI/2;
  }
  for(const [x,z,a] of [[-.27,.031,.24],[-.172,-.042,.49],[-.088,.055,-.30],[.010,-.09,-.1],[.1,.04,.4],[.22,-.018,-.42],[.294,.028,.31]]){
    const seed=sph(g,'#603b36',x,.152,z,.022,.010,.036);
    seed.rotation.y=a;
  }
  g.scale.set(1,1.13,1.10);
  return tilt(g,.39);
}
const marketBuilders={drum,clarinet,maraca,harp,trumpet,corncan:cornCan,corn:earOfCorn,taco,watermelon};

const textile = new Map();
function fabric(color) {
  if (textile.has(color)) return textile.get(color);
  const image = Object.assign(document.createElement('canvas'), {width:128,height:128});
  const ctx=image.getContext('2d');
  ctx.fillStyle='#888';ctx.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=4){
    ctx.fillStyle=i%8?'#707070':'#a7a7a7';
    ctx.fillRect(i,0,2,128);ctx.fillRect(0,i,128,1);
  }
  const bumpMap=new THREE.CanvasTexture(image);
  bumpMap.anisotropy=4;
  const material=new THREE.MeshPhysicalMaterial({
    color,roughness:.74,bumpMap,bumpScale:.012,sheen:.61,
    sheenColor:new THREE.Color(color),sheenRoughness:.7,
  });
  textile.set(color,material);
  return material;
}
function clothToy(rabbit) {
  const g = new THREE.Group(), cloth = rabbit ? '#d79baf' : '#ebaa51';
  const body = sph(g,cloth,0,-.035,.127,.242,.154,.29);
  const head = sph(g,cloth,0,.05,-.164,.293,.162,.224);
  body.material=head.material=fabric(cloth);
  for(const side of [-1,1]){
    const ear=sph(g,cloth,side*.151,.077,rabbit?-.372:-.327,.091,.065,rabbit?.183:.081);
    ear.rotation.y=side*-.25;ear.material=fabric(cloth);
    const inner=sph(g,'#f8c6c6',side*.159,.131,rabbit?-.408:-.326,.054,.017,rabbit?.100:.047);
    inner.rotation.y=ear.rotation.y;
    const foot=sph(g,cloth,side*.159,.018,.32,.095,.085,.139);
    foot.material=fabric(cloth);
    sph(g,graphite,side*.114,.188,-.187,.029,.018,.029,'satin');
    sph(g,cream,side*.063,.170,-.076,.085,.041,.066,'satin');
    if(!rabbit){
      tubing(g,'#855640',[[side*.229,.143,-.206],[side*.184,.154,-.168],[side*.168,.142,-.120]],.013,'ribbon');
      tubing(g,'#855640',[[side*.076,.170,-.304],[side*.052,.189,-.277],[side*.024,.205,-.216]],.013,'ribbon');
    }
  }
  sph(g,'#a86173',0,.209,-.103,.036,.019,.026,'satin');
  if(rabbit) sph(g,cream,0,.055,.388,.120,.092,.102,'ribbon');
  else tubing(g,cloth,[[.112,-.01,.319],[.264,.012,.364],[.347,.04,.314],[.334,.098,.244]],.049,'ribbon');
  return tilt(g,.23);
}
function pelletDrum() {
  const g = new THREE.Group();
  cyl(g,'#b98051',0,-.17,0,.055,.078,.68,'satin');
  cyl(g,'#d96553',0,.174,0,.262,.239,.205);
  cyl(g,cream,0,.282,0,.265,.265,.030,'satin');
  cyl(g,coral,0,.301,0,.129,.129,.013,'satin');
  cyl(g,cream,0,.309,0,.102,.102,.012,'satin');
  cyl(g,coral,0,.318,0,.031,.031,.011,'satin');
  for(const s of [-1,1]){
    tubing(g,gold,[[s*.192,.199,0],[s*.317,.210,.076],[s*.362,.169,.114]],.014,'ribbon');
    sph(g,'#dd694d',s*.359,.174,.115,.064,.061,.065);
  }
  for(let i=0;i<12;i++){
    const a=i*tau/12;
    sph(g,gold,.243*Math.sin(a),.217,.243*Math.cos(a),.021,.021,.021,'metal');
  }
  g.rotation.set(.67,0,-.36);
  return g;
}
function lantern() {
  const g = new THREE.Group();
  const shade=sph(g,'#d65e57',0,.014,-.039,.304,.245,.301);
  shade.material=fabric('#d65e57');
  for(let i=0;i<9;i++){
    const x=(-4+i)*.062;
    const rim=Math.sqrt(1-(x/.306)**2);
    tubing(g,'#f69d77',[[x,.027,-.039-.276*rim],[x,.183*rim,-.039-.193*rim],[x,.249*rim,-.039],[x,.183*rim,-.039+.193*rim],[x,.027,-.039+.276*rim]],.010,'ribbon');
  }
  for(const z of [-.299,.242])box(g,gold,0,.014,z,.24,.091,.070,.034,'metal');
  tubing(g,'#c95850',[[.003,.018,.229],[.017,.012,.319],[.046,.031,.351]],.018,'ribbon');
  for(let i=0;i<5;i++)tubing(g,'#c95850',[[.042,.026,.347],[.026+i*.012,.013,.397],[.018+i*.020,.015,.460]],.009,'ribbon');
  return tilt(g,.29);
}
function pouch() {
  const g=new THREE.Group();
  const shell=sph(g,plum,0,.003,.052,.351,.166,.327);
  shell.material=fabric('#a878ad');
  const mouth=box(g,plum,0,.014,-.221,.321,.179,.156,.062,'satin');
  mouth.material=fabric('#996c9f');
  tubing(g,gold,[[-.194,.057,-.292],[-.126,.140,-.257],[.134,.139,-.26],[.197,.057,-.285]],.024,'ribbon');
  for(const s of [-1,1])tubing(g,gold,[[s*.130,.124,-.264],[s*.27,.106,-.295],[s*.343,.083,-.210]],.017,'ribbon');
  for(let j=0;j<5;j++){
    const a=j*tau/5;
    const stitch=sph(g,'#eed6c1',.087*Math.sin(a),.166,.048+.085*Math.cos(a),.032,.010,.071,'ribbon');
    stitch.rotation.y=a;
  }
  sph(g,gold,0,.172,.049,.039,.017,.040,'ribbon');
  return tilt(g,.25);
}
function backpack() {
  const g=new THREE.Group();
  const shell=box(g,'#527f99',0,0,.003,.583,.264,.718,.115,'satin');
  shell.material=fabric('#527f99');
  const panel=box(g,'#599eb0',0,.118,.028,.536,.135,.618,.071,'satin');
  panel.material=fabric('#599eb0');
  box(g,'#d6ab5d',0,.181,.136,.410,.079,.266,.047);
  for(const side of [-1,1])tubing(g,graphite,[[side*.154,-.075,-.261],[side*.215,-.165,-.126],[side*.176,-.174,.125],[side*.151,-.075,.277]],.032,'ribbon');
  tubing(g,graphite,[[-.098,.078,-.323],[-.071,.123,-.419],[.084,.123,-.419],[.101,.078,-.322]],.038,'ribbon');
  tubing(g,cream,[[-.211,.144,.055],[0,.172,.029],[.202,.148,.069]],.014,'ribbon');
  box(g,'#dbb17f',.130,.155,-.143,.095,.025,.074,.020,'satin');
  return tilt(g,.29);
}
function skate() {
  const g=new THREE.Group();
  const deck=sph(g,'#cb8a5f',0,.044,0,.196,.038,.465,'satin');
  deck.rotation.z=-.04;
  sph(g,'#779b71',0,.072,0,.190,.030,.452,'satin');
  for(const sign of [-1,1]){
    box(g,cream,0,-.028,sign*.257,.308,.074,.091,.028,'metal');
    for(const side of [-1,1]){
      const wheel=cyl(g,'#e6b964',side*.137,-.048,sign*.26,.069,.069,.078,'satin',Math.PI/2);
      wheel.rotation.x=.10;
    }
  }
  for(const z of [-.145,.052,.149]){
    const slash=box(g,'#e8d9aa',0,.100,z,.215,.005,.025,.002,'satin');
    slash.rotation.y=.58;
  }
  return tilt(g,.24);
}
function schoolBottle() {
  const g=new THREE.Group();
  cyl(g,'#588bba',0,-.057,0,.212,.207,.578,'glass');
  sph(g,'#588bba',0,.202,0,.212,.110,.212,'glass');
  cyl(g,cream,0,.299,0,.166,.188,.152);
  cyl(g,'#d1ac73',0,.213,0,.201,.201,.042,'metal');
  tubing(g,'#b3c576',[[.093,.32,.022],[.206,.359,.023],[.254,.288,.019],[.220,.219,.027]],.027,'ribbon');
  for(const y of [-.213,-.119,-.023])box(g,'#b7d9d4',.036,y,.207,.110,.013,.009,.004,'satin');
  g.rotation.set(1.03,.21,-.38);
  return g;
}
function lunchTin() {
  const g=new THREE.Group();
  box(g,'#acb7ba',0,-.039,0,.747,.237,.583,.069,'metal');
  box(g,'#8cad80',0,.093,0,.755,.110,.592,.052);
  box(g,'#e2e6d1',0,.152,0,.628,.030,.476,.015,'satin');
  for(const x of [-.312,.312]){
    box(g,'#9ea3a1',x,.004,.279,.101,.143,.049,.020,'metal');
  }
  tubing(g,'#769482',[[-.15,.172,.054],[-.091,.222,.013],[.108,.218,.012],[.151,.171,.051]],.025);
  return tilt(g,.44);
}
function pencilCase() {
  const g=new THREE.Group();
  const shell=box(g,'#c88581',0,.007,0,.449,.204,.817,.067,'satin');
  shell.material=fabric('#c88581');
  tubing(g,'#9f5b61',[[-.205,.109,.295],[-.194,.113,-.293],[-.149,.118,-.405],[.152,.118,-.400],[.197,.110,-.281],[.207,.104,.302]],.016,'ribbon');
  box(g,'#dfb174',-.175,.137,.248,.050,.030,.107,.014,'metal');
  box(g,cream,.013,.117,-.046,.167,.024,.206,.023,'ribbon');
  tubing(g,'#b86b62',[[-.039,.134,-.082],[-.005,.137,-.04],[.022,.135,-.068],[.059,.134,-.023]],.010,'ribbon');
  return tilt(g,.18);
}

function balloonOutline(kind) {
  const shape=new THREE.Shape();
  if(kind==='star'){
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*tau/10, r=i%2?.229:.409;
      const x=Math.cos(a)*r,y=Math.sin(a)*r;
      if(i===0)shape.moveTo(x,y);
      else shape.lineTo(x,y);
    }
  }else if(kind==='heart'){
    shape.moveTo(0,-.353);
    shape.bezierCurveTo(-.275,-.227,-.487,-.007,-.345,.200);
    shape.bezierCurveTo(-.261,.335,-.086,.305,0,.175);
    shape.bezierCurveTo(.102,.311,.257,.323,.345,.200);
    shape.bezierCurveTo(.484,-.017,.275,-.221,0,-.353);
  }else{
    shape.moveTo(-.27,.13);
    shape.bezierCurveTo(-.414,.247,-.319,.430,-.182,.380);
    shape.bezierCurveTo(-.130,.366,-.118,.291,-.113,.258);
    shape.quadraticCurveTo(0,.299,.113,.258);
    shape.bezierCurveTo(.128,.327,.140,.389,.225,.391);
    shape.bezierCurveTo(.347,.387,.358,.236,.271,.134);
    shape.bezierCurveTo(.426,-.151,.231,-.313,0,-.313);
    shape.bezierCurveTo(-.260,-.314,-.396,-.143,-.27,.13);
  }
  shape.closePath();
  return shape;
}
function balloonShell(g, outline, color) {
  const outlinePoints=outline.getSpacedPoints(120).slice(0,-1);
  const n=outlinePoints.length, segments=12;
  const seam=outlinePoints.reduce((sum,p)=>sum.add(p),new THREE.Vector2()).multiplyScalar(1/n);
  for(const side of [-1,1]){
    const positions=[seam.x,side*.142,-seam.y], uv=[.5,.5], index=[];
    for(let ring=1;ring<=segments;ring++){
      const fraction=ring/segments, dome=Math.sqrt(1-fraction**2);
      for(const [i,point] of outlinePoints.entries()){
        const scale=fraction*(1+.032*dome);
        const x=seam.x+(point.x-seam.x)*scale,y=seam.y+(point.y-seam.y)*scale;
        const seamCrease=.009*dome*fraction**5*Math.sin(i*.99);
        positions.push(x,side*(dome*.142+seamCrease),-y);
        uv.push(.5+x,.5+y);
        const next=(i+1)%n, current=1+(ring-1)*n+i, neighbor=1+(ring-1)*n+next;
        if(ring===1) index.push(0,current,neighbor);
        else index.push(current-n,current,neighbor,current-n,neighbor,neighbor-n);
      }
    }
    const perimeter=outlinePoints.reduce((sum,point,i)=>{
      const next=outlinePoints[(i+1)%n];
      return sum+point.x*next.y-next.x*point.y;
    },0);
    if(side*Math.sign(perimeter)<0){
      for(let i=0;i<index.length;i+=3)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];
    }
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geom.setIndex(index);
    geom.computeVertexNormals();
    mesh(g,geom,color,0,0,0,'glass');
  }
}

function balloon(kind) {
  const g=new THREE.Group();
  const color={star:'#e8ba57',heart:'#dc8293',bear:'#82b5b5'}[kind];
  const outline=balloonOutline(kind);
  balloonShell(g,outline,color);
  if(kind==='bear') {
    for(const x of [-.094,.094])sph(g,graphite,x,.145,-.025,.022,.016,.025,'satin');
    sph(g,cream,0,.145,.081,.076,.015,.052,'satin');
    sph(g,graphite,0,.159,.077,.024,.01,.018,'satin');
  }
  box(g,color,0,-.027,.368,.104,.050,.078,.021);
  tubing(g,cream,[[0,-.02,.396],[-.031,-.027,.454],[.005,-.026,.493]],.012,'ribbon');
  return tilt(g,.22);
}
const craftBuilders={
  'cloth-tiger':()=>clothToy(false),'cloth-rabbit':()=>clothToy(true),
  'pellet-drum':pelletDrum,'silk-lantern':lantern,'embroidered-pouch':pouch,
  'school-backpack':backpack,'skate-deck':skate,'school-bottle':schoolBottle,
  'lunch-tin':lunchTin,'pencil-case':pencilCase,'balloon-star':()=>balloon('star'),
  'balloon-heart':()=>balloon('heart'),'balloon-bear':()=>balloon('bear'),
};

function riceCooker(){
  const g=new THREE.Group();
  const enamel='#d48a54';
  box(g,enamel,0,-.055,0,.721,.388,.696,.119);
  box(g,cream,0,.153,0,.743,.141,.713,.071);
  box(g,'#b8a587',0,.233,0,.544,.033,.503,.016,'metal');
  box(g,teal,0,.265,-.118,.256,.066,.103,.031);
  box(g,cream,0,.057,.353,.329,.140,.046,.023);
  box(g,graphite,-.039,.070,.381,.139,.060,.015,.010,'glass');
  sph(g,coral,.087,.058,.394,.029,.024,.016);
  return tilt(g,.36);
}
function steamedBun(){
  const g=new THREE.Group();
  const skin=new THREE.SphereGeometry(1,54,36),p=skin.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const radius=1+.085*Math.sin(12*Math.atan2(z,x)+Math.max(0,y)*4)*Math.max(0,y)**.65;
    p.setXYZ(i,x*radius,Math.max(-.63,y)+.11*Math.max(0,y)**6,z*radius);
  }
  skin.computeVertexNormals();
  mesh(g,skin,'#f5e4c9',0,0,0,'satin').scale.set(.400,.311,.381);
  const crown=sph(g,'#f8ead2',-.023,.303,.018,.063,.050,.060,'satin');
  crown.rotation.z=.30;
  return tilt(g,.3);
}
function toothbrush(){
  const g=new THREE.Group();
  const mintGreen='#619582';
  const handle=box(g,mintGreen,0,-.026,.112,.130,.125,.700,.061);
  handle.rotation.y=-.12;
  box(g,cream,.032,.036,.223,.075,.025,.297,.012,'satin');
  box(g,mintGreen,-.027,-.005,-.309,.183,.106,.327,.047);
  for(let row=0;row<7;row++){
    for(let c=0;c<4;c++){
      mesh(g,new THREE.CylinderGeometry(.015,.013,.093,7),row<2||row>4?'#b9d1ad':cream,
        (c-1.5)*.036-.025,.091+(row%2)*.013,-.419+row*.041,'satin');
    }
  }
  g.rotation.set(.32,-.13,-.22);
  return g;
}
function matchbox(){
  const g=new THREE.Group();
  box(g,'#c98c57',.026,-.008,.007,.619,.158,.690,.028,'satin');
  box(g,'#d8a453',-.028,.064,.003,.485,.054,.709,.022);
  box(g,'#9d6547',-.277,.004,.003,.022,.119,.650,.010,'satin');
  for(let i=0;i<4;i++){
    box(g,cream,.254,.055,(i-1.5)*.127,.164,.023,.025,.009,'satin');
    sph(g,coral,.324,.062,(i-1.5)*.127,.026,.023,.022,'satin');
  }
  const label=Object.assign(document.createElement('canvas'),{width:384,height:512});
  const ctx=label.getContext('2d');
  ctx.fillStyle='#e8bd71';ctx.fillRect(0,0,384,512);
  ctx.strokeStyle='#a6503d';ctx.lineWidth=9;ctx.strokeRect(18,19,348,475);
  ctx.fillStyle='#a6503d';ctx.beginPath();ctx.ellipse(192,213,102,89,0,0,tau);ctx.fill();
  ctx.fillStyle='#ffdda0';ctx.font='700 67px sans-serif';ctx.textAlign='center';printInk(ctx,'火柴',192,236);
  ctx.fillStyle='#a6503d';ctx.font='600 34px sans-serif';printInk(ctx,'安全火柴',192,385);
  const print=new THREE.CanvasTexture(label);print.colorSpace=THREE.SRGBColorSpace;
  const top=mesh(g,new THREE.PlaneGeometry(.442,.655),cream,-.028,.094,0);
  top.rotation.x=-Math.PI/2;
  top.material=new THREE.MeshPhysicalMaterial({map:print,roughness:.48,clearcoat:.32});
  return tilt(g,.24);
}
function enamelMug(){
  const g=new THREE.Group(), blueGreen='#70aa9d';
  const profile=[[0,-.230],[.223,-.230],[.250,-.220],[.270,-.169],[.297,.184],[.302,.229],[.282,.244],[.261,.226],[.237,-.146],[.213,-.177],[0,-.177]];
  mesh(g,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),56),blueGreen,-.065,0,0);
  const ring=mesh(g,new THREE.TorusGeometry(.285,.018,10,52),cream,-.065,.230,0);
  ring.rotation.x=Math.PI/2;
  tubing(g,blueGreen,[[.192,.138,.025],[.330,.151,.034],[.393,.060,.039],[.344,-.063,.035],[.193,-.075,.025]],.039);
  tubing(g,cream,[[-.248,.058,.211],[-.101,.064,.271],[.030,.062,.265],[.143,.058,.208]],.015,'ribbon');
  return tilt(g,.69);
}
function steamer(){
  const g=new THREE.Group();
  const rim='#c89058', body='#dab37c';
  cyl(g,body,0,-.067,0,.368,.347,.284,'satin');
  cyl(g,rim,0,.076,0,.383,.364,.066,'satin');
  cyl(g,'#e9c592',0,.119,0,.344,.354,.057,'satin');
  cyl(g,rim,0,-.182,0,.352,.352,.034,'satin');
  for(let i=-5;i<=5;i++){
    const x=i*.056;
    box(g,i%2?'#d7ad78':'#f0cf92',x,.153,0,.040,.014,.642*Math.sqrt(1-(x/.35)**2),.006,'satin');
  }
  tubing(g,rim,[[-.107,.161,.027],[-.063,.225,.014],[.071,.218,.008],[.122,.161,.024]],.019,'satin');
  return tilt(g,.42);
}
function dialPhone(){
  const g=new THREE.Group(), housing='#c99551';
  box(g,housing,0,-.029,.024,.712,.282,.630,.105);
  box(g,cream,0,.081,.106,.536,.120,.409,.055);
  cyl(g,'#ad784d',0,.148,.134,.180,.178,.052);
  cyl(g,cream,0,.174,.134,.132,.132,.024);
  for(let i=0;i<9;i++){
    const a=i*tau/9;
    cyl(g,'#88644e',.103*Math.sin(a),.188,.134+.103*Math.cos(a),.021,.020,.010,'satin');
  }
  tubing(g,housing,[[-.308,.196,-.175],[-.216,.241,-.248],[.188,.242,-.251],[.316,.194,-.178]],.063);
  for(const x of [-.300,.305])sph(g,housing,x,.182,-.162,.096,.071,.101);
  return tilt(g,.34);
}
function alarmClock(){
  const g=new THREE.Group(), shell='#c95f56';
  cyl(g,shell,0,-.009,.014,.325,.320,.205);
  cyl(g,'#d3a974',0,.098,.014,.303,.303,.038,'metal');
  cyl(g,cream,0,.124,.014,.270,.270,.028,'glass');
  for(let i=0;i<12;i++){
    const a=i*tau/12;
    const tick=box(g,'#846653',.214*Math.sin(a),.143,.014+.214*Math.cos(a),.014,.009,.043,.004,'satin');
    tick.rotation.y=a;
  }
  tubing(g,graphite,[[-.082,.150,-.091],[0,.151,.014],[.11,.150,-.034]],.014,'satin');
  for(const x of [-1,1]){
    sph(g,shell,x*.213,.045,-.263,.150,.097,.112);
    const foot=box(g,'#af7960',x*.195,-.026,.293,.086,.093,.103,.028,'metal');
    foot.rotation.y=x*.39;
  }
  return tilt(g,.35);
}
const denseBuilders={
  'rice-cooker':riceCooker,'steamed-bun':steamedBun,toothbrush,matchbox,
  'enamel-mug':enamelMug,steamer,'dial-phone':dialPhone,'alarm-clock':alarmClock,
};
const denseIds={1472:'rice-cooker',399:'steamed-bun',293:'toothbrush',1441:'matchbox',86:'enamel-mug',898:'dial-phone',1492:'alarm-clock'};
export function denseRebuildKind(item,level,variant) {
  if (level===2815) return paletteIds[item.sourceItemId] ?? null;
  if (level===1529) {
    const kind=violetIds[item.sourceItemId];
    if(variant===1 && ['treble','keyboard','jelly'].includes(kind))return 'concert-'+kind;
    return kind??null;
  }
  if (level!==719) return null;
  if (item.sourceItemId===1148&&variant===1) return 'steamer';
  return denseIds[item.sourceItemId] ?? null;
}

const lilac='#a786c5', pale='#fff3db', blush='#e387a8', violet='#70549d';

function decorativeBird(pink) {
  const g=new THREE.Group();
  const body=pink?blush:pale, bill=pink?'#9f707a':'#d2a36e';
  const length=pink?.293:.259;
  const base=sph(g,body,-.031,-.011,.108,.170,.166,.281);
  base.rotation.x=.19;
  const wing=sph(g,pink?'#c7819f':'#d4cbcb',-.052,.092,.189,.164,.070,.250,'satin');
  wing.rotation.y=.23;
  for(let winglet=0;winglet<4;winglet++){
    const feather=sph(g,body,-.103+.057*winglet,.141,.194+.027*winglet,.052,.024,.151,'satin');
    feather.rotation.y=-.32+winglet*.35;
  }
  tubing(g,body,[[.026,.037,-.046],[.119,.098,-.160],[pink?.035:.124,pink?.188:.126,-.258],[.115,pink?.185:.122,-length]],pink?.048:.065);
  sph(g,body,.114,pink?.184:.124,-length,.104,.086,.086);
  const beak=sph(g,bill,.207,pink?.155:.114,-length-.013,.088,.039,.043);
  beak.rotation.z=pink?-.42:-.22;
  sph(g,graphite,.157,pink?.231:.173,-length-.019,.019,.017,.018,'satin');
  if(pink) {
    for(const x of [-.048,.056])tubing(g,bill,[[x,-.126,.085],[x,-.197,.194],[x+.076,-.195,.334]],.021,'satin');
  }else{
    const tail=sph(g,'#b7abb3',-.069,-.043,.344,.169,.045,.087,'satin');
    tail.rotation.y=-.20;
  }
  return tilt(g,.29);
}
function limo(){
  const g=new THREE.Group();
  box(g,'#d4d1cf',0,-.108,0,.906,.146,.380,.052);
  box(g,pale,.012,.003,0,.874,.163,.362,.072);
  box(g,'#6f7d89',.052,.109,0,.563,.128,.328,.050,'glass');
  box(g,pale,.059,.163,0,.557,.043,.310,.020);
  for(const side of [-1,1]){
    for(const x of [-.167,.034,.226])box(g,pale,x,.100,side*.167,.025,.124,.016,.007);
    for(const x of [-.301,.301]){
      const wheel=cyl(g,graphite,x,-.139,side*.179,.091,.091,.060,'satin');
      const brass=cyl(g,'#b8aeae',x,-.139,side*.213,.047,.047,.015,'metal');
      wheel.rotation.x=brass.rotation.x=Math.PI/2;
    }
  }
  for(const z of [-.115,.115])box(g,cream,-.439,.006,z,.029,.040,.080,.008,'lit');
  return tilt(g,.53);
}
function tablet(){
  const g=new THREE.Group();
  box(g,'#856096',0,-.035,-.020,.503,.169,.701,.048,'satin');
  box(g,'#b287bc',0,.054,-.024,.435,.051,.625,.020);
  for(const x of [-.174,.173]){
    tubing(g,'#ebc87d',[[x,.083,-.263],[x,.087,-.08],[x,.085,.175],[x*.75,.080,.243]],.012,'metal');
  }
  const mark = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.091,.085,-.140),new THREE.Vector3(.052,.087,-.14),
    new THREE.Vector3(.093,.087,-.059),new THREE.Vector3(-.041,.087,.013),
    new THREE.Vector3(-.065,.087,.095),new THREE.Vector3(.039,.087,.161),
  ]);
  mesh(g,new THREE.TubeGeometry(mark,24,.018,9),'#ebc87d',0,0,0,'metal');
  for(let j=0;j<5;j++)tubing(g,'#a278a7',[[.046,.070,.298],[.024+j*.012,.055,.372],[.003+j*.026,.049,.476]],.010,'ribbon');
  return tilt(g,.28);
}
function keyboard(color = violet, concert=false){
  const g=new THREE.Group();
  box(g,color,0,-.028,0,.886,.149,.548,.064);
  box(g,concert?'#524c77':lilac,0,.045,-.134,.841,.056,.23,.025);
  for(let i=0;i<10;i++){
    const x=(i-4.5)*.078;
    box(g,pale,x,.066,.106,.069,.055,.27,.010);
    if(![2,6,9].includes(i))box(g,graphite,x+.040,.104,.024,.035,.049,.148,.010,'satin');
  }
  box(g,'#738e8e',-.099,.081,-.146,.196,.015,.096,.007,'glass');
  for(const x of [.125,.215,.296])cyl(g,blush,x,.087,-.150,.026,.026,.020);
  return tilt(g,concert?.74:.25);
}
function hoop(color = pale){
  const g=new THREE.Group();
  const ring=mesh(g,new THREE.TorusGeometry(.372,.050,14,56),color,0,0,0);
  ring.rotation.x=Math.PI/2;
  for(const angle of [-.51,1.35,2.74]){
    const stripe=mesh(g,new THREE.TorusGeometry(.372,.051,10,12,.26),lilac,0,0,0,'ribbon');
    stripe.rotation.set(Math.PI/2,0,angle);
  }
  return tilt(g,.28);
}
function jelly(concert=false){
  const g=new THREE.Group();
  const profile=[[.184,-.235],[.204,-.185],[.263,.118],[.265,.160],[.236,.193],[.015,.205],[0,.205]];
  const geometry=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),56);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i);
    const modulation=1+.11*Math.sin(Math.atan2(z,x)*9);
    p.setX(i,x*modulation);p.setZ(i,z*modulation);
  }
  geometry.computeVertexNormals();
  mesh(g,geometry,concert?'#ac426e':'#9467b0',0,0,0,'glass');
  sph(g,concert?'#ec97b1':'#ba94ca',0,.210,0,.130,.041,.129,'glass');
  for(const [x,z] of [[-.050,-.04],[.055,.05],[-.08,.055]])sph(g,'#e1bfd6',x,.235,z,.037,.012,.039,'glass');
  g.scale.set(1.23,1.04,1.23);
  return tilt(g,.50);
}
function moon(color = '#aa90bf'){
  const g=new THREE.Group();
  const body=new THREE.SphereGeometry(.411,48,30),p=body.attributes.position;
  const craters=[[-.20,-.03,.083],[.132,.121,.087],[.023,-.172,.071],[.255,-.08,.059]];
  for(let i=0;i<p.count;i++){
    if(p.getY(i)<0)continue;
    const x=p.getX(i),z=p.getZ(i);
    let y=p.getY(i);
    for(const [cx,cz,r] of craters){
      const d=Math.hypot(x-cx,z-cz)/r;
      y-=.071*Math.max(0,1-d*d)**1.1;
      y+=.016*Math.exp(-((d-1)**2)*21);
    }
    p.setY(i,y);
  }
  body.computeVertexNormals();
  mesh(g,body,color,0,0,0,'satin');
  for(const [x,z,r] of craters){
    sph(g,'#8c71a7',x,Math.sqrt(.411**2-x*x-z*z)-.064,z,r*.32,.009,r*.32,'satin');
  }
  return tilt(g,.31);
}
function pumpkinCar(){
  const g=new THREE.Group();
  const lobe=new THREE.SphereGeometry(1,40,24),p=lobe.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),rib=1+.09*Math.cos(Math.atan2(z,x)*8);
    p.setX(i,x*rib);p.setZ(i,z*rib);
  }
  lobe.computeVertexNormals();
  mesh(g,lobe,'#ede4cf',0,.061,0).scale.set(.328,.283,.281);
  box(g,'#a79890',0,-.149,0,.773,.095,.392,.039,'metal');
  for(const side of [-1,1]){
    for(const x of [-.274,.274]){
      const wheel=cyl(g,'#b8aeb1',x,-.140,side*.228,.128,.128,.061,'satin');
      wheel.rotation.x=Math.PI/2;
      sph(g,'#ece2d8',x,-.141,side*.260,.076,.075,.026,'metal');
    }
  }
  sph(g,'#8e9ca1',.043,.137,.255,.129,.113,.030,'glass');
  cyl(g,'#8a8d70',0,.361,0,.037,.049,.095,'satin').rotation.z=.24;
  return tilt(g,.55);
}
function paperclip(color = '#d6819e'){
  const g=new THREE.Group();
  tubing(g,color,[[.052,.037,.265],[.138,.038,.243],[.146,.039,-.163],[.091,.054,-.309],[-.062,.053,-.332],[-.175,.045,-.241],[-.184,.040,.193],[-.137,.038,.315],[-.029,.043,.363],[.102,.043,.347],[.195,.047,.248],[.204,.048,-.240]],.047,'metal');
  return tilt(g,.24);
}
function mitt(){
  const g=new THREE.Group();
  const body=sph(g,blush,-.034,.001,-.071,.236,.135,.302);
  body.material=fabric(blush);
  const thumb=sph(g,blush,.202,-.005,.01,.121,.093,.191);
  thumb.rotation.y=-.51;thumb.material=body.material;
  const cuff=box(g,'#bc6786',-.018,-.002,.248,.407,.205,.204,.084,'satin');
  cuff.material=fabric('#bc6786');
  for(let i=0;i<3;i++)tubing(g,'#e5a8b8',[[-.191+i*.061,.045,-.165],[-.106+i*.061,.124,-.109],[-.048+i*.061,.130,-.027],[.017+i*.061,.106,.073]],.009,'ribbon');
  return tilt(g,.24);
}
function dice(color = pale){
  const g=new THREE.Group();
  box(g,color,0,0,0,.585,.585,.585,.073);
  const dot = new THREE.Color(color).getHSL({}).l < .4 ? cream : '#695975';
  for(const [x,z] of [[-.148,-.148],[0,0],[.148,.148]])sph(g,dot,x,.295,z,.049,.015,.048,'satin');
  for(const [x,y] of [[-.151,-.143],[.153,-.143],[-.151,.149],[.153,.149]])sph(g,dot,x,y,.294,.048,.049,.015,'satin');
  for(const [y,z] of [[-.14,-.14],[.141,.14]])sph(g,dot,.294,y,z,.015,.047,.047,'satin');
  return tilt(g,.49);
}
function treble(concert=false){
  const g=new THREE.Group();
  const path=[[.076,.026,.281],[-.049,.031,.320],[-.161,.031,.252],[-.181,.031,.152],[-.087,.031,.102],[.019,.031,.139],[.091,.031,.200],[.156,.031,.114],[.175,.031,-.012],[.103,.031,-.098],[-.017,.031,-.122],[-.114,.031,-.059],[-.129,.031,.038],[-.068,.031,.100],[.028,.031,.064],[.078,.031,-.051],[.028,.031,-.189],[-.006,.031,-.349],[.071,.031,-.387],[.118,.031,-.324],[.093,.031,-.248]];
  if(concert){
    tubing(g,'#086e72',path,.050,'glass');
    const [x,y,z]=path[0];
    sph(g,'#efc267',x,y,z,.066,.057,.066,'metal');
    return tilt(g,1.03);
  }
  tubing(g,'#ce87a5',path,.043);
  return tilt(g,.20);
}
const violetBuilders={
  'white-bird':()=>decorativeBird(false), flamingo:()=>decorativeBird(true),
  limo, tablet, keyboard, hoop, jelly, moon,'pumpkin-car':pumpkinCar,
  paperclip, mitt, dice, treble,
};
const violetIds={2105:'white-bird',1990:'limo',2084:'flamingo',1089:'tablet',207:'keyboard',582:'hoop',1878:'jelly',1013:'moon',2149:'pumpkin-car',338:'paperclip',1818:'mitt',789:'dice',242:'treble'};

const pepperColors={
  'pepper-green':'#70914e','pepper-red':'#d0604b','pepper-yellow':'#e4ad49',
};
const bowlingColors={
  'bowling-green':'#76aa73','bowling-pink':'#d685a3','bowling-purple':'#9e84bf',
  'bowling-red':'#cc5b59','bowling-white':'#ebe1d0',
};
const cakeColors={
  'cake-orange':'#e5a85c','cake-pink':'#db8fab','cake-purple':'#aa8abe',
  'cake-red':'#cd6b68','cake-yellow':'#e9c66a',
};
function partyPepper(color){
  const g=new THREE.Group(),geometry=new THREE.SphereGeometry(1,44,30),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),angle=Math.atan2(y,x);
    const tail=(1-z)*.5;
    const taper=(1-.47*z)*(1+.062*Math.cos(angle*4+.31*z));
    p.setXYZ(i,x*taper+.65*(1-tail)**2-.20*tail,y*taper,z-.048*z**3);
  }
  geometry.computeVertexNormals();
  mesh(g,geometry,color,0,0,0).scale.set(.21,.201,.411);
  tubing(g,'#69764e',[[-.038,.021,-.357],[-.058,.061,-.418],[-.027,.107,-.470],[.029,.123,-.458]],.032,'satin');
  return tilt(g,.34);
}
function partyCake(color){
  const g=new THREE.Group();
  cyl(g,'#d9a97c',0,-.093,0,.329,.325,.278,'satin');
  cyl(g,'#f3ddbf',0,-.065,0,.333,.333,.037,'satin');
  cyl(g,color,0,.079,0,.337,.337,.098);
  for(let i=0;i<12;i++){
    const a=i*tau/12;
    sph(g,color,.324*Math.sin(a),.033,.324*Math.cos(a),.045,.060+(i%3)*.007,.045);
    sph(g,cream,.227*Math.sin(a),.133,.227*Math.cos(a),.028,.025,.028,'satin');
  }
  for(const x of [-.103,.098]){
    cyl(g,'#f9dec0',x,.19,0,.024,.024,.157,'satin');
    sph(g,'#e6a05a',x,.278,.002,.024,.044,.025,'lit');
  }
  return tilt(g,.51);
}
const paletteBuilders = {};
for (const [colors, build] of [[pepperColors,partyPepper],[bowlingColors,bowlingBall],[cakeColors,partyCake]]) {
  for (const [key,color] of Object.entries(colors)) paletteBuilders[key] = () => build(color);
}
const paletteIds={
  57:'pepper-green',58:'pepper-red',59:'pepper-yellow',
  535:'bowling-green',536:'bowling-pink',537:'bowling-purple',538:'bowling-red',539:'bowling-white',
  2737:'cake-orange',2738:'cake-pink',2739:'cake-purple',2740:'cake-red',2742:'cake-yellow',
};

function tossCan(color){
  const g=new THREE.Group(),words=Object.assign(document.createElement('canvas'),{width:256,height:128});
  const ctx=words.getContext('2d');
  ctx.fillStyle=color;ctx.fillRect(0,0,256,128);
  for(const x of [64,192]){
    ctx.fillStyle='#fff0cb';ctx.beginPath();ctx.ellipse(x,65,37,43,0,0,tau);ctx.fill();
    ctx.fillStyle=color;ctx.fillRect(x-20,50,40,6);ctx.fillRect(x-18,64,36,5);ctx.fillRect(x-9,79,18,5);
  }
  const map=new THREE.CanvasTexture(words);map.colorSpace=THREE.SRGBColorSpace;
  const label=cyl(g,color,0,0,0,.254,.249,.643);
  label.material=new THREE.MeshPhysicalMaterial({map,roughness:.35,clearcoat:.55,metalness:.17});
  for(const y of [-.330,.325])cyl(g,'#b7b8b1',0,y,0,.266,.265,.041,'metal');
  const tab=mesh(g,new THREE.TorusGeometry(.047,.009,8,24),'#e4dcc8',-.028,.352,0,'metal');
  tab.rotation.x=Math.PI/2;
  g.rotation.set(.95,-.13,-.35);
  return g;
}
function guitar(color){
  const g=new THREE.Group();
  const body=new THREE.Shape();
  body.moveTo(.14,-.095);
  body.bezierCurveTo(.166,-.15,.135,-.194,.167,-.238);
  body.bezierCurveTo(.222,-.284,.264,-.326,.192,-.415);
  body.bezierCurveTo(.113,-.503,-.121,-.503,-.203,-.404);
  body.bezierCurveTo(-.265,-.336,-.211,-.256,-.177,-.237);
  body.bezierCurveTo(-.143,-.217,-.174,-.174,-.161,-.127);
  body.bezierCurveTo(-.118,-.054,-.034,-.059,.14,-.095);
  const piece=mesh(g,new THREE.ExtrudeGeometry(body,{depth:.12,steps:1,bevelSegments:4,bevelThickness:.020,bevelSize:.032,curveSegments:15}),color,0,-.095,0);
  piece.rotation.x=-Math.PI/2;
  cyl(g,'#665753',0,.057,.177,.075,.075,.011,'satin');
  box(g,'#9d795d',0,.033,-.126,.103,.089,.541,.028,'satin');
  box(g,color,0,.036,-.414,.151,.100,.136,.030);
  box(g,'#795e56',0,.066,.313,.167,.027,.068,.014,'satin');
  for(const x of [-.026,-.009,.009,.026]){
    box(g,cream,x,.088,-.050,.008,.007,.671,.003,'metal');
  }
  for(const y of [-.297,-.235,-.171,-.101,-.028])box(g,cream,0,.081,y,.110,.010,.008,.004,'metal');
  g.rotation.set(.31,-.35,-.18);
  return g;
}
function writingDesk(color){
  const g=new THREE.Group(),grain='#c19269';
  box(g,color,0,.199,-.017,.749,.101,.575,.054);
  box(g,grain,0,.112,.004,.692,.077,.504,.029,'satin');
  for(const x of [-1,1])for(const z of [-1,1]){
    const leg=box(g,grain,x*.290,-.095,z*.202,.084,.365,.083,.031,'satin');
    leg.rotation.set(-z*.10,0,x*.13);
  }
  box(g,color,-.121,.057,.06,.195,.097,.318,.027);
  box(g,'#dbc3a2',-.123,.056,.222,.092,.022,.031,.010,'metal');
  return tilt(g,.50);
}
function fryingPan(color){
  const g=new THREE.Group();
  const profile=[[0,-.074],[.291,-.074],[.318,-.065],[.347,-.029],[.372,.043],[.361,.065],[.342,.061],[.316,-.022],[.282,-.037],[0,-.037]];
  mesh(g,new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),50),color,-.126,0,0);
  cyl(g,'#555355',-.126,-.032,0,.296,.288,.018,'satin');
  box(g,color,.284,.010,0,.315,.087,.103,.040);
  box(g,graphite,.404,.015,0,.203,.091,.111,.032,'satin');
  const rivet=mesh(g,new THREE.TorusGeometry(.027,.008,10,20),'#b5aba3',.451,.067,0,'metal');
  rivet.rotation.x=Math.PI/2;
  return tilt(g,.27);
}
function glazedMug(color){
  const g=new THREE.Group();
  const profile=[[0,-.233],[.205,-.233],[.245,-.203],[.260,-.142],[.277,.209],[.283,.234],[.268,.246],[.250,.226],[.232,-.146],[.206,-.183],[0,-.183]];
  mesh(g,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),56),color,-.060,0,0);
  tubing(g,color,[[.193,.139,.026],[.333,.149,.029],[.389,.044,.030],[.302,-.117,.028],[.181,-.096,.025]],.049);
  const edge=mesh(g,new THREE.TorusGeometry(.267,.012,10,52),cream,-.060,.233,0);
  edge.rotation.x=Math.PI/2;
  return tilt(g,.62);
}
function toonCube(color,name){
  const g=new THREE.Group();
  box(g,color,0,0,0,.676,.588,.668,.116);
  if(name==='Purple'){
    for(let i=0;i<5;i++){
      const a=i*tau/5;
      const petal=sph(g,cream,.094*Math.sin(a),.294,.094*Math.cos(a),.043,.009,.078);
      petal.rotation.y=a;
    }
    sph(g,gold,0,.302,0,.046,.013,.045);
  }else if(name==='Green'||name==='Blue'||name==='Yellow'){
    const mark=sph(g,cream,0,.296,0,.126,.012,.154);
    mark.rotation.y=.47;
    if(name==='Yellow')sph(g,color,.048,.308,-.034,.102,.014,.128);
    else tubing(g,color,[[-.044,.310,.085],[.007,.310,.018],[.092,.310,-.085]],.008);
  }else{
    for(const x of [-.117,.117])sph(g,'#674a57',x,.295,-.06,.029,.013,.039,'satin');
    tubing(g,cream,[[-.083,.300,.081],[0,.302,.118],[.081,.300,.079]],.013,'satin');
  }
  return tilt(g,.49);
}

const familyPalette={
  Black:"#"+"555361",
  Blue:'#6087ba',Brown:'#ac7b56',Green:'#7a9f64',Grey:'#a4a7b0',Orange:'#dc9656',
  Pink:'#d88aa6',Purple:'#a184bd',Red:'#cf6563',White:'#eee5d0',Yellow:'#e5b64b',
};
const families=[
  ['Camera','相机',camera,{819:'Blue',820:'Green',821:'Orange',822:'Pink',823:'Purple',825:'Red',826:'White'}],
  ['Dice','骰子',dice,{783:'Blue',784:'Green',785:'Orange',786:'Pink',787:'Purple',788:'Red',789:'White',790:'Yellow'}],
  ['Bowling Pin','保龄球瓶',bowlingPin,{541:'Blue',542:'Green',543:'Orange',544:'Pink',545:'Purple',546:'Red',547:'Yellow'}],
  ['Bowling Ball','保龄球',bowlingBall,{534:'Blue',535:'Green',536:'Pink',537:'Purple',538:'Red',539:'White',540:'Yellow'}],
  ['Birthday Cake','生日蛋糕',partyCake,{2735:'Blue',2736:'Brown',2737:'Orange',2738:'Pink',2739:'Purple',2740:'Red',2741:'White',2742:'Yellow'}],
  ['Pepper','椒',partyPepper,{57:'Green',58:'Red',59:'Yellow'}],
  ['Paperclip','回形针',paperclip,{334:'Blue',335:'Green',336:'Grey',337:'Orange',338:'Pink',339:'Purple',340:'Red',341:'Yellow'}],
  ['Trumpet','小号',trumpet,{246:'Blue',247:'Green',248:'Orange',249:'Purple',250:'Pink',251:'Red',252:'Yellow'}],
  ['Harp','竖琴',harp,{191:'Brown',192:'Grey',193:'Yellow'}],
];
const homeFamilies=[
  ['Can Toss','罐',tossCan,{377:'Blue',378:'Brown',379:'Green',380:'Grey',381:'Orange',382:'Purple',383:'Red',384:'Yellow'}],
  ['Keyboard','电子琴',keyboard,{202:'Blue',203:'Green',204:'Grey',205:'Orange',206:'Pink',207:'Purple',208:'Red',209:'Yellow'}],
  ['Guitar','吉他',guitar,{182:'Brown',183:'Blue',184:'Green',185:'Grey',186:'Orange',187:'Purple',188:'Pink',189:'Red',190:'Yellow'}],
  ['Desk','桌',writingDesk,{311:'Blue',312:'Green',313:'Grey',314:'Orange',315:'Pink',316:'Purple',317:'Red',318:'Yellow'}],
  ['Moon','月球',moon,{1011:'Yellow',1012:'Red',1013:'Purple',1014:'Pink',1015:'Green',1016:'Blue',1017:'Black'}],
  ['Toon Cube','方块',toonCube,{813:'Blue',814:'Green',815:'Orange',816:'Purple',817:'Red',818:'Yellow'}],
  ['Pan','锅',fryingPan,{724:'Blue',725:'Green',726:'Orange',727:'Pink',728:'Purple',729:'Red',730:'White',731:'Yellow'}],
  ['Mug','杯',glazedMug,{666:'Blue',667:'Green',668:'Orange',669:'Pink',670:'Purple',671:'White',672:'Yellow'}],
  ['Fitness Hoop','呼啦圈',hoop,{576:'Blue',577:'Green',578:'Orange',579:'Pink',580:'Purple',581:'Red',582:'White',583:'Yellow'}],
];
const familyShapes=new Map(),familyBuilders={},homeIds=new Set();
for(const [english,chinese,builder,colors] of [...families,...homeFamilies]){
  for(const [id,color] of Object.entries(colors)){
    const key='family-'+id;
    familyShapes.set(Number(id), {key,chinese,name:english+' '+color});
    familyBuilders[key]=()=>builder(familyPalette[color],color);
    if(homeFamilies.some(([name])=>name===english))homeIds.add(key);
  }
}
export function familyRebuildKind(item,localName){
  const family=familyShapes.get(item.sourceItemId);
  if(!family||item.name!==family.name||(localName&&!localName.includes(family.chinese)))return null;
  return family.key;
}

function kiwi(){
  const g=new THREE.Group();
  sph(g,'#906c49',0,-.036,0,.351,.165,.318,'satin');
  const pulp=sph(g,'#86a64b',0,.079,0,.333,.066,.300);
  pulp.material=new THREE.MeshPhysicalMaterial({color:'#86a64b',roughness:.46,clearcoat:.52});
  sph(g,'#d1d69c',0,.136,0,.098,.020,.113,'glass');
  for(let i=0;i<20;i++){
    const a=i*tau/20,r=.151+.034*Math.sin(i*3.7);
    const seed=sph(g,'#463b40',Math.sin(a)*r,.141,Math.cos(a)*r,.012,.007,.023,'satin');
    seed.rotation.y=a;
  }
  return tilt(g,.33);
}
function coconut(){
  const g=new THREE.Group();
  const shell=sph(g,'#a58258',0,-.042,0,.389,.320,.363,'satin');
  shell.material=fabric('#886946');
  sph(g,'#c2a17e',0,.068,0,.390,.064,.367,'satin');
  sph(g,'#fff0cf',0,.109,0,.352,.073,.329,'satin');
  sph(g,'#e3d7b7',0,.160,0,.266,.024,.238,'satin');
  for(let i=0;i<9;i++){
    const a=i*tau/9;
    tubing(g,'#b2926b',[[.348*Math.sin(a),.065,.331*Math.cos(a)],[.382*Math.sin(a+.11),-.032,.344*Math.cos(a+.11)],[.303*Math.sin(a+.22),-.17,.282*Math.cos(a+.22)]],.009,'ribbon');
  }
  return tilt(g,.38);
}
function beachBall(){
  const g=new THREE.Group(), geo=new THREE.SphereGeometry(.432,72,42);
  const p=geo.attributes.position, colors=[];
  const band=['#e27867','#f0cd6b','#79b9a1','#74a6cc','#f8e4b1','#dd9bad'].map(c=>new THREE.Color(c));
  for(let i=0;i<p.count;i++){
    const a=(Math.atan2(p.getZ(i),p.getX(i))+tau)%tau;
    const y=p.getY(i);
    const finish=Math.abs(y)>.406?band[4]:band[Math.min(5,Math.floor((a+1e-5)*6/tau))];
    colors.push(...finish.toArray());
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const ball=mesh(g,geo,cream,0,0,0);
  ball.material=new THREE.MeshPhysicalMaterial({color:'#fff',vertexColors:true,roughness:.28,clearcoat:.69});
  g.rotation.set(.41,.31,-.24);
  return g;
}
function xylophone(){
  const g=new THREE.Group();
  const bars=['#dc796e','#e6a465','#edc16d','#a3b96a','#78afa0','#709cc0','#a388ba'];
  box(g,'#bb8d62',0,-.067,0,.575,.089,.367,.037,'satin');
  for(const side of [-1,1])box(g,'#ad8360',side*.061,-.019,0,.066,.085,.688,.031,'satin');
  bars.forEach((color,i)=>{
    const width=.635-i*.062,z=-.325+i*.104;
    box(g,color,0,.053,z,width,.075,.095,.025);
    for(const x of [-.083,.083])cyl(g,cream,x,.095,z,.012,.012,.017,'metal');
  });
  const stick=box(g,cream,.154,.144,.049,.030,.027,.518,.014,'satin');
  stick.rotation.y=.82;
  sph(g,coral,-.025,.150,-.114,.039,.038,.044);
  return tilt(g,.27);
}
function porcelainPlate(colored){
  const g=new THREE.Group();
  const profile=[[0,-.066],[.252,-.066],[.290,-.051],[.363,.009],[.415,.091],[.408,.116],[.382,.121],[.349,.088],[.293,.032],[.238,.014],[0,.014]];
  mesh(g,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),64),'#fff1dc',0,0,0,'glass');
  for(const [r,color] of [[.405,colored?'#619491':'#b79b7c'],[.362,colored?'#c5806e':'#e2c7a4']]){
    const trim=mesh(g,new THREE.TorusGeometry(r,.008,8,52),color,0,r>.4?.102:.080,0);
    trim.rotation.x=Math.PI/2;
  }
  if(colored)for(let i=0;i<8;i++){
    const a=i*tau/8;
    const leaf=sph(g,i%2?'#84af83':'#c78388',Math.cos(a)*.284,.047,Math.sin(a)*.284,.028,.007,.053,'satin');
    leaf.rotation.y=-a+.2;
  }
  return tilt(g,.28);
}
function enamelTeapot(){
  const g=new THREE.Group();
  const color='#548ca5';
  sph(g,color,-.046,-.040,.033,.286,.251,.310,'glass');
  cyl(g,cream,-.046,.200,.033,.199,.209,.053);
  sph(g,color,-.045,.235,.033,.059,.053,.057);
  tubing(g,color,[[-.271,.065,.092],[-.383,.161,.081],[-.409,.289,.069],[-.304,.372,.055],[-.170,.318,.052],[-.128,.227,.049]],.033);
  tubing(g,color,[[.124,.012,.084],[.237,.052,.091],[.316,.117,.095],[.401,.187,.100]],.057);
  const end=cyl(g,cream,.401,.198,.098,.054,.055,.040);
  end.rotation.z=-.78;
  return tilt(g,.52);
}
const counterBuilders={
  kiwi,coconut,'beach-ball':beachBall,xylophone,
  'plate-white':()=>porcelainPlate(false),'plate-floral':()=>porcelainPlate(true),
  'teapot-blue':enamelTeapot,'camera-rainbow':()=>camera('#c59363',true),
};
const counterItems={
  52:['kiwi','Kiwi','猕猴桃'],46:['coconut','Coconut','椰子'],533:['beach-ball','Beach Ball','沙滩球'],
  262:['xylophone','Xylophone','木琴'],1843:['plate-white','Plate White','瓷盘|餐盘'],
  1838:['plate-floral','Plate Colorful','瓷盘|餐盘'],758:['teapot-blue','Tea Pot Blue','茶壶'],
  824:['camera-rainbow','Camera Rainbow','彩虹相机'],
};
export function counterRebuildKind(item,localName){
  const entry=counterItems[item.sourceItemId];
  if(!entry||item.name!==entry[1]||(localName&&!new RegExp(entry[2]).test(localName)))return null;
  return entry[0];
}

const builders = {
  ...counterBuilders,
  ...familyBuilders,
  ...paletteBuilders,
  ...violetBuilders,
  'concert-treble':()=>treble(true),'concert-keyboard':()=>keyboard('#41325e',true),'concert-jelly':()=>jelly(true),
  ...denseBuilders,
  ...craftBuilders,
  ...marketBuilders,
  bowlingblue: bowlingBall, pinpink: bowlingPin,
  giftyellow: () => gift('#efc55f','#c77154'), giftgreen: () => gift('#9ebb68','#f9e9b4'),
  giftpurple: () => gift('#b887c6','#f6b67e'), gamepad, handheld,
  toytruck: toyTruck, toyrobot: robot, rubik, toytelevision: television, camera,
};
export function playroomRebuildKind(key) {
  return Object.hasOwn(builders, key) ? key : null;
}
export function makePlayroomRebuild(key) {
  if (!templates.has(key)) {
    const original = builders[key]();
    original.updateMatrixWorld(true);
    const groups = new Map();
    original.traverse(item => {
      if (!item.isMesh) return;
      const part = item.geometry.index ? item.geometry.toNonIndexed() : item.geometry.clone();
      part.applyMatrix4(item.matrixWorld);
      if (!groups.has(item.material)) groups.set(item.material, []);
      groups.get(item.material).push(part);
      item.geometry.dispose();
    });
    const root = new THREE.Group();
    for (const [material, pieces] of groups) {
      const ready = new THREE.Mesh(mergeGeometries(pieces), material);
      ready.castShadow = true;
      ready.receiveShadow = true;
      ready.userData.sharedGeometry = true;
      root.add(ready);
      pieces.forEach(piece => piece.dispose());
    }
    const assetRevision = Object.hasOwn(counterBuilders, key) ? 'counter-props-1' : homeIds.has(key) ? 'home-props-1' : Object.hasOwn(familyBuilders, key) ? 'family-props-1' : Object.hasOwn(paletteBuilders, key) ? 'party-props-1' : Object.hasOwn(violetBuilders, key) ? 'violet-props-1' : Object.hasOwn(denseBuilders, key) ? 'dense-props-1' : Object.hasOwn(craftBuilders, key) ? 'craft-props-1' : Object.hasOwn(marketBuilders, key) ? 'market-props-1' : 'playroom-props-1';
    root.userData = {solid:true, assetKind:key.replace(/^concert-/,''), assetRevision:key.startsWith('concert-')?'concert-1529-1':assetRevision};
    templates.set(key, root);
  }
  return templates.get(key).clone(true);
}
