import * as THREE from 'three';

// Only the coated surfaces receive the sharp window reflection. The print,
// dough, bristles and exposed cardboard keep their authored finish.
const householdCoating=new Map([
 ['Warm cream molded shell',[.24,.83,.061]],
 ['Vermilion molded lid',[.19,.96,.043]],
 ['Ivory vitreous enamel',[.23,.87,.058]],
 ['Ivory enamel interior',[.26,.78,.067]],
 ['Blue rolled enamel edge',[.19,.94,.046]],
 ['Fired flower print',[.24,.84,.057]],
 ['Warm ivory thermos cap',[.28,.68,.077]],
 ['Blue molded grip',[.20,.93,.047]],
 ['Soft indigo clock case',[.22,.88,.058]],
 ['Cobalt blue bezel',[.19,.91,.049]],
 ['Cherry red moulded shell',[.23,.86,.057]],
 ['Warm ivory dial housing',[.27,.73,.078]],
 ['Pitted citrus peel',[.45,.31,.23]],
]);
const finishedMaterials=new WeakMap();
const matteSurface=/paper|cardboard|cloth|fabric|wool|fur|print stock|dough|rubber|bristle|matte|wood|bamboo|rattan|linen|felt|leather|cork|sand|stone|fibers|foam|stem|leaf veins/i;

function physicalCoating(original){
 if(original.isMeshPhysicalMaterial)return original.clone();
 const material=new THREE.MeshPhysicalMaterial();
 THREE.MeshStandardMaterial.prototype.copy.call(material,original);
 material.defines.PHYSICAL='';
 return material;
}

// Model the warm bounce inside the fruit skin at grazing angles. The apple and
// mandarin retain different pore patterns and different clearcoat roughness.
function addFruitBounce(shader,tint){
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
  float skinFacing = saturate( dot( geometryNormal, geometryViewDir ) );
  float skinRim = pow( 1.0 - skinFacing, 2.3 ) * smoothstep( .03, .32, skinFacing );
  vec3 skinKey = normalize( mat3( viewMatrix ) * vec3( -.46, .63, .60 ) );
  float skinBounce = .28 + .72 * smoothstep( -.45, .65, dot( geometryNormal, skinKey ) );
  outgoingLight += vec3( ${tint} ) * skinRim * skinBounce;
  #include <opaque_fragment>
 `);
}

// Strengthen the peel's color variation and break up the gloss at the pores.
// All values follow the orange's UVs, so the pores rotate with the fruit.
function addPeelTexture(shader){
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
  #include <map_fragment>
  vec2 peelUv = vMapUv;
  vec2 peelCells = peelUv * vec2( 57.0, 31.0 );
  vec2 peelCell = floor( peelCells );
  vec2 jitter = fract( sin( vec2(
    dot( peelCell, vec2( 127.1, 311.7 ) ),
    dot( peelCell, vec2( 269.5, 183.3 ) )
  ) ) * 43758.5453 );
  vec2 poreOffset = fract( peelCells ) - mix( vec2( .27 ), vec2( .73 ), jitter );
  float pore = 1.0 - smoothstep( .045, .29, length( poreOffset ) );
  float poreContrast = 1.0 - smoothstep( .21, .64, length( fwidth( peelCells ) ) );
  float patches = sin( peelUv.x * 56.55 + sin( peelUv.y * 27.0 ) * 1.9 )
                 * sin( peelUv.y * 19.0 + peelUv.x * 12.57 );
  float sunColor = .5 + patches * .5;
  diffuseColor.rgb *= mix( vec3( .93, .87, .69 ), vec3( 1.07, 1.06, .91 ), sunColor )
                    * ( 1.0 - .34 * pore * poreContrast );
 `).replace('#include <roughnessmap_fragment>',`
  #include <roughnessmap_fragment>
  roughnessFactor = clamp( roughnessFactor - patches * .045 + pore * poreContrast * .19, .36, .76 );
 `).replace('#include <clearcoat_normal_fragment_maps>',`
  #include <clearcoat_normal_fragment_maps>
  #ifdef USE_CLEARCOAT
   clearcoatNormal = normalize( mix( clearcoatNormal, normal, .68 ) );
  #endif
 `);
}

function addAppleSkin(shader){
 shader.vertexShader=shader.vertexShader.replace('#include <common>',`
  #include <common>
  varying vec3 appleSurface;
 `).replace('#include <begin_vertex>',`
  #include <begin_vertex>
  appleSurface = position;
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`
  #include <common>
  varying vec3 appleSurface;
 `).replace('#include <color_fragment>',`
  #include <color_fragment>
  vec3 fruit = normalize( appleSurface );
  float angle = atan( fruit.z, fruit.x );
  vec2 skinCells = vec2( angle * 6.3661977, fruit.y * 17. ) + vec2( .5, 0. );
  vec2 cell = floor( skinCells );
  vec2 seed = vec2( mod( cell.x, 40. ), cell.y );
  vec2 offset = fract( sin( vec2( dot( seed, vec2( 39.7, 83.1 ) ),
                                  dot( seed, vec2( 71.5, 21.4 ) ) ) ) * 9471.3 );
  vec2 dotPosition = fract( skinCells ) - mix( vec2( .11 ), vec2( .89 ), offset );
  float fleckRadius = mix( .07, .19, offset.x );
  float speckle = 1. - smoothstep( fleckRadius * .42, fleckRadius, length( dotPosition * vec2( .9, 1.20 ) ) );
  float detail = 1. - smoothstep( .28, .89, length( fwidth( skinCells ) ) );
  float poleFade = smoothstep( .07, .31, length( fruit.xz ) );
  float blush = smoothstep( -.88, .91, dot( fruit, vec3( .69, .4, .44 ) ) );
  vec3 skin = mix( vec3( .148, .005, .010 ), vec3( .46, .023, .016 ), blush );
  diffuseColor.rgb = mix( diffuseColor.rgb, skin, .65 );
  diffuseColor.rgb = mix( diffuseColor.rgb,
    vec3( .68, .22, .072 ), speckle * detail * poleFade * .37 );
 `);
}

function glazedApple(shader){
 addAppleSkin(shader);
 addFruitBounce(shader,'.32, .057, .016');
}

function glazedMandarin(shader){
 addPeelTexture(shader);
 addFruitBounce(shader,'.40, .15, .019');
}

// The reflected window follows both the viewing angle and the fruit curvature.
function orchardWindow(shader, citrus){
 const tint=citrus?'vec3(.92,.30,.025)':'vec3(.56,.058,.024)';
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
  vec3 reflection=reflect(-geometryViewDir, normal);
  vec3 key=normalize(mat3(viewMatrix)*vec3(-.48,.70,.74));
  vec3 axis=normalize(cross(key,mat3(viewMatrix)*vec3(0.,1.,0.)));
  vec2 windowUV=vec2(dot(reflection,axis),dot(reflection,cross(axis,key)));
  float panel=1.-smoothstep(.68,1.12,length(windowUV/vec2(.27,.45)));
  float windowLight=panel*smoothstep(.78,.92,dot(reflection,key));
  float edge=pow(1.-saturate(dot(geometryNormal,geometryViewDir)),1.65);
  float wrapLight=.30+.70*smoothstep(-.5,.7,dot(geometryNormal,key));
  outgoingLight+=vec3(1.,.93,.77)*windowLight*${citrus?'.82':'.98'}+${tint}*edge*wrapLight;
  #include <opaque_fragment>
 `);
}
function mandarinWindow(shader){orchardWindow(shader,true);}
function appleWindow(shader){orchardWindow(shader,false);}

function finishMaterial(original){
 if(finishedMaterials.has(original))return finishedMaterials.get(original);
 let material=original;
 if(original.isMeshStandardMaterial&&original.opacity>0&&!original.transparent&&
    !(original.transmission>0)&&!(original.sheen>0)){
  const named=householdCoating.get(original.name);
  if(original.metalness>=.32||original.name==='Warm metal collar'){
   material=original.clone();
   material.roughness=Math.max(.18,original.roughness*.82);
  }else if(named||!matteSurface.test(original.name)&&!original.roughnessMap&&original.roughness<=.55){
   material=physicalCoating(original);
   [material.roughness,material.clearcoat,material.clearcoatRoughness]=named??[
    Math.max(.24,original.roughness*.88),
    Math.max(original.clearcoat??0,original.roughness<.4?.72:.36),
    original.clearcoat>=.6?Math.min(original.clearcoatRoughness,.073):original.roughness<.4?.073:.18,
   ];
  }
  switch(original.name){
   case 'Dimpled mandarin rind':
    material.roughness=.30;
    material.normalScale.setScalar(.65);
    material.clearcoat=.94;
    material.clearcoatRoughness=.095;
    material.onBeforeCompile=mandarinWindow;
    break;
   case 'Burgundy apple wax':
    material.roughness=.23;
    material.clearcoat=.96;
    material.clearcoatRoughness=.064;
    material.onBeforeCompile=appleWindow;
    break;
   case 'apple mottled skin':
    material=physicalCoating(original);
    material.roughness=.29;
    material.clearcoat=.91;
    material.clearcoatRoughness=.054;
    material.onBeforeCompile=glazedApple;
    break;
   case 'Pitted citrus peel':
    material.color.setRGB(1.07,.91,.65);
    material.roughness=.42;
    material.clearcoat=.57;
    material.clearcoatRoughness=.21;
    material.normalScale.setScalar(2.08);
    if(material.map)material.onBeforeCompile=glazedMandarin;
    break;
   case 'Fired flower print':
    material.color.setRGB(.91,.67,.67);
    material.roughness=.25;
    material.clearcoat=.94;
    material.clearcoatRoughness=.067;
    break;
   case 'Warm ivory thermos cap':
    material.color.set('#ffe9ca');
    material.roughness=.25;
    material.clearcoat=.71;
    material.clearcoatRoughness=.105;
    break;
  }
 }else if(original.isMeshBasicMaterial&&original.map&&original.alphaTest>0){
  // Older catalog entries are cutout artwork. Light the original alpha mask
  // with the same warm diffuse fill used for solid models.
  material=new THREE.MeshLambertMaterial({
   map:original.map,transparent:original.transparent,alphaTest:original.alphaTest,
   opacity:original.opacity,side:original.side,color:0xe6ded2,
  });
 }
 finishedMaterials.set(original,material);
 finishedMaterials.set(material,material);
 return material;
}

const rolledBrass=new THREE.MeshPhysicalMaterial({
 color:'#e6ad50',metalness:.66,roughness:.19,clearcoat:.57,clearcoatRoughness:.11,
});
const flaskTrim=[
 [[.238,-.458],[.249,-.455],[.254,-.448],[.255,-.435],[.253,-.415],[.247,-.409],[.238,-.412]],
 [[.239,.207],[.250,.210],[.257,.220],[.259,.233],[.257,.246],[.251,.252],[.243,.249]],
].map(profile=>new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),48).rotateX(.16));

export function applyWindowTableFinish(root){
 root.traverse(object=>{
  if(!object.isMesh)return;
  object.material=Array.isArray(object.material)
   ?object.material.map(finishMaterial):finishMaterial(object.material);
 });
 if(root.userData.householdAsset==='1126'){
  for(const geometry of flaskTrim){
   const ring=new THREE.Mesh(geometry,rolledBrass);
   ring.userData.sharedGeometry=true;
   ring.castShadow=true;
   ring.receiveShadow=true;
   root.add(ring);
  }
 }
 return root;
}
