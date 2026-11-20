import * as THREE from 'three';
import {RoundedBoxGeometry} from '../../node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

const templates=new Map();
const finish=(name,color,roughness,clearcoat=0)=>new THREE.MeshPhysicalMaterial({
 name,color,roughness,clearcoat,clearcoatRoughness:clearcoat>.65?.052:.22,
});
const duckYellow=finish('Duck lacquer','#ffcd1d',.23,.92);
const duckWing=finish('Duck wing lacquer','#ffc327',.25,.85);
const coral=finish('Orange lacquer','#ff7828',.23,.84);
const coralDark=finish('Beak seam','#a63a15',.56);
const black=finish('Dark polished bead','#271c16',.23,.65);
const green=finish('Orchard leaf','#578325',.40,.35);
const bark=finish('Woody fruit stem','#764726',.67);
const berry=finish('Berry skin','#bc061b',.27,.83);
const seed=finish('Golden berry seed','#f7d38a',.51,.18);
const seedBed=finish('Berry seed recess','#a71b23',.47,.22);
const blue=finish('Teal molded resin','#129ba9',.24,.87);
const aqua=finish('Aqua colored resin','#77d8df',.23,.86);
const cream=finish('Molded cream resin','#ffe8c5',.29,.74);
const richerTeal=finish('Teal soft grip','#137a88',.39,.52);

const orb=new THREE.SphereGeometry(1,38,26);
const seedBall=new THREE.SphereGeometry(1,12,8);
function add(group,geometry,material,x=0,y=0,z=0){
 const mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(x,y,z);group.add(mesh);return mesh;
}
function oval(group,material,x,y,z,a,b,c,angle=0,geometry=orb){
 const mesh=add(group,geometry.clone(),material,x,y,z);
 mesh.scale.set(a,b,c);mesh.rotation.z=angle;return mesh;
}
function box(group,w,h,d,r,material,x,y,z,angle=0){
 const mesh=add(group,new RoundedBoxGeometry(w,h,d,3,r),material,x,y,z);
 mesh.rotation.z=angle;return mesh;
}
function tube(group,points,radius,material){
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 return add(group,new THREE.TubeGeometry(path,22,radius,10,false),material);
}

function duck(){
 const g=new THREE.Group();
 oval(g,duckYellow,-.05,-.168,0,.568,.335,.352,.12);
 oval(g,duckYellow,-.515,-.019,.018,.186,.141,.170,.44);
 oval(g,duckYellow,.130,.147,.070,.280,.288,.260,.03);
 oval(g,duckWing,-.134,-.156,.294,.291,.129,.079,-.205);
 oval(g,duckWing,-.134,-.156,-.294,.291,.129,.079,-.205);
 for(const sign of [-1,1])oval(g,black,.233,.207,.264*sign+(.07),.043,.047,.022);
 oval(g,coral,.404,.062,.119,.183,.056,.114,.075);
 oval(g,coralDark,.418,.084,.132,.164,.017,.111,.09);
 oval(g,coral,.410,.107,.131,.181,.041,.112,.095);
 g.rotation.set(.12,-.10,.028);
 return g;
}

const seedRows=[[.74,9],[.51,11],[.25,11],[-.02,12],[-.29,10],[-.54,9],[-.77,7]];
function berryPoint(y,angle){
 const width=.455+.133*y-.037*y*y;
 const r=width*Math.sqrt(1-y*y);
 return new THREE.Vector3(Math.cos(angle)*r,.539*y-.047,Math.sin(angle)*r*.81);
}
function strawberry(natural=false){
 const g=new THREE.Group();
 const openings=[];
 for(const [i,[y,count]] of seedRows.entries())for(let j=0;j<count;j++){
  const a=(j+(i%2)*.48)*Math.PI*2/count;
  const actualY=y+(natural?.032:.014)*Math.sin(j*3.1+i);
  const p=berryPoint(actualY,a+(natural?.060*Math.sin(i*9+j*4):0));
  const normal=new THREE.Vector3(Math.cos(a)*.8,actualY*.83,Math.sin(a)).normalize();
  openings.push({p,normal});
  if(natural){
   const size=1+.17*Math.sin(i*13+j*2);
   const center=p.clone().addScaledVector(normal,-.012);
   const core=oval(g,seed,center.x,center.y,center.z,.011*size,.022*size,.007,0,seedBall);
   core.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
   core.rotateZ(.22*Math.sin(j+i));
   continue;
  }
  const dimple=oval(g,seedBed,p.x,p.y,p.z,.027,.040,.008,0,seedBall);
  dimple.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
  const core=oval(g,seed,p.x+normal.x*.002,p.y+normal.y*.002,p.z+normal.z*.002,.016,.027,.010,0,seedBall);
  core.quaternion.copy(dimple.quaternion);
 }
 const shape=new THREE.SphereGeometry(1,natural?112:72,natural?84:55);
 const position=shape.attributes.position,vector=new THREE.Vector3();
 const fleshColors=natural?new Float32Array(position.count*3):null;
 const smoothNormals=natural?new Float32Array(position.count*3):null;
 for(let i=0;i<position.count;i++){
  const y=position.getY(i),a=Math.atan2(position.getZ(i),position.getX(i));
  const p=berryPoint(y,a);
  if(natural){
   // Normal of the undimpled elliptical fruit. Blend it with the pit normal
   // so the wax reflection spans adjacent seeds instead of circling each one.
   const w=.455+.133*y-.037*y*y,s=Math.sqrt(Math.max(0,1-y*y));
   vector.set(.539*s*Math.cos(a),w*y-(.133-.074*y)*s*s,.539*s*Math.sin(a)/.81).normalize().toArray(smoothNormals,i*3);
  }
  let depth=0;
  for(const entry of openings){
   const dx=(entry.p.x-p.x)/.059,dy=(entry.p.y-p.y)/.069,dz=(entry.p.z-p.z)/.056;
   depth=Math.max(depth,(natural?.019:.014)*Math.max(0,1-dx*dx-dy*dy-dz*dz)**2);
  }
  if(natural){
   const pocket=depth/.019;
   const mottling=Math.sin(5*a+7*y)*Math.sin(3*a-9*y)*.06;
   fleshColors.set([.95+mottling-.25*pocket,.72+.19*y- .32*pocket,.62+.13*y-.25*pocket],i*3);
  }
  vector.set(Math.cos(a),y*.6,Math.sin(a)).normalize();
  p.addScaledVector(vector,-depth);
  position.setXYZ(i,p.x,p.y,p.z);
 }
 shape.computeVertexNormals();
 if(natural){
  shape.setAttribute('color',new THREE.BufferAttribute(fleshColors,3));
  const normals=shape.attributes.normal,base=new THREE.Vector3();
  for(let i=0;i<normals.count;i++){
   base.fromArray(smoothNormals,i*3);
   vector.fromBufferAttribute(normals,i).lerp(base,.69).normalize();
   normals.setXYZ(i,vector.x,vector.y,vector.z);
  }
 }
 add(g,shape,berry);
 for(let i=0;i<6;i++){
  const a=i*Math.PI*2/6;
  if(natural){
   const verts=[],indices=[];
   for(let j=0;j<=12;j++){
    const t=j/12,r=.009+t*(.26+.035*Math.sin(i*3)),w=.052*Math.sin(Math.PI*t)**.85;
    for(const side of [-1,0,1]){
     verts.push(Math.sin(a)*r+Math.cos(a)*side*w,.497-.075*t*t+.036*Math.sin(Math.PI*t)-Math.abs(side)*w*.27,.045+Math.cos(a)*r-Math.sin(a)*side*w);
    }
    if(j)for(let k=0;k<2;k++){const b=3*j+k;indices.push(b-3,b,b-2,b-2,b,b+1);}
   }
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
   geometry.setIndex(indices);geometry.computeVertexNormals();add(g,geometry,green);
   continue;
  }
  const blade=oval(g,green,Math.sin(a)*.11,.425+Math.cos(a)*.076,.064+Math.cos(a)*.103,.055,.148,.025,-a);
  blade.rotation.x=.31+(i%3)*.14;
 }
 tube(g,[[.017,.446,.101],[.023,.491,.106],[.046,.532,.091]],.034,green);
 g.rotation.set(.09,-.14,-.075);
 return g;
}

function watergun(){
 const g=new THREE.Group();
 const grip=box(g,.276,.404,.245,.084,richerTeal,.077,-.246,.007,.24);
 grip.rotation.y=-.07;
 box(g,.294,.107,.281,.049,coral,.124,-.421,.006,.21);
 box(g,.765,.337,.312,.105,blue,-.048,.038,0,-.08);
 oval(g,aqua,-.222,.265,.004,.292,.127,.159,-.063);
 for(const side of [-1,1]){
  box(g,.453,.152,.050,.040,cream,-.113,.049,side*.149,-.08);
  oval(g,coral,-.273,.060,side*.176,.047,.045,.020,-.08);
  for(let i=0;i<3;i++)box(g,.110,.016,.018,.008,aqua,.066+i*.010,-.231-i*.042,side*.126,.24);
 }
 for(const [x,r,length,color] of [[-.449,.129,.120,cream],[-.374,.133,.074,coral],[.333,.159,.132,coral],[.434,.128,.125,cream]]){
  const cylinder=new THREE.CylinderGeometry(r,r,length,40).rotateZ(Math.PI/2);
  add(g,cylinder,color,x,.007,0);
 }
 const rim=new THREE.TorusGeometry(.083,.019,12,36).rotateY(Math.PI/2);
 add(g,rim,coral,.497,.007,.001);
 const well=new THREE.CircleGeometry(.074,36).rotateY(Math.PI/2);
 add(g,well,coralDark,.498,.007,.001);
 g.rotation.set(.12,.04,-.15);
 return g;
}

function produceMaterial(kind){
 const palette={
  pear:['#b3bb4a','#7c8831','#d4ce69'],
  cherry:['#a91b37','#651b31','#da4558'],
  lemon:['#ffce33','#db9f23','#ffe674'],
  banana:['#f9cc50','#ad7c2f','#fde47a'],
 }[kind];
 const canvas=Object.assign(document.createElement('canvas'),{width:480,height:288});
 const ctx=canvas.getContext('2d');
 const grad=ctx.createLinearGradient(0,0,480,288);
 grad.addColorStop(0,palette[1]);grad.addColorStop(.44,palette[0]);grad.addColorStop(.77,palette[2]);grad.addColorStop(1,palette[0]);
 ctx.fillStyle=grad;ctx.fillRect(0,0,480,288);
 let n=kind.length*1739;
 const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<3100;i++){
  ctx.globalAlpha=.06+random()*.24;
  ctx.fillStyle=i%2?palette[1]:palette[2];
  const x=random()*480,y=random()*288,rad=.35+random()*1.35;
  ctx.beginPath();ctx.ellipse(x,y,rad,rad*(.7+random()*.6),0,0,Math.PI*2);ctx.fill();
 }
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
 const material=finish(kind+' orchard skin','#ffffff',kind==='cherry'?.31:.47,kind==='cherry'?.77:.32);
 material.map=map;
 return material;
}
function lathe(group,points,material){
 const profile=new THREE.SplineCurve(points.map(p=>new THREE.Vector2(...p))).getPoints(54);
 profile.forEach(point=>{point.x=Math.max(point.x,0);});
 return add(group,new THREE.LatheGeometry(profile,62),material);
}
function pear(){
 const g=new THREE.Group();
 lathe(g,[[0,-.438],[.152,-.446],[.272,-.406],[.359,-.319],[.375,-.20],[.329,-.079],[.248,.035],
  [.184,.149],[.173,.258],[.132,.360],[.062,.395],[0,.388]],produceMaterial('pear'));
 tube(g,[[.008,.360,.031],[.023,.436,.049],[.049,.493,.056]],.020,bark);
 oval(g,green,.108,.421,.070,.114,.042,.022,-.32);
 g.rotation.set(.16,0,-.15);
 return g;
}
function lemon(){
 const g=new THREE.Group();
 lathe(g,[[0,-.48],[.050,-.458],[.090,-.399],[.201,-.356],[.287,-.267],
  [.326,-.105],[.327,.055],[.288,.195],[.214,.307],[.094,.384],[.069,.421],[0,.453]],produceMaterial('lemon'));
 oval(g,green,.092,.348,.074,.096,.043,.024,-.26);
 tube(g,[[0,.398,.028],[.001,.429,.037],[.014,.447,.041]],.016,bark);
 g.rotation.set(.18,.09,-.31);
 return g;
}
function cherry(){
 const g=new THREE.Group(),paint=produceMaterial('cherry');
 oval(g,paint,-.208,-.154,.019,.247,.223,.222,.17);
 oval(g,paint,.217,-.221,-.009,.250,.221,.234,-.11);
 tube(g,[[-.195,.024,.035],[-.156,.156,.027],[-.069,.296,.020],[.079,.400,.017]],.016,green);
 tube(g,[[.207,-.035,.021],[.195,.126,.020],[.142,.284,.024],[.079,.400,.017]],.015,green);
 oval(g,green,.148,.368,.032,.118,.041,.023,-.54);
 g.rotation.set(.16,0,-.06);
 return g;
}
function banana(){
 const g=new THREE.Group();
 const path=new THREE.CatmullRomCurve3([[-.291,.392,0],[-.335,.177,.011],[-.239,-.065,.014],[.021,-.213,.035],[.325,-.144,-.018]].map(p=>new THREE.Vector3(...p)));
 const body=new THREE.TubeGeometry(path,64,1,18,false),attr=body.attributes.position;
 for(let i=0;i<=64;i++){
  const t=i/64,point=path.getPointAt(t),radius=.027+.103*Math.sin(t*Math.PI)**.68;
  for(let j=0;j<=18;j++){
   const n=i*19+j,r=radius*(1+.058*Math.cos(j*Math.PI/9*5));
   attr.setXYZ(n,point.x+(attr.getX(n)-point.x)*r,point.y+(attr.getY(n)-point.y)*r,point.z+(attr.getZ(n)-point.z)*r);
  }
 }
 body.computeVertexNormals();add(g,body,produceMaterial('banana'));
 oval(g,bark,.324,-.144,-.018,.030,.028,.032,.17);
 tube(g,[[-.29,.378,0],[-.261,.430,.011],[-.226,.451,.009]],.026,green);
 g.rotation.set(.10,.09,-.17);
 return g;
}

const builders={duck,strawberry,lessonBerry:()=>strawberry(true),watergun,pear,banana,cherry,lemon};
export const hasToyGardenRebuild=key=>Object.hasOwn(builders,key);
function build(key){
 const pieces=builders[key]();
 if(key==='watergun')pieces.scale.setScalar(1.10);
 if(key==='duck')pieces.scale.setScalar(1.03);
 pieces.updateMatrixWorld(true);
 const root=new THREE.Group(),batches=new Map();
 pieces.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);
  if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
  if(!batches.has(mesh.material))batches.set(mesh.material,[]);
  batches.get(mesh.material).push(geometry);
  mesh.geometry.dispose();
 });
 for(const [material,parts] of batches){
  const piece=add(root,mergeGeometries(parts),material);
  piece.castShadow=true;piece.receiveShadow=true;piece.userData.sharedGeometry=true;
  parts.forEach(part=>part.dispose());
 }
 const center=new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
 root.children.forEach(piece=>piece.position.sub(center));
 root.userData={solid:true,assetKind:key,assetRevision:'toy-garden-1'};
 return root;
}
export function makeToyGardenRebuild(key){
 if(!templates.has(key))templates.set(key,build(key));
 return templates.get(key).clone(true);
}
