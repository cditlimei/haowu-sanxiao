import * as THREE from 'three';
import {RoundedBoxGeometry} from '../../node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';

const finish=(color,roughness=.22,clearcoat=.94)=>new THREE.MeshPhysicalMaterial({
 color,roughness,clearcoat,clearcoatRoughness:.041,
});
const yellow=finish('#ffcb03'),wing=finish('#ffc321'),orange=finish('#ff6900');
const billSeam=finish('#92320c',.43,0),eye=finish('#251808',.18);
const berryRed=finish('#dc0014'),seedGold=finish('#ffd889',.37,.27),seedWell=finish('#a72021',.34,.35);
const leaf=finish('#4d921e',.31),leafRib=finish('#78b43e',.38,.4);
const aqua=finish('#089cb3'),lightAqua=finish('#71d6df'),ivory=finish('#ffe4b1');
const nozzleWell=finish('#9c3710',.40,.32);
const orb=new THREE.SphereGeometry(1,36,24);
const seedGeometry=new THREE.SphereGeometry(1,16,10);
const templates=new Map();

function piece(group,geometry,material,x,y,z){
 const mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(x,y,z);
 mesh.castShadow=true;
 mesh.receiveShadow=true;
 mesh.userData.sharedGeometry=true;
 group.add(mesh);
 return mesh;
}

function oval(group,material,x,y,z,sx,sy,sz,angle=0,geometry=orb){
 const mesh=piece(group,geometry,material,x,y,z);
 mesh.scale.set(sx,sy,sz);
 mesh.rotation.z=angle;
 return mesh;
}

function block(group,material,x,y,z,w,h,d,r,angle=0){
 const mesh=piece(group,new RoundedBoxGeometry(w,h,d,4,r),material,x,y,z);
 mesh.rotation.z=angle;
 return mesh;
}

function duck(group){
 oval(group,yellow,-.04,-.14,0,.64,.38,.39,.11);
 oval(group,yellow,-.54,-.025,.005,.18,.17,.19,.25);
 oval(group,yellow,.15,.235,.075,.34,.34,.30);
 oval(group,wing,-.105,-.175,.308,.31,.16,.103,-.12);
 oval(group,orange,.48,.14,.18,.213,.075,.14,.12);
 oval(group,billSeam,.50,.155,.197,.174,.018,.134,.12);
 oval(group,orange,.469,.186,.184,.217,.060,.145,.13);
 oval(group,eye,.275,.309,.343,.052,.053,.027);
}

function strawberry(group){
 const shape=new THREE.SphereGeometry(1,52,36);
 const vertex=shape.attributes.position;
 // A full shoulder and a short tapered tip give the berry its recognizable silhouette.
 const widthAt=y=>.485+.148*y-.058*y*y;
 for(let i=0;i<vertex.count;i++){
  const y=vertex.getY(i);
  const width=widthAt(y);
  vertex.setXYZ(i,vertex.getX(i)*width,y*.575-.04,vertex.getZ(i)*width*.77);
 }
 shape.computeVertexNormals();
 piece(group,shape,berryRed,0,0,0);
 for(const [row,y] of [.77,.52,.24,-.06,-.36,-.62,-.82].entries()){
  const count=[9,10,11,11,9,8,5][row];
  const radius=Math.sqrt(1-y*y)*widthAt(y);
  for(let i=0;i<count;i++){
   const angle=(i+(row%2)*.50)*Math.PI*2/count;
   const x=radius*Math.cos(angle),z=radius*.77*Math.sin(angle);
   const normal=new THREE.Vector3(x*2,y*.68,z*3.1).normalize();
   const recess=oval(group,seedWell,x,y*.575-.04,z,.025,.044,.009,0,seedGeometry);
   recess.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
   const seed=oval(group,seedGold,x+normal.x*.007,y*.575-.04+normal.y*.007,z+normal.z*.007,.016,.028,.012,0,seedGeometry);
   seed.quaternion.copy(recess.quaternion);
  }
 }
 for(let i=0;i<5;i++){
  const angle=i*2*Math.PI/5;
  const blade=oval(group,leaf,Math.sin(angle)*.114,.492+Math.cos(angle)*.080,.057+Math.cos(angle)*.088,.062,.167,.033,-angle);
  blade.rotation.x=.38;
 }
 const stem=piece(group,new THREE.CylinderGeometry(.037,.053,.17,24),leaf,.017,.59,.062);
 stem.rotation.z=.22;
 oval(group,leafRib,.051,.523,.162,.044,.095,.022,-.50);
}

function watergun(group){
 block(group,aqua,-.105,.065,0,.94,.43,.38,.17);
 block(group,lightAqua,-.23,.298,.018,.72,.27,.30,.13);
 block(group,aqua,.015,-.239,-.015,.295,.55,.29,.082,.135);
 block(group,orange,.047,-.486,-.005,.365,.124,.32,.053,.135);
 block(group,ivory,-.164,.057,.181,.615,.231,.081,.038);
 oval(group,orange,-.358,.058,.23,.051,.051,.024);
 for(let i=0;i<3;i++){
  block(group,lightAqua,.047-i*.013,-.238-i*.064,.129,.128,.021,.023,.008,.15);
 }
 for(const [x,width,radius,material] of [[.38,.182,.177,orange],[.52,.15,.139,ivory],[-.61,.10,.117,orange],[-.67,.06,.108,ivory]]){
  piece(group,new THREE.CylinderGeometry(radius,radius,width,36),material,x,.092,0).rotation.z=-Math.PI/2;
 }
 const mouth=piece(group,new THREE.TorusGeometry(.083,.022,14,36),orange,.595,.092,0);
 mouth.rotation.y=Math.PI/2;
 piece(group,new THREE.CircleGeometry(.072,36),nozzleWell,.604,.092,0).rotation.y=Math.PI/2;
}

const builders={duck,strawberry,watergun};

export function makeStarterToy(key){
 if(!templates.has(key)){
  const group=new THREE.Group();
  builders[key](group);
  const bounds=new THREE.Box3().setFromObject(group);
  const center=bounds.getCenter(new THREE.Vector3());
  for(const mesh of group.children)mesh.position.sub(center);
  group.userData.solid=true;
  templates.set(key,group);
 }
 return templates.get(key).clone(true);
}
