import * as THREE from 'three';

// Store the nearest back surface in camera space, including its view-space normal.
const depthMaterial = new THREE.MeshNormalMaterial({side: THREE.BackSide, blending: THREE.NoBlending});
depthMaterial.onBeforeCompile = shader => {
  shader.uniforms.centerDepth = centerDepth;
  shader.vertexShader='varying float rearDistance;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nrearDistance=-mvPosition.z;');
  shader.fragmentShader='varying float rearDistance;\n'+shader.fragmentShader;
  shader.fragmentShader = 'uniform float centerDepth;\n'+shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace(/}\s*$/, `
    float t=clamp(.5+(rearDistance-centerDepth)/32.,0.,.9999);
    gl_FragColor=vec4(floor(t*255.)/255.,fract(t*255.),normalize(-normal).xy*.5+.5);
  }
  `);
};
const centerDepth={value:0}, resolution={value:new THREE.Vector2()}, backBuffer={value:null};
const targets=new WeakMap();
export function renderCrystalScene(renderer,scene,camera) {
  renderer.getDrawingBufferSize(resolution.value);
  let target=targets.get(renderer);
  if(!target){
    target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
    targets.set(renderer,target);
  }
  target.setSize(resolution.value.x,resolution.value.y);
  centerDepth.value=camera.position.length();
  const layers=camera.layers.mask, previous=renderer.getRenderTarget(), shadows=renderer.shadowMap.autoUpdate;
  camera.layers.set(1);
  scene.overrideMaterial=depthMaterial;
  renderer.shadowMap.autoUpdate=false;
  renderer.setRenderTarget(target);
  try {renderer.render(scene,camera);} finally {
    renderer.setRenderTarget(previous);
    camera.layers.mask=layers;
    renderer.shadowMap.autoUpdate=shadows;
    scene.overrideMaterial=null;
  }
  backBuffer.value=target.texture;
  renderer.render(scene,camera);
}
const profiles=new WeakMap();
const optics=`
   uniform sampler2D depthMap;
   uniform float centerDepth; uniform vec2 resolution;
   float farZ(vec2 uv){vec4 p=texture2D(depthMap,uv);return centerDepth+(p.r+p.g/255.-.5)*32.;}
   float maskAt(vec2 uv){return step(.2,farZ(uv));}
   float filament(vec2 p){float a=sin(p.x*12.+1.7*sin(p.y*6.))+cos(p.y*10.+1.1*sin(p.x*7.));return exp(-8.*abs(a));}
   vec3 plate(vec2 p){float w=.5+.5*sin(p.x*7.+p.y*5.);return mix(vec3(.70,.63,.32),vec3(.98,.91,.63),w*.55+.3);}
   float panel(vec3 r,vec3 axis,float width,float height){vec3 f=normalize(axis),u=normalize(cross(vec3(0.,1.,0.),f)),v=cross(f,u);vec2 q=abs(vec2(dot(r,u),dot(r,v)))/max(.001,dot(r,f));return (1.-smoothstep(.82,1.,max(q.x/width,q.y/height)))*step(.1,dot(r,f));}
  `;
const crystalResponse=`float pixelSpan=clamp(1./max(1.,length(fwidth(face))*resolution.y),.02,.75);vec2 uv=gl_FragCoord.xy/resolution; vec3 N=normal,V=vec3(0.,0.,1.);
    float facing=clamp(abs(dot(N,V)),0.,1.);vec3 ray=refract(-V,N,.655), refl=reflect(-V,N);
    float thick=clamp(farZ(uv)-vViewPosition.z,.025,2.);vec2 exitUV=face*.5+.5+ray.xy*(.11+.28*thick);
    vec3 base=clamp(diffuseColor.rgb,0.,1.);float hi=max(max(base.r,base.g),base.b);
    vec3 transmission=pow(clamp(base/max(.12,hi),.018,1.),vec3(1.27))*(.64+.34*sqrt(hi));
    vec3 attenuation=pow(transmission,vec3(.70+2.2*thick));
    float caustic=filament(exitUV+N.xy*.11), streak=filament(exitUV*1.47+ray.xy*.24);
    float bottom=smoothstep(.03,.83,-N.y+.32*(.54-uv.y));
    float band=.50+.50*sin(8.*ray.x+5.*ray.y+2.8*thick);
    vec3 col=plate(exitUV)*attenuation*(.23+.67*band+.22*facing);
    col+=attenuation*(caustic*.30+bottom*(.60+2.2*streak));
    vec4 exitSample=texture2D(depthMap,uv+ray.xy*thick*.09*pixelSpan);
    vec2 xy=exitSample.ba*2.-1.;vec3 rearN=normalize(vec3(xy,-sqrt(max(.005,1.-dot(xy,xy)))));
    vec3 bounce=reflect(ray,rearN);
    float echo=panel(bounce,vec3(.39,.66,.75),.36,.19)+panel(bounce,vec3(-.68,-.35,.55),.11,.62);
    float tir=smoothstep(.44,.80,1.-abs(dot(ray,rearN)))*step(.005,exitSample.r);
    col*=1.-.45*tir;
    col+=attenuation*(echo*.68+.20*filament(uv+.20*bounce.xy)*tir)*step(.005,exitSample.r);
    float rim=pow(1.-facing,3.);col=mix(col,col*.40+attenuation*.27,rim);
    col+=attenuation*.8*pow(1.-abs(facing-.28),17.)*(.3+.7*bottom);
    float key=panel(refl,vec3(-.55,.94,.84),.32,.19);
    float fill=panel(refl,vec3(.88,.05,.19),.085,.65);
    col+=vec3(1.,.97,.91)*(key*.94+fill*.60+.13*pow(max(0.,dot(refl,normalize(vec3(-.55,.94,.84)))),14.))+vec3(.98,.83,.55)*.66*panel(refl,vec3(-.48,-.86,-.23),.46,.15);

    if(strength>.001){
     vec3 L=normalize(mix(N,normalize(lens),.78));
     vec3 rr=reflect(-V,L);vec3 r=refract(-V,L,.65);
     float edge=0.;
     for(int i=0;i<12;i++){float a=float(i)*.523599;vec2 stepUV=vec2(cos(a),sin(a))*pixelSpan*.019;
       float neighbor=farZ(uv+stepUV);edge+=smoothstep(.04,.35,abs(farZ(uv)-neighbor))/12.;}
     float radius=clamp(length(face)*.82,0.,1.);
     float lip=max(smoothstep(.03,.45,edge),smoothstep(.83,1.,radius)*.46);
     vec3 pigment=pow(transmission,vec3(1.0+1.7*(1.-lip)+thick*.8));
     float sweep=dot(face,vec2(.41,.67))+2.2*r.x+.3*sin(2.8*face.x);
     float glow=smoothstep(-.55,.8,sweep);
     float inside=exp(-10.*abs(sweep-.64))+.48*exp(-18.*abs(sweep-.80));
     vec3 inner=pigment*plate(exitUV)*(.40+glow*.65+.23*band)+pigment*(.16+.55*inside+echo*.45);
     vec3 edgeColor=mix(pow(transmission,vec3(.64)),plate(exitUV),.19)*(.88+.22*glow);
     vec3 result=mix(inner,edgeColor,lip*.91);
     result+=vec3(1.,.96,.88)*(.81*panel(rr,vec3(-.55,.94,.84),.38,.15)+.30*panel(rr,vec3(.88,.05,.19),.065,.65))+
        lip*vec3(.26,.24,.18)*(.35+.65*glow);
     // Preserve the transmitted rim when the panel spans only a few device pixels.
     float footprint=clamp(length(fwidth(face)),.015,.24);
     float bevel=smoothstep(.78-footprint,.99,length(face));
     float lightSide=.5+.5*dot(normalize(face+vec2(.001)),normalize(vec2(.55,-.85)));
     result+=pow(transmission,vec3(.46))*bevel*(.13+.40*lightSide);
     float windowImage=exp(-3.8*dot(face-vec2(-.42,.4),face-vec2(-.42,.4)));
     result+=mix(transmission,vec3(1.,.91,.75),.32)*(.36*windowImage+.13*inside);
     result+=step(.5,rimProfile)*mix(pow(transmission,vec3(.52)),vec3(1.,.79,.51),.29)
       *(lip*.46+bevel*.23)*(.52+.48*lightSide);
     if(rimProfile>1.5){
      float border=clamp(max(lip,bevel*.82),0.,1.);
      vec3 core=pow(transmission,vec3(1.45))*(.20+.20*glow);
      result=mix(result,core,(1.-border)*.32);
      result+=mix(pow(transmission,vec3(.40)),vec3(1.,.81,.73),.24)*border*(.25+.22*lightSide);
     }
     if(rimProfile>2.5){
      float border=max(lip,bevel*.85);
      vec3 bodyTint=pow(transmission,vec3(2.15));
      result=mix(result,bodyTint*(.20+.30*glow),.63*(1.-border));
      result+=mix(pow(transmission,vec3(.50)),vec3(.96,.92,.86),.40)*border*.35;

      // Sample the back of nearby covering pieces on the light-facing side.
      // An empty texel or a surface behind the receiver cannot cast contact shade.
      float shade=0.;
      float radius=clamp(.070/max(length(fwidth(face)),.001),2.5,9.);
      for(int i=0;i<12;i++){
       float k=(float(i)+.5)/12.;
       vec2 disk=sqrt(k)*vec2(cos(float(i)*2.39996),sin(float(i)*2.39996));
       vec2 offset=(disk*1.25+vec2(-.46,.56))*radius/resolution;
       vec4 back=texture2D(depthMap,uv+offset);
       float gap=vViewPosition.z-(centerDepth+(back.r+back.g/255.-.5)*32.);
       shade+=step(.01,back.r)*smoothstep(.008,.085,gap)*(1.-smoothstep(1.2,3.5,gap));
      }
      result*=mix(vec3(1.),vec3(.34,.30,.35),smoothstep(0.,.90,shade/12.));
     }
     col=mix(col,result,strength);
    }

 outgoingLight=col*(.67+.33*clamp(dot(reflectedLight.directDiffuse+reflectedLight.indirectDiffuse,vec3(.299,.587,.114)),0.,1.))+.10*outgoingLight;
`;

function materialFor(original,geometry,strength,axis,rimProfile) {
  if(!original.color || original.opacity===0 || original.visible===false)return original;
  let byGeometry=profiles.get(original);
  if(!byGeometry)profiles.set(original,byGeometry=new WeakMap());
  let byProfile=byGeometry.get(geometry);
  if(!byProfile)byGeometry.set(geometry,byProfile=new Map());
  const key=axis+':'+strength+':'+rimProfile;
  if(byProfile.has(key))return byProfile.get(key);
  const box=geometry.boundingBox;
  const m=new THREE.MeshStandardMaterial({
    color:original.color,map:original.map,alphaMap:original.alphaMap,opacity:original.opacity,transparent:original.transparent,
    alphaTest:original.alphaTest,side:original.side,vertexColors:original.vertexColors,normalMap:original.normalMap,
    roughness:.18,metalness:.04,depthWrite:original.depthWrite,polygonOffset:original.polygonOffset,
    polygonOffsetFactor:original.polygonOffsetFactor,polygonOffsetUnits:original.polygonOffsetUnits
  });
  m.name=original.name;
  const shared='varying vec3 lens;varying vec2 face;uniform vec3 extent,mid,thinAxis;uniform float strength,rimProfile;\n';
  m.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{depthMap:backBuffer,resolution,centerDepth,
      extent:{value:box.getSize(new THREE.Vector3())},mid:{value:box.getCenter(new THREE.Vector3())},
      thinAxis:{value:new THREE.Vector3(+(axis===0),+(axis===1),+(axis===2))},strength:{value:strength},rimProfile:{value:Number(rimProfile)}});
    shader.vertexShader=shared+shader.vertexShader.replace('#include <defaultnormal_vertex>',`
      vec3 u=(position-mid)/max(extent*.5,vec3(.0001));
      vec3 along=u*(vec3(1.)-thinAxis);
      face=thinAxis.x>.5?u.yz:thinAxis.y>.5?u.xz:u.xy;
      vec3 curve=normal+.36*along;
      #ifdef USE_INSTANCING
        mat3 crystalMatrix=mat3(instanceMatrix);
        curve=crystalMatrix*(curve/vec3(dot(crystalMatrix[0],crystalMatrix[0]),dot(crystalMatrix[1],crystalMatrix[1]),dot(crystalMatrix[2],crystalMatrix[2])));
      #endif
      lens=normalize(normalMatrix*curve);
      #include <defaultnormal_vertex>
    `);
    shader.fragmentShader=shared+optics+shader.fragmentShader.replace('#include <opaque_fragment>', '{'+crystalResponse+'}\n#include <opaque_fragment>');
  };
  byProfile.set(key,m);
  return m;
}

const panelAxes=new Map();

// Fit a plane to the model vertices in root space. A long rod has little width
// in either transverse direction, so the thickness/width test rejects it.
function measurePanel(root,kind,allowRaisedDetail){
 if(panelAxes.has(kind))return panelAxes.get(kind);
 // The skateboard mold pitches the deck before merging it with the trucks and wheels.
 if(/^skateboard-(blue|green|orange|purple|red|yellow)$/.test(kind)){
  const deck=new THREE.Vector3(0,1,0).applyEuler(new THREE.Euler(.30,-.18,-.09));
  panelAxes.set(kind,deck);return deck;
 }
 const points=[],inverse=root.matrixWorld.clone().invert();
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible||mesh.material?.opacity===0||mesh.userData.pickAssist)return;
  const transform=inverse.clone().multiply(mesh.matrixWorld),vertices=mesh.geometry.attributes.position;
  for(let i=0;i<vertices.count;i+=Math.max(1,Math.ceil(vertices.count/192))){
   points.push(new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(transform));
  }
 });
 let axis=null;
 if(points.length>=3){
  const center=new THREE.Vector3();
  for(const p of points)center.add(p);
  center.divideScalar(points.length);
  let xx=0,xy=0,xz=0,yy=0,yz=0,zz=0;
  for(const p of points){
   p.sub(center);const {x,y,z}=p;
   xx+=x*x;xy+=x*y;xz+=x*z;yy+=y*y;yz+=y*z;zz+=z*z;
  }
  const ridge=Math.max(1e-12,(xx+yy+zz)*1e-6);
  const covariance=new THREE.Matrix3().set(xx+ridge,xy,xz,xy,yy+ridge,yz,xz,yz,zz+ridge);
  const inv=covariance.clone().invert();
  const axes=[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)];
  function principal(matrix){
   const candidates=axes.map(a=>{const v=a.clone();for(let i=0;i<8;i++)v.applyMatrix3(matrix).normalize();return v;});
   const energy=v=>v.dot(v.clone().applyMatrix3(matrix));
   return candidates.sort((a,b)=>energy(b)-energy(a))[0];
  }
  const normal=principal(inv),length=principal(covariance),across=new THREE.Vector3().crossVectors(normal,length).normalize();
  function span(v){let lo=Infinity,hi=-Infinity;for(const p of points){const n=p.dot(v);lo=Math.min(lo,n);hi=Math.max(hi,n);}return hi-lo;}
  if(span(normal)<span(across)*(allowRaisedDetail?.78:.43)){
   if(normal.z<0)normal.negate();
   axis=normal;
  }
 }
 panelAxes.set(kind,axis);return axis;
}

export function preparePanel(root,kind=''){
  root.updateMatrixWorld(true);
  const named=/guitar|ukulele|violin|racket|paddle|frisbee|skateboard|surfboard|snowboard|clipboard|playing-card|ticket|bookmark|ping-pong|badminton/.test(kind);
  const panel=measurePanel(root,kind,named);
  if(panel)root.userData.panelNormal=panel;
  return panel;
}
export function crystalFinish(root,kind='',rimProfile=0){
  root.updateMatrixWorld(true);
  const span=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).length();
  const named=/guitar|ukulele|violin|racket|paddle|frisbee|skateboard|surfboard|snowboard|clipboard|playing-card|ticket|bookmark|ping-pong|badminton/.test(kind);
  const panel=measurePanel(root,kind,named);
  if(panel)root.userData.panelNormal=panel;
  root.traverse(o=>{
    if(!o.isMesh)return;
    const g=o.geometry;
    if(!g.boundingBox)g.computeBoundingBox();
    const dims=g.boundingBox.getSize(new THREE.Vector3()).multiply(o.getWorldScale(new THREE.Vector3())).toArray().map(Math.abs);
    const sorted=[...dims].sort((a,b)=>a-b),axis=dims.indexOf(sorted[0]);
    const broad=sorted[1]>.13*span && sorted[2]>.29*span;
    const strength=broad && sorted[0]/Math.max(.001,sorted[1])<.48?.95:(named||panel)&&broad?.83:0;
    const convert=m=>materialFor(m,g,strength,axis,broad && strength>0?(rimProfile || 2):0);
    o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
    if(o.material.opacity!==0)o.layers.enable(1);
  });
  return root;
}
