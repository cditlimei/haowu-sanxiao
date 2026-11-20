import {printInk} from '../real-surfaces/print-ink.mjs';
import * as THREE from 'three';
import {RoundedBoxGeometry} from '../../node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

const tau = Math.PI * 2;
const molds = new Map();
const materials = new Map();

function surface(color, finish = 'glaze') {
  const key = color + finish;
  if (!materials.has(key)) {
    const properties = {
      glaze: {roughness:.27,clearcoat:.79,clearcoatRoughness:.13},
      matte: {roughness:.78,clearcoat:.13},
      ribbon: {roughness:.62,clearcoat:.20},
      satin: {roughness:.52,clearcoat:.33,sheen:.27,sheenColor:new THREE.Color(color)},
      metal: {roughness:.36,metalness:.76},
      ice: {roughness:.22,clearcoat:.95,clearcoatRoughness:.07,transmission:.16,thickness:.19,ior:1.31},
    };
    materials.set(key,new THREE.MeshPhysicalMaterial({color,...properties[finish]}));
  }
  return materials.get(key);
}
function mesh(group, geometry, color, x=0, y=0, z=0, finish) {
  const mesh = new THREE.Mesh(geometry,surface(color,finish));
  mesh.position.set(x,y,z);
  group.add(mesh);
  return mesh;
}
function box(group, color, width,height,depth,radius,x,y,z,finish) {
  return mesh(group,new RoundedBoxGeometry(width,height,depth,3,radius),color,x,y,z,finish);
}
function oval(group,color,a,b,c,x,y,z,finish,detail=20) {
  const solid=mesh(group,new THREE.SphereGeometry(1,detail,Math.ceil(detail*.66)),color,x,y,z,finish);
  solid.scale.set(a,b,c);
  return solid;
}
function ring(group,color,radius,thickness,x,y,z,finish,arc=tau) {
  return mesh(group,new THREE.TorusGeometry(radius,thickness,8,36,arc),color,x,y,z,finish);
}
function disk(group,color,radius,base,height,x,y,z,finish) {
  return mesh(group,new THREE.CylinderGeometry(radius,base,height,40),color,x,y,z,finish);
}
function tube(group,color,points,radius,finish) {
  const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
  return mesh(group,new THREE.TubeGeometry(curve,18,radius,8),color,0,0,0,finish);
}
function printed(group,width,depth,x,y,z,paint,roughness=.62) {
  const canvas=Object.assign(document.createElement('canvas'),{width:512,height:512});
  const context=canvas.getContext('2d');
  paint(context,512);
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=4;
  const panel=mesh(group,new THREE.PlaneGeometry(width,depth),'#ffffff',x,y,z);
  panel.material=new THREE.MeshPhysicalMaterial({map,roughness,clearcoat:.23});
  panel.rotation.x=-Math.PI/2;
  return panel;
}
function turn(group,angle=.35) {
  group.rotation.set(angle,-.18,-.09);
  return group;
}

function baked(group,radii,center) {
  const [a,b,c]=radii,[x,y,z]=center;
  const crust=oval(group,'#b27643',a,b,c,x,y,z,'matte',34);
  const positions=crust.geometry.attributes.position;
  const uv=crust.geometry.attributes.uv;
  const colors=[];
  const dark=new THREE.Color('#b87648'),gold=new THREE.Color('#f0bf82'),pale=new THREE.Color('#f7d7a4');
  for(let i=0;i<positions.count;i++){
    const grain=Math.sin(uv.getX(i)*277+uv.getY(i)*183)*.03;
    const p=(positions.getY(i)+1)/2;
    colors.push(...dark.clone().lerp(gold,p).lerp(pale,Math.max(0,p-.63)*1.9+grain).toArray());
  }
  crust.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  crust.material=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.69,clearcoat:.16});
  return crust;
}
function bearBread(){
  const g=new THREE.Group();
  baked(g,[.350,.150,.348],[0,0,.034]);
  for(const x of [-.249,.249]){
    baked(g,[.133,.107,.125],[x,.009,-.231]);
    oval(g,'#d79663',.067,.014,.068,x,.111,-.239,'matte');
    oval(g,'#775043',.022,.009,.028,x*.45,.144,-.038,'matte');
  }
  baked(g,[.117,.043,.093],[0,.117,.080]);
  oval(g,'#7c5140',.033,.015,.024,0,.160,.051,'matte');
  return turn(g,.26);
}
function pinCushion(){
  const g=new THREE.Group();
  disk(g,'#b99063',.308,.269,.102,0,-.076,0,'satin');
  oval(g,'#5b86af',.310,.140,.290,0,.006,0,'satin',30);
  const thread=ring(g,'#97a9bc',.277,.009,0,.048,0,'satin');
  thread.rotation.x=Math.PI/2;
  for(const [x,z,shade] of [[-.15,-.08,'#df9c73'],[.151,-.08,'#eed79e'],[-.07,.11,'#8ab292'],[.11,.13,'#d98fa9'],[.01,-.155,'#f1e0aa']]){
    tube(g,'#c8c1b1',[[x,.073,z],[x-.018,.155,z],[x-.038,.211,z+.02]],.008,'metal');
    oval(g,shade,.029,.029,.029,x-.038,.211,z+.02);
  }
  return turn(g,.38);
}

function boundBook({coil=false,title='',color='#4d7ca3',label=''}={}){
  const g=new THREE.Group();
  const coverWidth=.625;
  box(g,'#e6ca9f',.586,.135,.795,.018,.014,-.005,0,'matte');
  for(const y of [-.054,-.017,.031,.055])box(g,'#c3a787',.005,.004,.750,.001,.307,y,0,'matte');
  box(g,color,coverWidth,.029,.829,.014,0,-.078,0,'satin');
  box(g,color,coverWidth,.043,.831,.021,0,.071,0,'satin');
  if(coil){
    for(let i=0;i<9;i++){
      const wire=ring(g,'#c4a574',.057,.009,-.302,.048,(i-4)*.078,'metal');
      box(g,'#4f5867',.028,.004,.029,.003,-.268,.095,(i-4)*.078,'matte');
      wire.rotation.z=-.15;
    }
  } else box(g,color,.071,.180,.827,.028,-.299,-.004,0,'satin');
  printed(g,.572,.774,.014,.095,0,(ctx,size)=>{
    ctx.fillStyle=color;ctx.fillRect(0,0,size,size);
    ctx.strokeStyle='#c2ad88';ctx.lineWidth=7;ctx.strokeRect(34,31,444,449);
    ctx.lineWidth=2;ctx.strokeRect(48,43,416,426);
    ctx.fillStyle='#ead7af';
    if(title){
      ctx.fillStyle='#fff1d1';ctx.fillRect(38,132,436,213);
      ctx.fillStyle='#233832';ctx.textAlign='center';ctx.font='bold 106px sans-serif';printInk(ctx,title,256,254,406);
      ctx.font='34px sans-serif';printInk(ctx,label,256,317,370);
    }else{
      ctx.beginPath();ctx.roundRect(121,104,277,115,14);ctx.fill();
      ctx.strokeStyle='#8d9c9c';ctx.lineWidth=3;
      for(let y=150;y<=188;y+=16){ctx.beginPath();ctx.moveTo(156,y);ctx.lineTo(370,y);ctx.stroke();}
    }
  });
  return turn(g,.22);
}
function ruler(flexible,color=flexible?'#729fb4':'#5d8fac'){
  const g=new THREE.Group();
  if(flexible){
    const outline=new THREE.Shape();
    outline.moveTo(-.093,-.435);
    outline.bezierCurveTo(.050,-.172,-.163,.168,-.066,.435);
    outline.lineTo(.069,.435);
    outline.bezierCurveTo(-.027,.173,.187,-.173,.043,-.435);
    outline.closePath();
    const strip=mesh(g,new THREE.ExtrudeGeometry(outline,{depth:.037,bevelEnabled:true,bevelSegments:3,bevelSize:.016,bevelThickness:.012,steps:1}),color,0,0,0,'satin');
    strip.rotation.x=-Math.PI/2;
  }else box(g,color,.199,.069,.912,.022,0,0,0);
  for(let i=0;i<24;i++){
    const z=-.400+i*.034;
    const offset=flexible?Math.sin(z*7)*.043:0;
    const line=i%5===0?.068:i%2===0?.037:.021;
    box(g,'#faf0cd',line,.004,.006,.001,offset-.066+line/2,.040,z,'matte');
  }
  g.rotation.set(.23,-.48,-.15);
  return g;
}
function ice(){
  const g=new THREE.Group();
  const block=new RoundedBoxGeometry(.64,.53,.61,5,.113);
  const position=block.attributes.position;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    position.setXYZ(i,x+.013*Math.sin(15*z+10*y),y+.024*Math.sin(9*x-14*z),z+.014*Math.sin(12*x+9*y));
  }
  block.computeVertexNormals();
  mesh(g,block,'#b3dbe2',0,0,0,'ice');
  for(const [x,y,z,s] of [[-.137,.072,.199,.023],[.076,.101,.217,.028],[.153,.103,-.088,.018],[.006,.182,.074,.023]]){
    oval(g,'#deeff0',s,s*.49,s,x,y,z,'ice');
  }
  tube(g,'#d8ebec',[[-.202,.224,-.159],[-.107,.254,-.108],[-.044,.257,-.096],[.011,.251,-.021]],.006,'ice');
  return turn(g,.49);
}
function egg(halved){
  const g=new THREE.Group();
  if(halved){
    oval(g,'#ead6b6',.287,.148,.390,0,-.043,0,'matte');
    oval(g,'#fff0d1',.278,.060,.372,0,.072,0,'satin');
    oval(g,'#edb34c',.147,.053,.156,0,.117,.069,'satin');
    for(let i=0;i<10;i++){
      oval(g,'#f1c473',.012,.004,.012,Math.cos(i*2.2)*.093,.158+.004*Math.sin(i),.069+Math.sin(i*2.2)*.089,'matte',10);
    }
  }else{
    const shell=oval(g,'#fff0d7',.288,.284,.407,0,0,0,'satin',34);
    const p=shell.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const taper=1+.19*p.getZ(i);
      p.setX(i,p.getX(i)*taper);
      p.setY(i,p.getY(i)*taper);
    }
    shell.geometry.computeVertexNormals();
  }
  return turn(g,.27);
}
function tambourine(color='#d886a5'){
  const g=new THREE.Group();
  const shell=ring(g,color,.311,.072,0,.009,0);
  shell.rotation.x=Math.PI/2;
  const skin=disk(g,'#f5e2c4',.319,.319,.014,0,.031,0,'satin');
  skin.rotation.y=.22;
  for(let i=0;i<8;i++){
    const a=i*tau/8,x=.331*Math.sin(a),z=.331*Math.cos(a);
    for(const y of [-.015,.017])disk(g,'#c5a877',.052,.052,.012,x,y,z,'metal');
    oval(g,'#c87898',.018,.021,.018,x*.75,.063,z*.75);
  }
  return turn(g,.48);
}
function hanoi(){
  const g=new THREE.Group();
  box(g,'#c68959',.571,.093,.557,.041,0,-.184,0,'satin');
  disk(g,'#ae7650',.044,.055,.505,0,.071,0,'satin');
  for(const [i,paint] of ['#dd8668','#e8bc68','#88aa76','#6f9da8','#b692b7'].entries()){
    const hoop=ring(g,paint,.214-i*.027,.044-i*.003,0,-.118+i*.080,0);
    hoop.rotation.x=Math.PI/2;
  }
  oval(g,'#deb477',.047,.041,.046,0,.336,0,'satin');
  return turn(g,.46);
}

function orange(){
  const g=new THREE.Group();
  const fruit=oval(g,'#e39440',.416,.365,.412,0,0,0,'glaze',44);
  const canvas=Object.assign(document.createElement('canvas'),{width:512,height:256});
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#777';ctx.fillRect(0,0,512,256);
  for(let i=0;i<4300;i++){
    const x=(Math.sin(i*43.71)*.5+.5)*512,y=(Math.cos(i*17.39)*.5+.5)*256;
    ctx.fillStyle=i%3===0?'#a8a8a8':'#565656';ctx.fillRect(x,y,1.4,1.2);
  }
  const bumpMap=new THREE.CanvasTexture(canvas);bumpMap.anisotropy=4;
  fruit.material=new THREE.MeshPhysicalMaterial({color:'#ed8c31',roughness:.44,clearcoat:.52,bumpMap,bumpScale:.014});
  oval(g,'#8a8145',.065,.018,.058,0,.358,0,'matte');
  oval(g,'#7f9e4b',.128,.021,.049,.101,.366,-.015,'satin').rotation.y=.32;
  return turn(g,.42);
}
function cheese(slice){
  const g=new THREE.Group(),shape=new THREE.Shape();
  shape.moveTo(-.358,.184);shape.lineTo(.377,.189);shape.lineTo(.295,-.313);shape.closePath();
  const block=mesh(g,new THREE.ExtrudeGeometry(shape,{depth:slice?.084:.28,bevelSize:.029,bevelThickness:.018,bevelEnabled:true,bevelSegments:4,curveSegments:6,steps:1}),'#e6a548',0,-.077,0,'satin');
  block.rotation.x=-Math.PI/2;
  for(const [x,z,r] of [[-.102,-.08,.048],[.126,.081,.056],[.249,.193,.031],[.236,-.14,.042]]){
    if(z>.18)continue;
    disk(g,'#bf803c',r,r,.007,x,slice?.013:.209,z,'matte');
    const edge=ring(g,'#eabc6a',r,.009,x,slice?.017:.212,z,'satin');
    edge.rotation.x=Math.PI/2;
  }
  return turn(g,.36);
}
function poolBall(number=14,paint='#5c976a'){
  const g=new THREE.Group(),geometry=new THREE.SphereGeometry(.416,48,32);
  const canvas=Object.assign(document.createElement('canvas'),{width:1024,height:512});
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=number>8?'#f2e4c4':paint;
  ctx.fillRect(0,0,1024,512);
  if(number>8){
    ctx.fillStyle=paint;
    ctx.fillRect(0,181,1024,150);
  }
  ctx.font='bold 104px sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  for(const x of [256,768]){
    ctx.beginPath();
    ctx.ellipse(x,256,62,62,0,0,tau);
    ctx.fillStyle='#f8ebd0';
    ctx.fill();
    ctx.fillStyle='#383831';
    printInk(ctx,String(number),x,260,100);
  }
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=4;
  const ball=mesh(g,geometry,'#ffffff',0,0,0);
  ball.material=new THREE.MeshPhysicalMaterial({map,clearcoat:.89,roughness:.24});
  g.rotation.set(.23,-.20,.08);
  return g;
}
function blueBowl(){
  const g=new THREE.Group();
  const profile=[[0,-.177],[.160,-.177],[.174,-.140],[.251,-.130],[.340,-.032],[.377,.069],[.365,.089],[.343,.075],[.313,.014],[.23,-.098],[0,-.106]];
  mesh(g,new THREE.LatheGeometry(profile.map(r=>new THREE.Vector2(...r)),56),'#f6ead1');
  const lidProfile=[[0,.215],[.077,.210],[.217,.182],[.302,.152],[.369,.113],[.367,.087],[.310,.107],[0,.162]];
  mesh(g,new THREE.LatheGeometry(lidProfile.map(r=>new THREE.Vector2(...r)),56),'#f6ead1');
  disk(g,'#547fa1',.083,.063,.071,0,.228,0);
  for(const [r,y] of [[.359,.089],[.315,.142],[.195,-.143]]){
    const line=ring(g,'#6288aa',r,.014,0,y,0);
    line.rotation.x=Math.PI/2;
  }
  for(let i=0;i<10;i++){
    const a=i*tau/10;
    const petal=oval(g,'#6388ac',.018,.009,.055,.238*Math.sin(a),.181,.238*Math.cos(a));
    petal.rotation.set(Math.cos(a)*.17,a,Math.sin(a)*.21);
  }
  return turn(g,.46);
}
function cookie(){
  const g=new THREE.Group();
  const dough=new THREE.SphereGeometry(1,72,28),p=dough.attributes.position;
  for(let i=0;i<p.count;i++){
    const a=Math.atan2(p.getZ(i),p.getX(i)),scallop=1+.08*Math.cos(a*12);
    p.setXYZ(i,p.getX(i)*scallop,Math.max(-.43,Math.min(.49,p.getY(i))),p.getZ(i)*scallop);
  }
  dough.computeVertexNormals();
  mesh(g,dough,'#d9a463',0,0,0,'matte').scale.set(.351,.164,.358);
  for(let i=0;i<12;i++){
    const a=i*tau/12,x=.265*Math.sin(a),z=.258*Math.cos(a);
    const rib=oval(g,'#e7b677',.028,.028,.108,x,.070,z,'matte');
    rib.rotation.y=a;
  }
  oval(g,'#ebbf82',.110,.037,.108,0,.071,0,'satin');
  return turn(g,.26);
}
function babyDoll(cloth='#d789a7'){
  const g=new THREE.Group();
  oval(g,cloth,.214,.126,.240,0,-.015,.057,'satin');
  oval(g,cloth,.224,.126,.229,0,.040,-.206,'satin');
  oval(g,'#f4c8a1',.173,.107,.171,0,.098,-.206,'satin');
  for(const side of [-1,1]){
    oval(g,'#f1c39f',.074,.060,.112,side*.219,.018,.047,'satin').rotation.y=side*.27;
    oval(g,cloth,.093,.070,.150,side*.107,-.024,.254,'satin');
    oval(g,'#4e4244',.014,.007,.019,side*.061,.192,-.222,'matte');
    oval(g,'#eaa18c',.022,.006,.017,side*.097,.187,-.167,'satin');
  }
  for(const z of [-.042,.049,.143])oval(g,'#f9d9b9',.025,.009,.025,0,.110,z,'satin');
  tube(g,'#b27376',[[-.035,.190,-.152],[0,.195,-.143],[.032,.190,-.152]],.007,'satin');
  return turn(g,.23);
}
function juice(){
  const g=new THREE.Group(),paper='#e9ad67';
  box(g,paper,.513,.327,.746,.047,0,-.005,0,'satin');
  box(g,'#f0c17c',.514,.096,.143,.033,0,.077,-.321,'satin');
  box(g,'#fff0c7',.134,.034,.084,.017,.104,.133,-.306,'satin');
  printed(g,.468,.649,0,.163,.045,(ctx)=>{
    ctx.fillStyle='#efb765';ctx.fillRect(0,0,512,512);
    ctx.fillStyle='#f8e6b6';ctx.beginPath();ctx.roundRect(48,47,416,418,48);ctx.fill();
    ctx.fillStyle='#e89341';ctx.beginPath();ctx.arc(256,202,119,0,tau);ctx.fill();
    ctx.strokeStyle='#ffcf78';ctx.lineWidth=11;
    for(let i=0;i<8;i++){const a=i*tau/8;ctx.beginPath();ctx.moveTo(256,202);ctx.lineTo(256+114*Math.sin(a),202+114*Math.cos(a));ctx.stroke();}
    ctx.font='bold 98px sans-serif';ctx.textAlign='center';ctx.fillStyle='#57351e';printInk(ctx,'橙汁',256,411);
  });
  return turn(g,.38);
}
function pingPong(color='#f5eddd',seamColor='#e7ddc8'){
  const g=new THREE.Group();
  oval(g,color,.380,.380,.380,0,0,0,'matte',40);
  const seam=ring(g,seamColor,.378,.004,0,0,0,'matte');
  seam.rotation.x=1.14;
  return turn(g,.31);
}
function tassel(color='#527f9b'){
  const g=new THREE.Group();
  box(g,color,.505,.128,.667,.037,0,0,-.079,'satin');
  box(g,'#82a7b7',.429,.028,.588,.020,0,.068,-.08);
  for(const x of [-.163,.163]){
    tube(g,'#e0c38e',[[x,.086,-.328],[x,.086,-.044],[x,.086,.137],[x*.8,.086,.166]],.010,'metal');
  }
  tube(g,'#ddc296',[[-.074,.086,-.169],[.091,.085,-.155],[.054,.086,-.082],[-.045,.086,.010],[.052,.086,.090]],.016,'ribbon');
  for(let i=0;i<7;i++)tube(g,'#6994b6',[[.012,.010,.212],[.014,.037,.310],[.020+(i-3)*.021,.059,.454]],.009,'satin');
  return turn(g,.26);
}
function stick(tongs,paint='#e7d1a8'){
  const g=new THREE.Group();
  if(tongs){
    for(const side of [-1,1])tube(g,'#b48758',[[side*.036,.016,-.413],[side*.097,.044,-.225],[side*.112,.094,.111],[side*.138,.077,.421]],.035,'satin');
    disk(g,'#98714e',.046,.046,.035,0,.020,-.401,'metal');
  }else{
    const shaft=disk(g,paint,.049,.026,.883,0,0,0,'satin');
    const grip=disk(g,'#746d71',.048,.045,.228,0,-.006,-.305,'satin');
    const tip=disk(g,'#668a9e',.028,.028,.046,0,.002,.454,'satin');
    for(const item of [shaft,grip,tip])item.rotation.x=Math.PI/2;
    shaft.rotation.z=Math.PI;
  }
  g.rotation.set(.20,-.44,-.26);
  return g;
}
function marshmallows(sugarColor='#fae6c9'){
  const g=new THREE.Group();
  box(g,'#c49c68',.041,.038,.925,.017,0,-.011,0,'matte');
  for(const z of [-.263,-.034,.191]){
    const sugar=box(g,sugarColor,.284,.246,.226,.077,0,.007,z,'satin');
    sugar.rotation.z=.15*Math.sin(z*39);
    oval(g,'#d9a778',.082,.013,.067,.012,.128,z+.009,'matte');
  }
  return turn(g,.27);
}
function grapes(colors=['#8f6ba3','#795c97','#a279ab']){
  const g=new THREE.Group();
  for(const [row,count] of [3,4,3,2,1].entries()){
    for(let col=0;col<count;col++){
      const r=.114+Math.sin(col*2+row)*.008;
      oval(g,colors[(row+col)%3],r,r,r,(col-(count-1)*.5)*.17,.021+Math.sin(col*2+row)*.039,-.218+row*.147);
    }
  }
  tube(g,'#778d53',[[.028,.044,-.267],[.059,.084,-.390],[.112,.103,-.439]],.021,'satin');
  oval(g,'#879d5b',.120,.026,.058,.145,.093,-.35,'satin').rotation.y=-.24;
  return turn(g,.24);
}
const pantryEntries=new Map([
  [54,[[/橙子|^Orange$/,'sweet-orange']]],
  [399,[[/切片奶酪/,'sliced-cheddar'],[/奶酪|^Cheese$/,'cheddar-wedge']]],
  [601,[[/盖碗/,'blue-covered-bowl'],[/台球|^Pool Ball14$/,'pool-ball-14']]],
  [414,[[/曲奇|^Cookie$/,'butter-cookie']]],
  [846,[[/玩偶/,'pink-baby-doll']]],
  [654,[[/橙.*汁/,'orange-juice-box']]],
  [585,[[/乒乓球|^Ping Pong Ball White$/,'white-ping-pong']]],
  [1083,[[/木牌/,'blue-tassel-tablet']]],
  [608,[[/点心夹/,'pastry-tongs'],[/台球杆|^Pool Stick White$/,'white-cue']]],
  [1460,[[/棉花糖/,'toasted-marshmallow']]],
  [49,[[/紫葡萄|^Grapes$/,'purple-grapes']]],
]);
const pantryBuilders={
 'sweet-orange':orange,'cheddar-wedge':()=>cheese(false),'sliced-cheddar':()=>cheese(true),
 'blue-covered-bowl':blueBowl,'pool-ball-14':poolBall,'butter-cookie':cookie,
 'pink-baby-doll':babyDoll,'orange-juice-box':juice,'white-ping-pong':pingPong,
 'blue-tassel-tablet':tassel,'pastry-tongs':()=>stick(true),'white-cue':()=>stick(false),
 'toasted-marshmallow':marshmallows,'purple-grapes':grapes,
};

function milk(color){
  const g=new THREE.Group();
  const paper='#ebdfc8';
  box(g,paper,.527,.329,.732,.040,0,-.011,0,'satin');
  const flap=box(g,color,.515,.058,.208,.017,0,.114,-.296,'satin');
  flap.rotation.x=.35;
  box(g,paper,.517,.098,.070,.016,0,.147,-.382,'satin');
  printed(g,.493,.586,0,.156,.064,(ctx)=>{
    ctx.fillStyle=paper;ctx.fillRect(0,0,512,512);
    ctx.fillStyle=color;ctx.fillRect(0,355,512,157);
    ctx.strokeStyle=color;ctx.lineWidth=14;ctx.strokeRect(30,30,452,453);
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(256,186,152,103,0,0,tau);ctx.fill();
    ctx.fillStyle='#fff4d9';ctx.textAlign='center';ctx.font='bold 67px sans-serif';printInk(ctx,'鲜牛奶',256,210);
    ctx.font='25px sans-serif';printInk(ctx,'原味',256,315);
    ctx.fillStyle=color;ctx.fillRect(50,290,108,14);ctx.fillRect(356,290,108,14);
  });
  return turn(g,.42);
}
function snail(color='#e8c65f'){
  const g=new THREE.Group();
  oval(g,'#cbb46d',.394,.128,.187,0,-.071,.068,'satin');
  oval(g,color,.248,.210,.229,-.091,.061,-.020,'glaze',38);
  for(const x of [-1,1]){
    const points=[];
    for(let i=0;i<=32;i++){
      const t=i/32,a=t*tau*1.65,r=.019+t*.140;
      points.push([-.091+r*Math.sin(a),.059+r*Math.cos(a),-.020+x*(.225-r*.38)]);
    }
    tube(g,'#b28746',points,.014,'satin');
    tube(g,'#cfaa58',[[.273,.012,.042+x*.068],[.328,.116,.042+x*.099],[.357,.150,.042+x*.119]],.017,'satin');
    oval(g,'#605144',.024,.025,.023,.357,.151,.042+x*.119,'matte');
  }
  return turn(g,.46);
}
function stewPot(color){
  const g=new THREE.Group();
  const form=[[0,-.202],[.241,-.202],[.295,-.157],[.319,.005],[.327,.102],[.306,.112],[.284,.028],[.256,-.160],[0,-.161]];
  mesh(g,new THREE.LatheGeometry(form.map(p=>new THREE.Vector2(...p)),52),color);
  const edge=ring(g,'#c2bba7',.317,.015,0,.104,0,'metal');
  edge.rotation.x=Math.PI/2;
  const lid=oval(g,color,.322,.083,.322,0,.126,0);
  lid.material=surface(color,'glaze');
  disk(g,'#555751',.080,.054,.067,0,.225,0,'satin');
  for(const side of [-1,1]){
    tube(g,'#5d6158',[[side*.302,.058,-.092],[side*.409,.075,-.081],[side*.445,.071,.006],[side*.408,.063,.080],[side*.300,.050,.085]],.026,'satin');
  }
  return turn(g,.54);
}
function keypadPhone(color){
  const g=new THREE.Group();
  box(g,color,.472,.180,.829,.063,0,0,0);
  box(g,'#566363',.358,.034,.298,.027,0,.103,-.182,'satin');
  box(g,'#89aa9e',.304,.011,.244,.022,0,.124,-.185);
  box(g,'#b9bdb0',.173,.018,.027,.008,0,.103,-.354,'satin');
  for(let row=0;row<4;row++)for(let column=0;column<3;column++){
    box(g,row===0?'#67746d':'#e4ddc4',.079,.026,.049,.010,(column-1)*.105,.104,.038+row*.078,'satin');
  }
  return turn(g,.21);
}
function toyDrum(color){
  const g=new THREE.Group();
  disk(g,color,.315,.281,.408,0,-.013,0);
  for(const y of [-.216,.197])disk(g,'#d4b77f',.326,.326,.041,0,y,0,'satin');
  disk(g,'#f3e4cd',.294,.294,.015,0,.224,0,'matte');
  for(let i=0;i<7;i++){
    const a=i*tau/7,b=a+.28;
    tube(g,'#f0d4a3',[[.313*Math.sin(a),.172,.313*Math.cos(a)],[.297*Math.sin(b),-.041,.297*Math.cos(b)],[.283*Math.sin(a),-.190,.283*Math.cos(a)]],.023,'satin');
  }
  const stick=box(g,'#a77e55',.040,.042,.643,.019,.103,.251,-.069,'satin');
  stick.rotation.y=.56;
  oval(g,'#bc905d',.039,.033,.049,.265,.251,.195,'satin');
  return turn(g,.72);
}
function luckyEnvelope(){
  const g=new THREE.Group();
  box(g,'#ca5e56',.494,.090,.758,.029,0,0,0,'satin');
  printed(g,.445,.714,0,.046,0,(ctx)=>{
    ctx.fillStyle='#cb6259';ctx.fillRect(0,0,512,512);
    ctx.strokeStyle='#eac486';ctx.lineWidth=10;ctx.strokeRect(29,28,454,456);
    ctx.beginPath();ctx.arc(255,244,110,0,tau);ctx.stroke();
    ctx.fillStyle='#f2d39b';ctx.font='bold 112px sans-serif';ctx.textAlign='center';printInk(ctx,'平安',256,282);
  });
  return turn(g,.19);
}
function regularBalloon(color,dotted=false){
  const g=new THREE.Group();
  const envelope=oval(g,color,.357,.213,.392,0,.018,-.069,'glaze',36);
  if(dotted){
    const canvas=Object.assign(document.createElement('canvas'),{width:512,height:256}),ctx=canvas.getContext('2d');
    ctx.fillStyle=color;ctx.fillRect(0,0,512,256);
    const dots=['#ecd49b','#e8a4a6','#76a9aa','#b997c2'];
    for(let i=0;i<21;i++){
      ctx.fillStyle=dots[i%dots.length];ctx.beginPath();ctx.arc((i*193)%512,(i*67)%256,8+i%6,0,tau);ctx.fill();
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    envelope.material=new THREE.MeshPhysicalMaterial({map,roughness:.25,clearcoat:.78});
  }
  oval(g,color,.062,.045,.047,.003,.002,.307);
  tube(g,'#dbcaad',[[.002,.010,.321],[-.046,.016,.388],[-.031,.012,.456],[.041,.012,.479]],.010,'satin');
  return turn(g,.28);
}
function rainbowIcePop(){
  const g=new THREE.Group(),width=.373,z=-.245;
  for(const [i,color] of ['#db887d','#e7b578','#e7c773','#9ab67b','#86b4bf'].entries()){
    box(g,color,width+Math.sin(i*.66)*.033,.151,.127,.035,0,0,z+i*.105);
  }
  box(g,'#bd9767',.110,.077,.310,.033,0,-.010,.303,'satin');
  return turn(g,.29);
}
const palette={Blue:'#5d8eaf',Green:'#83a477',Purple:'#9b79b0',Yellow:'#dfbd68',Pink:'#d490a8',Red:'#cb736c',Orange:'#d59a62',White:'#fbecd1',Brown:'#ab8866',Grey:'#a2a5a8'};
const shelfEntries=new Map();
const shelfBuilders={
 'snail-yellow':snail,'lucky-envelope':luckyEnvelope,
 'balloon-speckled':()=>regularBalloon('#edd8a9',true),'rainbow-ice-pop':rainbowIcePop,
 'novel-evening-park':()=>boundBook({color:palette.Purple,title:'夜色公园',label:'故事集'}),
 'milk-blue':()=>milk(palette.Blue),
};
for(const [id,pattern,kind] of [
 [658,/牛奶|^Milk Blue$/,'milk-blue'],[964,/蜗牛|^Snail Yellow$/,'snail-yellow'],
 [173,/红包/,'lucky-envelope'],[523,/彩点气球|Balloon Particle Rainbow/,'balloon-speckled'],
 [490,/彩虹冰棒|^Popsicle Flat Rainbow$/,'rainbow-ice-pop'],[284,/夜色公园/,'novel-evening-park'],
])shelfEntries.set(id,[[pattern,kind]]);
function variants(prefix,config,localized,build){
 for(const [id,color] of Object.entries(config)){
  const kind=prefix.toLowerCase().replaceAll(' ','-')+'-'+color.toLowerCase();
  shelfBuilders[kind]=()=>build(palette[color],color);
  const options=shelfEntries.get(Number(id))??[];
  options.push([new RegExp(localized+'|^'+prefix+' '+color+'$'),kind]);
  shelfEntries.set(Number(id),options);
 }
}
variants('Drum',{171:'Blue',172:'Green',173:'Purple',174:'Yellow'},'玩具鼓|小鼓',toyDrum);
variants('Pot',{732:'Blue',733:'Green',734:'Orange',735:'Pink',736:'Purple',737:'Red',738:'White',739:'Yellow'},'炖锅|汤锅|双耳锅',stewPot);
variants('Mobile',{864:'Blue',865:'Green',866:'Pink',867:'Red',868:'White'},'按键手机|老式手机|手机',keypadPhone);
variants('Book',{280:'Brown',281:'Green',282:'Orange',283:'Pink',284:'Purple',285:'Red',286:'Yellow'},'书本|封面书',color=>boundBook({color,title:'故事集',label:'布面精装'}));
variants('Balloon Flat',{511:'Blue',512:'Green',513:'Orange',514:'Pink',515:'Purple',516:'Red',517:'White',518:'Yellow'},'扁?气球',color=>regularBalloon(color));
variants('Balloon Particle',{519:'Blue',520:'Green',521:'Pink',522:'Purple',524:'Red',525:'White',526:'Yellow'},'糖粒|斑点|彩点|气球',color=>regularBalloon(color,true));

function friedDough(){
 const g=new THREE.Group();
 for(const side of [-1,1]){
  const loaf=baked(g,[.103,.118,.423],[side*.066,.017,0]);
  loaf.rotation.set(.03,side*.044,side*.13);
 }
 for(let i=0;i<13;i++)oval(g,i%2?'#df9852':'#ba783e',.023,.011,.050,(Math.sin(i*1.27))*.145,.107,.363-i*.059,'matte',12);
 return turn(g,.28);
}
function soyMilk(){
 const g=new THREE.Group(),paper='#f0d8a4';
 disk(g,paper,.267,.199,.519,0,0,0,'satin');
 disk(g,'#edc88d',.268,.268,.024,0,.251,0,'satin');
 const rim=ring(g,'#fff1ce',.277,.018,0,.260,0,'satin');
 rim.rotation.x=Math.PI/2;
 for(let i=0;i<4;i++){
  const seed=oval(g,'#b89a66',.035,.013,.059,-.101+i*.063,.265,.05*Math.sin(i));
  seed.rotation.y=.8*i;
 }
 return turn(g,.91);
}
function bread(color){
 const g=new THREE.Group();
 const sides=baked(g,[.342,.200,.414],[0,-.018,.022]);
 if(color==='white'){
  box(g,'#f2d9ac',.557,.062,.647,.022,0,.152,.027,'matte');
  oval(g,'#f5dfb9',.273,.025,.084,0,.172,-.189,'matte');
 }else{
  for(let i=0;i<3;i++){
   const score=oval(g,'#f3ca93',.148,.020,.039,0,.174-(i-1)**2*.015,(i-1)*.153,'matte');
   score.rotation.y=-.33;
  }
 }
 sides.rotation.y=.11;
 return turn(g,.24);
}
function riceDumpling(color){
 const g=new THREE.Group();
 const leaf=new THREE.Shape();
 leaf.moveTo(-.328,-.240);leaf.quadraticCurveTo(-.386,-.164,-.300,-.080);
 leaf.lineTo(-.057,.339);leaf.quadraticCurveTo(.015,.422,.070,.311);
 leaf.lineTo(.340,-.136);leaf.quadraticCurveTo(.367,-.265,.230,-.277);
 leaf.closePath();
 const geometry=new THREE.ExtrudeGeometry(leaf,{depth:.153,steps:1,bevelSize:.067,bevelThickness:.060,bevelSegments:4,curveSegments:10});
 const body=mesh(g,geometry,'#809058',0,-.096,0,'satin');
 body.rotation.x=-Math.PI/2;
 for(const shift of [-.03,.047]){
  tube(g,color,[[shift-.22,-.025,-.189],[shift-.144,.119,-.100],[shift-.019,.176,.024],[shift+.155,.072,.133],[shift+.200,-.036,.169]],.017,'satin');
 }
 tube(g,color,[[.011,.153,.006],[-.048,.185,.102],[.023,.197,.135],[.066,.172,.070],[.027,.152,.039]],.014,'satin');
 return turn(g,.35);
}
function pumpkin(){
 const g=new THREE.Group();
 for(let i=0;i<9;i++){
  const a=i*tau/9;
  const lobe=oval(g,i%3===0?'#e6a355':'#df9849',.212,.249,.219,.174*Math.sin(a),-.058,.172*Math.cos(a),'satin',28);
  lobe.rotation.y=a;
 }
 tube(g,'#778651',[[0,.151,0],[.013,.251,-.009],[.044,.299,-.032],[-.005,.324,-.074]],.048,'satin');
 return turn(g,.45);
}
function ship(color){
 const g=new THREE.Group(),hull=new THREE.Shape();
 hull.moveTo(-.423,-.156);hull.lineTo(.233,-.156);
 hull.quadraticCurveTo(.422,-.114,.453,-.015);
 hull.quadraticCurveTo(.411,.087,.240,.161);
 hull.lineTo(-.381,.179);hull.quadraticCurveTo(-.457,.105,-.423,-.156);
 const body=mesh(g,new THREE.ExtrudeGeometry(hull,{depth:.155,bevelEnabled:true,bevelSegments:3,bevelThickness:.024,bevelSize:.024,steps:1}),color,0,-.126,0);
 body.rotation.x=-Math.PI/2;
 box(g,'#dbb683',.654,.047,.271,.021,-.088,.050,-.001,'satin');
 box(g,'#f1dfb9',.231,.170,.241,.037,-.265,.143,0);
 box(g,color,.246,.034,.258,.014,-.266,.244,0);
 for(const x of [-.314,-.217])box(g,'#507b89',.053,.033,.243,.010,x,.170,.006);
 for(const [i,c] of ['#d18865','#cbb56f','#8fae87'].entries()){
  box(g,c,.129,.133,.214,.018,-.039+i*.137,.128,0,'satin');
  for(let j=0;j<4;j++)box(g,'#dfc9a7',.006,.005,.201,.001,-.086+i*.137+j*.029,.197,0,'satin');
 }
 return turn(g,.49);
}
function lounger(color){
 const g=new THREE.Group(),frame='#b78b61';
 const foot=box(g,color,.431,.070,.483,.029,0,.063,.166,'satin');
 foot.rotation.x=.05;
 const head=box(g,color,.431,.070,.411,.028,0,.168,-.229,'satin');
 head.rotation.x=.56;
 for(const x of [-.181,.181]){
  const top=box(g,frame,.039,.057,.448,.020,x,.181,-.231,'satin');
  top.rotation.x=.57;
  box(g,frame,.039,.063,.488,.021,x,.080,.169,'satin');
  for(const z of [-.198,.278]){
   const beam=box(g,frame,.039,.238,.044,.018,x,-.055,z,'satin');
   beam.rotation.x=z>.1?.33:-.27;
  }
 }
 for(const x of [-.091,0,.091]){
  const seam=box(g,'#ead0a3',.011,.008,.397,.003,x,.204,-.246,'satin');
  seam.rotation.x=.56;
 }
 return turn(g,.36);
}
function burger(){
 const g=new THREE.Group();
 baked(g,[.381,.101,.348],[0,-.134,0]);
 oval(g,'#805339',.362,.086,.323,0,-.047,0,'matte');
 const cheese=box(g,'#e7b65a',.496,.041,.501,.020,.013,.025,.018,'satin');cheese.rotation.y=.48;
 for(let i=0;i<9;i++){
  const a=i*tau/9;
  const leaf=oval(g,'#8da960',.106,.030,.064,.316*Math.sin(a),.044,.303*Math.cos(a),'satin');
  leaf.rotation.y=a;
 }
 baked(g,[.382,.156,.345],[0,.092,0]);
 for(let i=0;i<14;i++){
  const a=i*2.39,r=.237*Math.sqrt(i/14);
  oval(g,'#f2d6a0',.023,.009,.011,r*Math.cos(a),.233-r*.19,r*Math.sin(a),'matte',12).rotation.y=a;
 }
 return turn(g,.51);
}
function carrot(){
 const g=new THREE.Group();
 const profile=[[0,-.434],[.048,-.402],[.137,-.190],[.186,.063],[.197,.245],[.158,.304],[0,.320]];
 mesh(g,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),36),'#de9350',0,0,0,'satin').rotation.x=1.40;
 for(const z of [-.190,-.097,.016,.099]){
  tube(g,'#c68047',[[-.063,.122-.14*z,z],[-.008,.133-.14*z,z+.01],[.056,.119-.14*z,z+.04]],.008,'satin');
 }
 for(const side of [-1,0,1]){
  const leaf=oval(g,'#7e9863',.056,.045,.129,side*.047,.039,.376,'satin');
  leaf.rotation.y=side*.40;
 }
 return turn(g,.22);
}
function castle(color){
 const g=new THREE.Group();
 for(const x of [-.242,.242]){
  box(g,'#c6ae8a',.212,.423,.489,.033,x,0,0,'matte');
  box(g,color,.223,.067,.498,.019,x,.162,0);
  for(const z of [-.158,0,.158])box(g,color,.175,.093,.110,.017,x,.245,z);
 }
 box(g,color,.312,.164,.474,.031,0,.121,0);
 box(g,'#b49a78',.574,.090,.581,.033,0,-.235,0,'satin');
 for(const x of [-.25,.25])box(g,'#947b6f',.047,.076,.012,.006,x,.048,.250,'satin');
 return turn(g,.53);
}
function riceBall(){
 const g=new THREE.Group(),shape=new THREE.Shape();
 shape.moveTo(-.34,-.25);shape.quadraticCurveTo(-.38,-.17,-.34,-.115);
 shape.lineTo(-.076,.327);shape.quadraticCurveTo(0,.414,.076,.328);
 shape.lineTo(.344,-.115);shape.quadraticCurveTo(.40,-.262,.29,-.279);
 shape.lineTo(-.29,-.279);shape.quadraticCurveTo(-.32,-.280,-.34,-.25);
 const rice=mesh(g,new THREE.ExtrudeGeometry(shape,{depth:.19,bevelSize:.042,bevelThickness:.046,bevelSegments:4,steps:1}),'#f5e5bf',0,-.105,0,'matte');
 rice.rotation.x=-Math.PI/2;
 box(g,'#56674d',.295,.237,.271,.028,0,.005,.197,'satin');
 for(let i=0;i<10;i++)oval(g,'#fff1ca',.024,.010,.015,Math.sin(i*3.73)*.192,.131,Math.cos(i*2.26)*.174-.035,'matte',12).rotation.y=i*.66;
 return turn(g,.27);
}
const tableEntries=new Map([
 [607,[[/油条/,'fried-dough']]], [604,[[/豆浆/,'soy-milk']]],
 [370,[[/粉绳粽子/,'rice-dumpling-pink'],[/面包|^Bread Yellow$/,'golden-bread']]],
 [369,[[/蓝绳粽子/,'rice-dumpling-blue'],[/吐司|^Bread White$/,'white-bread']]],
 [60,[[/南瓜|^Pumpkin$/,'pumpkin']]],
 [456,[[/汉堡|^Hamburger$/,'burger']]], [44,[[/胡萝卜|^Carrot$/,'carrot']]],
 [484,[[/饭团|^Onigiri$/,'rice-ball']]], [850,[[/玩偶|^Doll Yellow1$/,'yellow-doll']]],
]);
const tableBuilders={
 'fried-dough':friedDough,'soy-milk':soyMilk,'golden-bread':()=>bread('gold'),'white-bread':()=>bread('white'),
 'rice-dumpling-pink':()=>riceDumpling('#bc778b'),'rice-dumpling-blue':()=>riceDumpling('#779cb6'),
 pumpkin,burger,carrot,'rice-ball':riceBall,'yellow-doll':()=>babyDoll('#daba72'),
};
function tableColors(name,localized,map,build){
 for(const [id,color] of Object.entries(map)){
  const kind=name.toLowerCase().replaceAll(' ','-')+'-'+color.toLowerCase();
  tableBuilders[kind]=()=>build(palette[color],color);
  const entries=tableEntries.get(Number(id))??[];
  entries.push([new RegExp(localized+'|^'+name+' '+color+'$'),kind]);
  tableEntries.set(Number(id),entries);
 }
}
tableColors('Pool Stick','台球杆',{603:'Brown',604:'Green',605:'Orange',606:'Purple',607:'Red'},color=>stick(false,color));
tableColors('Ship','货船|载货船|轮船|玩具船',{132:'Blue',133:'Green',134:'Purple',135:'Red',136:'Yellow'},ship);
tableColors('Sunbed','躺椅',{1289:'Yellow',1290:'White',1291:'Red',1293:'Purple',1294:'Pink',1295:'Orange',1296:'Green',1297:'Blue'},lounger);
tableColors('Castle','积木城门|积木城堡',{1099:'Yellow',1100:'Purple',1101:'Pink',1102:'Grey',1103:'Green',1104:'Brown',1105:'Blue',1106:'Red'},castle);
for (const [index,color] of ['Yellow','Blue','Red','Purple','Orange','Green','Brown','Grey','Yellow','Blue','Red','Purple','Orange','Green','Brown'].entries()){
 const number=index+1,id=588+index;
 if(number===14)continue;
 const kind='pool-ball-'+number;
 tableEntries.set(id,[[new RegExp('台球|^Pool Ball'+number+'$'),kind]]);
 tableBuilders[kind]=()=>poolBall(number,number===8?'#484653':palette[color]);
}

function ceramicPlate(color){
 const g=new THREE.Group();
 const profile=[[0,-.057],[.266,-.057],[.302,-.041],[.369,.015],[.423,.093],[.417,.111],[.392,.119],[.355,.085],[.277,.019],[0,.009]];
 mesh(g,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),58),'#fbebcc');
 for(const [r,y] of [[.405,.108],[.373,.074]]){
  const edge=ring(g,color,r,.009,0,y,0);
  edge.rotation.x=Math.PI/2;
 }
 for(let i=0;i<9;i++){
  const a=i*tau/9,r=.327;
  const petal=oval(g,color,.015,.008,.039,r*Math.sin(a),.053,r*Math.cos(a),'satin');
  petal.rotation.set(.10,a,.05);
 }
 return turn(g,.32);
}
function basket(color){
 const g=new THREE.Group();
 disk(g,'#dab987',.331,.306,.270,0,-.066,0,'satin');
 disk(g,'#e6c597',.330,.330,.052,0,.096,0,'satin');
 for(const y of [-.166,.062]){
  const edge=ring(g,color,y<0?.309:.332,.022,0,y,0,'satin');
  edge.rotation.x=Math.PI/2;
 }
 for(let i=-5;i<=5;i++){
  const x=i*.051;
  box(g,i%2?'#bc976b':'#e9c898',.035,.014,.59*Math.sqrt(1-(x/.326)**2),.005,x,.126,0,'satin');
 }
 tube(g,'#ab835a',[[-.105,.133,0],[-.065,.190,-.018],[.060,.190,-.017],[.104,.133,0]],.016,'satin');
 return turn(g,.40);
}
function teaPot(color){
 const g=new THREE.Group();
 oval(g,color,.292,.236,.300,-.047,-.048,.014,'glaze',40);
 disk(g,color,.181,.211,.066,-.047,.174,.014);
 oval(g,'#e3c4a2',.050,.043,.050,-.047,.221,.014);
 tube(g,color,[[-.244,.002,.012],[-.388,.093,.018],[-.421,.202,.048],[-.303,.222,.062],[-.206,.163,.053]],.036);
 tube(g,color,[[.150,-.041,.035],[.234,-.032,.037],[.323,.056,.040],[.410,.142,.043]],.054);
 const end=oval(g,'#bd956e',.043,.029,.044,.411,.142,.043,'satin');
 end.rotation.z=.60;
 const band=ring(g,color==='#fbecd1'?'#7694a3':'#efc7a4',.181,.012,-.047,.193,.014,'satin');
 band.rotation.x=Math.PI/2;
 return turn(g,.50);
}
function appleYellow(color='#e2bd5e'){
 const g=new THREE.Group(),fruit=new THREE.SphereGeometry(1,54,35),p=fruit.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.060*Math.cos(Math.atan2(z,x)*5);
  p.setXYZ(i,x*r,y-.17*Math.max(y,0)**8,z*r);
 }
 fruit.computeVertexNormals();
 mesh(g,fruit,color).scale.set(.419,.399,.414);
 tube(g,'#806240',[[0,.286,0],[-.011,.367,-.009],[.029,.457,.009]],.025,'satin');
 oval(g,'#8ba566',.125,.034,.054,.115,.375,.023,'satin').rotation.z=.22;
 return turn(g,.28);
}
function scooter(){
 const g=new THREE.Group();
 box(g,'#cf8ea3',.198,.079,.590,.030,0,-.088,.037);
 for(const z of [-.305,.336]){
  const wheel=disk(g,'#657274',.086,.086,.099,0,-.073,z,'satin');
  wheel.rotation.z=Math.PI/2;
  const cap=disk(g,'#d8c59f',.047,.047,.106,0,-.073,z,'satin');
  cap.rotation.z=Math.PI/2;
 }
 tube(g,'#b78198',[[0,-.057,-.288],[0,.152,-.268],[0,.412,-.178]],.031,'metal');
 box(g,'#d79aac',.256,.049,.060,.024,0,.414,-.182);
 g.rotation.set(.64,-.23,-.19);
 return g;
}
function sushi(color){
 const g=new THREE.Group();
 const seaweed=disk(g,'#526951',.325,.328,.381,0,-.041,0,'matte');
 seaweed.rotation.y=.1;
 disk(g,'#f1ddb7',.305,.313,.032,0,.163,0,'matte');
 box(g,color,.167,.034,.175,.030,0,.188,0,'satin').rotation.y=.38;
 for(let i=0;i<15;i++){
  const angle=i*2.39996,r=.121+Math.sqrt(i/15)*.155;
  oval(g,'#fff1cf',.032,.009,.020,Math.cos(angle)*r,.184,Math.sin(angle)*r,'matte',10).rotation.y=angle;
 }
 return turn(g,.47);
}
function hotdog(){
 const g=new THREE.Group();
 for(const x of [-.087,.087])baked(g,[.140,.121,.435],[x,-.063,0]);
 oval(g,'#bd7554',.116,.105,.420,0,.035,0,'satin');
 const points=Array.from({length:17},(_,i)=>[.049*Math.sin(i*.72),.122-.015*Math.abs(i-8)/8,-.34+i*.043]);
 tube(g,'#e5b561',points,.013,'satin');
 return turn(g,.29);
}
function discoBall(palette=['#6379a0','#d7e9ec','#8098b5','#e1cef4','#725591']){
 const g=new THREE.Group();
 const faces=new THREE.IcosahedronGeometry(.409,2),p=faces.attributes.position;
 const colors=[],tones=palette.map(c=>new THREE.Color(c));
 for(let i=0;i<p.count;i++)colors.push(...tones[Math.floor(i/3*74513.568)%tones.length].toArray());
 faces.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const model=mesh(g,faces,'#fff');
 model.material=new THREE.MeshPhysicalMaterial({vertexColors:true,metalness:.58,roughness:.22,clearcoat:.81,flatShading:true});
 return turn(g,.37);
}
function stegosaurus(purple='#a286b1'){
 const g=new THREE.Group();
 oval(g,purple,.295,.197,.170,-.034,.008,.004,'satin');
 oval(g,purple,.138,.113,.131,.270,.064,.007,'satin');
 tube(g,purple,[[-.227,.047,0],[-.357,.062,.028],[-.416,.101,.084]],.063,'satin');
 for(const x of [-.178,.136])for(const z of [-.096,.096])oval(g,'#a786b4',.066,.094,.061,x,-.123,z,'satin');
 for(let i=0;i<5;i++){
  const fin=mesh(g,new THREE.ConeGeometry(.074,.113,4),i%2?'#d0b49e':'#c19cb4',-.189+i*.090,.196+Math.sin(i*.7)*.034,-.019,'satin');
  fin.rotation.y=.78;
 }
 oval(g,'#5f5362',.014,.014,.011,.318,.102,.113,'matte');
 return turn(g,.46);
}
function foldingChair(color){
 const g=new THREE.Group(),wood='#aa825f';
 box(g,color,.498,.055,.304,.026,0,.073,.078,'satin');
 const back=box(g,color,.497,.044,.299,.025,0,.293,-.170,'satin');
 back.rotation.x=.76;
 for(const side of [-1,1]){
  for(const slant of [-1,1]){
   const leg=box(g,wood,.047,.392,.042,.021,side*.228,-.043,.062,'satin');
   leg.rotation.x=slant*.62;
  }
  tube(g,wood,[[side*.249,-.097,-.202],[side*.247,.154,-.157],[side*.245,.385,-.201]],.020,'satin');
  box(g,wood,.039,.039,.333,.015,side*.264,.184,.052,'satin');
 }
 return turn(g,.44);
}
function abacus(){
 const g=new THREE.Group(),wood='#ac7d51';
 for(const x of [-.293,.293])box(g,wood,.076,.127,.789,.030,x,0,0,'satin');
 for(const z of [-.367,.367])box(g,wood,.591,.124,.082,.031,0,0,z,'satin');
 box(g,'#cfac79',.554,.052,.046,.016,0,.033,-.144,'satin');
 for(let i=0;i<7;i++){
  const x=(i-3)*.077;
  box(g,'#ddbd8c',.011,.014,.710,.006,x,.025,0,'satin');
  for(const z of [-.247,.009+(i%3)*.029,.093+(i%3)*.034,.198,.268]){
   oval(g,'#966344',.032,.032,.027,x,.038,z,'satin',14);
  }
 }
 return turn(g,.28);
}
function shell(color){
 const g=new THREE.Group();
 for(const y of [.022,-.100]){
  const body=oval(g,color??(y>0?'#7eabb9':'#91bbc2'),.363,.096,.344,0,y,0,'glaze',40);
  body.rotation.x=y>0?.39:-.05;
 }
 for(let i=-4;i<=4;i++){
  const x=i*.073;
  tube(g,'#a1c4c5',[[x*.24,.061,-.244],[x*.76,.116,.013],[x,.039,.246]],.012,'satin');
 }
 oval(g,'#f3e5c9',.085,.081,.082,0,-.023,.192,'glaze',28);
 return turn(g,.48);
}
function mushroom(color='#a78aba'){
 const g=new THREE.Group();
 oval(g,'#e4c8aa',.137,.208,.139,0,-.119,0,'satin');
 oval(g,color,.352,.191,.349,0,.099,0,'glaze',38);
 for(const [x,z,r] of [[-.124,-.124,.048],[.153,-.078,.052],[.030,.119,.059],[-.129,.088,.040]])oval(g,'#edd6b7',r,.014,r,x,.275-(x*x+z*z)*1.08,z,'satin');
 return turn(g,.57);
}
function rainbowCupcake(color){
 const g=new THREE.Group(),paper=new THREE.CylinderGeometry(.286,.219,.273,120,3);
 const p=paper.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),ridge=1+.065*Math.cos(Math.atan2(z,x)*25);
  p.setX(i,x*ridge);p.setZ(i,z*ridge);
 }
 paper.computeVertexNormals();
 mesh(g,paper,'#759ca9',0,-.163,0,'satin');
 baked(g,[.296,.127,.296],[0,-.009,0]);
 const frosting=color?Array.from({length:4},(_,i)=>'#'+new THREE.Color(color).lerp(new THREE.Color('#e4c9a7'),i*.09).getHexString()):['#cd90a9','#d5aa83','#a3b484','#a988b5'];
 for(let i=0;i<4;i++){
  const loop=ring(g,frosting[i],.182-i*.033,.055-i*.004,0,.090+i*.063,0);
  loop.rotation.x=Math.PI/2;
 }
 oval(g,'#e7c995',.049,.059,.049,-.046,.306,-.024);
 return turn(g,.46);
}
function paperCup(color){
 const g=new THREE.Group();
 disk(g,color,.266,.177,.554,0,-.008,0,'satin');
 disk(g,'#e5c59b',.242,.240,.011,0,.264,0,'matte');
 const rim=ring(g,'#f0dec4',.263,.017,0,.272,0,'satin');
 rim.rotation.x=Math.PI/2;
 return turn(g,.90);
}
const diningEntries=new Map([
 [1837,[[/蒸笼/,'steamer-blue-band']]], [1839,[[/蒸笼/,'steamer-orange-band']]],
 [41,[[/黄苹果|^Apple Yellow$/,'yellow-apple']]], [128,[[/滑板车/,'pink-scooter']]],
 [482,[[/三文鱼.*卷|^Maki Orange$/,'salmon-roll']]], [481,[[/黄瓜.*卷|^Maki Green$/,'cucumber-roll']]],
 [457,[[/热狗|^Hot Dog$/,'hotdog']]], [1458,[[/棉花糖|^Marshmallow Blue$/,'blue-marshmallows']]],
 [420,[[/纸杯蛋糕|^Cupcake Rainbow$/,'rainbow-cupcake']]], [169,[[/镜面球/,'purple-disco-ball']]], [1237,[[/剑龙/,'purple-stegosaurus']]],
 [263,[[/算盘|^Abacus$/,'wood-abacus']]], [1535,[[/珍珠贝/,'blue-clam']]],
 [1633,[[/蘑菇/,'purple-mushroom']]], [673,[[/纸杯|^Paper Cup Black$/,'black-paper-cup']]],
 [674,[[/纸杯|^Paper Cup Brown$/,'brown-paper-cup']]],
]);
const diningBuilders={
 'steamer-blue-band':()=>basket('#7193ad'),'steamer-orange-band':()=>basket('#c68b66'),
 'yellow-apple':appleYellow,'pink-scooter':scooter,'salmon-roll':()=>sushi('#e4a279'),'cucumber-roll':()=>sushi('#8aa16d'),
 hotdog,'rainbow-cupcake':rainbowCupcake,'blue-marshmallows':()=>marshmallows('#acc5cc'),'purple-disco-ball':discoBall,'purple-stegosaurus':stegosaurus,
 'wood-abacus':abacus,'blue-clam':shell,'purple-mushroom':mushroom,
 'black-paper-cup':()=>paperCup('#5f6065'),'brown-paper-cup':()=>paperCup('#a98a6b'),
};
function diningColors(name,local,map,build){
 for(const [id,color] of Object.entries(map)){
  const kind=name.toLowerCase().replaceAll(' ','-')+'-'+color.toLowerCase();
  diningBuilders[kind]=()=>build(palette[color]);
  const options=diningEntries.get(Number(id))??[];
  options.push([new RegExp(local+'|^'+name+' '+color+'$'),kind]);
  diningEntries.set(Number(id),options);
 }
}
diningColors('Plate','餐盘|瓷盘',{1837:'Blue',1839:'Green',1840:'Orange',1841:'Pink',1842:'Purple',1844:'Yellow'},ceramicPlate);
diningColors('Tea Pot','茶壶',{759:'Green',760:'Grey',761:'Orange',762:'Pink',763:'Purple',764:'Red',765:'White',766:'Yellow'},teaPot);
diningColors('Director Chair','折叠帆布椅|导演椅',{1180:'Blue',1181:'Green',1182:'Orange',1183:'Pink',1184:'Purple',1185:'Red',1186:'Yellow'},foldingChair);

function reel(color){
 const g=new THREE.Group();
 const form=new THREE.Shape().absarc(0,0,.355,0,tau,false);
 for(let i=0;i<5;i++){
  const angle=i*tau/5;
  form.holes.push(new THREE.Path().absarc(Math.cos(angle)*.211,Math.sin(angle)*.211,.079,0,tau,true));
 }
 form.holes.push(new THREE.Path().absarc(0,0,.041,0,tau,true));
 for(const y of [-.100,.091]){
  const flange=mesh(g,new THREE.ExtrudeGeometry(form,{depth:.029,bevelEnabled:true,bevelSize:.012,bevelThickness:.009,bevelSegments:3,curveSegments:14}),color,0,y,0);
  flange.rotation.x=-Math.PI/2;
 }
 disk(g,'#6d493f',.282,.282,.167,0,-.009,0,'satin');
 for(const y of [-.078,-.043,-.009,.026,.061]){
  ring(g,'#bd967b',.282,.004,0,y,0,'satin').rotation.x=Math.PI/2;
 }
 return turn(g,.36);
}
function woodPlaque(color='#a15846'){
 const g=new THREE.Group();
 disk(g,color,.341,.331,.151,0,-.019,0,'satin');
 ring(g,'#d9ad78',.305,.011,0,.061,0,'satin').rotation.x=Math.PI/2;
 printed(g,.624,.624,0,.059,0,c=>{
  c.fillStyle=color;c.fillRect(0,0,512,512);
  c.fillStyle='#f4d7ac';c.beginPath();c.arc(256,256,177,0,tau);c.fill();
  c.fillStyle='#683f39';c.beginPath();c.arc(256,256,177,-Math.PI/2,Math.PI/2);c.arc(256,344,88,Math.PI/2,-Math.PI/2,true);c.arc(256,168,88,Math.PI/2,-Math.PI/2);c.fill();
  for(const [y,ink] of [[168,'#f4d7ac'],[344,'#683f39']]){
   c.fillStyle=ink;c.beginPath();c.arc(256,y,22,0,tau);c.fill();
  }
 });
 return turn(g);
}
function beanSachet(){
 const g=new THREE.Group();
 oval(g,'#a75552',.340,.172,.274,0,0,.055,'ribbon',34);
 oval(g,'#c07261',.172,.119,.105,0,.016,-.242,'ribbon',24);
 tube(g,'#e8bd77',[[-.187,.015,-.197],[0,.151,-.159],[.176,.021,-.198]],.016,'satin');
 for(const shift of [-1,1]){
  tube(g,'#d9a873',[[0,.128,-.171],[shift*.237,.122,-.230],[shift*.280,.057,-.325]],.012,'ribbon');
 }
 for(const [x,z] of [[-.08,.026],[.006,.072],[.086,.012]]){
  oval(g,'#dca876',.032,.009,.046,x,.166-x*x*.7,z,'ribbon');
 }
 return turn(g,.35);
}
function dressDoll(color,style){
 const g=new THREE.Group();
 oval(g,style?'#673e33':'#936543',.206,.195,.180,0,.06,-.238,'satin',28);
 oval(g,'#f1c59e',.176,.154,.163,0,.13,-.208,'matte',28);
 for(const x of [-.063,.063]){
  oval(g,'#604235',.019,.011,.023,x,.267,-.196,'satin');
  oval(g,'#f3ccad',.059,.063,.161,x*2.64,.007,.031,'matte').rotation.y=Math.sign(x)*.36;
  oval(g,'#f1c59e',.055,.058,.150,x*1.51,-.021,.249,'matte');
  oval(g,color,.072,.059,.101,x*1.53,-.016,.365);
 }
 oval(g,color,.163,.088,.149,0,.075,.010);
 const skirt=oval(g,color,.250,.106,.206,0,.058,.154,'satin',36);
 const p=skirt.geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),wave=1+.04*Math.cos(12*Math.atan2(z,x));
  p.setX(i,x*wave);p.setZ(i,z*wave);
 }
 skirt.geometry.computeVertexNormals();
 oval(g,'#f2d4a4',.038,.017,.030,0,.163,.029);
 return turn(g,.31);
}
function littleChair(color){
 const g=new THREE.Group();
 box(g,color,.480,.087,.460,.041,0,0,.062,'satin');
 const back=box(g,color,.482,.316,.067,.031,0,.220,-.186,'satin');
 back.rotation.x=-.13;
 for(const x of [-.173,.173]){
  for(const z of [-.126,.235]){
   const leg=box(g,color,.067,.285,.070,.031,x,-.158,z,'satin');
   leg.rotation.z=Math.sign(x)*.14;
  }
  box(g,'#ba9973',.046,.046,.351,.016,x,-.146,.051,'satin');
 }
 return turn(g,.46);
}
function trekkingBag(color){
 const g=new THREE.Group();
 box(g,color,.568,.301,.675,.128,0,0,.021,'satin');
 box(g,color,.522,.112,.282,.054,0,.139,.191,'satin');
 box(g,'#e2c290',.285,.018,.013,.006,0,.200,.166,'satin');
 tube(g,'#796a5b',[[-.106,.015,-.280],[-.111,.019,-.412],[.103,.017,-.412],[.107,.017,-.286]],.024,'ribbon');
 for(const x of [-.147,.147]){
  box(g,'#7d6e5e',.041,.016,.517,.007,x,.150,-.062,'ribbon');
  box(g,'#dbb98a',.062,.032,.059,.010,x,.169,-.079,'satin');
 }
 return turn(g,.34);
}
function barrel(color,pattern){
 const g=new THREE.Group();
 const points=[[0,-.26],[.207,-.26],[.240,-.235],[.265,-.112],[.280,0],[.265,.113],[.236,.248],[.211,.263],[0,.263]].map(p=>new THREE.Vector2(...p));
 mesh(g,new THREE.LatheGeometry(points,46),color,0,0,0,'satin');
 for(let i=0;i<12;i++){
  const a=i*tau/12;
  const trace=[[-.207,.246],[0,.281],[.205,.246]].map(([y,r])=>[Math.cos(a)*r,y,Math.sin(a)*r]);
  tube(g,'#9b7a5d',trace,.006,'satin');
 }
 for(const y of [-.176,.179,.254]){
  ring(g,'#d7b587',y>.20?.231:.262,.016,0,y,0,'satin').rotation.x=Math.PI/2;
 }
 if(pattern){
  for(let i=0;i<8;i++){
   const angle=i*tau/8;
   const tile=box(g,'#f0d19a',.047,.047,.014,.006,Math.sin(angle)*.277,.024,Math.cos(angle)*.277,'satin');
   tile.rotation.set(0,angle,pattern==='diamond'?.78:.33);
  }
 }
 return turn(g,.69);
}
const dominoDots=[[0,0],[-1,-1],[1,1],[-1,1],[1,-1],[-1,0],[1,0]];
function domino(value){
 const g=new THREE.Group();
 box(g,'#f3deb6',.367,.110,.779,.049,0,0,0,'glaze');
 box(g,'#94765c',.300,.007,.015,.004,0,.056,0,'satin');
 const dots=value===6?dominoDots.slice(1):value%2===0?dominoDots.slice(1,value+1):dominoDots.slice(0,value);
 for(const z of [-.192,.192])for(const [x,dz] of dots)oval(g,'#554840',.024,.008,.024,x*.093,.056,z+dz*.086,'satin');
 return turn(g,.26);
}
function radio(color){
 const g=new THREE.Group();
 box(g,color,.722,.242,.463,.057,0,0,.012);
 box(g,'#e4d1aa',.268,.017,.379,.028,-.148,.122,.021,'satin');
 for(let i=0;i<7;i++){
  const z=(i-3)*.047;
  box(g,'#68736d',.198-Math.abs(i-3)*.017,.006,.011,.003,-.152,.132,z,'satin');
 }
 box(g,'#d5cca4',.219,.024,.092,.017,.147,.122,-.124,'satin');
 for(let i=0;i<6;i++)box(g,'#796c55',.006,.004,.033,.002,.071+i*.028,.136,-.123,'satin');
 for(const x of [.087,.221])disk(g,'#bca273',.050,.052,.036,x,.132,.082,'satin');
 tube(g,'#c8bc9b',[[-.296,-.073,-.215],[0,-.057,-.293],[.394,-.048,-.328]],.012,'metal');
 return turn(g,.37);
}
function deskClock(color){
 const g=new THREE.Group();
 box(g,color,.691,.221,.445,.053,0,0,0);
 box(g,'#525653',.568,.026,.287,.024,0,.114,.016,'satin');
 printed(g,.513,.247,0,.128,.013,c=>{
  c.fillStyle='#495a58';c.fillRect(0,0,512,512);
  c.fillStyle='#c5e0b7';c.textAlign='center';c.font='bold 145px monospace';printInk(c,'08:36',256,306);
 });
 for(const x of [-.17,0,.17])box(g,'#d5bc98',.085,.028,.068,.015,x,.109,-.172,'satin');
 return turn(g,.33);
}
function wrappedSweet(color,bag){
 const g=new THREE.Group();
 if(bag){
  box(g,color,.518,.141,.692,.045,0,0,0,'glaze');
  for(const z of [-.347,.347]){
   box(g,'#d9d7c1',.515,.047,.081,.010,0,0,z,'metal');
   for(let k=-2;k<=2;k++)box(g,'#716f78',.013,.012,.065,.003,k*.090,.023,z,'satin');
  }
  for(const [x,z,c] of [[-.113,-.067,'#eeaa87'],[.039,.145,'#e1c17e'],[.091,-.109,'#c98ea9']]){
   oval(g,c,.085,.018,.066,x,.077,z,'glaze');
  }
 }else{
  oval(g,color,.243,.131,.241,0,0,0,'glaze',28);
  for(const s of [-1,1]){
   const fan=disk(g,color,.195,.061,.255,s*.294,0,0,'satin');
   fan.rotation.z=-s*Math.PI/2;fan.scale.z=.28;
   for(let i=-2;i<=2;i++)tube(g,'#ead5a9',[[s*.202,.048,i*.014],[s*.281,.057,i*.051],[s*.405,.041,i*.082]],.006,'satin');
  }
 }
 return turn(g,bag?.73:.34);
}
const studioEntries=new Map(),studioBuilders={};
function studioRoute(id,condition,kind,build){
 const options=studioEntries.get(id)??[];
 options.push([condition,kind]);
 studioEntries.set(id,options);
 studioBuilders[kind]=build;
}
function studioColors(label,english,ids,colors,pattern,build){
 ids.forEach((id,i)=>{
  const color=colors[i];
  studioRoute(id,new RegExp(pattern+'|^'+english+' '+color+'$'),label+'-'+color.toLowerCase(),()=>build(palette[color],color));
 });
}
studioRoute(1409,/太极.*牌|^Ying Yang Red$/,'tai-chi-plaque',woodPlaque);
studioRoute(1409,/红豆布袋/,'bean-sachet',beanSachet);
studioColors('movie-reel','Movie Roll',[1203,1204,1205,1206,1207,1208,1209,1210],['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],'胶片盘',reel);
studioColors('little-chair','Chair',[303,304,305,306,307,308,309,310],['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'小椅子|木椅',littleChair);
studioColors('trekking-bag','Camping Bag',[1419,1420,1421,1422,1423,1424,1425],['Blue','Green','Orange','Pink','Purple','Red','Yellow'],'登山包|露营包',trekkingBag);
studioColors('desk-clock','Clock',[1487,1488,1489,1490,1491,1492,1493,1494],['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],'电子.*钟',deskClock);
studioColors('radio','Radio',[219,220,221,222,223,224,225],['Blue','Green','Orange','Purple','Pink','Red','Yellow'],'收音机',radio);
studioColors('barrel','Barrel',[1667,1668,1669,1670,1671,1672,1673],['Blue','Brown','Green','Grey','Pink','Red','Yellow'],'木桶',(color,name)=>barrel(color,name==='Yellow'?'diamond':'stripe'));
studioColors('wrapped-candy','Candy',[386,387,388,389,390,391],['Green','Orange','Pink','Purple','Red','Yellow'],'包装糖|包纸糖|包糖',color=>wrappedSweet(color,false));
studioRoute(385,/软糖|^Candy Blue$/,'blue-gummy-bag',()=>wrappedSweet(palette.Blue,true));
for(let i=0;i<7;i++)studioRoute(791+i,/多米诺|^Domino\d+$/,'domino-'+i,()=>domino(i));
for(let i=0;i<8;i++){
 const color=['Blue','Pink','Red','Yellow'][Math.floor(i/2)];
 studioRoute(844+i,/玩偶|洋娃娃|^Doll /,'dress-doll-'+color.toLowerCase()+'-'+i%2,()=>dressDoll(palette[color],i%2));
}

function edgeOutline(length,width,waist=1){
 const shape=new THREE.Shape();
 shape.moveTo(0,-length);
 shape.bezierCurveTo(width*.8,-length,width,-length*.68,width*waist,-length*.2);
 shape.bezierCurveTo(width*(waist+.09),length*.2,width*.65,length,0,length);
 shape.bezierCurveTo(-width*.65,length,-width*(waist+.09),length*.2,-width*waist,-length*.2);
 shape.bezierCurveTo(-width,-length*.68,-width*.8,-length,0,-length);
 return shape;
}
function extrudedSurface(g,shape,color,y,z,depth,bevel,finish){
 const model=mesh(g,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:15}),color,0,y,z,finish);
 model.rotation.x=-Math.PI/2;
 return model;
}
function boardSport(color,snow){
 const g=new THREE.Group();
 const length=snow?.438:.403,width=snow?.148:.217;
 extrudedSurface(g,edgeOutline(length,width,snow?.78:.90),'#b99a72',-.052,0,.030,.014,'satin');
 extrudedSurface(g,edgeOutline(length*.984,width*.980,snow?.78:.90),color,-.014,0,.029,.012,'glaze');
 if(snow){
  for(const z of [-.153,.146]){
   box(g,'#cfc5ac',.193,.042,.139,.016,0,.036,z,'satin').rotation.y=.19;
   tube(g,'#67594d',[[-.082,.051,z-.032],[-.042,.090,z-.041],[.057,.090,z+.004],[.086,.053,z+.024]],.014,'satin');
  }
 }else{
  const stripe=oval(g,'#e7c790',.021,.007,.337,0,.043,0,'satin');
  stripe.rotation.y=.13;
  oval(g,'#d5ac79',.105,.008,.096,0,.045,-.164,'satin');
  oval(g,color,.078,.009,.068,0,.053,-.163,'satin');
  box(g,'#776448',.057,.081,.128,.022,0,-.089,.236,'satin');
 }
 return turn(g,.30);
}
function racket(color,table){
 const g=new THREE.Group(),z=-.169;
 if(table){
  extrudedSurface(g,edgeOutline(.283,.207), '#c6a57a',-.044,z,.066,.019,'satin');
  extrudedSurface(g,edgeOutline(.279,.204),color,.028,z,.022,.011,'satin');
 }else{
  const rim=ring(g,color,.246,.030,0,.018,z,'glaze');
  rim.rotation.x=Math.PI/2;rim.scale.y=1.21;
  for(let i=-4;i<=4;i++){
   const x=i*.045,maxZ=.288*Math.sqrt(1-(x/.227)**2);
   const y=i%2*.006;
   box(g,'#e5d0a3',.006,.006,maxZ*2,.002,x,y,z,'satin');
   const dz=i*.055,maxX=.233*Math.sqrt(1-(dz/.287)**2);
   box(g,'#e5d0a3',maxX*2,.006,.006,.002,0,y+.004,z+dz,'satin');
  }
  for(const x of [-.094,.094])tube(g,color,[[x,0,.096],[x*.60,0,.181],[0,0,.261]],.022,'glaze');
 }
 box(g,table?'#bd946a':'#766651',table?.095:.083,.061,table?.306:.244,.028,0,0,table?.234:.313,'satin');
 return turn(g,.27);
}
function toyEngine(color){
 const g=new THREE.Group();
 box(g,'#c35e57',.473,.121,.739,.041,0,-.103,0);
 box(g,color??'#8da66c',.420,.305,.284,.044,0,.059,.186);
 box(g,'#dbad65',.448,.084,.308,.038,0,.222,.194);
 const boiler=disk(g,color??'#779ca8',.140,.140,.372,0,.030,-.126);
 boiler.rotation.x=Math.PI/2;
 disk(g,'#dba16b',.083,.062,.164,0,.158,-.244);
 for(const x of [-.232,.232])for(const z of [-.238,-.024,.196]){
  const outer=disk(g,'#6c655f',.103,.103,.055,x,-.148,z,'satin');outer.rotation.z=Math.PI/2;
  disk(g,'#d5a170',.051,.050,.059,x,-.148,z).rotation.z=Math.PI/2;
 }
 return turn(g,.46);
}
function violin(color='#ad7048'){
 const g=new THREE.Group(),shape=new THREE.Shape();
 shape.moveTo(0,.246);
 shape.bezierCurveTo(.335,.246,.314,.007,.202,-.061);
 shape.bezierCurveTo(.151,-.110,.116,-.143,.181,-.192);
 shape.bezierCurveTo(.264,-.306,.135,-.347,0,-.347);
 shape.bezierCurveTo(-.135,-.347,-.264,-.306,-.181,-.192);
 shape.bezierCurveTo(-.116,-.143,-.151,-.110,-.202,-.061);
 shape.bezierCurveTo(-.314,.007,-.335,.246,0,.246);
 extrudedSurface(g,shape,color,-.066,.085,.129,.027,'satin');
 box(g,'#664b40',.102,.048,.414,.023,0,.089,-.237,'satin');
 box(g,'#d7af7d',.134,.041,.024,.007,0,.089,.136,'satin');
 for(const x of [-.090,.090]){
  tube(g,'#674b40',[[x,.092,.058],[x*1.38,.099,.097],[x,.092,.147]],.009,'satin');
  oval(g,'#a78168',.062,.026,.026,x*.55,.070,-.389,'satin');
 }
 for(let i=0;i<4;i++){
  const x=(i-1.5)*.014;
  tube(g,'#e7cc9e',[[x*.48,.112,-.423],[x,.126,.121],[x*.6,.094,.347]],.0035,'satin');
 }
 return turn(g,.31);
}
function recordDisc(color){
 const g=new THREE.Group();
 disk(g,'#5b5758',.343,.339,.049,0,-.018,0,'satin');
 for(let i=0;i<7;i++)ring(g,i%2?'#6c6160':'#776d65',.166+i*.024,.0035,0,.008,0,'satin').rotation.x=Math.PI/2;
 disk(g,color,.135,.135,.009,0,.011,0,'satin');
 ring(g,'#ecd5a7',.088,.005,0,.016,0,'satin').rotation.x=Math.PI/2;
 disk(g,'#4d4949',.019,.019,.007,0,.018,0,'satin');
 return turn(g,.35);
}
function littleBird(color){
 const g=new THREE.Group();
 oval(g,color,.248,.180,.286,0,0,.086,'glaze',34);
 oval(g,color,.178,.162,.168,0,.121,-.163,'glaze',28);
 oval(g,'#dba267',.066,.044,.097,0,.122,-.302,'satin');
 for(const x of [-.111,.111]){
  oval(g,'#4d483f',.028,.028,.023,x,.201,-.234);
  const wing=oval(g,color,.088,.087,.215,x*1.31,.075,.139,'satin',22);
  wing.rotation.y=Math.sign(x)*.31;
  oval(g,'#eac58f',.060,.019,.087,x*.78,-.157,.052,'satin');
 }
 const tail=oval(g,color,.118,.055,.161,0,.050,.309);
 tail.rotation.x=-.29;
 return turn(g,.36);
}
function smallLoaf(color){
 const g=new THREE.Group();
 const roll=baked(g,[.269,.168,.364],[0,0,0]);
 const tint=new THREE.Color(color);
 const attributes=roll.geometry.attributes.color;
 for(let i=0;i<attributes.count;i++){
  const c=new THREE.Color().fromBufferAttribute(attributes,i).lerp(tint,.20);
  attributes.setXYZ(i,c.r,c.g,c.b);
 }
 for(const z of [-.160,-.009,.143]){
  tube(g,'#f2ca93',[[-.131,.129,z-.034],[.017,.163,z],[.116,.136,z+.050]],.013,'matte');
 }
 return turn(g,.30);
}
const motionEntries=new Map(),motionBuilders={};
function motionRoute(id,condition,kind,build){
 const options=motionEntries.get(id)??[];
 options.push([condition,kind]);
 motionEntries.set(id,options);
 motionBuilders[kind]=build;
}
function motionColors(label,english,ids,colors,pattern,build){
 ids.forEach((id,i)=>{
  const color=colors[i];
  motionRoute(id,new RegExp(pattern+'|^'+english+' '+color+'$'),label+'-'+color.toLowerCase(),()=>build(palette[color]));
 });
}
motionColors('snowboard','Snowboard',[1896,1897,1898,1899,1900,1901,1902],['Red','Purple','Pink','Orange','Grey','Green','Blue'],'滑雪板',color=>boardSport(color,true));
motionColors('surfboard','Surf',[619,620,621,622,623,624,625],['Blue','Brown','Green','Grey','Orange','Pink','Purple'],'冲浪板',color=>boardSport(color,false));
motionColors('tennis-racket','Tennis Racket',[627,628,629,630,631,632,633],['Blue','Green','Orange','Pink','Purple','Red','Yellow'],'网球拍',color=>racket(color,false));
motionColors('songbird','Bird',[913,914,915,916,917],['Blue','Green','Grey','Pink','Yellow'],'小鸟',littleBird);
motionColors('loaf','Bread',[366,367,368,369,370],['Brown','Orange','Red','White','Yellow'],'面包',smallLoaf);
motionRoute(367,/红绳粽子/,'rice-dumpling-red',()=>riceDumpling('#b46f6a'));
motionRoute(1459,/棉花糖|^Marshmallow Pink$/,'pink-marshmallow-skewer',()=>marshmallows('#df9faa'));
motionRoute(149,/火车|^Train All Colors$/,'toy-engine',toyEngine);
motionRoute(254,/小提琴|^Violin Brown$/,'wooden-violin',violin);
motionRoute(1526,/唱片|^Music Disc Yellow$/,'music-disc-yellow',()=>recordDisc('#daba73'));
motionRoute(587,/乒乓球拍|^Ping Pong Racket$/,'ping-pong-paddle',()=>racket('#c96a5e',true));
motionRoute(50,/葡萄|^Grape Red$/,'red-grapes',()=>grapes(['#b67680','#a46278','#cb8390']));

function fruitCarton(color,label,fruit){
 const g=new THREE.Group();
 box(g,color,.515,.282,.716,.042,0,0,.014,'satin');
 box(g,'#f0dcb3',.498,.035,.104,.017,0,.072,-.349,'satin');
 const cap=disk(g,'#e9d7a8',.061,.066,.040,.117,.158,-.237,'satin');
 cap.rotation.z=-.05;
 printed(g,.462,.565,0,.142,.061,c=>{
  c.fillStyle='#f6e6c7';c.fillRect(0,0,512,512);
  c.fillStyle=color;c.beginPath();c.roundRect(34,35,444,440,44);c.fill();
  c.fillStyle=fruit;c.beginPath();c.ellipse(256,206,103,124,-.28,0,tau);c.fill();
  c.fillStyle='#81945d';c.beginPath();c.ellipse(294,88,70,28,-.36,0,tau);c.fill();
  c.textAlign='center';c.font='bold 74px sans-serif';c.fillStyle='#fff0cc';printInk(c,label,256,409);
 });
 return turn(g,.32);
}
function gameConsole(color){
 const g=new THREE.Group();
 box(g,color,.523,.127,.775,.057,0,0,0,'glaze');
 box(g,'#56534f',.441,.020,.289,.024,0,.068,-.171,'satin');
 box(g,'#a0af96',.337,.011,.183,.014,0,.082,-.179,'glaze');
 box(g,'#4e4a47',.135,.016,.041,.011,-.122,.078,.145,'satin');
 box(g,'#4e4a47',.041,.016,.135,.011,-.122,.078,.145,'satin');
 for(const [x,z] of [[.084,.185],[.172,.132]])disk(g,'#e1b47f',.032,.031,.023,x,.077,z);
 for(const y of [.242,.268,.294])box(g,'#a86050',.064,.005,.006,.002,.123,.068,y,'satin');
 return turn(g,.26);
}
function soap(){
 const g=new THREE.Group();
 box(g,'#df9aa6',.623,.216,.420,.098,0,0,0,'ice');
 const trace=ring(g,'#f1bbc0',.131,.006,0,.108,0,'satin');
 trace.rotation.x=Math.PI/2;trace.scale.x=1.62;
 oval(g,'#e7acb2',.063,.010,.036,0,.107,0,'ice');
 return turn(g,.31);
}
function forklift(color){
 const g=new THREE.Group();
 box(g,color,.493,.206,.622,.040,0,-.034,.055);
 box(g,color,.496,.069,.337,.026,0,.290,.152);
 box(g,'#8c7660',.239,.112,.144,.034,0,.095,.187,'satin');
 for(const s of [-1,1]){
  for(const z of [-.038,.245]){
   box(g,'#655c57',.042,.263,.040,.012,s*.202,.170,z,'satin');
   disk(g,'#574f4b',.090,.085,.077,s*.241,-.146,z,'satin').rotation.z=Math.PI/2;
   disk(g,'#dbbb87',.049,.049,.080,s*.248,-.146,z).rotation.z=Math.PI/2;
  }
  box(g,'#756e66',.047,.364,.043,.013,s*.194,.036,-.277,'satin');
  box(g,'#a6aba3',.062,.041,.230,.010,s*.124,-.119,-.367,'metal');
 }
 return turn(g,.43);
}
function airBalloon(color,pattern){
 const g=new THREE.Group(),geometry=new THREE.SphereGeometry(1,44,28);
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const taper=.86+.14*p.getY(i),a=Math.atan2(p.getZ(i),p.getX(i));
  const seam=1+.019*Math.cos(a*12);
  p.setX(i,p.getX(i)*taper*seam);p.setZ(i,p.getZ(i)*taper*seam);
 }
 geometry.computeVertexNormals();
 const shell=mesh(g,geometry,color,0,.142,0);
 shell.scale.set(.346,.374,.346);
 const canvas=Object.assign(document.createElement('canvas'),{width:512,height:256}),c=canvas.getContext('2d');
 c.fillStyle=color;c.fillRect(0,0,512,256);
 c.fillStyle='#f0d29c';c.strokeStyle='#f0d29c';
 if(pattern==='Striped'){
  for(let i=0;i<8;i++)c.fillRect(i*64+4,0,12,256);
 }else{
  for(let i=0;i<21;i++){
   const x=(i*61)%512,y=52+(i*43)%152;
   const size=7+i%5;
   c.beginPath();
   if(pattern==='Hearts'){
    c.moveTo(x,y+size);
    c.bezierCurveTo(x-size*2,y-size*.32,x-size*.79,y-size*1.60,x,y-size*.47);
    c.bezierCurveTo(x+size*.79,y-size*1.60,x+size*2,y-size*.32,x,y+size);
   }else if(pattern==='Clovers'){
    for(const angle of [0,tau/3,tau*2/3]){
     const dx=x+Math.cos(angle)*size*.55,dy=y+Math.sin(angle)*size*.55;
     c.moveTo(dx+size*.59,dy);c.arc(dx,dy,size*.59,0,tau);
    }
    c.rect(x-1.4,y+1,2.8,size);
   }else if(pattern==='Stars'){
    for(let point=0;point<10;point++){
     const angle=point*tau/10-Math.PI/2,r=point%2?size*.44:size;
     c.lineTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r);
    }
   }else c.arc(x,y,size*.77,0,tau);
   c.fill();
  }
 }
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 shell.material=new THREE.MeshPhysicalMaterial({map,roughness:.33,clearcoat:.64});
 box(g,'#aa8159',.180,.136,.174,.032,0,-.333,0,'satin');
 for(const x of [-.065,.065])for(const z of [-.063,.063])tube(g,'#b3946c',[[x,-.295,z],[x*.78,-.240,z*.78],[x*.70,-.161,z*.73]],.009,'satin');
 return turn(g,.81);
}
function capsule(color){
 const g=new THREE.Group();
 const form=[[0,-.276],[.229,-.276],[.264,-.232],[.241,-.100],[.189,.096],[.153,.235],[.118,.294],[0,.307]].map(p=>new THREE.Vector2(...p));
 mesh(g,new THREE.LatheGeometry(form,46),color,0,0,0);
 ring(g,'#edc590',.227,.018,0,-.180,0,'satin').rotation.x=Math.PI/2;
 ring(g,'#d8b483',.173,.013,0,.108,0,'satin').rotation.x=Math.PI/2;
 const portal=ring(g,'#e1bf8a',.089,.018,0,.024,.211,'satin');
 portal.rotation.x=-.21;
 oval(g,'#629aa9',.087,.085,.035,0,.024,.211,'ice');
 return turn(g,.76);
}
function seaStar(color){
 const g=new THREE.Group(),shape=new THREE.Shape();
 const point=(i,offset=0)=>{
  const a=(i+offset)*tau/10,r=i%2?.180:.392;return [r*Math.sin(a),-r*Math.cos(a)];
 };
 shape.moveTo(...point(0,-.14));
 for(let i=0;i<10;i++)shape.quadraticCurveTo(...point(i),...point((i+1)%10,-.14));
 extrudedSurface(g,shape,color,-.057,0,.103,.034,'glaze');
 for(let i=0;i<5;i++){
  const a=i*tau/5;
  for(const r of [.086,.149,.218,.275])oval(g,'#eed5a6',.012,.008,.012,Math.sin(a)*r,.059,Math.cos(a)*r,'satin',12);
 }
 return turn(g,.34);
}
function parasol(color){
 const g=new THREE.Group();
 const points=[];
 for(let i=0;i<=14;i++){
  const r=i/14;
  points.push(new THREE.Vector2(r*.417,.245-.201*r*r));
 }
 const geometry=new THREE.LatheGeometry(points,64);
 const p=geometry.attributes.position;
 const colors=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),angle=(Math.atan2(z,x)+tau)%tau;
  const panel=Math.floor(angle*8/tau),shade=new THREE.Color(color).lerp(new THREE.Color('#f4deae'),panel%2?.48:.08);
  p.setY(i,p.getY(i)-.019*Math.abs(Math.sin(angle*4)));
  colors.push(shade.r,shade.g,shade.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();
 const shade=mesh(g,geometry,color);
 shade.material=new THREE.MeshPhysicalMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.63,clearcoat:.29});
 disk(g,'#d5ac78',.028,.026,.490,0,-.022,0,'satin');
 oval(g,'#ebcc96',.038,.033,.037,0,.247,0,'satin');
 for(let i=0;i<8;i++){
  const a=i*tau/8;
  tube(g,'#caaa7e',[[0,.231,0],[Math.sin(a)*.219,.166,Math.cos(a)*.219],[Math.sin(a)*.409,.043,Math.cos(a)*.409]],.006,'satin');
 }
 return turn(g,.56);
}
function crate(color){
 const g=new THREE.Group();
 box(g,color,.560,.469,.594,.030,0,0,0,'satin');
 for(const s of [-1,1]){
  for(const x of [-.248,.248])box(g,'#a68568',.057,.484,.045,.010,x,0,s*.298,'satin');
  for(const y of [-.192,-.067,.064,.192])box(g,'#dfc298',.518,.009,.014,.004,0,y,s*.301,'satin');
  box(g,'#b18c65',.531,.046,.050,.012,0,s*.209,s*.295,'satin');
 }
 for(const x of [-.16,0,.16])box(g,'#debd93',.010,.009,.545,.004,x,.232,0,'satin');
 return turn(g,.50);
}
function hockeyStick(color){
 const g=new THREE.Group();
 tube(g,color,[[.03,0,-.420],[0,.003,-.168],[-.043,.003,.137],[-.062,0,.314],[.021,0,.384],[.190,0,.350]],.037,'glaze');
 box(g,'#d2b283',.075,.060,.151,.025,.026,0,-.374,'satin');
 const blade=box(g,color,.228,.052,.073,.024,.115,0,.364,'satin');blade.rotation.y=.15;
 return turn(g,.24);
}
const collectionEntries=new Map(),collectionBuilders={};
function collectionRoute(id,condition,kind,build){
 const options=collectionEntries.get(id)??[];
 options.push([condition,kind]);
 collectionEntries.set(id,options);
 collectionBuilders[kind]=build;
}
function collectionColors(label,english,ids,colors,condition,build){
 ids.forEach((id,i)=>{
  const hue=colors[i];
  collectionRoute(id,new RegExp(condition+'|^'+english+' '+hue+'$'),label+'-'+hue.toLowerCase(),()=>build(palette[hue]??'#605c64',hue));
 });
}
collectionRoute(657,/芒果.*汁|^Juice Yellow$/,'mango-carton',()=>fruitCarton('#d59447','芒果','#e9bc67'));
collectionRoute(656,/莓果.*汁|^Juice Red$/,'berry-carton',()=>fruitCarton('#b96978','莓果','#d9a1bb'));
collectionRoute(655,/葡萄.*汁|^Juice Purple$/,'grape-carton',()=>fruitCarton('#9275a2','葡萄','#d3a3b6'));
collectionRoute(653,/苹果.*汁|^Juice Green$/,'apple-carton',()=>fruitCarton('#82a76f','青果','#a8c374'));
collectionRoute(832,/香皂/,'pink-soap',soap);
collectionRoute(584,/乒乓球|^Ping Pong Ball Orange$/,'orange-ping-pong',()=>pingPong('#dfa561','#ce9057'));
collectionRoute(675,/纸杯|^Paper Cup White$/,'white-paper-cup',()=>paperCup('#eadcc4'));
collectionColors('game-console','Console',[828,829,830,831,832,833,834],['Blue','Green','Pink','Purple','Red','White','Yellow'],'掌机',gameConsole);
collectionColors('forklift','Forklift',[87,88,89,90,91],['Blue','Green','Pink','Purple','Yellow'],'叉车',forklift);
collectionColors('capsule','Space Capsul',[979,980,981,982,983,984,985,986],['Yellow','Red','Purple','Pink','Orange','Grey','Green','Blue'],'太空舱',capsule);
collectionColors('starfish','Starfish',[1588,1589,1590,1591,1592,1593,1594],['Blue','Green','Orange','Pink','Purple','Red','Yellow'],'海星玩具',seaStar);
collectionColors('parasol','Parasol',[1312,1313,1314,1315,1316,1317,1319,1320],['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'遮阳伞',parasol);
collectionColors('coil-notebook','Notebook',[327,328,329,330,331,332,333],['Green','Grey','Orange','Pink','Purple','Red','Yellow'],'线圈本|作业本',color=>boundBook({coil:true,title:'作业本',color,label:'横线练习'}));
collectionColors('crate','Crate',[776,777,778,779,780,781,782],['Blue','Brown','Green','Grey','Pink','Purple','Red'],'货箱|木箱',crate);
collectionColors('hockey-stick','Hockey Stick',[1919,1920,1921,1922,1923,1924,1925,1926],['Red','Purple','Pink','Orange','Black','Green','Blue','Yellow'],'曲棍球杆|冰球杆',hockeyStick);
for(const [id,hue,pattern] of [[98,'Green','Clovers'],[99,'Blue','Dots'],[100,'Red','Hearts'],[101,'Yellow','Stars'],[102,'Blue','Striped'],[103,'Green','Striped'],[104,'Orange','Striped'],[105,'Purple','Striped'],[106,'Red','Striped'],[107,'Yellow','Striped']]){
 const kind='air-balloon-'+pattern.toLowerCase()+'-'+hue.toLowerCase();
 collectionRoute(id,new RegExp('热气球|^Hot Air Balloon '+pattern+' '+hue+'$'),kind,()=>airBalloon(palette[hue],pattern));
}

function captainHat(color){
 const g=new THREE.Group();
 const brim=oval(g,'#4f535c',.297,.041,.278,0,-.088,.115,'satin');
 brim.rotation.x=.21;
 oval(g,color,.307,.123,.283,0,.018,-.034,'satin',36);
 oval(g,color,.328,.126,.302,0,.106,-.095,'satin',36);
 tube(g,'#e5c48d',[[-.220,.010,.138],[-.109,.013,.218],[.101,.013,.226],[.216,.014,.144]],.012,'satin');
 disk(g,'#dbbd88',.053,.052,.013,0,.222,-.042,'satin');
 return turn(g,.49);
}
function orchardPear(color){
 const g=new THREE.Group(),profile=new THREE.SplineCurve([[0,-.369],[.165,-.380],[.276,-.323],[.329,-.216],[.31,-.089],[.221,.068],[.146,.185],[.141,.291],[.083,.351],[0,.363]].map(p=>new THREE.Vector2(...p))).getPoints(45);
 profile.forEach(p=>{p.x=Math.max(0,p.x);});
 const pear=mesh(g,new THREE.LatheGeometry(profile,42),color,0,0,0,'satin');
 const canvas=Object.assign(document.createElement('canvas'),{width:256,height:256}),c=canvas.getContext('2d');
 c.fillStyle='#969696';c.fillRect(0,0,256,256);
 c.fillStyle='#7b7b7b';
 for(let i=0;i<550;i++){
  c.beginPath();c.arc(i*97%256,i*173%253,.38+i%7*.12,0,tau);c.fill();
 }
 const bump=new THREE.CanvasTexture(canvas);
 pear.material=new THREE.MeshPhysicalMaterial({color,bumpMap:bump,bumpScale:.012,roughness:.39,clearcoat:.43,clearcoatRoughness:.24});
 tube(g,'#886248',[[.012,.352,0],[.036,.411,.013],[.062,.438,.018]],.018,'matte');
 oval(g,'#8fa269',.117,.017,.048,.115,.373,.022,'satin').rotation.z=.24;
 return turn(g,.76);
}
function kitchenKnife(color){
 const g=new THREE.Group(),steel=new THREE.Shape();
 steel.moveTo(-.077,-.121);steel.lineTo(-.082,.404);
 steel.quadraticCurveTo(.080,.390,.149,.221);steel.lineTo(.159,-.125);steel.closePath();
 extrudedSurface(g,steel,'#c6c7bb',-.031,0,.046,.012,'metal');
 tube(g,'#ded9be',[[.138,.021,.100],[.123,.014,-.224],[.024,.007,-.378]],.008,'satin');
 box(g,color,.147,.102,.336,.043,-.003,-.004,.255,'satin');
 for(const z of [.177,.294])disk(g,'#d9bb84',.018,.018,.006,0,.050,z,'satin');
 return turn(g,.29);
}
function servingSpoon(){
 const g=new THREE.Group();
 const points=[[0,-.057],[.106,-.053],[.148,-.025],[.172,.015],[.175,.036],[.166,.037],[.150,.008],[.109,-.019],[.058,-.033],[0,-.037]].map(p=>new THREE.Vector2(...p));
 const bowl=mesh(g,new THREE.LatheGeometry(points,44),'#c2c9c3',0,-.011,-.197,'metal');
 bowl.scale.z=1.42;
 bowl.material=new THREE.MeshPhysicalMaterial({color:'#d1d5cd',metalness:.64,roughness:.24,clearcoat:.40,clearcoatRoughness:.13});
 tube(g,'#b6bbb5',[[0,-.012,.011],[0,-.006,.129],[0,.015,.295],[0,.023,.421]],.031,'metal');
 return turn(g,.30);
}
function thermosEnamel(color){
 const canvas=Object.assign(document.createElement('canvas'),{width:640,height:384});
 const c=canvas.getContext('2d');
 c.fillStyle=color;
 c.fillRect(0,0,640,384);
 c.strokeStyle='#e8c38b';
 c.lineWidth=3;
 for(const y of [54,328]){
  c.beginPath();c.moveTo(0,y);c.lineTo(640,y);c.stroke();
 }
 for(const x of [124,436]){
  c.strokeStyle='#f4cf9c';
  c.lineWidth=2;
  c.beginPath();c.moveTo(x-17,257);c.quadraticCurveTo(x-1,235,x+28,220);c.stroke();
  for(const [dx,dy] of [[-19,235],[25,217],[0,227]]){
   c.fillStyle='#f1d7ad';
   for(let i=0;i<5;i++){
    const angle=i*tau/5;
    c.beginPath();c.ellipse(x+dx+Math.cos(angle)*9,dy+Math.sin(angle)*9,6,4,angle,0,tau);c.fill();
   }
   c.fillStyle='#d99e62';c.beginPath();c.arc(x+dx,dy,4,0,tau);c.fill();
  }
 }
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;
 map.anisotropy=4;
 return new THREE.MeshPhysicalMaterial({map,roughness:.27,clearcoat:.85,clearcoatRoughness:.14});
}
function travelBottle(color,thermos){
 const g=new THREE.Group(),profile=new THREE.SplineCurve([[0,-.363],[.165,-.365],[.221,-.342],[.230,-.285],[.227,.111],[.223,.184],[.172,.229],[.143,.248],[.139,.266],[0,.268]].map(p=>new THREE.Vector2(...p))).getPoints(42);
 profile.forEach(p=>{p.x=Math.max(0,p.x);});
 const body=mesh(g,new THREE.LatheGeometry(profile,48),color,0,0,0);
 if(thermos)body.material=thermosEnamel(color);
 disk(g,'#e5d2ac',.169,.175,.144,0,.300,0,'satin');
 if(thermos){
  disk(g,'#eddbb8',.163,.167,.035,0,.375,0,'glaze');
  ring(g,'#d2a777',.178,.011,0,.249,0,'satin').rotation.x=Math.PI/2;
 }
 for(const y of [-.301,.215]){
  const seam=ring(g,thermos?'#d5b27c':'#d5c8a9',y<0?.226:.174,.011,0,y,0,'satin');
  seam.rotation.x=Math.PI/2;
 }
 if(thermos){
  tube(g,'#e5c89a',[[.173,.125,.008],[.310,.095,.010],[.328,-.104,.017],[.218,-.164,.014]],.031,'satin');
 }else{
  tube(g,'#a79678',[[.101,.358,.034],[.225,.363,.029],[.267,.316,.029],[.158,.280,.027]],.015,'satin');
 }
 return turn(g,.72);
}
function pizzaSlice(){
 const g=new THREE.Group(),shape=new THREE.Shape();
 shape.moveTo(0,-.373);shape.lineTo(.297,.278);shape.quadraticCurveTo(0,.403,-.297,.278);shape.closePath();
 extrudedSurface(g,shape,'#bd8556',-.106,0,.151,.034,'matte');
 extrudedSurface(g,shape,'#e7bf78',.055,0,.031,.016,'satin');
 tube(g,'#cc965b',[[-.279,.105,-.280],[-.142,.129,-.328],[0,.130,-.344],[.151,.129,-.329],[.273,.107,-.280]],.051,'matte');
 for(const [x,z] of [[-.131,-.196],[.143,-.164],[-.043,.042],[.032,-.247]])oval(g,'#ba6b54',.060,.011,.054,x,.093,z,'satin');
 for(const [x,z] of [[.071,-.107],[-.108,-.063],[.020,.223]])oval(g,'#819962',.039,.013,.021,x,.091,z,'satin').rotation.y=.56;
 return turn(g,.31);
}
function baseball(leather='#eee0c1',thread='#b36a5d'){
 const g=new THREE.Group();
 oval(g,leather,.347,.347,.347,0,0,0,'satin',42);
 for(const side of [-1,1]){
  const curve=[];
  for(let i=0;i<=28;i++){
   const a=i*tau/28,b=side*(.40+.22*Math.sin(a));
   curve.push([Math.sin(b)*.347,Math.cos(a)*Math.cos(b)*.347,Math.sin(a)*Math.cos(b)*.347]);
  }
  tube(g,'#a87867',curve,.007,'satin');
  for(let i=1;i<24;i++){
   const [x,y,z]=curve[i];
   const stitch=oval(g,thread,.018,.006,.009,x*1.01,y*1.013,z*1.013,'satin',13);
   stitch.rotation.x=i*tau/28;stitch.rotation.y=.35*side;
  }
 }
 return turn(g,.23);
}
function confettiCookie(color,fill){
 const g=new THREE.Group();
 const dough=baked(g,[.347,.087,.331],[0,0,0]);
 if(color) dough.material=new THREE.MeshPhysicalMaterial({color,roughness:.65,clearcoat:.10});
 if(fill==='jam'){
  oval(g,'#bc6571',.175,.024,.169,0,.083,0,'glaze',32);
 }else{
  for(let i=0;i<11;i++){
   const a=i*2.40,r=.071+i*.022,x=Math.cos(a)*r,z=Math.sin(a)*r;
   const c=fill==='rainbow'?['#b96f90','#e0bf6e','#8aa477','#7da7bb'][i%4]:'#81604e';
   oval(g,c,.028,.010,.025,x,.085-r*r*.4,z,'satin',16);
  }
 }
 return turn(g,.24);
}
function scallop(color){
 const g=new THREE.Group(),shape=new THREE.Shape();
 shape.moveTo(-.085,.286);
 shape.bezierCurveTo(-.145,.161,-.409,-.083,-.314,-.282);
 shape.bezierCurveTo(-.211,-.378,.211,-.378,.314,-.282);
 shape.bezierCurveTo(.409,-.083,.145,.161,.085,.286);
 shape.quadraticCurveTo(0,.348,-.085,.286);
 extrudedSurface(g,shape,color,-.061,0,.101,.035,'glaze');
 for(let i=-3;i<=3;i++){
  tube(g,'#eec6a2',[[i*.023,.054,-.217],[i*.058,.071,.020],[i*.083,.056,.278]],.009,'satin');
 }
 return turn(g,.39);
}
function boxedNoodles(){
 const g=new THREE.Group();
 box(g,'#e2c6a0',.582,.218,.640,.052,0,0,0,'satin');
 box(g,'#ccab81',.511,.035,.567,.030,0,.101,0,'satin');
 for(let i=-3;i<=3;i++){
  const x=i*.057;
  tube(g,'#e4be73',[[x,.128,-.259],[x+.041,.130,-.108],[x-.037,.125,.067],[x+.034,.137,.212],[x-.016,.133,.256]],.018,'satin');
 }
 for(const [x,z] of [[-.090,-.089],[.071,.058],[.116,-.124],[-.054,.146]])oval(g,'#819866',.040,.010,.021,x,.144,z,'satin').rotation.y=.65;
 return turn(g,.38);
}
function dairyCup(color,milkshake){
 const g=new THREE.Group();
 disk(g,color,.265,.167,.433,0,-.047,0,'satin');
 disk(g,'#f1dbb5',.270,.240,.043,0,.177,0,'satin');
 if(milkshake){
  oval(g,'#efdebd',.212,.101,.216,0,.205,0,'ice');
  tube(g,'#d5938d',[[.073,.196,.018],[.070,.295,.023],[.108,.385,.031]],.021,'satin');
 }else{
  disk(g,color,.232,.232,.017,0,.201,0,'glaze');
  printed(g,.287,.220,0,.214,0,c=>{
   c.fillStyle=color;c.fillRect(0,0,512,512);
   c.textAlign='center';c.font='bold 112px sans-serif';c.fillStyle='#ffedc8';printInk(c,'酸奶',256,304);
  });
 }
 return turn(g,.65);
}
function celadonBowl(){
 const g=new THREE.Group(),profile=[[0,-.153],[.183,-.154],[.211,-.135],[.276,-.061],[.329,.072],[.337,.143],[.338,.174],[.302,.175],[.286,.119],[.237,.015],[.184,-.033],[.133,-.048],[0,-.050]].map(p=>new THREE.Vector2(...p));
 mesh(g,new THREE.LatheGeometry(profile,50),'#8bafa1',0,0,0,'glaze');
 return turn(g,.72);
}
function utensilsJar(){
 const g=new THREE.Group();
 const body=disk(g,'#aca07e',.224,.209,.404,0,-.043,0,'satin');
 body.rotation.x=-.06;
 const rim=ring(g,'#d3b184',.226,.017,0,.169,0,'satin');
 rim.rotation.x=Math.PI/2;
 for(const x of [-.118,-.042,.040,.119]){
  tube(g,'#a17b55',[[x*.68,.060,0],[x,.265,.04*Math.sin(x*20)],[x*1.42,.450,.08*Math.sin(x*20)]],.018,'satin');
 }
 return turn(g,.60);
}
const pantrywareEntries=new Map(),pantrywareBuilders={};
function pantrywareRoute(id,condition,kind,build){
 const options=pantrywareEntries.get(id)??[];
 options.push([condition,kind]);
 pantrywareEntries.set(id,options);
 pantrywareBuilders[kind]=build;
}
function pantrywareColors(label,english,ids,colors,condition,build){
 ids.forEach((id,i)=>{
  const hue=colors[i];
  pantrywareRoute(id,new RegExp(condition+'|^'+english+' '+hue+'$'),label+'-'+hue.toLowerCase(),()=>build(palette[hue]??'#625c64'));
 });
}
pantrywareRoute(710,/汤勺|不锈钢勺/,'steel-serving-spoon',servingSpoon);
pantrywareRoute(708,/青瓷碗/,'celadon-bowl',celadonBowl);
pantrywareRoute(713,/筷子筒/,'utensils-jar',utensilsJar);
pantrywareRoute(485,/披萨|^Pizza$/,'pizza-slice',pizzaSlice);
pantrywareRoute(527,/棒球|^Baseball$/,'sewn-baseball',baseball);
pantrywareRoute(412,/曲奇|^Cookie Rainbow$/,'confetti-cookie',()=>confettiCookie(null,'rainbow'));
pantrywareRoute(413,/曲奇|^Cookie Red$/,'jam-thumbprint-cookie',()=>confettiCookie(null,'jam'));
pantrywareRoute(483,/面条|^Noodle$/,'boxed-noodles',boxedNoodles);
pantrywareRoute(1574,/扇贝|^Seashell Orange$/,'scallop-shell-orange',()=>scallop('#d69a79'));
pantrywareRoute(687,/暖水瓶/,'enamel-thermos-red',()=>travelBottle('#a75656',true));
pantrywareRoute(682,/暖水瓶/,'enamel-thermos-blue',()=>travelBottle('#5b98ae',true));
pantrywareRoute(586,/乒乓球|^Ping Pong Ball Yellow$/,'yellow-ping-pong',()=>pingPong('#dfbd68','#cd9f5d'));
pantrywareRoute(48,/青提|葡萄|^Grape Green$/,'green-grapes',()=>grapes(['#91a96b','#819f64','#aabc81']));
pantrywareColors('captain-cap','Pirate Hat',[1683,1684,1685,1687,1688,1689],['Blue','Green','Grey','Pink','Purple','Red'],'船长帽|海盗帽',captainHat);
pantrywareColors('orchard-pear','Pear',[55,56],['Green','Yellow'],'梨',orchardPear);
pantrywareColors('kitchen-knife','Knife',[707,708,709,710,711,712,713,714,715],['Blue','Brown','Green','Orange','Pink','Purple','Red','White','Yellow'],'厨刀|菜刀',kitchenKnife);
pantrywareColors('travel-bottle','Water Bottle',[682,683,684,685,686,687,688],['Blue','Green','Orange','Pink','Purple','Red','Yellow'],'水壶|水瓶',color=>travelBottle(color,false));
pantrywareColors('yoghurt-cup','Yoghurt',[504,505,506,507,508,509,510],['Blue','Brown','Green','Orange','Pink','Purple','Yellow'],'酸奶',color=>dairyCup(color,false));
pantrywareColors('milkshake-cup','Milkshake',[662,663,664,665],['Brown','Pink','White','Yellow'],'奶昔',color=>dairyCup(color,true));

function paperLantern(){
 const g=new THREE.Group();
 const body=oval(g,'#c45450',.346,.258,.346,0,-.015,0,'satin',48);
 const p=body.geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),wave=1+.025*Math.cos(14*Math.atan2(z,x));
  p.setX(i,x*wave);p.setZ(i,z*wave);
 }
 body.geometry.computeVertexNormals();
 for(const y of [-.245,.226])disk(g,'#dba76d',.124,.114,.048,0,y,0,'satin');
 for(let i=0;i<14;i++){
  const a=i*tau/14;
  tube(g,'#c67861',[[.108*Math.sin(a),.225,.108*Math.cos(a)],[.347*Math.sin(a),-.005,.347*Math.cos(a)],[.111*Math.sin(a),-.241,.111*Math.cos(a)]],.006,'satin');
 }
 tube(g,'#ba6560',[[0,-.244,0],[.055,-.337,.019],[.071,-.431,.040]],.020,'ribbon');
 return turn(g,.78);
}
function triceratops(color){
 const g=new THREE.Group();
 oval(g,color,.292,.175,.174,-.074,0,0,'satin',26);
 oval(g,color,.167,.188,.105,.122,.077,0).rotation.z=-.53;
 oval(g,color,.154,.122,.133,.238,.022,0,'glaze',22);
 for(const x of [-.186,.049])for(const z of [-.102,.102])oval(g,color,.065,.109,.063,x,-.112,z,'satin');
 tube(g,color,[[-.285,-.018,0],[-.383,.035,.024],[-.432,.081,.066]],.043,'satin');
 for(const z of [-.071,.071]){
  tube(g,'#eacba7',[[.244,.098,z],[.270,.167,z],[.325,.191,z]],.019,'satin');
  oval(g,'#645147',.022,.021,.013,.261,.049,z*1.69,'satin');
 }
 tube(g,'#dfbf9a',[[.323,.047,0],[.348,.099,0],[.376,.111,0]],.022,'satin');
 return turn(g,.53);
}
function clef(color){
 const g=new THREE.Group();
 tube(g,color,[[.106,.014,.405],[-.056,.002,.398],[-.134,0,.295],[-.057,.009,.243],[.045,.017,.275],[.090,.026,.374],[.124,.017,.277],[.036,.008,-.043],[-.066,0,-.286],[-.019,0,-.420],[.099,0,-.389],[.124,.012,-.251],[.015,.015,-.093],[-.182,0,.005],[-.224,0,.164],[-.100,0,.229],[.107,.009,.166],[.141,.013,.056],[.052,.020,.033],[-.007,.023,.100]],.042,'glaze');
 oval(g,'#e7ba70',.057,.048,.060,.106,.014,.405,'metal');
 return turn(g,.99);
}
function rollerSkate(color,hue){
 const g=new THREE.Group();
 box(g,hue==='Colorful'?'#97b3a4':'#d2b992',.382,.077,.679,.031,0,-.125,.037,'satin');
 box(g,color,.357,.211,.649,.093,0,.014,.040);
 box(g,hue==='Colorful'?'#a8a5c1':color,.333,.255,.306,.053,0,.141,-.121,'satin');
 box(g,'#796759',.229,.029,.172,.023,0,.271,-.141,'satin');
 for(const z of [-.237,.230])for(const x of [-.177,.177]){
  disk(g,hue==='Colorful'?z<0?'#d5a66d':'#7a9fae':'#827180',.075,.075,.064,x,-.186,z,'satin').rotation.z=Math.PI/2;
  disk(g,'#d8b87b',.038,.038,.066,x,-.186,z).rotation.z=Math.PI/2;
 }
 for(const z of [-.010,.046,.104])tube(g,'#e5cfab',[[-.079,.146,z-.019],[0,.154,z+.036],[.081,.146,z+.023]],.009,'satin');
 return turn(g,.53);
}
function coinRing(color){
 const g=new THREE.Group();
 const finger=ring(g,color,.216,.038,0,-.055,0);
 finger.rotation.x=.32;
 const shape=new THREE.Shape().absarc(0,0,.170,0,tau,false);
 const opening=new THREE.Path().moveTo(-.044,-.044).lineTo(-.044,.044).lineTo(.044,.044).lineTo(.044,-.044).closePath();
 shape.holes.push(opening);
 extrudedSurface(g,shape,'#c2a06a',.138,0,.033,.012,'metal');
 for(let i=0;i<12;i++){
  const angle=i*tau/12;
  oval(g,'#d7b67e',.009,.006,.009,Math.cos(angle)*.136,.183,Math.sin(angle)*.136,'satin',10);
 }
 return turn(g,.42);
}
function macaron(color){
 const g=new THREE.Group();
 for(const y of [-.097,.117]){
  oval(g,color,.318,.093,.314,0,y,0,'satin',36);
  const foot=ring(g,color,.276,.026,0,y>0?.061:-.052,0,'satin');
  foot.rotation.x=Math.PI/2;
  for(let i=0;i<30;i++){
   const a=i*tau/30,r=.282+i%3*.003;
   oval(g,color,.021,.014,.023,Math.cos(a)*r,y>0?.072:-.064,Math.sin(a)*r,'matte',10);
  }
 }
 oval(g,'#e4cca2',.294,.061,.294,0,.002,0,'satin',32);
 return turn(g,.55);
}
function tiedGift(color){
 const g=new THREE.Group();
 box(g,color,.533,.439,.529,.049,0,-.036,0,'satin');
 box(g,color,.562,.112,.557,.032,0,.169,0);
 for(const [w,d] of [[.085,.563],[.562,.083]])box(g,'#e8c38b',w,.016,d,.007,0,.231,0,'satin');
 for(const x of [-.081,.081]){
  const bow=ring(g,'#e6ba82',.075,.020,x,.256,0,'satin');
  bow.scale.x=1.18;bow.rotation.set(Math.PI/2,.30*Math.sign(x),.41);
 }
 return turn(g,.43);
}
function typewriter(color){
 const g=new THREE.Group();
 box(g,color,.685,.220,.555,.044,0,0,.021);
 box(g,'#7c7161',.598,.047,.246,.022,0,.117,.129,'satin');
 box(g,'#d4c3a0',.542,.079,.080,.023,0,.135,-.180,'satin');
 const paper=box(g,'#edddbb',.470,.026,.223,.012,0,.183,-.260,'matte');
 paper.rotation.x=.35;
 for(let row=0;row<3;row++){
  const columns=7-row;
  for(let col=0;col<columns;col++)disk(g,'#d6c39d',.029,.027,.014,(col-(columns-1)/2)*.073,.151-row*.014,.037+row*.073,'satin');
 }
 box(g,'#d6c39d',.257,.016,.030,.007,0,.132,.255,'satin');
 return turn(g,.46);
}
function sunscreen(color){
 const g=new THREE.Group();
 const body=box(g,color,.432,.162,.668,.066,0,0,-.028,'satin');
 body.scale.x=.95;
 box(g,'#dcc39d',.300,.135,.131,.036,0,.013,.345,'satin');
 printed(g,.325,.458,0,.082,-.012,c=>{
  c.fillStyle=color;c.fillRect(0,0,512,512);
  c.fillStyle='#d9a769';c.beginPath();c.arc(256,175,87,0,tau);c.fill();
  c.textAlign='center';c.font='bold 98px sans-serif';c.fillStyle='#7b6a53';printInk(c,'防晒',256,356);
 },.65);
 return turn(g,.32);
}
function baseballBat(color){
 const g=new THREE.Group(),profile=[[0,-.419],[.076,-.419],[.081,-.392],[.043,-.369],[.046,-.201],[.055,-.087],[.096,.111],[.127,.227],[.126,.344],[.100,.390],[0,.395]].map(p=>new THREE.Vector2(...p));
 mesh(g,new THREE.LatheGeometry(profile,38),color,0,0,0,'satin');
 for(let i=0;i<4;i++)ring(g,'#e3caa0',.047,.005,0,-.33+i*.032,0,'satin').rotation.x=Math.PI/2;
 return turn(g,1.26);
}
const cabinetEntries=new Map(),cabinetBuilders={};
function cabinetRoute(id,condition,kind,build){
 const options=cabinetEntries.get(id)??[];
 options.push([condition,kind]);
 cabinetEntries.set(id,options);
 cabinetBuilders[kind]=build;
}
function cabinetColors(label,english,ids,colors,condition,build){
 ids.forEach((id,i)=>{
  const hue=colors[i];
  const color=palette[hue]??'#d5949b';
  cabinetRoute(id,new RegExp(condition+'|^'+english+' '+hue+'$'),label+'-'+hue.toLowerCase(),()=>build(color,hue));
 });
}
cabinetRoute(170,/灯笼/,'red-paper-lantern',paperLantern);
cabinetRoute(170,/镜面球|^Disco Ball Red$/,'red-mirror-ball',()=>discoBall(['#a56562','#cc8580','#bb6f6e','#d99b88','#a56a71']));
cabinetRoute(1136,/铜钱戒指|^Ring Green$/,'green-coin-ring',()=>coinRing('#859c77'));
cabinetRoute(660,/草莓牛奶|^Milk Pink$/,'strawberry-milk-carton',()=>fruitCarton('#c78494','草莓牛奶','#d5a29b'));
cabinetRoute(661,/蜂蜜牛奶|盒装牛奶|牛奶盒|^Milk Yellow$/,'honey-milk-carton',()=>fruitCarton('#d5a663','蜂蜜牛奶','#e5c077'));
cabinetRoute(136,/货轮|玩具船|^Ship Yellow$/,'cargo-ship-yellow',()=>ship('#d9b268'));
cabinetRoute(609,/青花茶碟/,'blue-floral-saucer',()=>ceramicPlate('#789eae'));
cabinetColors('triceratops','Triceratops',[1226,1227,1228,1229,1230,1231,1232,1233],['Yellow','White','Red','Purple','Pink','Grey','Green','Blue'],'三角龙',triceratops);
cabinetColors('treble-clef','Treble Clef Note',[239,240,241,242,243,244,245],['Blue','Green','Orange','Pink','Purple','Red','Yellow'],'高音谱号',clef);
cabinetColors('roller-skate','Rollerskate',[609,610,611,612,613,614,615,616,617],['Blue','Brown','Colorful','Green','Pink','Purple','Red','White','Yellow'],'轮滑鞋|旱冰鞋',rollerSkate);
cabinetColors('macaron','Macaron',[471,472,473,474,475,476,477,478,479,480],['Blue','Brown','Green','Grey','Orange','Pink','Purple','Red','White','Yellow'],'马卡龙',macaron);
cabinetColors('tied-gift','Giftbox',[798,799,800,801,802,803],['Blue','Green','Pink','Purple','Red','Yellow'],'礼盒',tiedGift);
cabinetColors('typewriter','Typewriter',[1527,1528,1529,1530,1531,1532,1533,1534],['Brown','Green','Orange','Pink','Purple','Red','White','Blue'],'打字机',typewriter);
cabinetColors('sunscreen','Sunscreen',[1306,1307,1308,1309,1310,1311],['Blue','Green','Pink','Purple','Red','White'],'防晒霜',sunscreen);
cabinetColors('baseball-bat','Baseball Bat',[528,529,530,531],['Brown','Grey','Red','White'],'棒球棒',baseballBat);

function roadCar(color,long=false){
 const g=new THREE.Group(),length=long?.839:.710,span=long?.297:.229;
 box(g,color,.413,.174,length,.062,0,-.042,0);
 box(g,'#678792',.348,.145,length*.586,.048,0,.089,.035,'glaze');
 box(g,color,.354,.034,length*.486,.016,0,.175,.031);
 for(const x of [-.194,.194]){
  box(g,color,.021,.107,length*.499,.015,x*.88,.106,.035,'satin');
  for(const z of [-span,span]){
   disk(g,'#655754',.091,.091,.068,x,-.105,z,'satin').rotation.z=Math.PI/2;
   disk(g,'#d4bf9d',.043,.043,.072,x,-.105,z,'satin').rotation.z=Math.PI/2;
  }
  oval(g,'#f4dab0',.057,.026,.016,x*.72,.009,-length*.5);
 }
 return turn(g,.43);
}
function foamToy(color){
 const g=new THREE.Group(),blade=new THREE.Shape();
 blade.moveTo(-.048,-.244);blade.lineTo(-.051,.305);
 blade.quadraticCurveTo(-.029,.408,.033,.380);blade.lineTo(.067,-.244);blade.closePath();
 extrudedSurface(g,blade,color,-.022,0,.057,.025,'satin');
 box(g,'#d9bd92',.234,.069,.075,.027,0,.012,.231,'satin');
 box(g,'#937b69',.089,.076,.209,.028,0,0,.336,'ribbon');
 for(const z of [.283,.330,.377])box(g,'#ccaa79',.090,.079,.016,.005,0,0,z,'satin');
 return turn(g,.27);
}
function shakerPair(color){
 const g=new THREE.Group();
 for(const side of [-1,1]){
  oval(g,color,.172,.152,.170,side*.139,.015,-.116,'glaze',24);
  tube(g,'#c49b6d',[[side*.093,-.004,-.018],[side*.038,.002,.129],[side*.121,.012,.318]],.040,'satin');
  ring(g,'#e9cb93',.166,.014,side*.139,.028,-.116,'satin').rotation.x=Math.PI/2;
 }
 return turn(g,.30);
}
function woodClog(color){
 const g=new THREE.Group(),base=edgeOutline(.368,.136,.91);
 extrudedSurface(g,base,'#bb9668',-.084,0,.104,.023,'satin');
 oval(g,color,.150,.117,.184,0,.034,-.167,'glaze',28);
 tube(g,'#e4c192',[[-.141,.025,-.049],[-.092,.112,.017],[0,.136,.045],[.101,.100,.017],[.145,.025,-.056]],.018,'satin');
 for(const z of [-.192,-.105])oval(g,'#e2c08c',.059,.006,.013,0,.147-(z+.167)**2*.52,z,'satin');
 return turn(g,.35);
}
function pinballToy(){
 const g=new THREE.Group();
 box(g,'#68a1ac',.540,.172,.714,.052,0,-.024,0,'satin');
 box(g,'#e0c597',.473,.036,.619,.035,0,.068,.010,'satin');
 for(const z of [-.173,-.057,.086])disk(g,'#bc786e',.046,.046,.042,0,.109,z);
 oval(g,'#d7cda9',.204,.047,.256,0,.120,-.052,'ice',30);
 box(g,'#a95f61',.135,.070,.078,.027,.144,.090,.304);
 for(const x of [-.236,.236])for(const z of [-.210,.225])disk(g,'#6c635a',.064,.064,.047,x,-.106,z,'satin').rotation.z=Math.PI/2;
 return turn(g,.38);
}
function shipWheel(color){
 const g=new THREE.Group();
 const wheel=ring(g,color,.265,.040,0,0,0,'satin');
 wheel.rotation.x=Math.PI/2;
 disk(g,'#d3af80',.098,.098,.095,0,0,0,'satin');
 for(let i=0;i<6;i++){
  const a=i*tau/6,x=Math.sin(a),z=Math.cos(a);
  tube(g,'#b18d6d',[[x*.064,0,z*.064],[x*.206,0,z*.206],[x*.328,0,z*.328]],.026,'satin');
  oval(g,color,.038,.036,.038,x*.345,0,z*.345,'satin');
 }
 return turn(g,.31);
}
const displayEntries=new Map(),displayBuilders={};
function displayRoute(id,condition,kind,build){
 const options=displayEntries.get(id)??[];
 options.push([condition,kind]);
 displayEntries.set(id,options);
 displayBuilders[kind]=build;
}
function displayColors(label,english,ids,colors,condition,build){
 ids.forEach((id,i)=>{
  const hue=colors[i];
  displayRoute(id,new RegExp(condition+'|^'+english+' '+hue+'$'),label+'-'+hue.toLowerCase(),()=>build(palette[hue]??'#5a565c'));
 });
}
displayRoute(827,/弹球玩具车/,'pinball-toy',pinballToy);
displayRoute(1368,/泡棉练功剑/,'foam-toy-red',()=>foamToy('#c27369'));
displayRoute(1369,/泡棉练功剑/,'foam-toy-yellow',()=>foamToy('#e5bd6a'));
displayRoute(1718,/船舵|^Pirate Wheel Purple$/,'ship-wheel-purple',()=>shipWheel('#9d84ad'));
displayColors('road-car','Car',[81,82,83,84,85,86],['Blue','Green','Orange','Purple','Red','Yellow'],'赛车|玩具车',roadCar);
displayColors('limousine','Limousine',[1982,1983,1985,1986,1988,1989,1990],['Blue','Green','Orange','Purple','Red','Yellow','White'],'加长轿车',c=>roadCar(c,true));
displayColors('clam-shell','Clam',[1536,1537,1538,1539,1540,1541,1542],['Green','Orange','Pink','Purple','Red','White','Yellow'],'珍珠贝',c=>shell(c));
displayColors('maraca','Maracas',[210,211,212,213],['Blue','Green','Red','Yellow'],'沙锤',shakerPair);
displayColors('violin','Violin',[253,255,256,257,258,259,260,261],['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'小提琴',violin);
displayColors('tassel-tablet','Ancient Tablet',[1084,1085,1086,1087,1088,1089,1090],['Brown','Green','Grey','Orange','Pink','Purple','Red'],'流苏木牌',tassel);
displayColors('wood-clog','Wood Shoes',[1393,1394,1395,1396,1397,1398,1399,1400],['Blue','Brown','Green','Grey','Orange','Pink','Yellow','Red'],'木屐',woodClog);
displayColors('stegosaurus','Stegosaurus',[1234,1235,1236,1238,1239,1240,1241],['Yellow','White','Red','Pink','Grey','Green','Blue'],'剑龙',stegosaurus);
displayColors('wood-plaque','Ying Yang',[1401,1402,1403,1404,1405,1406,1407,1408],['Black','Blue','Brown','Green','Grey','Orange','Pink','Purple'],'太极.*牌',woodPlaque);

function crt(color){
 const g=new THREE.Group();
 box(g,color,.680,.297,.505,.071,0,0,.048);
 box(g,'#6c635c',.575,.040,.387,.039,-.008,.147,.047,'satin');
 oval(g,'#72848c',.242,.056,.149,-.024,.149,.036,'glaze',32);
 for(const x of [-.20,.20])box(g,'#736555',.110,.073,.066,.021,x,-.119,.254,'satin');
 tube(g,'#ae9b82',[[.018,.109,-.216],[-.034,.147,-.341],[-.136,.165,-.429]],.012,'metal');
 tube(g,'#ae9b82',[[.020,.112,-.216],[.092,.150,-.340],[.193,.181,-.389]],.012,'metal');
 return turn(g,.44);
}
function frenchFries(){
 const g=new THREE.Group();
 const carton=box(g,'#bd6961',.511,.165,.482,.044,0,-.049,.160,'satin');
 carton.rotation.x=-.13;
 box(g,'#e0a18a',.482,.057,.444,.026,0,.038,.178,'satin');
 for(let i=0;i<9;i++){
  const x=(i%5-2)*.080,z=-.104-.026*i;
  const fry=box(g,i%2?'#e9bc75':'#d8a463',.063,.077,.329+i%3*.055,.018,x,.004+Math.floor(i/5)*.077,z,'satin');
  fry.rotation.y=.10*Math.sin(i*1.9);
 }
 oval(g,'#ebcf97',.076,.007,.065,0,.072,.181,'satin');
 return turn(g,.37);
}
function flyingDisc(color){
 const g=new THREE.Group();
 const section=[[0,-.024],[.249,-.028],[.313,-.045],[.343,-.093],[.369,-.067],[.368,-.014],[.346,.034],[.310,.050],[.224,.061],[0,.063]].map(p=>new THREE.Vector2(...p));
 mesh(g,new THREE.LatheGeometry(section,48),color,0,0,0);
 for(const r of [.256,.275,.300])ring(g,'#e2d1a9',r,.004,0,.053,0,'satin').rotation.x=Math.PI/2;
 return turn(g,.37);
}
function calculator(color){
 const g=new THREE.Group();
 box(g,color,.517,.132,.749,.055,0,0,0,'satin');
 box(g,'#5d615d',.405,.017,.164,.021,0,.070,-.249,'satin');
 box(g,'#a0b09a',.355,.010,.113,.012,0,.082,-.249);
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  box(g,row===0?'#cf926f':'#e5cfaa',.082,.029,.069,.014,(col-1.5)*.103,.081,-.088+row*.105,'satin');
 }
 return turn(g,.28);
}
function flower(color){
 const g=new THREE.Group();
 disk(g,'#d5a965',.119,.117,.076,0,.033,-.046,'satin');
 for(let i=0;i<9;i++){
  const a=i*tau/9;
  const petal=oval(g,color,.073,.043,.159,Math.sin(a)*.194,.031,-.046+Math.cos(a)*.194,'satin',20);
  petal.rotation.y=a;
 }
 tube(g,'#819760',[[0,-.046,.056],[.031,-.042,.222],[.067,-.039,.413]],.022,'satin');
 oval(g,'#8ba36c',.116,.034,.056,.137,-.043,.295,'satin').rotation.y=.54;
 return turn(g,.31);
}
function footedPot(color){
 const g=new THREE.Group();
 const section=[[0,-.182],[.173,-.184],[.226,-.151],[.263,-.091],[.274,.006],[.232,.096],[.193,.146],[.178,.178],[.210,.195],[.159,.201],[.143,.167],[.200,.077],[.222,-.018],[.159,-.105],[.099,-.118],[0,-.118]].map(p=>new THREE.Vector2(...p));
 mesh(g,new THREE.LatheGeometry(section,46),color,0,0,0);
 for(let i=0;i<3;i++){
  const a=i*tau/3,x=Math.cos(a),z=Math.sin(a);
  tube(g,color,[[.145*x,-.109,.145*z],[.207*x,-.186,.207*z],[.196*x,-.283,.196*z]],.036,'glaze');
 }
 for(const x of [-.170,.170]){
  const handle=ring(g,color,.077,.019,x,.138,0);
  handle.rotation.y=Math.PI/2;
 }
 return turn(g,.63);
}
function roofTile(color){
 const g=new THREE.Group();
 box(g,'#cdab7e',.617,.086,.533,.023,0,-.188,0,'satin');
 for(const x of [-.216,.216])for(const z of [-.163,.163])box(g,'#c59e76',.048,.313,.053,.015,x,-.010,z,'satin');
 const roof=new THREE.Shape();
 roof.moveTo(-.373,-.114);roof.quadraticCurveTo(-.145,-.034,0,.177);
 roof.quadraticCurveTo(.145,-.034,.373,-.114);roof.lineTo(.298,-.114);
 roof.quadraticCurveTo(0,-.037,-.298,-.114);roof.closePath();
 mesh(g,new THREE.ExtrudeGeometry(roof,{depth:.535,bevelEnabled:true,bevelThickness:.021,bevelSize:.018,bevelSegments:3,curveSegments:12}),color,0,.167,-.267,'glaze');
 for(let i=-3;i<=3;i++){
  const z=i*.076;
  tube(g,color,[[-.348,.067,z],[-.177,.146,z],[0,.342,z],[.179,.145,z],[.343,.065,z]],.012,'glaze');
 }
 return turn(g,.57);
}
function rexDoll(color){
 const g=new THREE.Group();
 oval(g,color,.232,.192,.146,-.061,0,0,'satin',28);
 oval(g,color,.190,.141,.142,.193,.153,.029,'glaze',26);
 oval(g,'#e1bd9c',.125,.047,.110,.265,.090,.029,'satin');
 for(const z of [-.091,.091]){
  oval(g,'#62564d',.025,.022,.013,.188,.182,z*1.53,'satin');
  oval(g,color,.070,.115,.059,-.053,-.105,z*1.14,'satin').rotation.z=-.25;
  oval(g,color,.083,.032,.042,.092,.001,z*1.41,'satin').rotation.z=.48;
 }
 tube(g,color,[[-.214,.020,0],[-.359,.037,-.011],[-.438,.103,-.049]],.047,'satin');
 return turn(g,.53);
}
function paperCrane(color){
 const g=new THREE.Group(),geometry=new THREE.BufferGeometry();
 const points=[[0,.085,0],[-.357,-.037,.046],[-.217,.132,.128],[0,-.020,.206],[.349,-.041,.063],[.217,.124,.130],[0,.050,-.174],[-.042,.172,-.324],[.002,.137,-.448],[.018,.269,.312]];
 const faces=[[0,1,2],[0,2,3],[0,3,5],[0,5,4],[0,6,1],[0,4,6],[0,3,9],[0,9,4],[0,7,6],[7,8,6],[0,2,7],[0,5,7]];
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(faces.flatMap(face=>face.flatMap(i=>points[i])),3));
 geometry.computeVertexNormals();
 const folded=mesh(g,geometry,color,0,0,0,'satin');
 folded.material=new THREE.MeshPhysicalMaterial({color,side:THREE.DoubleSide,roughness:.61,clearcoat:.26});
 return turn(g,.41);
}
const ornamentEntries=new Map(),ornamentBuilders={};
function ornamentRoute(id,condition,kind,build){
 const options=ornamentEntries.get(id)??[];
 options.push([condition,kind]);
 ornamentEntries.set(id,options);
 ornamentBuilders[kind]=build;
}
function ornamentColors(label,english,ids,colors,condition,build){
 ids.forEach((id,i)=>{
  const hue=colors[i];
  ornamentRoute(id,new RegExp(condition+'|^'+english+' '+hue+'$'),label+'-'+hue.toLowerCase(),()=>build(palette[hue]??'#b6aeb8'));
 });
}
ornamentRoute(449,/薯条|^Fries$/,'boxed-fries',frenchFries);
ornamentRoute(39,/青苹果|^Apple Green$/,'green-apple',()=>appleYellow('#8eac5f'));
ornamentRoute(165,/镜面球|^Disco Ball Blue$/,'blue-mirror-ball',()=>discoBall(['#7d9cb7','#94b8c8','#7fabba','#b2cad0','#7992b3']));
ornamentRoute(167,/镜面球|^Disco Ball Grey$/,'silver-mirror-ball',()=>discoBall(['#90979d','#a6bac3','#acabb0','#b7b9bd','#848b91']));
ornamentRoute(1632,/蘑菇|^Mushroom Pink$/,'mushroom-pink',()=>mushroom('#cf91ac'));
ornamentColors('crt-tv','Television',[899,900,901,902,903,904,905,906],['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],'电视机|显像管电视',crt);
ornamentColors('calculator','Calculator',[295,296,297,298,299,300,301,302],['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'计算器',calculator);
ornamentColors('flower-daisy','Daisy',[1604,1605,1607,1608,1609,1610,1611],['Blue','Green','Orange','Pink','Purple','Red','Yellow'],'雏菊',flower);
ornamentColors('tiled-pavilion','Pyramid',[1075,1076,1077,1078,1079,1080,1081,1082],['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'琉璃小亭',roofTile);
ornamentColors('footed-pot','Witch Pot',[2154,2155],['Orange','Purple'],'陶釜',footedPot);
ornamentColors('paper-crane','Origami',[1377,1378,1379,1380,1381,1382,1383,1384],['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'纸鹤',paperCrane);
ornamentRoute(570,/飞盘|^Frisbee Blue$/,'blue-flying-disc',()=>flyingDisc('#628fae'));
ornamentColors('rex-doll','Rex',[1245,1246],['Red','Pink'],'霸王龙',rexDoll);

function boneDinosaur(){
 const g=new THREE.Group(),ivory='#e1cfaa';
 tube(g,ivory,[[-.371,-.039,.008],[-.184,.033,.042],[.036,.048,0],[.147,.123,-.028],[.259,.200,-.013]],.019,'satin');
 for(let i=0;i<6;i++){
  const x=-.158+i*.045;
  tube(g,ivory,[[x,.051,0],[x,-.017,.083],[x,-.088,.068],[x,-.116,0],[x,-.081,-.067],[x,-.013,-.072],[x,.051,0]],.010,'satin');
 }
 oval(g,ivory,.117,.060,.058,.292,.198,-.013,'satin',20);
 oval(g,'#7c6d56',.029,.015,.020,.277,.251,-.014,'matte');
 for(const z of [-.066,.066]){
  tube(g,ivory,[[-.111,-.045,z],[-.144,-.156,z*1.3],[-.110,-.191,z*1.9]],.017,'satin');
  tube(g,ivory,[[.081,.021,z],[.086,-.071,z*1.4],[.133,-.098,z*1.7]],.011,'satin');
 }
 return turn(g,.47);
}
function ornateChair(color){
 const g=littleChair(color);
 box(g,'#bea17d',.429,.057,.408,.032,0,.055,.064,'satin');
 tube(g,'#dcc097',[[-.180,.246,-.153],[-.092,.291,-.155],[0,.257,-.157],[.095,.289,-.155],[.180,.246,-.153]],.010,'satin');
 for(const x of [-.128,0,.128])oval(g,'#ddc298',.035,.089,.013,x,.198,-.147,'satin');
 return g;
}
function rhinoceros(color){
 const g=new THREE.Group();
 oval(g,color,.274,.171,.166,-.069,0,0,'satin',29);
 oval(g,color,.166,.118,.130,.237,-.018,0,'glaze',27);
 for(const x of [-.178,.109])for(const z of [-.095,.095])oval(g,color,.059,.123,.054,x,-.086,z,'satin');
 for(const z of [-.089,.089]){
  oval(g,color,.060,.031,.052,.119,.081,z,'satin').rotation.y=.44;
  oval(g,'#6a554a',.019,.017,.012,.223,.018,z*1.32,'satin');
 }
 tube(g,'#e0c9a2',[[.286,.059,0],[.324,.128,0],[.332,.175,0]],.022,'satin');
 tube(g,color,[[-.295,-.015,0],[-.358,-.016,.032],[-.392,-.067,.047]],.013,'satin');
 return turn(g,.49);
}
function clapperboard(color){
 const g=new THREE.Group();
 box(g,color,.659,.097,.559,.037,0,-.018,.048,'satin');
 const arm=box(g,'#675c5a',.682,.063,.107,.020,0,.084,-.243,'satin');
 arm.rotation.z=.24;arm.rotation.y=.02;
 for(let i=0;i<6;i++){
  const x=(i-2.5)*.095;
  const band=box(g,'#e9d5b0',.040,.008,.094,.004,x,.117+x*.245,-.242,'satin');
  band.rotation.set(0,.31,.24);
 }
 for(const z of [-.012,.112,.231])box(g,'#ead1ab',.518,.006,.013,.004,0,.034,z,'satin');
 disk(g,'#d7bb96',.046,.045,.013,-.278,.067,-.199,'satin');
 return turn(g,.34);
}
function flatIcePop(color){
 const g=new THREE.Group();
 box(g,color,.416,.190,.581,.090,0,-.010,-.101,'ice');
 for(const x of [-.099,.099])oval(g,color,.026,.016,.196,x,.086,-.083,'ice');
 box(g,'#bc9c71',.118,.062,.290,.027,0,-.005,.302,'satin');
 return turn(g,.32);
}
function trowel(color){
 const g=new THREE.Group(),profile=new THREE.Shape();
 profile.moveTo(-.147,.177);
 profile.bezierCurveTo(-.200,.067,-.172,-.164,0,-.321);
 profile.bezierCurveTo(.172,-.164,.200,.067,.147,.177);profile.closePath();
 extrudedSurface(g,profile,'#b4bcb4',-.028,-.066,.037,.015,'metal');
 box(g,color,.139,.101,.316,.043,0,0,.258,'satin');
 tube(g,'#e0d0ad',[[0,.024,-.081],[0,.031,.065],[0,.004,.141]],.016,'satin');
 return turn(g,.38);
}
function pitchedTent(color){
 const g=new THREE.Group();
 const cross=new THREE.Shape().moveTo(-.338,0).lineTo(0,.343).lineTo(.338,0).closePath();
 const canopy=mesh(g,new THREE.ExtrudeGeometry(cross,{depth:.588,bevelEnabled:true,bevelSize:.016,bevelThickness:.013,bevelSegments:2}),color,0,-.145,-.294,'satin');
 canopy.material=new THREE.MeshPhysicalMaterial({color,roughness:.58,clearcoat:.24});
 tube(g,'#e0c394',[[-.329,-.134,.303],[0,.200,.300],[.332,-.134,.303]],.014,'satin');
 const door=new THREE.Shape().moveTo(-.132,0).lineTo(0,.219).lineTo(.132,0).closePath();
 mesh(g,new THREE.ShapeGeometry(door),'#8c7260',0,-.143,.308,'satin');
 return turn(g,.51);
}
function candyJar(){
 const g=new THREE.Group();
 disk(g,'#b397ac',.218,.213,.462,0,-.033,0,'ice');
 disk(g,'#c9ab82',.230,.227,.085,0,.226,0,'satin');
 printed(g,.300,.200,0,.270,0,c=>{
  c.fillStyle='#b96966';c.fillRect(0,0,512,512);
  c.fillStyle='#f0d59d';c.textAlign='center';c.font='bold 160px sans-serif';printInk(c,'安',256,320);
 });
 return turn(g,.79);
}
const craftsEntries=new Map(),craftsBuilders={};
function craftsRoute(id,condition,kind,build){
 const options=craftsEntries.get(id)??[];
 options.push([condition,kind]);
 craftsEntries.set(id,options);
 craftsBuilders[kind]=build;
}
function craftsColors(label,english,ids,colors,condition,build){
 ids.forEach((id,i)=>{
  const hue=colors[i];
  craftsRoute(id,new RegExp(condition+'|^'+english+' '+hue+'$'),label+'-'+hue.toLowerCase(),()=>build(palette[hue]));
 });
}
craftsRoute(1242,/恐龙骨架|^Dino Skeleton White$/,'dinosaur-bones',boneDinosaur);
craftsRoute(396,/安字糖果罐/,'peace-candy-jar',candyJar);
craftsRoute(396,/麦片|^Cereal Purple$/,'grape-cereal-carton',()=>fruitCarton('#9279ab','葡萄麦片','#d4a9b9'));
craftsRoute(548,/板球|^Cricket Ball$/,'stitched-cricket-ball',()=>baseball('#b06964','#d6bd9b'));
craftsColors('ornate-chair','Throne',[1155,1156,1157,1158,1159,1160,1161,1162],['Yellow','Red','Purple','Pink','Orange','Grey','Green','Blue'],'雕花小椅',ornateChair);
craftsColors('rhinoceros','Rhino',[948,949,950,951,952,953,954,955,956],['Blue','Brown','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'犀牛',rhinoceros);
craftsColors('clapperboard','Clapperboard',[1172,1173,1174,1175,1176,1177,1178],['Blue','Green','Orange','Pink','Purple','Red','Yellow'],'场记板',clapperboard);
craftsColors('flat-ice-pop','Popsicle Flat',[486,487,488,489,491,492,493],['Blue','Green','Orange','Purple','Red','White','Yellow'],'冰棒',flatIcePop);
craftsColors('garden-trowel','Shovel',[1636,1637,1638,1639,1640,1641,1642,1643],['Blue','Brown','Green','Orange','Pink','Purple','Red','Yellow'],'园艺小铲',trowel);
craftsColors('pitched-tent','Tent',[1463,1464,1465,1466,1467,1468,1469],['Blue','Green','Orange','Pink','Purple','Red','Yellow'],'帐篷',pitchedTent);
craftsColors('ruler','Ruler',[351,352,353,354,355,356,357,358],['Brown','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'直尺',c=>ruler(false,c));
for(const [id,hue] of [[351,'Brown'],[352,'Green'],[353,'Grey'],[354,'Orange'],[355,'Pink'],[356,'Purple'],[357,'Red'],[358,'Yellow']]){
 craftsRoute(id,/软尺/,'sewing-tape-'+hue.toLowerCase(),()=>ruler(true,palette[hue]));
}
craftsColors('paper-cupcake','Cupcake',[416,417,418,419,421,422],['Blue','Brown','Pink','Purple','Red','Yellow'],'纸杯蛋糕',c=>rainbowCupcake(c));

function clayPot(color){
 const g=new THREE.Group();
 disk(g,color,.238,.205,.398,0,-.057,0,'satin');
 disk(g,'#dbab77',.261,.257,.081,0,.167,0);
 for(const y of [-.202,.068]){
  ring(g,'#dfc4a2',.224,.007,0,y,0,'satin').rotation.x=Math.PI/2;
 }
 printed(g,.292,.185,0,.209,0,c=>{
  c.fillStyle='#e6ba89';c.fillRect(0,0,512,512);
  c.fillStyle='#745648';c.textAlign='center';c.font='bold 118px sans-serif';printInk(c,'彩泥',256,310);
 });
 return turn(g,.73);
}
function scrollShield(color){
 const g=new THREE.Group(),shape=new THREE.Shape();
 shape.moveTo(0,.350);shape.bezierCurveTo(.144,.255,.295,.272,.313,.194);
 shape.bezierCurveTo(.317,-.137,.144,-.308,0,-.372);
 shape.bezierCurveTo(-.144,-.308,-.317,-.137,-.313,.194);
 shape.bezierCurveTo(-.295,.272,-.144,.255,0,.350);
 extrudedSurface(g,shape,'#b79266',-.090,0,.129,.025,'satin');
 extrudedSurface(g,shape,color,.037,0,.022,.012,'satin').scale.set(.90,.90,1);
 for(const x of [-.075,.075]){
  const motif=ring(g,'#e2be89',.083,.010,x,.062,-.085,'satin',Math.PI*1.64);
  motif.rotation.x=Math.PI/2;motif.rotation.z=x>0?.60:2.67;
 }
 disk(g,'#d9b27e',.045,.041,.020,0,.063,.082,'satin');
 return turn(g,.35);
}
function toyRocket(color){
 const g=new THREE.Group(),geometry=new THREE.LatheGeometry([[0,-.316],[.174,-.315],[.185,-.272],[.184,.021],[.172,.154],[.126,.285],[.063,.376],[0,.424]].map(p=>new THREE.Vector2(...p)),46);
 mesh(g,geometry,color,0,0,0);
 for(let i=0;i<3;i++){
  const a=i*tau/3,x=Math.sin(a),z=Math.cos(a);
  const fin=box(g,'#dec196',.115,.191,.036,.016,x*.181,-.249,z*.181,'satin');
  fin.rotation.set(Math.sin(a)*.23,a,.22);
 }
 const rim=ring(g,'#e3c38d',.070,.013,0,.093,.169,'satin');
 rim.rotation.x=-.17;
 oval(g,'#8baeb7',.071,.066,.031,0,.093,.173,'ice');
 return turn(g,.76);
}
function floppy(color){
 const g=new THREE.Group();
 box(g,color,.599,.089,.613,.020,0,0,0,'satin');
 box(g,'#aeb7ae',.221,.015,.228,.008,0,.047,-.163,'metal');
 box(g,'#eee1be',.434,.010,.228,.010,0,.047,.149,'matte');
 for(const z of [.099,.160,.209])box(g,'#ae9780',.306,.004,.008,.003,0,.054,z,'matte');
 return turn(g,.29);
}
function clipLink(color){
 const g=new THREE.Group();
 tube(g,color,[[-.156,.008,.202],[-.204,.008,.068],[-.135,0,-.215],[-.048,0,-.303],[.080,0,-.272],[.177,0,-.098],[.141,0,.245],[.056,.005,.298],[-.065,.010,.266],[-.156,.008,.202]],.028,'glaze');
 box(g,'#c9c6b0',.063,.071,.188,.023,-.174,.008,.108,'metal').rotation.y=.17;
 return turn(g,.33);
}
function controller(color){
 const g=new THREE.Group(),shape=new THREE.Shape();
 shape.moveTo(-.327,.158);
 shape.bezierCurveTo(-.385,.080,-.392,-.269,-.265,-.303);
 shape.bezierCurveTo(-.159,-.335,-.111,-.222,.0,-.210);
 shape.bezierCurveTo(.110,-.212,.150,-.331,.255,-.303);
 shape.bezierCurveTo(.382,-.280,.389,.091,.307,.160);
 shape.quadraticCurveTo(0,.278,-.327,.158);
 extrudedSurface(g,shape,color,-.060,0,.109,.040,'glaze');
 for(const [w,d] of [[.129,.044],[.045,.130]])box(g,'#645b56',w,.019,d,.008,-.160,.089,.019,'satin');
 for(const [x,z,c] of [[.184,-.070,'#d98c84'],[.127,-.008,'#9aa775'],[.238,-.012,'#d9bc79'],[.186,.046,'#87aeb7']])disk(g,c,.024,.024,.018,x,.099,z,'glaze');
 return turn(g,.35);
}
function coinPurse(){
 const g=new THREE.Group();
 oval(g,'#d494ab',.325,.158,.249,0,0,.067,'satin',33);
 tube(g,'#d3b384',[[-.291,.039,-.136],[-.166,.116,-.186],[0,.142,-.194],[.157,.117,-.184],[.292,.047,-.126]],.022,'metal');
 for(const x of [-.039,.039])oval(g,'#dabc8d',.038,.039,.038,x,.171,-.201,'metal');
 return turn(g,.39);
}
function stereoGlasses(frame='#eddcc1'){
 const g=new THREE.Group();
 for(const [x,color] of [[-.193,'#d78a78'],[.193,'#7dacca']]){
  box(g,frame,.325,.065,.301,.054,x,0,0,'satin');
  box(g,color,.238,.016,.214,.034,x,.041,0,'ice');
 }
 box(g,frame,.105,.056,.051,.016,0,0,0,'satin');
 for(const x of [-.322,.322])tube(g,frame,[[x,0,.094],[x,-.039,.165],[x*.8,-.094,.247]],.021,'satin');
 return turn(g,.31);
}
function pocketPlayer(color){
 const g=new THREE.Group();
 box(g,color,.568,.189,.705,.045,0,0,.012,'satin');
 box(g,'#5e6b65',.471,.033,.331,.032,0,.092,-.102);
 for(const x of [-.118,.118]){
  const spool=ring(g,'#d8c397',.052,.010,x,.114,-.111,'satin');
  spool.rotation.x=Math.PI/2;
 }
 box(g,'#7caeb2',.381,.016,.261,.027,0,.112,-.103,'ice');
 for(let i=0;i<3;i++)box(g,'#dcbc90',.074,.032,.070,.014,(i-1)*.108,.110,.215,'satin');
 return turn(g,.34);
}
function lacquerBox(color){
 const g=new THREE.Group();
 box(g,color,.611,.281,.574,.071,0,-.055,0,'glaze');
 box(g,color,.633,.092,.593,.045,0,.135,0,'glaze');
 printed(g,.544,.501,0,.183,0,c=>{
  c.fillStyle=color;c.fillRect(0,0,512,512);
  c.strokeStyle='#e4bf88';c.lineWidth=8;c.strokeRect(31,36,450,438);
  for(let i=0;i<6;i++){
   const angle=i*tau/6;
   c.beginPath();c.ellipse(256+Math.cos(angle)*65,251+Math.sin(angle)*65,36,18,angle,0,tau);c.stroke();
  }
 });
 return turn(g,.37);
}
const recreationEntries=new Map(),recreationBuilders={};
function recreationRoute(id,condition,kind,build){
 const entries=recreationEntries.get(id)??[];
 entries.push([condition,kind]);
 recreationEntries.set(id,entries);
 recreationBuilders[kind]=build;
}
function recreationColors(label,english,ids,colors,condition,build){
 ids.forEach((id,i)=>{
  const hue=colors[i];
  recreationRoute(id,new RegExp(condition+'|^'+english+' '+hue+'$'),label+'-'+hue.toLowerCase(),()=>build(palette[hue]??'#57525a'));
 });
}
recreationRoute(839,/搭扣零钱包/,'coin-purse-pink',coinPurse);
recreationRoute(1193,/立体眼镜|^Movie Glass White$/,'stereo-glasses',stereoGlasses);
recreationColors('clay-pot','Playing Clay',[869,870,871,872,873,874,875],['Blue','Green','Orange','Pink','Purple','Red','White'],'彩泥盒',clayPot);
recreationColors('cloud-shield','Shield',[1139,1140,1141,1142,1143,1144,1145,1146],['Yellow','Red','Purple','Orange','Grey','Green','Brown','Blue'],'云纹木盾',scrollShield);
recreationColors('toy-rocket','Rocket',[123,124],['Blue','Red'],'玩具火箭',toyRocket);
recreationColors('floppy-disc','Floppy Disc',[1495,1496,1497,1498,1499,1500,1501,1502],['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'软盘',floppy);
recreationColors('clip-link','Carabin',[1443,1444,1445,1446,1447,1448,1449],['Blue','Green','Orange','Pink','Purple','Red','Yellow'],'登山扣',clipLink);
recreationColors('controller','Controller',[835,836,837,838,839,840,841,842,843],['Black','Blue','Green','Grey','Pink','Purple','Red','White','Yellow'],'游戏手柄|色手柄',controller);
recreationColors('pocket-player','Music Player',[1511,1512,1513,1514,1515,1516,1517,1518],['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'随身听',pocketPlayer);
recreationColors('lacquer-box','Tomb',[1095],['Orange'],'描金漆盒',lacquerBox);
recreationColors('rex-doll','Rex',[1243,1244,1245,1246,1247,1248,1249,1250],['Yellow','White','Red','Pink','Grey','Green','Brown','Blue'],'霸王龙',rexDoll);
recreationColors('tambourine','Tambourine',[233,234,235,237,238],['Blue','Green','Orange','Purple','Red'],'铃鼓',tambourine);
recreationColors('flying-disc','Frisbee',[571],['Green'],'飞盘',flyingDisc);

function enamelDuck(color){
 const g=new THREE.Group();
 oval(g,color,.260,.147,.298,0,-.011,.091,'glaze',34);
 oval(g,color,.166,.166,.168,0,.106,-.140,'glaze',34);
 const tail=oval(g,color,.138,.080,.116,0,.032,.326,'glaze');
 tail.rotation.x=.31;
 oval(g,'#d79c63',.103,.050,.087,0,.082,-.290,'glaze');
 for(const x of [-.087,.087]){
  oval(g,'#524e45',.026,.027,.022,x,.188,-.249,'satin');
  oval(g,color,.069,.053,.158,x*2.16,.054,.150,'glaze').rotation.y=Math.sign(x)*.37;
 }
 return turn(g,.36);
}
function toothBrush(color){
 const g=new THREE.Group();
 tube(g,color,[[.013,0,-.221],[.013,-.003,-.077],[-.029,-.012,.088],[-.021,-.006,.253],[.015,.001,.408]],.041,'glaze');
 box(g,color,.169,.066,.302,.029,.018,.003,-.295,'satin');
 for(let z=0;z<5;z++)for(let x=0;x<3;x++)box(g,z%2?'#ebd8b2':'#cbd3b1',.033,.066,.032,.008,(x-1)*.055+.018,.059,-.391+z*.048,'matte');
 return turn(g,.35);
}
function shuttle(color){
 const g=new THREE.Group(),body=new THREE.Shape();
 body.moveTo(-.219,-.272);body.quadraticCurveTo(-.160,.100,-.066,.353);
 body.quadraticCurveTo(0,.409,.067,.351);body.quadraticCurveTo(.169,.104,.221,-.272);
 body.lineTo(0,-.349);body.closePath();
 extrudedSurface(g,body,color,-.055,0,.122,.031,'glaze');
 oval(g,'#6a8c96',.091,.026,.112,0,.085,-.092,'glaze');
 for(const x of [-.071,.071]){
  const engine=disk(g,'#bdad90',.047,.064,.172,x,-.028,.237,'satin');
  engine.rotation.x=Math.PI/2;
 }
 return turn(g,.46);
}
function bicycle(color){
 const g=new THREE.Group();
 for(const x of [-.247,.247]){
  ring(g,'#716b64',.154,.028,x,-.122,0,'satin');
  ring(g,'#d8c4a3',.130,.008,x,-.122,-.006,'metal');
  for(let i=0;i<6;i++){
   const angle=i*tau/6;
   tube(g,'#b7b8ac',[[x,-.122,-.003],[x+Math.cos(angle)*.068,-.122+Math.sin(angle)*.068,0],[x+Math.cos(angle)*.130,-.122+Math.sin(angle)*.130,0]],.006,'satin');
  }
 }
 tube(g,color,[[-.247,-.122,.005],[-.083,.079,.008],[.145,.094,.010],[.013,-.142,.012],[-.247,-.122,.005]],.021,'glaze');
 tube(g,color,[[.247,-.122,0],[.200,.018,0],[.119,.211,.015]],.019,'glaze');
 box(g,'#706057',.145,.040,.067,.019,-.090,.128,0,'satin');
 tube(g,'#aa9b84',[[.057,.220,-.040],[.114,.212,.001],[.175,.221,.030]],.017,'metal');
 return turn(g,.56);
}
function glazedMug(color){
 const g=new THREE.Group();
 const profile=[[0,-.165],[.148,-.166],[.181,-.144],[.209,-.051],[.229,.063],[.231,.171],[.225,.187],[.200,.185],[.199,.159],[.187,.018],[.148,-.098],[.108,-.113],[0,-.113]].map(p=>new THREE.Vector2(...p));
 mesh(g,new THREE.LatheGeometry(profile,46),color,0,0,0);
 tube(g,color,[[.208,.102,.002],[.338,.114,.003],[.366,.017,.005],[.322,-.094,.002],[.200,-.068,.003]],.031);
 const lip=ring(g,'#f4e3c5',.215,.012,0,.184,0,'glaze');
 lip.rotation.x=Math.PI/2;
 return turn(g,.88);
}
function iceScoop(color){
 const g=new THREE.Group();
 const cone=disk(g,'#b98959',.211,.046,.426,0,-.171,0,'satin');
 for(const side of [-1,1])for(let i=0;i<6;i++){
  const a=i*tau/6,points=[];
  for(let j=0;j<4;j++){
   const t=j/3,r=.063+.141*t,phi=a+t*side*.98;
   points.push([r*Math.cos(phi),-.345+.36*t,r*Math.sin(phi)]);
  }
  tube(g,'#d6a873',points,.007,'satin');
 }
 const shades=color?[color,'#e9ca9d']:['#c9849f','#dfb571','#94b480'];
 oval(g,shades[0],.245,.155,.236,0,.092,0,'satin',32);
 oval(g,shades[1],.198,.135,.202,-.025,.233,.013,'satin',30);
 if(shades.length>2)oval(g,shades[2],.130,.093,.136,.022,.342,.016,'satin',24);
 return turn(g,.73);
}
function wateringCan(color){
 const g=new THREE.Group();
 oval(g,color,.269,.175,.260,0,-.055,.039,'glaze',32);
 disk(g,'#e2c89a',.132,.147,.035,0,.108,.058,'satin');
 disk(g,'#846c5c',.086,.086,.018,0,.125,.058,'satin');
 tube(g,color,[[.182,-.050,-.072],[.291,.007,-.189],[.382,.124,-.239]],.045,'glaze');
 const nozzle=disk(g,'#d9b887',.071,.037,.057,.396,.135,-.252,'satin');
 nozzle.rotation.set(-.69,0,-.48);
 tube(g,color,[[-.190,-.073,.101],[-.339,.042,.192],[-.318,.176,.131],[-.147,.138,.104]],.031,'glaze');
 return turn(g,.55);
}
function toyBucket(color){
 const g=new THREE.Group();
 const section=[[0,-.214],[.180,-.212],[.212,-.198],[.252,.134],[.251,.161],[.225,.163],[.219,.133],[.189,-.162],[0,-.169]].map(p=>new THREE.Vector2(...p));
 mesh(g,new THREE.LatheGeometry(section,46),color,0,0,0);
 tube(g,'#e1c69a',[[-.252,.094,0],[-.226,.260,.029],[0,.355,.061],[.223,.257,.030],[.252,.094,0]],.024,'satin');
 return turn(g,.71);
}
const homesteadEntries=new Map(),homesteadBuilders={};
function homesteadRoute(id,condition,kind,build){
 const list=homesteadEntries.get(id)??[];
 list.push([condition,kind]);
 homesteadEntries.set(id,list);
 homesteadBuilders[kind]=build;
}
function homesteadColors(label,english,ids,colors,condition,build){
 ids.forEach((id,i)=>{
  const hue=colors[i];
  homesteadRoute(id,new RegExp(condition+'|^'+english+' '+hue+'$'),label+'-'+hue.toLowerCase(),()=>build(palette[hue]));
 });
}
homesteadRoute(462,/冰淇淋|^Ice Cream Rainbow$/,'rainbow-ice-cream',()=>iceScoop());
homesteadRoute(294,/牙刷/,'yellow-toothbrush',()=>toothBrush('#d5aa63'));
homesteadRoute(1341,/沙滩小桶|^Sand Bucket Pink$/,'pink-beach-bucket',()=>toyBucket('#d490a7'));
homesteadRoute(392,/麦片|^Cereal Blue$/,'blueberry-cereal-carton',()=>fruitCarton('#86a0b8','蓝莓麦片','#a293b6'));
homesteadColors('enamel-duck','Ancient Duck',[1058,1059,1060,1061,1062,1063,1064,1065],['Blue','Brown','Green','Grey','Pink','Purple','Red','Yellow'],'搪瓷小鸭',enamelDuck);
homesteadColors('shuttle','Space Ship',[971,972,973,974,975,977,978],['Yellow','Red','Purple','Pink','Orange','Green','Blue'],'航天飞机',shuttle);
homesteadColors('bicycle','Bike',[66,67,68,69,70,71,72],['Blue','Green','Orange','Pink','Purple','Red','Yellow'],'自行车',bicycle);
homesteadColors('ceramic-mug','Cup',[645,646,647,648,649,650,651,652],['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],'瓷杯',glazedMug);
homesteadColors('ship-wheel','Pirate Wheel',[1713,1714,1716,1717,1719,1720],['Blue','Green','Orange','Pink','Red','Yellow'],'船舵',shipWheel);
homesteadColors('watering-can','Watering Can',[1644,1645,1646,1647,1648,1649,1650,1651],['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],'洒水壶|浇花壶',wateringCan);
homesteadColors('ice-cream','Ice Cream',[458,459,460,463],['Blue','Brown','Pink','White'],'冰淇淋',iceScoop);
homesteadColors('flying-disc','Frisbee',[573],['Purple'],'飞盘',flyingDisc);

const letterStrokes={
 A:[[[-2,-3],[0,3],[2,-3]],[[-1.3,-.65],[1.3,-.65]]],
 B:[[[-1.8,-3],[-1.8,3],[.6,3],[1.6,2.6],[1.9,1.8],[1.5,.85],[.55,.35],[-1.8,.35]],[[.55,.35],[1.8,-.15],[2.1,-1.4],[1.65,-2.5],[.6,-3],[-1.8,-3]]],
 C:[[[1.9,2.3],[.9,3],[-.7,3],[-1.8,2.1],[-2,0],[-1.8,-2],[-.7,-3],[.9,-3],[1.9,-2.35]]],
 D:[[[-1.85,-3],[-1.85,3],[.25,3],[1.5,2.3],[2,1],[2,-1],[1.5,-2.3],[.25,-3],[-1.85,-3]]],
 E:[[[1.8,3],[-1.8,3],[-1.8,-3],[1.8,-3]],[[-1.8,.1],[1.3,.1]]],
 F:[[[1.8,3],[-1.8,3],[-1.8,-3]],[[-1.8,.1],[1.3,.1]]],
 G:[[[1.8,2.3],[.85,3],[-.7,3],[-1.8,2.1],[-2,0],[-1.8,-2],[-.7,-3],[.9,-3],[1.9,-2.1],[1.9,-.2],[.35,-.2]]],
 H:[[[-1.8,-3],[-1.8,3]],[[1.8,-3],[1.8,3]],[[-1.8,0],[1.8,0]]],
 I:[[[-1.2,3],[1.2,3]],[[0,3],[0,-3]],[[-1.2,-3],[1.2,-3]]],
 J:[[[-.9,3],[1.65,3],[1.65,-1.55],[1.2,-2.6],[.35,-3],[-.8,-3],[-1.65,-2.3]]],
 K:[[[-1.8,-3],[-1.8,3]],[[1.75,3],[-1.8,-.4]],[[1.95,-3],[-.13,1.16]]],
 L:[[[-1.6,3],[-1.6,-3],[1.8,-3]]],
 M:[[[-2,-3],[-2,3],[0,-.2],[2,3],[2,-3]]],
 N:[[[-1.9,-3],[-1.9,3],[1.9,-3],[1.9,3]]],
 O:[[[-1.95,0],[-1.72,2],[-.78,2.95],[.78,2.95],[1.72,2],[1.95,0],[1.72,-2],[.78,-2.95],[-.78,-2.95],[-1.72,-2],[-1.95,0]]],
 P:[[[-1.65,-3],[-1.65,3],[.6,3],[1.55,2.5],[1.9,1.5],[1.55,.5],[.6,0],[-1.65,0]]],
 Q:[[[-1.95,0],[-1.72,2],[-.78,2.95],[.78,2.95],[1.72,2],[1.95,0],[1.72,-2],[.78,-2.95],[-.78,-2.95],[-1.72,-2],[-1.95,0]],[[.45,-1.35],[2.15,-3.25]]],
 R:[[[-1.65,-3],[-1.65,3],[.6,3],[1.55,2.5],[1.9,1.5],[1.55,.5],[.6,0],[-1.65,0]],[[.25,0],[1.92,-3]]],
 S:[[[1.7,2.34],[.8,3],[-.65,3],[-1.62,2.44],[-1.79,1.44],[-1.15,.64],[1.18,-.28],[1.82,-1.22],[1.61,-2.42],[.65,-3],[-.8,-3],[-1.76,-2.37]]],
 T:[[[-2,3],[2,3]],[[0,3],[0,-3]]],
 U:[[[-1.85,3],[-1.85,-1.43],[-1.41,-2.54],[-.55,-3],[.55,-3],[1.41,-2.54],[1.85,-1.43],[1.85,3]]],
 V:[[[-2,3],[0,-3],[2,3]]],
 W:[[[-2.25,3],[-1.25,-3],[0,.92],[1.25,-3],[2.25,3]]],
 X:[[[-1.85,3],[1.85,-3]],[[-1.85,-3],[1.85,3]]],
 Y:[[[-1.95,3],[0,.18],[1.95,3]],[[0,.18],[0,-3]]],
 Z:[[[-1.85,3],[1.85,3],[-1.85,-3],[1.85,-3]]],
};
function letterBlock(strokes,color){
 const group=new THREE.Group();
 for(const path of strokes){
  const points=path.map(([x,y])=>[x*.145,0,-y*.104]);
  for(let i=0;i<points.length-1;i++){
   const [x,,z]=points[i],[nextX,,nextZ]=points[i+1];
   const bar=box(group,color,.138,.176,Math.hypot(nextX-x,nextZ-z)+.085,.042,(x+nextX)/2,0,(z+nextZ)/2);
   bar.rotation.y=Math.atan2(nextX-x,nextZ-z);
  }
 }
 return turn(group,.22);
}
function toyHelicopter(color,multicolor){
 const group=new THREE.Group();
 const accent=multicolor?'#ed9f50':'#dfc691';
 oval(group,color,.238,.155,.230,0,0,-.101,'glaze',30);
 oval(group,'#76a5af',.184,.116,.137,0,.062,-.200,'ice',30);
 tube(group,color,[[0,-.008,.065],[0,.033,.231],[0,.086,.386]],.066);
 box(group,accent,.071,.165,.128,.028,0,.142,.372);
 ring(group,'#7e827a',.066,.018,.053,.129,.378,'satin').rotation.y=Math.PI/2;
 disk(group,'#9f8d76',.041,.047,.121,0,.157,-.085,'metal');
 const rotor=box(group,multicolor?'#87a87b':'#766e67',.662,.025,.083,.011,0,.221,-.085,'satin');
 rotor.rotation.y=.28;
 disk(group,accent,.052,.056,.035,0,.244,-.085,'glaze');
 for(const side of [-1,1]){
  tube(group,'#a99c86',[[side*.161,-.158,-.292],[side*.165,-.184,-.222],[side*.165,-.184,.118]],.018,'metal');
  tube(group,'#a99c86',[[side*.112,-.056,.004],[side*.163,-.161,.040]],.016,'metal');
  tube(group,'#a99c86',[[side*.112,-.068,-.187],[side*.163,-.158,-.157]],.016,'metal');
 }
 return turn(group,.48);
}
function monsterTruck(color){
 const group=new THREE.Group();
 for(const x of [-.239,.239])for(const z of [-.232,.232]){
  const tire=disk(group,'#655752',.147,.147,.115,x,-.11,z,'matte');
  tire.rotation.z=Math.PI/2;
  const rim=disk(group,'#ccba91',.079,.078,.028,x*1.28,-.11,z,'metal');
  rim.rotation.z=Math.PI/2;
  for(let i=0;i<10;i++){
   const angle=i*tau/10;
   const tread=box(group,'#5a4e49',.113,.028,.042,.010,x,-.11+Math.cos(angle)*.147,z+Math.sin(angle)*.147,'matte');
   tread.rotation.x=angle;
  }
 }
 box(group,'#776158',.370,.105,.566,.039,0,-.078,0,'satin');
 box(group,color,.460,.139,.650,.063,0,.038,0);
 box(group,color,.382,.133,.330,.050,0,.141,.009);
 box(group,'#86a8ad',.310,.080,.232,.035,0,.176,.002,'ice');
 box(group,color,.330,.048,.236,.021,0,.216,.021);
 for(const x of [-.141,.141])oval(group,'#f4dc98',.043,.032,.026,x,.043,-.321);
 return turn(group,.53);
}
function lollipop(color){
 const group=new THREE.Group();
 const handle=disk(group,'#f4e4cb',.025,.026,.401,0,-.024,.216,'satin');
 handle.rotation.x=Math.PI/2;
 oval(group,color,.215,.090,.227,0,.004,-.177,'ice',36);
 const seam=ring(group,color,.202,.011,0,.022,-.177);
 seam.rotation.x=Math.PI/2;
 return turn(group,.27);
}
function cassette(color){
 const group=new THREE.Group();
 box(group,color,.688,.125,.462,.040,0,-.004,0,'glaze');
 box(group,'#f3ddb7',.574,.017,.286,.022,0,.065,-.042,'satin');
 box(group,'#78615e',.396,.016,.128,.020,0,.079,-.043,'satin');
 for(const x of [-.139,.139]){
  disk(group,'#cdb696',.053,.053,.012,x,.088,-.043,'satin');
  disk(group,'#655254',.025,.025,.012,x,.096,-.043,'satin');
  for(let i=0;i<4;i++){
   const angle=i*tau/4;
   oval(group,'#ede0bd',.012,.006,.012,x+Math.cos(angle)*.030,.097,-.043+Math.sin(angle)*.030,'satin');
  }
 }
 box(group,'#e1b687',.136,.008,.061,.005,0,.090,-.043,'ice');
 for(const x of [-.282,.282])for(const z of [-.166,.166])disk(group,'#a29183',.016,.016,.010,x,.065,z,'metal');
 box(group,'#aa8273',.320,.038,.089,.018,0,.064,.182,'satin');
 return turn(group,.34);
}
function tableFork(color){
 const group=new THREE.Group();
 box(group,color,.135,.065,.328,.031,0,0,.202);
 box(group,'#cfcbd0',.075,.042,.125,.019,0,.006,.031,'metal');
 box(group,'#cfcbd0',.180,.039,.117,.019,0,.005,-.077,'metal');
 for(let i=0;i<4;i++){
  const x=(i-1.5)*.048;
  tube(group,'#d8d4d2',[[x,.006,-.085],[x*1.06,.014,-.172],[x*1.08,.035,-.268]],.017,'metal');
 }
 for(const z of [.154,.253])disk(group,'#c7b59a',.014,.014,.008,0,.036,z,'metal');
 return turn(group,.31);
}
const toychestEntries=new Map(),toychestBuilders={};
function toychestRoute(id,condition,kind,build){
 toychestEntries.set(id,[[condition,kind]]);
 toychestBuilders[kind]=build;
}
const letterColors=[
 '#e8b342','#67a7ba','#6ba85f','#cc725b','#a778b4','#509f9f','#e99d63',
 '#a079c1','#428f9d','#d9826b','#78a56d','#d6ad53','#d76752','#649fc0',
 '#d48b5d','#8f73b7','#7aaa67','#dcb457','#69a2a5','#538cbc','#c67983',
 '#97ac66','#cb9558','#8b76b2','#649a80','#ce6d57',
];
Object.keys(letterStrokes).forEach((character,index)=>{
 toychestRoute(13+index,new RegExp('^(?:字母\\s*|Text )'+character+'$'),'letter-block-'+character.toLowerCase(),()=>letterBlock(letterStrokes[character],letterColors[index%letterColors.length]));
});
function toychestColors(label,english,start,colors,localized,build){
 colors.forEach((hue,index)=>{
  const pattern=new RegExp(localized+'|^'+english+' '+hue+'$');
  toychestRoute(start+index,pattern,label+'-'+hue.toLowerCase(),()=>build(palette[hue]));
 });
}
toychestRoute(92,/直升机|^Helicopter All Colors$/,'toy-helicopter-multicolor',()=>toyHelicopter('#cc7468',true));
toychestColors('toy-helicopter','Helicopter',93,['Blue','Green','Grey','Pink','Purple'],'直升机',toyHelicopter);
toychestColors('monster-truck','Monster Truck',109,['Green','Grey','Orange','Pink','Purple','Red','Yellow'],'大脚车',monsterTruck);
toychestColors('lollipop','Lollipop',466,['Orange','Pink','Purple','Red','Yellow'],'棒棒糖',lollipop);
toychestColors('cassette','Casette Tape',1479,['Blue','Brown','Green','Orange','Pink','Purple','Red','Yellow'],'(?:录音)?磁带',cassette);
toychestColors('table-fork','Fork',691,['Green','Orange','Pink','Purple','Red','White','Yellow'],'餐叉',tableFork);

function poolFloat(color,segmented){
 const group=new THREE.Group();
 const vinyl=segmented?null:new THREE.Color(color).lerp(new THREE.Color('#f8e8c7'),.19);
 const colors=segmented?['#e5ae61','#80a98f','#7a9da9','#d5a0a9']:Array(4).fill('#'+vinyl.getHexString());
 const bandWidth=.29;
 for(let i=0;i<4;i++){
  const start=i*tau/4;
  const segment=ring(group,colors[i],.278,.107,0,0,0,'ice',tau/4-bandWidth+.018);
  segment.rotation.set(-Math.PI/2,0,start+bandWidth-.009);
  const band=ring(group,'#fae8c8',.278,.108,0,0,0,'glaze',bandWidth+.018);
  band.rotation.set(-Math.PI/2,0,start-.009);
 }
 const seam=ring(group,segmented?'#f0d1a3':color,.378,.011,0,-.005,0,'glaze');
 seam.rotation.x=Math.PI/2;
 disk(group,'#f3debf',.034,.046,.020,.238,.103,.157,'satin');
 disk(group,'#c5a985',.020,.020,.026,.238,.114,.157,'satin');
 return turn(group,.38);
}
function stripedDoughnut(color){
 const group=new THREE.Group();
 ring(group,'#cb9159',.241,.135,0,-.027,0,'satin').rotation.x=Math.PI/2;
 const icing=ring(group,color,.241,.120,0,.029,0,'glaze');
 icing.rotation.x=Math.PI/2;
 icing.scale.z=.74;
 for(let i=0;i<9;i++){
  const path=[];
  for(let j=0;j<=6;j++){
   const t=j/6,a=i*tau/9+.35*t,r=.241+.109*Math.cos(t*Math.PI);
   path.push([r*Math.cos(a),.029+.087*Math.sin(t*Math.PI),r*Math.sin(a)]);
  }
  tube(group,'#e9cd9f',path,.012,'glaze');
 }
 return turn(group,.31);
}
function spaceRobot(color){
 const group=new THREE.Group();
 box(group,color,.342,.230,.310,.051,0,0,-.083);
 box(group,color,.290,.216,.209,.051,0,.017,-.336);
 box(group,'#596f77',.202,.041,.120,.020,0,.131,-.339,'ice');
 for(const x of [-.062,.062])oval(group,'#e7bd6f',.025,.012,.021,x,.157,-.339);
 box(group,'#cfbb99',.182,.023,.130,.026,0,.123,-.061,'satin');
 for(const x of [-.251,.251]){
  oval(group,'#bb9b7a',.067,.083,.072,x*.78,.013,-.188,'metal');
  box(group,color,.097,.147,.152,.031,x,0,-.034).rotation.y=Math.sign(x)*.18;
 }
 for(const x of [-.083,.083])box(group,'#9b8b7c',.126,.155,.184,.029,x,-.004,.161,'satin');
 disk(group,'#bdab8c',.018,.026,.057,0,.104,-.432,'metal');
 oval(group,'#d8a46c',.039,.040,.037,0,.146,-.432);
 return turn(group,.25);
}
function lipstick(color){
 const group=new THREE.Group();
 const barrel=disk(group,color,.114,.122,.394,0,-.142,0);
 const top=disk(group,'#dbbf8b',.105,.106,.188,0,.123,0,'metal');
 for(const y of [-.291,.043])ring(group,'#d3ae75',.117,.011,0,y,0,'metal').rotation.x=Math.PI/2;
 const tip=oval(group,color,.087,.131,.083,0,.241,0,'satin',36);
 tip.rotation.z=-.24;
 oval(group,'#e0c8a2',.060,.012,.061,.006,.314,.044,'satin').rotation.x=.33;
 barrel.rotation.y=.37;
 top.rotation.y=.37;
 return turn(group,.96);
}
function woodScoop(){
 const group=new THREE.Group();
 const section=[[0,-.075],[.099,-.065],[.155,-.039],[.210,.030],[.212,.060],[.194,.068],[.176,.033],[.122,.004],[.055,-.016],[0,-.018]].map(p=>new THREE.Vector2(...p));
 const cup=mesh(group,new THREE.LatheGeometry(section,38),'#b98a54',0,0,-.195,'satin');
 cup.scale.z=1.16;
 tube(group,'#ae8053',[[0,-.016,-.014],[0,.019,.148],[-.008,.038,.279],[-.003,.039,.405]],.046,'satin');
 for(const x of [-.085,-.043,.033,.080]){
  tube(group,'#cca26d',[[x,-.005,-.281],[x*1.22,-.012,-.229],[x,.002,-.149]],.0025,'matte');
 }
 return turn(group,.27);
}
function handleOilTin(){
 const group=new THREE.Group();
 box(group,'#bb944b',.407,.245,.550,.061,0,-.026,.014,'metal');
 for(const z of [-.255,.270])box(group,'#dfc28a',.405,.226,.030,.015,0,-.021,z,'metal');
 box(group,'#dfbd77',.345,.021,.405,.020,0,.101,.011,'satin');
 printed(group,.306,.314,0,.114,.026,(ctx,size)=>{
  ctx.fillStyle='#d7af68';ctx.fillRect(0,0,size,size);
  ctx.strokeStyle='#8b6347';ctx.lineWidth=15;ctx.strokeRect(26,22,460,468);
  ctx.fillStyle='#893f37';ctx.fillRect(175,40,160,410);
  ctx.fillStyle='#f7d693';ctx.font='bold 72px sans-serif';ctx.textAlign='center';
  printInk(ctx,'香',256,223);printInk(ctx,'油',256,324);
 });
 tube(group,'#d6bd83',[[.052,.094,-.227],[.173,.126,-.320],[.280,.160,-.344]],.033,'metal');
 tube(group,'#ad8249',[[-.151,.040,-.123],[-.282,.079,-.082],[-.278,.079,.118],[-.151,.056,.177]],.028,'metal');
 return turn(group,.35);
}
const summerEntries=new Map(),summerBuilders={};
function summerRoute(id,pattern,kind,build){
 const routes=summerEntries.get(id)??[];
 routes.push([pattern,kind]);
 summerEntries.set(id,routes);
 summerBuilders[kind]=build;
}
function summerColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  const pattern=new RegExp(localized+'|^'+english+' '+hue+'$');
  summerRoute(start+index,pattern,prefix+'-'+hue.toLowerCase(),()=>build(palette[hue]));
 });
}
summerColors('striped-doughnut','Doughnut Striped','条纹甜甜圈',433,['Blue','Brown','Green','Orange','Pink','Purple','White','Yellow'],stripedDoughnut);
summerColors('garden-snail','Snail','蜗牛',957,['Blue','Brown','Green','Orange','Pink','Purple','Red','Yellow'],color=>snail(color));
summerColors('pool-float','Swim Ring','游泳圈',1321,['Red','Yellow','Colorful','Purple','Pink','Orange','Green','Blue'],color=>poolFloat(color,!color));
summerColors('space-robot','Space Robot','太空机器人',1003,['Yellow','Red','Purple','Pink','Orange','Grey','Green','Blue'],spaceRobot);
summerColors('lipstick','Lipstick','旋盖口红|色口红',1753,['Yellow','Red','Purple','Orange','Green','Grey','Blue','Pink'],lipstick);
summerColors('travel-flask','Camping Flask','保温壶|便携保温壶|热饮保温桶',1427,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],color=>travelBottle(color,true));
summerRoute(1412,/木粮勺/,'wood-grain-scoop',woodScoop);
summerRoute(836,/香油铁壶/,'tin-sesame-oil',handleOilTin);

function splashToy(color){
 const g=new THREE.Group();
 box(g,color,.345,.181,.471,.084,0,-.001,-.033);
 oval(g,'#96bec2',.133,.104,.188,0,.119,-.033,'ice',32);
 const nose=disk(g,'#dba46a',.099,.110,.136,0,.014,-.306);
 nose.rotation.x=-Math.PI/2;
 const opening=disk(g,'#956e59',.052,.052,.017,0,.014,-.376,'satin');
 opening.rotation.x=Math.PI/2;
 const grip=box(g,color,.133,.207,.178,.041,0,-.132,.085);
 grip.rotation.x=-.36;
 box(g,'#e2b878',.128,.066,.171,.030,0,-.217,.116);
 for(const x of [-.171,.171])oval(g,'#ebc094',.012,.055,.085,x,-.004,-.031,'satin');
 return turn(g,.53);
}
function foamProp(color,isAxe){
 const g=new THREE.Group(),blade=new THREE.Shape();
 if(isAxe){
  blade.moveTo(-.081,.091);
  blade.quadraticCurveTo(.183,.098,.273,.258);
  blade.quadraticCurveTo(.273,.344,.188,.401);
  blade.quadraticCurveTo(.074,.314,-.093,.342);
  blade.closePath();
  tube(g,'#c8a477',[[0,0,.401],[.011,0,.061],[-.009,0,-.280]],.049,'satin');
 }else{
  blade.moveTo(-.053,-.158);blade.quadraticCurveTo(-.058,.219,.010,.406);
  blade.quadraticCurveTo(.038,.458,.066,.399);blade.quadraticCurveTo(.131,.239,.075,-.159);
  blade.closePath();
  box(g,'#8b756c',.120,.105,.259,.033,.008,0,.257,'satin');
  for(const z of [.204,.251,.298])box(g,'#c6b195',.126,.112,.025,.009,.008,0,z,'ribbon');
  box(g,'#ecd4aa',.251,.090,.073,.031,.009,0,.145,'satin');
 }
 extrudedSurface(g,blade,color,-.048,0,.096,.021,'satin');
 return turn(g,.31);
}
function toyMallet(){
 const g=new THREE.Group();
 tube(g,'#b28862',[[0,-.025,.409],[.002,0,.082],[0,.008,-.208]],.052,'satin');
 const head=disk(g,'#bd7d63',.126,.126,.401,0,0,-.214,'glaze');
 head.rotation.z=Math.PI/2;
 for(const x of [-.196,.196]){
  const cap=disk(g,'#d6a671',.141,.141,.041,x,0,-.214,'satin');
  cap.rotation.z=Math.PI/2;
 }
 return turn(g,.38);
}
function jigsawToken(color){
 const g=new THREE.Group(),shape=new THREE.Shape();
 shape.moveTo(-.236,-.253);shape.lineTo(-.061,-.253);
 shape.bezierCurveTo(-.147,-.097,.157,-.096,.080,-.253);shape.lineTo(.244,-.253);
 shape.lineTo(.244,-.066);shape.bezierCurveTo(.401,-.171,.415,.151,.244,.071);shape.lineTo(.244,.251);
 shape.lineTo(.065,.251);shape.bezierCurveTo(.153,.406,-.155,.413,-.061,.251);shape.lineTo(-.236,.251);
 shape.lineTo(-.236,.075);shape.bezierCurveTo(-.096,.146,-.087,-.151,-.236,-.070);shape.closePath();
 extrudedSurface(g,shape,color,-.069,0,.138,.019,'glaze');
 return turn(g,.30);
}
function shrimp(){
 const g=new THREE.Group();
 for(let i=0;i<10;i++){
  const a=-.84+i*.395,r=.218;
  const scale=1-i*.044;
  const body=oval(g,i%2?'#d59376':'#e4a488',.123*scale,.109*scale,.111*scale,r*Math.cos(a),0,r*Math.sin(a),'satin',28);
  body.rotation.y=-a-.63;
  tube(g,'#edbd9c',[[r*Math.cos(a),.098*scale,r*Math.sin(a)],[(r+.063)*Math.cos(a),.065*scale,(r+.063)*Math.sin(a)],[(r+.088)*Math.cos(a),.009,(r+.088)*Math.sin(a)]],.0044,'satin');
 }
 for(const x of [-.048,.048]){
  const fan=oval(g,'#c47c66',.061,.029,.122,-.249+x,0,.070,'satin');
  fan.rotation.y=x*11-.31;
 }
 oval(g,'#624f49',.014,.013,.014,.191,.072,-.194,'satin');
 return turn(g,.37);
}
const playroomEntries=new Map(),playroomBuilders={};
function playroomRoute(id,pattern,kind,build){
 playroomEntries.set(id,[[pattern,kind]]);
 playroomBuilders[kind]=build;
}
function playroomColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  const pattern=new RegExp(localized+'|^'+english+' '+hue+'$');
  playroomRoute(start+index,pattern,prefix+'-'+hue.toLowerCase(),()=>build(palette[hue]??'#625b65'));
 });
}
playroomColors('splash-toy','Watergun','戏水(?:玩具|枪)',907,['Blue','Pink','Purple','Red','White','Yellow'],splashToy);
playroomColors('camp-play-prop','Camping Axe','露营玩具斧',1410,['Blue','Black','Green','Orange','Pink','Purple','Red','Yellow'],color=>foamProp(color,true));
playroomColors('foam-play-prop','Katana','泡棉练功剑',1362,['Black','Blue','Green','Orange','Pink','Purple','Red','Yellow'],color=>foamProp(color,false));
playroomColors('jigsaw-token','Jigsaw','拼图',855,['Blue','Brown','Green','Orange','Pink','Purple','Red','White','Yellow'],jigsawToken);
playroomRoute(853,/玩具小锤|^Hammer$/,'toy-mallet',toyMallet);
playroomRoute(498,/鲜虾|^Shrimp$/,'fresh-shrimp',shrimp);

function skateboard(color){
 const g=new THREE.Group();
 const outline=edgeOutline(.399,.136,.93);
 extrudedSurface(g,outline,'#bc9968',-.022,0,.043,.015,'satin');
 extrudedSurface(g,outline,color,.030,0,.019,.009,'glaze');
 for(const z of [-.242,.242]){
  box(g,'#a9a399',.211,.047,.055,.012,0,-.055,z,'metal');
  for(const x of [-.119,.119]){
   disk(g,'#dfc295',.069,.069,.054,x,-.107,z,'satin').rotation.z=Math.PI/2;
   disk(g,'#a5a198',.027,.027,.059,x,-.107,z,'metal').rotation.z=Math.PI/2;
   disk(g,'#d1c1a6',.012,.012,.009,x*.62,.062,z,'metal');
  }
 }
 for(const [x,z] of [[-.036,-.095],[0,0],[.036,.095]]){
  box(g,'#edd2a2',.129,.012,.020,.005,x,.060,z,'satin').rotation.y=-.53;
 }
 return turn(g,.30);
}
function footprintBadge(color){
 const g=new THREE.Group();
 disk(g,'#b19572',.291,.252,.123,0,-.022,0,'metal');
 disk(g,color,.263,.276,.046,0,.052,0,'glaze');
 ring(g,'#d9bf91',.263,.014,0,.078,0,'metal').rotation.x=Math.PI/2;
 const mark='#eedbb6';
 oval(g,mark,.097,.021,.084,0,.088,.064,'satin');
 for(const [x,z,angle] of [[-.119,-.004,-.45],[0,-.087,0],[.119,-.004,.45]]){
  oval(g,mark,.045,.019,.094,x,.088,z,'satin').rotation.y=angle;
 }
 return turn(g,.45);
}
function scallopShell(color){
 const g=new THREE.Group(),body=new THREE.Shape();
 body.moveTo(-.071,-.318);body.quadraticCurveTo(-.225,-.206,-.326,.035);
 body.bezierCurveTo(-.384,.169,-.263,.321,0,.336);
 body.bezierCurveTo(.263,.321,.384,.169,.326,.035);
 body.quadraticCurveTo(.225,-.206,.071,-.318);
 body.closePath();
 extrudedSurface(g,body,color,-.057,0,.083,.031,'glaze');
 const pearl='#'+new THREE.Color(color).lerp(new THREE.Color('#f6d5a6'),.44).getHexString();
 for(let i=-4;i<=4;i++){
  const x=i*.069;
  tube(g,pearl,[[i*.012,.029,.279],[x*.54,.064,.069],[x,.078,-.141],[x*1.04,.030,-.299+Math.abs(i)*.021]],.014,'glaze');
 }
 return turn(g,.35);
}
function vinylDisc(color){
 const g=new THREE.Group();
 const charcoal='#'+new THREE.Color('#403a42').lerp(new THREE.Color(color),.36).getHexString();
 disk(g,charcoal,.350,.350,.059,0,-.019,0,'satin');
 ring(g,color,.340,.006,0,.006,0,'glaze').rotation.x=Math.PI/2;
 for(const r of [.187,.218,.249,.280,.306,.332]){
  ring(g,'#706064',r,.0028,0,.011,0,'satin').rotation.x=Math.PI/2;
 }
 disk(g,color,.161,.161,.013,0,.015,0,'glaze');
 ring(g,'#e4c79d',.117,.006,0,.026,0,'satin').rotation.x=Math.PI/2;
 disk(g,'#65545b',.019,.019,.020,0,.024,0,'matte');
 return turn(g,.34);
}
function wallClock(color){
 const g=new THREE.Group();
 disk(g,color,.327,.316,.120,0,-.030,0);
 disk(g,'#f1ddba',.279,.271,.025,0,.038,0,'satin');
 ring(g,'#dfbf89',.294,.022,0,.060,0,'metal').rotation.x=Math.PI/2;
 for(let i=0;i<12;i++){
  const a=i*tau/12,mark=box(g,'#917a65',.008,.008,i%3?.021:.034,.003,.243*Math.sin(a),.055,.243*Math.cos(a),'satin');
  mark.rotation.y=a;
 }
 box(g,'#906b56',.022,.012,.158,.007,0,.057,-.046,'satin').rotation.y=-.15;
 box(g,'#a78164',.017,.012,.191,.007,.078,.066,.021,'satin').rotation.y=1.82;
 disk(g,'#cba674',.021,.021,.022,0,.068,0,'metal');
 oval(g,'#eadbc3',.271,.012,.271,0,.079,0,'ice',44);
 return turn(g,.31);
}
function satellite(color){
 const g=new THREE.Group();
 box(g,color,.233,.159,.311,.048,0,0,0,'glaze');
 for(const x of [-.293,.293]){
  box(g,'#a79179',.128,.033,.049,.010,x*.53,0,0,'metal');
  box(g,'#c5a575',.221,.020,.293,.020,x,.030,0,'metal');
  for(const dx of [-.048,.048])for(const z of [-.086,0,.086])box(g,'#688ba1',.073,.010,.071,.008,x+dx,.043,z,'ice');
 }
 const dish=oval(g,'#e4ccb0',.124,.024,.121,0,.112,-.056,'metal');
 dish.rotation.z=-.33;
 tube(g,'#af9979',[[0,.041,-.054],[0,.107,-.054],[.035,.165,-.054]],.008,'metal');
 oval(g,color,.024,.027,.026,.035,.161,-.054);
 return turn(g,.56);
}
const collectionPlusEntries=new Map(),collectionPlusBuilders={};
function collectionPlusColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  const kind=prefix+'-'+hue.toLowerCase();
  collectionPlusEntries.set(start+index,[[new RegExp(localized+'|^'+english+' '+hue+'$'),kind]]);
  collectionPlusBuilders[kind]=()=>build(palette[hue]);
 });
}
collectionPlusColors('skateboard','Skateboard','滑板',137,['Blue','Green','Orange','Purple','Red','Yellow'],skateboard);
collectionPlusColors('scallop-shell','Seashell','扇贝壳|色贝壳',1572,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],scallopShell);
collectionPlusColors('footprint-badge','Footprint','恐龙脚印徽章',1259,['Yellow','Red','Purple','Grey','Green','Blue'],footprintBadge);
collectionPlusColors('record-disc','Music Disc','黑胶唱片|色唱片',1519,['Blue','Green','Orange','Pink','Purple','Red','Grey'],vinylDisc);
collectionPlusColors('round-wall-clock','Wall Clock','挂钟',2853,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],wallClock);
collectionPlusColors('toy-satellite','Satellite','卫星',987,['Yellow','Red','Purple','Pink','Orange','Grey','Green','Blue'],satellite);

function rollingPin(color){
 const g=new THREE.Group();
 const grain='#bb8a55';
 const cylinder=disk(g,grain,.113,.113,.499,0,0,0,'satin');
 cylinder.rotation.x=Math.PI/2;
 for(const z of [-.242,.242]){
  oval(g,'#c99a62',.112,.111,.038,0,0,z,'satin',32);
  oval(g,color,.059,.057,.108,0,0,z*1.40,'glaze',28);
 }
 for(let i=0;i<15;i++){
  const a=i*tau/15;
  tube(g,i%3?'#c19460':'#ad7d4c',[[.112*Math.cos(a),.112*Math.sin(a),-.226],[.114*Math.cos(a+.035),.114*Math.sin(a+.035),-.052],[.114*Math.cos(a-.015),.114*Math.sin(a-.015),.125],[.112*Math.cos(a+.049),.112*Math.sin(a+.049),.234]],.0014,'satin');
 }
 return turn(g,.38);
}
function kitchenSpatula(color){
 const g=new THREE.Group();
 box(g,color,.122,.071,.332,.030,0,0,.219,'satin');
 tube(g,'#bbb5ad',[[0,0,.076],[0,.009,.015],[0,.043,-.076]],.027,'metal');
 const blade=new THREE.Shape();
 blade.moveTo(-.077,.026);blade.quadraticCurveTo(-.199,.035,-.203,.122);
 blade.lineTo(-.217,.308);blade.quadraticCurveTo(-.212,.356,0,.365);
 blade.quadraticCurveTo(.218,.359,.217,.310);blade.lineTo(.202,.125);
 blade.quadraticCurveTo(.196,.042,.077,.026);blade.closePath();
 for(const x of [-.080,0,.080]){
  const gap=new THREE.Path();
  gap.moveTo(x-.010,.155);gap.lineTo(x-.010,.278);gap.quadraticCurveTo(x,.294,x+.010,.278);gap.lineTo(x+.010,.155);gap.quadraticCurveTo(x,.139,x-.010,.155);
  blade.holes.push(gap);
 }
 extrudedSurface(g,blade,'#d2c9bc',.026,0,.028,.007,'metal');
 for(const z of [.137,.268])disk(g,'#c4ae91',.016,.016,.009,0,.037,z,'metal');
 return turn(g,.32);
}
function elephant(color){
 const g=new THREE.Group();
 oval(g,color,.226,.167,.261,0,-.037,.049,'glaze',32);
 oval(g,color,.163,.160,.150,0,.066,-.151,'glaze',32);
 for(const x of [-.150,.150]){
  oval(g,color,.105,.137,.045,x,.064,-.119,'glaze').rotation.z=Math.sign(x)*.22;
  oval(g,'#dba79e',.066,.089,.017,x*1.10,.061,-.148,'satin').rotation.z=Math.sign(x)*.22;
  oval(g,'#62544d',.023,.022,.019,x*.53,.110,-.282,'satin');
  for(const z of [-.038,.178])oval(g,color,.069,.092,.071,x*.76,-.151,z,'glaze');
 }
 tube(g,color,[[0,.026,-.238],[0,-.062,-.302],[.015,-.091,-.356],[.050,-.031,-.377]],.047);
 return turn(g,.57);
}
function littleDeer(color){
 const g=new THREE.Group();
 oval(g,color,.151,.150,.238,0,-.049,.056,'glaze',30);
 oval(g,color,.088,.123,.110,0,.055,-.112,'glaze',26);
 oval(g,color,.103,.087,.121,0,.153,-.172,'glaze',30);
 oval(g,'#e1c4a3',.071,.046,.070,0,.133,-.253,'satin');
 oval(g,'#735854',.039,.025,.024,0,.141,-.306,'satin');
 for(const x of [-.078,.078]){
  oval(g,'#625851',.016,.021,.019,x,.173,-.238,'satin');
  oval(g,color,.076,.026,.060,x*1.56,.218,-.126,'glaze').rotation.y=Math.sign(x)*.55;
  tube(g,'#b59169',[[x*.65,.209,-.138],[x,.287,-.117],[x*1.16,.362,-.093]],.014,'satin');
  tube(g,'#b59169',[[x,.289,-.117],[x*1.47,.307,-.083],[x*1.62,.337,-.086]],.011,'satin');
  for(const z of [-.066,.171])tube(g,color,[[x,-.082,z],[x,-.165,z],[x,-.234,z+.012]],.034);
  for(const z of [.017,.098,.173])oval(g,'#e0bd9b',.011,.008,.015,x*(1.15+z*1.7),.078,z,'satin');
 }
 return turn(g,.54);
}
function cinemaTicket(color){
 const g=new THREE.Group(),outline=new THREE.Shape();
 outline.moveTo(-.344,-.181);outline.lineTo(.344,-.181);outline.lineTo(.344,-.056);
 outline.quadraticCurveTo(.255,0,.344,.056);outline.lineTo(.344,.181);outline.lineTo(-.344,.181);
 outline.lineTo(-.344,.056);outline.quadraticCurveTo(-.255,0,-.344,-.056);outline.closePath();
 extrudedSurface(g,outline,color,-.022,0,.042,.008,'satin');
 printed(g,.466,.280,0,.030,0,(ctx,size)=>{
  ctx.fillStyle=color;ctx.fillRect(0,0,size,size);
  ctx.fillStyle='#f4dfb6';ctx.fillRect(32,56,448,400);
  ctx.strokeStyle='#f1d7ac';ctx.lineWidth=9;ctx.strokeRect(20,28,472,456);
  ctx.fillStyle='#75564c';ctx.textAlign='center';ctx.font='bold 112px sans-serif';
  printInk(ctx,'电影票',256,246);ctx.font='35px sans-serif';printInk(ctx,'二排 · 06 座',256,349);
 });
 for(const x of [-.253,.253])for(const z of [-.121,-.06,0,.06,.121])oval(g,'#eed8b1',.009,.004,.012,x,.031,z,'satin');
 return turn(g,.29);
}
const craftPlusEntries=new Map(),craftPlusBuilders={};
function craftPlusColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  const kind=prefix+'-'+hue.toLowerCase();
  craftPlusEntries.set(start+index,[[new RegExp(localized+'|^'+english+' '+hue+'$'),kind]]);
  craftPlusBuilders[kind]=()=>build(palette[hue]);
 });
}
craftPlusColors('rolling-pin','Rolling Pin','擀面杖',1822,['Blue','Brown','Green','Pink','Purple'],rollingPin);
craftPlusColors('cooking-spatula','Spatula','锅铲',740,['Blue','Brown','Green','Orange','Pink'],kitchenSpatula);
craftPlusColors('toy-elephant','Elephant','小象',925,['Green','Grey','Orange','Pink','Red','Purple','Yellow','White'],elephant);
craftPlusColors('deer-figurine','Reindeer','小鹿摆件|驯鹿',2036,['Blue','Green','Grey','Pink','Purple','Red','Yellow'],littleDeer);
craftPlusColors('cinema-ticket','Movie Ticket','电影票',1219,['Yellow','Grey','Blue','Green','Pink','Purple','Red'],cinemaTicket);
craftPlusColors('school-backpack','Backpack','书包',264,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],trekkingBag);
craftPlusColors('token-coin-ring','Ring','铜钱戒指',1131,['White','Red','Purple','Pink','Orange','Green','Brown','Blue'],coinRing);
craftPlusColors('colored-toy-engine','Train','玩具火车',143,['Blue','Green','Orange','Pink','Purple','Red'],toyEngine);

function gliderDoll(color){
 const g=new THREE.Group(),wing=new THREE.Shape();
 wing.moveTo(-.047,.014);
 wing.quadraticCurveTo(-.222,.016,-.426,.179);
 wing.quadraticCurveTo(-.384,.291,-.284,.246);
 wing.quadraticCurveTo(-.182,.210,-.047,.069);
 wing.closePath();
 const accent='#'+new THREE.Color(color).lerp(new THREE.Color('#f6dfac'),.34).getHexString();
 for(const side of [-1,1]){
  const panel=extrudedSurface(g,wing,accent,-.013,0,.035,.012,'glaze');
  panel.scale.x=side;
  tube(g,color,[[side*.042,.022,.012],[side*.231,.041,-.100],[side*.424,.024,-.179]],.025,'glaze');
 }
 oval(g,color,.092,.101,.196,0,.017,.029,'glaze',30);
 oval(g,color,.074,.079,.102,0,.054,-.149,'glaze',27);
 const crest=oval(g,accent,.032,.063,.096,0,.106,-.096,'glaze');
 crest.rotation.x=-.42;
 oval(g,'#d9a363',.032,.035,.117,0,.031,-.256,'glaze');
 for(const side of [-1,1])oval(g,'#5c4f47',.014,.018,.017,side*.058,.083,-.209,'satin');
 return turn(g,.43);
}
function dachshund(color){
 const g=new THREE.Group(),light='#'+new THREE.Color(color).lerp(new THREE.Color('#f6d4a6'),.28).getHexString();
 oval(g,color,.260,.113,.120,-.025,-.013,.020,'glaze',34);
 oval(g,color,.118,.137,.100,.193,.043,-.001,'glaze',32);
 oval(g,color,.106,.097,.098,.261,.112,-.006,'glaze',32);
 oval(g,light,.112,.056,.061,.334,.087,-.018,'glaze');
 oval(g,'#69544e',.038,.037,.041,.417,.092,-.018,'satin');
 for(const side of [-1,1]){
  oval(g,light,.073,.104,.028,.199,.063,side*.082,'glaze').rotation.z=-.26;
  oval(g,'#5b4b44',.017,.020,.012,.295,.143,side*.081,'satin');
  for(const x of [-.173,.155])oval(g,color,.052,.073,.047,x,-.120,side*.060,'glaze');
 }
 tube(g,color,[[-.233,.011,.025],[-.324,.058,.027],[-.362,.120,.013]],.024);
 return turn(g,.47);
}
function biscuitCereal(color,label){
 const g=new THREE.Group();
 box(g,color,.478,.219,.661,.038,0,0,0,'satin');
 for(const z of [-.306,.307])box(g,'#e2d0a6',.411,.023,.028,.006,0,.113,z,'satin');
 printed(g,.403,.561,0,.114,0,(c,size)=>{
  c.fillStyle='#f0deb9';c.fillRect(0,0,size,size);
  c.fillStyle=color;c.fillRect(0,327,size,185);
  c.fillStyle='#ddac70';
  c.beginPath();c.ellipse(251,238,154,86,.04,0,tau);c.fill();
  for(const [x,y] of [[153,219],[205,246],[247,205],[287,252],[330,213]]){
   c.strokeStyle='#f3d28b';c.lineWidth=16;c.beginPath();c.arc(x,y,19,0,tau);c.stroke();
  }
  c.fillStyle='#67583c';c.font='bold 65px sans-serif';c.textAlign='center';printInk(c,label,256,144);
 });
 return turn(g,.31);
}
function candyCanister(){
 const g=new THREE.Group();
 const profile=[[0,-.176],[.155,-.177],[.202,-.152],[.231,-.077],[.233,.109],[.190,.178],[.161,.183],[0,.185]].map(([r,y])=>new THREE.Vector2(r,y));
 mesh(g,new THREE.LatheGeometry(profile,44),'#8f8956',0,0,0,'glaze');
 disk(g,'#c59d63',.187,.181,.050,0,.184,0,'metal');
 oval(g,'#bf8c56',.043,.047,.043,0,.234,0,'satin');
 const seal=disk(g,'#e6bd7f',.108,.105,.015,0,.035,-.221,'satin');
 seal.rotation.x=-Math.PI/2;
 for(const [y,width] of [[.096,.085],[.076,.097],[.055,.112]])box(g,'#955d50',width,.009,.015,.003,0,y,-.235,'matte');
 for(const side of [-1,1]){
  const slash=box(g,'#955d50',.009,.068,.015,.003,side*.023,.047,-.235,'matte');
  slash.rotation.z=side*.66;
  box(g,'#955d50',.008,.051,.015,.002,side*.023,-.016,-.235,'matte');
 }
 for(const y of [-.041,-.017,.010])box(g,'#955d50',.052,.008,.015,.002,0,y,-.235,'matte');
 return turn(g,.59);
}
function bellBall(color){
 const g=new THREE.Group();
 oval(g,color,.275,.263,.278,0,0,0,'glaze',40);
 const trim=ring(g,'#d3ad6d',.264,.017,0,.014,0,'metal');
 trim.rotation.x=Math.PI/2;
 const loop=ring(g,'#b99a70',.063,.014,0,.266,0,'metal');
 loop.rotation.y=.34;
 oval(g,'#65564e',.089,.026,.015,0,.051,-.273,'satin');
 for(const x of [-.108,.108])oval(g,'#65564e',.030,.014,.022,x,.050,-.251,'satin');
 return turn(g,.70);
}
function iglooMiniature(color){
 const g=new THREE.Group();
 const shell=mesh(g,new THREE.SphereGeometry(.300,42,22,0,tau,0,Math.PI/2),color,0,-.112,.029,'ice');
 shell.scale.set(1,.88,1);
 disk(g,color,.299,.279,.052,0,-.137,.029,'glaze');
 for(const h of [.27,.55,.79]){
  const r=.303*Math.sqrt(1-h*h);
  const seam=ring(g,'#e4d5b2',r,.0045,0,-.112+h*.266,.029,'satin');
  seam.rotation.x=Math.PI/2;
 }
 box(g,color,.227,.169,.164,.069,0,-.059,-.254,'ice');
 const recess=oval(g,'#657481',.078,.072,.022,0,-.079,-.332,'satin');
 recess.rotation.x=.09;
 return turn(g,.48);
}
function wrappedChocolate(color,white){
 const g=new THREE.Group();
 box(g,color,.408,.105,.692,.023,0,0,.007,'glaze');
 for(const z of [-.317,.321]){
  box(g,'#d8c29a',.402,.053,.073,.011,0,0,z,'metal');
  for(let n=-5;n<=5;n++)box(g,'#bda986',.011,.011,.055,.003,n*.033,.032,z,'satin');
 }
 printed(g,.353,.541,0,.057,0,(c,size)=>{
  c.fillStyle=color;c.fillRect(0,0,size,size);
  c.fillStyle='#eee0bd';c.fillRect(44,95,424,337);
  c.fillStyle=white?'#d6bb8e':'#9d6954';
  for(const x of [135,213,291])for(const y of [177,235])c.fillRect(x,y,72,53);
  c.fillStyle='#674b40';c.textAlign='center';c.font='bold 60px sans-serif';printInk(c,white?'白巧克力':'巧克力',256,381);
 });
 return turn(g,.26);
}
const trinketEntries=new Map(),trinketBuilders={};
function trinketRoute(id,pattern,kind,build){
 const routes=trinketEntries.get(id)??[];
 routes.push([pattern,kind]);
 trinketEntries.set(id,routes);
 trinketBuilders[kind]=build;
}
function trinketColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  trinketRoute(start+index,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 });
}
trinketColors('glider-doll','Pteranodon','翼龙玩偶',1251,['Yellow','White','Red','Purple','Pink','Grey','Green','Blue'],gliderDoll);
trinketColors('sausage-dog','Dachshund','腊肠犬摆件',2607,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],dachshund);
trinketColors('pet-bell-ball','Cat Ball','铃铛球',2356,['Blue','Green','Orange','Pink','Purple','Red','White'],bellBall);
trinketRoute(394,/春字糖果罐/,'spring-candy-canister',candyCanister);
trinketColors('oat-cereal','Cereal','麦片',393,['Brown','Green','Pink','Purple','Red','Yellow'],color=>biscuitCereal(color,color===palette.Green?'青苹果麦片':'香脆麦片'));
trinketRoute(2035,/小冰屋|^Igloo Yellow$/,'igloo-mini-yellow',()=>iglooMiniature(palette.Yellow));
trinketRoute(2029,/小冰屋|^Igloo Blue$/,'igloo-mini-blue',()=>iglooMiniature(palette.Blue));
trinketColors('igloo-mini','Igloo','小冰屋',2031,['Pink','Purple','Red','White'],iglooMiniature);
trinketColors('wrapped-chocolate','Chocolate Bar','巧克力',400,['Blue','Green','Pink','Red','Yellow'],color=>wrappedChocolate(color,false));
trinketColors('wrapped-white-chocolate','Chocolate Bar White','白巧克力',405,['Blue','Green','Pink','Red','Yellow'],color=>wrappedChocolate(color,true));

const numberStrokes=[
 [[[0,3],[-1.55,2.49],[-1.85,.87],[-1.85,-1],[-1.45,-2.49],[0,-3],[1.45,-2.49],[1.85,-1],[1.85,.87],[1.55,2.49],[0,3]]],
 [[[-.93,2.26],[.09,3],[.09,-3]],[[-1.26,-3],[1.30,-3]]],
 [[[-1.77,2.12],[-1.14,2.83],[.15,3],[1.45,2.49],[1.76,1.55],[.85,.27],[-1.80,-2.60],[-1.80,-3],[1.84,-3]]],
 [[[-1.70,2.35],[-.87,3],[.49,3],[1.55,2.44],[1.69,1.40],[.82,.21],[-.34,.16],[.87,.06],[1.72,-1.18],[1.49,-2.32],[.57,-3],[-.59,-3],[-1.65,-2.37]]],
 [[[-1.65,3],[-1.84,-.53],[1.83,-.53]],[[.92,3],[.92,-3]]],
 [[[1.61,3],[-1.58,3],[-1.69,.37],[-.36,.69],[1.16,.34],[1.77,-.78],[1.61,-2.08],[.70,-2.89],[-.62,-3],[-1.68,-2.19]]],
 [[[1.48,2.45],[.47,3],[-.68,2.60],[-1.69,1.11],[-1.85,-1.54],[-1.26,-2.62],[-.16,-3],[1.26,-2.68],[1.77,-1.54],[1.43,-.37],[.41,.11],[-.77,.01],[-1.77,-.94]]],
 [[[-1.85,3],[1.78,3],[1.78,2.64],[-.74,-3]]],
 [[[-.01,.18],[-1.48,.80],[-1.67,1.95],[-.97,2.83],[.15,3],[1.43,2.49],[1.66,1.49],[1.16,.66],[-.01,.18],[-1.58,-.48],[-1.79,-1.70],[-1.10,-2.62],[-.015,-3],[1.12,-2.66],[1.75,-1.73],[1.53,-.54],[-.01,.18]]],
 [[[1.66,1.08],[.72,.19],[-.58,.14],[-1.60,.98],[-1.71,2.07],[-.86,2.87],[.31,3],[1.43,2.46],[1.77,1.40],[1.55,-1.21],[.67,-2.61],[-.50,-3],[-1.43,-2.38]]],
];
function numeralBlock(number,color){
 return letterBlock(numberStrokes[number],color);
}
function blockEraser(){
 const g=new THREE.Group();
 box(g,'#e4b99e',.449,.153,.655,.041,0,0,0,'satin');
 box(g,'#8caa9e',.456,.158,.322,.025,0,0,.093,'satin');
 printed(g,.354,.238,0,.081,.092,(c,size)=>{
  c.fillStyle='#8caa9e';c.fillRect(0,0,size,size);
  c.fillStyle='#f4e5bb';c.fillRect(38,53,436,406);
  c.fillStyle='#617d70';c.textAlign='center';c.font='bold 91px sans-serif';printInk(c,'橡皮',256,294);
 });
 return turn(g,.31);
}
function operaCrown(color){
 const g=new THREE.Group();
 const panel=new THREE.Shape();
 panel.moveTo(-.348,-.076);panel.lineTo(-.306,.188);panel.quadraticCurveTo(-.211,.169,-.168,.270);
 panel.quadraticCurveTo(-.106,.222,0,.336);panel.quadraticCurveTo(.106,.222,.168,.270);
 panel.quadraticCurveTo(.211,.169,.306,.188);panel.lineTo(.348,-.076);panel.quadraticCurveTo(0,-.160,-.348,-.076);panel.closePath();
 extrudedSurface(g,panel,color,-.043,-.041,.076,.020,'glaze');
 const cap=mesh(g,new THREE.SphereGeometry(1,34,20,0,tau,0,Math.PI*.51),color,0,-.023,.017,'glaze');
 cap.scale.set(.268,.124,.223);
 const edge=ring(g,'#d3a87b',.250,.017,0,-.017,.017,'metal');
 edge.rotation.x=Math.PI/2;
 edge.scale.y=.84;
 tube(g,'#c7a170',[[-.342,.045,.104],[-.168,.079,.134],[0,.084,.144],[.168,.079,.134],[.342,.045,.104]],.019,'metal');
 for(const [x,z,r] of [[-.273,-.179,.063],[-.149,-.256,.059],[0,-.335,.081],[.149,-.256,.059],[.273,-.179,.063]]){
  oval(g,x===0?'#dd976b':'#dcbd88',r,.047,r,x,.072,z,'glaze');
  oval(g,'#f0d7a3',r*.40,.018,r*.46,x,.119,z,'satin');
 }
 for(const x of [-.242,-.161,-.081,0,.081,.161,.242])oval(g,color,.023,.031,.032,x,.065,.163,'glaze');
 return turn(g,.33);
}
function matchBook(color){
 const group=new THREE.Group();
 box(group,'#eee0bd',.403,.097,.607,.021,0,-.006,.021,'satin');
 box(group,color,.441,.138,.482,.020,0,.012,-.063,'satin');
 for(const side of [-1,1])box(group,'#a67962',.009,.062,.395,.004,side*.222,.007,-.059,'matte');
 for(let i=-3;i<=3;i++){
  box(group,'#d5b17c',.021,.026,.196,.008,i*.041,.045,.173,'satin');
  oval(group,'#bd7963',.018,.021,.025,i*.041,.060,.257,'matte');
 }
 printed(group,.367,.395,0,.084,-.062,(c,size)=>{
  c.fillStyle=color;c.fillRect(0,0,size,size);
  c.fillStyle='#eac68c';c.fillRect(24,29,464,451);
  c.fillStyle='#583423';c.textAlign='center';c.font='bold 137px sans-serif';printInk(c,'露营',256,219);printInk(c,'火柴',256,378);
 });
 return turn(group,.27);
}
function arcadeCabinet(color){
 const group=new THREE.Group();
 box(group,color,.437,.396,.252,.034,0,-.071,0,'glaze');
 box(group,color,.437,.354,.171,.037,0,.202,.018,'glaze');
 box(group,'#514957',.348,.222,.030,.015,0,.246,-.073,'satin');
 box(group,'#81a6a5',.294,.169,.026,.014,0,.252,-.091,'ice');
 for(const [x,y] of [[-.065,.238],[.042,.263],[.082,.285]])box(group,'#dfc893',.035,.017,.007,.003,x,y,-.108,'glaze');
 box(group,'#c6a479',.411,.087,.168,.025,0,.070,-.126,'satin');
 disk(group,'#8f786f',.018,.018,.070,-.098,.145,-.138,'metal');
 oval(group,'#d69b69',.039,.035,.036,-.098,.177,-.138);
 for(const x of [.048,.115])disk(group,'#76a091',.027,.028,.025,x,.125,-.143);
 box(group,'#dfb992',.332,.072,.033,.015,0,.404,-.005,'glaze');
 return turn(group,.71);
}
function ufo(color){
 const g=new THREE.Group();
 oval(g,color,.338,.117,.312,0,-.029,0,'glaze',40);
 oval(g,'#a6c4c1',.170,.126,.162,0,.080,0,'ice',38);
 ring(g,'#dcbd85',.296,.025,0,.003,0,'metal').rotation.x=Math.PI/2;
 for(let i=0;i<8;i++){
  const angle=i*tau/8;
  oval(g,'#eed4a1',.030,.021,.029,.284*Math.sin(angle),.058,.277*Math.cos(angle),'glaze');
 }
 for(const x of [-.151,.151])oval(g,color,.068,.037,.070,x,-.136,.070,'glaze');
 return turn(g,.44);
}
function windupRobot(color){
 const g=new THREE.Group();
 box(g,color,.349,.202,.330,.054,0,0,.036);
 box(g,color,.321,.203,.208,.058,0,.014,-.247);
 box(g,'#e1bc86',.243,.020,.119,.022,0,.122,-.251,'satin');
 for(const x of [-.071,.071])oval(g,'#625d64',.028,.014,.027,x,.138,-.252,'glaze');
 box(g,'#92ac9e',.213,.018,.146,.033,0,.110,.021,'ice');
 for(const x of [-.223,.223]){
  disk(g,'#a88d73',.062,.060,.083,x,.005,-.039,'metal').rotation.z=Math.PI/2;
  box(g,color,.107,.157,.193,.040,x,-.007,.050);
 }
 for(const x of [-.092,.092])box(g,'#ac8b70',.136,.168,.142,.046,x,-.004,.251,'satin');
 tube(g,'#ac9880',[[.166,.015,.102],[.227,.015,.133],[.280,.018,.130]],.013,'metal');
 for(const x of [.271,.316])ring(g,'#d2b583',.037,.013,x,.021,.122,'metal').rotation.x=Math.PI/2;
 return turn(g,.36);
}
function countertopOven(color){
 const g=new THREE.Group();
 box(g,color,.632,.402,.358,.045,0,0,0);
 box(g,'#817674',.481,.276,.039,.034,-.035,-.016,-.183,'satin');
 box(g,'#a8b3ae',.402,.224,.017,.027,-.035,-.016,-.208,'ice');
 box(g,'#ddbd8e',.360,.034,.043,.014,-.035,.098,-.231,'metal');
 for(const y of [-.080,.052]){
  const button=disk(g,'#d3b98e',.032,.032,.026,.252,y,-.203,'metal');
  button.rotation.x=-Math.PI/2;
 }
 for(const x of [-.235,.235])box(g,'#827468',.085,.043,.268,.015,x,-.214,0,'satin');
 return turn(g,.72);
}
function toyPlane(color){
 const g=new THREE.Group();
 oval(g,color,.098,.103,.340,0,0,0,'glaze',34);
 const wing=new THREE.Shape();
 wing.moveTo(-.073,-.109);wing.lineTo(-.384,-.189);wing.quadraticCurveTo(-.418,-.072,-.331,-.029);
 wing.lineTo(-.071,.082);wing.lineTo(.071,.082);wing.lineTo(.331,-.029);wing.quadraticCurveTo(.418,-.072,.384,-.189);
 wing.lineTo(.073,-.109);wing.closePath();
 extrudedSurface(g,wing,color,-.014,.019,.042,.016,'glaze');
 oval(g,'#8cbbb9',.070,.060,.104,0,.078,-.076,'ice');
 box(g,'#e2b583',.216,.038,.073,.017,0,.013,.229);
 box(g,color,.033,.126,.112,.018,0,.064,.248);
 const propeller=box(g,'#d6bd92',.228,.023,.047,.012,0,.003,-.333,'metal');
 propeller.rotation.z=.32;
 oval(g,'#d99561',.044,.045,.042,0,.003,-.344,'glaze');
 return turn(g,.36);
}
function targetBoard(){
 const g=new THREE.Group();
 disk(g,'#b99368',.334,.316,.113,0,0,0,'satin');
 const shades=['#546e78','#ead5ab','#b97869','#e7bd7d','#648882','#d18865'];
 shades.forEach((color,i)=>disk(g,color,.306-i*.046,.306-i*.046,.009,0,.061+i*.004,0,'glaze'));
 ring(g,'#dbc396',.314,.015,0,.051,0,'metal').rotation.x=Math.PI/2;
 for(let i=0;i<10;i++){
  const a=i*tau/10;
  oval(g,'#e4cba6',.010,.007,.013,.282*Math.sin(a),.068,.282*Math.cos(a),'satin');
 }
 return turn(g,.41);
}
const nostalgiaEntries=new Map(),nostalgiaBuilders={};
function nostalgiaRoute(id,pattern,kind,build){
 const routes=nostalgiaEntries.get(id)??[];
 routes.push([pattern,kind]);
 nostalgiaEntries.set(id,routes);
 nostalgiaBuilders[kind]=build;
}
function nostalgiaColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  const buildColor=hue==='Colorful'?'#b47766':palette[hue];
  nostalgiaRoute(start+index,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(buildColor));
 });
}
nostalgiaRoute(5,/橡皮/,'block-eraser',blockEraser);
numberStrokes.forEach((_,n)=>{
 const pattern=new RegExp('^(?:(?:.色)?数字\\s*'+n+'|Number'+n+(n===0?'|数字零':'')+')$');
 nostalgiaRoute(3+n,pattern,'numeral-block-'+n,()=>numeralBlock(n,letterColors[n+3]));
});
nostalgiaColors('opera-crown','Crown','戏曲头冠',1107,['Red','Purple','Pink','Grey','Green','Colorful','Blue'],operaCrown);
nostalgiaColors('camp-matchbox','Camping Match','露营火柴|火柴盒',1434,['Grey','Blue','Brown','Colorful','Green','Purple','Red','Yellow'],matchBook);
nostalgiaColors('mini-arcade','Arcade Machine','街机',1470,['Blue','Green','Orange','Pink','Purple','Red','White'],arcadeCabinet);
nostalgiaColors('ufo-doll','Ufo','飞碟',150,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],ufo);
nostalgiaColors('windup-robot','Robot','发条机器人',876,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],windupRobot);
nostalgiaColors('countertop-oven','Oven','小烤箱',716,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],countertopOven);
nostalgiaColors('toy-plane','Plane','玩具飞机',116,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],toyPlane);
nostalgiaRoute(559,/靶盘|^Dart Board$/,'target-board',targetBoard);

function cityTaxi(){
 const group=roadCar('#deac5b');
 box(group,'#f1d796',.207,.077,.101,.022,0,.213,-.015);
 box(group,'#a2835f',.124,.015,.046,.006,0,.255,-.018,'satin');
 for(const x of [-.203,.203])for(let i=0;i<6;i++){
  box(group,i%2?'#79635a':'#f2d7a8',.011,.031,.036,.003,x,.025,.040+(i-2.5)*.033,'satin');
 }
 return group;
}
function gardenCart(color){
 const g=new THREE.Group();
 const body=new THREE.Shape();
 body.moveTo(-.175,-.231);body.quadraticCurveTo(-.226,.045,-.250,.221);
 body.quadraticCurveTo(0,.316,.250,.221);body.quadraticCurveTo(.226,.045,.175,-.231);body.closePath();
 const interior=new THREE.Shape();
 interior.moveTo(-.139,-.182);interior.quadraticCurveTo(-.181,.044,-.197,.201);
 interior.quadraticCurveTo(0,.266,.197,.201);interior.quadraticCurveTo(.181,.044,.139,-.182);interior.closePath();
 extrudedSurface(g,body,color,-.015,-.089,.098,.024,'glaze');
 extrudedSurface(g,interior,'#'+new THREE.Color(color).lerp(new THREE.Color('#514244'),.26).getHexString(),.083,-.089,.012,.009,'satin');
 for(const x of [-.141,.141]){
  tube(g,'#a48768',[[x,-.074,-.308],[x,-.067,-.092],[x*1.1,-.054,.180],[x*1.27,-.018,.415]],.025,'metal');
  tube(g,'#a38365',[[x,-.018,.302],[x*1.18,-.015,.360],[x*1.27,-.011,.433]],.033,'satin');
  tube(g,'#ad9575',[[x,-.028,.066],[x,-.151,.112],[x,-.151,.180]],.017,'metal');
 }
 disk(g,'#655b57',.110,.110,.076,0,-.089,-.343,'satin').rotation.z=Math.PI/2;
 disk(g,'#ccc098',.061,.061,.083,0,-.089,-.343,'metal').rotation.z=Math.PI/2;
 return turn(g,.47);
}
function luckyCat(color){
 const g=new THREE.Group();
 oval(g,color,.188,.216,.158,0,-.070,.018,'glaze',34);
 oval(g,color,.183,.155,.149,0,.158,.017,'glaze',34);
 oval(g,'#ebd4aa',.116,.130,.027,0,-.080,.159,'glaze');
 for(const x of [-.113,.113]){
  const ear=mesh(g,new THREE.ConeGeometry(.076,.128,28),color,x,.264,.040,'glaze');
  ear.rotation.z=x*3.2;
  oval(g,'#d59d90',.036,.036,.022,x,.270,.094,'satin');
  tube(g,'#695451',[[x*.96,.165,.149],[x*.75,.177,.169],[x*.49,.162,.158]],.009,'satin');
  oval(g,'#eabf9d',.040,.021,.047,x*.92,-.233,.050,'glaze');
  for(const y of [.116,.095])tube(g,'#9c7164',[[x*.83,y,.159],[x*1.29,y+.007,.112]],.004,'satin');
 }
 oval(g,'#be8275',.023,.015,.014,0,.130,.166,'satin');
 oval(g,color,.061,.129,.064,.205,.131,.031,'glaze').rotation.z=-.32;
 const coin=disk(g,'#d5a96d',.076,.074,.027,-.063,-.064,.186,'metal');
 coin.rotation.x=Math.PI/2;
 box(g,'#836e55',.031,.031,.004,.006,-.063,-.064,.201,'satin');
 return turn(g,.34);
}
function stapler(color){
 const g=new THREE.Group();
 box(g,'#837b73',.195,.058,.672,.022,0,-.078,0,'satin');
 box(g,'#b7aca1',.150,.046,.411,.014,0,-.030,-.047,'metal');
 box(g,color,.206,.126,.638,.042,0,.061,.015).rotation.x=-.12;
 box(g,color,.207,.093,.115,.030,0,-.045,.263);
 const rivet=disk(g,'#dbbf93',.029,.030,.222,0,-.012,.241,'metal');
 rivet.rotation.z=Math.PI/2;
 box(g,'#b09579',.078,.007,.069,.006,0,-.045,-.259,'metal');
 return turn(g,.33);
}
function flipFlop(color,hue){
 const g=new THREE.Group(),sole=new THREE.Shape();
 sole.moveTo(-.102,-.330);sole.bezierCurveTo(-.201,-.238,-.174,-.069,-.164,.009);
 sole.bezierCurveTo(-.240,.233,-.137,.343,.055,.354);sole.bezierCurveTo(.267,.349,.225,.162,.149,.014);
 sole.bezierCurveTo(.137,-.094,.154,-.214,.102,-.330);sole.quadraticCurveTo(0,-.388,-.102,-.330);sole.closePath();
 extrudedSurface(g,sole,'#ccaf8b',-.081,0,.047,.013,'satin');
 extrudedSurface(g,sole,color,-.028,0,.059,.012,'satin');
 const strap=hue==='Colorful'?'#a9758d':'#'+new THREE.Color(color).lerp(new THREE.Color('#fae0ae'),.43).getHexString();
 for(const side of [-1,1])tube(g,strap,[[side*.152,.056,-.005],[side*.101,.133,-.078],[.025,.118,-.206],[.025,.064,-.217]],.020,'glaze');
 for(let i=0;i<5;i++)box(g,'#dcbf99',.119,.005,.009,.002,-.019,.034,.120+i*.028,'satin');
 return turn(g,.31);
}
function cricketBat(){
 const g=new THREE.Group(),blade=new THREE.Shape();
 blade.moveTo(-.095,-.278);blade.lineTo(-.100,.220);blade.quadraticCurveTo(-.100,.313,0,.326);
 blade.quadraticCurveTo(.104,.295,.100,.226);blade.lineTo(.093,-.278);blade.closePath();
 extrudedSurface(g,blade,'#cc9e68',-.038,0,.078,.012,'satin');
 tube(g,'#b69365',[[0,-.005,.235],[0,.008,.348],[0,.005,.449]],.034,'satin');
 for(let n=0;n<7;n++)box(g,'#678985',.069,.064,.014,.004,0,.003,.324+n*.019,'satin');
 for(const x of [-.059,.042])tube(g,'#d9af79',[[x,.045,-.231],[x+.006,.045,-.024],[x-.009,.044,.167]],.0023,'matte');
 return turn(g,.36);
}
function chocolateCake(){
 const g=new THREE.Group();
 for(const [y,color] of [[-.124,'#9b6d56'],[-.041,'#d0a179'],[.046,'#ae795d']])disk(g,color,.265,.257,.093,0,y,0,'satin');
 oval(g,'#93664f',.270,.060,.264,0,.113,0,'glaze',38);
 for(let i=0;i<9;i++){
  const a=i*tau/9,x=.193*Math.sin(a),z=.193*Math.cos(a);
  oval(g,'#d7ac80',.035,.035,.032,x,.157,z,'satin');
 }
 for(const [x,z] of [[-.058,.018],[.050,-.042]])box(g,'#765349',.069,.076,.022,.008,x,.174,z,'satin').rotation.z=.38;
 return turn(g,.56);
}
const outingsEntries=new Map(),outingsBuilders={};
function outingsRoute(id,pattern,kind,build){
 outingsEntries.set(id,[[pattern,kind]]);
 outingsBuilders[kind]=build;
}
function outingsColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  const variantColor={Colorful:'#d2a16f',Black:'#665c64'}[hue]??palette[hue];
  outingsRoute(start+index,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(variantColor,hue));
 });
}
outingsRoute(65,/出租车|^Auto Taxi$/,'city-taxi',cityTaxi);
outingsRoute(837,/红边杯/,'red-rim-mug',()=>{
 const cup=glazedMug('#eeddbc');
 ring(cup,'#b56f61',.221,.013,0,.187,0).rotation.x=Math.PI/2;
 return cup;
});
outingsRoute(549,/板球棒|^Cricket Bat$/,'wood-cricket-bat',cricketBat);
outingsRoute(371,/巧克力.*蛋糕|^Cake Brown$/,'chocolate-layer-cake',chocolateCake);
outingsColors('garden-cart','Wheelbarrow','独轮小推车',1652,['Blue','Brown','Green','Grey','Orange','Purple','Yellow'],gardenCart);
outingsColors('cinema-glasses','Movie Glass','立体眼镜',1188,['Blue','Green','Orange','Pink','Purple','White','Yellow'],stereoGlasses);
outingsColors('lucky-cat','Maneki','招财猫',1370,['Blue','Green','Grey','Orange','Pink','Purple','Yellow'],luckyCat);
outingsColors('desk-stapler','Stapler','订书机',2845,['Blue','Green','Orange','Pink','Purple','Red'],stapler);
outingsColors('beach-flip-flop','Flip Flop','夹脚拖鞋',1330,['Red','Colorful','Purple','Pink','Orange','Green','Blue','Black'],flipFlop);
outingsColors('color-flying-disc','Flying Disc','飞盘',570,['Blue','Green','Orange','Purple','Red','Yellow'],flyingDisc);

function astronaut(color){
 const g=new THREE.Group();
 oval(g,color,.168,.097,.188,0,0,.053,'satin',30);
 oval(g,color,.174,.132,.168,0,.040,-.182,'glaze',34);
 oval(g,'#728d9d',.134,.042,.111,0,.146,-.201,'ice',32);
 box(g,'#cabca0',.200,.022,.127,.033,0,.099,.019,'metal');
 for(const x of [-.217,.217]){
  oval(g,color,.073,.070,.142,x,.001,-.027,'satin').rotation.y=x*1.34;
  oval(g,'#ead3ac',.060,.058,.052,x*1.12,.014,.107,'glaze');
  tube(g,color,[[x*.38,.011,.154],[x*.49,-.014,.250],[x*.59,-.025,.320]],.058,'satin');
  oval(g,'#dec9aa',.071,.052,.075,x*.59,-.020,.351,'glaze');
 }
 for(const x of [-.054,0,.054])disk(g,x?'#c68d72':'#9bab84',.017,.017,.014,x,.119,.037);
 return turn(g,.39);
}
function snorkel(color){
 const g=new THREE.Group();
 tube(g,color,[[-.068,-.001,-.352],[-.087,-.001,-.211],[-.077,.012,.061],[-.058,.019,.237],[.045,.026,.313],[.168,.029,.257]],.048,'glaze');
 tube(g,'#458e91',[[-.077,.012,.061],[-.058,.019,.237],[.045,.026,.313],[.168,.029,.257]],.051,'satin');
 tube(g,'#285e66',[[.170,.029,.258],[.211,.035,.199],[.202,.037,.128]],.038,'satin');
 box(g,'#ab9d8c',.140,.078,.044,.018,.193,.040,.122,'satin').rotation.y=.18;
 for(const z of [-.24,-.17,-.10]){
   const grip=disk(g,'#287984',.049,.049,.030,-.082,0,z,'satin');
   grip.rotation.x=Math.PI/2;
 }
 const tip=disk(g,'#d5a176',.050,.048,.106,-.071,0,-.307);
 tip.rotation.x=Math.PI/2;
 disk(g,'#766d64',.026,.027,.008,-.070,0,-.363,'satin').rotation.x=Math.PI/2;
 return turn(g,.88);
}
function toyPickup(color){
 const g=new THREE.Group();
 box(g,color,.401,.140,.755,.047,0,-.028,0);
 for(const x of [-.203,.203]){
  for(const z of [-.224,.241]){
   disk(g,'#6a5954',.094,.095,.081,x,-.081,z,'satin').rotation.z=Math.PI/2;
   disk(g,'#d2b88e',.045,.046,.088,x,-.081,z,'metal').rotation.z=Math.PI/2;
  }
  box(g,color,.055,.091,.298,.025,x*.87,.066,.202);
  oval(g,'#f4d4a0',.046,.026,.017,x*.63,.037,-.373);
 }
 box(g,color,.394,.093,.064,.021,0,.061,.335);
 box(g,'#b29b77',.269,.019,.258,.012,0,.049,.213,'satin');
 for(const x of [-.075,0,.075])box(g,'#d1b587',.009,.007,.226,.002,x,.061,.207,'satin');
 box(g,'#86a3a2',.316,.163,.248,.049,0,.084,-.096,'ice');
 box(g,color,.347,.046,.225,.021,0,.165,-.081);
 return turn(g,.56);
}
function dumbbell(color){
 const g=new THREE.Group();
 const handle=disk(g,'#aea69a',.049,.049,.415,0,0,0,'metal');
 handle.rotation.x=Math.PI/2;
 for(const z of [-.228,.228]){
  const weight=disk(g,color,.135,.135,.135,0,0,z,'satin');
  weight.rotation.x=Math.PI/2;
  ring(g,'#c2ac86',.101,.009,0,0,z+Math.sign(z)*.069,'glaze');
  disk(g,'#8b786c',.051,.051,.149,0,0,z,'metal').rotation.x=Math.PI/2;
 }
 for(let n=0;n<6;n++)ring(g,'#c8b69a',.048,.003,0,0,(n-2.5)*.034,'metal');
 return turn(g,.35);
}
function microphone(color){
 const g=new THREE.Group();
 const grip=disk(g,color,.061,.082,.426,0,0,.112,'glaze');
 grip.rotation.x=-Math.PI/2;
 oval(g,'#a1a3a0',.130,.129,.144,0,.004,-.211,'metal',34);
 for(const y of [-.062,-.031,0,.031,.062]){
  const radius=.131*Math.sqrt(1-(y/.135)**2);
  ring(g,'#c7b9a8',radius,.0037,0,y,-.211,'metal').rotation.x=Math.PI/2;
 }
 box(g,'#d1ae7f',.040,.013,.079,.012,0,.070,.021,'satin');
 return turn(g,.32);
}
function sodaCan(color){
 const g=new THREE.Group();
 const profile=[[0,-.299],[.139,-.300],[.177,-.277],[.185,-.240],[.185,.219],[.167,.273],[.146,.290],[0,.290]].map(([r,y])=>new THREE.Vector2(r,y));
 const label=document.createElement('canvas');
 label.width=512;label.height=256;
 const c=label.getContext('2d');
 c.fillStyle=color;c.fillRect(0,0,512,256);
 for(const x of [24,280,536]){
  c.fillStyle='#e9d3a6';c.beginPath();c.ellipse(x,117,61,69,0,0,tau);c.fill();
  c.fillStyle='#503826';c.textAlign='center';c.font='bold 50px sans-serif';printInk(c,'汽水',x,124);
  for(const [ox,oy,r] of [[63,159,8],[198,55,11],[184,89,7]]){c.beginPath();c.arc(x+ox-124,oy,r,0,tau);c.fill();}
 }
 const map=new THREE.CanvasTexture(label);
 map.colorSpace=THREE.SRGBColorSpace;
 mesh(g,new THREE.LatheGeometry(profile,44),color).material=new THREE.MeshPhysicalMaterial({map,roughness:.32,clearcoat:.67,clearcoatRoughness:.18});
 disk(g,'#c3b7a0',.145,.149,.019,0,.296,0,'metal');
 for(const [r,y] of [[.152,.296],[.162,-.278]])ring(g,'#d5c7aa',r,.010,0,y,0,'metal').rotation.x=Math.PI/2;
 ring(g,'#a99578',.037,.010,.014,.312,-.021,'metal').rotation.x=Math.PI/2;
 return turn(g,.89);
}
function gramophone(color){
 const g=new THREE.Group();
 box(g,color,.510,.144,.483,.053,0,-.078,.098);
 disk(g,'#675753',.180,.180,.040,0,.012,.107,'satin');
 disk(g,'#e2bb88',.062,.062,.012,0,.037,.107,'satin');
 tube(g,'#b49976',[[.169,-.001,.157],[.194,.064,.085],[.087,.084,.050]],.013,'metal');
 const section=[[.028,-.153],[.041,-.109],[.063,-.042],[.110,.031],[.172,.076],[.186,.099],[.174,.114],[.154,.100],[.104,.048],[.057,-.027],[.037,-.104],[.027,-.151]].map(([r,y])=>new THREE.Vector2(r,y));
 const horn=mesh(g,new THREE.LatheGeometry(section,44),'#d8b184',-.122,.164,-.119,'metal');
 horn.rotation.set(-.77,0,.34);
 return turn(g,.47);
}
function stripedLounger(color){
 const g=lounger(color);
 const fabrics=['#7f9e9d','#ddba79','#b88187','#efe0af','#93a877'];
 for(const [i,fabric] of fabrics.entries()){
  const x=(i-2)*.057;
  box(g,fabric,.056,.008,.433,.004,x,.100,.171,'satin').rotation.x=.05;
  box(g,fabric,.056,.008,.357,.004,x,.205,-.245,'satin').rotation.x=.56;
 }
 return g;
}
const weekendEntries=new Map(),weekendBuilders={};
function weekendColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  const color={Black:'#645a5b',Colorful:'#d4aa74'}[hue]??palette[hue];
  const kind=prefix+'-'+hue.toLowerCase();
  weekendEntries.set(start+index,[[new RegExp(localized+'|^'+english+' '+hue+'$'),kind]]);
  weekendBuilders[kind]=()=>build(color);
 });
}
weekendColors('astronaut-figure','Astronaut','宇航员',1018,['Yellow','Red','Purple','Pink','Grey','Orange','Green','Blue'],astronaut);
weekendColors('snorkel','Snorkel','呼吸管',1281,['White','Red','Purple','Pink','Orange'],snorkel);
weekendColors('snorkel','Snorkel','呼吸管',1287,['Blue','Black'],snorkel);
weekendColors('striped-sunbed','Sunbed','沙滩躺椅',1292,['Colorful'],stripedLounger);
weekendColors('toy-pickup','Pickup','玩具皮卡',2014,['Green','Grey','Orange','Purple','Pink','Red','Yellow'],toyPickup);
weekendColors('rubber-dumbbell','Dumbbell','哑铃',560,['Black','Blue','Green','Orange','Pink','Purple','Red','White'],dumbbell);
weekendColors('microphone','Microphone','麦克风',214,['Blue','Green','Orange','Purple','Red'],microphone);
weekendColors('soda-can','Can','汽水罐',640,['Blue','Green','Orange','Red','Yellow'],sodaCan);
weekendColors('gramophone','Gramophone','留声机',1504,['Blue','Green','Pink','Purple','Red','White','Yellow'],gramophone);

function buildingBrick(color){
 const g=new THREE.Group();
 box(g,color,.519,.218,.342,.029,0,-.024,0);
 for(const x of [-.167,0,.167])for(const z of [-.081,.081]){
  disk(g,color,.052,.059,.046,x,.109,z);
  ring(g,'#'+new THREE.Color(color).lerp(new THREE.Color('#f0d0a0'),.23).getHexString(),.037,.0034,x,.134,z,'satin').rotation.x=Math.PI/2;
 }
 for(const x of [-.13,.13])ring(g,color,.079,.012,x,-.135,0).rotation.x=Math.PI/2;
 return turn(g,.32);
}
function seaTurtle(color){
 const g=new THREE.Group();
 oval(g,color,.231,.153,.269,0,.018,.019,'glaze',34);
 oval(g,'#c9b28a',.216,.049,.251,0,-.084,.021,'satin',32);
 for(let n=0;n<6;n++){
  const a=n*tau/6;
  oval(g,'#'+new THREE.Color(color).lerp(new THREE.Color('#f4dbad'),.33).getHexString(),.072,.013,.065,.123*Math.sin(a),.135,.022+.148*Math.cos(a),'glaze').rotation.y=a;
 }
 oval(g,color,.085,.079,.095,0,-.023,.291,'glaze');
 for(const side of [-1,1]){
  oval(g,'#655451',.017,.018,.013,side*.058,.012,.352,'satin');
  oval(g,color,.095,.039,.157,side*.23,-.063,.142).rotation.y=side*.73;
  oval(g,color,.081,.042,.105,side*.177,-.058,-.188).rotation.y=-side*.62;
 }
 return turn(g,.40);
}
function roundedBiscuit(color){
 const g=new THREE.Group(),biscuit=box(g,color,.574,.135,.406,.068,0,-.002,0,'satin');
 const base=biscuit.geometry.attributes.position;
 const colors=[];
 const old=new THREE.Color(color),highlight=new THREE.Color('#e9be89');
 for(let i=0;i<base.count;i++){
  const speck=(Math.sin(base.getX(i)*1765+base.getZ(i)*651)+1)*.08;
  colors.push(...old.clone().lerp(highlight,speck+Math.max(0,base.getY(i))*.97).toArray());
 }
 biscuit.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 biscuit.material=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.68,clearcoat:.11});
 const waferShade='#'+old.clone().lerp(new THREE.Color('#a77d53'),.66).getHexString();
 for(const x of [-.183,-.092,0,.092,.183])for(const z of [-.102,0,.102]){
  oval(g,waferShade,.012,.006,.014,x,.069,z,'matte',12);
 }
 return turn(g,.39);
}
function pufferfish(color){
 const g=new THREE.Group();
 oval(g,color,.218,.178,.214,0,.012,.015,'glaze',36);
 oval(g,'#e4c89e',.153,.092,.148,0,-.103,.082,'glaze',28);
 for(let i=0;i<16;i++){
  const angle=i*tau/16;
  const q=oval(g,color,.028,.036,.033,.211*Math.sin(angle),.061,.015+.208*Math.cos(angle),'glaze',16);
  q.rotation.x=angle;
 }
 for(const x of [-.103,.103]){
  oval(g,'#e8d3a6',.046,.048,.038,x,.088,.193,'glaze');
  oval(g,'#644e46',.022,.024,.018,x,.090,.226,'satin');
 }
 ring(g,'#b68362',.043,.012,0,.016,.229);
 const tail=new THREE.Shape();
 tail.moveTo(-.031,.211);tail.lineTo(-.122,.323);tail.quadraticCurveTo(0,.359,.122,.323);
 tail.lineTo(.031,.211);tail.closePath();
 extrudedSurface(g,tail,color,-.017,0,.040,.012,'glaze');
 return turn(g,.45);
}
function jellyfish(color){
 const g=new THREE.Group(),shade='#'+new THREE.Color(color).lerp(new THREE.Color('#eadab7'),.38).getHexString();
 oval(g,color,.252,.132,.223,0,0,.005,'ice',40);
 const rim=ring(g,color,.200,.027,0,-.047,.006,'glaze');
 rim.rotation.x=Math.PI/2;
 rim.scale.y=.86;
 for(let i=0;i<7;i++){
  const a=i*tau/7,x=.145*Math.sin(a),z=.120*Math.cos(a);
  tube(g,i%2?shade:color,[[x,-.052,z],[x*1.12,-.139,z*1.18],[x*.75+.035,-.217,z*.65],[x*1.25,-.263,z*1.21]],.021,'ice');
 }
 for(const x of [-.064,.064])oval(g,'#746562',.015,.017,.012,x,.052,.208,'satin');
 return turn(g,.45);
}
function soapBar(color){
 const g=new THREE.Group();
 box(g,color,.567,.170,.396,.079,0,0,0,'ice');
 const inset=ring(g,'#e3cdb8',.131,.006,0,.086,0,'glaze');
 inset.rotation.x=Math.PI/2;
 inset.scale.x=1.54;
 for(const x of [-.092,-.044,.001,.046,.090]){
  tube(g,'#d7c4b5',[[x-.023,.086,.029],[x,.090,.004],[x+.019,.087,-.031]],.0043,'satin');
 }
 return turn(g,.31);
}
function eighthNote(color){
 const g=new THREE.Group();
 const head=oval(g,color,.147,.063,.115,-.059,0,.182,'glaze',30);
 head.rotation.y=.37;
 tube(g,color,[[.058,0,.172],[.067,0,-.053],[.066,0,-.312]],.047);
 tube(g,color,[[.062,0,-.313],[.160,0,-.279],[.211,0,-.207],[.201,0,-.117]],.044);
 oval(g,'#f4cb81',.096,.031,.074,-.059,.060,.182,'metal');
 return turn(g,1.02);
}
function patrolCar(){
 const g=roadCar('#ded5c6');
 for(const x of [-.206,.206])box(g,'#688fa9',.015,.037,.540,.007,x,.025,-.019,'glaze');
 box(g,'#cfc4ba',.241,.041,.079,.013,0,.203,.010,'metal');
 box(g,'#c67d70',.091,.037,.068,.011,-.057,.237,.010,'glaze');
 box(g,'#759faf',.091,.037,.068,.011,.057,.237,.010,'glaze');
 return g;
}
const seaCollectionEntries=new Map(),seaCollectionBuilders={};
function seaCollectionRoute(id,pattern,kind,build){
 seaCollectionEntries.set(id,[[pattern,kind]]);
 seaCollectionBuilders[kind]=build;
}
function seaCollectionColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  seaCollectionRoute(start+index,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue]??'#655b5e'));
 });
}
seaCollectionColors('building-brick','Building Brick','积木',805,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],buildingBrick);
seaCollectionColors('ceramic-turtle','Sea Turtle','海龟玩偶',1580,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],seaTurtle);
seaCollectionColors('tea-biscuit','Biscuit','圆角饼干',1869,['Black','Brown','White'],roundedBiscuit);
seaCollectionColors('puffer-doll','Pufferfish','河豚玩偶',1558,['Blue','Green','Pink','Purple','Red','Yellow'],pufferfish);
seaCollectionColors('jellyfish-doll','Jellyfish','水母玩偶',1551,['Green','Orange','Pink','Purple','Red','White','Yellow'],jellyfish);
seaCollectionColors('molded-soap','Soap','香皂|薰衣草皂',2248,['Pink','Purple','Red'],soapBar);
seaCollectionColors('eighth-note','Single Bar Note','音符',226,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],eighthNote);
seaCollectionRoute(64,/巡逻车|^Auto Police$/,'city-patrol-car',patrolCar);

function tabletopStove(color){
 const g=new THREE.Group();
 box(g,color,.650,.157,.422,.037,0,-.007,0);
 box(g,'#a59b87',.446,.018,.347,.021,-.072,.081,0,'metal');
 for(const y of [.090,.112]){
  const burner=ring(g,'#69625e',y>.1?.084:.119,.017,-.069,y,0,'metal');burner.rotation.x=Math.PI/2;
 }
 for(let i=0;i<4;i++){
  const a=(i+.5)*tau/4;
  const grate=box(g,'#665d58',.032,.031,.112,.011,-.069+.129*Math.sin(a),.117,.129*Math.cos(a),'satin');
  grate.rotation.y=a;
 }
 box(g,color,.090,.042,.365,.016,.248,.091,0);
 disk(g,'#ba9e79',.046,.044,.032,.243,.112,.117,'metal');
 oval(g,'#77736b',.025,.013,.045,.245,.131,.120,'satin');
 return turn(g,.37);
}
function octopusToy(color){
 const g=new THREE.Group(),tip='#'+new THREE.Color(color).lerp(new THREE.Color('#fadcb1'),.30).getHexString();
 oval(g,color,.218,.160,.207,0,.037,.010,'glaze',36);
 for(let i=0;i<8;i++){
  const a=i*tau/8,x=Math.sin(a),z=Math.cos(a);
  tube(g,color,[[.128*x,-.052,.128*z],[.209*x,-.072,.220*z],[.285*x,-.043,.302*z],[.314*x+.014,.006,.323*z]],.041);
  oval(g,tip,.031,.017,.034,.241*x,-.020,.248*z,'glaze');
 }
 for(const x of [-.075,.075]){
  oval(g,'#54454a',.023,.020,.013,x,.072,.199,'satin');
  oval(g,'#efdcbb',.006,.006,.005,x-.004,.079,.210,'glaze');
 }
 tube(g,'#916d62',[[-.026,.026,.211],[0,.012,.218],[.026,.026,.211]],.005,'satin');
 return turn(g,.44);
}
function playDart(color){
 const g=new THREE.Group();
 const shaft=disk(g,'#bcab94',.017,.025,.423,0,-.004,.007,'metal');
 shaft.rotation.x=Math.PI/2;
 const tip=oval(g,'#8f8985',.027,.027,.070,0,-.003,-.231,'satin');
 tip.rotation.z=.04;
 const flight=new THREE.Shape();
 flight.moveTo(0,-.293);flight.lineTo(-.125,-.278);flight.lineTo(-.121,-.187);flight.lineTo(0,-.041);
 flight.lineTo(.121,-.187);flight.lineTo(.125,-.278);flight.closePath();
 extrudedSurface(g,flight,color,-.008,0,.016,.007,'satin');
 const second=extrudedSurface(g,flight,color,-.008,0,.016,.007,'glaze');
 second.rotation.z=Math.PI/2;
 for(let i=0;i<5;i++)ring(g,'#d9be97',.025,.003,0,-.005,-.061+i*.018,'metal');
 return turn(g,.35);
}
function colorEgg(color){
 const g=new THREE.Group();
 const body=oval(g,color,.226,.261,.182,0,0,0,'glaze',36);
 const p=body.geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const taper=1-p.getY(i)*.14;
  p.setX(i,p.getX(i)*taper);p.setZ(i,p.getZ(i)*taper);
 }
 body.geometry.computeVertexNormals();
 if(color==='#ab8866'){
  for(const [x,y,z] of [[-.108,.177,.084],[.087,.155,.119],[.141,-.054,.139],[-.159,-.079,.105]])oval(g,'#bc946b',.013,.013,.007,x,y,z,'matte');
 }
 return turn(g,.57);
}
function lemonCake(){
 const g=new THREE.Group();
 for(const [y,color] of [[-.121,'#d39a61'],[-.042,'#edcca1'],[.032,'#d8a668']])disk(g,color,.264,.256,.088,0,y,0,'satin');
 oval(g,'#f0d18b',.271,.061,.267,0,.111,0,'glaze',38);
 for(let i=0;i<7;i++){
  const a=i*tau/7;
  oval(g,'#f3dfb0',.033,.043,.038,.184*Math.sin(a),.151,.184*Math.cos(a),'satin');
 }
 const wedge=disk(g,'#dcc171',.121,.118,.023,0,.169,0,'glaze');
 wedge.rotation.z=.24;
 ring(g,'#f4e2ae',.101,.006,.006,.182,0,'satin').rotation.set(Math.PI/2,.24,0);
 for(let i=0;i<5;i++){
  const a=i*tau/5;
  tube(g,'#f0d88f',[[0,.183,0],[.049*Math.sin(a),.183,.049*Math.cos(a)],[.092*Math.sin(a),.183,.092*Math.cos(a)]],.004,'satin');
 }
 return turn(g,.48);
}
function alienDoll(color){
 const g=new THREE.Group();
 oval(g,color,.121,.117,.158,0,-.005,.091,'glaze',30);
 oval(g,color,.174,.124,.158,0,.041,-.109,'glaze',34);
 for(const x of [-.071,.071]){
  oval(g,'#eee0b6',.049,.045,.033,x,.130,-.110,'glaze');
  oval(g,'#605663',.024,.021,.019,x,.151,-.104,'satin');
  tube(g,color,[[x,.073,-.207],[x*1.34,.105,-.257],[x*1.52,.147,-.296]],.019);
  oval(g,'#ddb179',.036,.034,.038,x*1.52,.149,-.294,'glaze');
  oval(g,color,.052,.044,.112,x*1.71,-.040,.079,'glaze').rotation.y=x*3.5;
  oval(g,'#bdab87',.049,.045,.065,x,-.030,.244,'glaze');
 }
 return turn(g,.34);
}
function gardenGnome(color){
 const g=new THREE.Group();
 oval(g,color,.162,.151,.146,0,-.095,0,'glaze',32);
 oval(g,'#d6b195',.113,.099,.096,0,.072,.047,'satin',30);
 const hat=disk(g,color,.032,.133,.249,0,.227,.015);
 hat.rotation.z=.18;
 oval(g,'#ceac88',.131,.027,.118,0,.114,.026,'glaze');
 oval(g,'#efdcbc',.109,.084,.054,0,-.018,.112,'satin');
 oval(g,'#b98771',.036,.034,.029,0,.062,.136,'satin');
 for(const x of [-.050,.050]){
  oval(g,'#69594e',.012,.014,.009,x,.083,.128,'satin');
  oval(g,'#8a7766',.058,.033,.069,x*1.23,-.224,.045,'satin');
 }
 return turn(g,.41);
}
function telescope(color){
 const g=new THREE.Group();
 for(const [r,z,h,c] of [[.128,-.177,.246,'#885c36'],[.100,-.004,.170,'#deba75'],[.073,.165,.198,color],[.060,.277,.075,'#d0b087']]){
  disk(g,c,r,r,h,0,0,z,c===color?'glaze':'metal').rotation.x=Math.PI/2;
 }
 ring(g,'#d4b987',.128,.023,0,0,-.306,'metal');
 oval(g,'#357e88',.103,.104,.023,0,0,-.315,'ice');
 ring(g,'#9f8877',.049,.011,0,0,.321,'metal');
 oval(g,'#73625e',.045,.044,.009,0,0,.327,'satin');
 return turn(g,.92);
}
const gardenMixEntries=new Map(),gardenMixBuilders={};
function gardenMixRoute(id,pattern,kind,build){
 gardenMixEntries.set(id,[[pattern,kind]]);
 gardenMixBuilders[kind]=build;
}
function gardenMixColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  gardenMixRoute(start+index,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue]??'#62595b'));
 });
}
gardenMixColors('mini-camp-stove','Gas Stove','卡式炉',1450,['Black','Blue','Green','Orange','Pink','Purple','Red','Yellow'],tabletopStove);
gardenMixColors('squishy-octopus','Octopus','章鱼',941,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],octopusToy);
gardenMixColors('color-dart','Dart Arrow','飞镖',550,['Black','Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],playDart);
gardenMixColors('color-egg','Egg','彩蛋|褐壳鸡蛋',441,['Blue','Brown','Green','Pink','Purple'],colorEgg);
gardenMixColors('little-alien','Alien','外星玩具',1026,['Yellow','Red','Purple','Pink','Orange','Grey','Green','Blue'],alienDoll);
gardenMixColors('garden-gnome','Dwarf','花园小人',1612,['Blue','Brown','Green','Orange','Pink','Purple','Red','Yellow'],gardenGnome);
gardenMixColors('brass-telescope','Pirate Telescope','伸缩望远镜',1705,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],telescope);
gardenMixRoute(376,/柠檬.*蛋糕|^Cake Yellow$/,'lemon-layer-cake',lemonCake);
gardenMixRoute(411,/曲奇|酥脆饼干|^Cookie Brown$/,'chocolate-chip-cookie',()=>confettiCookie(null,'chocolate'));
gardenMixRoute(108,/玩具卡车|大脚车|^Monster Truck Blue$/,'monster-truck-blue',()=>monsterTruck(palette.Blue));
gardenMixColors('cooking-spatula','Spatula','锅铲',745,['Purple','Red','White','Yellow'],kitchenSpatula);
gardenMixRoute(2852,/订书机|^Stapler Yellow$/,'desk-stapler-yellow',()=>stapler(palette.Yellow));

function perfumeBottle(color){
 const g=new THREE.Group();
 const crystal=box(g,color,.464,.224,.492,.075,0,-.003,.090,'ice');
 crystal.material=new THREE.MeshPhysicalMaterial({color,metalness:0,roughness:.17,transmission:.43,thickness:.24,clearcoat:.91,clearcoatRoughness:.10});
 box(g,color,.369,.149,.348,.060,0,-.015,.132,'glaze');
 box(g,'#d3b284',.168,.121,.084,.024,0,.011,-.177,'metal');
 box(g,color,.230,.174,.178,.040,0,.015,-.278,'glaze');
 for(const x of [-.067,-.034,0,.034,.067]){
  box(g,'#e6cfab',.008,.009,.124,.004,x,.103,-.278,'satin');
 }
 printed(g,.234,.211,0,.111,.084,(c,size)=>{
  c.fillStyle='#eddbc0';c.fillRect(0,0,size,size);
  c.strokeStyle='#b99975';c.lineWidth=16;c.strokeRect(33,42,446,428);
  c.fillStyle='#80584a';c.font='bold 83px sans-serif';c.textAlign='center';printInk(c,'香水',256,285);
 });
 return turn(g,.31);
}
function longBeakBird(color,beak,parrot=false){
 const g=new THREE.Group(),crest='#'+new THREE.Color(color).lerp(new THREE.Color('#f5dfb5'),.28).getHexString();
 oval(g,color,.166,.170,.217,0,-.059,-.015,'glaze',34);
 oval(g,color,.147,.139,.156,0,.106,.116,'glaze',34);
 oval(g,'#ebd3ac',.105,.131,.044,0,-.052,.171,'satin');
 const bill=oval(g,beak,parrot?.078:.119,parrot?.078:.064,parrot?.113:.177,0,.107,.274,'glaze',36);
 bill.rotation.x=parrot?.30:.11;
 for(const x of [-.092,.092]){
  oval(g,'#eadab3',.049,.050,.025,x,.125,.223,'glaze');
  oval(g,'#665351',.025,.026,.014,x,.129,.247,'satin');
  const wing=oval(g,crest,.072,.104,.159,x*1.68,-.057,-.032,'glaze');
  wing.rotation.y=x*2.6;
  for(const y of [-.049,-.083,-.116])oval(g,color,.024,.018,.099,x*2.22,y,-.061,'glaze');
  oval(g,'#bda176',.056,.029,.057,x*.93,-.218,.072,'satin');
 }
 const tail=oval(g,crest,.071,.045,.154,0,-.100,-.224,'glaze');
 tail.rotation.x=.32;
 return turn(g,.38);
}
function filmCamera(color){
 const g=new THREE.Group();
 box(g,color,.412,.229,.364,.054,0,-.026,.078);
 for(const x of [-.111,.110]){
  disk(g,color,.112,.106,.062,x,.108,.088,'glaze');
  disk(g,'#d2bd96',.077,.077,.009,x,.143,.088,'metal');
  for(let i=0;i<4;i++){
   const a=i*tau/4;
   oval(g,'#8a7566',.017,.006,.017,x+.047*Math.cos(a),.151,.088+.045*Math.sin(a),'satin');
  }
 }
 const lens=disk(g,'#c9b090',.116,.084,.189,0,-.011,-.184,'metal');
 lens.rotation.x=-Math.PI/2;
 oval(g,'#708b91',.080,.076,.024,0,-.011,-.286,'ice');
 ring(g,'#cbb18e',.103,.014,0,-.011,-.276,'metal');
 tube(g,'#9e8671',[[.149,-.072,.164],[.199,-.122,.194],[.218,-.221,.196]],.028,'satin');
 return turn(g,.41);
}
function retroFridge(color){
 const g=new THREE.Group();
 box(g,color,.375,.245,.740,.064,0,-.032,0);
 for(const [z,length] of [[-.196,.305],[.157,.371]]){
  box(g,color,.356,.060,length,.029,0,.106,z,'glaze');
  tube(g,'#c7b499',[[.107,.126,z-.065],[.119,.163,z-.038],[.119,.163,z+.061],[.108,.125,z+.084]],.013,'metal');
 }
 for(const x of [-.120,.120])box(g,'#897b6e',.044,.059,.090,.016,x,-.164,.266,'satin');
 return turn(g,.39);
}
function dinoEgg(color){
 const shellColor=color===palette.Purple?'#664483':color;
 const group=colorEgg(shellColor);
 const spots='#'+new THREE.Color(color).lerp(new THREE.Color('#f6e0ac'),.57).getHexString();
 for(const [x,y,z,angle] of [[-.117,.148,.114,.24],[.093,.189,.103,.25],[-.082,-.118,.149,-.26],[.114,-.087,.145,-.18],[.008,.080,.172,.17]]){
  const dot=oval(group,spots,.057,.061,.014,x,y,z,'glaze');
  dot.rotation.set(angle, x*3.1,-.13);
 }
 return group;
}
function gingerbreadFigure(){
 const g=new THREE.Group();
 baked(g,[.134,.070,.124],[0,0,-.236]);
 baked(g,[.122,.068,.145],[0,0,-.034]);
 for(const side of [-1,1]){
  const arm=baked(g,[.138,.064,.057],[side*.129,0,-.092]);
  arm.rotation.y=side*.32;
  const leg=baked(g,[.070,.065,.135],[side*.073,0,.154]);
  leg.rotation.y=side*.24;
  oval(g,'#68504a',.012,.008,.012,side*.050,.070,-.243,'satin');
  tube(g,'#efdab0',[[side*.154,.054,-.066],[side*.175,.066,-.082],[side*.193,.061,-.085]],.009,'satin');
 }
 tube(g,'#efdab0',[[-.037,.064,-.206],[0,.071,-.189],[.037,.064,-.206]],.009,'satin');
 for(const [z,c] of [[-.051,'#bd7b6a'],[.020,'#85a077'],[.091,'#cf9e6d']])oval(g,c,.016,.009,.017,0,.071,z,'glaze');
 return turn(g,.34);
}
const studioTwoEntries=new Map(),studioTwoBuilders={};
function studioTwoRoute(id,pattern,kind,build){
 const routes=studioTwoEntries.get(id)??[];
 routes.push([pattern,kind]);
 studioTwoEntries.set(id,routes);
 studioTwoBuilders[kind]=build;
}
function studioTwoColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  studioTwoRoute(start+index,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue]??'#5f5356'));
 });
}
studioTwoColors('perfume-flacon','Perfume','香水瓶',1721,['Yellow','Red','Purple','Orange','Green','White','Blue','Pink'],perfumeBottle);
studioTwoColors('toucan-figure','Toucan','橙嘴小鸟|巨嘴鸟',2101,['Blue','Orange'],color=>longBeakBird(color,'#dc9e60'));
studioTwoColors('retro-film-camera','Movie Cam','电影摄影机',1163,['Black','Blue','Green','Orange','Pink','Purple','Red','Yellow'],filmCamera);
studioTwoColors('retro-fridge','Fridge','冰箱',698,['Blue','Green','Grey','Orange','Pink','Purple','Red','White','Yellow'],retroFridge);
studioTwoColors('color-toothbrush','Brush','牙刷',288,['Brown','Green','Grey','Orange','Purple','Red','Yellow'],toothBrush);
studioTwoColors('parrot-doll','Pirate Parrot','鹦鹉玩偶',1690,['Blue','Green','Grey','Red','Yellow','Pink','Orange'],color=>longBeakBird(color,'#d6aa71',true));
studioTwoColors('dino-egg','Dino Egg','恐龙蛋',1265,['Red','Purple','Pink','Orange','Grey','Green','Brown','Blue'],dinoEgg);
studioTwoRoute(2130,/姜饼小人|^Gingerbread/,'gingerbread-figure',gingerbreadFigure);

function chalkBoard(color){
 const g=new THREE.Group();
 box(g,color,.649,.121,.459,.041,0,0,0);
 box(g,'#647c75',.522,.020,.339,.015,0,.060,-.023,'satin');
 for(const [x,z,w,d] of [[0,.151,.572,.020],[0,-.192,.566,.017],[-.280,-.020,.018,.351],[.280,-.020,.018,.351]]){
  box(g,'#c1a888',w,.013,d,.005,x,.071,z,'satin');
 }
 const chalk=disk(g,'#e8dbbb',.019,.019,.125,-.139,.092,.170,'matte');
 chalk.rotation.z=Math.PI/2;
 tube(g,'#decdae',[[.014,.074,.061],[.080,.074,-.052],[.129,.074,.040]],.004,'matte');
 tube(g,'#decdae',[[.040,.074,.012],[.103,.074,.010]],.004,'matte');
 return turn(g,.39);
}
function handBell(color){
 const g=new THREE.Group();
 const profile=[[.036,.185],[.075,.171],[.116,.102],[.143,.001],[.190,-.097],[.211,-.129],[.196,-.141],[.177,-.116],[.129,.012],[.097,.098],[.031,.157]].map(([r,y])=>new THREE.Vector2(r,y));
 mesh(g,new THREE.LatheGeometry(profile,48),color,0,-.060,0,'metal');
 ring(g,'#e0c195',.203,.012,0,-.193,0,'metal').rotation.x=Math.PI/2;
 const grip=disk(g,'#a8805c',.053,.040,.182,0,.215,0,'satin');
 grip.rotation.z=.02;
 oval(g,'#c2a17a',.068,.043,.065,0,.322,0,'satin');
 oval(g,'#af9372',.034,.036,.034,0,-.204,0,'metal');
 return turn(g,.67);
}
function sodaBottle(color){
 const g=new THREE.Group();
 const profile=[[0,-.369],[.117,-.365],[.151,-.328],[.159,-.291],[.149,-.171],[.143,-.093],[.158,.039],[.149,.113],[.122,.178],[.081,.242],[.068,.318],[0,.320]].map(([r,y])=>new THREE.Vector2(r,y));
 const outer=mesh(g,new THREE.LatheGeometry(profile,46),color,0,0,0,'ice');
 outer.material=new THREE.MeshPhysicalMaterial({color,roughness:.23,transmission:.29,thickness:.20,clearcoat:.84,clearcoatRoughness:.12});
 disk(g,'#dec7a1',.152,.153,.136,0,-.089,0,'satin');
 ring(g,color,.149,.008,0,-.098,0,'glaze').rotation.x=Math.PI/2;
 disk(g,'#c6a179',.078,.078,.050,0,.318,0,'metal');
 for(let i=0;i<14;i++){
  const a=i*tau/14;
  oval(g,'#e0bd89',.008,.019,.008,.073*Math.cos(a),.318,.073*Math.sin(a),'metal');
 }
 return turn(g,.71);
}
function snowPendant(color){
 const g=new THREE.Group();
 const frame=new THREE.Group();
 for(let i=0;i<6;i++){
  const a=i*tau/6,x=Math.sin(a),z=Math.cos(a);
  tube(frame,color,[[0,0,0],[.158*x,0,.158*z],[.327*x,0,.327*z]],.027,'ice');
  for(const off of [-.59,.59]){
   tube(frame,color,[[.169*x,0,.169*z],[.171*x+.085*Math.sin(a+off),0,.171*z+.085*Math.cos(a+off)],[.172*x+.125*Math.sin(a+off),0,.172*z+.125*Math.cos(a+off)]],.018,'ice');
  }
 }
 g.add(frame);
 ring(g,'#cbb393',.036,.010,0,.013,-.343,'metal').rotation.x=Math.PI/2;
 return turn(g,.30);
}
function laptop(color){
 const g=new THREE.Group();
 box(g,color,.582,.087,.492,.034,0,-.034,.111);
 box(g,'#dbc6a6',.510,.013,.301,.019,0,.015,.104,'satin');
 for(let row=0;row<3;row++)for(let col=0;col<7;col++)box(g,'#999080',.044,.013,.034,.006,(col-3)*.063,.029,.017+row*.048,'satin');
 box(g,'#c9a983',.151,.008,.066,.013,0,.028,.231,'metal');
 const screen=new THREE.Group();
 screen.position.set(0,.038,-.106);screen.rotation.x=.84;
 box(screen,color,.581,.068,.389,.037,0,.006,-.167);
 box(screen,'#6a6772',.499,.012,.297,.016,0,.047,-.170,'satin');
 box(screen,'#8aabac',.441,.014,.252,.014,0,.055,-.170,'ice');
 for(const [x,z,c] of [[-.098,-.197,'#e0b18b'],[-.045,-.146,'#e3ca9f'],[.009,-.179,'#9caf9c']]){
  box(screen,c,.037,.005,.041,.006,x,.065,z);
 }
 g.add(screen);
 return turn(g,.43);
}
function icePopBits(color,flavor){
 const g=new THREE.Group();
 box(g,'#c9a16f',.080,.051,.286,.023,0,-.007,.271,'satin');
 box(g,color,.365,.151,.494,.075,0,0,-.095,'ice');
 if(flavor==='melon'){
  box(g,'#79a284',.340,.083,.065,.027,0,.030,.114,'glaze');
  for(const [x,z] of [[-.098,-.070],[.078,-.147],[.011,-.280]])oval(g,'#805e59',.012,.007,.019,x,.079,z,'satin');
 }else{
  const chip=flavor==='strawberry'?'#e6b791':'#dfaa7b';
  for(const [x,z] of [[-.093,-.203],[.078,-.222],[-.068,-.030],[.076,.028],[.012,-.113]])oval(g,chip,.022,.012,.019,x,.076,z,'glaze');
 }
 return turn(g,.34);
}
function seahorse(color){
 const g=new THREE.Group();
 oval(g,color,.108,.079,.140,-.021,0,.008,'glaze',30);
 oval(g,color,.100,.085,.104,-.028,.020,-.153,'glaze',32);
 oval(g,'#d4ac86',.098,.044,.046,.093,.013,-.152,'glaze');
 oval(g,'#64505a',.020,.012,.018,-.016,.103,-.164,'satin');
 tube(g,color,[[-.020,0,.099],[.020,.003,.212],[.134,.011,.269],[.208,.021,.195],[.148,.022,.129]],.045);
 for(let i=0;i<5;i++)oval(g,'#c4b099',.033,.033,.025,-.103,.035,-.060+i*.035,'glaze');
 oval(g,'#4faca1',.078,.029,.110,-.049,.083,.051,'ice');
 return turn(g,.93);
}
function shipAnchor(color){
 const g=new THREE.Group();
 tube(g,color,[[0,0,-.275],[0,0,-.104],[0,0,.114],[0,0,.254]],.031);
 ring(g,'#cab396',.058,.016,0,0,-.304,'metal').rotation.x=Math.PI/2;
 tube(g,color,[[-.248,0,.129],[-.170,0,.259],[0,0,.286],[.170,0,.259],[.248,0,.129]],.027);
 tube(g,'#d0b38c',[[-.119,0,-.173],[0,0,-.172],[.119,0,-.172]],.022,'metal');
 for(const side of [-1,1]){
  const tip=new THREE.Shape();
  tip.moveTo(side*.252,-.077);tip.lineTo(side*.301,-.188);tip.lineTo(side*.184,-.141);tip.closePath();
  extrudedSurface(g,tip,color,-.012,0,.028,.009,'glaze');
 }
 return turn(g,.34);
}
const schoolroomEntries=new Map(),schoolroomBuilders={};
function schoolroomRoute(id,pattern,kind,build){
 schoolroomEntries.set(id,[[pattern,kind]]);
 schoolroomBuilders[kind]=build;
}
function schoolroomColors(prefix,english,localized,start,hues,build){
 hues.forEach((hue,index)=>{
  schoolroomRoute(start+index,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue]));
 });
}
schoolroomColors('chalk-board','Board','小黑板',272,['Blue','Green','Grey','Orange','Pink','Purple','Red'],chalkBoard);
schoolroomColors('hand-bell','Bell','手铃|黄铜手铃',157,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],handBell);
schoolroomColors('foam-sword','Sword','泡棉玩具剑',1147,['Yellow','Red','Purple','Pink','Orange','Grey','Green','Blue'],color=>foamProp(color,false));
schoolroomColors('glass-soda','Soda','汽水瓶',676,['Blue','Green','Pink','Purple','Red','Yellow'],sodaBottle);
schoolroomColors('snow-pendant','Snowpiece','雪花挂件',2062,['Pink','Purple','Red','White'],snowPendant);
schoolroomColors('open-laptop','Laptop','手提电脑',2837,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],laptop);
schoolroomColors('seahorse-doll','Seahorse','海马玩偶',1564,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],seahorse);
schoolroomColors('ship-anchor','Anchor','船锚摆件',1659,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],shipAnchor);
schoolroomRoute(494,/可可冰棒|^Popsicle Particle Brown$/,'cocoa-ice-pop',()=>icePopBits('#b27c64','cocoa'));
schoolroomRoute(495,/草莓冰棒|^Popsicle Particle Pink$/,'strawberry-ice-pop',()=>icePopBits('#ca8499','strawberry'));
schoolroomRoute(496,/西瓜冰棒|^Popsicle Watermelon$/,'watermelon-ice-pop',()=>icePopBits('#d88c83','melon'));
schoolroomRoute(446,/彩蛋|^Egg Red$/,'color-egg-red',()=>colorEgg(palette.Red));

const confectionEntries=new Map(),confectionBuilders={};
function confectionColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(!hue)continue;
  const kind=prefix+'-'+hue.toLowerCase();
  confectionEntries.set(start+offset,[[new RegExp(localized+'|^'+english+' '+hue+'$'),kind]]);
  confectionBuilders[kind]=()=>build(palette[hue],hue);
 }
}
function pressedGum(color,hue){
 const group=new THREE.Group();
 if(hue==='Green'){
  oval(group,color,.315,.107,.263,0,0,.028,'ice',32);
  oval(group,color,.153,.086,.134,-.095,.012,-.142,'ice');
  oval(group,color,.153,.086,.134,.095,.012,-.142,'ice');
  tube(group,'#765844',[[0,.054,-.156],[.016,.137,-.178],[.054,.175,-.206]],.017,'matte');
 }else{
  box(group,color,.572,.151,.400,.069,0,-.024,0);
  box(group,color,.515,.077,.358,.038,0,.062,0,'ice');
  for(const x of [-.161,-.080,0,.080,.161])box(group,color,.015,.014,.128,.006,x,.101,0,'satin');
 }
 return turn(group,.29);
}
function polishVial(color){
 const group=new THREE.Group();
 const glass=box(group,color,.42,.29,.36,.087,0,-.054,.144,'ice');
 glass.material=new THREE.MeshPhysicalMaterial({color,roughness:.16,transmission:.48,thickness:.12,clearcoat:.96,clearcoatRoughness:.09});
 box(group,color,.337,.241,.307,.082,0,-.064,.166);
 const cap=disk(group,'#5d4a54',.094,.110,.345,0,-.002,-.157,'satin');
 cap.rotation.x=-Math.PI/2;
 for(let i=0;i<14;i++){
  const a=i*tau/14;
  const fluting=box(group,'#70606b',.015,.012,.180,.004,.101*Math.cos(a),.101*Math.sin(a),-.191,'satin');
  fluting.rotation.z=a;
 }
 const neck=disk(group,'#d5b887',.111,.111,.055,0,-.003,-.007,'metal');
 neck.rotation.x=Math.PI/2;
 box(group,'#f3e2d0',.128,.012,.084,.006,0,.093,.159,'satin');
 box(group,color,.066,.014,.013,.004,0,.101,.156);
 return turn(group,.39);
}
function ceramicMouse(color){
 const group=new THREE.Group();
 oval(group,color,.211,.148,.274,0,0,.093);
 oval(group,color,.158,.137,.174,0,.048,-.122);
 for(const sign of [-1,1]){
  oval(group,color,.083,.075,.040,sign*.109,.148,-.086);
  oval(group,'#edb6ac',.049,.048,.024,sign*.111,.153,-.115,'satin');
  oval(group,'#382d34',.018,.021,.015,sign*.070,.106,-.241);
  oval(group,color,.084,.048,.092,sign*.127,-.085,.196);
 }
 oval(group,'#b27878',.032,.024,.023,0,.051,-.290);
 tube(group,color,[[.055,-.059,.267],[.180,-.051,.327],[.262,-.014,.296],[.267,.011,.217]],.023);
 return turn(group,.29);
}
function tintedGlasses(color){
 const group=new THREE.Group();
 for(const sign of [-1,1]){
  const x=sign*.18;
  const rim=ring(group,color,.147,.032,x,.005,.059);
  rim.scale.set(1,.82,1);
  const lens=oval(group,'#685861',.139,.111,.023,x,.006,.057,'ice',30);
  lens.material=new THREE.MeshPhysicalMaterial({color:'#685861',transmission:.32,roughness:.21,thickness:.1,clearcoat:1});
  tube(group,color,[[sign*.319,.026,.055],[sign*.345,.018,-.084],[sign*.335,-.040,-.244],[sign*.305,-.076,-.273]],.020);
  oval(group,'#e2bc81',.014,.012,.009,sign*.313,.036,.092,'metal');
 }
 tube(group,color,[[-.049,.010,.061],[0,.045,.055],[.049,.010,.061]],.023);
 return turn(group,.52);
}
function deskMouse(color){
 const group=new THREE.Group();
 oval(group,'#645960',.201,.071,.297,0,-.053,0,'satin',28);
 oval(group,color,.196,.107,.286,0,-.001,.006,'glaze',34);
 tube(group,'#706070',[[-.158,.065,-.054],[-.083,.096,-.064],[0,.109,-.069],[.083,.096,-.064],[.158,.065,-.054]],.006,'satin');
 tube(group,'#706070',[[0,.109,-.069],[0,.088,-.158],[0,.050,-.253]],.007,'satin');
 box(group,'#6e6269',.057,.020,.117,.009,0,.101,-.130,'satin');
 const wheel=disk(group,'#ddc5b2',.033,.033,.030,0,.112,-.132,'satin');
 wheel.rotation.z=Math.PI/2;
 return turn(group,.26);
}
function mechanismBeetle(color){
 const group=new THREE.Group();
 oval(group,'#5b4841',.206,.081,.250,0,-.055,.035,'satin');
 oval(group,color,.219,.155,.254,0,.002,.041);
 oval(group,'#68504a',.119,.086,.109,0,.012,-.215,'glaze');
 tube(group,'#684e4e',[[0,.114,-.137],[0,.160,-.018],[0,.140,.150],[0,.078,.266]],.008,'satin');
 for(const sign of [-1,1]){
  for(const [x,y,z,r] of [[.085,.142,-.053,.045],[.153,.110,.059,.047],[.080,.129,.171,.044]])oval(group,'#70534c',r,.013,r,sign*x,y,z,'satin');
  oval(group,'#efd4ab',.024,.023,.020,sign*.065,.061,-.290);
  tube(group,'#805c43',[[sign*.063,.055,-.256],[sign*.105,.104,-.296],[sign*.133,.136,-.323]],.012);
 }
 const key=ring(group,'#d9b477',.067,.014,.251,.004,.044,'metal');
 key.rotation.x=Math.PI/2;
 return turn(group,.30);
}
function beachBucket(color){
 const group=new THREE.Group();
 const silhouette=[[0,-.18],[.163,-.18],[.198,-.15],[.257,.160],[.250,.184],[.222,.181],[.167,-.138],[0,-.138]];
 mesh(group,new THREE.LatheGeometry(silhouette.map(([x,y])=>new THREE.Vector2(x,y)),44),color);
 const lip=ring(group,color,.243,.022,0,.170,0);
 lip.rotation.x=Math.PI/2;
 tube(group,'#efca7c',[[-.235,.110,0],[-.207,.302,.018],[0,.371,.029],[.207,.302,.018],[.235,.110,0]],.022);
 for(const sign of [-1,1])oval(group,'#edc47a',.031,.040,.042,sign*.244,.108,0);
 return turn(group,.53);
}
confectionColors('pressed-gum','Gum','口香糖|青苹果软糖',450,['Blue','Green','Pink','Purple','Red','Yellow'],pressedGum);
confectionColors('glass-lollipop','Lollipop','棒棒糖',464,['Blue','Green'],lollipop);
confectionColors('glaze-polish','Nail Polisher','指甲油',1729,['Yellow','Red','Purple','Orange','Green','Grey','Blue','Pink'],polishVial);
confectionColors('ceramic-mouse','Mouse','小鼠',933,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],ceramicMouse);
confectionColors('tinted-glasses','Sunglasses','太阳镜',1298,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],tintedGlasses);
confectionColors('desk-mouse','Computer Mouse','鼠标',2813,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],deskMouse);
confectionColors('mechanism-beetle','Ancient Bug','发条瓢虫',1042,['Blue','Brown','Green','Grey','Pink','Purple','Red','Yellow'],mechanismBeetle);
confectionColors('sand-pail','Sand Bucket','沙滩小桶',1338,['White',null,'Purple','Pink','Orange','Grey','Green','Blue'],beachBucket);
confectionColors('glaze-mushroom','Mushroom','蘑菇摆件',1628,['Blue','Brown','Green','Orange',null,null,'Red','Yellow'],mushroom);

const workbenchEntries=new Map(),workbenchBuilders={};
function workbenchRoute(id,pattern,kind,build){
 const routes=workbenchEntries.get(id)??[];
 routes.push([pattern,kind]);
 workbenchEntries.set(id,routes);
 workbenchBuilders[kind]=build;
}
function workbenchColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)workbenchRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function cabinBoat(color){
 const group=new THREE.Group(),hull=new THREE.Shape();
 hull.moveTo(0,-.39);
 hull.bezierCurveTo(.26,-.23,.27,.13,.19,.32);
 hull.quadraticCurveTo(0,.39,-.19,.32);
 hull.bezierCurveTo(-.27,.13,-.26,-.23,0,-.39);
 extrudedSurface(group,hull,color,-.08,0,.126,.039,'glaze');
 const deck=hull.clone();
 const floor=extrudedSurface(group,deck,'#e6cc9b',.009,0,.035,.014,'satin');
 floor.scale.set(.85,.85,.95);
 box(group,'#fae7c8',.285,.139,.319,.026,0,.105,.049);
 box(group,color,.327,.035,.343,.013,0,.173,.030);
 for(const x of [-.063,.063])box(group,'#709895',.082,.062,.016,.007,x,.108,-.116,'glaze');
 for(const sign of [-1,1])box(group,'#739c9c',.016,.064,.166,.008,sign*.143,.103,.068,'glaze');
 disk(group,color,.051,.048,.12,0,.219,.149);
 disk(group,'#f3dcc6',.039,.039,.015,0,.286,.149,'satin');
 return turn(group,.37);
}
function bandHeadphone(color){
 const group=new THREE.Group();
 tube(group,color,[[-.284,.009,.045],[-.265,.026,-.156],[-.162,.063,-.298],[0,.071,-.352],[.162,.063,-.298],[.265,.026,-.156],[.284,.009,.045]],.035);
 tube(group,'#746268',[[-.183,.042,-.259],[0,.051,-.309],[.183,.042,-.259]],.027,'satin');
 for(const sign of [-1,1]){
  const pad=oval(group,'#63505a',.103,.094,.143,sign*.209,.012,.154,'matte');
  oval(group,color,.106,.110,.156,sign*.280,.013,.152);
  oval(group,'#cdb682',.023,.027,.097,sign*.364,.013,.157,'metal');
  pad.rotation.y=sign*.15;
 }
 return turn(group,.33);
}
function stingrayFigure(color){
 const group=new THREE.Group(),wing=new THREE.Shape();
 wing.moveTo(0,-.29);
 wing.bezierCurveTo(.228,-.253,.205,-.111,.391,-.017);
 wing.quadraticCurveTo(.335,.133,.167,.147);
 wing.quadraticCurveTo(0,.352,-.167,.147);
 wing.quadraticCurveTo(-.335,.133,-.391,-.017);
 wing.bezierCurveTo(-.205,-.111,-.228,-.253,0,-.29);
 extrudedSurface(group,wing,color,-.021,0,.050,.027,'glaze');
 oval(group,color,.174,.088,.255,0,.024,-.024,'glaze',30);
 const tail=[[0,.002,.219],[.044,-.002,.321],[.104,.017,.422],[.084,.032,.477]];
 tube(group,color,tail,.020);
 for(const sign of [-1,1]){
  oval(group,'#433947',.024,.026,.021,sign*.102,.092,-.179);
  for(const [x,z] of [[.123,-.095],[.166,-.029],[.192,.032],[.129,.056],[.107,.112]])oval(group,'#f4cdbb',.014,.006,.015,sign*x,.075-x*.13,z,'satin');
 }
 return turn(group,.29);
}
function pottedCactus(color){
 const group=new THREE.Group();
 disk(group,'#cc8a67',.205,.143,.210,0,-.19,0);
 disk(group,'#e7ac7a',.223,.214,.057,0,-.065,0);
 disk(group,'#6f5348',.179,.164,.019,0,-.033,0,'matte');
 for(const [x,z,height] of [[0,0,.329],[-.117,.016,.179],[.107,.043,.215]]){
  oval(group,color,.096,height*.54,.101,x,height*.33,z,'satin',32);
  for(let n=0;n<7;n++){
   const a=n*tau/7;
   for(const [y,r] of [[.29,.091],[.49,.088],[.70,.067]])oval(group,'#efcf96',.008,.010,.008,x+Math.cos(a)*r,height*y,z+Math.sin(a)*r,'matte');
  }
 }
 return turn(group,.51);
}
function counterBlender(color){
 const group=new THREE.Group();
 box(group,color,.444,.189,.389,.068,0,-.206,0);
 box(group,'#75605c',.412,.046,.348,.021,0,-.299,0,'satin');
 oval(group,'#e9c179',.069,.067,.031,0,-.199,-.199);
 const profile=[[0,-.125],[.114,-.125],[.156,-.092],[.186,.225],[.163,.229],[.132,-.068],[0,-.090]];
 mesh(group,new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),40),'#c5d8c9',0,0,0,'ice');
 disk(group,color,.190,.177,.047,0,.235,0);
 disk(group,'#ebcd9b',.057,.067,.017,0,.267,0);
 tube(group,color,[[.176,.165,0],[.257,.182,0],[.274,.110,0],[.248,-.014,0],[.157,-.027,0]],.028);
 for(let j=0;j<3;j++)box(group,'#88a598',.043,.012,.009,.004,.067,.021+j*.049,-.164-j*.007,'satin');
 return turn(group,.56);
}
function paradeFigure(color){
 const group=new THREE.Group();
 disk(group,'#c4a37a',.238,.233,.055,0,-.292,0,'satin');
 box(group,'#59616b',.278,.171,.154,.034,0,-.181,0);
 box(group,color,.306,.244,.191,.036,0,-.011,0);
 for(const sign of [-1,1]){
  box(group,color,.071,.187,.09,.029,sign*.177,-.008,.005);
  box(group,'#634a42',.124,.069,.175,.023,sign*.076,-.235,-.035,'satin');
  box(group,'#dcb372',.073,.031,.108,.008,sign*.122,.096,-.033,'metal');
  oval(group,'#60423e',.012,.016,.012,sign*.045,.181,-.115);
 }
 oval(group,'#ebbc93',.124,.104,.107,0,.166,-.017);
 disk(group,color,.126,.118,.098,0,.250,0);
 box(group,'#54444a',.238,.024,.091,.013,0,.222,-.101);
 for(const y of [-.072,-.016,.040])oval(group,'#cc9d62',.017,.017,.009,0,y,-.098,'metal');
 return turn(group,.60);
}
function cocoaCookie(color){
 const group=new THREE.Group();
 baked(group,[.284,.071,.271],[0,0,0]).material=new THREE.MeshPhysicalMaterial({color,roughness:.72,clearcoat:.07});
 for(const [x,y,z] of [[-.135,.058,-.087],[-.02,.070,.019],[.100,.063,-.077],[.139,.057,.111],[-.083,.060,.134]])oval(group,'#62443e',.036,.016,.032,x,y,z,'satin');
 return turn(group,.25);
}
workbenchColors('cabin-boat','Boat','小船',73,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],cabinBoat);
workbenchColors('band-headphone','Headphone','头戴耳机',194,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],bandHeadphone);
workbenchColors('stingray-figure','Stingray','鳐鱼',2881,['Blue','Green','Orange','Pink','Purple','Red','White'],stingrayFigure);
workbenchColors('potted-cactus','Cactus','仙人掌',1595,['Blue','Brown','Green',null,'Orange','Pink','Purple','Red','Yellow'],pottedCactus);
workbenchColors('counter-blender','Blender','料理机',1783,['Blue','Brown','Green',null,'Pink','Purple','Red','Yellow'],counterBlender);
workbenchColors('parade-figure','Soldier','仪仗玩偶',884,['Blue','Green','Grey','Pink','Red','White','Yellow'],paradeFigure);
workbenchColors('ceramic-hound','Anubis','陶瓷小狗',1034,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],dachshund);
workbenchColors('pet-dog','Dog','小狗',918,[null,'Brown','Grey',null,'White','Yellow'],dachshund);
workbenchRoute(918,/黑色小狗|^Dog Black$/,'pet-dog-black',()=>dachshund('#4d4551'));
workbenchColors('painted-lacquer','Tomb','描金漆盒',1091,['Blue','Brown','Green','Grey',null,'Pink','Purple','Red'],lacquerBox);
workbenchRoute(287,/牙刷|^Brush Blue$/,'color-toothbrush-blue',()=>toothBrush(palette.Blue));
workbenchRoute(410,/可可曲奇|^Cookie Black$/,'cocoa-round-cookie',()=>cocoaCookie('#a37861'));
function toastedSlice(){
 const group=new THREE.Group(),outline=new THREE.Shape();
 outline.moveTo(-.236,-.272);
 outline.lineTo(.236,-.272);
 outline.quadraticCurveTo(.276,-.272,.276,-.231);
 outline.lineTo(.276,.085);
 outline.bezierCurveTo(.37,.33,-.37,.33,-.276,.085);
 outline.lineTo(-.276,-.231);
 outline.quadraticCurveTo(-.276,-.272,-.236,-.272);
 extrudedSurface(group,outline,'#aa6745',-.075,0,.115,.035,'matte');
 const crumb=extrudedSurface(group,outline.clone(),'#edbf84',.057,0,.012,.014,'matte');
 crumb.scale.set(.84,.84,1);
 for(let i=0;i<36;i++){
  const x=Math.sin(i*19.7)*.206,z=Math.cos(i*7.8)*.195;
  oval(group,i%3?'#dba86f':'#f3d29e',.007+(i%3)*.003,.004,.008,x,.080,z,'matte',12);
 }
 return turn(group,.24);
}
workbenchRoute(423,/吐司/,'toasted-slice',toastedSlice);
workbenchRoute(423,/小熊面包|^Cute Bread Brown$/,'cocoa-bread-bear',bearBread);

const countertopEntries=new Map(),countertopBuilders={};
function countertopRoute(id,pattern,kind,build){
 const routes=countertopEntries.get(id)??[];
 routes.push([pattern,kind]);
 countertopEntries.set(id,routes);
 countertopBuilders[kind]=build;
}
function countertopColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)countertopRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function toastAppliance(color){
 const group=new THREE.Group();
 box(group,'#8f766b',.59,.118,.394,.041,0,-.178,0,'satin');
 box(group,color,.61,.343,.422,.091,0,.005,0);
 box(group,'#c5b199',.543,.033,.341,.025,0,.168,0,'metal');
 for(const z of [-.071,.073]){
  box(group,'#68534c',.416,.016,.054,.014,0,.186,z,'satin');
  box(group,'#d9a462',.287,.099,.042,.012,.019,.222,z,'matte');
 }
 box(group,'#a38974',.018,.122,.045,.009,.305,.034,.091,'satin');
 box(group,'#e6bf83',.083,.027,.078,.010,.327,.071,.090);
 oval(group,'#e8c587',.044,.041,.017,.174,-.067,.211,'glaze');
 return turn(group,.44);
}
function popcornCup(color){
 const group=new THREE.Group();
 const tub=[[0,-.243],[.150,-.243],[.179,-.224],[.239,.207],[.223,.214],[.157,-.210],[0,-.210]];
 mesh(group,new THREE.LatheGeometry(tub.map(([x,y])=>new THREE.Vector2(x,y)),40),color);
 for(let j=0;j<11;j++){
  const a=j*tau/11;
  tube(group,'#f1dfb7',[[.168*Math.cos(a),-.198,.168*Math.sin(a)],[.199*Math.cos(a),.005,.199*Math.sin(a)],[.226*Math.cos(a),.181,.226*Math.sin(a)]],.014);
 }
 const rim=ring(group,'#eac99a',.229,.014,0,.212,0);
 rim.rotation.x=Math.PI/2;
 for(let i=0;i<16;i++){
  const a=i*2.399,r=.194*Math.sqrt(i/16),x=r*Math.cos(a),z=r*Math.sin(a),y=.216+(i%4)*.016;
  oval(group,i%3?'#f3dfa6':'#dfbf87',.062,.044,.054,x,y,z,'satin',16);
  oval(group,'#f4e5bb',.040,.034,.046,x+.025,y+.011,z-.020,'matte',12);
 }
 return turn(group,.56);
}
function deskCalendar(color){
 const group=new THREE.Group();
 const shape=new THREE.Shape();
 shape.moveTo(-.337,-.245);
 shape.lineTo(.337,-.245);
 shape.lineTo(.337,.245);
 shape.lineTo(-.337,.245);
 shape.closePath();
 const card=extrudedSurface(group,shape,color,-.05,0,.025,.019,'satin');
 card.rotation.x=-1.10;
 box(group,color,.641,.063,.235,.017,0,-.141,.153,'satin');
 const pages=new THREE.Group();
 pages.rotation.x=.47;
 pages.position.y=-.013;
 group.add(pages);
 box(pages,'#e8d8b9',.558,.079,.398,.013,0,.025,.022,'matte');
 printed(pages,.529,.371,0,.067,.024,(c,size)=>{
  c.fillStyle='#f7e8cc';c.fillRect(0,0,size,size);
  c.fillStyle=color;c.fillRect(0,0,size,103);
  c.fillStyle='#6c5141';c.font='bold 63px sans-serif';c.textAlign='center';printInk(c,'日历',256,76);
  for(let i=0;i<21;i++){
   c.fillStyle=i%7===0?'#c48168':'#80665b';
   c.font='30px sans-serif';
   printInk(c,String(i+1),47+69*(i%7),185+98*Math.floor(i/7));
  }
 });
 for(const x of [-.198,-.066,.066,.198]){
  const binder=ring(pages,'#a58a6e',.045,.009,x,.056,-.189,'metal');
  binder.rotation.y=Math.PI/2;
 }
 return turn(group,.30);
}
function bearDeck(color){
 const group=new THREE.Group(),deck=edgeOutline(.358,.152,.90);
 extrudedSurface(group,deck,'#ba926d',-.031,0,.037,.016,'satin');
 extrudedSurface(group,deck,color,.013,0,.019,.009,'glaze');
 for(const z of [-.210,.210])for(const x of [-.141,.141]){
  disk(group,'#e4c996',.062,.062,.046,x,-.080,z,'glaze').rotation.z=Math.PI/2;
  disk(group,'#ae9381',.026,.026,.050,x,-.080,z,'metal').rotation.z=Math.PI/2;
 }
 oval(group,'#e4ca9c',.103,.027,.106,0,.042,.019,'glaze');
 for(const x of [-.077,.077]){
  oval(group,'#e4ca9c',.045,.022,.045,x,.037,-.053);
  oval(group,'#805d4b',.012,.007,.013,x*.53,.069,-.002,'satin');
 }
 oval(group,'#805d4b',.021,.008,.013,0,.069,.054,'satin');
 return turn(group,.31);
}
function citrusSoap(color,hue){
 const group=soapBar(hue==='Blue'?'#b0ca80':color);
 const slice=ring(group,'#e9d9a7',.110,.006,0,.097,-.097,'satin');
 slice.rotation.x=Math.PI/2;
 for(let index=0;index<7;index++){
  const a=index*tau/7;
  const wedge=box(group,'#ddcd93',.010,.009,.079,.003,.056*Math.sin(a),.097,-.097+.056*Math.cos(a),'satin');
  wedge.rotation.y=a;
 }
 return group;
}
function milkCarton(color,hue){
 const group=milk(color);
 if(hue==='Brown')printed(group,.413,.338,0,.164,.053,(c,size)=>{
  c.fillStyle='#e9d3b4';c.fillRect(0,0,size,size);
  c.fillStyle='#875447';c.textAlign='center';c.font='bold 79px sans-serif';printInk(c,'可可牛奶',256,207);
  c.fillStyle='#b48966';c.beginPath();c.ellipse(256,345,59,40,0,0,tau);c.fill();
 });
 return group;
}
function appleGummy(color){
 const group=new THREE.Group();
 for(let i=0;i<5;i++){
  const x=(i-2)*.103,z=Math.sin(i*1.25)*.102;
  oval(group,color,.096,.079,.115,x,.004,z,'ice',26);
  if(i<2)oval(group,'#dfdda1',.011,.012,.018,x+.009,.084,z,'satin');
 }
 return turn(group,.75);
}
function looseLeafTin(){
 const group=new THREE.Group();
 disk(group,'#83a477',.225,.214,.309,0,-.065,0);
 disk(group,'#b6bc89',.236,.236,.045,0,.105,0);
 ring(group,'#e2c38a',.225,.011,0,.125,0,'metal').rotation.x=Math.PI/2;
 for(const x of [-.075,.057]){
  const leaf=oval(group,'#e4cd93',.074,.014,.04,x,.134,0,'glaze');
  leaf.rotation.y=x*5;
 }
 return turn(group,.58);
}
function twinNote(color){
 const group=new THREE.Group();
 for(const offset of [-.120,.120]){
  oval(group,color,.091,.051,.073,offset-.016,0,.149);
  tube(group,color,[[offset+.051,0,.153],[offset+.051,0,-.210]],.023);
 }
 tube(group,color,[[-.071,0,-.170],[.175,0,-.237]],.026);
 return turn(group,.34);
}
countertopColors('enameled-toaster','Toaster','烤面包机',767,['Blue','Brown','Green','Orange','Pink','Purple','Red','White','Yellow'],toastAppliance);
countertopColors('striped-popcorn','Popcorn','爆米花',1211,[null,'Blue','Green','Orange','Pink','Purple','Red','Yellow'],popcornCup);
countertopRoute(1211,/爆米花|^Popcorn Black$/,'striped-popcorn-black',()=>popcornCup('#514550'));
countertopColors('paper-calendar','Calendar','台历',2797,['Blue','Brown','Green','Orange','Pink','Purple','Red','Yellow'],deskCalendar);
countertopColors('bear-deck','Bear Skate','小熊滑板',1950,['Red','Purple','Pink','Orange','Grey','Green','Blue','Yellow'],bearDeck);
countertopColors('citrus-soap','Soap','青柚皂|香皂|桃花皂|山茶皂|[紫黄橙绿]色皂',2245,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],citrusSoap);
countertopColors('milk-carton','Milk','牛奶',659,['Brown','Pink','Yellow'],milkCarton);
countertopRoute(1888,/青苹果味软糖|^Snake Candy Green$/,'apple-gummy',()=>appleGummy('#a5b76d'));
countertopRoute(176,/茶叶罐/,'loose-leaf-tin',looseLeafTin);
countertopRoute(176,/双音符/,'twin-note-green',()=>twinNote(palette.Green));
countertopRoute(176,/八分音符|^Eighth Note Green$/,'single-note-green',()=>eighthNote(palette.Green));
countertopRoute(168,/镜面球|^Disco Ball Orange$/,'orange-mirrorball',()=>discoBall(['#d58c57','#dcad76','#efd3a1','#b07455','#e4b281']));
countertopRoute(1329,/夹脚拖鞋|^Flip Flop Yellow$/,'beach-flip-flop-yellow',()=>flipFlop(palette.Yellow,'Yellow'));
countertopRoute(568,/哑铃|^Dumbbell Yellow$/,'rubber-dumbbell-yellow',()=>dumbbell(palette.Yellow));

function lionDanceToy(color){
 const group=new THREE.Group();
 oval(group,color,.202,.120,.202,0,-.045,.156,'satin',32);
 oval(group,color,.269,.162,.232,0,-.007,-.103,'glaze',32);
 for(const z of [.134,.196,.247])tube(group,'#d9a761',[[-.141,.013,z],[-.092,.059,z],[0,.076,z],[.092,.059,z],[.141,.013,z]],.012,'metal');
 for(const sign of [-1,1]){
  oval(group,color,.086,.073,.081,sign*.204,.045,-.223);
  oval(group,'#d5a453',.052,.031,.048,sign*.216,.098,-.233);
  oval(group,'#eddfb5',.103,.047,.090,sign*.128,.135,-.173);
  oval(group,'#564449',.051,.039,.054,sign*.119,.171,-.167);
  oval(group,'#fbefcf',.018,.009,.017,sign*.110,.206,-.181);
  oval(group,'#efc58e',.091,.049,.052,sign*.167,.107,-.012);
  oval(group,'#d8ab66',.076,.035,.066,sign*.123,-.067,.311);
  tube(group,'#e9c481',[[sign*.056,.154,-.262],[sign*.141,.158,-.270],[sign*.207,.120,-.223]],.018);
 }
 oval(group,'#91514b',.142,.037,.061,0,.125,-.014);
 oval(group,'#efddb3',.088,.014,.021,0,.155,-.031,'satin');
 oval(group,'#e5ad67',.064,.038,.043,0,.175,-.112);
 oval(group,'#c97e63',.037,.026,.029,0,.206,-.119);
 return turn(group,.17);
}
function crispTaco(){
 const group=new THREE.Group();
 for(const sign of [-1,1]){
  oval(group,'#dca262',.310,.168,.057,0,.008,sign*.081,'matte',42).rotation.x=sign*.29;
  for(const [x,y] of [[-.146,.053],[-.034,.096],[.072,.083],[.16,.022]]){
   oval(group,'#bc865d',.010,.010,.008,x,y,sign*.122,'matte',12);
  }
 }
 for(let i=0;i<13;i++){
  const x=(i-6)*.041,y=.119+Math.cos(x*6)*.035,z=Math.sin(i*2.7)*.057;
  oval(group,['#7e9a68','#ac7651','#d68b66'][i%3],.071,.044,.036,x,y,z,'satin',16).rotation.z=i*.8;
 }
 return turn(group,.40);
}
function boxedTwists(color='#c57d62'){
 const group=new THREE.Group();
 box(group,'#cb9368',.552,.131,.650,.035,0,-.039,0,'satin');
 box(group,'#edd4ad',.511,.026,.599,.018,0,.035,0,'matte');
 for(const x of [-.173,0,.173])for(const phase of [0,Math.PI]){
  const strand=[];
  for(let i=0;i<=18;i++){
   const a=i*tau/7+phase;
   strand.push([x+.036*Math.cos(a),.080+.028*Math.sin(a),-.224+i*.025]);
  }
  tube(group,'#ca924f',strand,.032,'satin');
 }
 const window=box(group,'#efdfc5',.528,.111,.617,.024,0,.090,0,'ice');
 window.material=new THREE.MeshPhysicalMaterial({color:'#efdfc5',transmission:.87,roughness:.17,thickness:.08,clearcoat:.89});
 box(group,color,.526,.014,.095,.006,0,.151,.199,'satin');
 return turn(group,.33);
}
countertopRoute(1385,/青绿金边醒狮/,'lion-dance-jade',()=>lionDanceToy('#659a86'));
countertopRoute(1386,/浅蓝金边醒狮/,'lion-dance-azure',()=>lionDanceToy('#7fb1c2'));
countertopColors('lion-dance-toy','Sumo','醒狮',1385,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],lionDanceToy);
countertopRoute(502,/塔可|^Taco$/,'crisp-taco',crispTaco);
countertopRoute(605,/盒装麻花/,'boxed-twists',boxedTwists);

const housekitEntries=new Map(),housekitBuilders={};
function housekitRoute(id,pattern,kind,build){
 housekitEntries.set(id,[[pattern,kind]]);
 housekitBuilders[kind]=build;
}
function housekitColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)housekitRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function gardenSecateurs(color){
 const group=new THREE.Group();
 for(const sign of [-1,1]){
  tube(group,color,[[sign*.238,-.030,.298],[sign*.181,.011,.169],[sign*.087,.033,.045],[sign*.013,.033,-.064]],.048);
  const shape=new THREE.Shape();
  shape.moveTo(-.061,.034);
  shape.quadraticCurveTo(-.039,-.201,sign*.117,-.322);
  shape.quadraticCurveTo(sign*.175,-.218,.047,-.088);
  shape.quadraticCurveTo(.064,-.018,.071,.044);
  shape.closePath();
  extrudedSurface(group,shape,sign>0?'#d6ccb9':'#9a9e9d',sign*.021,0,.020,.012,'metal');
 }
 disk(group,'#c6ad83',.054,.054,.025,0,.070,-.031,'metal');
 tube(group,'#b7a794',[[-.123,.027,.111],[-.078,.025,.095],[-.034,.025,.113],[.022,.025,.100],[.070,.025,.116],[.118,.026,.105]],.011,'metal');
 return turn(group,.26);
}
function salonDryer(color){
 const group=new THREE.Group();
 const body=disk(group,color,.132,.166,.345,0,.071,-.077);
 body.rotation.x=Math.PI/2;
 oval(group,color,.163,.137,.137,0,.067,.058,'glaze',28);
 const nozzle=disk(group,'#746072',.095,.078,.128,0,.062,-.299,'satin');
 nozzle.rotation.x=Math.PI/2;
 ring(group,'#514954',.071,.019,0,.061,-.364,'satin');
 const handle=box(group,color,.169,.305,.181,.042,0,-.125,.061);
 handle.rotation.x=-.20;
 box(group,'#d9bd9c',.054,.063,.025,.010,0,-.110,-.029,'satin');
 ring(group,'#dbc0a6',.098,.013,0,.071,.176,'satin');
 for(let n=0;n<4;n++)box(group,'#695768',.109,.014,.015,.005,0,.037+.023*n,.187,'satin');
 return turn(group,.61);
}
function carryOn(color){
 const group=new THREE.Group();
 box(group,'#695659',.472,.184,.594,.049,0,-.014,0,'satin');
 box(group,color,.481,.190,.590,.054,0,.008,0);
 box(group,color,.447,.090,.548,.047,0,.076,-.006,'glaze');
 for(const x of [-.132,-.067,.067,.132])box(group,color,.029,.027,.412,.010,x,.125,-.010);
 tube(group,'#7e6968',[[-.100,.014,-.288],[-.096,.030,-.368],[.096,.030,-.368],[.100,.014,-.288]],.022,'satin');
 for(const x of [-.163,.163]){
  disk(group,'#67575e',.050,.050,.047,x,-.046,.298,'satin').rotation.z=Math.PI/2;
  disk(group,'#d8b998',.020,.020,.050,x,-.046,.298,'metal').rotation.z=Math.PI/2;
 }
 box(group,'#e1c5a0',.094,.015,.059,.009,.106,.131,.117,'satin');
 return turn(group,.30);
}
function colorSpoon(color){
 const group=servingSpoon();
 box(group,color,.131,.074,.331,.029,0,.002,.253);
 for(const z of [.178,.302])disk(group,'#c1ae8e',.013,.013,.011,0,.044,z,'metal');
 return group;
}
function rainbowSlice(color){
 const group=new THREE.Group(),shape=new THREE.Shape();
 shape.moveTo(0,-.334);
 shape.lineTo(.249,.243);
 shape.quadraticCurveTo(0,.325,-.249,.243);
 shape.closePath();
 const sponge=['#dbc59c','#a8b88e','#dfbc7e','#dfad96','#b1abc7'];
 for(let i=0;i<sponge.length;i++){
  const y=-.147+i*.060;
  extrudedSurface(group,shape,sponge[i],y,0,.041,.009,'matte');
  extrudedSurface(group,shape,'#edd8b0',y+.047,0,.011,.006,'satin');
 }
 extrudedSurface(group,shape,color,.164,0,.029,.013,'glaze');
 for(const [x,z] of [[-.097,.103],[0,.081],[.097,.103]])oval(group,'#a65862',.046,.042,.046,x,.205,z);
 return turn(group,.41);
}
function wickerBed(color){
 const group=new THREE.Group();
 const bowl=[[0,-.111],[.239,-.111],[.291,-.072],[.326,.077],[.326,.110],[.292,.117],[.278,.052],[.252,-.036],[0,-.036]];
 mesh(group,new THREE.LatheGeometry(bowl.map(([x,y])=>new THREE.Vector2(x,y)),44),'#bd986d',0,0,0,'satin').scale.z=1.14;
 for(let row=0;row<5;row++){
  const y=-.068+row*.035,r=.280+row*.011;
  const braid=ring(group,row%2?'#d5ad7a':'#c79e6b',r,.013,0,y,0,'satin');
  braid.rotation.x=Math.PI/2;
  braid.scale.y=1.14;
 }
 oval(group,color,.256,.052,.291,0,.026,.026,'satin',34);
 const piping=ring(group,color,.225,.011,0,.064,.023,'ribbon');
 piping.rotation.x=Math.PI/2;
 piping.scale.y=1.17;
 for(const [x,z] of [[-.097,.047],[.097,.047],[0,-.095]])oval(group,color,.029,.010,.029,x,.067,z,'matte');
 return turn(group,.35);
}
function coiledSnake(color){
 const group=new THREE.Group(),points=[];
 for(let i=0;i<=19;i++){
  const a=i*1.63*tau/19,r=.31-i*.010;
  points.push([r*Math.sin(a),-.063+i*.006,r*Math.cos(a)]);
 }
 tube(group,color,points,.054);
 oval(group,color,.119,.071,.092,-.099,.086,-.090);
 for(const x of [-.147,-.070])oval(group,'#433e47',.017,.020,.013,x,.128,-.145);
 tube(group,'#c88082',[[-.100,.065,-.156],[-.100,.058,-.219],[-.124,.055,-.239]],.008,'satin');
 return turn(group,.31);
}
function ovenGlove(color){
 const group=new THREE.Group(),palm=new THREE.Shape();
 palm.moveTo(-.151,.29);
 palm.lineTo(.149,.29);
 palm.lineTo(.159,.071);
 palm.quadraticCurveTo(.302,.120,.300,-.018);
 palm.quadraticCurveTo(.248,-.090,.152,-.079);
 palm.lineTo(.145,-.209);
 palm.bezierCurveTo(.145,-.402,-.160,-.405,-.175,-.210);
 palm.quadraticCurveTo(-.191,.055,-.151,.29);
 palm.closePath();
 extrudedSurface(group,palm,color,-.059,0,.105,.032,'satin');
 box(group,'#bba5a0',.303,.109,.113,.024,0,-.002,.278,'ribbon');
 for(const x of [-.054,.010,.074])for(const z of [-.162,-.061,.040,.141]){
  const seam=box(group,'#b7a49a',.084,.008,.006,.002,x,.051,z,'ribbon');
  seam.rotation.y=.68;
 }
 return turn(group,.28);
}
housekitColors('garden-secateurs','Garden Scissors','园艺剪',1620,['Blue','Brown','Green','Orange','Pink','Purple','Red','Yellow'],gardenSecateurs);
housekitColors('salon-dryer','Hair Dryer','吹风机',1761,['Pink','Purple','Blue','Green','Red','Orange'],salonDryer);
housekitColors('carry-on','Hand Luggage','登机箱',2338,['Blue','Brown','Green','Grey','Orange','Pink','Purple','Red'],carryOn);
housekitColors('enamel-spoon','Spoon','餐勺',749,['Blue','Brown','Green','Orange','Pink','Purple','Red','White','Yellow'],colorSpoon);
housekitColors('enamel-fork','Fork','餐叉',689,['Blue','Brown','Green','Orange','Pink','Purple','Red','White','Yellow'],tableFork);
housekitColors('rainbow-slice','Cake Rainbow','彩虹蛋糕',373,['Blue','Pink'],rainbowSlice);
housekitColors('wicker-bed','Cat Basket','猫窝',2363,['Blue','Brown','Green','Pink',null,'Red'],wickerBed);
housekitColors('coiled-snake','Snake','小蛇',965,['Blue','Green','Orange','Pink','Purple','Yellow'],coiledSnake);
housekitColors('oven-glove','Oven Mitts','隔热手套',1816,['Green','Grey','Pink','Purple','Red'],ovenGlove);

const playthingsEntries=new Map(),playthingsBuilders={};
function playthingsRoute(id,pattern,kind,build){
 playthingsEntries.set(id,[[pattern,kind]]);
 playthingsBuilders[kind]=build;
}
function playthingsColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)playthingsRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function roundStool(color){
 const group=new THREE.Group();
 disk(group,color,.285,.268,.089,0,.109,0);
 ring(group,'#e1c7ac',.256,.011,0,.147,0,'satin').rotation.x=Math.PI/2;
 for(let i=0;i<4;i++){
  const a=(i+.5)*tau/4,x=Math.cos(a),z=Math.sin(a);
  tube(group,color,[[x*.151,.093,z*.151],[x*.174,-.089,z*.174],[x*.213,-.225,z*.213]],.032);
 }
 ring(group,'#baa58e',.180,.019,0,-.100,0,'satin').rotation.x=Math.PI/2;
 return turn(group,.56);
}
function pilotDuck(color){
 const group=enamelDuck(color);
 oval(group,'#805e4c',.155,.084,.153,0,.230,-.133,'satin',30);
 for(const sign of [-1,1]){
  oval(group,'#97745e',.044,.083,.074,sign*.136,.180,-.119,'satin');
  ring(group,'#d4b78b',.045,.014,sign*.057,.222,-.274,'metal');
  oval(group,'#7a9b9e',.040,.036,.020,sign*.057,.221,-.269,'ice');
 }
 tube(group,'#d5a16a',[[-.120,.071,-.193],[0,.049,-.233],[.120,.071,-.193]],.028,'satin');
 return group;
}
function jellyCup(color){
 const group=new THREE.Group();
 const mold=[[0,-.161],[.165,-.161],[.205,-.133],[.244,.163],[.218,.172],[.191,-.124],[0,-.126]];
 const shell=mesh(group,new THREE.LatheGeometry(mold.map(([x,y])=>new THREE.Vector2(x,y)),38),color,0,0,0,'ice');
 shell.material=new THREE.MeshPhysicalMaterial({color,roughness:.16,transmission:.53,thickness:.09,clearcoat:.96});
 const fruit=disk(group,color,.213,.170,.260,0,-.002,0,'ice');
 fruit.material=new THREE.MeshPhysicalMaterial({color,roughness:.25,transmission:.21,thickness:.19,clearcoat:.83});
 const rim=ring(group,color,.233,.016,0,.171,0);
 rim.rotation.x=Math.PI/2;
 for(let i=0;i<3;i++){
  const a=i*tau/3;
  oval(group,'#ead393',.044,.011,.027,.091*Math.cos(a),.136,.091*Math.sin(a),'satin');
 }
 return turn(group,.59);
}
function porcelainDolphin(color){
 const group=new THREE.Group();
 const torso=oval(group,color,.255,.119,.123,-.044,.001,.004,'glaze',36);
 torso.rotation.z=-.24;
 oval(group,color,.155,.102,.103,-.235,.076,0);
 oval(group,'#e8dfc2',.133,.047,.064,-.327,.050,0,'glaze');
 tube(group,color,[[.027,.008,0],[.177,-.056,.013],[.282,-.097,0]],.063);
 for(const sign of [-1,1]){
  oval(group,color,.138,.029,.045,.315,-.085,sign*.085).rotation.y=sign*.57;
  oval(group,color,.116,.025,.038,-.037,-.025,sign*.123).rotation.y=sign*.59;
  oval(group,'#544552',.018,.020,.010,-.261,.099,sign*.096);
 }
 oval(group,color,.087,.067,.025,.003,.105,0).rotation.z=-.38;
 return turn(group,.38);
}
function blueReefFish(){
 const group=new THREE.Group();
 oval(group,'#6b9fbd',.201,.117,.281,0,0,-.034,'glaze',34);
 for(const sign of [-1,1]){
  oval(group,'#e7bf63',.076,.023,.138,sign*.074,-.002,.248).rotation.y=sign*.48;
  oval(group,'#325e85',.055,.020,.150,sign*.124,.077,.012).rotation.y=-sign*.54;
  oval(group,'#f1d8a0',.030,.030,.022,sign*.113,.081,-.211);
  oval(group,'#453f51',.015,.019,.013,sign*.123,.089,-.226);
 }
 oval(group,'#5886ae',.034,.077,.176,0,.069,.043);
 return turn(group,.46);
}
function steamedRiceCake(){
 const group=new THREE.Group();
 const batter=oval(group,'#ecd7a7',.308,.146,.306,0,0,0,'matte',40);
 const position=batter.geometry.attributes.position;
 for(let i=0;i<position.count;i++){
  const angle=Math.atan2(position.getZ(i),position.getX(i));
  const scallop=1+.047*Math.cos(10*angle);
  position.setXYZ(i,position.getX(i)*scallop,Math.max(-.63,position.getY(i)),position.getZ(i)*scallop);
 }
 batter.geometry.computeVertexNormals();
 for(let i=0;i<26;i++){
  const angle=i*2.39996,r=.224*Math.sqrt(i/26);
  oval(group,i%5?'#e0c796':'#bb8270',.014,.005,.011,r*Math.cos(angle),.130-.65*r*r,r*Math.sin(angle),'matte',12);
 }
 return turn(group,.30);
}
function clothEarwarmer(color){
 const group=bandHeadphone(color);
 for(const sign of [-1,1]){
  const pad=oval(group,color,.110,.076,.155,sign*.237,.073,.155,'ribbon',28);
  pad.rotation.y=sign*.16;
  for(let i=0;i<8;i++){
   const a=i*tau/8;
   oval(group,color,.023,.020,.022,sign*.237+.083*Math.cos(a),.100,.155+.112*Math.sin(a),'ribbon',12);
  }
 }
 return group;
}
playthingsColors('round-stool','Chair','圆凳',303,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],roundStool);
playthingsColors('pilot-duck','Pilot Duck','飞行员小鸭',2315,['Brown','Green',null,'Orange',null,null,'Red'],pilotDuck);
playthingsColors('festival-doll','Asian Doll','节庆布娃娃',1346,['Blue','Brown','Green',null,'Orange','Pink','Purple','Red'],color=>dressDoll(color,true));
playthingsColors('colored-rolling-pin','Rolling Pin','擀面杖',1825,['Pink','Purple','Red','Orange'],rollingPin);
playthingsColors('fruit-jelly-cup','Delight','果冻杯',1874,['Blue','Green','Orange','Pink','Purple','Red'],jellyCup);
playthingsColors('porcelain-dolphin','Dolphin','海豚摆件',2872,['Blue','Grey','Pink'],porcelainDolphin);
playthingsColors('cloth-earwarmer','Earwarmer','绒耳罩',2022,['Brown',null,null,'Orange',null,'Red','Yellow'],clothEarwarmer);
playthingsRoute(448,/彩蛋|^Egg Yellow$/,'color-egg-yellow',()=>colorEgg(palette.Yellow));
playthingsRoute(606,/米发糕/,'steamed-rice-cake',steamedRiceCake);
playthingsRoute(500,/黄瓜海苔卷|^Sushi Green$/,'sushi-cucumber',()=>sushi('#89a971'));
playthingsRoute(501,/三文鱼海苔卷|^Sushi Orange$/,'sushi-salmon',()=>sushi('#d49872'));
playthingsRoute(2870,/小蓝鱼摆件|^Blue Fish Blue$/,'blue-reef-fish',blueReefFish);
playthingsBuilders['woven-bamboo-steamer']=()=>basket('#b59064');

const dressingEntries=new Map(),dressingBuilders={};
function dressingRoute(id,pattern,kind,build){
 dressingEntries.set(id,[[pattern,kind]]);
 dressingBuilders[kind]=build;
}
function dressingColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)dressingRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function kickScooter(color){
 const group=new THREE.Group();
 box(group,color,.194,.082,.596,.034,0,-.161,.046);
 for(const x of [-.041,0,.041])box(group,'#786368',.014,.009,.347,.004,x,-.116,.101,'satin');
 for(const z of [-.265,.303]){
  const tire=disk(group,'#65545c',.084,.084,.081,0,-.169,z,'matte');
  tire.rotation.z=Math.PI/2;
  for(const sign of [-1,1])disk(group,'#dbb883',.042,.042,.009,sign*.044,-.169,z,'metal').rotation.z=Math.PI/2;
 }
 tube(group,color,[[0,-.170,-.271],[0,.051,-.264],[0,.328,-.172]],.031);
 tube(group,'#64525f',[[-.175,.338,-.173],[0,.328,-.172],[.175,.334,-.174]],.029,'satin');
 for(const x of [-.173,.173])oval(group,color,.039,.032,.032,x,.333,-.174);
 return turn(group,.61);
}
function stoneLion(color){
 const group=new THREE.Group();
 box(group,color,.523,.096,.523,.040,0,-.205,.023,'matte');
 oval(group,color,.169,.184,.181,0,-.031,.097,'satin',34);
 oval(group,color,.203,.169,.179,0,.143,-.073,'satin',30);
 for(let i=0;i<10;i++){
  const a=i*tau/10,x=Math.cos(a)*.149,z=-.060+Math.sin(a)*.119;
  oval(group,color,.061,.053,.058,x,.230,z,'satin',16);
 }
 for(const sign of [-1,1]){
  oval(group,color,.073,.087,.091,sign*.144,-.110,-.116,'satin');
  oval(group,'#7b645f',.016,.022,.012,sign*.073,.190,-.221,'matte');
 }
 oval(group,color,.098,.060,.070,0,.122,-.208,'satin');
 oval(group,'#b58f72',.035,.059,.057,.173,-.132,-.031,'satin');
 return turn(group,.58);
}
function pumpSoap(color){
 const group=new THREE.Group();
 const shell=box(group,color,.399,.272,.445,.083,0,-.009,.080);
 shell.material=new THREE.MeshPhysicalMaterial({color,transmission:.37,thickness:.14,roughness:.19,clearcoat:.94});
 box(group,color,.340,.235,.285,.060,0,-.022,.124);
 const collar=disk(group,'#e6d2b4',.101,.093,.089,0,.024,-.154,'satin');
 collar.rotation.x=Math.PI/2;
 tube(group,'#826f69',[[0,.028,-.179],[0,.025,-.276],[.051,.024,-.305],[.114,.030,-.323]],.024,'satin');
 box(group,'#e8d8ad',.186,.012,.122,.014,0,.132,.110,'satin');
 const mark=oval(group,color,.043,.009,.034,0,.140,.113);
 mark.rotation.y=.39;
 return turn(group,.33);
}
function cosmeticPouch(color){
 const group=new THREE.Group();
 box(group,color,.667,.260,.413,.099,0,0,0,'satin');
 box(group,color,.582,.239,.448,.089,0,.007,0,'satin');
 tube(group,'#ad827f',[[-.304,.048,-.095],[-.264,.114,-.113],[0,.141,-.108],[.264,.114,-.113],[.304,.048,-.095]],.013,'ribbon');
 for(let i=0;i<14;i++){
  const x=(i-6.5)*.038,y=.147-.18*x*x;
  box(group,'#d8b68e',.017,.009,.026,.004,x,y,-.109,'metal');
 }
 const pull=ring(group,'#b18d69',.038,.009,.278,.123,-.118,'metal');
 pull.rotation.x=Math.PI/2;
 box(group,'#ebcda5',.112,.015,.066,.010,0,.140,.050,'satin');
 return turn(group,.27);
}
function makeupBrush(color){
 const group=new THREE.Group();
 const handle=disk(group,color,.041,.052,.452,0,-.006,.168);
 handle.rotation.x=Math.PI/2;
 const joint=disk(group,'#d9b680',.079,.048,.141,0,-.002,-.110,'metal');
 joint.rotation.x=Math.PI/2;
 oval(group,'#876362',.121,.082,.144,0,.001,-.223,'satin',28);
 for(let i=0;i<9;i++){
  const x=(i-4)*.019,y=.063-.7*x*x;
  tube(group,'#b18b7b',[[x*.60,y,-.165],[x,y+.013,-.236],[x*.75,y-.009,-.304]],.004,'ribbon');
 }
 return turn(group,.28);
}
function tigerBonnet(color){
 const group=new THREE.Group();
 oval(group,color,.304,.214,.244,0,-.028,.006,'satin',36);
 for(const sign of [-1,1]){
  oval(group,color,.084,.078,.069,sign*.228,.107,-.097,'satin');
  oval(group,'#e6c18d',.050,.047,.043,sign*.228,.129,-.117,'ribbon');
  oval(group,'#f1deb4',.097,.039,.068,sign*.119,.169,-.074);
  oval(group,'#67494c',.042,.019,.046,sign*.114,.202,-.077,'satin');
  for(const z of [.041,.096,.152])tube(group,'#8b514d',[[sign*.203,.088,z],[sign*.155,.139,z-.021],[sign*.103,.162,z-.016]],.016,'ribbon');
 }
 oval(group,'#edca91',.115,.031,.061,0,.157,-.154,'satin');
 oval(group,'#86514f',.041,.024,.030,0,.186,-.162);
 return turn(group,.37);
}
function threadSpool(color){
 const group=new THREE.Group();
 disk(group,'#c5a274',.225,.222,.058,0,-.167,0,'satin');
 disk(group,color,.177,.177,.292,0,.006,0,'ribbon');
 disk(group,'#cfa978',.225,.225,.054,0,.174,0,'satin');
 for(let i=0;i<12;i++){
  const course=ring(group,i%4?color:'#c3b2a8',.178,.006,0,-.127+i*.024,0,'ribbon');
  course.rotation.set(Math.PI/2,.061,0);
 }
 disk(group,'#745847',.052,.052,.010,0,.204,0,'matte');
 return turn(group,.55);
}
function miniMegaphone(color){
 const group=new THREE.Group();
 const profile=[[0,-.233],[.096,-.233],[.193,.108],[.242,.212],[.228,.236],[.206,.225],[.160,.126],[.071,-.184],[0,-.185]];
 mesh(group,new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),40),color).rotation.x=Math.PI/2;
 const rim=ring(group,'#e6c78d',.225,.023,0,0,.222);
 rim.rotation.z=.16;
 oval(group,'#6c5b58',.095,.092,.035,0,0,-.166,'satin');
 const handle=box(group,color,.134,.231,.135,.034,0,-.151,-.109);
 handle.rotation.x=-.16;
 oval(group,'#ddceae',.038,.028,.023,0,-.144,-.182,'satin');
 return turn(group,-.43);
}
function berryCake(color){
 const group=new THREE.Group();
 for(const [y,shade] of [[-.122,'#d5a77b'],[-.072,'#ead7ae'],[-.018,'#d4a17e'],[.032,'#efe2bc']])disk(group,shade,.267,.264,.055,0,y,0,'matte');
 disk(group,color,.277,.267,.072,0,.083,0);
 for(let i=0;i<7;i++){
  const a=i*tau/7,x=.163*Math.cos(a),z=.163*Math.sin(a);
  oval(group,'#f5e6c5',.054,.032,.050,x,.134,z,'satin');
  oval(group,'#c6777b',.037,.058,.036,x,.178,z);
 }
 return turn(group,.53);
}
dressingColors('kick-scooter','Scooter','滑板车',125,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],kickScooter);
dressingColors('stone-lion','Sphinx','石狮摆件',1066,['Blue','Brown','Green','Grey','Orange','Pink','Purple','Red','Yellow'],stoneLion);
dressingColors('wrapped-glaze-candy','Wrapped Candy','包装糖',1891,['Blue','Green','Pink','Red','Yellow'],color=>wrappedSweet(color,false));
dressingColors('pump-soap','Soap Dispenser','按压洗手瓶',2238,['Green',null,'Orange',null,'Purple','Red','Yellow'],pumpSoap);
dressingColors('cosmetic-pouch','Makeup Bag','化妆包',1745,['Yellow','Red','Purple','Orange','Green',null,'Blue','Pink'],cosmeticPouch);
dressingColors('makeup-brush','Makeup Brush','化妆刷',1737,['Yellow','Red','Purple','Orange','Green','Brown','Blue','Pink'],makeupBrush);
dressingColors('tiger-bonnet','Helmet','虎头帽',1123,['Yellow','Red',null,'Orange','Grey','Green','Brown'],tigerBonnet);
dressingColors('mini-megaphone','Megaphone','扩音器',1196,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],miniMegaphone);
dressingRoute(1171,/场记板|^Clapperboard Black$/,'clapperboard-black',()=>clapperboard('#4d454b'));
dressingRoute(343,/线轴/,'woven-thread-blue',()=>threadSpool(palette.Blue));
dressingRoute(51,/葡萄|^Grape Yellow$/,'golden-grapes',()=>grapes(['#dbb269','#e8c078','#cba470']));
dressingRoute(372,/草莓奶油蛋糕|^Cake Pink$/,'berry-cream-cake',()=>berryCake('#df9caa'));
dressingRoute(1889,/波纹软糖|^Snake Candy Pink$/,'ripple-gummy-pink',()=>appleGummy('#cc4a76'));

const kilnEntries=new Map(),kilnBuilders={};
function kilnRoute(id,pattern,kind,build){
 kilnEntries.set(id,[[pattern,kind]]);
 kilnBuilders[kind]=build;
}
function kilnColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)kilnRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function porcelainAngelfish(){
 const group=new THREE.Group(),fin=new THREE.Shape();
 fin.moveTo(-.256,-.071);
 fin.quadraticCurveTo(-.110,-.248,.123,-.193);
 fin.quadraticCurveTo(.227,-.101,.358,-.285);
 fin.quadraticCurveTo(.337,-.112,.270,.008);
 fin.quadraticCurveTo(.337,.116,.350,.255);
 fin.quadraticCurveTo(.227,.130,.103,.163);
 fin.quadraticCurveTo(-.104,.262,-.256,.090);
 fin.closePath();
 extrudedSurface(group,fin,'#6a91b2',-.022,0,.054,.025,'glaze');
 oval(group,'#86b3c3',.232,.096,.145,-.037,.064,0,'glaze',32);
 for(const x of [-.075,.041,.148]){
  tube(group,'#5d7da1',[[x,.109,-.075],[x+.033,.164,0],[x-.009,.101,.094]],.018);
 }
 for(const sign of [-1,1])oval(group,'#dca762',.051,.014,.077,.203,.048,sign*.128,'glaze').rotation.y=sign*.62;
 oval(group,'#e5cd94',.049,.019,.036,-.168,.133,-.027);
 oval(group,'#534b55',.020,.009,.020,-.171,.153,-.028);
 return turn(group,.34);
}
function enamelTeaMug(){
 const group=new THREE.Group();
 const rimProfile=[[0,-.181],[.186,-.181],[.228,-.147],[.238,.152],[.227,.179],[.207,.179],[.196,-.129],[0,-.133]];
 mesh(group,new THREE.LatheGeometry(rimProfile.map(([x,y])=>new THREE.Vector2(x,y)),46),'#c57363');
 ring(group,'#eddfbb',.216,.016,0,.175,0,'satin').rotation.x=Math.PI/2;
 disk(group,'#f0dfba',.195,.188,.021,0,-.120,0,'satin');
 tube(group,'#cf7c69',[[.215,-.092,0],[.338,-.065,0],[.380,.048,0],[.314,.136,0],[.227,.134,0]],.035);
 const emblem=oval(group,'#ebd0a1',.064,.061,.007,0,.013,-.237,'glaze');
 emblem.rotation.z=.17;
 return turn(group,.57);
}
function oldFanfare(color){
 const group=new THREE.Group();
 const bell=[[.053,-.276],[.058,-.242],[.070,-.099],[.100,.069],[.135,.159],[.188,.259],[.202,.266],[.187,.237],[.118,.151],[.086,.074],[.057,-.109],[.046,-.262]];
 mesh(group,new THREE.LatheGeometry(bell.map(([x,y])=>new THREE.Vector2(x,y)),44),'#c5a171',0,0,.088,'metal').rotation.x=Math.PI/2;
 for(const z of [-.109,-.045,.018,.086])oval(group,'#705652',.023,.012,.021,.012,.057,z,'matte');
 const sleeve=disk(group,color,.055,.061,.214,0,0,-.243);
 sleeve.rotation.x=Math.PI/2;
 const lip=ring(group,'#e3c48e',.194,.013,0,0,.352,'metal');
 lip.rotation.z=.10;
 box(group,'#8d6457',.088,.050,.123,.018,0,0,-.373,'satin');
 return turn(group,-.24);
}
function ballLauncher(color){
 const group=new THREE.Group();
 const base=box(group,'#bd9a71',.431,.061,.396,.029,0,-.164,.069,'satin');
 base.rotation.y=.06;
 const barrel=new THREE.Group();
 barrel.rotation.x=Math.PI/2+.29;
 group.add(barrel);
 const profile=[[0,-.285],[.110,-.285],[.122,-.222],[.108,.191],[.139,.270],[.138,.280],[.111,.282],[.084,.173],[.088,-.204],[0,-.206]];
 mesh(barrel,new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),42),color);
 for(const y of [-.191,.100,.259])disk(barrel,'#d7b47b',.119,.122,.032,0,y,0,'satin');
 for(const x of [-.181,.181]){
  disk(group,'#8a7165',.125,.122,.043,x,-.108,.111,'satin').rotation.z=Math.PI/2;
  disk(group,'#d2b692',.066,.066,.049,x,-.108,.111,'glaze').rotation.z=Math.PI/2;
 }
 oval(group,'#eee0a8',.052,.054,.051,.069,-.113,-.240);
 return turn(group,-.32);
}
function lunchMicrowave(color){
 const group=new THREE.Group();
 box(group,color,.648,.354,.439,.077,0,0,0);
 box(group,'#6d5e69',.441,.253,.047,.032,-.068,-.024,-.223,'satin');
 box(group,'#93adad',.371,.195,.017,.024,-.074,-.023,-.249,'ice');
 box(group,'#e7cdaa',.041,.152,.032,.011,.123,-.008,-.265,'satin');
 box(group,'#5c5867',.114,.051,.012,.008,.217,.064,-.230,'satin');
 box(group,'#abccae',.068,.010,.009,.004,.212,.065,-.237,'glaze');
 for(const y of [-.019,-.079])oval(group,'#e0be87',.028,.022,.013,.222,y,-.235);
 for(const side of [-1,1])box(group,'#8c7469',.104,.045,.277,.020,side*.217,-.186,.011,'satin');
 return turn(group,.58);
}
function pigFigure(){
 const group=new THREE.Group(),color='#dba3ae';
 oval(group,color,.239,.157,.226,0,-.008,.116,'glaze',32);
 oval(group,color,.208,.156,.178,0,.035,-.088,'glaze',32);
 oval(group,'#e9b3b2',.099,.060,.074,0,.084,-.245);
 for(const sign of [-1,1]){
  oval(group,color,.061,.061,.108,sign*.124,.155,-.104).rotation.y=sign*.38;
  oval(group,'#735563',.019,.020,.013,sign*.086,.119,-.209);
  oval(group,'#aa6b7c',.015,.020,.008,sign*.037,.088,-.312);
  for(const z of [-.111,.192])oval(group,color,.055,.085,.053,sign*.133,-.103,z);
 }
 const tail=ring(group,color,.052,.012,0,-.017,.324);
 tail.rotation.y=.20;
 return turn(group,.32);
}
function vanillaCupcake(){
 const group=new THREE.Group();
 disk(group,'#d0a778',.260,.225,.114,0,-.094,0,'matte');
 disk(group,'#e8d7af',.268,.259,.048,0,-.012,0,'satin');
 disk(group,'#f1e0b7',.263,.260,.051,0,.037,0,'satin');
 const cream=[];
 for(let i=0;i<=29;i++){
  const a=i*tau*1.65/29,r=.138*(1-i/31);
  cream.push([Math.cos(a)*r,.067+i*.004,Math.sin(a)*r]);
 }
 tube(group,'#efdeaf',cream,.031,'satin');
 oval(group,'#bd7e76',.039,.044,.041,.015,.209,.020);
 return turn(group,.43);
}
kilnColors('market-pot','Witch Pot','陶釜',2151,['Blue','Green','Grey',null,null,'Red'],footedPot);
kilnColors('carrier-rocket','Rocketship','运载火箭',997,['Pink','Orange','Grey','Green','Blue','Red'],toyRocket);
kilnColors('market-fanfare','Fanfare','唢呐',1115,['Yellow','Red','Purple','Pink','Orange',null,'Green','Blue'],oldFanfare);
kilnColors('ball-launcher','Pirate Cannon','弹球筒',1673,['Blue','Brown','Green','Grey','Orange','Pink','Purple','Red','Yellow'],ballLauncher);
kilnColors('foam-curved','Pirate Sword','弯柄泡棉剑',1697,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],color=>foamProp(color,false));
kilnColors('lunch-microwave','Microwave','微波炉',1807,['Blue','Green','Grey','Orange','Purple','Red','Yellow'],lunchMicrowave);
kilnRoute(2861,/神仙鱼摆件|^Angel Fish Blue$/,'porcelain-angelfish',porcelainAngelfish);
kilnRoute(602,/搪瓷茶缸/,'red-enamel-tea-mug',enamelTeaMug);
kilnRoute(603,/竹蒸笼/,'rice-market-steamer',()=>basket('#b48f63'));
kilnRoute(166,/镜面球|^Disco Ball Green$/,'green-mirrorball',()=>discoBall(['#83a48b','#6b8976','#aebc92','#91b09a','#c3c8a1']));
kilnRoute(1861,/小猪摆件|^Pig Pink$/,'ceramic-pig',pigFigure);
kilnRoute(375,/香草奶油蛋糕|^Cake White$/,'vanilla-cream-cake',vanillaCupcake);

const coffeeCornerEntries=new Map(),coffeeCornerBuilders={};
function coffeeCornerRoute(id,pattern,kind,build){
 const routes=coffeeCornerEntries.get(id)??[];
 routes.push([pattern,kind]);
 coffeeCornerEntries.set(id,routes);
 coffeeCornerBuilders[kind]=build;
}
function coffeeCornerColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)coffeeCornerRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function rotaryPhone(color){
 const group=new THREE.Group();
 box(group,color,.611,.194,.484,.078,0,-.043,.036);
 const bezel=disk(group,'#dfc9a6',.166,.173,.036,0,.071,.101,'satin');
 bezel.rotation.x=.09;
 disk(group,'#956e63',.109,.109,.021,0,.097,.101,'satin');
 for(let i=0;i<9;i++){
  const a=i*tau/9;
  disk(group,'#f0daac',.024,.024,.009,.128*Math.cos(a),.095,.101+.128*Math.sin(a),'glaze');
 }
 tube(group,color,[[-.277,.060,-.171],[-.194,.096,-.223],[0,.108,-.215],[.194,.096,-.223],[.277,.060,-.171]],.056);
 for(const x of [-.229,.229])oval(group,color,.090,.079,.095,x,.070,-.194);
 return turn(group,.38);
}
function clayTub(color){
 const group=new THREE.Group();
 disk(group,'#ecddbc',.215,.166,.334,0,-.040,0,'satin');
 const wrap=disk(group,color,.208,.178,.192,0,-.052,0,'satin');
 wrap.rotation.y=.31;
 disk(group,color,.237,.226,.053,0,.147,0,'glaze');
 for(let i=0;i<18;i++){
  const a=i*tau/18;
  const rib=box(group,color,.026,.035,.013,.004,.226*Math.sin(a),.145,.226*Math.cos(a));
  rib.rotation.y=a;
 }
 printed(group,.260,.163,0,.176,0,(c,size)=>{
  c.fillStyle='#ead8b0';c.fillRect(0,0,size,size);
  c.fillStyle='#8a5a4c';c.textAlign='center';c.font='bold 109px sans-serif';printInk(c,'彩泥',256,292);
 });
 return turn(group,.46);
}
function toastedMarshmallow(color){
 const group=new THREE.Group();
 const stick=disk(group,'#c9a174',.019,.023,.704,0,0,.123,'matte');
 stick.rotation.x=Math.PI/2;
 for(const [z,shade] of [[-.238,'#e3ba80'],[-.088,color],[.063,'#e1c19a']]){
  box(group,shade,.262,.160,.147,.048,0,.014,z,'satin').rotation.y=z;
  for(const x of [-.070,.018,.079])oval(group,'#ba875e',.017,.004,.024,x,.096,z+x*.1,'matte',12);
 }
 return turn(group,.33);
}
function blushCompact(color){
 const group=new THREE.Group();
 disk(group,color,.285,.260,.112,0,-.065,.102);
 disk(group,'#e2ba93',.248,.257,.026,0,.003,.102,'metal');
 disk(group,'#c48186',.215,.225,.019,0,.023,.102,'matte');
 for(const z of [.038,.098,.157]){
  const groove=box(group,'#dbaa9c',.262,.007,.008,.003,0,.035,z,'matte');
  groove.rotation.y=.41;
 }
 box(group,color,.225,.056,.118,.018,0,.011,-.120);
 const mirror=new THREE.Group();
 mirror.position.set(0,.098,-.205);
 mirror.rotation.x=-.52;
 group.add(mirror);
 disk(mirror,color,.236,.236,.052,0,0,0);
 disk(mirror,'#a8a8b1',.197,.197,.012,0,.032,0,'metal');
 disk(mirror,'#cfbfaa',.197,.197,.009,0,-.028,0,'satin');
 return turn(group,.29);
}
function petFoodBowl(color){
 const group=new THREE.Group();
 const profile=[[0,-.141],[.264,-.141],[.294,-.106],[.243,.122],[.227,.135],[.210,.125],[.170,-.044],[0,-.058]];
 mesh(group,new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),46),color);
 ring(group,'#e6d5ad',.227,.013,0,.122,0).rotation.x=Math.PI/2;
 disk(group,'#e9dcc1',.175,.146,.013,0,-.046,0,'satin');
 oval(group,color,.062,.010,.054,0,-.037,.022);
 for(let i=0;i<3;i++){
  const a=(i-1)*.65;
  oval(group,color,.023,.009,.019,.093*Math.sin(a),-.037,-.077*Math.cos(a));
 }
 return turn(group,.51);
}
function satinEyeMask(color){
 const group=new THREE.Group(),outline=new THREE.Shape();
 outline.moveTo(-.324,.066);
 outline.bezierCurveTo(-.320,.252,-.105,.244,0,.137);
 outline.bezierCurveTo(.115,.248,.322,.242,.324,.057);
 outline.bezierCurveTo(.306,-.206,.149,-.190,0,-.137);
 outline.bezierCurveTo(-.167,-.192,-.316,-.196,-.324,.066);
 extrudedSurface(group,outline,color,-.047,0,.095,.041,'satin');
 const panel=extrudedSurface(group,outline,'#b88b89',.055,0,.010,.009,'ribbon');
 panel.scale.set(.89,.86,1);
 tube(group,color,[[-.290,-.018,.017],[-.245,-.091,.236],[0,-.124,.301],[.245,-.091,.236],[.290,-.018,.017]],.023,'ribbon');
 for(const x of [-.139,.139])tube(group,'#e4bba4',[[x-.073,.072,-.019],[x,.085,.018],[x+.073,.072,-.019]],.010,'ribbon');
 return turn(group,.30);
}
function espressoCup(color){
 const group=new THREE.Group();
 const profile=[[0,-.114],[.153,-.113],[.192,-.080],[.230,.110],[.212,.127],[.202,.114],[.175,-.049],[0,-.067]];
 disk(group,'#e4cfab',.289,.242,.047,0,-.132,0,'satin');
 mesh(group,new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),44),color);
 const lip=ring(group,'#e8d8ad',.216,.012,0,.126,0);
 lip.rotation.x=Math.PI/2;
 disk(group,'#a77a53',.192,.177,.014,0,.082,0,'satin');
 tube(group,color,[[.179,-.041,0],[.263,-.032,0],[.298,.039,0],[.264,.081,0],[.201,.081,0]],.026);
 for(const x of [-.031,.041]){
  oval(group,'#e4c89c',.061,.007,.024,x,.093,-.002,'satin').rotation.y=x*8;
 }
 return turn(group,.53);
}
function espressoMachine(color){
 const group=new THREE.Group();
 box(group,color,.465,.494,.388,.066,0,0,.020);
 box(group,'#ddc9a7',.453,.090,.375,.031,0,.228,.016,'metal');
 box(group,'#71605c',.410,.208,.042,.027,0,-.072,-.187,'satin');
 box(group,'#bd9c84',.361,.056,.235,.015,0,-.194,-.209,'metal');
 for(const x of [-.11,-.037,.037,.11])box(group,'#86716a',.012,.010,.183,.002,x,-.162,-.204,'satin');
 const head=disk(group,'#d5bea0',.092,.093,.041,0,.060,-.214,'metal');
 head.rotation.x=.52;
 tube(group,'#66575b',[[.052,.044,-.224],[.121,.033,-.274],[.212,.020,-.323]],.021,'satin');
 for(const x of [-.104,0,.104])oval(group,'#e3be80',.025,.021,.011,x,.151,-.179);
 return turn(group,.52);
}
coffeeCornerColors('desk-rotary','Telephone','拨盘电话',891,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],rotaryPhone);
coffeeCornerColors('color-clay-tub','Playing Clay','彩泥罐',869,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],clayTub);
coffeeCornerColors('toast-marshmallow','Marshmallow','烤棉花糖串',1459,['Pink','White','Yellow'],toastedMarshmallow);
coffeeCornerColors('blush-compact','Blusher','胭脂粉盒',1767,['Yellow','Red','Purple',null,'Green','Grey','Blue','Pink'],blushCompact);
coffeeCornerColors('pet-food-bowl','Cat Bowl','陶瓷猫碗',2370,['Blue','Green','Grey','Orange','Pink','Purple','Red','White'],petFoodBowl);
coffeeCornerColors('satin-eye-mask','Sleeping Band','布眼罩',2299,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],satinEyeMask);
coffeeCornerColors('espresso-cup','Espresso','咖啡杯',2576,['Blue','Green','Grey','Orange','Pink','Purple','White','Yellow'],espressoCup);
coffeeCornerColors('counter-espresso','Coffee Machine','咖啡机',2568,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],espressoMachine);
coffeeCornerRoute(281,/成语册|山野来信/,'bound-country-letter',()=>boundBook({color:'#7f9d76',title:'山野来信',label:'字词读本'}));
coffeeCornerRoute(283,/儿歌册|春日童谣/,'bound-spring-songs',()=>boundBook({color:'#cb95a9',title:'春日童谣',label:'童谣读本'}));

const tidelineEntries=new Map(),tidelineBuilders={};
function tidelineRoute(id,pattern,kind,build){
 tidelineEntries.set(id,[[pattern,kind]]);
 tidelineBuilders[kind]=build;
}
function tidelineColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)tidelineRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function paperRoll(color){
 const group=new THREE.Group();
 const profile=[[.078,-.189],[.208,-.189],[.227,-.171],[.227,.171],[.211,.185],[.078,.185],[.075,-.184]];
 mesh(group,new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),48),color,0,0,0,'matte');
 const core=[[.070,-.191],[.083,-.191],[.083,.190],[.070,.190],[.070,-.191]];
 mesh(group,new THREE.LatheGeometry(core.map(([x,y])=>new THREE.Vector2(x,y)),40),'#ae8867',0,0,0,'matte');
 for(const y of [-.188,.187]){
  for(const r of [.101,.139,.174,.204]){
   const strand=ring(group,'#daccb1',r,.003,0,y,0,'matte');
   strand.rotation.x=Math.PI/2;
  }
 }
 const tail=box(group,color,.253,.012,.314,.009,0,-.146,.226,'matte');
 tail.rotation.x=-.19;
 group.rotation.set(.92,-.15,-.25);
 return group;
}
function hatchling(color){
 const group=new THREE.Group();
 const cracked=[[0,-.195],[.147,-.186],[.231,-.122],[.258,.041],[.237,.065],[.220,.040],[.195,-.130],[.090,-.162],[0,-.166]];
 mesh(group,new THREE.LatheGeometry(cracked.map(([x,y])=>new THREE.Vector2(x,y)),42),'#ebd9b4');
 oval(group,color,.163,.181,.143,0,.091,-.011);
 oval(group,color,.150,.115,.131,0,.159,-.094);
 for(const sign of [-1,1]){
  oval(group,'#66505a',.020,.020,.013,sign*.072,.220,-.197);
  oval(group,color,.069,.041,.082,sign*.144,.068,-.066);
  oval(group,'#d9bd8d',.034,.033,.021,sign*.067,.283,-.015);
 }
 for(let i=0;i<5;i++){
  const a=i*tau/5;
  const shard=mesh(group,new THREE.ConeGeometry(.046,.090,3),'#f0dab6',.227*Math.sin(a),.070,.227*Math.cos(a),'satin');
  shard.rotation.z=.23*Math.cos(a);
 }
 return turn(group,.47);
}
function ceramicCrab(color){
 const group=new THREE.Group();
 const claw='#'+new THREE.Color(color).lerp(new THREE.Color('#ebdab8'),.22).getHexString();
 oval(group,color,.235,.113,.184,0,.015,.051,'glaze',38);
 for(const sign of [-1,1]){
  for(let i=0;i<3;i++){
   const z=.044+i*.092;
   tube(group,color,[[sign*.140,-.012,z],[sign*.244,.006,z+.012],[sign*(.284-i*.020),-.057,z+.079]],.026);
  }
  tube(group,color,[[sign*.177,.011,-.018],[sign*.266,.047,-.094],[sign*.256,.076,-.166]],.039);
  oval(group,claw,.094,.053,.080,sign*.245,.083,-.176);
  oval(group,claw,.048,.039,.047,sign*.244,.095,-.245).rotation.y=sign*.29;
  oval(group,'#ebdcc1',.039,.039,.034,sign*.083,.104,-.090);
  oval(group,'#51454e',.019,.021,.017,sign*.083,.123,-.112);
 }
 return turn(group,.25);
}
function translucentJellyfish(color){
 const group=new THREE.Group();
 const capColor='#'+new THREE.Color(color).lerp(new THREE.Color('#e2eee3'),.34).getHexString();
 const cap=oval(group,capColor,.251,.141,.220,0,0,.003,'ice',40);
 cap.material=new THREE.MeshPhysicalMaterial({color:capColor,roughness:.17,transmission:.35,thickness:.11,clearcoat:.94,clearcoatRoughness:.09});
 const inside=oval(group,color,.176,.093,.152,0,-.021,0,'glaze',28);
 inside.scale.y*=.86;
 const rim=ring(group,'#eadfbe',.201,.016,0,-.043,.006);
 rim.rotation.x=Math.PI/2;
 rim.scale.y=.87;
 for(let i=0;i<6;i++){
  const a=i*tau/6,x=.145*Math.sin(a),z=.120*Math.cos(a);
  tube(group,i%2?'#e7d8b4':capColor,[[x,-.054,z],[x*1.11,-.147,z*1.12],[x*.69+.038,-.214,z*.70],[x*1.28,-.255,z*1.19]],.023,'satin');
 }
 return turn(group,.52);
}
function curvedCandyCane(){
 const group=new THREE.Group(),path=new THREE.CatmullRomCurve3([[.151,0,.322],[.091,0,.107],[.032,0,-.161],[-.035,0,-.250],[-.139,0,-.245],[-.197,0,-.155]].map(v=>new THREE.Vector3(...v)));
 const candy=new THREE.TubeGeometry(path,100,.052,16,false);
 const uv=candy.attributes.uv,colors=[];
 for(let i=0;i<uv.count;i++){
  const band=(uv.getX(i)*9+uv.getY(i))%1;
  colors.push(...new THREE.Color(band<.53?'#bd706e':'#ecddba').toArray());
 }
 candy.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const piece=mesh(group,candy,'#fff');
 piece.material=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.23,clearcoat:.90});
 for(const t of [0,1]){
  const point=path.getPoint(t);
  oval(group,'#c97871',.052,.051,.052,point.x,point.y,point.z);
 }
 return turn(group,.32);
}
function fileFolder(color){
 const group=new THREE.Group(),outline=new THREE.Shape();
 outline.moveTo(-.282,-.310);
 outline.lineTo(.282,-.310);
 outline.lineTo(.282,.289);
 outline.lineTo(.085,.289);
 outline.lineTo(.055,.344);
 outline.lineTo(-.187,.344);
 outline.lineTo(-.216,.289);
 outline.lineTo(-.282,.289);
 outline.closePath();
 extrudedSurface(group,outline,color,-.071,0,.044,.016,'satin');
 box(group,'#e8d4b1',.523,.061,.550,.011,0,.007,-.012,'matte');
 box(group,color,.580,.037,.619,.018,0,.050,.006,'satin');
 box(group,'#e6d4b7',.239,.008,.101,.008,-.051,.074,-.151,'satin');
 for(const z of [-.166,-.137])box(group,'#bfa58c',.151,.004,.008,.002,-.066,.080,z,'matte');
 tube(group,'#ae8c79',[[-.255,.075,.229],[0,.075,.211],[.253,.075,.229]],.010,'ribbon');
 return turn(group,.29);
}
function ceramicPug(color,hue){
 const group=new THREE.Group();
 const snout=hue==='Grey'?'#665e67':'#895e55';
 oval(group,color,.188,.183,.216,0,-.038,.103,'glaze',32);
 oval(group,color,.200,.161,.173,0,.094,-.094,'glaze',34);
 oval(group,snout,.125,.070,.088,0,.129,-.183,'satin');
 oval(group,'#4d414a',.045,.030,.030,0,.176,-.239);
 for(const sign of [-1,1]){
  oval(group,snout,.054,.086,.054,sign*.150,.152,-.048).rotation.z=sign*.61;
  oval(group,'#51434a',.026,.023,.016,sign*.080,.192,-.203);
  oval(group,color,.068,.070,.068,sign*.090,-.151,-.054);
 }
 const curl=ring(group,color,.049,.015,.039,.035,.270,'glaze',tau*.76);
 curl.rotation.y=.31;
 return turn(group,.31);
}
function persianCat(color){
 const group=new THREE.Group();
 oval(group,color,.178,.182,.197,0,-.047,.084,'satin',33);
 oval(group,color,.161,.139,.145,0,.109,-.127,'satin');
 for(const sign of [-1,1]){
  const ear=mesh(group,new THREE.ConeGeometry(.071,.125,3),'#c38e6e',sign*.102,.224,-.083,'satin');
  ear.rotation.z=-sign*.24;
  oval(group,'#776353',.023,.025,.013,sign*.052,.161,-.251);
  oval(group,color,.072,.070,.094,sign*.093,-.124,-.059,'satin');
  for(const z of [-.067,-.008,.051])oval(group,color,.052,.066,.049,sign*.130,.032,z,'satin');
 }
 oval(group,'#b97874',.029,.019,.021,0,.120,-.271,'satin');
 tube(group,color,[[.063,-.073,.241],[.221,-.006,.249],[.257,.094,.193],[.197,.129,.140]],.054,'satin');
 return turn(group,.37);
}
tidelineColors('glaze-jellyfish','Jellyfish','水母玩偶',1550,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],translucentJellyfish);
tidelineColors('soft-paper-roll','Toilet Paper','卷纸',2253,['Blue','Green','Pink','White','Yellow'],paperRoll);
tidelineColors('hatchling-dino','Baby Dino','破壳小恐龙',1273,['Yellow','Red','Purple','Pink'],hatchling);
tidelineColors('ceramic-crab','Crab','小螃蟹',1543,['Blue','Green','Orange','Pink','Purple','Red','Yellow'],ceramicCrab);
tidelineColors('tagged-folder','Document Folder','文件夹',2829,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],fileFolder);
tidelineColors('pet-pug','Pug','巴哥犬',2621,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],ceramicPug);
tidelineColors('persian-figure','Persian Cat','波斯猫',2378,['Brown','Grey','White','Yellow'],persianCat);
tidelineRoute(1187,/立体眼镜|^Movie Glass Black$/,'stereo-glasses-black',()=>stereoGlasses('#554957'));
tidelineRoute(1872,/弯柄糖|^Candy Cane Red$/,'striped-candy-cane',curvedCandyCane);
tidelineRoute(179,/八分音符|^Eighth Note Pink$/,'single-note-pink',()=>eighthNote(palette.Pink));
tidelineRoute(286,/田埂日记/,'bound-field-diary',()=>boundBook({color:'#d5b269',title:'田埂日记',label:'自然笔记'}));

const fairEntries=new Map(),fairBuilders={};
function fairRoute(id,pattern,kind,build){
 fairEntries.set(id,[[pattern,kind]]);
 fairBuilders[kind]=build;
}
function fairColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)fairRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function ceramicOwl(color){
 const group=new THREE.Group();
 oval(group,color,.209,.179,.225,0,-.023,.071,'glaze',34);
 oval(group,color,.218,.146,.175,0,.117,-.083,'glaze',34);
 for(const sign of [-1,1]){
  const tuft=mesh(group,new THREE.ConeGeometry(.071,.120,5),color,sign*.135,.235,-.134);
  tuft.rotation.z=-sign*.42;
  oval(group,'#e6d1a5',.087,.045,.078,sign*.085,.205,-.135);
  oval(group,'#584756',.034,.026,.039,sign*.084,.245,-.146);
  oval(group,color,.065,.059,.139,sign*.188,.019,.095).rotation.y=-sign*.26;
  oval(group,'#d5a66e',.053,.037,.064,sign*.092,-.103,.229);
 }
 oval(group,'#ce9b68',.043,.029,.047,0,.198,-.088);
 for(const x of [-.07,0,.07])oval(group,'#e0c59e',.021,.014,.043,x,.144,.107);
 return turn(group,.42);
}
function mungBeanSack(){
 const group=new THREE.Group();
 const canvas=oval(group,'#c4a883',.241,.177,.258,0,-.047,.024,'ribbon',36);
 canvas.rotation.z=.12;
 const throat=oval(group,'#d7bc90',.179,.113,.158,0,.086,-.070,'ribbon');
 throat.rotation.x=-.31;
 const cuff=ring(group,'#b49068',.131,.028,0,.169,-.082,'ribbon');
 cuff.rotation.x=Math.PI/2-.15;
 for(let i=0;i<18;i++){
  const a=i*2.39996,r=.091*Math.sqrt(i/18);
  oval(group,i%3?'#8d9c62':'#a6ae75',.032,.022,.023,Math.cos(a)*r,.175+i%2*.017,-.082+Math.sin(a)*r,'satin',16);
 }
 tube(group,'#b2946e',[[-.174,.109,-.038],[-.073,.106,.053],[.086,.109,.056],[.182,.110,-.025]],.014,'ribbon');
 return turn(group,.42);
}
function shaveBrush(color){
 const group=new THREE.Group();
 const grip=[[0,-.255],[.086,-.255],[.117,-.226],[.134,-.172],[.095,-.080],[.116,.010],[0,.013]];
 mesh(group,new THREE.LatheGeometry(grip.map(([x,y])=>new THREE.Vector2(x,y)),40),color);
 disk(group,'#d2b78a',.103,.111,.051,0,.023,0,'metal');
 oval(group,'#b49b81',.144,.154,.146,0,.139,0,'satin',32);
 for(let i=0;i<16;i++){
  const a=i*tau/16,x=Math.cos(a),z=Math.sin(a);
  tube(group,'#d8c19e',[[x*.104,.065,z*.104],[x*.142,.149,z*.142],[x*.092,.236,z*.092]],.006,'ribbon');
 }
 return turn(group,.78);
}
function clownFish(){
 const group=new THREE.Group();
 const body=oval(group,'#d38b50',.292,.144,.154,-.016,.006,0,'glaze',44);
 const pos=body.geometry.attributes.position,colors=[];
 const orange=new THREE.Color('#d88c54'),ivory=new THREE.Color('#f4dfb9'),edge=new THREE.Color('#a56c50');
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),distance=Math.min(Math.abs(x+.34),Math.abs(x-.45));
  colors.push(...(distance<.103?ivory:distance<.153?edge:orange).toArray());
 }
 body.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 body.material=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.26,clearcoat:.87});
 for(const sign of [-1,1]){
  oval(group,'#e4ac65',.104,.029,.065,.236,.002,sign*.091).rotation.y=sign*.45;
  oval(group,'#e8bc7a',.080,.035,.018,-.043,.055,sign*.136).rotation.y=sign*.35;
  oval(group,'#eee1bb',.038,.032,.022,-.212,.072,sign*.083);
  oval(group,'#514653',.019,.020,.014,-.225,.081,sign*.098);
 }
 oval(group,'#dfa062',.128,.063,.024,.031,.128,0).rotation.z=.22;
 return turn(group,.40);
}
function peacockFan(color){
 const group=new THREE.Group();
 for(let i=-4;i<=4;i++){
  const a=i*.215,x=Math.sin(a)*.370,z=-.142-.256*Math.cos(a);
  const leaf=oval(group,i%2?color:'#aeada0',.062,.026,.215,x*.71,-.018,z*.70,'glaze',24);
  leaf.rotation.y=a;
  oval(group,'#d4b579',.040,.017,.053,x*.80,.011,z*.79);
  oval(group,'#79a3a3',.024,.010,.034,x*.82,.022,z*.81);
 }
 oval(group,color,.122,.097,.210,0,.057,.067,'glaze',32);
 tube(group,color,[[0,.072,.081],[0,.122,.200],[0,.208,.219]],.058);
 oval(group,color,.080,.070,.076,0,.222,.220);
 oval(group,'#c69b67',.037,.024,.050,0,.223,.288);
 for(const x of [-.036,.036])oval(group,'#5f5155',.014,.013,.016,x,.244,.269);
 return turn(group,.32);
}
function eclair(color){
 const group=new THREE.Group();
 box(group,'#c08c62',.690,.182,.264,.085,0,-.056,0,'matte');
 box(group,'#e5c38c',.658,.057,.251,.030,0,.025,0,'satin');
 box(group,color,.694,.111,.273,.054,0,.096,0);
 for(const x of [-.184,-.061,.061,.184])tube(group,'#e7c5a4',[[x-.019,.144,-.088],[x+.008,.163,0],[x-.023,.145,.088]],.008,'satin');
 return turn(group,.26);
}
fairColors('ceramic-owl','Owl','猫头鹰摆件',2086,['Blue',null,'Green','Pink','Red',null,'Yellow'],ceramicOwl);
fairColors('shave-brush','Shaving Brush','剃须刷',2719,['Blue','Brown','Green','Grey','Orange','Pink','Purple','Red','White','Yellow'],shaveBrush);
fairColors('peacock-fan','Peacock','开屏孔雀',2093,['Blue','White'],peacockFan);
fairColors('glazed-eclair','Eclair','闪电泡芙',2777,['Orange','Pink','Purple','Red','White','Yellow'],eclair);
fairRoute(368,/米绳粽子/,'rice-dumpling-natural',()=>riceDumpling('#d9bd91'));
fairRoute(1410,/绿豆布袋/,'mung-bean-sack',mungBeanSack);
fairRoute(2871,/小丑鱼摆件|^Clown Fish Orange$/,'glazed-clownfish',clownFish);

const paradeEntries=new Map(),paradeBuilders={};
function paradeRoute(id,pattern,kind,build){
 paradeEntries.set(id,[[pattern,kind]]);
 paradeBuilders[kind]=build;
}
function paradeColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)paradeRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function littleCorgi(color){
 const group=new THREE.Group();
 oval(group,color,.190,.125,.236,0,-.031,.105,'glaze',32);
 oval(group,color,.174,.143,.156,0,.089,-.117,'glaze',32);
 oval(group,'#e7ceb1',.121,.064,.107,0,.094,-.179);
 for(const sign of [-1,1]){
  const ear=mesh(group,new THREE.ConeGeometry(.079,.153,6),color,sign*.114,.225,-.130);
  ear.rotation.z=sign*.20;
  const inner=mesh(group,new THREE.ConeGeometry(.043,.082,4),'#e2aaa0',sign*.119,.226,-.174,'satin');
  inner.rotation.z=sign*.20;
  oval(group,'#604c54',.021,.019,.013,sign*.068,.156,-.239);
  for(const z of [-.088,.205])oval(group,color,.057,.065,.066,sign*.110,-.103,z);
 }
 oval(group,'#635153',.034,.023,.022,0,.116,-.272);
 oval(group,'#efdcbd',.079,.045,.055,0,-.020,.318);
 return turn(group,.38);
}
function softDragon(color){
 const group=new THREE.Group();
 oval(group,color,.159,.138,.239,0,-.030,.057,'ribbon',32);
 oval(group,color,.168,.147,.144,0,.051,-.174,'satin',32);
 oval(group,'#e9c99d',.105,.052,.093,0,.081,-.244,'satin');
 for(const sign of [-1,1]){
  oval(group,'#6a5158',.020,.020,.013,sign*.086,.119,-.285);
  oval(group,color,.068,.037,.127,sign*.159,-.018,.051,'ribbon').rotation.y=sign*.36;
  oval(group,'#ead0a3',.035,.074,.031,sign*.065,.178,-.111,'ribbon');
  oval(group,color,.054,.043,.076,sign*.088,-.122,.141,'ribbon');
 }
 tube(group,color,[[0,-.070,.209],[.084,-.062,.303],[.168,.017,.328],[.199,.057,.261]],.044,'ribbon');
 for(const z of [-.007,.079,.167])oval(group,'#e1bf91',.028,.039,.044,0,.104-.2*z,z,'satin');
 return turn(group,.39);
}
function kitchenWhisk(color){
 const group=new THREE.Group();
 const handle=disk(group,color,.069,.055,.345,0,-.002,.221);
 handle.rotation.x=Math.PI/2;
 box(group,'#e4c895',.102,.020,.118,.008,0,.070,.242,'satin');
 const trim=disk(group,'#bdac9d',.070,.067,.085,0,.004,.036,'metal');
 trim.rotation.x=Math.PI/2;
 for(let i=0;i<6;i++){
  const a=i*Math.PI/6,x=Math.cos(a),y=Math.sin(a);
  tube(group,'#c1b5aa',[[0,0,.008],[.131*x,.131*y,-.133],[.101*x,.101*y,-.267],[0,0,-.353],[-.101*x,-.101*y,-.267],[-.131*x,-.131*y,-.133],[0,0,.008]],.010,'metal');
 }
 return turn(group,.31);
}
function beachParasol(color,hue){
 const group=new THREE.Group();
 const shades=['#e9c075','#cd8b78','#7ca6ac','#b4b57e','#e9c075','#cd8b78','#7ca6ac','#b4b57e'];
 const panels=8;
 for(let i=0;i<panels;i++){
  const a=tau*i/panels;
  const panel=new THREE.SphereGeometry(1,6,8,a,tau/panels,0,Math.PI*.46);
  const canopy=mesh(group,panel,hue==='Colorful'?shades[i]:color,0,.053,0,'satin');
  canopy.scale.set(.315,.172,.315);
  tube(group,'#e4cb93',[[0,.224,0],[.206*Math.cos(a),.174,.206*Math.sin(a)],[.310*Math.cos(a),.066,.310*Math.sin(a)]],.009,'ribbon');
 }
 disk(group,'#c1a27a',.019,.025,.535,0,-.104,0,'satin');
 oval(group,'#eccb8d',.034,.035,.033,0,.229,0,'glaze');
 return turn(group,.74);
}
function scarfGrandma(color){
 const group=new THREE.Group();
 oval(group,color,.213,.175,.223,0,-.026,.093,'satin',32);
 oval(group,'#e6c29d',.147,.136,.153,0,.091,-.103,'matte',30);
 oval(group,'#bda6a0',.154,.100,.092,0,.190,-.050,'satin');
 oval(group,'#aba09b',.080,.069,.072,0,.245,-.018,'satin');
 for(const sign of [-1,1]){
  const lens=ring(group,'#947169',.039,.008,sign*.052,.158,-.225,'metal');
  lens.scale.y=.80;
  oval(group,'#604d52',.018,.020,.012,sign*.051,.160,-.238);
 }
 tube(group,'#efca98',[[-.154,.023,-.035],[-.079,.122,-.039],[.079,.122,-.042],[.154,.023,-.031]],.036,'ribbon');
 box(group,'#e0b487',.082,.028,.202,.023,.059,.127,.111,'ribbon').rotation.y=.26;
 return turn(group,.41);
}
function pumpkinCart(color){
 const group=new THREE.Group();
 for(let i=0;i<8;i++){
  const a=i*tau/8,x=.104*Math.cos(a),z=.111*Math.sin(a);
  const segment=oval(group,color,.178,.173,.185,x,.043,z,'glaze',24);
  segment.rotation.y=a;
 }
 box(group,'#8da7a1',.129,.105,.012,.017,0,.065,-.287,'ice');
 box(group,'#b79973',.346,.043,.302,.013,0,-.137,0,'satin');
 for(const z of [-.110,.136])for(const sign of [-1,1]){
  disk(group,'#bc976a',.080,.080,.041,sign*.195,-.145,z,'glaze').rotation.z=Math.PI/2;
  disk(group,'#e2c48f',.027,.027,.045,sign*.202,-.143,z,'metal').rotation.z=Math.PI/2;
 }
 tube(group,'#819371',[[0,.198,0],[.010,.267,-.003],[.068,.283,.025]],.026,'satin');
 return turn(group,.46);
}
function sesameBagel(){
 const group=new THREE.Group();
 const bread=ring(group,'#ba8252',.209,.101,0,0,0,'matte');
 bread.rotation.x=Math.PI/2;
 const top=ring(group,'#d6a86f',.208,.083,0,.021,0,'satin');
 top.rotation.x=Math.PI/2;
 for(let i=0;i<23;i++){
  const a=i*2.39996,r=.193+.042*Math.sin(i*6.1);
  oval(group,i%3?'#e6c18a':'#f0d6a4',.021,.007,.009,r*Math.cos(a),.107,r*Math.sin(a),'matte',12).rotation.y=i*.4;
 }
 return turn(group,.31);
}
function grainCouponBox(){
 const group=new THREE.Group();
 box(group,'#a4705a',.484,.161,.606,.040,0,-.026,0,'satin');
 box(group,'#bd8868',.496,.046,.612,.025,0,.062,0);
 printed(group,.399,.465,0,.088,0,(c,size)=>{
  c.fillStyle='#e9d5a8';c.fillRect(0,0,size,size);
  c.strokeStyle='#b78562';c.lineWidth=19;c.strokeRect(33,31,446,448);
  c.fillStyle='#875747';c.font='bold 97px sans-serif';c.textAlign='center';printInk(c,'粮票',256,279);
 });
 box(group,'#dbb47e',.126,.044,.026,.009,0,.004,.316,'metal');
 return turn(group,.34);
}
paradeColors('little-corgi','Corgi','柯基',2599,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],littleCorgi);
paradeColors('soft-dragon','Dragon','布龙',2107,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],softDragon);
paradeColors('kitchen-whisk','Whisk','打蛋器',1829,['Blue','Orange','Green','Grey','Pink','Purple',null,'Yellow'],kitchenWhisk);
paradeColors('scarf-grandma','Grandma Wally','围巾奶奶',2138,['Green','Grey','Orange','Pink','Purple','Red','Yellow'],scarfGrandma);
paradeColors('pumpkin-cart','Pumpkin Vehicle','南瓜小车',2145,['Blue','Green','Pink','Purple','White','Yellow'],pumpkinCart);
paradeRoute(1318,/遮阳伞|^Parasol Colorful$/,'striped-parasol',()=>beachParasol(null,'Colorful'));
paradeRoute(2392,/贝果|^Bagel Brown$/,'sesame-bagel',sesameBagel);
paradeRoute(1416,/粮票盒/,'grain-coupon-box',grainCouponBox);
paradeRoute(285,/西游故事/,'bound-westward-tales',()=>boundBook({color:'#af6c63',title:'西游故事',label:'故事读本'}));

const transitEntries=new Map(),transitBuilders={};
function transitRoute(id,pattern,kind,build){
 const routes=transitEntries.get(id)??[];
 routes.push([pattern,kind]);
 transitEntries.set(id,routes);
 transitBuilders[kind]=build;
}
function transitColors(prefix,english,localized,start,hues,build){
 for(const [offset,hue] of hues.entries()){
  if(hue)transitRoute(start+offset,new RegExp(localized+'|^'+english+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function soaringBird(color){
 const group=new THREE.Group(),feather=new THREE.Shape();
 feather.moveTo(0,-.11);
 feather.quadraticCurveTo(.155,-.292,.346,-.169);
 feather.quadraticCurveTo(.317,-.064,.207,.009);
 feather.quadraticCurveTo(.139,.028,.021,.099);
 feather.closePath();
 for(const sign of [-1,1]){
  const wing=extrudedSurface(group,feather,color,-.010,0,.057,.022,'glaze');
  wing.scale.x=sign;
  for(let i=0;i<4;i++){
   tube(group,'#cfb389',[[sign*.16,.060,-.074],[sign*(.20+i*.022),.071,-.149],[sign*(.236+i*.020),.053,-.183]],.005,'satin');
  }
 }
 oval(group,color,.129,.115,.250,0,-.012,.025,'glaze',34);
 oval(group,'#eddbb5',.107,.100,.100,0,.054,-.207);
 oval(group,'#d2a56a',.051,.036,.071,0,.043,-.292);
 for(const x of [-.053,.053])oval(group,'#64535a',.015,.014,.015,x,.089,-.282);
 box(group,color,.174,.034,.194,.027,0,-.038,.247);
 return turn(group,.37);
}
function boardingPass(color){
 const group=new THREE.Group();
 box(group,'#dfc6a0',.755,.053,.414,.024,0,-.007,0,'matte');
 const pass=printed(group,.726,.389,0,.020,0,(c,size)=>{
  c.fillStyle='#f1dfb8';c.fillRect(0,0,size,size);
  c.fillStyle=color;c.fillRect(0,0,size,127);c.fillRect(367,0,145,size);
  c.fillStyle='#6e5248';c.font='bold 61px sans-serif';printInk(c,'登机牌',37,90);
  c.font='42px monospace';printInk(c,'08 A',37,268);
  for(let i=0;i<21;i++){
   c.lineWidth=i%3+1;c.strokeStyle='#6e594e';c.beginPath();c.moveTo(43+i*12,339);c.lineTo(43+i*12,443);c.stroke();
  }
  c.strokeStyle='#f0ddae';c.lineWidth=12;
  c.beginPath();c.moveTo(429,207);c.lineTo(429,345);c.moveTo(395,287);c.lineTo(477,247);c.stroke();
 });
 pass.material.roughness=.76;
 for(let i=0;i<7;i++)oval(group,'#bca283',.008,.003,.009,.164,.024,(i-3)*.049,'matte',12);
 return turn(group,.26);
}
function pinkFlamingo(){
 const group=new THREE.Group(),color='#d597a2';
 disk(group,'#d3af84',.162,.170,.043,0,-.232,.033,'satin');
 for(const sign of [-1,1])tube(group,'#c2868a',[[sign*.043,-.219,.051],[sign*.062,-.115,.069],[sign*.037,-.013,.097]],.015,'satin');
 oval(group,color,.141,.120,.188,0,.043,.081,'glaze',32);
 oval(group,'#e1acaa',.099,.047,.145,.071,.126,.104);
 tube(group,color,[[0,.040,-.026],[0,.024,-.133],[0,.118,-.203],[0,.235,-.174],[0,.258,-.095],[0,.193,-.065]],.042);
 oval(group,color,.062,.060,.078,0,.194,-.064);
 oval(group,'#ead7b1',.036,.038,.056,0,.163,-.005);
 oval(group,'#695158',.032,.022,.032,0,.132,.027,'glaze');
 for(const x of [-.044,.044])oval(group,'#6c505a',.012,.012,.009,x,.219,-.049);
 return turn(group,.52);
}
function markerPen(color){
 const group=new THREE.Group();
 box(group,color,.221,.146,.708,.044,0,-.012,.009);
 box(group,'#82706a',.221,.128,.252,.035,0,-.012,-.251,'satin');
 box(group,color,.057,.030,.191,.012,.061,.080,-.262);
 box(group,'#ebd8b5',.150,.010,.161,.012,0,.067,.137,'satin');
 for(const z of [.088,.150,.218])box(group,color,.105,.006,.012,.004,0,.074,z);
 return turn(group,.30);
}
function winterSnowman(color){
 const group=new THREE.Group(),white='#e5d9c2';
 oval(group,white,.231,.180,.212,0,-.078,.078);
 oval(group,white,.166,.150,.163,0,.114,-.066,'glaze',34);
 disk(group,color,.169,.168,.042,0,.214,-.087,'satin');
 disk(group,color,.127,.146,.091,0,.275,-.088);
 oval(group,'#e5c988',.037,.031,.037,0,.326,-.088,'satin');
 const scarf=ring(group,color,.142,.025,0,.031,-.042,'ribbon');
 scarf.rotation.x=Math.PI/2;
 for(const sign of [-1,1]){
  oval(group,'#5c4a51',.017,.021,.012,sign*.055,.153,-.220);
  tube(group,'#b29975',[[sign*.176,-.022,.091],[sign*.264,.017,.014],[sign*.296,.092,-.039]],.016,'satin');
 }
 oval(group,'#d59a67',.027,.025,.064,0,.116,-.246);
 return turn(group,.48);
}
function sportDuffle(color){
 const group=new THREE.Group();
 box(group,color,.612,.252,.331,.106,0,-.022,0,'satin');
 for(const x of [-.224,.224]){
  box(group,'#ab8976',.069,.250,.336,.063,x,-.025,0,'ribbon');
  tube(group,color,[[x,.087,-.118],[x,.192,-.066],[x,.201,.073],[x,.087,.121]],.018,'ribbon');
 }
 box(group,'#e0c29b',.295,.023,.167,.023,0,.104,-.003,'ribbon');
 tube(group,'#b99876',[[-.260,.048,.149],[0,.089,.179],[.260,.044,.151]],.012,'metal');
 box(group,'#e8d7af',.108,.012,.064,.006,0,.124,.043,'satin');
 return turn(group,.36);
}
function frontWasher(color){
 const group=new THREE.Group();
 box(group,color,.491,.555,.404,.056,0,0,0);
 const frame=ring(group,'#dfcbac',.163,.037,0,-.038,-.215);
 frame.rotation.z=.030;
 oval(group,'#627d8b',.141,.144,.029,0,-.035,-.222,'ice');
 oval(group,'#87a6ab',.115,.052,.021,0,-.089,-.237,'ice');
 box(group,'#786a69',.158,.053,.025,.013,-.107,.191,-.204,'satin');
 for(const x of [.026,.104,.161])oval(group,'#e1bb7d',.026,.024,.012,x,.189,-.209);
 for(const x of [-.157,.157])box(group,'#7c6e69',.083,.041,.297,.017,x,-.287,0,'satin');
 turn(group,-.36);
 group.rotateY(Math.PI);
 return group;
}
transitColors('soaring-eagle','Vulture','鹰鸟摆件',2103,[null,'Brown','White'],soaringBird);
transitRoute(2103,/鹰鸟摆件|^Vulture Black$/,'soaring-eagle-black',()=>soaringBird('#584f58'));
transitColors('boarding-pass','Plane Ticket','登机牌',2330,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],boardingPass);
transitColors('marker-pen','Highlighter','荧光笔',319,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],markerPen);
transitColors('winter-snowman','Snowman','雪人',2051,['Blue','Green','Grey','Orange','Purple','Red','White','Yellow'],winterSnowman);
transitColors('sport-duffle','Gym Bag','手提运动包',2173,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],sportDuffle);
transitColors('travel-plane','Air Plane','玩具飞机',2306,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],toyPlane);
transitColors('front-washer','Washing Machine','滚筒洗衣机',2274,['Blue','Green','Grey','Orange','Pink','Purple','Red','White','Yellow'],frontWasher);
transitRoute(2084,/火烈鸟|^Flamingo Pink$/,'pink-flamingo',pinkFlamingo);
transitRoute(2101,/大嘴鸟|^Toucan Blue$/,'toucan-figure-blue',()=>longBeakBird('#709cb3','#dfb170'));

const pantryPlusEntries=new Map(),pantryPlusBuilders={};
function pantryPlusRoute(id,pattern,kind,build){
 const routes=pantryPlusEntries.get(id)??[];
 routes.push([pattern,kind]);
 pantryPlusEntries.set(id,routes);
 pantryPlusBuilders[kind]=build;
}
function pantryPlusColors(prefix,en,cn,pairs,build){
 for(const [id,hue] of pairs)pantryPlusRoute(id,new RegExp(cn+'|^'+en+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
}
function compactKeyboard(color){
 const g=new THREE.Group();
 box(g,color,.711,.106,.395,.046,0,-.020,0);
 box(g,'#ecdbc0',.675,.039,.359,.026,0,.035,0,'satin');
 for(let row=0;row<4;row++){
  for(let col=0;col<10;col++){
   if(row===3&&col>=2&&col<=6)continue;
   const x=(col-4.5)*.061,z=(row-1.5)*.076;
   box(g,col===0||col===9?color:'#f5ead7',.051,.040,.056,.010,x,.064,z);
  }
 }
 box(g,color,.293,.044,.058,.013,-.030,.063,.116);
 for(const x of [-.225,.225])box(g,'#786d65',.103,.024,.250,.015,x,-.077,0,'satin');
 return turn(g,1.46);
}
function barberSeat(color){
 const g=new THREE.Group();
 disk(g,'#c6aa83',.205,.227,.059,0,-.279,0,'metal');
 disk(g,'#d9bb90',.065,.072,.211,0,-.166,0,'metal');
 box(g,color,.420,.121,.392,.050,0,-.028,-.045);
 box(g,'#f5ddba',.373,.062,.330,.026,0,.032,-.076,'satin');
 box(g,color,.380,.344,.123,.056,0,.179,.153).rotation.x=.19;
 for(const x of [-.218,.218]){
  tube(g,'#d2b58d',[[x,-.018,.091],[x,.097,.066],[x,.107,-.117]],.020,'metal');
  box(g,color,.091,.058,.241,.026,x,.110,-.023);
 }
 box(g,'#cdb08e',.260,.050,.130,.022,0,-.163,-.285,'metal');
 tube(g,'#b99777',[[0,-.099,-.169],[0,-.160,-.230],[0,-.164,-.290]],.022,'metal');
 return turn(g,.61);
}
function ceramicWalrus(color){
 const g=new THREE.Group();
 oval(g,color,.224,.147,.257,0,-.070,.090,'glaze',35);
 oval(g,color,.162,.154,.148,0,.069,-.126,'glaze',32);
 for(const sign of [-1,1]){
  oval(g,color,.106,.057,.125,sign*.185,-.102,-.062,'glaze').rotation.y=sign*.44;
  oval(g,'#e1c4a0',.075,.061,.055,sign*.056,.093,-.239,'satin');
  oval(g,'#514655',.021,.023,.013,sign*.065,.162,-.242);
  tube(g,'#f2dfb9',[[sign*.058,.061,-.278],[sign*.058,-.015,-.293],[sign*.047,-.063,-.271]],.016,'satin');
  for(const [x,y] of [[.045,.111],[.068,.102],[.087,.119]])oval(g,'#a58877',.006,.006,.007,sign*x,y,-.286,'satin');
  oval(g,color,.093,.031,.120,sign*.059,-.104,.288).rotation.y=sign*.30;
 }
 oval(g,'#77606a',.047,.022,.021,0,.126,-.288);
 return turn(g,.46);
}
function siameseFigurine(color){
 const g=new THREE.Group(),face='#836458';
 oval(g,color,.150,.168,.196,0,-.055,.100,'glaze',33);
 oval(g,color,.134,.126,.136,0,.105,-.109,'glaze',33);
 oval(g,face,.095,.067,.049,0,.097,-.226,'satin');
 for(const sign of [-1,1]){
  const ear=mesh(g,new THREE.ConeGeometry(.074,.155,4),face,sign*.100,.223,-.087,'satin');
  ear.rotation.z=-sign*.29;
  oval(g,'#80bac5',.021,.024,.014,sign*.050,.139,-.232,'ice');
  oval(g,'#514857',.008,.016,.009,sign*.051,.139,-.243);
  oval(g,face,.049,.052,.078,sign*.074,-.138,-.064);
 }
 oval(g,'#bd8580',.023,.014,.014,0,.103,-.273);
 tube(g,face,[[.042,-.079,.238],[.181,-.076,.260],[.224,-.005,.204],[.220,.060,.145]],.043,'glaze');
 return turn(g,.41);
}
function schnauzerFigurine(color){
 const g=new THREE.Group(),beard='#e8d8bd';
 oval(g,color,.141,.149,.222,0,-.071,.081,'glaze',32);
 oval(g,color,.151,.135,.119,0,.059,-.140,'glaze',30);
 oval(g,beard,.113,.079,.085,0,-.001,-.240,'satin');
 box(g,'#5f5056',.070,.044,.045,.019,0,.032,-.303);
 for(const sign of [-1,1]){
  oval(g,color,.057,.103,.056,sign*.125,.114,-.111,'glaze').rotation.z=sign*.33;
  oval(g,beard,.045,.020,.026,sign*.063,.125,-.232,'satin').rotation.z=sign*.17;
  oval(g,'#615158',.018,.019,.011,sign*.066,.092,-.250);
  for(const z of [-.037,.186])oval(g,color,.058,.081,.059,sign*.096,-.154,z);
  for(let i=0;i<3;i++)tube(g,'#cbb69c',[[sign*(.021+i*.021),-.006,-.309],[sign*(.025+i*.019),-.056,-.296]],.004,'satin');
 }
 tube(g,color,[[0,-.023,.252],[.024,.042,.309],[.036,.106,.289]],.035);
 return turn(g,.36);
}
function woodenChopBoard(){
 const g=new THREE.Group(),shape=new THREE.Shape();
 shape.moveTo(-.239,-.271);
 shape.quadraticCurveTo(-.284,-.271,-.284,-.221);
 shape.lineTo(-.284,.282);
 shape.quadraticCurveTo(-.284,.326,-.237,.326);
 shape.lineTo(.237,.326);
 shape.quadraticCurveTo(.284,.326,.284,.282);
 shape.lineTo(.284,-.221);
 shape.quadraticCurveTo(.284,-.271,.239,-.271);
 shape.lineTo(.069,-.271);
 shape.lineTo(.062,-.402);
 shape.quadraticCurveTo(0,-.440,-.062,-.402);
 shape.lineTo(-.069,-.271);
 shape.closePath();
 extrudedSurface(g,shape,'#c29767',-.045,0,.088,.020,'satin');
 printed(g,.511,.545,0,.063,.027,(c)=>{
  c.fillStyle='#dab085';c.fillRect(0,0,512,512);
  for(let i=0;i<38;i++){
   const x=(i*79)%512;
   c.beginPath();c.moveTo(x,-12);c.bezierCurveTo(x+15,144,x-27,329,x+9,533);
   c.strokeStyle=i%5===0?'#bd8d61':'#d0a77c';c.lineWidth=i%5===0?2.2:1.15;c.stroke();
  }
 });
 const eye=ring(g,'#a17854',.023,.008,0,.058,-.372,'satin');eye.rotation.x=Math.PI/2;
 return turn(g,.37);
}
function riceClothBag(color,title){
 const g=new THREE.Group();
 oval(g,color,.204,.228,.146,0,-.048,.012,'satin',36);
 oval(g,color,.116,.062,.071,0,.153,.001,'satin');
 box(g,'#d7ad78',.221,.046,.162,.021,0,.143,0,'ribbon');
 const tag=box(g,'#f0dcb2',.167,.128,.023,.012,0,-.021,-.146,'satin');
 const label=printed(g,.147,.105,0,0,0,(c)=>{
  c.fillStyle='#f0dcb2';c.fillRect(0,0,512,512);c.fillStyle='#765b42';
  c.font='bold 145px sans-serif';c.textAlign='center';printInk(c,title,256,310);
 });
 tag.add(label);label.position.z=-.013;label.rotation.set(0,Math.PI,0);
 for(const sign of [-1,1])tube(g,'#ecd4ad',[[sign*.138,.097,-.062],[sign*.175,-.064,-.066],[sign*.135,-.193,-.073]],.008,'ribbon');
 turn(g,-.31);
 g.rotateY(Math.PI);
 return g;
}
function riceScale(){
 const g=new THREE.Group();
 box(g,'#91ae7a',.394,.202,.335,.044,0,-.087,0);
 ring(g,'#ebd6ad',.068,.010,0,-.081,-.177);
 oval(g,'#f5e2bc',.067,.065,.015,0,-.081,-.179);
 tube(g,'#ad7767',[[0,-.082,-.194],[.023,-.049,-.194]],.0045,'satin');
 disk(g,'#c4a47b',.055,.074,.107,0,.045,0,'metal');
 mesh(g,new THREE.LatheGeometry([[.002,.085],[.095,.082],[.158,.108],[.205,.164],[.218,.190],[.207,.195],[.183,.165],[.143,.113]].map(([x,y])=>new THREE.Vector2(x,y)),43),'#dfc498',0,0,0,'glaze');
 turn(g,-.48);
 g.rotateY(Math.PI);
 return g;
}
function bambooSieve(){
 const g=new THREE.Group();
 const lip=ring(g,'#bea17a',.261,.018,0,.076,0,'satin');lip.rotation.x=Math.PI/2;
 const heel=ring(g,'#b18b60',.227,.013,0,-.076,0,'satin');heel.rotation.x=Math.PI/2;
 for(let i=-10;i<=10;i++){
  const cross=i*.021,length=2*Math.sqrt(.226*.226-cross*cross);
  box(g,i%2===0?'#dfbf91':'#c8a779',length,.010,.013,.004,0,-.062,cross,'ribbon');
  box(g,i%2===0?'#bf9a6d':'#d5b080',.013,.011,length,.004,cross,-.052,0,'ribbon');
 }
 for(let i=0;i<28;i++){
  const angle=i*tau/28,c=Math.cos(angle),s=Math.sin(angle);
  tube(g,i%2===0?'#c9a476':'#cfad82',[[c*.227,-.075,s*.227],[c*.244,0,s*.244],[c*.256,.073,s*.256]],.011,'ribbon');
 }
 return turn(g,.46);
}
function boxGrater(color){
 const g=new THREE.Group();
 box(g,color,.281,.357,.223,.042,0,-.030,0);
 const cutter=box(g,'#c5b5a1',.218,.282,.037,.025,0,-.025,.115,'metal');
 const face=printed(g,.198,.263,0,0,0,c=>{
  const steel=c.createLinearGradient(0,0,512,440);
  steel.addColorStop(0,'#958d85');steel.addColorStop(.47,'#ebddca');steel.addColorStop(1,'#a89d93');
  c.fillStyle=steel;c.fillRect(0,0,512,512);
  for(let i=0;i<5;i++)for(let j=0;j<4;j++){
   const x=76+j*111+(i%2)*21,y=55+i*99;
   c.beginPath();c.ellipse(x,y,26,13,0,0,tau);c.fillStyle='#716967';c.fill();
   c.beginPath();c.ellipse(x,y-8,24,7,0,0,tau);c.fillStyle='#f6e6cf';c.fill();
  }
 });
 cutter.add(face);face.position.z=.021;face.rotation.set(0,0,0);
 tube(g,color,[[-.095,.144,0],[-.093,.218,0],[0,.240,0],[.093,.218,0],[.095,.144,0]],.028);
 box(g,color,.295,.045,.253,.018,0,-.226,0);
 return turn(g,-.46);
}
pantryPlusColors('compact-keyboard','Computer Keyboard','键盘',[[2805,'Blue'],[2807,'Green'],[2808,'Grey'],[2809,'Pink'],[2810,'Purple'],[2811,'Red'],[2812,'Yellow']],compactKeyboard);
pantryPlusColors('barber-seat','Barber Chair','理发椅',[[2671,'Blue'],[2672,'Green'],[2674,'Orange'],[2675,'Pink'],[2676,'Purple'],[2678,'Yellow']],barberSeat);
pantryPlusColors('ceramic-walrus','Walrus','海象',[[2066,'Blue'],[2067,'Grey'],[2068,'Blue'],[2071,'White'],[2072,'Orange'],[2074,'Red'],[2075,'Yellow']],ceramicWalrus);
pantryPlusColors('siamese-figure','Siamese Cat','暹罗猫',[[2382,'Brown'],[2383,'Yellow']],siameseFigurine);
pantryPlusColors('schnauzer-figure','Schnauser','雪纳瑞',[[2631,'Green'],[2632,'Orange'],[2633,'Pink'],[2634,'Purple'],[2635,'Red'],[2636,'White'],[2637,'Yellow']],schnauzerFigurine);
pantryPlusColors('elephant-figure','Elephant','小象',[[924,'Blue']],elephant);
pantryPlusColors('mini-road-car','Minicar','迷你.*车',[[1991,'Blue'],[1992,'Green'],[1993,'Grey'],[1995,'Purple'],[1996,'Pink'],[1998,'Yellow']],color=>roadCar(color));
pantryPlusColors('single-note','Eighth Note','八分音符',[[175,'Blue'],[177,'Orange'],[178,'Purple'],[180,'Red'],[181,'Yellow']],eighthNote);
pantryPlusColors('box-grater','Grater','擦丝器',[[1799,'Blue'],[1800,'Brown'],[1801,'Green'],[1803,'Pink'],[1804,'Purple'],[1805,'Red'],[1806,'Yellow']],boxGrater);
pantryPlusRoute(1414,/竹筛/,'woven-bamboo-sieve',bambooSieve);
pantryPlusRoute(177,/搭扣零钱包/,'counter-coin-purse',coinPurse);
pantryPlusRoute(175,/红边杯/,'red-rim-cup',()=>glazedMug('#cf7b73'));
pantryPlusRoute(178,/汽水瓶/,'purple-soda-bottle',()=>sodaBottle(palette.Purple));
pantryPlusRoute(280,/西游/,'bound-journey-west',()=>boundBook({color:'#996b54',title:'西游记',label:'古典故事'}));
pantryPlusRoute(280,/街角小店|^Book Brown$/,'bound-corner-store',()=>boundBook({color:'#a77150',title:'街角小店',label:'生活读本'}));
pantryPlusRoute(282,/唐诗/,'bound-tang-poetry',()=>boundBook({color:'#d09a60',title:'唐诗',label:'古典诗词'}));
pantryPlusRoute(282,/胡同故事|^Book Orange$/,'bound-alley-stories',()=>boundBook({color:'#c88a60',title:'胡同故事',label:'街巷记忆'}));
pantryPlusRoute(709,/红搪瓷汤锅/,'enameled-stewpot-red',()=>stewPot('#bd6d68'));
pantryPlusRoute(715,/木案板/,'wood-chopping-board',woodenChopBoard);
pantryPlusRoute(716,/菜刀/,'wood-handle-cleaver',()=>kitchenKnife('#9c7358'));
pantryPlusRoute(1408,/粳米布袋/,'polished-rice-sack',()=>riceClothBag('#c2a676','粳米'));
pantryPlusRoute(1411,/小米布袋/,'millet-rice-sack',()=>riceClothBag('#c4a275','小米'));
pantryPlusRoute(1415,/称米秤/,'counter-rice-scale',riceScale);
pantryPlusRoute(1873,/汽水糖|^Soda Candy Brown$/,'cola-soda-sweets',()=>wrappedSweet('#99685d',true));
pantryPlusRoute(1890,/橘子味软糖|^Snake Candy Orange$/,'orange-peel-gummy',()=>appleGummy('#ed995e'));

const showcaseEntries=new Map(),showcaseBuilders={};
function showcaseRoute(id,pattern,kind,build){
 const routes=showcaseEntries.get(id)??[];
 routes.push([pattern,kind]);
 showcaseEntries.set(id,routes);
 showcaseBuilders[kind]=build;
}
function showcaseColors(prefix,en,cn,start,colors,build){
 for(const [offset,hue] of colors.entries()){
  if(hue)showcaseRoute(start+offset,new RegExp(cn+'|^'+en+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function deskLamp(color){
 const g=new THREE.Group();
 disk(g,color,.177,.208,.059,0,-.240,.018);
 const inset=oval(g,'#dbbf94',.030,.010,.032,.081,-.199,-.047);
 inset.rotation.z=.10;
 tube(g,'#cba576',[[0,-.212,.033],[.026,-.066,.034],[.120,.077,.003],[.098,.187,-.092]],.026,'metal');
 const shade=mesh(g,new THREE.LatheGeometry([[.147,-.071],[.157,-.066],[.158,-.045],[.098,.051],[.063,.083],[.039,.086],[.033,.070],[.057,.066],[.086,.041],[.143,-.052],[.140,-.068]].map(([x,y])=>new THREE.Vector2(x,y)),42),color,.085,.180,-.140);
 shade.rotation.x=-.48;shade.rotation.z=.26;
 const bulb=oval(g,'#f6e1b3',.049,.043,.048,.067,.131,-.175,'ice');
 bulb.rotation.z=.26;
 return turn(g,-.32);
}
function anglerFigure(color){
 const g=new THREE.Group();
 oval(g,color,.213,.169,.249,0,-.019,.035,'glaze',36);
 oval(g,'#bda68c',.140,.104,.046,0,-.065,.241,'satin');
 oval(g,'#71595b',.118,.064,.023,0,-.055,.273,'satin');
 for(const x of [-.071,-.025,.025,.071]){
  oval(g,'#f0ddae',.014,.018,.011,x,-.025,.285,'satin');
  oval(g,'#e7d3aa',.012,.014,.009,x,-.093,.282,'satin');
 }
 for(const sign of [-1,1]){
  oval(g,'#edd8b1',.047,.050,.034,sign*.110,.083,.215);
  oval(g,'#5e4d58',.025,.029,.012,sign*.108,.086,.243);
  oval(g,color,.107,.046,.089,sign*.192,-.040,-.025).rotation.y=-sign*.48;
  const fin=oval(g,color,.075,.107,.042,sign*.056,-.013,-.208);
  fin.rotation.z=sign*.58;
 }
 tube(g,color,[[0,.123,.086],[-.013,.240,.091],[-.026,.273,.163],[-.023,.224,.247]],.016);
 oval(g,'#efbd76',.039,.040,.041,-.023,.217,.249,'ice');
 return turn(g,-.36);
}
function apronDuck(color,chef=false){
 const g=new THREE.Group();
 oval(g,'#e2ad63',.221,.147,.252,0,-.058,-.041,'glaze',36);
 oval(g,'#ebbc70',.127,.133,.134,0,.118,.112,'glaze',35);
 oval(g,'#c8794e',.079,.036,.062,.006,.084,.233);
 box(g,color,.171,.149,.040,.021,0,-.067,.186,'satin');
 for(const sign of [-1,1]){
  oval(g,'#795d59',.015,.021,.012,sign*.060,.148,.210);
  oval(g,'#d29c54',.086,.045,.128,sign*.173,-.043,-.026).rotation.z=sign*.35;
  tube(g,color,[[sign*.072,.051,.183],[sign*.101,.089,.118],[sign*.104,.047,.064]],.012,'satin');
 }
 if(chef){
  box(g,'#f2e4c9',.189,.055,.160,.026,0,.229,.102,'satin');
  for(const x of [-.062,0,.062])oval(g,'#f7eacf',.049,.057,.066,x,.272,.101,'satin');
 }else{
  oval(g,'#f2ded0',.029,.018,.009,0,-.064,.212,'satin');
  tube(g,'#f2ded0',[[-.027,-.086,.211],[.022,-.086,.211]],.006,'satin');
 }
 return turn(g,-.26);
}
function pinwheelPretzel(){
 const g=new THREE.Group();
 const outline=[[-.196,.088,.141],[-.271,.087,.022],[-.228,.087,-.137],[-.105,.081,-.166],[.012,.073,-.075],[.201,.071,.109],[.244,.069,.170]];
 const other=outline.map(([x,y,z])=>[-x,y-.024,z]);
 for(const strand of [outline,other])tube(g,'#b88555',strand,.060,'satin');
 tube(g,'#bd895b',[[-.246,.064,.088],[-.121,.064,.197],[.102,.066,.207],[.246,.071,.090]],.054,'satin');
 for(const [x,y,z] of [[-.232,.140,-.076],[-.124,.136,-.141],[.080,.126,-.074],[.200,.133,.146],[-.134,.114,.182],[.076,.127,.201]])box(g,'#ecddbb',.021,.015,.024,.004,x,y,z,'matte').rotation.y=x*21;
 return turn(g,.28);
}
function preserveJar(color,flavor){
 const g=new THREE.Group();
 const body=box(g,color,.379,.369,.354,.061,0,-.035,0,'ice');
 body.material=new THREE.MeshPhysicalMaterial({color,transmission:.27,roughness:.23,thickness:.19,clearcoat:.90});
 disk(g,'#cba77c',.182,.184,.076,0,.184,0,'metal');
 for(let i=0;i<18;i++){
  const a=i*tau/18;
  oval(g,'#ead0a1',.007,.027,.007,Math.sin(a)*.182,.184,Math.cos(a)*.182,'satin',12);
 }
 const sticker=printed(g,.272,.176,0,0,0,c=>{
  c.fillStyle='#f5e3c1';c.fillRect(0,0,512,512);
  c.fillStyle=color;c.beginPath();c.arc(256,188,83,0,tau);c.fill();
  c.fillStyle='#725747';c.textAlign='center';c.font='bold 95px sans-serif';printInk(c,flavor,256,385);
 });
 sticker.position.set(0,-.022,.180);
 sticker.rotation.set(0,0,0);
 return turn(g,-.4);
}
function rolledYogaMat(color){
 const g=new THREE.Group();
 const roll=disk(g,color,.146,.142,.642,0,0,.014,'satin');
 roll.rotation.z=Math.PI/2;
 for(const sign of [-1,1]){
  for(const r of [.043,.075,.108]){
   const layer=ring(g,'#dbc8af',r,.0032,sign*.323,0,.014,'ribbon',tau*.88);
   layer.rotation.y=Math.PI/2;
  }
 }
 box(g,color,.635,.038,.260,.016,0,-.132,.153,'satin');
 for(const x of [-.155,.155]){
  const strap=ring(g,'#a28b83',.148,.014,x,0,.014,'ribbon');
  strap.rotation.y=Math.PI/2;
 }
 return turn(g,-.41);
}
function shorthairToy(color){
 const g=new THREE.Group();
 oval(g,color,.166,.175,.202,0,-.072,-.057,'glaze',34);
 oval(g,color,.182,.149,.143,0,.096,.107,'glaze',32);
 for(const sign of [-1,1]){
  const ear=mesh(g,new THREE.ConeGeometry(.059,.129,5),color,sign*.120,.209,.074);
  ear.rotation.z=-sign*.30;
  oval(g,'#a59488',.037,.018,.012,sign*.071,.127,.229,'satin');
  oval(g,'#645754',.015,.011,.009,sign*.068,.128,.239);
  oval(g,'#ead4b2',.061,.044,.038,sign*.045,.069,.223,'satin');
  oval(g,color,.056,.055,.077,sign*.097,-.166,.101);
 }
 oval(g,'#ae827a',.019,.013,.013,0,.096,.253);
 tube(g,color,[[.038,-.095,-.225],[.185,-.061,-.241],[.235,.014,-.194],[.195,.097,-.156]],.040);
 return turn(g,-.33);
}
function copperSkimmer(){
 const g=new THREE.Group(),shape=new THREE.Shape();
 shape.absarc(0,0,.168,0,tau,false);
 for(let i=0;i<7;i++){
  const angle=i*tau/6;
  const hole=new THREE.Path();
  hole.absarc(i===6?0:Math.cos(angle)*.081,i===6?0:Math.sin(angle)*.081,.018,0,tau,true);
  shape.holes.push(hole);
 }
 extrudedSurface(g,shape,'#be9a7c',-.032,.160,.022,.008,'metal');
 const rim=ring(g,'#dec1a0',.168,.011,0,.014,.160,'metal');rim.rotation.x=Math.PI/2;
 tube(g,'#c79b79',[[0,-.007,-.012],[0,-.007,-.115],[0,.017,-.273]],.020,'metal');
 box(g,'#ae8264',.075,.047,.223,.024,0,.017,-.283,'satin');
 return turn(g,.36);
}
showcaseColors('desk-lamp','Desk Lamp','台灯',2821,['Blue','Brown','Green','Grey','Orange','Pink','Purple','Red'],deskLamp);
showcaseColors('glazed-angler','Angler Fish','鮟鱇鱼',2862,['Blue','Brown','Green','Grey','Orange','Purple','Red','Yellow'],anglerFigure);
showcaseColors('fortune-cat','Egyptian Cat','招财猫',1050,['Blue','Brown','Green','Grey','Orange','Pink','Purple','Red'],luckyCat);
showcaseColors('barista-duck','Barista Duck','围裙小鸭',2543,['Blue',null,'Green','Grey','Orange','Pink','Purple','Red'],color=>apronDuck(color));
showcaseColors('chef-duck','Chef Duck','厨师小鸭',1791,['Blue','Brown',null,'Grey','Pink','Purple','Red'],color=>apronDuck(color,true));
showcaseColors('rolled-yoga-mat','Yoga Mat','瑜伽垫',2213,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],rolledYogaMat);
showcaseColors('shorthair-figurine','British Shorthair Cat','英短猫',2348,['Blue','Green',null,'Pink','Purple','Red',null,'Yellow'],shorthairToy);
showcaseColors('glazed-coupe','Wally Car','玩具.*轿车',1958,['Blue','Green',null,'Orange','Purple','Pink','Red','Yellow'],color=>roadCar(color));
showcaseColors('box-of-twists','Churros','盒装麻花',2751,['Blue','Green','Grey','Pink','Purple','Red',null,'Yellow'],boxedTwists);
showcaseColors('colored-spoon','Spoon','黄色勺子',757,['Yellow'],colorSpoon);
showcaseRoute(750,/木勺/,'carved-wood-spoon',()=>colorSpoon('#b48961'));
showcaseRoute(714,/搪瓷油壶/,'enameled-oil-pot',handleOilTin);
showcaseRoute(711,/铜漏勺/,'perforated-copper-ladle',copperSkimmer);
showcaseRoute(712,/木擀面杖/,'plain-rolling-pin',()=>rollingPin('#b68b60'));
showcaseRoute(2417,/椒盐蝴蝶饼|^Pretzel Brown$/,'baked-pretzel',pinwheelPretzel);
for(const [id,label,hue,flavor] of [[2410,'山楂','Red','山楂'],[2411,'橘子','Orange','橘子'],[2412,'蓝莓','Purple','蓝莓'],[2413,'草莓','Pink','草莓'],[2414,'柠檬','Yellow','柠檬']]){
 showcaseRoute(id,new RegExp(label),'preserve-jar-'+hue.toLowerCase(),()=>preserveJar(palette[hue],flavor));
}

const closetEntries=new Map(),closetBuilders={};
function closetRoute(id,pattern,kind,build){
 const routes=closetEntries.get(id)??[];
 routes.push([pattern,kind]);
 closetEntries.set(id,routes);
 closetBuilders[kind]=build;
}
function closetColors(prefix,en,cn,start,colors,build){
 for(const [offset,hue] of colors.entries()){
  if(hue)closetRoute(start+offset,new RegExp(cn+'|^'+en+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function salonSprayer(color){
 const g=new THREE.Group();
 box(g,color,.258,.401,.225,.067,0,-.087,0,'ice');
 box(g,'#e4c6a4',.181,.154,.024,.023,0,-.092,.115,'satin');
 disk(g,'#cbb897',.067,.085,.072,0,.141,0,'metal');
 box(g,color,.163,.103,.194,.031,0,.208,.014);
 box(g,color,.116,.054,.103,.018,0,.201,.144);
 oval(g,'#665867',.019,.019,.012,0,.202,.196);
 tube(g,'#a17983',[[0,.176,.090],[.018,.116,.135],[.036,.083,.113]],.019,'satin');
 return turn(g,-.34);
}
function hairPomade(color){
 const g=new THREE.Group();
 disk(g,color,.247,.239,.122,0,-.044,0,'glaze');
 disk(g,'#d7bfa0',.247,.249,.054,0,.041,0,'metal');
 disk(g,color,.236,.246,.047,0,.079,0,'glaze');
 oval(g,'#eddec7',.148,.012,.148,0,.109,0,'satin');
 printed(g,.207,.111,0,.124,0,c=>{
  c.fillStyle='#eddec7';c.fillRect(0,0,512,512);
  c.fillStyle='#6f5961';c.textAlign='center';c.font='bold 150px sans-serif';printInk(c,'发膏',256,322);
 });
 for(let i=0;i<24;i++){
  const a=i*tau/24;
  oval(g,color,.008,.027,.008,Math.cos(a)*.242,.049,Math.sin(a)*.242,'satin',12);
 }
 return turn(g,1.07);
}
function wideComb(color){
 const g=new THREE.Group();
 box(g,color,.701,.105,.077,.026,0,.112,0,'glaze');
 box(g,color,.203,.077,.078,.033,.283,.036,0,'glaze').rotation.z=-.32;
 for(let i=0;i<15;i++){
  const x=-.311+i*.035,depth=.175+Math.cos(x*6)*.028;
  box(g,color,.021,depth,.056,.010,x,.085-depth/2,.005);
 }
 return turn(g,.29);
}
function pelicanFigure(color){
 const g=new THREE.Group();
 oval(g,color,.185,.150,.233,0,-.065,-.041,'glaze',35);
 oval(g,color,.083,.178,.096,0,.092,.092,'glaze',32);
 oval(g,color,.119,.119,.115,0,.181,.120,'glaze',32);
 oval(g,'#e1b480',.079,.062,.148,0,.145,.234);
 oval(g,'#d29e73',.071,.091,.104,0,.086,.247,'satin');
 for(const sign of [-1,1]){
  oval(g,'#654f5a',.015,.019,.012,sign*.062,.216,.210);
  oval(g,color,.053,.075,.145,sign*.157,-.055,-.062).rotation.y=sign*.26;
  oval(g,'#bda17d',.058,.026,.069,sign*.064,-.210,.077,'satin');
 }
 return turn(g,-.35);
}
function wovenCatPost(color){
 const g=new THREE.Group();
 box(g,color,.401,.080,.387,.052,0,-.230,0);
 disk(g,'#b38b67',.087,.102,.390,0,-.013,0,'satin');
 const twine=[];
 for(let i=0;i<=155;i++){
  const angle=i*tau/11;
  twine.push([.096*Math.cos(angle),-.197+.00245*i,.096*Math.sin(angle)]);
 }
 const curve=new THREE.CatmullRomCurve3(twine.map(point=>new THREE.Vector3(...point)));
 mesh(g,new THREE.TubeGeometry(curve,160,.009,7),'#d8b68c',0,0,0,'ribbon');
 disk(g,color,.126,.128,.056,0,.188,0);
 tube(g,'#a68376',[[.052,.207,.020],[.118,.236,.070],[.144,.184,.094]],.007,'ribbon');
 oval(g,'#dea79e',.046,.046,.043,.147,.154,.106,'ribbon');
 return turn(g,-.43);
}
function cupOfIceCream(color){
 const g=new THREE.Group();
 disk(g,color,.196,.151,.233,0,-.074,0,'glaze');
 const rim=ring(g,'#ead4b1',.187,.018,0,.049,0);rim.rotation.x=Math.PI/2;
 oval(g,'#ead5b5',.174,.106,.175,-.002,.081,0,'satin',32);
 oval(g,'#efdcbf',.125,.139,.128,.014,.178,.003,'satin',34);
 oval(g,color,.031,.037,.033,.055,.310,.012);
 for(const [x,y,z] of [[-.048,.208,.119],[.072,.229,.091],[.024,.275,.065],[-.093,.129,.112],[.104,.167,.066]])oval(g,'#bc8b75',.020,.007,.010,x,y,z,'satin');
 return turn(g,-.53);
}
function steelThimble(color){
 const g=new THREE.Group();
 mesh(g,new THREE.LatheGeometry([[.098,-.114],[.126,-.117],[.138,-.102],[.128,.044],[.099,.121],[.065,.140],[.001,.146],[.001,.118],[.068,.103],[.096,.050],[.109,-.095],[.098,-.114]].map(([x,y])=>new THREE.Vector2(x,y)),42),color,0,0,0,'metal');
 const edge=ring(g,'#e2c49b',.131,.013,0,-.106,0,'metal');edge.rotation.x=Math.PI/2;
 for(let i=0;i<3;i++){
  const y=-.056+i*.053,r=.133-i*.006;
  for(let j=0;j<12;j++){
   const a=(j+i*.5)*tau/12;
   oval(g,'#c2a995',.013,.013,.013,r*Math.cos(a),y,r*Math.sin(a),'metal',10);
  }
 }
 return turn(g,-.43);
}
function storageRiceJar(){
 const g=new THREE.Group();
 mesh(g,new THREE.LatheGeometry([[.001,-.185],[.152,-.183],[.189,-.146],[.214,-.065],[.208,.066],[.166,.152],[.132,.174],[.125,.166],[.132,.151],[.161,.110],[.173,-.013],[.145,-.143],[.002,-.151]].map(([x,y])=>new THREE.Vector2(x,y)),48),'#b98763');
 disk(g,'#ce9f77',.143,.137,.055,0,.183,0);
 oval(g,'#b7815e',.063,.046,.063,0,.231,0);
 for(const y of [-.100,.083]){
  const band=ring(g,'#dfbd8d',y>0?.200:.202,.010,0,y,0,'satin');band.rotation.x=Math.PI/2;
 }
 const label=printed(g,.157,.122,0,0,0,c=>{
  c.fillStyle='#e5c693';c.fillRect(0,0,512,512);c.fillStyle='#765144';c.textAlign='center';c.font='bold 140px sans-serif';printInk(c,'米',256,308);
 });
 label.position.set(0,-.023,.216);label.rotation.set(0,0,0);
 return turn(g,-.45);
}
function enamelRiceCooker(){
 const g=new THREE.Group();
 box(g,'#e6cfb0',.464,.298,.423,.095,0,-.037,-.016);
 box(g,'#c99582',.456,.070,.404,.032,0,.131,-.016);
 box(g,'#e9d9bc',.411,.093,.372,.041,0,.184,-.014);
 tube(g,'#9d796f',[[-.144,.202,.013],[-.113,.272,.011],[.113,.272,.011],[.144,.202,.013]],.028,'satin');
 box(g,'#9d786f',.168,.087,.032,.023,0,-.064,.190,'satin');
 box(g,'#e8d6b7',.051,.029,.024,.011,-.042,-.062,.214);
 oval(g,'#d99175',.018,.015,.010,.039,-.061,.209);
 return turn(g,-.35);
}
function steamedBun(meat){
 const g=new THREE.Group();
 oval(g,'#eadbc2',.260,.190,.244,0,-.029,0,'satin',40);
 if(meat){
  for(let i=0;i<10;i++){
   const a=i*tau/10;
   tube(g,'#e1cdb0',[[.071*Math.cos(a),.149,.064*Math.sin(a)],[.125*Math.cos(a+.21),.130,.119*Math.sin(a+.21)],[.179*Math.cos(a+.21),.112,.176*Math.sin(a+.21)]],.008,'matte');
  }
  oval(g,'#e7d7bd',.050,.031,.050,0,.158,0,'satin');
 }
 return turn(g,1.08);
}
function lotusDancer(color){
 const g=new THREE.Group();
 for(let i=0;i<8;i++){
  const a=tau*i/8;
  const petal=oval(g,color,.073,.059,.165,Math.sin(a)*.116,-.148,Math.cos(a)*.116,'glaze',23);
  petal.rotation.y=a;petal.rotation.x=-.28;
 }
 oval(g,color,.113,.140,.097,0,-.041,0,'satin');
 oval(g,'#e6c3a0',.097,.090,.092,0,.108,.010,'satin');
 oval(g,'#826572',.109,.080,.089,0,.154,-.011,'glaze');
 oval(g,color,.041,.050,.037,0,.237,-.033);
 for(const sign of [-1,1]){
  tube(g,color,[[sign*.082,.016,.017],[sign*.167,.054,.025],[sign*.197,.117,.052]],.034,'satin');
  oval(g,'#e7c3a4',.044,.034,.027,sign*.208,.130,.055,'satin');
  oval(g,'#695367',.014,.014,.008,sign*.034,.100,.095);
 }
 return turn(g,-.41);
}
closetColors('salon-trigger','Barber Sprey','喷瓶|理发定型喷雾',2695,[null,'Green','Grey','Orange',null,'Purple',null,'Yellow'],salonSprayer);
closetColors('pomade-tin','Hair Gel','发膏',2703,['Blue','Brown','Grey','Orange','Pink',null,null,'Yellow'],hairPomade);
closetColors('pelican-ceramic','Pelican','鹈鹕',2095,['Blue',null,'Pink','Purple','Red','Yellow'],pelicanFigure);
closetColors('wide-comb','Hair Comb','梳子',1775,['Yellow','Red',null,'Orange','Green','Grey','Blue','Pink'],wideComb);
closetColors('sisal-cat-post','Cat Scratching Toy','猫抓柱',2385,['Green',null,null,null,'Red',null,'Yellow'],wovenCatPost);
closetColors('gelato-cup','Cup Ice Cream','杯装冰淇淋',2767,['Blue',null,'Green','Pink','Purple','Red','White','Yellow'],cupOfIceCream);
closetColors('grooved-suitcase','Suitcase','旅行箱',2282,['Blue','Green',null,'Orange','Pink','Purple','Red','Yellow'],carryOn);
closetColors('baby-dino-hatchling','Baby Dino','破壳小恐龙',1278,['Green','Brown','Blue'],hatchling);
closetColors('colored-thimble','Yoghurt','顶针',504,['Green','Pink','Purple','Red','Yellow'],steelThimble);
closetRoute(503,/顶针/,'colored-thimble-blue',()=>steelThimble(palette.Blue));
closetRoute(1413,/米罐/,'ceramic-rice-jar',storageRiceJar);
closetRoute(1477,/街机|^Arcade Machine Yellow$/,'yellow-arcade',()=>arcadeCabinet(palette.Yellow));
closetRoute(1472,/电饭煲/,'enamel-rice-cooker',enamelRiceCooker);
closetRoute(20,/肉包/,'pleated-meat-bun',()=>steamedBun(true));
closetRoute(16,/白馒头/,'plain-steamed-bun',()=>steamedBun(false));
closetColors('lotus-dancer','Fairy','莲花小舞偶|花仙子',2115,['Blue','Green','Grey','Pink','Purple','Red','White','Yellow'],lotusDancer);
closetRoute(833,/火柴盒/,'printed-match-box',()=>matchBook('#b69e76'));
closetRoute(833,/游戏手柄|^Console White$/,'white-retro-controller',()=>controller(palette.White));
closetRoute(834,/汽水瓶/,'cabinet-soda-bottle',()=>sodaBottle(palette.Green));
closetRoute(831,/搪瓷暖水瓶/,'cabinet-enamel-thermos',()=>travelBottle('#c67f73',true));
closetRoute(1869,/黑色方饼干|^Biscuit Black$/,'dark-butter-biscuit',()=>roundedBiscuit('#796261'));
closetRoute(1838,/绿箍蒸饺笼/,'dumpling-steamer-green',()=>basket('#99aa70'));
closetRoute(1840,/黄箍花卷蒸笼/,'bun-steamer-yellow',()=>basket('#e4b66e'));
closetRoute(1841,/紫箍茶饼蒸笼/,'cake-steamer-purple',()=>basket('#a590ab'));
closetRoute(1843,/红箍茶点蒸笼/,'tea-steamer-red',()=>basket('#bb7e75'));

const marinaEntries=new Map(),marinaBuilders={};
function marinaRoute(id,pattern,kind,build){
 const routes=marinaEntries.get(id)??[];
 routes.push([pattern,kind]);
 marinaEntries.set(id,routes);
 marinaBuilders[kind]=build;
}
function marinaColors(prefix,en,cn,start,colors,build){
 for(const [offset,hue] of colors.entries()){
  if(hue)marinaRoute(start+offset,new RegExp(cn+'|^'+en+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function catamaranFigure(color){
 const g=new THREE.Group();
 for(const x of [-.157,.157]){
  oval(g,color,.105,.065,.367,x,-.136,.018,'glaze',36);
  box(g,'#e8cc9d',.166,.040,.448,.019,x,-.074,.037,'satin');
 }
 box(g,'#d7b395',.327,.041,.297,.018,0,-.058,.097,'ribbon');
 tube(g,'#b89672',[[0,-.064,.031],[0,.247,.011],[0,.426,-.016]],.017,'satin');
 const sail=new THREE.Shape();
 sail.moveTo(-.005,-.040);sail.lineTo(-.005,.395);sail.quadraticCurveTo(.158,.212,.242,-.019);sail.quadraticCurveTo(.061,-.052,-.005,-.040);
 const main=extrudedSurface(g,sail,'#e9d9b7',-.015,.013,.022,.008,'satin');
 main.rotation.set(0,-.55,.02);
 const stripe=extrudedSurface(g,sail,color,-.014,.020,.023,.008,'ribbon');
 stripe.rotation.copy(main.rotation);stripe.scale.set(.83,.72,1);stripe.position.y=.027;
 return turn(g,-.52);
}
function cruiseLiner(color){
 const g=new THREE.Group();
 oval(g,color,.189,.098,.369,0,-.095,.017,'glaze',40);
 box(g,color,.327,.124,.533,.051,0,-.043,-.007);
 box(g,'#eddbbc',.269,.100,.446,.037,0,.055,-.011,'satin');
 box(g,'#eedabd',.219,.091,.313,.035,0,.139,-.024,'satin');
 box(g,color,.170,.075,.201,.032,0,.209,.039);
 for(const x of [-.142,.142]){
  for(const z of [-.175,-.113,-.050,.019,.089,.157])oval(g,'#767b96',.008,.017,.022,x,.062,z,'ice');
  box(g,'#d7ac80',.042,.062,.151,.018,x,.134,-.078);
 }
 disk(g,'#bd866b',.046,.055,.108,0,.250,.014);
 return turn(g,-.56);
}
function crankGrinder(color){
 const g=new THREE.Group();
 box(g,color,.390,.253,.354,.058,0,-.073,0);
 disk(g,'#e1c2aa',.171,.142,.131,0,.105,0,'metal');
 oval(g,'#8e6a58',.148,.023,.149,0,.151,0,'satin');
 for(const [x,z] of [[-.061,.023],[.037,.028],[.070,-.061],[-.042,-.065]])oval(g,'#9b735c',.032,.026,.048,x,.165,z,'glaze').rotation.y=x*23;
 tube(g,'#d2bda5',[[0,.131,.009],[0,.221,.007],[.183,.224,.022]],.018,'metal');
 oval(g,color,.048,.053,.050,.186,.249,.020);
 box(g,'#ead3ad',.249,.122,.030,.021,0,-.112,.177,'satin');
 oval(g,'#c49674',.045,.035,.028,0,-.112,.207);
 return turn(g,-.47);
}
function frogFigurine(color){
 const g=new THREE.Group();
 oval(g,color,.201,.135,.196,0,-.068,-.022,'glaze',35);
 oval(g,color,.186,.090,.134,0,.008,.095,'glaze',34);
 for(const sign of [-1,1]){
  oval(g,color,.066,.074,.062,sign*.104,.073,.126);
  oval(g,'#e6d8b8',.051,.048,.035,sign*.105,.083,.164);
  oval(g,'#6a535c',.022,.019,.014,sign*.105,.084,.194,'satin');
  oval(g,color,.087,.054,.106,sign*.180,-.100,-.029).rotation.y=sign*.48;
  for(let i=0;i<3;i++)oval(g,color,.022,.023,.055,sign*(.083+i*.041),-.120,.145);
 }
 tube(g,'#8e6471',[[-.100,-.022,.208],[0,-.045,.224],[.098,-.016,.209]],.008,'satin');
 return turn(g,-.43);
}
function toyAccordion(color){
 const g=new THREE.Group();
 box(g,color,.174,.324,.302,.041,-.264,0,0);
 box(g,color,.207,.324,.302,.042,.242,0,0);
 box(g,'#b69687',.355,.226,.228,.023,-.021,0,0,'satin');
 for(let i=0;i<9;i++)box(g,i%2===0?'#e4c9a4':'#907380',.019,.270,.259,.008,-.178+i*.039,0,0,'ribbon');
 for(let i=0;i<6;i++){
  const y=(i-2.5)*.043;
  box(g,'#efdfc1',.127,.035,.019,.009,.242,y,.164);
  if(i%3!==2)box(g,'#77606d',.062,.028,.020,.007,.211,y+.019,.179,'satin');
  oval(g,'#eadab9',.018,.015,.010,-.265,y,.158);
 }
 return turn(g,-.36);
}
function acousticToyGuitar(color){
 const g=new THREE.Group();
 oval(g,color,.226,.072,.202,0,-.018,.132,'glaze',35);
 oval(g,color,.149,.059,.168,0,-.016,-.006,'glaze',31);
 box(g,'#9f7d66',.095,.052,.457,.018,0,.012,-.233,'satin');
 box(g,color,.139,.053,.128,.023,0,.022,-.479);
 oval(g,'#895e5e',.063,.010,.059,0,.055,.079,'satin');
 box(g,'#9e735e',.131,.027,.044,.010,0,.055,.192,'satin');
 for(let i=0;i<6;i++)box(g,'#e1c7a3',.104,.010,.006,.002,0,.043,-.113-i*.047,'metal');
 for(const x of [-.024,0,.024])tube(g,'#ecd2aa',[[x,.069,.181],[x,.066,-.051],[x*.75,.052,-.496]],.0022,'metal');
 for(const x of [-.075,.075])for(const z of [-.507,-.464])oval(g,'#dfba8f',.019,.015,.014,x,.043,z,'metal');
 return turn(g,1.04);
}
function curlingStone(color){
 const g=new THREE.Group();
 const body=oval(g,'#aa9690',.235,.085,.241,0,-.059,0,'satin',42);
 const band=ring(g,'#c8b3a0',.230,.010,0,-.057,0,'satin');band.rotation.x=Math.PI/2;
 body.material=new THREE.MeshPhysicalMaterial({color:'#aa9690',roughness:.52,clearcoat:.27});
 box(g,color,.115,.047,.214,.023,0,.028,-.006);
 tube(g,color,[[0,.047,-.092],[0,.105,-.075],[0,.115,.014],[0,.086,.090]],.031);
 return turn(g,.96);
}
function wristStopwatch(color){
 const g=new THREE.Group();
 const body=disk(g,color,.193,.191,.109,0,-.009,0);body.rotation.x=Math.PI/2;
 const rim=ring(g,'#c7a888',.160,.014,0,0,.057,'metal');
 oval(g,'#e8d5b5',.152,.152,.016,0,0,.058,'satin');
 for(let i=0;i<12;i++){
  const a=i*tau/12;
  const notch=box(g,'#9c7773',.008,.020,.006,.002,Math.sin(a)*.126,Math.cos(a)*.126,.074,'satin');
  notch.rotation.z=-a;
 }
 tube(g,'#b47774',[[0,0,.079],[.040,.079,.079]],.006,'satin');
 tube(g,'#92716b',[[0,0,.078],[-.057,.014,.078]],.005,'metal');
 box(g,color,.089,.055,.076,.018,0,.197,0);
 oval(g,'#cfad87',.050,.021,.025,0,.230,0,'metal');
 return turn(g,-.31);
}
function spottedBengal(){
 const g=shorthairToy('#c79775');
 for(const [x,y,z] of [[-.115,.103,.215],[.116,.114,.215],[-.118,.160,.208],[.074,.195,.183],[-.059,.188,.191],[-.140,-.068,.032],[.133,-.061,.057],[.162,-.077,-.024]]){
  const mark=oval(g,'#9a6d60',.024,.013,.017,x,y,z,'satin');
  mark.rotation.z=x*11;
 }
 return g;
}
marinaColors('twin-hull-sailboat','Catamaran','双体帆船',2481,['Blue','Green','Orange','Pink','Purple','Red','White'],catamaranFigure);
marinaColors('cruise-liner','Cruise','客轮|玩具游轮|轮船玩具',2489,['Blue','Green','Orange','Pink','Purple','Red',null,'Yellow'],cruiseLiner);
marinaColors('hand-crank-coffee-mill','Coffee Grinder','手摇磨豆机',2560,['Blue','Brown','Green','Grey','Orange','Pink','Purple','Yellow'],crankGrinder);
marinaColors('glazed-frog','Frog Prince','小青蛙',2123,['Blue','Grey','Orange','Pink','Purple','Red','White'],frogFigurine);
marinaColors('toy-accordion','Accordion','手风琴',2418,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],toyAccordion);
marinaColors('acoustic-guitar','Mexican Guitar','木吉他',2645,['Blue','Green','Purple',null,'Yellow'],acousticToyGuitar);
marinaColors('soft-head-toothbrush','Tooth Brush','牙刷',2258,['Blue','Green','Grey','Orange','Pink','Purple','Red','Yellow'],toothBrush);
marinaColors('mini-curling-stone','Curling Stone','冰壶',1942,['Red','Purple','Pink','Orange','Grey','Green','Blue','Yellow'],curlingStone);
marinaColors('mechanical-stopwatch','Stop Watch','机械秒表',2209,['Pink','Purple',null,'Yellow'],wristStopwatch);
marinaColors('mini-city-bus','Minibus','小巴士',1999,['Blue','Green','Grey','Orange','Purple'],color=>roadCar(color,true));
marinaRoute(2346,/豹纹猫|^Bengal Cat Brown$/,'spotted-bengal-cat',spottedBengal);
marinaRoute(1130,/虎头帽/,'tiger-bonnet-blue',()=>tigerBonnet(palette.Blue));
marinaRoute(1195,/扩音器|^Megaphone Grey$/,'mini-megaphone-gray',()=>miniMegaphone(palette.Grey));
marinaRoute(995,/运载火箭|^Rocketship Yellow$/,'carrier-rocket-yellow',()=>toyRocket(palette.Yellow));
marinaRoute(996,/运载火箭|^Rocketship Purple$/,'carrier-rocket-purple',()=>toyRocket(palette.Purple));
marinaRoute(83,/玩具小车|^Car Orange$/,'toy-road-car-orange',()=>roadCar(palette.Orange));
marinaRoute(838,/茶叶罐/,'cabinet-loose-leaf-tin',looseLeafTin);
for(const [id,hue] of [[345,'Pink'],[344,'Green'],[346,'Purple'],[347,'Red'],[348,'Yellow']]){
 marinaRoute(id,/线轴/,'sewing-spool-'+hue.toLowerCase(),()=>threadSpool(palette[hue]));
}

const boardwalkEntries=new Map(),boardwalkBuilders={};
function boardwalkRoute(id,pattern,kind,build){
 const routes=boardwalkEntries.get(id)??[];
 routes.push([pattern,kind]);
 boardwalkEntries.set(id,routes);
 boardwalkBuilders[kind]=build;
}
function boardwalkColors(prefix,en,cn,start,colors,build){
 for(const [offset,hue] of colors.entries()){
  if(hue)boardwalkRoute(start+offset,new RegExp(cn+'|^'+en+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function foldingPaperFan(){
 const g=new THREE.Group(),shape=new THREE.Shape();
 shape.moveTo(0,.196);
 for(let i=0;i<=20;i++){
  const a=(i-10)*.105,r=i%2===0?.53:.519;
  shape.lineTo(r*Math.sin(a),.196-r*Math.cos(a));
 }
 shape.closePath();
 extrudedSurface(g,shape,'#e7d5b6',-.014,0,.026,.005,'ribbon');
 for(let i=-6;i<=6;i++){
  const a=i*.158;
  tube(g,i%6===0?'#a58362':'#bfa178',[[0,.017,-.196],[.214*Math.sin(a),.018,-.196+.214*Math.cos(a)],[.481*Math.sin(a),.018,-.196+.481*Math.cos(a)]],.007,'satin');
 }
 oval(g,'#b58769',.028,.016,.026,0,.018,-.196);
 g.rotation.set(1.03,-.13,.05);
 return g;
}
function cerealFlourTin(color){
 const g=new THREE.Group();
 disk(g,color,.189,.175,.388,0,-.021,0,'glaze');
 disk(g,'#c1a58e',.194,.192,.055,0,.196,0,'metal');
 disk(g,'#dfc299',.166,.163,.012,0,.226,0,'satin');
 box(g,'#e9d3af',.202,.178,.026,.018,0,-.022,.178,'satin');
 const label=printed(g,.180,.150,0,0,0,c=>{
  c.fillStyle='#e9d3af';c.fillRect(0,0,512,512);
  c.fillStyle='#7a6555';c.textAlign='center';c.font='bold 106px sans-serif';printInk(c,'谷物粉',256,320);
 });
 label.position.set(0,-.022,.193);label.rotation.set(0,0,0);
 return turn(g,-.38);
}
function swimTang(color){
 const g=new THREE.Group();
 oval(g,color,.209,.190,.075,-.014,0,0,'glaze',38);
 for(const s of [-1,1]){
  const fin=oval(g,'#d1af7e',.092,.041,.038,.208,s*.052,0,'glaze');
  fin.rotation.z=s*.48;
  oval(g,'#e8d3b1',.030,.037,.015,-.137,.057,s*.057);
  oval(g,'#655260',.018,.022,.009,-.138,.059,s*.070);
  oval(g,color,.134,.039,.035,.021,-.013,s*.057).rotation.z=-.37;
 }
 oval(g,'#d0b18a',.054,.024,.042,-.201,-.028,.005,'satin');
 tube(g,'#c8af90',[[-.119,.124,.045],[-.004,.132,.064],[.144,.047,.056]],.011,'satin');
 return turn(g,.35);
}
function smoothShark(color){
 const g=new THREE.Group(),fin=new THREE.Shape();
 oval(g,color,.252,.090,.106,-.031,.018,0,'glaze',38);
 oval(g,'#e2cbb0',.177,.056,.081,-.109,-.034,.010,'satin');
 fin.moveTo(-.039,0);fin.quadraticCurveTo(.083,.184,.095,.190);fin.quadraticCurveTo(.035,.133,.112,0);fin.closePath();
 const dorsal=extrudedSurface(g,fin,color,.036,-.009,.022,.010,'glaze');
 dorsal.rotation.set(0,0,0);
 for(const sign of [-1,1]){
  oval(g,'#6e5d66',.018,.019,.010,-.197,.043,sign*.073);
  oval(g,color,.119,.032,.040,.028,-.014,sign*.085).rotation.y=-sign*.54;
  oval(g,color,.068,.031,.104,.243,.018,sign*.042).rotation.y=sign*.44;
  for(let i=0;i<3;i++)tube(g,'#b7a28e',[[.006+i*.020,.024,sign*.103],[-.004+i*.020,-.012,sign*.108]],.003,'satin');
 }
 return turn(g,-.32);
}
function skiHelmet(color){
 const g=new THREE.Group();
 oval(g,color,.223,.167,.228,0,.019,-.019,'glaze',36);
 oval(g,'#d7bdab',.188,.055,.208,0,-.081,-.015,'satin');
 const visor=oval(g,'#77848c',.179,.084,.072,0,.007,.177,'ice',30);
 visor.rotation.x=-.20;
 for(const sign of [-1,1]){
  oval(g,color,.067,.074,.099,sign*.186,-.045,-.040);
  box(g,'#ac837b',.054,.106,.036,.014,sign*.114,-.135,.081,'ribbon');
 }
 return turn(g,-.42);
}
function softPasteTube(color){
 const g=new THREE.Group();
 box(g,color,.254,.150,.405,.058,0,-.007,.014,'glaze');
 box(g,'#ebdac0',.250,.027,.043,.010,0,-.019,.221,'satin');
 box(g,'#f2e5cb',.158,.014,.235,.011,0,.070,.005,'satin');
 const nozzle=disk(g,'#d6c1a3',.073,.082,.106,0,-.012,-.230);nozzle.rotation.x=Math.PI/2;
 const cap=disk(g,color,.079,.076,.087,0,-.012,-.288);cap.rotation.x=Math.PI/2;
 for(let i=0;i<7;i++)box(g,'#dfc6aa',.011,.010,.045,.004,(i-3)*.019,.031,.223,'satin');
 return turn(g,1.12);
}
function manualRazor(color){
 const g=new THREE.Group();
 tube(g,color,[[.019,-.005,.278],[.009,-.020,.108],[-.021,.004,-.053],[0,.028,-.193]],.046);
 box(g,color,.242,.068,.098,.021,0,.021,-.219);
 box(g,'#ebd4b5',.207,.018,.073,.013,0,.061,-.222,'metal');
 for(const z of [-.247,-.225,-.203])box(g,'#9b8481',.170,.007,.006,.002,0,.073,z,'metal');
 for(const z of [.144,.188,.230])box(g,'#d7b7aa',.073,.008,.013,.004,.011,.024,z,'satin');
 return turn(g,1.03);
}
function beanBurr(){
 const g=new THREE.Group();
 const left=oval(g,'#a47b61',.082,.123,.147,-.050,0,0,'glaze',32);
 left.rotation.y=.13;
 oval(g,'#a7795b',.082,.121,.144,.048,.001,0,'glaze',32).rotation.y=-.14;
 tube(g,'#6e514d',[[.009,.053,-.139],[-.009,.115,-.067],[.017,.124,.042],[.004,.065,.133]],.010,'satin');
 return turn(g,1.06);
}
function coffeeBeansBag(color){
 const g=new THREE.Group();
 box(g,color,.352,.168,.460,.050,0,0,0,'satin');
 box(g,color,.354,.058,.062,.014,0,0,-.238,'ribbon');
 box(g,'#d7b093',.326,.046,.059,.013,0,-.006,.220,'satin');
 printed(g,.227,.267,0,.091,-.005,c=>{
  c.fillStyle='#f0dabb';c.fillRect(0,0,512,512);
  c.fillStyle='#a57964';c.beginPath();c.ellipse(256,169,67,101,.4,0,tau);c.fill();
  c.strokeStyle='#e9c195';c.lineWidth=10;c.beginPath();c.moveTo(225,247);c.quadraticCurveTo(282,167,273,98);c.stroke();
  c.fillStyle='#76554a';c.font='bold 79px sans-serif';c.textAlign='center';printInk(c,'咖啡豆',256,394);
 });
 return turn(g,1.07);
}
function trainingKettlebell(color){
 const g=new THREE.Group();
 oval(g,color,.166,.155,.157,0,-.090,0,'glaze',35);
 disk(g,color,.104,.114,.036,0,-.226,0,'satin');
 tube(g,'#ba9d8b',[[-.098,-.039,0],[-.111,.127,0],[-.064,.194,0],[.064,.194,0],[.111,.127,0],[.098,-.039,0]],.033,'satin');
 oval(g,'#e4cdb0',.047,.041,.014,0,-.082,.153,'satin');
 return turn(g,-.36);
}
function travelNeckRest(color){
 const g=new THREE.Group();
 const curve=ring(g,color,.163,.070,0,-.031,0,'satin',tau*.78);
 curve.rotation.z=.69;
 for(const x of [-.135,.136])oval(g,color,.074,.081,.073,x,-.154,0,'satin');
 tube(g,'#b69a92',[[-.165,-.181,.035],[-.108,-.199,.069],[.105,-.192,.064],[.143,-.162,.033]],.005,'ribbon');
 box(g,'#dfcbb6',.031,.019,.024,.006,.078,-.192,.068,'satin');
 return turn(g,.33);
}
function huskyFigure(color){
 const g=new THREE.Group();
 oval(g,color,.158,.149,.209,0,-.065,-.068,'glaze',36);
 oval(g,color,.163,.135,.136,0,.077,.124,'glaze',33);
 oval(g,'#e5d5bd',.121,.080,.074,0,.071,.216,'satin');
 oval(g,'#695960',.036,.022,.015,0,.100,.289);
 for(const s of [-1,1]){
  mesh(g,new THREE.ConeGeometry(.066,.139,4),color,s*.093,.192,.112).rotation.z=s*.26;
  oval(g,'#bb938e',.032,.041,.012,s*.093,.193,.153,'satin');
  oval(g,'#a4b7bf',.021,.019,.011,s*.062,.111,.242,'ice');
  oval(g,'#5f535f',.010,.013,.007,s*.062,.111,.250);
  for(const z of [.054,-.170])oval(g,'#e2cdb5',.056,.098,.052,s*.091,-.123,z,'satin');
 }
 tube(g,color,[[0,-.011,-.247],[.052,.073,-.285],[.109,.115,-.249],[.117,.096,-.193]],.045);
 return turn(g,-.35);
}
boardwalkColors('cereal-flour-tin','Protein Powder','谷物粉罐',2189,['Blue','Orange',null,'Grey',null,'Purple',null,'Yellow'],cerealFlourTin);
boardwalkColors('glazed-tang','Tang','刺尾鱼',2888,['Blue','Green',null,'Pink','Purple','Red','White','Yellow'],swimTang);
boardwalkColors('stitched-hood-doll','Girl Redhood','绣花帽娃娃',2132,['Green','Orange','Pink','Purple','Red'],color=>dressDoll(color,true));
boardwalkColors('glazed-ski-helmet','Helmet Winter','滑雪头盔',1927,['Red','Purple',null,'Orange','Grey','Green','Blue'],skiHelmet);
boardwalkColors('soft-toothpaste','Tooth Paste','牙膏',2266,['Blue',null,null,null,'Pink','Purple','Red','Yellow'],softPasteTube);
boardwalkColors('manual-safety-razor','Razor','剃须刀',2711,['Blue','Green','Orange','Pink','Purple','Red','White','Yellow'],manualRazor);
boardwalkColors('glazed-shark','Shark','鲨鱼',2875,['Blue','Green','Orange','Pink',null,'Red'],smoothShark);
boardwalkColors('husky-figure','Husky','哈士奇',2617,['Blue','Brown','Grey','Yellow'],huskyFigure);
boardwalkColors('sport-soda-can','Energy Drink','运动饮料罐',2166,['Brown',null,null,'Pink','Purple','Red','Yellow'],sodaCan);
boardwalkColors('training-kettlebell','Kettle Bell','壶铃',2181,['Blue','Green',null,'Orange','Pink','Purple',null,'Yellow'],trainingKettlebell);
boardwalkColors('coffee-beans-bag','Coffee Bag','咖啡豆',2551,['Blue',null,'Green','Orange','Pink','Purple','Grey'],coffeeBeansBag);
boardwalkColors('quilted-eye-mask','Sleeping Band','眼罩',2301,['Orange',null,null,'Red'],satinEyeMask);
boardwalkColors('travel-neck-pillow','Travel Pillow','旅行颈枕',2323,['Green',null,'Orange','Pink','Purple','Red','Yellow'],travelNeckRest);
boardwalkRoute(2559,/咖啡豆|^Coffee Bean Brown$/,'roasted-coffee-bean',beanBurr);
boardwalkRoute(1887,/波纹软糖|^Snake Candy Colorful$/,'rainbow-coiled-gummy',()=>coiledSnake('#d79d9a'));
for(const id of [174,835,1380])boardwalkRoute(id,/折扇/,'ribbed-paper-fan-'+id,foldingPaperFan);

const bakeryEntries=new Map(),bakeryBuilders={};
function bakeryRoute(id,pattern,kind,build){
 const routes=bakeryEntries.get(id)??[];
 routes.push([pattern,kind]);
 bakeryEntries.set(id,routes);
 bakeryBuilders[kind]=build;
}
function bakeryColors(prefix,en,cn,start,colors,build){
 for(const [offset,hue] of colors.entries()){
  if(hue)bakeryRoute(start+offset,new RegExp(cn+'|^'+en+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function poleLantern(color){
 const g=new THREE.Group();
 const lens=disk(g,'#e1cdb0',.109,.113,.410,0,0,0,'ice');
 const colors=[color,'#c99599','#80a2b1'];
 for(let i=0;i<3;i++){
  const points=[];
  for(let k=0;k<=24;k++){
   const angle=i*tau/3+k*tau/20;
   points.push([.110*Math.cos(angle),-.196+.016*k,.110*Math.sin(angle)]);
  }
  const curve=new THREE.CatmullRomCurve3(points.map(x=>new THREE.Vector3(...x)));
  mesh(g,new THREE.TubeGeometry(curve,28,.019,8),colors[i],0,0,0,'satin');
 }
 for(const y of [-.222,.222])disk(g,color,.122,.124,.053,0,y,0);
 oval(g,'#ddb98a',.069,.065,.069,0,.264,0,'metal');
 box(g,'#b4a093',.186,.287,.036,.029,0,-.020,-.115,'metal');
 return turn(g,-.36);
}
function cakeSlice(color){
 const g=new THREE.Group(),wedge=new THREE.Shape();
 wedge.moveTo(0,-.319);
 wedge.lineTo(.197,.202);
 wedge.quadraticCurveTo(0,.331,-.197,.202);
 wedge.closePath();
 for(const [y,c,depth,finish] of [[-.113,'#b88a66',.076,'matte'],[-.037,'#eacda5',.140,'satin'],[.100,color,.043,'glaze']]){
  extrudedSurface(g,wedge,c,y,0,depth,.014,finish);
 }
 for(const x of [-.050,.060])oval(g,color,.042,.036,.043,x,.174,-.095,'glaze');
 tube(g,'#debb91',[[0,.165,.174],[.085,.171,.069],[.044,.170,-.081]],.008,'satin');
 return turn(g,.92);
}
function bakedCaramelPudding(color){
 const g=new THREE.Group();
 const profile=[[.001,-.137],[.221,-.134],[.233,-.108],[.220,-.060],[.171,.104],[.151,.143],[.115,.153],[.001,.154]].map(p=>new THREE.Vector2(...p));
 mesh(g,new THREE.LatheGeometry(profile,48),color,0,0,0,'glaze');
 disk(g,'#be8761',.148,.174,.044,0,.138,0,'glaze');
 for(let i=0;i<12;i++){
  const a=i*tau/12;
  tube(g,color,[[.199*Math.sin(a),-.108,.199*Math.cos(a)],[.211*Math.sin(a),-.016,.211*Math.cos(a)],[.165*Math.sin(a),.103,.165*Math.cos(a)]],.013,'glaze');
 }
 return turn(g,1.03);
}
function gardenPepper(color){
 const g=new THREE.Group();
 tube(g,color,[[-.157,.053,.140],[-.092,.028,.091],[.075,.015,-.008],[.188,.003,-.146]],.074,'glaze');
 oval(g,color,.104,.078,.087,.151,.014,-.115,'glaze');
 oval(g,color,.046,.032,.047,-.188,.054,.170);
 tube(g,'#809770',[[.184,.051,-.154],[.214,.076,-.211],[.179,.089,-.268]],.023,'satin');
 return turn(g,1.00);
}
function toyBanjo(color){
 const g=new THREE.Group();
 disk(g,color,.192,.182,.090,0,-.020,.121);
 disk(g,'#e6d2ad',.170,.164,.013,0,.033,.121,'satin');
 box(g,'#a37f69',.070,.043,.358,.015,0,.013,-.161,'satin');
 box(g,color,.115,.047,.113,.016,0,.019,-.364);
 for(let i=0;i<6;i++)box(g,'#c9ae92',.071,.007,.006,.001,0,.039,-.052-i*.049,'metal');
 for(const x of [-.022,0,.020])tube(g,'#dfbf91',[[x,.050,.245],[x,.060,.129],[x,.043,-.396]],.0025,'metal');
 box(g,'#936d60',.103,.025,.035,.006,0,.042,.151,'satin');
 return turn(g,1.12);
}
function folkPanFlute(color){
 const g=new THREE.Group();
 for(let i=0;i<7;i++){
  const x=(i-3)*.064,length=.435-i*.038,z=.188-length/2;
  const body=disk(g,color,.028,.028,length,x,0,z,'glaze');body.rotation.x=Math.PI/2;
  disk(g,'#6e5d60',.017,.017,.004,x,0,.188,'satin').rotation.x=Math.PI/2;
 }
 for(const z of [.073,.133])box(g,'#ae896b',.469,.087,.059,.018,0,.011,z,'ribbon');
 return turn(g,.83);
}
function uprightPiano(color){
 const g=new THREE.Group();
 box(g,color,.541,.330,.208,.048,0,.052,-.079);
 box(g,color,.547,.069,.280,.025,0,-.073,.024);
 box(g,'#dbc5a7',.431,.057,.018,.008,0,.102,.030,'satin');
 for(let i=0;i<8;i++){
  const x=(i-3.5)*.054;
  box(g,'#f4e6d1',.050,.018,.106,.007,x,-.026,.084);
  if(i%4!==3)box(g,'#725c6a',.024,.022,.063,.009,x+.028,-.013,.058,'satin');
 }
 for(const x of [-.192,.192])box(g,color,.060,.176,.086,.023,x,-.181,.122);
 for(const x of [-.065,.032,.083])box(g,'#c5a681',.022,.025,.073,.008,x,-.225,.008,'metal');
 return turn(g,-.55);
}
function ducklingChick(color){
 const g=new THREE.Group();
 oval(g,color,.169,.137,.178,0,-.061,-.027,'glaze',35);
 oval(g,color,.124,.121,.115,0,.108,.056,'glaze',32);
 oval(g,'#ce9a70',.053,.024,.058,0,.081,.169);
 for(const x of [-.108,.108]){
  oval(g,'#5a4f59',.016,.016,.013,x*.52,.133,.146);
  oval(g,color,.045,.056,.090,x*1.31,-.042,-.062,'glaze');
  oval(g,'#c09570',.049,.023,.067,x*.70,-.169,.048,'satin');
 }
 return turn(g,-.43);
}
function tetraWheelTurtle(color){
 const g=seaTurtle(color);
 for(const x of [-.154,.154])for(const z of [-.158,.126]){
  disk(g,'#8a7378',.069,.071,.052,x,-.095,z,'satin').rotation.z=Math.PI/2;
  disk(g,'#d6b995',.035,.034,.060,x,-.095,z,'metal').rotation.z=Math.PI/2;
 }
 return g;
}
function tinyCow(color,bull=false){
 const g=new THREE.Group();
 oval(g,'#e5d2b4',.151,.137,.218,0,-.041,-.038,'glaze',34);
 oval(g,bull?color:'#e8d4b8',.167,.135,.136,0,.086,.112,'glaze',32);
 oval(g,'#c4998e',.120,.053,.064,0,.035,.234,'satin');
 for(const s of [-1,1]){
  oval(g,'#695663',.017,.017,.012,s*.065,.117,.216);
  oval(g,color,.060,.031,.063,s*.157,.096,.086);
  oval(g,color,.048,.031,.051,s*.112,.016,-.114,'satin');
  tube(g,'#d5b797',[[s*.114,.164,.114],[s*.172,.201,.090],[s*(bull?.205:.165),.227,.067]],.020,'satin');
  for(const z of [-.154,.056])oval(g,color,.050,.072,.046,s*.096,-.129,z,'satin');
 }
 return turn(g,-.40);
}
function festivalCandyTin(character){
 const g=storageRiceJar();
 const label=printed(g,.158,.123,0,0,0,c=>{
  c.fillStyle='#e4bc8d';c.fillRect(0,0,512,512);
  c.fillStyle='#8b5551';c.textAlign='center';c.font='bold 208px sans-serif';printInk(c,character,256,334);
 });
 label.rotation.set(0,0,0);label.position.set(0,-.025,.220);
 return g;
}
bakeryColors('salon-pole-light','Stripped Pole','理发.*灯',2729,['Grey','Orange','Pink',null,'Red','Yellow'],poleLantern);
bakeryColors('glazed-crow','Crow','小乌鸦',2078,['Brown',null,null,'Purple','White','Yellow'],color=>littleBird(color));
bakeryColors('glazed-chick','Chick','小鸡',1850,['Grey','Purple','Yellow'],ducklingChick);
bakeryColors('cheesecake-slice','Cheesecake','芝士蛋糕',2743,['Brown','Green','Orange','Pink','Purple','Red',null,'Yellow'],cakeSlice);
bakeryColors('garden-pepper','Mexican Pepper','辣椒',2650,['Green','Red','Yellow'],gardenPepper);
bakeryColors('cream-eclair','Eclair','闪电泡芙',2775,['Brown','Green'],eclair);
bakeryColors('toy-banjo','Banjo','班卓琴',2428,['Brown','Green','Pink','Purple','Red'],toyBanjo);
bakeryColors('turtle-car','Turtle Car','小龟车',2005,['Blue','Green','Grey','Orange',null,'Pink',null,'Yellow'],tetraWheelTurtle);
bakeryColors('little-cow','Cow','小奶牛',1854,['Purple','White'],color=>tinyCow(color));
bakeryColors('ceramic-bull','Bull','小牛摆件',1846,['Brown','Red'],color=>tinyCow(color,true));
bakeryColors('glazed-caramel-pudding','Creme Caramel','焦糖布丁',2759,['Blue','Green','Grey','Pink','Purple','Red','White'],bakedCaramelPudding);
bakeryColors('folk-pan-flute','Pan Flute','排箫',2459,['Green',null,'Orange','Pink','Purple','Red','Yellow'],folkPanFlute);
bakeryColors('upright-piano','Piano','立式钢琴',2467,['Blue','Green','Pink','Purple','Red','White','Yellow'],uprightPiano);
bakeryColors('paper-butter','Butter','纸包黄油',2401,['Blue',null,null,'Orange','Pink','Purple','Red'],color=>boxButter(color));
function boxButter(color){
 const g=new THREE.Group();
 box(g,'#e7c98d',.523,.197,.281,.043,0,0,0,'satin');
 box(g,color,.532,.019,.291,.008,0,.103,0,'ribbon');
 for(const x of [-.195,.195])box(g,color,.132,.205,.291,.026,x,-.008,0,'ribbon');
 printed(g,.184,.107,0,.115,0,c=>{
  c.fillStyle='#ead9b4';c.fillRect(0,0,512,512);
  c.fillStyle='#896554';c.textAlign='center';c.font='bold 150px sans-serif';printInk(c,'黄油',256,315);
 });
 return turn(g,1.01);
}
for(const [id,word] of [[392,'福'],[393,'喜'],[395,'吉'],[397,'乐']])bakeryRoute(id,new RegExp(word+'字糖果罐'),'candy-tin-'+id,()=>festivalCandyTin(word));
bakeryRoute(2310,/螺旋桨飞机/,'pink-propeller-airplane',()=>toyPlane(palette.Pink));
bakeryRoute(1951,/轮滑鞋/,'purple-bear-roller-skate',()=>rollerSkate(palette.Purple));
bakeryRoute(77,/小艇摆件/,'little-pink-cabin-boat',()=>cabinBoat(palette.Pink));

const parlorEntries=new Map(),parlorBuilders={};
function parlorRoute(id,pattern,kind,build){
 const routes=parlorEntries.get(id)??[];
 routes.push([pattern,kind]);
 parlorEntries.set(id,routes);
 parlorBuilders[kind]=build;
}
function parlorColors(prefix,en,cn,start,colors,build){
 for(const [offset,hue] of colors.entries()){
  if(hue)parlorRoute(start+offset,new RegExp(cn+'|^'+en+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
 }
}
function toySoldier(color){
 const g=new THREE.Group();
 disk(g,'#b58d75',.138,.145,.054,0,-.258,0,'satin');
 box(g,color,.210,.181,.129,.042,0,-.048,0);
 oval(g,'#d8ac91',.084,.076,.070,0,.109,.018,'satin');
 box(g,color,.170,.053,.145,.014,0,.174,.018);
 disk(g,color,.079,.088,.102,0,.237,.011);
 for(const s of [-1,1]){
  box(g,color,.062,.162,.074,.024,s*.126,-.062,.009).rotation.z=s*.15;
  box(g,'#96807c',.060,.145,.077,.017,s*.044,-.181,.002,'satin');
  box(g,'#6d5865',.076,.058,.112,.022,s*.048,-.236,.020,'satin');
  oval(g,'#62505c',.008,.010,.008,s*.028,.113,.081);
 }
 for(const y of [-.010,-.064,-.103])oval(g,'#dfbc83',.011,.010,.008,.004,y,.069,'metal');
 return turn(g,-.31);
}
function canvasShoe(color,skate=false){
 const g=new THREE.Group();
 box(g,'#ebd9ba',.270,.070,.506,.037,0,-.108,.031,'satin');
 oval(g,color,.141,.090,.218,0,-.024,.078,'satin',34);
 oval(g,color,.112,.133,.124,0,.046,-.083,'satin',30);
 oval(g,'#8c737c',.079,.024,.067,0,.175,-.098,'ribbon');
 for(let i=0;i<4;i++){
  const z=.094-i*.044,y=.034+i*.023;
  tube(g,'#e4cbb5',[[-.061,y,z],[.001,y+.009,z-.011],[.059,y,z-.018]],.006,'ribbon');
 }
 if(skate){
  for(const z of [-.106,.180])box(g,'#ba9f90',.073,.093,.050,.015,0,-.166,z,'metal');
  tube(g,'#cfbaa2',[[0,-.192,-.206],[0,-.224,-.144],[0,-.222,.160],[0,-.187,.241]],.020,'metal');
 }
 return turn(g,1.08);
}
function vintageSled(color){
 const g=new THREE.Group();
 for(const x of [-.126,.126]){
  tube(g,color,[[x,-.113,.267],[x,-.126,.132],[x,-.128,-.185],[x,-.086,-.285],[x,.021,-.313]],.026);
  for(const z of [-.123,.161])box(g,'#c0a087',.044,.135,.047,.014,x,-.038,z,'metal');
 }
 for(const x of [-.114,-.038,.038,.114])box(g,'#c29975',.065,.042,.446,.014,x,.041,.020,'satin');
 for(const z of [-.163,.165])box(g,color,.313,.050,.055,.019,0,.063,z,'glaze');
 return turn(g,1.03);
}
function mokaPot(color){
 const g=new THREE.Group(),sides=8;
 mesh(g,new THREE.CylinderGeometry(.165,.130,.178,sides),color,0,-.121,0);
 mesh(g,new THREE.CylinderGeometry(.143,.170,.165,sides),color,0,.097,0);
 mesh(g,new THREE.CylinderGeometry(.144,.148,.037,sides),'#c3a490',0,.192,0,'metal');
 box(g,'#84717b',.075,.053,.058,.020,0,.220,0,'satin');
 tube(g,color,[[-.124,.132,.065],[-.215,.146,.110],[-.211,.184,.139]],.036);
 tube(g,'#806e78',[[.099,.133,.064],[.231,.152,.067],[.232,.014,.069],[.176,-.044,.063]],.027,'satin');
 return turn(g,-.37);
}
function enamelKettleShape(color){
 const g=teaPot(color);
 tube(g,'#a28a7a',[[-.139,.059,-.080],[-.135,.224,-.036],[.002,.292,-.031],[.125,.204,-.050],[.152,.065,-.105]],.026,'satin');
 disk(g,'#e4c4a0',.056,.051,.039,0,.182,0,'metal');
 return g;
}
function suctionCupTool(color){
 const g=new THREE.Group();
 mesh(g,new THREE.LatheGeometry([[0,-.089],[.137,-.092],[.162,-.073],[.165,-.054],[.148,-.042],[.141,-.024],[.101,.034],[.057,.056],[.001,.058]].map(p=>new THREE.Vector2(...p)),42),color,0,-.120,0);
 tube(g,'#bd9978',[[0,-.063,0],[0,.033,.015],[0,.307,.040]],.025,'satin');
 oval(g,'#d0ad8a',.042,.051,.040,0,.288,.037,'satin');
 return turn(g,-.41);
}
function transparentBearGummy(color){
 const g=new THREE.Group();
 oval(g,color,.117,.113,.061,0,-.047,0,'ice',31);
 oval(g,color,.111,.088,.060,0,.083,0,'ice',30);
 for(const s of [-1,1]){
  oval(g,color,.043,.047,.040,s*.081,.140,0,'ice');
  oval(g,color,.042,.066,.041,s*.102,-.028,0,'ice').rotation.z=s*.39;
  oval(g,color,.048,.053,.040,s*.068,-.122,0,'ice');
  oval(g,'#a78676',.009,.011,.005,s*.034,.090,.057,'satin');
 }
 oval(g,color,.035,.025,.019,0,.056,.052,'ice');
 return turn(g,-.26);
}
function twistedMarshmallow(color){
 const g=new THREE.Group();
 for(let j=0;j<3;j++){
  const points=[];
  for(let i=0;i<=28;i++){
   const a=i*.31+j*tau/3;
   points.push([.062*Math.cos(a),.058*Math.sin(a),-.252+.018*i]);
  }
  tube(g,j===1?'#e7d9c5':color,points,.052,'satin');
 }
 return turn(g,.77);
}
function cakeRoll(color){
 const g=new THREE.Group();
 const body=disk(g,'#d2a67e',.160,.166,.398,0,-.010,0,'satin');
 body.rotation.z=Math.PI/2;
 for(const sign of [-1,1]){
  const cap=disk(g,color,.150,.150,.022,sign*.198,-.010,0,'satin');cap.rotation.z=Math.PI/2;
  const spiral=[];
  for(let i=0;i<=24;i++){
   const a=i*tau/14,r=.031+.0043*i;
   spiral.push([sign*.212,Math.cos(a)*r-.010,Math.sin(a)*r]);
  }
  tube(g,'#ead5b3',spiral,.014,'satin');
 }
 return turn(g,.96);
}
function softPinCushion(color){
 const g=new THREE.Group();
 oval(g,color,.180,.081,.173,0,0,0,'ribbon',34);
 const rim=ring(g,'#d6b9a2',.162,.009,0,-.033,0,'ribbon');rim.rotation.x=Math.PI/2;
 for(const [x,z,y,c] of [[-.058,-.054,.138,'#a8a486'],[.064,.034,.158,'#dfb18e'],[.065,-.051,.123,'#bd899d'],[-.048,.073,.147,'#769cac']]){
  tube(g,'#c9b59d',[[x,.049,z],[x*.87,y,z*.88]],.003,'metal');
  oval(g,c,.017,.016,.016,x*.87,y,z*.88);
 }
 return turn(g,.88);
}
function shearsSalon(color){
 const g=new THREE.Group();
 for(const s of [-1,1]){
  const finger=ring(g,color,.067,.016,s*.082,.005,.164,'glaze');finger.rotation.x=Math.PI/2;finger.scale.y=1.21;
  const blade=box(g,'#bdb2a9',.045,.026,.330,.009,-s*.049,0,-.083,'metal');
  blade.rotation.y=s*.27;
  tube(g,color,[[s*.080,.007,.112],[s*.045,.010,.064],[0,.008,.005]],.018);
 }
 oval(g,'#c69e82',.026,.017,.026,0,.022,-.005,'metal');
 return turn(g,1.10);
}
function seatedSailorDuck(color){
 const g=apronDuck(color);
 const cap=disk(g,'#ebd9ba',.139,.123,.059,0,.212,.104,'satin');
 cap.rotation.z=-.14;
 box(g,color,.200,.019,.052,.012,0,.232,.149);
 oval(g,color,.041,.038,.049,0,.262,.104,'satin');
 return g;
}
parlorColors('toy-soldier','Soldier','士兵',885,['Green','Grey','Pink',null,null,'Yellow'],toySoldier);
parlorColors('six-arm-snowflake','Snowpiece','雪花挂件',2058,['Grey','Blue','Green','Orange'],snowPendant);
parlorColors('city-hatchback','Cooper Car','两厢',1967,['Green',null,null,'Purple','Pink','Red','Yellow'],color=>roadCar(color));
parlorColors('canvas-sneaker','Sneakers','运动鞋|帆布鞋',2200,['Grey','Orange','Pink','Purple','Red'],color=>canvasShoe(color));
parlorColors('metal-ice-skate','Ice Skate','冰刀鞋',1912,['Purple',null,'Orange','White',null,null,'Yellow'],color=>canvasShoe(color,true));
parlorColors('runner-sled','Sled','雪橇',2043,['Blue','Brown',null,'Grey',null,'Purple'],vintageSled);
parlorColors('glass-tv','Television','电视',899,['Blue','Green'],crt);
parlorColors('gloss-bear-candy','Bear Candy','小熊软糖',1863,['Blue','Green',null,'Purple','Red','Yellow'],transparentBearGummy);
parlorColors('handheld-moka','Moka Pot','摩卡壶',2592,['Blue','Green','Grey','Orange','Pink',null,'Yellow'],mokaPot);
parlorColors('rubber-plunger','Plunger','皮搋子',2231,['Grey',null,null,'Purple','Red'],suctionCupTool);
parlorColors('sport-offroad','Bruno Car','玩具车',1974,['Blue','Green','Grey','Orange','Purple',null,'Red','Yellow'],monsterTruck);
parlorColors('enameled-kettle','Kettle','搪瓷水壶',2584,['Blue','Green','Grey',null,'Pink','Purple'],enamelKettleShape);
parlorColors('glazed-boiled-egg','Boiled Egg','彩壳鸡蛋',2394,['Green',null,null,'Pink','Purple','Red','Yellow'],colorEgg);
parlorColors('hairdressing-shears','Barber Scissors','理发剪',2689,['Orange','Pink','Purple','Red','Grey','Yellow'],shearsSalon);
parlorColors('chilled-jelly','Jello','果冻',2783,['Blue',null,'Green','Orange','Pink','Purple','Red','Yellow'],jellyCup);
parlorColors('colored-sailor-duck','Bath Duck','搪胶小鸭|水手鸭|浴缸小鸭',2221,['Blue',null,null,null,'Pink','Purple','Red','White'],(color,hue)=>hue==='Pink'?seatedSailorDuck(color):enamelDuck(color));
parlorColors('marshmallow-rope','Marshmallow Twist','棉花糖',1881,['Colorful','Green','Orange','Pink','Red'],(color,hue)=>twistedMarshmallow(hue==='Colorful'?'#cda7a1':color));
for(const [id,hue] of [[425,'Green'],[426,'Pink'],[427,'Purple'],[428,'Red']])parlorRoute(id,/针插/,'needle-pad-'+hue.toLowerCase(),()=>softPinCushion(palette[hue]));
for(const [id,hue] of [[2793,'Green'],[2795,'Pink']])parlorRoute(id,/蛋糕卷/,'cake-roll-'+hue.toLowerCase(),()=>cakeRoll(palette[hue]));
parlorRoute(2532,/水手鸭/,'pink-sailor-duck',()=>seatedSailorDuck(palette.Pink));
parlorRoute(1746,/洗漱包/,'travel-toiletry-bag',()=>cosmeticPouch(palette.Green));
parlorRoute(2339,/手提旅行箱/,'brown-hand-luggage',()=>carryOn(palette.Brown));
parlorRoute(2341,/手提旅行箱/,'grey-hand-luggage',()=>carryOn(palette.Grey));
parlorRoute(892,/按键电话/,'green-push-button-phone',()=>keypadPhone(palette.Green));
parlorRoute(893,/按键电话/,'orange-push-button-phone',()=>keypadPhone(palette.Orange));
parlorRoute(898,/拨盘座机/,'retro-dial-phone',()=>rotaryPhone('#ab856b'));
for(const [id,hue] of [[2292,'Green'],[2295,'Pink']])parlorRoute(id,/旅行证件本/,'travel-passport-'+hue.toLowerCase(),()=>boundBook({color:palette[hue],title:'旅行证',label:'旅行纪念'}));
parlorRoute(30,/瓷汤匙/,'ivory-soup-spoon',()=>colorSpoon('#e5c7a0'));
parlorRoute(30,/油条/,'fried-dough-stick',friedDough);
parlorRoute(171,/福字香包/,'embroidered-good-luck-sachet',beanSachet);
parlorRoute(1853,/小母鸡/,'glazed-hen',()=>ducklingChick('#ece0c7'));

const finishDetailEntries=new Map(),finishDetailBuilders={};
function finishDetailRoute(id,pattern,kind,build){
 const routes=finishDetailEntries.get(id)??[];
 routes.push([pattern,kind]);
 finishDetailEntries.set(id,routes);
 finishDetailBuilders[kind]=build;
}
function finishDetailColors(prefix,en,cn,ids,build){
 for(const [id,hue] of ids)finishDetailRoute(id,new RegExp(cn+'|^'+en+' '+hue+'$'),prefix+'-'+hue.toLowerCase(),()=>build(palette[hue],hue));
}
function sportJetSki(color){
 const g=new THREE.Group();
 oval(g,color,.155,.074,.331,0,-.074,0,'glaze',35);
 box(g,'#ead9bb',.233,.048,.413,.025,0,-.014,.060,'satin');
 oval(g,'#82717b',.078,.052,.173,0,.050,-.046,'satin');
 oval(g,color,.100,.078,.137,0,.058,.207);
 tube(g,'#927c82',[[0,.061,.137],[0,.159,.120],[-.089,.180,.106]],.017,'metal');
 tube(g,'#927c82',[[0,.159,.120],[.093,.180,.106]],.017,'metal');
 return turn(g,-.51);
}
function rescueBoat(color){
 const g=cabinBoat(color);
 for(const x of [-.121,.121]){
  tube(g,'#e9d5b5',[[x,.105,-.255],[x,.117,-.089],[x,.116,.119],[x*.72,.121,.231]],.012,'ribbon');
  oval(g,'#e7c395',.035,.019,.101,x,.109,-.042,'satin');
 }
 const ringBuoy=ring(g,'#d6a980',.055,.014,0,.135,-.108);
 ringBuoy.rotation.x=Math.PI/2;
 return g;
}
function dogWithEars(color,droop){
 const g=new THREE.Group();
 oval(g,color,.142,.143,.202,0,-.058,-.069,'glaze',35);
 oval(g,color,.128,.132,.122,0,.052,.114,'glaze',33);
 oval(g,'#d0a990',.095,.068,.081,0,.032,.220,'satin');
 oval(g,'#705763',.044,.022,.020,0,.069,.285);
 for(const s of [-1,1]){
  if(droop)oval(g,'#ab7f68',.050,.137,.066,s*.121,.049,.102,'satin').rotation.z=s*.21;
  else mesh(g,new THREE.ConeGeometry(.061,.166,4),color,s*.084,.195,.086).rotation.z=s*.26;
  oval(g,'#665262',.017,.017,.012,s*.047,.107,.215);
  for(const z of [.054,-.160])oval(g,color,.050,.083,.056,s*.088,-.133,z,'glaze');
 }
 tube(g,color,[[0,-.030,-.246],[.052,.049,-.275],[.087,.131,-.240]],.030);
 return turn(g,-.33);
}
function handDrum(color,paired=false){
 const g=new THREE.Group();
 for(const [x,scale] of paired?[[-.109,.80],[.113,1.03]]:[[0,1]]){
  const y=paired?-.018:0;
  disk(g,color,.132*scale,.084*scale,.362*scale,x,y,0);
  disk(g,'#e8ceb0',.132*scale,.131*scale,.035*scale,x,y+.187*scale,0,'satin');
  const trim=ring(g,'#c0a081',.131*scale,.012*scale,x,y+.161*scale,0,'metal');trim.rotation.x=Math.PI/2;
  for(const a of [0,tau/3,tau*2/3])tube(g,'#e4c6a6',[[x+.100*scale*Math.cos(a),y-.098,scale*.102*Math.sin(a)],[x+.125*scale*Math.cos(a),y+.156,scale*.125*Math.sin(a)]],.008,'satin');
 }
 return turn(g,-.57);
}
function smallSax(color){
 const g=new THREE.Group();
 tube(g,color,[[-.136,.220,.013],[-.185,.190,.016],[-.170,.021,.017],[-.113,-.214,.031],[.019,-.170,.032],[.097,-.040,.036]],.036);
 const bell=mesh(g,new THREE.LatheGeometry([[.035,-.090],[.048,-.025],[.064,.021],[.102,.062],[.104,.080],[.089,.083],[.065,.059],[.046,.007],[.029,-.081]].map(p=>new THREE.Vector2(...p)),36),color,.092,-.063,.037,'metal');
 bell.rotation.z=-.31;
 tube(g,'#856d78',[[-.145,.220,.016],[-.071,.257,.023],[-.037,.248,.025]],.018,'satin');
 for(let i=0;i<4;i++)oval(g,'#e0c4a2',.020,.016,.009,-.166+.012*i,.124-.067*i,.050,'metal');
 return turn(g,.25);
}
function paperHorse(color){
 const g=new THREE.Group();
 oval(g,color,.193,.111,.122,0,-.035,-.026,'ribbon',31);
 oval(g,color,.081,.146,.095,-.098,.080,.056,'ribbon');
 oval(g,color,.106,.073,.090,-.121,.192,.105,'ribbon');
 for(const s of [-1,1]){
  mesh(g,new THREE.ConeGeometry(.043,.097,5),color,-.136,.256,.075+s*.048,'ribbon');
  for(const x of [-.091,.100])box(g,color,.064,.164,.052,.015,x,-.152,s*.072,'ribbon');
  oval(g,'#7d6474',.012,.013,.008,-.156,.208,.163+s*.010,'satin');
 }
 for(let i=0;i<6;i++){
  const x=-.135+i*.048;
  box(g,['#e0c38f','#af9eaf','#c69a8f'][i%3],.043,.024,.177,.008,x,.047,-.030,'ribbon');
 }
 tube(g,color,[[.145,-.016,-.014],[.212,.017,-.092],[.262,-.066,-.120]],.039,'ribbon');
 return turn(g,-.41);
}
function scarfPenguin(color){
 const g=new THREE.Group();
 oval(g,'#796c7e',.149,.181,.122,0,-.065,-.010,'glaze',34);
 oval(g,'#eedac0',.105,.134,.042,0,-.062,.103,'satin');
 oval(g,'#817284',.133,.114,.127,0,.139,.026,'glaze',34);
 oval(g,'#c39675',.050,.032,.050,0,.112,.145);
 for(const s of [-1,1]){
  oval(g,'#6c5666',.014,.018,.010,s*.056,.164,.136);
  oval(g,'#877586',.059,.101,.050,s*.146,-.054,-.026).rotation.z=s*.37;
  oval(g,'#bf986f',.060,.024,.073,s*.055,-.222,.049,'satin');
 }
 const scarf=ring(g,color,.113,.023,0,.043,.024,'ribbon');scarf.rotation.x=Math.PI/2;
 box(g,color,.062,.122,.024,.011,.091,.002,.122,'ribbon').rotation.z=-.28;
 return turn(g,-.32);
}
function sesameFlatbread(){
 const g=new THREE.Group();
 baked(g,[.225,.089,.230],[0,-.011,0]);
 for(let i=0;i<17;i++){
  const a=i*2.4,r=.036+.008*i;
  oval(g,'#e7c895',.014,.005,.007,Math.cos(a)*r,.074+.006*Math.sin(i*2.2),Math.sin(a)*r,'matte',10).rotation.y=a;
 }
 return turn(g,1.02);
}
function cerealRiceCrackers(color){
 const g=celadonBowl(color);
 for(const [x,y,z] of [[-.07,.082,-.03],[.011,.101,.052],[.065,.088,-.039]]){
  const cracker=oval(g,'#dab788',.112,.021,.073,x,y,z,'matte');
  cracker.rotation.z=x*4.1;
 }
 return g;
}
function pencilTin(){
 const g=new THREE.Group();
 box(g,'#789dad',.641,.110,.260,.028,0,-.021,0);
 box(g,'#d2b69b',.645,.044,.267,.019,0,.044,0,'metal');
 box(g,'#b2c1c1',.570,.020,.200,.011,0,.075,0,'satin');
 for(const x of [-.197,.197])oval(g,'#d1a57e',.029,.011,.026,x,.087,0,'metal');
 return turn(g,1.03);
}
function mechanicalSharpener(){
 const g=new THREE.Group();
 box(g,'#9db2a2',.241,.261,.199,.041,0,-.014,0);
 box(g,'#dfcbb0',.168,.070,.200,.028,0,.122,0,'satin');
 const socket=ring(g,'#c5ab91',.039,.009,0,.043,.104,'metal');
 oval(g,'#77636e',.032,.034,.016,0,.045,.104,'satin');
 tube(g,'#b19683',[[.116,-.018,-.043],[.158,-.018,-.043],[.168,.044,-.039]],.012,'metal');
 oval(g,'#d2a779',.029,.025,.032,.171,.060,-.034);
 return turn(g,-.32);
}
function smallBlueRabbit(){
 const g=new THREE.Group();
 oval(g,'#a3a4af',.139,.145,.171,0,-.067,-.039,'glaze',36);
 oval(g,'#b1acb6',.134,.114,.110,0,.069,.102,'glaze',33);
 for(const s of [-1,1]){
  oval(g,'#a1a5b5',.040,.111,.041,s*.071,.233,.103).rotation.z=s*-.23;
  oval(g,'#d4a8ac',.018,.074,.011,s*.073,.235,.139,'satin').rotation.z=s*-.23;
  oval(g,'#6f5967',.014,.016,.011,s*.048,.095,.191);
  oval(g,'#bdadb6',.043,.039,.062,s*.065,-.176,.089,'satin');
 }
 oval(g,'#d2a5ae',.023,.013,.013,0,.064,.207);
 oval(g,'#ddd2c7',.051,.049,.052,0,-.056,-.189,'satin');
 return turn(g,-.41);
}
function pairOfChopsticks(){
 const g=new THREE.Group();
 for(const x of [-.039,.039]){
  tube(g,'#c59a73',[[x,-.009,-.337],[x,0,-.033],[x,.002,.344]],.015,'satin');
  box(g,'#b3826a',.033,.036,.228,.010,x,0,.238,'satin');
  for(const z of [.170,.217])box(g,'#dfbd88',.034,.038,.014,.005,x,0,z,'ribbon');
 }
 return turn(g,1.10);
}
function hobbyElectricGuitar(color){
 const g=acousticToyGuitar(color);
 const pickup=box(g,'#e8cdb2',.213,.025,.151,.018,0,.069,.090,'glaze');
 pickup.rotation.y=.07;
 for(const z of [.043,.112,.160])box(g,'#b3a298',.133,.020,.031,.008,0,.087,z,'metal');
 for(const z of [.075,.142,.190])oval(g,'#d6ae90',.020,.016,.021,.123,.071,z,'metal');
 return g;
}
function tabletopDisplayCannon(){
 const g=new THREE.Group();
 box(g,'#b28975',.286,.159,.290,.031,0,-.062,.017,'satin');
 const barrel=mesh(g,new THREE.LatheGeometry([[.002,-.179],[.085,-.180],[.101,-.142],[.073,.131],[.068,.211],[.091,.225],[.091,.250],[.058,.252],[.050,.208],[.049,.144]].map(p=>new THREE.Vector2(...p)),36),'#d09770',0,.058,.025,'glaze');
 barrel.rotation.x=1.17;
 for(const x of [-.158,.158]){
  disk(g,'#ad8a74',.102,.111,.038,x,-.101,.065,'satin').rotation.z=Math.PI/2;
  disk(g,'#dbc199',.041,.041,.047,x,-.101,.065,'metal').rotation.z=Math.PI/2;
 }
 return turn(g,-.32);
}
function sheepFigure(){
 const g=new THREE.Group();
 oval(g,'#e3d4bd',.172,.137,.208,0,-.016,-.055,'satin',34);
 for(let i=0;i<14;i++){
  const a=i*2.4;
  oval(g,'#e7d8c1',.055,.053,.058,.143*Math.sin(a),-.010+.111*Math.cos(a),-.135+(i%5)*.054,'satin');
 }
 oval(g,'#a98d83',.091,.109,.099,0,.076,.142,'glaze',28);
 for(const s of [-1,1]){
  oval(g,'#bca296',.053,.035,.030,s*.083,.131,.113,'satin');
  oval(g,'#75616a',.014,.016,.010,s*.041,.101,.223);
  for(const z of [-.122,.060])oval(g,'#b49a90',.040,.081,.040,s*.079,-.129,z,'satin');
 }
 oval(g,'#e2d1b9',.069,.040,.046,0,.168,.141,'satin');
 return turn(g,-.38);
}
function donkeyFigure(){
 const g=dogWithEars('#91a1ae',false);
 for(const s of [-1,1]){
  oval(g,'#93a4af',.042,.113,.040,s*.057,.244,.125).rotation.z=-s*.27;
  oval(g,'#c3a6a1',.020,.073,.013,s*.059,.257,.151,'satin');
 }
 oval(g,'#c0b2a4',.092,.046,.058,0,.026,.266,'satin');
 return g;
}
function weightBar(color){
 const g=new THREE.Group();
 tube(g,'#d0bba4',[[-.377,0,0],[0,0,0],[.377,0,0]],.022,'metal');
 for(const s of [-1,1]){
  for(const [x,r,c] of [[.242,.117,color],[.286,.103,'#b7a08b'],[.322,.082,color]]){
   disk(g,c,r,r,.043,s*x,0,0,'satin').rotation.z=Math.PI/2;
  }
 }
 return turn(g,-.35);
}
function twinBellClock(){
 const g=wristStopwatch('#b68578');
 for(const s of [-1,1]){
  oval(g,'#c79a77',.089,.052,.068,s*.136,.178,0,'metal').rotation.z=-s*.42;
  tube(g,'#b69a81',[[s*.087,-.146,0],[s*.143,-.202,.024]],.016,'metal');
 }
 return g;
}
finishDetailColors('toy-jet-ski','Jet Ski','摩托艇',[[2498,'Green'],[2504,'Yellow']],sportJetSki);
finishDetailColors('bongo-pair','Bongo','邦戈',[[2437,'Orange'],[2438,'Pink'],[2439,'Purple'],[2441,'Yellow']],color=>handDrum(color,true));
finishDetailColors('conga-drum','Conga','康加鼓',[[2443,'Blue'],[2445,'Green'],[2446,'Orange']],handDrum);
finishDetailColors('toy-saxophone','Saxophone','萨克斯',[[2475,'Green'],[2477,'Pink'],[2478,'Purple'],[2480,'Yellow']],smallSax);
finishDetailColors('paper-pony','Pinata','彩纸小马',[[2667,'Blue'],[2670,'Pink']],paperHorse);
finishDetailColors('alien-figure','Alien','外星人',[[1029,'Pink'],[1031,'Grey']],alienDoll);
finishDetailColors('winter-mitten','Glove Winter','连指手套',[[1935,'Purple'],[1936,'Pink']],ovenGlove);
finishDetailColors('boxer-duffle','Gym Bag','运动包',[[2173,'Blue'],[2174,'Green'],[2177,'Pink']],sportDuffle);
finishDetailColors('groomer-duck','Barber Duck','理发师小鸭',[[2683,'Pink'],[2684,'Purple'],[2686,'White']],seatedSailorDuck);
finishDetailColors('porcelain-cracker-bowl','Nachos','瓷碗米饼',[[2661,'Blue'],[2662,'Green'],[2663,'Pink'],[2664,'Purple'],[2665,'White']],cerealRiceCrackers);
for(const [id,hue] of [[1903,'Red'],[1904,'Purple'],[1909,'Blue'],[1910,'Yellow']])finishDetailRoute(id,/围巾企鹅/,'scarf-penguin-'+hue.toLowerCase(),()=>scarfPenguin(palette[hue]));
for(const [id,hue] of [[1450,'Grey'],[1451,'Blue'],[1456,'Red']])finishDetailRoute(id,/便携炉/,'compact-gas-hob-'+hue.toLowerCase(),()=>tabletopStove(palette[hue]));
for(const [id,hue] of [[1167,'Pink'],[1168,'Purple']])finishDetailRoute(id,/双盘摄影机/,'two-reel-camera-'+hue.toLowerCase(),()=>filmCamera(palette[hue]));
for(const [id,hue] of [[331,'Purple'],[333,'Yellow']])finishDetailRoute(id,/借阅登记本/,'library-register-'+hue.toLowerCase(),()=>boundBook({coil:true,title:'借阅登记',color:palette[hue],label:'图书室'}));
finishDetailRoute(2508,/救生艇/,'rescue-cabin-boat',()=>rescueBoat(palette.Pink));
finishDetailRoute(2515,/快艇/,'orange-sport-boat',()=>cabinBoat(palette.Orange));
finishDetailRoute(2616,/立耳犬/,'point-ear-dog',()=>dogWithEars('#b78870',false));
finishDetailRoute(2629,/垂耳犬/,'floppy-ear-dog',()=>dogWithEars('#c19c75',true));
finishDetailRoute(1740,/粉底刷/,'orange-foundation-brush',()=>makeupBrush(palette.Orange));
finishDetailRoute(2454,/电吉他/,'pink-electric-guitar',()=>hobbyElectricGuitar(palette.Pink));
finishDetailRoute(1677,/玩具古炮/,'toy-cannon',tabletopDisplayCannon);
finishDetailRoute(2415,/枫糖浆/,'maple-syrup-jar',()=>preserveJar('#997661','枫糖'));
finishDetailRoute(36,/铁皮铅笔盒/,'metal-pencil-tin',pencilTin);
finishDetailRoute(4,/卷笔刀/,'mechanical-pencil-sharpener',mechanicalSharpener);
finishDetailRoute(1862,/绵羊摆件/,'glazed-sheep',sheepFigure);
finishDetailRoute(1856,/小毛驴/,'blue-donkey-figure',donkeyFigure);
finishDetailRoute(13,/芝麻烧饼/,'sesame-flatbread',sesameFlatbread);
finishDetailRoute(2416,/芝麻烧饼/,'toasted-sesame-flatbread',sesameFlatbread);
for(const [id,hue] of [[2157,'Blue'],[2158,'Red']])finishDetailRoute(id,/训练杠铃/,'steel-barbell-'+hue.toLowerCase(),()=>weightBar(palette[hue]));
finishDetailRoute(288,/木柄梳子/,'carved-hair-comb',()=>wideComb(palette.Brown));
finishDetailRoute(2106,/啄木鸟/,'red-cap-woodpecker',()=>longBeakBird('#a395a1','#b86e67'));
finishDetailRoute(2103,/深灰色小鹰/,'gray-soaring-eagle',()=>soaringBird('#7c6e7a'));
finishDetailRoute(1983,/加长小汽车/,'long-green-motorcar',()=>roadCar(palette.Green,true));
finishDetailRoute(2033,/玩具冰屋/,'red-toy-igloo',()=>iglooMiniature(palette.Red));
finishDetailRoute(408,/包装巧克力/,'red-paper-chocolate-bar',()=>wrappedChocolate(palette.Red));
finishDetailRoute(2019,/皮卡玩具车/,'glazed-pickup-red',()=>toyPickup(palette.Red));
finishDetailRoute(18,/筷子/,'wood-chopsticks',pairOfChopsticks);
finishDetailRoute(33,/青花饭碗/,'blue-and-white-bowl',blueBowl);
finishDetailRoute(32,/小碟/,'small-porcelain-saucer',()=>ceramicPlate(palette.White));
finishDetailRoute(1492,/双铃闹钟/,'twin-bell-desk-clock',twinBellClock);
finishDetailRoute(920,/兔子玩偶/,'gray-bunny-figure',smallBlueRabbit);

function lessonBowlingPin(color){
 const g=new THREE.Group();
 const profile=[[.001,-.269],[.091,-.266],[.134,-.200],[.157,-.089],[.144,.012],[.105,.105],[.076,.173],[.067,.220],[.088,.271],[.080,.336],[.048,.367],[.001,.372]].map(p=>new THREE.Vector2(...p));
 mesh(g,new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(52),48),'#eedfc3');
 for(const [y,r] of [[.171,.079],[.214,.070]])ring(g,color,r,.010,0,y,0).rotation.x=Math.PI/2;
 return turn(g,-.31);
}
function lessonBowlingBall(color){
 const g=new THREE.Group();
 oval(g,color,.324,.322,.324,0,0,0,'glaze',46);
 for(const [x,y] of [[-.086,.037],[.013,.103],[.077,-.027]]){
  const z=Math.sqrt(.322**2-x**2-y**2);
  const lip=ring(g,'#b8a48f',.032,.006,x,y,z);
  lip.rotation.set(-y*.7,x*.7,0);
  oval(g,'#695768',.029,.032,.010,x,y,z-.002,'satin');
 }
 return turn(g,-.36);
}
function lessonStudBrick(color,count){
 const g=new THREE.Group(),width=.230+count*.131;
 box(g,color,width,.172,.277,.025,0,-.036,0);
 for(let i=0;i<count;i++){
  const x=(i-(count-1)/2)*.134;
  disk(g,color,.050,.059,.061,x,.074,0);
  ring(g,color,.034,.004,x,.109,0,'satin').rotation.x=Math.PI/2;
 }
 return turn(g,1.05);
}
function lessonLetterTile(letter){
 const color={L:'#95adae',V:'#d5a07d',O:'#a3af80',E:'#bd95a3'}[letter];
 const g=new THREE.Group();
 box(g,color,.371,.142,.371,.039,0,-.029,0);
 printed(g,.267,.257,0,.049,0,c=>{
  c.fillStyle=color;c.fillRect(0,0,512,512);
  c.fillStyle='#f1e0bd';c.font='bold 300px sans-serif';c.textAlign='center';printInk(c,letter,256,359);
 });
 return turn(g,1.13);
}
function lessonTinCan(color,label){
 const g=cerealFlourTin(color);
 const art=printed(g,.184,.150,0,0,0,c=>{
  c.fillStyle='#f1d9af';c.fillRect(0,0,512,512);
  c.fillStyle=color;c.beginPath();c.arc(253,178,89,0,tau);c.fill();
  c.fillStyle='#74574f';c.font='bold 115px sans-serif';c.textAlign='center';printInk(c,label,256,384);
 });
 art.position.set(0,-.022,.196);art.rotation.set(0,0,0);
 return g;
}
function lessonPalette(){
 const g=new THREE.Group(),outline=new THREE.Shape();
 outline.moveTo(-.275,-.192);outline.bezierCurveTo(-.393,.002,-.263,.239,-.046,.278);
 outline.bezierCurveTo(.156,.322,.326,.200,.329,.047);outline.bezierCurveTo(.331,-.159,.183,-.287,.011,-.291);
 outline.quadraticCurveTo(-.182,-.306,-.275,-.192);outline.closePath();
 const grip=new THREE.Path();grip.absellipse(.187,-.147,.054,.060,0,tau,true);outline.holes.push(grip);
 extrudedSurface(g,outline,'#e1cfad',-.044,0,.073,.014,'satin');
 for(const [x,z,color] of [[-.181,-.120,'#c48487'],[-.097,-.190,'#d5ac71'],[.004,-.205,'#93a574'],[.115,-.178,'#7fa4ac'],[-.172,.042,'#ab97b1'],[-.092,.151,'#dfc0a5']]){
  const well=ring(g,'#dcc5a4',.047,.008,x,.048,z,'satin');well.rotation.x=Math.PI/2;
  oval(g,color,.042,.013,.039,x,.047,z,'ice');
 }
 return turn(g,1.01);
}
function lessonSpeaker(){
 const g=new THREE.Group();
 box(g,'#7fa2af',.318,.422,.240,.043,0,0,0);
 box(g,'#d3bdab',.257,.357,.024,.024,0,0,.120,'satin');
 for(const [y,r] of [[-.065,.084],[.103,.060]]){
  ring(g,'#c39e89',r,.012,0,y,.139,'metal');
  oval(g,'#796979',r*.93,r*.93,.015,0,y,.134,'satin');
  oval(g,'#9a8395',r*.43,r*.43,.012,0,y,.151,'satin');
 }
 return turn(g,-.40);
}
function lessonMilkBottle(){
 const g=new THREE.Group();
 const profile=[[.001,-.230],[.095,-.232],[.134,-.199],[.137,.060],[.127,.118],[.087,.156],[.080,.193],[.001,.200]].map(x=>new THREE.Vector2(...x));
 mesh(g,new THREE.LatheGeometry(profile,48),'#e4d3ba',0,0,0,'ice');
 disk(g,'#7199b2',.083,.085,.066,0,.206,0);
 const band=ring(g,'#95afb2',.124,.014,0,-.055,0,'satin');band.rotation.x=Math.PI/2;
 box(g,'#abc0bc',.136,.114,.024,.013,0,-.056,.137);
 g.scale.setScalar(1.36);
 return turn(g,-.41);
}
function lessonJuiceCarton(color,title,fruit){
 const g=new THREE.Group();
 box(g,color,.307,.443,.227,.035,0,-.028,0,'glaze');
 box(g,'#eeddbd',.299,.084,.221,.027,0,.210,0,'satin');
 box(g,color,.241,.032,.111,.013,0,.258,0,'glaze');
 disk(g,'#f1e1c2',.048,.052,.040,.073,.264,.030,'satin');
 const label=printed(g,.246,.304,0,0,0,c=>{
  c.fillStyle='#f2dfbd';c.fillRect(0,0,512,512);
  c.fillStyle=fruit;c.beginPath();c.ellipse(255,185,106,109,-.14,0,tau);c.fill();
  c.fillStyle='#9baa81';c.beginPath();c.ellipse(294,81,61,23,-.31,0,tau);c.fill();
  c.fillStyle='#795955';c.textAlign='center';c.font='bold 83px sans-serif';printInk(c,title,256,398);
 });
 label.position.set(0,-.032,.116);label.rotation.set(0,0,0);
 return turn(g,-.44);
}
function lessonElectricKettle(){
 const g=enamelKettleShape('#a1afb0');
 box(g,'#bba198',.283,.039,.269,.018,0,-.198,.017,'metal');
 box(g,'#b48781',.066,.030,.028,.009,.055,-.039,.163);
 return g;
}
const lessonObjects={
 'giftblue':['blue-ribbon-gift',()=>tiedGift('#7c9db4')],
 'ice':['translucent-ice-cube',ice],
 'play-block-red':['red-single-stud-brick',()=>lessonStudBrick('#ba7e79',1)],
 'play-block-blue':['blue-double-stud-brick',()=>lessonStudBrick('#78a1b2',2)],
 'play-block-gold':['gold-triple-stud-brick',()=>lessonStudBrick('#d6af72',3)],
 'balloon-round':['round-violet-balloon',()=>regularBalloon('#a593b3')],
 'record-berry':['berry-vinyl-record',()=>vinylDisc('#ba8495')],
 'record-mint':['mint-vinyl-record',()=>vinylDisc('#9fbaa5')],
 'record-blue':['indigo-vinyl-record',()=>vinylDisc('#7f8cad')],
 'pinblue':['bowling-pin-blue-stripe',()=>lessonBowlingPin('#7ea7b8')],
 'pingreen':['bowling-pin-green-stripe',()=>lessonBowlingPin('#8fad91')],
 'bowlinggreen':['bowling-ball-green',()=>lessonBowlingBall('#8daa86')],
 'bowlingpink':['bowling-ball-pink',()=>lessonBowlingBall('#c99ca8')],
 'soldier':['lesson-toy-soldier',()=>toySoldier('#99a583')],
 'limecan':['lime-pantry-can',()=>lessonTinCan('#9faa78','青柠')],
 'tomatocan':['tomato-pantry-can',()=>lessonTinCan('#bc8276','番茄')],
 'toy-bus':['lesson-red-toy-bus',()=>roadCar('#bc8079',true)],
 'toy-locomotive':['lesson-blue-locomotive',()=>toyEngine('#779bad')],
 'watercolor-tray':['porcelain-watercolor-tray',lessonPalette],
 'blue-paint-tube':['blue-paint-tube',()=>softPasteTube('#7e9eae')],
 'yellowapple':['lesson-golden-apple',appleYellow],
 'racket-blue':['blue-tennis-racket',()=>racket('#779cab',false)],
 'racket-green':['green-tennis-racket',()=>racket('#90a77e',false)],
 'pingpong-paddle':['red-table-tennis-paddle',()=>racket('#bf827d',true)],
 'badminton-racket':['yellow-badminton-racket',()=>{
  const g=racket('#dcb16e',false);
  g.scale.set(.77,1,1.15);
  return g;
 }],
 'training-bat':['wooden-training-bat',()=>baseballBat('#bc946f')],
 'baseball-practice':['stitched-practice-baseball',baseball],
 'sport-pingpong-ball':['porcelain-table-tennis-ball',()=>{const g=new THREE.Group();oval(g,'#f2dfbd',.254,.254,.254,0,0,0,'satin',36);return g;}],
 'radio':['purple-table-radio',()=>radio('#a38bab')],
 'headphones':['lesson-headphones',()=>bandHeadphone('#c5988d')],
 'speaker':['blue-bookcase-speaker',lessonSpeaker],
 'icecream':['waffle-cone-ice-cream',()=>iceScoop('#cea09d')],
 'orange-carton':['orange-juice-carton',()=>lessonJuiceCarton('#dca16e','橙汁','#dc9865')],
 'berry-carton':['berry-juice-carton',()=>lessonJuiceCarton('#c98da0','莓果','#bd7887')],
 'green-soda':['lime-soda-bottle',()=>sodaBottle('#a7b183')],
 'milk-drink':['lesson-milk-bottle',lessonMilkBottle],
 'enamel-kettle':['lesson-enamel-kettle',lessonElectricKettle],
 'mung-bean-ice-pop':['mung-bean-ice-pop',()=>icePopBits('#9fac80','bean')],
 'red-bean-ice-pop':['red-bean-ice-pop',()=>icePopBits('#ba8a81','bean')],
};
for(const letter of ['L','V','O','E'])lessonObjects['letter-tile-'+letter]=['lesson-letter-'+letter,()=>lessonLetterTile(letter)];
for(const [ball,paint] of [[1,'#daa857'],[2,'#7195ae'],[3,'#b96e68'],[4,'#9f83ab'],[5,'#d09a64'],[6,'#84a37d'],[10,'#7297b3'],[12,'#a68db3'],[15,'#986e75']])lessonObjects['pool-ball-'+ball]=['lesson-numbered-ball-'+ball,()=>poolBall(ball,paint)];
const lessonBuilders=Object.fromEntries(Object.values(lessonObjects));

const entries = new Map([
  [424,[[/小熊面包/,'bear-bread'],[/针插/,'pin-cushion']]],
  [326,[[/登记本/,'library-register'],[/线圈|作业本/,'coil-book-blue'],[/^Notebook Blue$/,'coil-book-blue']]],
  [350,[[/软尺/,'sewing-tape'],[/直尺|刻度直尺|^Ruler Blue$/,'ruler-blue']]],
  [279,[[/水浒/,'book-water-margin'],[/海边邮局/,'book-post-office'],[/蓝色书本|^Book Blue$/,'hardcover-blue']]],
  [804,[[/冰块|^Ice$/,'ice-block']]],
  [447,[[/半只鸡蛋/,'halved-egg'],[/彩蛋|^Egg White$/,'white-egg']]],
  [236,[[/铃鼓|^Tambourine Pink$/,'tambourine-pink']]],
  [854,[[/叠圈玩具|^Hanoi$/,'wood-hanoi']]],
]);
const builders = {
  ...lessonBuilders,
  ...finishDetailBuilders,
  ...parlorBuilders,
  ...bakeryBuilders,
  ...boardwalkBuilders,
  ...marinaBuilders,
  ...closetBuilders,
  ...showcaseBuilders,
  ...pantryPlusBuilders,
  ...transitBuilders,
  ...paradeBuilders,
  ...fairBuilders,
  ...tidelineBuilders,
  ...coffeeCornerBuilders,
  ...kilnBuilders,
  ...dressingBuilders,
  ...playthingsBuilders,
  ...housekitBuilders,
  ...countertopBuilders,
  ...workbenchBuilders,
  ...confectionBuilders,
  ...schoolroomBuilders,
  ...studioTwoBuilders,
  ...gardenMixBuilders,
  ...seaCollectionBuilders,
  ...weekendBuilders,
  ...outingsBuilders,
  ...nostalgiaBuilders,
  ...trinketBuilders,
  ...craftPlusBuilders,
  ...collectionPlusBuilders,
  ...playroomBuilders,
  ...summerBuilders,
  ...toychestBuilders,
  ...homesteadBuilders,
  ...recreationBuilders,
  ...craftsBuilders,
  ...ornamentBuilders,
  ...displayBuilders,
  ...cabinetBuilders,
  ...pantrywareBuilders,
  ...collectionBuilders,
  ...motionBuilders,
  ...studioBuilders,
  ...diningBuilders,
  ...tableBuilders,
  ...shelfBuilders,
  ...pantryBuilders,
  'bear-bread':bearBread,'pin-cushion':pinCushion,
  'coil-book-blue':()=>boundBook({coil:true}),
  'library-register':()=>boundBook({coil:true,title:'借阅登记'}),
  'hardcover-blue':()=>boundBook({title:'故事集',label:'布面精装'}),
  'book-water-margin':()=>boundBook({title:'水浒传',label:'古典读本'}),
  'book-post-office':()=>boundBook({title:'海边邮局',label:'故事集'}),
  'sewing-tape':()=>ruler(true),'ruler-blue':()=>ruler(false),
  'ice-block':ice,'halved-egg':()=>egg(true),'white-egg':()=>egg(false),
  'tambourine-pink':tambourine,'wood-hanoi':hanoi,
};
const detailRoutes=[entries,pantryEntries,shelfEntries,tableEntries,diningEntries,studioEntries,motionEntries,collectionEntries,pantrywareEntries,cabinetEntries,displayEntries,ornamentEntries,craftsEntries,recreationEntries,homesteadEntries,toychestEntries,summerEntries,playroomEntries,collectionPlusEntries,craftPlusEntries,trinketEntries,nostalgiaEntries,outingsEntries,weekendEntries,seaCollectionEntries,gardenMixEntries,studioTwoEntries,schoolroomEntries,confectionEntries,workbenchEntries,countertopEntries,housekitEntries,playthingsEntries,dressingEntries,kilnEntries,coffeeCornerEntries,tidelineEntries,fairEntries,paradeEntries,transitEntries,pantryPlusEntries,showcaseEntries,closetEntries,marinaEntries,boardwalkEntries,bakeryEntries,parlorEntries,finishDetailEntries];
export function detailEssentialsKind(item,localName){
  if(item.key==='bamboo-steamer')return 'woven-bamboo-steamer';
  const name=localName??item.name;
  for(const routes of detailRoutes){
    const match=routes.get(item.sourceItemId)?.find(([pattern])=>pattern.test(name));
    if(match)return match[1];
  }
  return Object.hasOwn(lessonObjects,item.key)?lessonObjects[item.key][0]:null;
}
export function makeDetailEssentials(kind) {
  if (!molds.has(kind)) {
    const form=builders[kind]();
    form.updateMatrixWorld(true);
    const batches=new Map();
    form.traverse(piece=>{
      if(!piece.isMesh)return;
      const geometry=piece.geometry.index?piece.geometry.toNonIndexed():piece.geometry.clone();
      geometry.applyMatrix4(piece.matrixWorld);
      if(!batches.has(piece.material))batches.set(piece.material,[]);
      batches.get(piece.material).push(geometry);
      piece.geometry.dispose();
    });
    const mold=new THREE.Group();
    for(const [material,parts] of batches){
      const piece=new THREE.Mesh(mergeGeometries(parts),material);
      piece.castShadow=true;
      piece.receiveShadow=true;
      piece.userData.sharedGeometry=true;
      mold.add(piece);
      parts.forEach(part=>part.dispose());
    }
    mold.userData={solid:true,assetKind:kind,assetRevision:Object.hasOwn(lessonBuilders,kind)?'detail-tutorial-3':Object.hasOwn(finishDetailBuilders,kind)?'detail-finishdetail-1':Object.hasOwn(parlorBuilders,kind)?'detail-parlor-1':Object.hasOwn(bakeryBuilders,kind)?'detail-bakery-1':Object.hasOwn(boardwalkBuilders,kind)?'detail-boardwalk-2':Object.hasOwn(marinaBuilders,kind)?'detail-marina-1':Object.hasOwn(closetBuilders,kind)?'detail-closet-2':Object.hasOwn(showcaseBuilders,kind)?'detail-showcase-2':Object.hasOwn(pantryPlusBuilders,kind)?'detail-pantryplus-3':Object.hasOwn(transitBuilders,kind)?'detail-transit-2':Object.hasOwn(paradeBuilders,kind)?'detail-parade-1':Object.hasOwn(fairBuilders,kind)?'detail-fair-1':Object.hasOwn(tidelineBuilders,kind)?'detail-tideline-2':Object.hasOwn(coffeeCornerBuilders,kind)?'detail-coffeecorner-1':Object.hasOwn(kilnBuilders,kind)?'detail-kiln-1':Object.hasOwn(dressingBuilders,kind)?'detail-dressing-1':Object.hasOwn(playthingsBuilders,kind)?'detail-playthings-1':Object.hasOwn(housekitBuilders,kind)?'detail-housekit-1':Object.hasOwn(countertopBuilders,kind)?'detail-countertop-3':Object.hasOwn(workbenchBuilders,kind)?'detail-workbench-1':Object.hasOwn(confectionBuilders,kind)?'detail-confection-2':Object.hasOwn(schoolroomBuilders,kind)?'detail-schoolroom-1':Object.hasOwn(studioTwoBuilders,kind)?'detail-studio2-1':Object.hasOwn(gardenMixBuilders,kind)?'detail-gardenmix-1':Object.hasOwn(seaCollectionBuilders,kind)?'detail-seacollection-2':Object.hasOwn(weekendBuilders,kind)?'detail-weekend-2':Object.hasOwn(outingsBuilders,kind)?'detail-outings-2':Object.hasOwn(nostalgiaBuilders,kind)?'detail-nostalgia-2':Object.hasOwn(trinketBuilders,kind)?'detail-trinket-2':Object.hasOwn(craftPlusBuilders,kind)?'detail-craftplus-2':Object.hasOwn(collectionPlusBuilders,kind)?'detail-collectionplus-2':Object.hasOwn(playroomBuilders,kind)?'detail-playroom-1':Object.hasOwn(summerBuilders,kind)?'detail-summer-3':Object.hasOwn(toychestBuilders,kind)?'detail-toychest-2':Object.hasOwn(homesteadBuilders,kind)?'detail-homestead-1':Object.hasOwn(recreationBuilders,kind)?'detail-recreation-1':Object.hasOwn(craftsBuilders,kind)?'detail-crafts-2':Object.hasOwn(ornamentBuilders,kind)?'detail-ornament-1':Object.hasOwn(displayBuilders,kind)?'detail-display-1':Object.hasOwn(cabinetBuilders,kind)?'detail-cabinet-1':Object.hasOwn(pantrywareBuilders,kind)?'detail-pantryware-1':Object.hasOwn(collectionBuilders,kind)?'detail-collection-1':Object.hasOwn(motionBuilders,kind)?'detail-motion-1':Object.hasOwn(studioBuilders,kind)?'detail-studio-1':Object.hasOwn(diningBuilders,kind)?'detail-dining-1':Object.hasOwn(tableBuilders,kind)?'detail-tabletop-1':Object.hasOwn(shelfBuilders,kind)?'detail-shelf-1':Object.hasOwn(pantryBuilders,kind)?'detail-pantry-1':'detail-essentials-1'};
    molds.set(kind,mold);
  }
  return molds.get(kind).clone(true);
}
