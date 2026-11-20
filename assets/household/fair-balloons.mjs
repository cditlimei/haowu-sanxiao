import * as T from '../../node_modules/three/build/three.module.js';

const finishes={
 'balloon-star':['#f5a823','#b66c19'],
 'balloon-heart':['#e54a63','#ae2a50'],
 'balloon-bear':['#52b7ca','#216b89'],
 'balloon-round':['#8d59d5','#532b9a'],
};
export function isFairBalloon(key){
 return Object.hasOwn(finishes,key);
}

function outline(key,count){
 if(key==='balloon-star')return Array.from({length:count},(_,i)=>{
  const angle=i/count*Math.PI*2;
  const radius=.414+.078*Math.cos(5*angle)+.015*Math.cos(10*angle);
  return new T.Vector2(-Math.sin(angle)*radius,.055+Math.cos(angle)*radius);
 });
 if(key==='balloon-round')return Array.from({length:count},(_,i)=>{
  const angle=i/count*Math.PI*2;
  return new T.Vector2(Math.cos(angle)*.39,.05+Math.sin(angle)*.428);
 });
 const path=new T.CurvePath();
 const cubic=(a,b,c,d)=>path.add(new T.CubicBezierCurve(...[a,b,c,d].map(([x,y])=>new T.Vector2(x,y))));
 if(key==='balloon-heart'){
  cubic([0,.289],[-.195,.553],[-.467,.402],[-.442,.179]);
  cubic([-.442,.179],[-.416,-.016],[-.166,-.222],[0,-.352]);
  cubic([0,-.352],[.166,-.222],[.416,-.016],[.442,.179]);
  cubic([.442,.179],[.467,.402],[.195,.553],[0,.289]);
 }else{
  cubic([.217,.357],[.374,.545],[.530,.341],[.350,.224]);
  cubic([.350,.224],[.557,-.157],[.244,-.351],[0,-.351]);
  cubic([0,-.351],[-.244,-.351],[-.557,-.157],[-.350,.224]);
  cubic([-.350,.224],[-.530,.341],[-.374,.545],[-.217,.357]);
  cubic([-.217,.357],[-.100,.392],[.100,.392],[.217,.357]);
 }
 const points=Array.from({length:count},(_,i)=>path.getPoint(i/count));
 return T.ShapeUtils.isClockWise(points)?points.reverse():points;
}

function cushion(points,rings){
 const positions=[],indices=[],n=points.length;
 for(let j=0;j<=2*rings;j++){
  const angle=j/(2*rings)*Math.PI;
  const radius=Math.max(.001,Math.sin(angle));
  for(let i=0;i<n;i++){
   const edge=points[i];
   const pleat=.011*Math.sin(i/n*32*Math.PI)*radius**11;
   positions.push(edge.x*radius,.055+(edge.y-.055)*radius,
    Math.cos(angle)*(.153+pleat)*(1-.18*radius**4));
  }
 }
 for(let j=0;j<rings*2;j++)for(let i=0;i<n;i++){
  const a=j*n+i,b=j*n+(i+1)%n,c=a+n,d=b+n;
  indices.push(a,c,b,b,c,d);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 return geometry;
}

export function buildFairBalloon(key,high=false){
 const [color,edge]=finishes[key];
 const width=high?100:60;
 const points=outline(key,width);
 const group=new T.Group();
 group.name=key;
 const foil=new T.MeshPhysicalMaterial({name:'Inflated satin foil',color,metalness:.24,roughness:.36,
  clearcoat:.43,clearcoatRoughness:.32});
 const seam=new T.MeshStandardMaterial({name:'Welded foil seam',color:edge,roughness:.5,metalness:.21});
 const add=(geo,mat,x=0,y=0,z=0)=>{
  const mesh=new T.Mesh(geo,mat);
  mesh.position.set(x,y,z);
  group.add(mesh);
  return mesh;
 };
 add(cushion(points,high?18:10),foil);
 const border=new T.CatmullRomCurve3(points.map(point=>new T.Vector3(point.x,point.y,0)),true);
 add(new T.TubeGeometry(border,width,.011,high?8:4,true),seam);
 const knotY=Math.min(...points.map(point=>point.y));
 const neck=new T.Mesh(new T.CylinderGeometry(.020,.046,.064,high?24:12),foil);
 neck.position.y=knotY-.027;
 group.add(neck);
 const ribbon=new T.CubicBezierCurve3(
  new T.Vector3(0,knotY-.05,0),new T.Vector3(.085,knotY-.10,.025),
  new T.Vector3(-.084,knotY-.153,.026),new T.Vector3(.04,knotY-.191,.014),
 );
 add(new T.TubeGeometry(ribbon,high?28:14,.009,high?8:4),seam);
 if(key==='balloon-bear'){
  const ink=new T.MeshStandardMaterial({name:'Printed bear face',color:'#14324c',roughness:.46});
  const cream=new T.MeshStandardMaterial({name:'Ivory muzzle',color:'#fff4ce',roughness:.48});
  const sphere=(m,x,y,z,sx,sy,sz)=>{
   add(new T.SphereGeometry(1,high?28:18,high?16:12),m,x,y,z).scale.set(sx,sy,sz);
  };
  sphere(cream,0,-.082,.139,.107,.073,.018);
  for(const x of [-.095,.095])sphere(ink,x,.046,.151,.022,.028,.007);
  sphere(ink,0,-.067,.157,.033,.017,.008);
 }
 group.userData.solid=true;
 return group;
}
