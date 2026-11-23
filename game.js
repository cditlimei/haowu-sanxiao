import {campaignConfig,createCampaignState} from './assets/campaign-level.mjs?rev=bridge3084';
import {availableHeads} from './assets/stack-order.mjs';
import {variantLooks,variantAppearances} from './assets/real-surfaces/variant-looks.mjs';
import {prepareIndividualAtlas,releaseIndividualAtlases} from './assets/real-surfaces/individual-finish.mjs';
import {prepareSurfaces,photographedAsset,realFinish} from './assets/real-surfaces/materials.mjs';
import {finishLessonVinyl} from './assets/glazed-objects/lesson-vinyl.mjs';
import {preparePanel} from './assets/glazed-objects/crystal-board.mjs';
import {detailEssentialsKind,makeDetailEssentials} from './assets/glazed-objects/detail-essentials.mjs';
import {denseRebuildKind,counterRebuildKind,familyRebuildKind,playroomRebuildKind,makePlayroomRebuild} from './assets/glazed-objects/playroom-rebuild.mjs';
import {kitchenRebuildKind,makeKitchenRebuild} from './assets/glazed-objects/kitchen-rebuild.mjs';
import {captureRound,restoreRound} from './round-save.mjs';
import {renderTools} from './lime-tools.mjs';
import {referenceTableLayout,referenceVisuals} from './assets/glazed-objects/reference-visuals.mjs';
import {sportRebuildKind,makeSportRebuild} from './assets/glazed-objects/sport-rebuild.mjs';
import {dailyRebuildKind,dailyVariantKind,makeDailyRebuild} from './assets/glazed-objects/daily-rebuild.mjs';
import {orchardRebuildKind,makeOrchardRebuild} from './assets/glazed-objects/orchard-rebuild.mjs';
import {hasToyGardenRebuild,makeToyGardenRebuild} from './assets/glazed-objects/toy-garden-rebuild.mjs';
import {prepareHouseholdAssets,householdAssetStatus,householdAssetTag,householdAssetKey} from './household-assets.mjs';
import {createCollisionPile} from './pile-collision.mjs';
import {createPileInstances} from './instance-pile.mjs';
import {tripoAssetStatus} from './tripo-assets.mjs';
import {buildPile,settlePile} from './pile-layout.mjs';
import {make,referenceTexturesReady,releaseReferenceTextures,hasSolidModel} from './models.mjs';
import {LEVELS,ITEMS,nextLevelId,getLevelVariants,sequenceAssetLevel} from './data/levels.mjs?rev=bridge3084';
import * as THREE from './node_modules/three/build/three.module.js';
import {createState,pick,undo,vacuum,clearStarStack,tick,settledGoalRemaining} from './rules.mjs';
import {hasSewnVolleyball,hasMantelClock,hasRotaryTelephone,hasArcadeCabinet,hasCampingMatchbox,solidItemSphereRadius,solidItemDisplayName,solidItemTexturesReady,localizedObjectName} from './solid-items.mjs';
renderTools();
let renderDirty=true;
window.addEventListener("model-texture-ready",()=>{renderDirty=true;});
const frameTimes=[],renderTimes=[];let drawTotal=0,benchmarkUntil=0,recordUntil=0,benchmarkReport=null;
const $=id=>document.getElementById(id),canvas=$('scene');
const mobileProfile=matchMedia('(pointer:coarse)').matches||innerWidth<700;
const pixelRatioCap=mobileProfile?1.75:2;
function boardPixelRatio(width,height){
 if(!mobileProfile||state.level===1)return Math.min(devicePixelRatio,pixelRatioCap);
 if(state.level===719)return Math.min(devicePixelRatio,2.15);
 const pixelBudget=Math.sqrt(1050000/Math.max(1,width*height));
 return Math.min(devicePixelRatio,2.15,Math.max(pixelRatioCap,pixelBudget));
}
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:new URLSearchParams(location.search).has("qa")});renderer.setPixelRatio(Math.min(devicePixelRatio,pixelRatioCap));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,1000);camera.position.set(0,0,400);camera.lookAt(0,0,0);
const tableEnvironments=new WeakMap();
function glossyEnvironment(targetRenderer=renderer){
 if(tableEnvironments.has(targetRenderer))return tableEnvironments.get(targetRenderer);
 const studio=new THREE.Scene();
 studio.background=new THREE.Color().setRGB(.22,.205,.17);
 const windowLight=new THREE.Group();
 windowLight.position.set(-2.15,2.85,6.3);
 windowLight.lookAt(0,0,0);
 studio.add(windowLight);
 for(const x of [-1.13,1.13])for(const y of [-.95,.95]){
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(2.10,1.72),
   new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(17,16.2,14.9)}));
  pane.position.set(x,y,0);
  windowLight.add(pane);
 }
 const bounce=new THREE.Mesh(new THREE.CircleGeometry(1,40),
  new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(1.36,1.13,.81)}));
 bounce.scale.set(2.2,1.7,1);
 bounce.position.set(3.7,-2.25,3.9);
 bounce.lookAt(0,0,0);
 studio.add(bounce);
 const generator=new THREE.PMREMGenerator(targetRenderer);
 const tableEnvironment=generator.fromScene(studio,.008).texture;
 tableEnvironments.set(targetRenderer,tableEnvironment);
 studio.traverse(panel=>{
  if(!panel.isMesh)return;
  panel.geometry.dispose();
  panel.material.dispose();
 });
 generator.dispose();
 return tableEnvironment;
}
const ambient=new THREE.HemisphereLight(0xffffff,0x859bad,1.15);scene.add(ambient);const sun=new THREE.DirectionalLight(0xffffff,1.5);sun.position.set(-18,26,500);sun.castShadow=true;sun.shadow.mapSize.set(mobileProfile?1024:2048,mobileProfile?1024:2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12});sun.shadow.normalBias=.03;sun.shadow.radius=4;sun.shadow.intensity=.32;sun.shadow.camera.far=1000;scene.add(sun);const shapeLight=new THREE.DirectionalLight(0xffffff,1.8);shapeLight.position.set(-350,450,500);scene.add(shapeLight);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({color:0x16212d,opacity:.47}));floor.position.z=-1;floor.receiveShadow=true;scene.add(floor);
const shadowCanvas=Object.assign(document.createElement('canvas'),{width:64,height:64});
const shadowContext=shadowCanvas.getContext('2d');
const falloff=shadowContext.createRadialGradient(32,32,2,32,32,31);
falloff.addColorStop(0,'rgba(71,55,24,.56)');
falloff.addColorStop(.55,'rgba(71,55,24,.37)');
falloff.addColorStop(1,'rgba(71,55,24,0)');
shadowContext.fillStyle=falloff;
shadowContext.fillRect(0,0,64,64);
const shadowMap=new THREE.CanvasTexture(shadowCanvas);
shadowMap.colorSpace=THREE.SRGBColorSpace;
const contactShadowGeometry=new THREE.PlaneGeometry(1,1);
const contactShadowMaterial=new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,toneMapped:false});
let contactShadows;
const shadowPose=new THREE.Object3D();
function prepareContactShadows(count){
 if(!contactShadows||count>contactShadows.instanceMatrix.count){
  if(contactShadows){
   scene.remove(contactShadows);
   contactShadows.dispose();
  }
  contactShadows=new THREE.InstancedMesh(contactShadowGeometry,contactShadowMaterial,Math.max(32,count));
  contactShadows.frustumCulled=false;
  scene.add(contactShadows);
 }
 contactShadows.count=0;
}
const names=ITEMS.map(x=>x.name);
const iconR=new THREE.WebGLRenderer({antialias:true,alpha:true});
iconR.setSize(112,112);
iconR.toneMapping=THREE.NeutralToneMapping;
iconR.toneMappingExposure=.83;
const iconScene=new THREE.Scene();
iconScene.environmentIntensity=1.05;
iconScene.add(new THREE.HemisphereLight(0xfffbf4,0xd3ba93,.66));
const iconKey=new THREE.DirectionalLight(0xfff8ee,2.26);
 iconKey.position.set(-35,45,91);
iconScene.add(iconKey);
const ic=new THREE.OrthographicCamera(-.92,.92,.92,-.92,.1,20);
ic.position.z=5;

function renderItemIcon(item){
 iconScene.environment=glossyEnvironment(iconR);
 iconScene.add(item);
 iconR.render(iconScene,ic);
 iconScene.remove(item);
 return iconR.domElement.toDataURL();
}
let progress={current:1,completed:[]};try{const p=JSON.parse(localStorage.getItem('goodthings-progress-v2'));if(p&&LEVELS.some(l=>l.id===p.current)){progress={current:p.current,variant:getLevelVariants(p.current).some(v=>v.variant===p.variant)?p.variant:undefined,completed:Array.isArray(p.completed)?p.completed.filter(n=>LEVELS.some(l=>l.id===n)):[]};}}catch{}
const requested=new URLSearchParams(location.search);const requestedLevel=Number(requested.get('level'));if(requested.has('level')&&LEVELS.some(l=>l.id===requestedLevel)){progress.current=requestedLevel;const variant=Number(requested.get('variant'));progress.variant=requested.has('variant')&&getLevelVariants(requestedLevel).some(v=>v.variant===variant)?variant:undefined;}
function saveProgress(){try{localStorage.setItem('goodthings-progress-v2',JSON.stringify(progress));}catch{}}
function updateLevelAddress(id,variant){
 const url=new URL(location.href);
 url.searchParams.set('level',id);
 if(variant===undefined)url.searchParams.delete('variant');
 else url.searchParams.set('variant',variant);
 history.replaceState(history.state,'',url);
}
const roundSaveKey='goodthings-round-v1';
let knownSave=null;
let savedRound=null;
try{
 knownSave=localStorage.getItem(roundSaveKey);
 if(knownSave){
  const checkpoint=JSON.parse(knownSave);
  savedRound=restoreRound(checkpoint,progress.current,progress.variant,(id,v)=>createCampaignState(id,v,checkpoint.seed))??restoreRound(checkpoint,progress.current,progress.variant);
  if(!savedRound&&progress.variant===undefined&&!requested.has('level')&&getLevelVariants(progress.current).some(config=>config.introSequence)){
   savedRound=restoreRound(checkpoint,progress.current,0);
   if(savedRound)progress.variant=0;
  }
 }
}catch{}
let state=savedRound?.state??createCampaignState(progress.current,progress.variant);
let groups=new Map(),sound=true,audio,lastTime=performance.now(),lastMatch=0,combo=0,toastTimer,level=progress.current;
let shuffleCount=savedRound?.shuffleCount??0;
let lastCheckpoint=0;
let saveWriter=crypto.getRandomValues(new Uint32Array(4)).join('-');

function saveRound(claim=false,boardOrder=[...groups.keys()]){
 if(!['loading','playing','paused'].includes(state.status))return;
 lastCheckpoint=performance.now();
 try{
  if(!claim&&localStorage.getItem(roundSaveKey)!==knownSave)return;
  const value=JSON.stringify({...captureRound(state,boardOrder),writer:saveWriter});
  localStorage.setItem(roundSaveKey,value);
  knownSave=value;
 }catch{}
}

function clearRound(){
 try{
  if(localStorage.getItem(roundSaveKey)!==knownSave)return false;
  localStorage.removeItem(roundSaveKey);
  knownSave=null;
  return true;
 }catch{return true;}
}

const localizedIcons=new Map();
const usesMarketStyle=level=>state.config.introSequence||level===1||Object.hasOwn(marketRows,level)||usesLayeredMarket(level);
const usesLayeredMarket=level=>level>=13&&level<=16;
let mappedConfig,modelMapping;
function visualAppearance(type){
 if(!state.config.referenceOnly)return null;
 if(mappedConfig!==state.config){
  modelMapping=referenceVisuals(state.config,getLevelVariants);
  mappedConfig=state.config;
 }
 return modelMapping.get(type);
}
const visualType=type=>visualAppearance(type)?.type??type;
const boardDefinition=type=>ITEMS[visualType(type)];
const appearanceLevel=()=>usesPileLayout()||usesMarketStyle(state.level)?state.level:undefined;
function modelLevel(type){
 if(state.config.introSequence)return sequenceAssetLevel(type)??appearanceLevel();
 return visualAppearance(type)?.level??appearanceLevel();
}
const usesMarketDaylight=()=>state.level===2||state.config.introSequence;
const usesRoomierMarket=()=>state.level===4&&state.config.introSequence;
const starterToyKeys=new Set(['duck','strawberry','watergun']);
const uses1529Finish=()=>state.level===1529&&state.config.variant===1;
const counterAliases = {
  40:['Apple Red','红苹果|苹果','apple',makeOrchardRebuild],
  43:['Banana','香蕉','banana',makeToyGardenRebuild],45:['Cherry','樱桃','cherry',makeToyGardenRebuild],
  53:['Lemon','柠檬','lemon',makeToyGardenRebuild],55:['Pear Green','梨','pear',makeToyGardenRebuild],
  61:['Strawberry','草莓','strawberry',makeToyGardenRebuild],503:['Waffle','华夫饼','waffle',makeKitchenRebuild],
  812:['Puzzle Cube','魔方','rubik',makePlayroomRebuild],569:['Football','足球','soccer',makeSportRebuild],
  532:['Basketball','篮球','basketball',makeSportRebuild],618:['Rugby Ball','橄榄球','rugby',makeSportRebuild],
  626:['Tennis Ball','网球','tennis',makeSportRebuild],
  634:['Volleyball Blue','排球','volley-blue',makeSportRebuild],635:['Volleyball Green','排球','volley-green',makeSportRebuild],
  636:['Volleyball Orange','排球','volley-orange',makeSportRebuild],637:['Volleyball Pink','排球','volley-pink',makeSportRebuild],
  638:['Volleyball White','排球','volley-white',makeSportRebuild],639:['Volleyball Yellow','排球','volley-yellow',makeSportRebuild],
};
const pantryAliases = {
  21:[/搪瓷茶缸/,'enamel-mug',makePlayroomRebuild],
  86:[/搪瓷茶缸/,'enamel-mug',makePlayroomRebuild],
  852:[/小黄鸭|^Duck$/,'duck',makeToyGardenRebuild],
  497:[/三明治|^Sandwich$/,'sandwich',makeKitchenRebuild],
  801:[/礼盒|^Giftbox Purple$/,'giftpurple',makePlayroomRebuild],
  47:[/玉米|^Corn$/,'corn',makePlayroomRebuild],
  42:[/牛油果|^Avocado$/,'avocado',makeKitchenRebuild],
  415:[/可颂|^Croissant$/,'croissant',makeKitchenRebuild],
  62:[/番茄|^Tomato$/,'tomato',makeKitchenRebuild],
  172:[/拨浪鼓/,'pellet-drum',makePlayroomRebuild],
  63:[/西瓜片|^Watermelon$/,'watermelon',makePlayroomRebuild],
  499:[/煎蛋|^Sunny Side Up$/,'friedegg',makeKitchenRebuild],
  399:[/^包子$/,'steamed-bun',makePlayroomRebuild],
};
const rebuildFactories=[
 [(item,level)=>denseRebuildKind(item,level,state.config.variant),makePlayroomRebuild],
 [(item,level)=>dailyVariantKind(item,localizedObjectName(level,item.sourceItemId)),makeDailyRebuild],
 [(item,level)=>detailEssentialsKind(item,localizedObjectName(level,item.sourceItemId)),makeDetailEssentials],
 [(item,level)=>item.sourceItemId===424&&localizedObjectName(level,item.sourceItemId)==='吐司片'?'toast':null,makeKitchenRebuild],
 [(item,level)=>counterRebuildKind(item,localizedObjectName(level,item.sourceItemId)),makePlayroomRebuild],
 [(item,level)=>level===719&&item.sourceItemId===1148&&state.config.variant!==1?'scissors':null,makeDailyRebuild],
 [(item,level)=>familyRebuildKind(item,localizedObjectName(level,item.sourceItemId)),makePlayroomRebuild],
 [({key})=>playroomRebuildKind(key),makePlayroomRebuild],
 [({key})=>kitchenRebuildKind(key),makeKitchenRebuild],
 [({key})=>sportRebuildKind(key),makeSportRebuild],
 [({key})=>hasToyGardenRebuild(key)?key:null,makeToyGardenRebuild],
 [({key,sourceItemId},level)=>orchardRebuildKind(key,level,sourceItemId),makeOrchardRebuild],
 [({key,sourceItemId},level)=>dailyRebuildKind(key,level,sourceItemId),makeDailyRebuild],
];
function rebuiltAsset(definition,level){
 for(const [identify,build] of rebuildFactories){
  const kind=identify(definition,level);
  if(kind)return {kind,build};
 }
 const pantry=pantryAliases[definition.sourceItemId];
 if(pantry&&pantry[0].test(localizedObjectName(level,definition.sourceItemId)??definition.name))return {kind:pantry[1],build:pantry[2]};
 const alias=counterAliases[definition.sourceItemId];
 if(!alias||definition.name!==alias[0])return null;
 const localName=localizedObjectName(level,definition.sourceItemId);
 return !localName||new RegExp(alias[1]).test(localName)?{kind:alias[2],build:alias[3]}:null;
}
const lessonRackets=new Set(['racket-blue','racket-green','pingpong-paddle','badminton-racket']);
const catalogProduce=new Map([
 ['Apple Red','apple'],['Apple Yellow','yellowapple'],['Orange','mandarin'],
 ['Strawberry','strawberry'],['Lemon','lemon'],['Pear Green','pear'],['Peach','peach'],['Tomato','tomato'],
]);
function materialIdentity(type){
 const appearance=visualType(type),definition=ITEMS[appearance],level=modelLevel(type);
 const rebuilt=rebuiltAsset(definition,level);
 const kind=rebuilt?.kind??definition.key;
 let lookId=appearance;
 if(variantAppearances.has(appearance)){
  const local=localizedObjectName(level,definition.sourceItemId)??'';
  const signature=[appearance,kind,local,householdAssetKey(definition,level,state.config.variant)].join('|');
  lookId=variantLooks[signature]??appearance;
 }
 return {appearance,lookId,definition,level,rebuilt,kind,fruit:photographedAsset(kind)??(!definition.detailed?photographedAsset(definition.key):undefined)??(!rebuilt&&!localizedObjectName(level,definition.sourceItemId)?photographedAsset(catalogProduce.get(definition.name)):undefined)};
}
const makeBoardItem=type=>{
 const {appearance,lookId,definition,level,rebuilt,kind,fruit}=materialIdentity(type);
 const produce=fruit?.make();
 if(produce)return produce;
 let model=rebuilt?rebuilt.build(kind):make(appearance,level,state.config.variant,true);
 if(state.config.vinyl)model=finishLessonVinyl(model,kind);
 preparePanel(model,kind);
 return realFinish(model,kind+' '+(localizedObjectName(level,definition.sourceItemId)??definition.name),lookId);
};
const prepareBoardModels=()=>{for(const {type} of state.config.inventory)makeBoardItem(type);};
const localName=(type,level,variant=state.config.variant)=>householdAssetKey(ITEMS[type],level,variant)==='bamboo-steamer'
 ?'竹蒸笼':localizedObjectName(level,ITEMS[type].sourceItemId);
const boardItemName=type=>{
 const appearance=visualType(type);
 return localName(appearance,modelLevel(type))??solidItemDisplayName(ITEMS[appearance].sourceItemId)??names[appearance];
};
function boardItemIcon(type){
 const level=modelLevel(type);
 const appearance=visualType(type);
 const itemId=householdAssetKey(ITEMS[appearance],level,state.config.variant);
 const revision=householdAssetTag(level,itemId);
 const key=`${level}:${state.config.variant}:${itemId}:${revision}:${appearance}`;
 if(!localizedIcons.has(key)){
  const item=makeBoardItem(type);
  const toothbrush=itemId===293;
  item.scale.setScalar(starterToyKeys.has(ITEMS[appearance].key)?1.31:toothbrush?1.72:1.61);
  const assetKind=item.userData.assetKind??'';
  const faceUp=/^(?:letter-block|pool-float|striped-doughnut|cassette|jigsaw-token|record-disc|round-wall-clock|footprint-badge|cinema-ticket|wrapped-chocolate|wrapped-white-chocolate|oat-cereal|glider-doll|numeral-block|camp-matchbox|opera-crown|target-board|cinema-glasses|color-flying-disc|eighth-note|molded-soap|perfume-flacon|gingerbread-figure|snow-pendant|chalk-board|ship-anchor)-/.test(assetKind);
  item.rotation.set(faceUp?1.28:.05,-.12,faceUp?0:toothbrush?-.68:-.1);
  localizedIcons.set(key,renderItemIcon(item));
 }
 return localizedIcons.get(key);
}
const pileInstances=createPileInstances(scene);
let halfH=5,pile=null,pileKey=null,boardZoom=1,pan={x:0,y:0};
let contactPile=null,drop=null,lastDrop=null,contactMoving=false,contactImpacts=0;
const usesLimeReference=()=>state.config.limeCampaign||state.config.referenceOnly;
const usesPileLayout=()=>state.config.layout?.chainStacks||state.config.vinyl||state.config.detailed||usesLimeReference();
const hasContactPile=()=>usesMarketStyle(state.level)||usesPileLayout();

function createBoardContacts(items,positions){
 const dimensions=new Map(),boundsById=new Map(),sphereRadii=new Map(),compoundShapes=new Map();
 for(const {id,type} of items){
  if(!dimensions.has(type)){const model=makeBoardItem(type);dimensions.set(type,{bounds:new THREE.Box3().setFromObject(model),parts:model.userData.collisionParts});}
  boundsById.set(id,dimensions.get(type).bounds);
  if(dimensions.get(type).parts)compoundShapes.set(id,dimensions.get(type).parts);
  const definition=boardDefinition(type);
  const sourceId=definition.sourceItemId;
  const radius=definition.collisionRadius??solidItemSphereRadius(sourceId);
  if(radius)sphereRadii.set(id,radius);
  else if(state.level===94&&sourceId>=584&&sourceId<=586)sphereRadii.set(id,.491);
  else if(state.level===2986&&sourceId>=534&&sourceId<=540)sphereRadii.set(id,.5);
 }
 return createCollisionPile(positions,boundsById,sphereRadii,compoundShapes);
}

function setDropCamera(angle,center=0){
 camera.position.set(0,-400*Math.sin(angle),center+400*Math.cos(angle));
 camera.lookAt(0,0,center);
 camera.updateMatrixWorld();
 renderDirty=true;
}

function startDrop(){
 contactPile.launch(groups);
 let top=0;
 for(const g of groups.values())top=Math.max(top,g.userData.target.z);
 drop={elapsed:0,center:top*.44,turningPeak:0,slidingPeak:0};
 contactImpacts=0;
 setDropCamera(.42,drop.center);
}

function advanceContacts(dt){
 if(dt<=0||!contactPile||(!drop&&!contactMoving))return;
 const step=Math.min(dt,.05);
 if(drop)drop.elapsed+=step;
 const result=contactPile.advance(groups,step,drop?.elapsed);
 if(drop){
  drop.turningPeak=Math.max(drop.turningPeak,result.turning);
  drop.slidingPeak=Math.max(drop.slidingPeak,result.sliding);
 }
 contactImpacts+=result.impacts;
 contactMoving=result.moving;
 if(result.moving||drop)renderDirty=true;
 if(!drop)return;
 const ease=Math.max(0,Math.min(1,(drop.elapsed-.86)/.47));
 setDropCamera(.42*(1-ease*ease*(3-2*ease)),drop.center*(1-ease));
 if(result.moving||ease<1)return;
 lastDrop=drop;
 drop=null;
 if(state.status==='loading'){
  state.status='playing';
  saveRound();
  if(state.level===1){
   if(pileKey!=='starter:'+halfH)layout();
   clearTimeout(toastTimer);
   $('toast').style.opacity=0;
   updateStarterGuide();
  }else{
   if(usesMarketStyle(state.level))layout();
   showLevelTip();
  }
 }
}
function resize(){const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;renderer.setPixelRatio(boardPixelRatio(r.width,r.height));renderer.setSize(r.width,r.height,false);fitCamera();if(!usesPileLayout()&&state.status!=='loading')layout();}new ResizeObserver(resize).observe($('playfield'));
function fitCamera(){
 renderDirty=true;
 const view=canvas.getBoundingClientRect();
 if(!view.width||!view.height)return;
 const aspect=view.height/view.width;
 let halfW=5,centerX=0,centerY=0;
 if(usesPileLayout()){
  const {bounds:[left,top,right,bottom],aspect:layoutAspect}=state.config.layout??referenceTableLayout;
  const height=10/(layoutAspect||.675);
  const limePile=state.level===719;
  const limeFeature=limePile&&state.config.variant===1;
  const wideLimeBoard=limeFeature&&aspect<1.4;
  const reserved=Math.min(wideLimeBoard?55:limeFeature?42:limePile?50:52,view.height*.3);
  const topGutter=limePile?Math.min(wideLimeBoard?22:limeFeature?10:15,reserved/2):0;
  const width=limePile?(limeFeature?9.77:9.63):(right-left)*10+.4;
  halfW=Math.max(width/2+.24,((bottom-top)*height+.4)/2/aspect*view.height/(view.height-reserved));
  centerX=limePile?0:(left+right-1)*5;
  centerY=(1-top-bottom)*height/2-halfW*aspect*(reserved-2*topGutter)/view.height;
 }
 halfH=halfW*aspect;
 Object.assign(camera,{
  left:-halfW/boardZoom+pan.x+centerX,right:halfW/boardZoom+pan.x+centerX,
  top:halfH/boardZoom+pan.y+centerY,bottom:-halfH/boardZoom+pan.y+centerY,
 });
 camera.updateProjectionMatrix();
}
function changeZoom(value){boardZoom=Math.max(1,Math.min(3,value));if(boardZoom===1)pan={x:0,y:0};$('zoom-reset').textContent=boardZoom+'×';$('quick-zoom').textContent=boardZoom>1?'回到全景':'放大盘面';$('quick-zoom').setAttribute('aria-pressed',String(boardZoom>1));fitCamera();}
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
// Widen the middle of the market tables and keep every piece in its opening slot.
const marketRows={
 2:[4,5,6,6,6,5,4],
 3:[4,6,6,6,6,5,3],
 4:[5,7,8,8,9,8,8,7,6],
 5:[5,6,7,8,8,8,7,5],
 6:[5,6,7,8,9,8,8,7,5],
 7:[6,7,8,9,9,9,8,7,6],
 8:[6,8,9,10,11,11,10,9,9,7],
 9:[5,7,8,9,10,10,8,7,5],
 10:[4,6,7,8,9,9,8,7,5],
 11:[6,7,8,9,9,8,7,6],
 12:[6,8,9,10,11,11,10,9,7,6],
 17:[5,7,8,10,10,10,10,10,9,8],
 18:[5,7,8,8,9,8,8,7,6],
 19:[5,6,7,8,9,9,9,8,6,5],
 20:[4,6,6,7,7,6,5,4],
 21:[6,7,8,8,9,9,8,8,7,5],
 22:[4,5,6,6,7,6,5],
 23:[5,6,7,8,8,8,7,5],
 24:[4,5,6,6,7,6,4,4],
 25:[5,6,7,8,8,8,8,7,6],
 26:[4,6,6,7,7,6,5,4],
 27:[5,6,7,8,8,8,8,7,6],
 28:[4,5,6,6,7,6,5],
 29:[4,6,6,7,7,7,7,7],
 30:[6,7,8,9,10,10,9,8,8,6],
 31:[4,6,6,7,7,6,5,4],
 32:[5,6,7,8,9,9,9,8,6,5],
};
const wideMarketRows={
 4:[10,11,12,12,11,10],5:[7,9,11,11,9,7],
 6:[9,10,12,12,11,9],7:[10,11,13,13,12,10],
 8:[12,15,17,17,16,13],9:[10,11,13,13,12,10],
 10:[9,10,12,12,11,9],11:[9,10,11,11,10,9],
 12:[12,14,16,17,15,13],
 17:[12,14,16,17,15,13],18:[10,11,12,12,11,10],
 19:[10,12,14,14,12,10],20:[7,8,8,8,8,6],21:[10,12,15,15,13,10],
 22:[7,8,9,8,7],23:[7,9,11,11,9,7],24:[7,9,10,9,7],
 25:[9,10,12,12,11,9],26:[7,8,8,8,8,6],27:[9,10,12,12,11,9],
 28:[7,8,9,8,7],29:[7,8,10,10,9,7],30:[11,13,16,16,14,11],31:[7,8,8,8,8,6],32:[10,12,14,14,12,10],
};
const introMarketRows={
 2:[4,5,6,5,4],
 3:[4,5,5,5,4,4],
 4:[5,5,5,5,5,5],
 5:[5,5,6,6,6,5],
 6:[4,5,6,6,6,5,4],
 7:[5,5,6,6,6,6,5],
 8:[5,6,6,7,7,6,5],
 9:[5,6,7,7,7,7,6],
 10:[5,6,6,7,7,6,6,5],
};
const sequenceMarketRows={
 45:introMarketRows[9],
 48:[5,6,6,7,7,6,6,5],
 51:[5,6,7,8,7,7,6,5],
 54:[5,6,7,8,8,8,7,5],
};
function marketPositions(level,itemCount){
 const wide=halfH<4;
 const roomy=usesRoomierMarket();
 const landscapeDisplay=roomy&&halfH<3.3;
 const displayRows=landscapeDisplay?[8,7,7,8]:introMarketRows[level];
 const horizontalRows=wide&&!state.config.introSequence?wideMarketRows[level]:null;
 const rows=state.config.introSequence?(displayRows??sequenceMarketRows[itemCount]):horizontalRows??marketRows[level];
 const transpose=wide&&!horizontalRows&&!roomy;
 const denseSequence=state.config.introSequence&&itemCount>=51;
 const columns=Math.max(...rows);
 const rand=rng(state.config.seed+shuffleCount*23);
 const pitchX=(roomy?9.18:8.8)/(transpose?rows.length:columns);
 const verticalInset=wide?(roomy?.40:.62):denseSequence?.88:1.20;
 const pitchY=Math.min(roomy?2.18:1.59,(2*halfH-verticalInset)/(transpose?columns:rows.length));
 const pileScale=level===19||level===22||level===27?1.76:level<=3?1.66:1.61;
 const scale=Math.min(pitchX,pitchY)*(roomy?1.20:wide?1.40:pileScale);
 return rows.flatMap((count,row)=>Array.from({length:count},(_,column)=>{
  const bend=roomy?(row%2===0?-.105:.105):Math.sin(row*.95+level)*.19;
  const horizontal=column-(count-1)/2+bend+(rand()-.5)*(roomy?.13:denseSequence?.29:.47);
  const diagonal=Math.sin(column*1.35+row*1.7+level)*(roomy?.075:.20);
  const vertical=(rows.length-1)/2-row+diagonal+(rand()-.5)*(roomy?.10:denseSequence?.17:.28);
  return {
   x:(transpose?-vertical:horizontal)*pitchX,
   y:(transpose?horizontal:vertical)*pitchY,
   z:rand()*2,
   depth:1,
   scale:scale*(roomy?.94+rand()*.12:denseSequence?.92+rand()*.16:.86+rand()*.28),
   angle:(rand()-.5)*1.38,
   tilt:.08+rand()*.24,
  };
 }));
}
const layeredMarketRows={
 13:{portrait:[[3,4,4,5,5,5,4,4,3],[3,4,4,4,4,4,3,3]],wide:[[9,10,10,8],[7,8,7,7]]},
 14:{portrait:[[4,4,5,5,5,5,4,4,4],[4,5,5,5,5,5,5,4]],wide:[[9,11,11,9],[9,10,10,9]]},
 15:{portrait:[[3,4,5,5,5,5,5,4,4],[2,3,3,4,3,3,3,2]],wide:[[9,11,11,9],[5,6,7,5]]},
 16:{portrait:[[3,3,4,4,4,4,4,4,3],[2,2,3,3,3,3,2]],wide:[[7,9,9,8],[4,5,5,4]]},
};

function layeredMarketPositions(level){
 const wide=halfH<4;
 const [front,back]=layeredMarketRows[level][wide?'wide':'portrait'];
 const rand=rng(state.config.seed+shuffleCount*23);
 return [front,back].flatMap((rows,layer)=>{
  const pitchX=(wide?8.9:8.45)/Math.max(...rows);
  const pitchY=(2*halfH-(wide?.77:1.54))/rows.length;
  const scale=wide?Math.min(pitchX*1.23,pitchY*1.39):Math.min(pitchX*1.48,pitchY*1.68);
  return rows.flatMap((count,row)=>Array.from({length:count},(_,column)=>{
   const stagger=(row%2===layer?.15:-.15)+(rand()-.5)*.23;
   const x=(column-(count-1)/2+stagger)*pitchX;
   const y=((rows.length-1)/2-row+(rand()-.5)*.48)*pitchY;
   return {
    x,y,z:(layer===0?3.45+row*.31:.48+row*.10)+rand()*.57,depth:1-layer,
    scale:scale*(.91+rand()*.19)*(layer===0?1:.94),
    angle:(rand()-.5)*1.27,tilt:(rand()-.34)*.46,
   };
  }));
 });
}

function layeredMarketOrder(items,positions){
 const goals=new Set(state.config.goals.map(({type})=>type));
 const frontCount=positions.filter(slot=>slot.depth===1).length;
 const targets=items.filter(({type})=>goals.has(type));
 const filler=items.filter(({type})=>!goals.has(type));
 const extra=frontCount-targets.length;
 const front=shuffled([...targets,...filler.slice(0,extra)]);
 const remainingByType=new Map();
 for(const {type} of front)remainingByType.set(type,(remainingByType.get(type)??0)+1);
 const ordered=[];
 while(front.length){
  const here=positions[ordered.length];
  const neighborWeights=new Map();
  for(const [index,{type}] of ordered.entries()){
   const previous=positions[index];
   const distance=Math.hypot(here.x-previous.x,here.y-previous.y)/here.scale;
   const weight=Math.max(0,1.5-distance);
   neighborWeights.set(type,(neighborWeights.get(type)??0)+weight);
  }
  let best=0,bestScore=Infinity;
  front.forEach(({type},index)=>{
   const score=(neighborWeights.get(type)??0)*8-remainingByType.get(type)*.17;
   if(score<bestScore){best=index;bestScore=score;}
  });
  const [next]=front.splice(best,1);
  remainingByType.set(next.type,remainingByType.get(next.type)-1);
  ordered.push(next);
 }
 return [...ordered,...filler.slice(extra)];
}

// Each ID keeps its opening slot while the other items are collected.
const starterSlots=[
 [ .291, .302, -.12, .08, -.04],
 [-.291, .013, -.16, .07,  .10],
 [-.016,-.290,  .13, .06, -.05],
 [ .018, .291, -.07, .04, -.08],
 [ .284, .015,  .17, .03,  .04],
 [-.285,-.287, -.22, .04,  .04],
 [-.288, .298,  .24, .18, -.20],
 [-.012, .008,  .61, .13, -.14],
 [ .286,-.286, -.40, .16, -.22],
];

function starterPositions(){
 const scale=Math.min(2.10,halfH*.448);
 return starterSlots.map(([x,y,angle,tilt,turn],id)=>({
  x:x*10,y:y*2*halfH,z:id*.01,scale:scale*(id>=3&&id<=5?1.12:1),
  angle,tilt,turn,depth:0,
 }));
}
// Approximate the loss of ambient light immediately under another piece.
function shadeCoveredPieces(roots){
 const pieces=[...roots].filter(group=>!group.userData.returning);
 const daylight=usesMarketDaylight();
 for(const group of pieces){
  const {target,baseScale}=group.userData;
  let coverage=0;
  for(const neighbor of pieces){
   const upper=neighbor.userData.target;
   const height=upper.z-target.z;
   if(height<.25||height>baseScale*1.65)continue;
   const reach=(baseScale+neighbor.userData.baseScale)*.52;
   const distance=Math.hypot(target.x-upper.x,target.y-upper.y);
   if(distance>=reach)continue;
   const overlap=1-distance/reach;
   const feather=overlap*overlap*(3-2*overlap);
   coverage=Math.max(coverage,feather*(1-height/(baseScale*1.85)));
  }
  group.userData.ambientOcclusion=1-Math.min(daylight?.22:.25,coverage*.53);
 }
}
const trayNormal=new THREE.Vector3(0,0,1);
const lessonGuitarFace=new THREE.Vector3(0,1,0).applyEuler(new THREE.Euler(1.04,-.18,-.09));
function readablePose(id,face,pose,lessonGuitar=false){
 if(!face)return pose;
 const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.tiltX,pose.tiltY,pose.rotation));
 const normal=face.clone().applyQuaternion(orientation);
 // Double-sided panels can present either face without flipping their artwork.
 if(!lessonGuitar && normal.z<0)normal.negate();
 const limit=(lessonGuitar?.39:.47)+.05*Math.sin(id);
 const turn=normal.angleTo(trayNormal)-limit;
 if(turn<=0)return pose;
 const axis=normal.cross(trayNormal).normalize();
 orientation.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,turn));
 const rest=new THREE.Euler().setFromQuaternion(orientation);
 Object.assign(pose,{tiltX:rest.x,tiltY:rest.y,rotation:rest.z});
 return pose;
}
function settlePanelPoses(items,positions){
 const faces=new Map();
 for(const {id,type} of items){
  if(!faces.has(type))faces.set(type,(groups.get(id)??makeBoardItem(type)).userData.panelNormal);
  const guitar=state.level===2955 && ITEMS[type].key==='detail-2454';
  readablePose(id,guitar?lessonGuitarFace:faces.get(type),positions.get(id),guitar);
 }
}
function layout(){
 prepareContactShadows(groups.size);
 if(usesPileLayout()){
  const key=state.level+':'+state.config.variant+':'+shuffleCount;
  if(pileKey!==key){
   const opening=createState(state.level,state.config.variant,state.config).items;
   const geometryConfig=state.config.referenceOnly&&!state.config.layout?.chainStacks?{...state.config,layout:referenceTableLayout,openingGoalSets:2}:state.config;
   pile=buildPile(opening,geometryConfig,shuffleCount,{solid:true,foregroundGoals:usesLimeReference(),studio:state.level!==719});
   if(state.config.vinyl){
    for(const {id,type} of opening){
     const pose=pile.positions.get(id);
     const kind=rebuiltAsset(ITEMS[visualType(type)],modelLevel(type))?.kind;
     if(kind==='mandarin'||kind==='strawberry'){
      pose.tiltX=0;
      pose.tiltY=0;
      if(kind==='mandarin')pose.rotation=0;
     }
     if(ITEMS[type].key==='duck')pose.tiltY+=Math.PI;
    }
   }else settlePanelPoses(opening,pile.positions);
   if(state.config.layout?.spreadTriples||state.config.layout?.chainStacks){
    // Size the visible face, so short objects get as much room as long ones.
    for(const {id,type} of opening){
     const probe=makeBoardItem(type),pose=pile.positions.get(id);
     probe.rotation.set(pose.tiltX,pose.tiltY,pose.rotation);
     const size=new THREE.Box3().setFromObject(probe,true).getSize(new THREE.Vector3());
     pose.scale=(state.config.layout.chainStacks?2.98:state.config.vinyl?2.82:2.48)/Math.max(size.x,size.y,.01);
    }
   }
   contactPile=createBoardContacts(opening,pile.positions);
   pileKey=key;
  }
  const heights=contactPile?.settle(groups.keys());
  const positions=heights?pile.positions:settlePile(pile.positions,groups.keys());
  const limeReference=usesLimeReference();
  const useGroundContacts=state.config.vinyl||limeReference||state.level===719&&state.config.variant===1;
  for(const g of groups.values()){
   const id=g.userData.id,p=positions.get(id);
   g.userData.baseScale=p.scale;
   g.scale.setScalar(p.scale);
   g.userData.target=new THREE.Vector3(p.x,p.y,heights?.get(id)??p.z);
   const solid=g.userData.solid||hasSolidModel(g.userData.type);
   g.rotation.set(solid?p.tiltX:0,solid?p.tiltY:0,p.rotation);
   g.userData.depth=p.depth;
   g.userData.featured=Boolean(p.featured);
   if(useGroundContacts&&(state.config.vinyl||(limeReference?p.depth<10:p.referenceAnchor))&&!g.userData.returning){
    shadowPose.position.set(p.x+p.scale*.025,p.y-p.scale*.074,limeReference?-1.02:-.83);
    shadowPose.rotation.z=p.rotation;
    shadowPose.scale.set(p.scale*1.27,p.scale*1.14,1);
    shadowPose.updateMatrix();
    contactShadows.setMatrixAt(contactShadows.count++,shadowPose.matrix);
   }
  }
  if(useGroundContacts)contactShadows.instanceMatrix.needsUpdate=true;
  shadeCoveredPieces(groups.values());
  contactMoving=Boolean(contactPile);
  return;
 }
 if(!groups.size){contactPile=null;return;}
 // Keep the early boards in their opening slots when a piece is picked.
 const firstLevel=state.level===1;
 const layered=!state.config.introSequence&&usesLayeredMarket(state.level);
 const citrusMarket=usesMarketDaylight();
 const roomy=usesRoomierMarket();
 const opening=usesMarketStyle(state.level)?createState(state.level,state.config.variant,state.config).items:null;
 const order=opening&&!firstLevel?shuffled(opening):opening;
 const market=firstLevel?starterPositions():layered?layeredMarketPositions(state.level):opening?marketPositions(state.level,opening.length):null;
 const positionedOrder=layered?layeredMarketOrder(order,market):order;
 const slots=positionedOrder?positionedOrder.map(({id})=>groups.get(id)):[...groups.values()];
 const rand=rng(state.config.seed+shuffleCount);
 const height=Math.max(.5,halfH*2-Math.min(2.3,halfH*.5));
 const cols=Math.max(3,Math.ceil(Math.sqrt(slots.length*8.2/height)));
 const rows=Math.ceil(slots.length/cols);
 const cell=Math.min(8.2/cols,height/rows);
 const warmTable=Boolean(market);
 const marketKey=firstLevel?'starter:'+halfH:'market:'+state.level+':'+shuffleCount+':'+halfH;
 const contactPoses=market&&(pileKey!==marketKey||!contactPile)?new Map():null;
 const goalTypes=contactPoses?new Set(state.goals.map(({type})=>type)):null;
 if(!market)contactPile=null;
 slots.forEach((group,index)=>{
  const slot=market?.[index];
  const item=positionedOrder?.[index];
  const itemDefinition=item&&ITEMS[item.type];
  const spacing=roomy?(itemDefinition.key==='duck'?.82:.89):firstLevel?1:citrusMarket?.91:layered?.94:.97;
  const scale=slot?slot.scale*spacing:Math.min(1.15,cell/1.22);
  const row=Math.floor(index/cols);
  const jitter=market?0:cell*.16;
  let x=(slot?.x??(index%cols-(cols-1)/2)*cell)+(rand()-.5)*jitter;
  let y=(slot?.y??((rows-1)/2-row)*cell)+(rand()-.5)*jitter;
  if(market&&!firstLevel){
   const inset=state.config.introSequence?.22+scale*.68:.12+scale*.52;
   x=Math.max(-5+inset,Math.min(5-inset,x));
   y=Math.max(-halfH+inset,Math.min(halfH-inset,y));
  }
  const z=slot?.z??((warmTable?.45:.1)+rand()*.25);
  const tiltX=(rand()-.5)*.5,tiltY=(rand()-.5)*.5,rotation=slot?.angle??(rand()-.5)*1.8;
  const sourceId=itemDefinition?.sourceItemId;
  const boxAngle=sourceId===1441?.27:0;
  const citrusTilt=sourceId===1048?(citrusMarket?.60:.30):0;
  const laidPin=state.level===10&&itemDefinition?.key.startsWith('pin')&&item.id%3!==0;
  let rx=firstLevel?slot.tilt:market?slot.tilt+boxAngle*.45+citrusTilt*.55+(laidPin?.83:0):tiltX;
  let ry=firstLevel?slot.turn:market?tiltY*.65:tiltY;
  let rz=rotation;
  if(state.level===19 && lessonRackets.has(itemDefinition?.key)){
   // Turn the face towards the tray camera before applying the slot's in-plane spin.
   const rest=new THREE.Euler(.84+.11*Math.sin(item.id*1.7),ry*.45,rz,'ZXY');
   rest.reorder('XYZ');
   rx=rest.x;ry=rest.y;rz=rest.z;
  }else if(group?.userData.panelNormal){
   const rest=readablePose(group.userData.id,group.userData.panelNormal,{tiltX:rx,tiltY:ry,rotation:rz});
   rx=rest.tiltX;ry=rest.tiltY;rz=rest.rotation;
  }
  if(contactPoses){
   // Let goal pieces rest on fillers so the player can find a first match immediately.
   const foregroundGoal=goalTypes.has(item.type)&&(state.level!==2||item.id%3!==0);
   const bottleAccent=citrusMarket&&sourceId===1126&&item.id%3===0;
   const supportOrder=slot.depth*100+(foregroundGoal?100:bottleAccent?76:0)+slot.z;
   contactPoses.set(item.id,{x,y,z,scale,tiltX:rx,tiltY:ry,rotation:rz,depth:slot.depth,supportOrder});
  }
  if(!group)return;
  group.userData.baseScale=scale;
  group.userData.depth=slot?.depth??0;
  group.scale.setScalar(scale);
  group.userData.target=new THREE.Vector3(x,y,z);
  group.rotation.set(rx,ry,rz);
  if(market){group.position.x=x;group.position.y=y;}
  if(warmTable&&!citrusMarket&&!group.userData.returning&&(!layered||slot.depth===0)){
   shadowPose.position.set(x+(firstLevel?.10:.046)*scale,y-(firstLevel?.15:.105)*scale,firstLevel?-1.02:-.83);
   shadowPose.rotation.z=rotation*.45;
   shadowPose.scale.set(scale*(firstLevel?1.67:1.30),scale*(firstLevel?1.46:1.09),1);
   shadowPose.updateMatrix();
   contactShadows.setMatrixAt(contactShadows.count++,shadowPose.matrix);
  }
 });
 if(market){
  if(contactPoses){
   const bySupport=new Map([...contactPoses].sort((a,b)=>a[1].supportOrder-b[1].supportOrder));
   contactPile=createBoardContacts(positionedOrder,bySupport);
   pileKey=marketKey;
  }
  const heights=contactPile.settle(groups.keys());
  for(const [id,group] of groups){
   const {target,baseScale}=group.userData;
   target.z=heights.get(id);
   if(citrusMarket&&target.z<baseScale*.12&&!group.userData.returning){
    shadowPose.position.set(target.x+baseScale*(roomy?.17:.11),target.y-baseScale*(roomy?.22:.16),-.997);
    shadowPose.rotation.z=group.rotation.z;
    shadowPose.scale.set(baseScale*(roomy?1.84:1.57),baseScale*(roomy?1.64:1.38),1);
    shadowPose.updateMatrix();
    contactShadows.setMatrixAt(contactShadows.count++,shadowPose.matrix);
   }
  }
  if(!firstLevel)shadeCoveredPieces(groups.values());
  contactMoving=true;
 }
 contactShadows.instanceMatrix.needsUpdate=true;
}
function shuffled(a){const rand=rng(state.config.seed+shuffleCount);for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function disposeGroup(g){renderDirty=true;scene.remove(g);g.traverse(o=>{if(o.geometry&&!o.userData.sharedGeometry)o.geometry.dispose();if(o.material?.transparent&&o.material.opacity===0)o.material.dispose();});}
function rebuild(animateDrop=false,boardOrder){
 const {width,height}=canvas.getBoundingClientRect();
 const pixelRatio=boardPixelRatio(width,height);
 if(renderer.getPixelRatio()!==pixelRatio)renderer.setPixelRatio(pixelRatio);
 const starter=state.level===1;
 const warmTable=usesMarketStyle(state.level)||usesLimeReference();
 const referenceStyle=state.config.detailed&&state.level===719;
 const featured=uses1529Finish();
 const crowded=state.config.inventory.reduce((count,item)=>count+item.count,0)>=240 && state.level!==719 && !featured;
 const citrusMarket=usesMarketDaylight();
 ambient.intensity=citrusMarket?.48:.61;
 ambient.color.set('#fffbf4');
 ambient.groundColor.set('#c3a781');
 scene.environment=glossyEnvironment();
 scene.environmentIntensity=1.13;
 renderer.toneMapping=THREE.NeutralToneMapping;
 renderer.toneMappingExposure=starter?.81:.83;
 shapeLight.intensity=.40;
 sun.color.set('#fff8ee');
 sun.position.set(-35,45,91);
 sun.intensity=citrusMarket?2.03:2.15;
 sun.shadow.intensity=citrusMarket?.43:starter?.53:featured?.37:crowded?.39:.49;
 sun.shadow.camera.far=starter||referenceStyle&&warmTable?150:165;
 sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.normalBias=starter||referenceStyle&&warmTable?.016:.028;
 sun.shadow.radius=(featured||crowded)?(mobileProfile?18:29):(mobileProfile?14:25);
 floor.material.color.set('#67532b');
 floor.visible=citrusMarket||!warmTable;
 contactShadowMaterial.opacity=usesRoomierMarket()?.72:citrusMarket?.49:starter?.77:referenceStyle?(warmTable?.54:.39):featured?.31:crowded?.35:.50;
 floor.material.opacity=citrusMarket?.11:.31;
 if(state.config.vinyl){
  ambient.intensity=.72;ambient.groundColor.set('#d5c9b8');
  sun.color.set('#fff8ef');sun.intensity=1.82;scene.environmentIntensity=.80;
  contactShadowMaterial.opacity=.45;
  floor.material.opacity=.21;
 }
 const itemsById=new Map(state.items.map(item=>[item.id,item]));
 const items=boardOrder?boardOrder.map(id=>itemsById.get(id)):shuffled([...state.items]);
 cancelFlights();
 pileInstances.clear();
 for(const group of groups.values())disposeGroup(group);
 groups.clear();
 releaseReferenceTextures(state.config.inventory.map(item=>visualType(item.type)));
 releaseIndividualAtlases(new Set(state.config.inventory.map(({type})=>materialIdentity(type).lookId)));
 for(const {id,type} of items){
  const group=makeBoardItem(type);
  group.userData.id=id;
  group.userData.type=type;
  groups.set(id,group);
  scene.add(group);
 }
 update();
 fitCamera();
 layout();
 for(const group of groups.values())group.position.copy(group.userData.target);
 if(animateDrop)startDrop();
 pileInstances.rebuild(groups.values());
}
const goalViews=new Map();
const traySlots=Array.from({length:7},()=>{
 const slot=document.createElement('div');
 slot.className='slot';
 $('tray').append(slot);
 return slot;
});
const trayIcons=new Map();
const flights=new Map();
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let pendingResult=null;
let lastTimer={};

function updateTimer(){
 const seconds=Math.ceil(state.remaining);
 const frozenSeconds=Math.ceil(state.frozen);
 const frozen=frozenSeconds>0;
 const duration=state.config.seconds;
 const timer=$('timer');
 if(seconds!==lastTimer.seconds){
  const minutes=String(Math.floor(seconds/60)).padStart(2,'0');
  timer.textContent=minutes+':'+String(seconds%60).padStart(2,'0');
  timer.classList.toggle('urgent',seconds<30);
 }
 if(frozen!==lastTimer.frozen){
  timer.classList.toggle('frozen',frozen);
  $('freeze-counter').hidden=!frozen;
 }
 if(frozenSeconds!==lastTimer.frozenSeconds&&frozen){
  $('freeze-counter').textContent=frozenSeconds+'秒';
  $('freeze-counter').setAttribute('aria-label','倒计时冻结剩余 '+frozenSeconds+' 秒');
 }
 if(seconds!==lastTimer.seconds||duration!==lastTimer.duration)$('timer-meter').value=seconds/duration;
 lastTimer.seconds=seconds;
 lastTimer.frozen=frozen;
 lastTimer.duration=duration;
}

function updateItemImage(image,type){
 const src=boardItemIcon(type);
 if(image.getAttribute('src')!==src)image.src=src;
 image.alt=boardItemName(type);
}

function updateGoals(){
 const container=$('targets');
 container.classList.toggle('compact',state.goals.length>3);
 container.classList.toggle('many-targets',state.goals.length>=5);
 container.style.setProperty('--goal-count',state.goals.length);
 const types=new Set(state.goals.map(goal=>goal.type));
 for(const [type,view] of goalViews){
  if(types.has(type))continue;
  view.card.remove();
  goalViews.delete(type);
 }
 state.goals.forEach((goal,index)=>{
  let view=goalViews.get(goal.type);
  if(!view){
   view={card:document.createElement('div'),image:new Image(),name:document.createElement('span'),count:document.createElement('b')};
   view.card.className='target';
   view.name.className='target-name';
   view.name.setAttribute('aria-hidden','true');
   view.card.append(view.image,view.name,view.count);
   goalViews.set(goal.type,view);
  }
  if(container.children[index]!==view.card)container.insertBefore(view.card,container.children[index]??null);
  updateItemImage(view.image,goal.type);
  if(view.name.textContent!==view.image.alt)view.name.textContent=view.image.alt;
  const remaining=settledGoalRemaining(state,goal.type);
  view.card.classList.toggle('done',remaining===0);
  const title=view.image.alt+(remaining===0?' · 已收齐':' · 剩余 '+remaining+' 件');
  if(view.card.title!==title)view.card.title=title;
  const label=remaining===0?'✓':String(remaining);
  if(view.count.textContent!==label)view.count.textContent=label;
 });
}

function updateTray(){
 const visibleIds=new Set(state.tray.map(item=>item.id));
 for(const [id,image] of trayIcons){
  if(visibleIds.has(id))continue;
  image.remove();
  trayIcons.delete(id);
 }
 state.tray.forEach((item,index)=>{
  let image=trayIcons.get(item.id);
  if(!image){
   image=new Image();
   trayIcons.set(item.id,image);
  }
  updateItemImage(image,item.type);
  image.classList.toggle('in-transit',flights.has(item.id));
  if(image.parentNode!==traySlots[index])traySlots[index].append(image);
 });
 $('tray').classList.toggle('near-capacity',state.tray.length>=5);
}

function updateStarterGuide(){
 const guide=$('starter-guide');
 guide.hidden=state.level!==1||state.status!=='playing'||state.collected.some(count=>count>0);
 if(guide.hidden)return;
 const latest=state.tray.at(-1);
 const selected=latest?state.tray.filter(item=>item.type===latest.type).length:0;
 const text=latest?`再找 ${3-selected} 个${boardItemName(latest.type)}`:'找出桌上 3 件一样的物品';
 if(guide.textContent!==text)guide.textContent=text;
}

function update(){
 renderDirty=true;
 $('level').textContent=`第${state.level}关`;
 $('game').classList.toggle('super-hard',state.level===719&&!state.config.introSequence);
 $('game').classList.toggle('vinyl-lesson',Boolean(state.config.vinyl));
 $('game').classList.toggle('starter-scene',state.level===1);
 updateTimer();
 updateGoals();
 updateTray();
 updateStarterGuide();
 $('capacity').textContent=`收纳槽 ${state.tray.length} / 7`;
 for(const [key,unlock] of Object.entries({hint:3,undo:5,shuffle:7,freeze:9})){
  const button=$(key), locked=state.level<unlock;
  const remaining=state.uses[key];
  const detail=locked?`第 ${unlock} 关开启`:`剩余 ${remaining} 次`;
  button.querySelector('small').textContent=locked?'':remaining;
  button.disabled=locked||remaining===0;
  button.classList.toggle('locked',locked);
  button.title=detail;
  button.setAttribute('aria-label',`${button.querySelector('.booster-name').textContent}，${detail}`);
 }
 $('source-link').href=state.config.source;
 $('source-link').textContent=usesMarketStyle(state.level)?'查看玩法参考 ↗':'查看本关配置来源 ↗';
 $('level-quality').textContent=state.config.referenceOnly?'亮釉立体盘面 · 录像目标数量':usesPileLayout()?state.config.accuracy:usesMarketStyle(state.level)?state.config.title:'盘面数量与布局仍在校准';
}
function toast(t){$('toast').textContent=t;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,2600);}
function beep(match=false){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();[0,...(match?[.09,.18]:[])].forEach((delay,i)=>{const o=audio.createOscillator(),gain=audio.createGain();o.type='sine';o.frequency.value=(match?660:440)*[1,1.25,1.5][i];gain.gain.setValueAtTime(.07,audio.currentTime+delay);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+delay+.18);o.connect(gain);gain.connect(audio.destination);o.start(audio.currentTime+delay);o.stop(audio.currentTime+delay+.19);});}catch{}}
function settleFlight(id,flight){
 flight.element.remove();
 if(flights.get(id)!==flight)return;
 flights.delete(id);
 flight.onLand?.();
}

function cancelFlights(){
 for(const [id,flight] of flights){
  flight.animation.cancel();
  settleFlight(id,flight);
 }
}

function boardPoint(position){
 const point=position.clone().project(camera);
 const rect=canvas.getBoundingClientRect();
 return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
}

function flyItem(item,start,end,size,endScale,onLand,className=''){
 const dx=end.x-start.x,dy=end.y-start.y;
 const element=new Image(size,size);
 element.className=className?'tray-flight '+className:'tray-flight';
 element.setAttribute('aria-hidden','true');
 element.alt='';
 element.src=boardItemIcon(item.type);
 element.style.left=start.x-size/2+'px';
 element.style.top=start.y-size/2+'px';
 $('game').append(element);
 const animation=element.animate([
  {transform:'translate(0,0) scale(1.05)',opacity:.93},
  {transform:`translate(${dx*.48}px,${dy*.44-18}px) scale(1.12)`,offset:.48},
  {transform:`translate(${dx}px,${dy}px) scale(${endScale})`,opacity:1},
 ],{duration:240,easing:'cubic-bezier(.17,.65,.37,1)',fill:'forwards'});
 const flight={element,animation,onLand};
 flights.set(item.id,flight);
 return animation.finished.catch(()=>{}).then(()=>settleFlight(item.id,flight));
}

function removeToTray(item,index){
 const group=groups.get(item.id);
 const start=boardPoint(group.position);
 groups.delete(item.id);
 disposeGroup(group);
 if(reduceMotion.matches||document.hidden)return Promise.resolve();
 const slot=traySlots[index].getBoundingClientRect();
 const end={x:slot.left+slot.width/2,y:slot.top+slot.height/2};
 const size=Math.min(58,Math.max(32,slot.width*1.15));
 return flyItem(item,start,end,size,Math.min(slot.width,slot.height)/size,
  ()=>trayIcons.get(item.id)?.classList.remove('in-transit'));
}

function finishAction(feedback){
 update();
 if(state.status==='playing'){
  saveRound();
  return;
 }
 const ownsSave=clearRound();
 if(state.status==='won'){
  if(!progress.completed.includes(level))progress.completed.push(level);
  progress.current=nextLevelId(level)??level;
  progress.variant=undefined;
  if(ownsSave){
   saveProgress();
   updateLevelAddress(progress.current,progress.variant);
  }
 }
 const round=state;
 pendingResult=round;
 feedback.then(()=>{
  if(state!==round||pendingResult!==round)return;
  pendingResult=null;
  showResult();
 });
}

function pickableGroups(){const heads=availableHeads(state);return [...groups.values()].filter(group=>!group.userData.returning&&(!heads||heads.has(group.userData.id)));}
function hitBoardGroup(raycaster,selectable){
 const hits=raycaster.intersectObjects(selectable,true);
 const hit=hits.find(({object})=>!object.userData.pickAssist)??hits[0];
 if(!hit)return null;
 let root=hit.object;
 while(root.parent!==scene)root=root.parent;
 return root;
}


let starArmed=false;
const starButton=document.createElement('button');
starButton.className='chain-star';
starButton.style.cssText='left:8px;bottom:6px;top:auto;transform:none';
starButton.hidden=true;$('playfield').append(starButton);
starButton.onclick=()=>{starArmed=!starArmed;syncChainButtons();};
function syncChainButtons(){
 starButton.hidden=!state.config.boosters.star||state.status!=='playing';
 if(starButton.hidden)return;
 const charge=state.config.layout.starAfter??2;
 const progress=Math.min(charge,state.config.inventory.reduce((sum,row)=>sum+state.collected[row.type],0)/3);
 starButton.disabled=!state.uses.star||progress<charge;
 const caption=!state.uses.star?'★ 已用':progress<charge?'★ 连消 '+progress+'/'+charge:starArmed?'选择要连消的堆顶':'★ 连消一次';
 if(starButton.textContent!==caption)starButton.textContent=caption;
}
function select(id){
 if(state.config.layout?.chainStacks&&starArmed){
  const result=clearStarStack(state,id);
  if(!result)return;
  starArmed=false;
  const feedback=Promise.all(result.fromBoard.map((item,i)=>removeToTray(item,i)));
  layout();pileInstances.rebuild(groups.values());syncChainButtons();
  beep(true);toast('连消！收齐三个'+boardItemName(result.type));finishAction(feedback);return;
 }
 const slot=state.tray.length;
 const result=pick(state,id);
 if(!result)return;
 const arrival=removeToTray(result.item,slot);
 layout();
 pileInstances.rebuild(groups.values());
 beep();
 const round=state;
 const feedback=result.matched?arrival.then(()=>{
  if(state!==round)return;
  beep(true);
  combo=performance.now()-lastMatch<5000?combo+1:1;
  lastMatch=performance.now();
  $('combo').textContent=combo>1?`${combo} 连消！`:'三个一组！';
  $('combo').classList.remove('show');
  void $('combo').offsetWidth;
  $('combo').classList.add('show');
  if(!reduceMotion.matches&&!document.hidden){
   const animation=traySlots[slot].animate([
    {boxShadow:'inset 0 0 0 2px #fff4b3, 0 0 10px #f6e887'},
    {boxShadow:'inset 0 0 0 1px transparent, 0 0 0 transparent'},
   ],{duration:180,easing:'ease-out'});
   return animation.finished.catch(()=>{});
  }
 }):arrival;
 finishAction(feedback);
}
// Suppress the compatibility click when a touch opens the result dialog.
canvas.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let press=null;
canvas.addEventListener('pointerdown',e=>{if(state.status!=='playing'||!e.isPrimary||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);press={id:e.pointerId,x:e.clientX,y:e.clientY,pan:{...pan},dragged:false};});
canvas.addEventListener('pointermove',e=>{if(!press||press.id!==e.pointerId)return;const dx=e.clientX-press.x,dy=e.clientY-press.y;if(Math.hypot(dx,dy)>7)press.dragged=true;if(press.dragged&&boardZoom>1){const r=canvas.getBoundingClientRect();const span=camera.right-camera.left;pan.x=Math.max(-5,Math.min(5,press.pan.x-dx/r.width*span));pan.y=Math.max(-8,Math.min(8,press.pan.y+dy/r.height*(camera.top-camera.bottom)));fitCamera();}});
// Exact surface hits win. In the open grid, also accept a finger near the slot centre.
function nearbyTouchTarget(event,rect,groups){
 if(!state.config.layout?.chainStacks&&(event.pointerType!=='touch'||!state.config.layout?.spreadTriples))return null;
 let nearest=null,distance=Infinity;
 for(const group of groups){
  const point=group.position.clone().project(camera);
  const dx=event.clientX-rect.left-(point.x+1)*rect.width/2;
  const dy=event.clientY-rect.top-(1-point.y)*rect.height/2;
  const d=dx*dx+dy*dy;
  if(Math.max(Math.abs(dx),Math.abs(dy))<=28 && d<distance){nearest=group;distance=d;}
 }
 return nearest;
}
canvas.addEventListener('pointerup',e=>{if(!press||press.id!==e.pointerId)return;const click=!press.dragged;press=null;if(!click||state.status!=='playing')return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const candidates=pickableGroups();const group=hitBoardGroup(ray,candidates)??nearbyTouchTarget(e,r,candidates);if(group)select(group.userData.id);});
canvas.addEventListener('pointercancel',()=>{press=null;});
function setBoardTools(open){
 const panel=$('board-tools');
 if(panel.hidden===!open)return;
 panel.hidden=!open;
 $('board-tools-toggle').setAttribute('aria-expanded',String(open));
}
$('board-tools-toggle').onclick=()=>setBoardTools($('board-tools').hidden);
document.addEventListener('pointerdown',event=>{
 if(!$('board-controls').contains(event.target))setBoardTools(false);
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!$('board-tools').hidden){
  setBoardTools(false);
  $('board-tools-toggle').focus();
 }
});
$('quick-zoom').onclick=()=>{
 setBoardTools(false);
 changeZoom(boardZoom>1?1:2);
 if(boardZoom>1)toast('拖动查看，轻点收集');
};
$('zoom-in').onclick=()=>changeZoom(boardZoom+.5);
$('zoom-out').onclick=()=>changeZoom(boardZoom-.5);
$('zoom-reset').onclick=()=>changeZoom(1);
$('configuration').onchange=event=>{
 setBoardTools(false);
 start(level,Number(event.target.value));
};

let referencePreviousStatus='playing';
$('board-reference').onclick=()=>{
 if(state.status==='loading'||pendingResult)return;
 setBoardTools(false);
 referencePreviousStatus=state.status;
 if(state.status==='playing'){
  state.status='paused';
  saveRound();
 }
 $('reference-image').src=state.config.boardReference;
 $('reference-source').href=state.config.source;
 $('reference-summary').textContent=`配置 ${state.config.variant} · ${state.config.seconds} 秒 · ${state.config.inventory.reduce((count,item)=>count+item.count,0)} 件物品`;
 $('reference-panel').hidden=false;
 $('reference-close').focus();
};
$('reference-close').onclick=()=>{
 $('reference-panel').hidden=true;
 state.status=referencePreviousStatus;
 lastTime=performance.now();
 $('board-tools-toggle').focus();
};

function updateConfiguration(){
 const variants=getLevelVariants(level);
 const options=$('configuration');
 options.replaceChildren(...variants.map(config=>
  new Option(config.introSequence?(config===variants[0]?config.title:'上版连续挑战'):config.detailed?'资料配置 '+config.variant:variants[0].introSequence?config.title:config.referenceOnly?'录像计数 · 立体盘面':'录像参考',config.variant??0)));
 options.value=state.config.variant??0;
 const canSwitch=variants.length>1;
 const inPause=Boolean(state.config.introSequence);
 const row=$('configuration-row');
 if(inPause)$('pause-configuration').append(row);
 else $('board-tools').prepend(row);
 const canZoom=usesPileLayout();
 $('quick-zoom').hidden=!canZoom||state.config.inventory.reduce((count,item)=>count+item.count,0)<60;
 const hasReference=false;
 $('board-controls').hidden=!(canSwitch&&!inPause||canZoom||hasReference);
 $('configuration-row').hidden=!canSwitch;
 $('zoom-controls').hidden=!canZoom;
 $('board-reference').hidden=!hasReference;
 setBoardTools(false);
}

function modal(title,text,primary,fn,secondary=false){$('modal').classList.remove('victory');setBoardTools(false);$('pause-configuration').hidden=!(secondary&&state.config.introSequence);$('sound').hidden=!secondary;$('modal-title').textContent=title;$('modal-text').innerHTML=text;$('primary').textContent=primary;$('primary').onclick=fn;$('secondary').hidden=!secondary;$('secondary').onclick=()=>start(level,state.config.variant);$('modal').hidden=false;}
let loadingEpoch=0;
async function start(l=1,variant){
 const epoch=++loadingEpoch;
 pendingResult=null;
 savedRound=null;
 saveWriter=crypto.getRandomValues(new Uint32Array(4)).join('-');
 cancelFlights();
 drop=null;
 lastDrop=null;
 contactPile=null;
 setDropCamera(0);
 level=l;
 state=createCampaignState(l,variant);
 starArmed=false;
 shuffleCount=0;
 pileKey=null;
 changeZoom(1);
 updateConfiguration();
 $('combo').textContent='';
 $('combo').classList.remove('show');
 combo=0;
 lastMatch=0;
 progress.current=l;
 progress.variant=state.config.variant;
 saveProgress();
 updateLevelAddress(l,progress.variant);
 $('level-menu').hidden=true;
 state.status='loading';
 saveRound(true,shuffled([...state.items]).map(item=>item.id));
 $('modal').hidden=true;
 toast('正在准备物件…');
 try{await prepareRoundAssets();}catch(error){
  if(epoch!==loadingEpoch)return;
  console.error('Round assets unavailable',error);
  state.status='ready';
  modal('关卡未能加载','请检查网络后再试。','重新加载',()=>location.reload());
  return;
 }
 if(epoch!==loadingEpoch)return;
 localizedIcons.clear();
 lastTime=performance.now();
 rebuild(hasContactPile()&&!reduceMotion.matches);
 if(!drop){
  state.status='playing';
  saveRound();
  updateStarterGuide();
  if(state.level===1){
   clearTimeout(toastTimer);
   $('toast').style.opacity=0;
  }else showLevelTip();
 }
}

function showLevelTip(){
 if(state.config.layout?.chainStacks)toast(state.config.boosters.star?'先取堆顶，消 '+(state.config.layout.starAfter??2)+' 组可用连消':'先取堆顶，三个同款消一组');
 else if(state.level===2)toast(state.config.variant===0?'收齐橘子就能过关':'收齐小鸭和草莓，每三件消一组');
 else if(state.level===3)toast('吸尘器已解锁，可收走一组目标');
 else if(state.level===4)toast(state.config.introSequence?'这一关多了热水瓶':'红苹果和黄苹果各收齐 9 个');
 else if(state.level===5)toast('撤回已解锁，可以放回最近拿起的物件');
 else if(state.level===6&&state.config.introSequence)toast('这一关多了剪刀');
 else if(state.level===7)toast('重排已解锁，可以打乱桌上的位置');
 else if(state.level===8&&state.config.introSequence)toast('这一关多了书本');
 else if(state.level===9)toast('冰冻已解锁，可暂停倒计时 10 秒');
 else if(state.level===10&&state.config.introSequence)toast('这一关多了甜甜圈');
 else if(state.config.introducedType!==undefined)toast('这一关多了'+boardItemName(state.config.introducedType));
 else toast('点三个一样的物件，收齐上方目标');
}

async function prepareRoundAssets(){
 const recipes=state.config.inventory.map(({type})=>materialIdentity(type));
 await Promise.all([prepareSurfaces(),...recipes.map(({appearance,lookId,fruit})=>
  fruit?fruit.prepare():prepareIndividualAtlas(lookId))]);
 prepareBoardModels();
 await referenceTexturesReady();
 if(state.level===1)return;
 const byLevel=new Map();
 for(const {type} of state.config.inventory){
  const level=modelLevel(type),definition=boardDefinition(type),id=definition.sourceItemId;
  if(rebuiltAsset(definition,level))continue;
  if(!byLevel.has(level))byLevel.set(level,[]);
  byLevel.get(level).push(definition);
 }
 await Promise.all([
  ...[...byLevel].map(([level,items])=>prepareHouseholdAssets(level,items,state.config.variant)),
 ]);
 await solidItemTexturesReady();

}

function resume(){
 savedRound=null;
 state.status='playing';
 lastTime=performance.now();
 $('modal').hidden=true;
 updateStarterGuide();
 saveRound();
}
function applyCoverTitle(paused=false){
 const heading=$('modal-title');
 const title=document.createElement('span');
 title.className=paused?'opening-title pause-title':'opening-title';
 title.textContent=heading.textContent;
 heading.replaceChildren(title);
}
function showResult(){
 const win=state.status==='won',next=nextLevelId(level);
 $('modal-icon').textContent=win?'✓':'↻';
 modal(
  win?'收齐啦，漂亮！':state.status==='timeout'?'时间到了':'收纳槽满了',
  win?`第 ${level} 关目标全部收齐。`:state.status==='timeout'?'第 '+level+' 关 · 先找目标物件':'第 '+level+' 关 · 先凑齐槽里的对子',
  win?(next===null?'已通关 · 查看关卡':'下一关 · '+next):'再试一次',
  ()=>next===null&&win?openLevels():start(win?next:level,win?undefined:state.config.variant),
 );
 if(win){
  $('modal').classList.add('victory');
  $('modal-title').textContent='好物收齐！';
  $('modal-text').textContent='第 '+level+' 关完成';
  $('primary').textContent=next===null?'查看我的关卡':'挑战第 '+next+' 关';
  const figures=state.goals.slice(0,4).map(({type},i)=>{
   const img=new Image();img.alt='';img.src=boardItemIcon(type);
   img.style.setProperty('--entry-delay',i*75+'ms');return img;
  });
  $('victory-items').replaceChildren(...figures);
 }else{
  applyCoverTitle();
 }

}
$('primary').textContent=`开始第 ${progress.current} 关`;
$('primary').onclick=()=>start(progress.current,progress.variant);
if(savedRound){
 $('modal-text').textContent='第 '+level+' 关 · 接着收集';
 $('primary').textContent='继续上次游戏';
 $('primary').onclick=resume;
}
$('pause').onclick=()=>{
 if(state.status!=='playing')return;
 state.status='paused';
 saveRound();
 updateTimer();
 modal('游戏暂停','第 '+level+' 关 · 剩余 '+$('timer').textContent,'继续游戏',resume,true);
 applyCoverTitle(true);
};
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden)return;
 cancelFlights();
 updateTray();
 if(state.status==='playing')$('pause').click();
});
window.addEventListener('pagehide',()=>{if(state.status==='playing'||state.status==='paused')saveRound();});
$('undo').onclick=()=>{
 const item=undo(state);
 if(!item){toast('只能撤回最近一次未消除的物件');return;}
 const previous=flights.get(item.id);
 const origin=previous?.element.getBoundingClientRect()??traySlots[state.tray.length].getBoundingClientRect();
 if(previous){
  previous.animation.cancel();
  settleFlight(item.id,previous);
 }
 const group=makeBoardItem(item.type);
 const animate=(usesMarketStyle(state.level)||usesLimeReference())&&state.level!==1&&!reduceMotion.matches&&!document.hidden;
 group.userData.id=item.id;
 group.userData.type=item.type;
 group.userData.returning=animate;
 groups.set(item.id,group);
 scene.add(group);
 layout();
 group.position.copy(group.userData.target);
 if(contactPile)contactPile.advance(groups,0);
 if(animate){
  const start={x:origin.left+origin.width/2,y:origin.top+origin.height/2};
  const end=boardPoint(group.position);
  const size=Math.min(54,Math.max(28,Math.min(origin.width,origin.height)));
  flyItem(item,start,end,size,1,()=>{
   if(groups.get(item.id)!==group)return;
   group.userData.returning=false;
   layout();
   group.position.copy(group.userData.target);
   pileInstances.rebuild(groups.values());
   renderDirty=true;
  },'return-flight');
 }
 pileInstances.rebuild(groups.values());
 update();
 saveRound();
 toast('已撤回，剩余 '+state.uses.undo+' 次');
};
$('hint').onclick=()=>{
 const result=vacuum(state);
 if(!result)return;
 const feedback=Promise.all(result.fromBoard.map((item,index)=>removeToTray(item,index)));
 layout();
 pileInstances.rebuild(groups.values());
 beep(true);
 toast(`已收走一组${boardItemName(result.type)}`);
 finishAction(feedback);
};
$('shuffle').onclick=()=>{if(state.status!=='playing'||state.uses.shuffle===0)return;cancelFlights();state.uses.shuffle--;shuffleCount++;groups=new Map(shuffled([...groups]));layout();update();saveRound();
 if(contactPile){state.status='loading';startDrop();}
 else toast('翻好啦，换个位置再找找');};
$('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').querySelector('small').textContent=sound?'已开启':'已关闭';};
$('freeze').onclick=()=>{if(state.status!=='playing'||state.uses.freeze<=0)return;state.uses.freeze--;state.frozen+=10;update();saveRound();toast('倒计时冻结 10 秒');};
const levelsByNumber=new Map(LEVELS.map((config,index)=>[config.id,{config,index}]));
const levelsPerPage=24;
let levelPage=0;
let levelMenuReturn=null;

function openLevels(){
 if(pendingResult||state.status==='loading'||levelMenuReturn||!$('reference-panel').hidden)return;
 setBoardTools(false);
 const fromRound=state.status==='playing';
 levelMenuReturn={fromRound,modalVisible:!$('modal').hidden,focus:document.activeElement};
 if(fromRound){
  state.status='paused';
  saveRound();
 }
 $('modal').hidden=true;
 $('level-menu').hidden=false;
 for(const child of $('game').children)if(child!==$('level-menu'))child.inert=true;
 $('level-search').value='';
 levelPage=Math.floor(levelsByNumber.get(progress.current).index/levelsPerPage);
 renderLevelList();
 $('level-list').querySelector('[aria-current]')?.scrollIntoView({block:'center'});
 $('close-levels').focus({preventScroll:true});
}

function closeLevels(restore=true){
 if(!levelMenuReturn)return;
 const {fromRound,modalVisible,focus}=levelMenuReturn;
 levelMenuReturn=null;
 $('level-menu').hidden=true;
 for(const child of $('game').children)child.inert=false;
 if(!restore)return;
 $('modal').hidden=!modalVisible;
 if(fromRound){
  state.status='playing';
  lastTime=performance.now();
 }
 focus?.focus({preventScroll:true});
}

function renderLevelList(){
 const search=$('level-search').value.trim().replace(/[０-９]/g,char=>String(char.charCodeAt(0)-0xff10));
 const first=levelPage*levelsPerPage;
 const found=/^\d+$/.test(search)?levelsByNumber.get(Number(search))?.config:null;
 const visible=search?(found?[found]:[]):LEVELS.slice(first,first+levelsPerPage);
 const completed=new Set(progress.completed);
 const buttons=visible.map(({id})=>{
  const config=id===level&&(state.status==='paused'||savedRound)?state.config:campaignConfig(id);
  const {title,seconds,goals,detailed,referenceOnly,introSequence}=config;
  const appearances=referenceOnly?referenceVisuals(config,getLevelVariants):null;
  const current=id===progress.current;
  const time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  const button=document.createElement('button');
  const number=document.createElement('b');
  const content=document.createElement('span');
  const targets=document.createElement('small');
  const marker=document.createElement('i');
  button.type='button';
  button.dataset.level=id;
  if(current)button.setAttribute('aria-current','true');
  number.textContent=String(id).padStart(2,'0');
  const targetNames=goals.map(goal=>{
   const appearance=appearances?.get(goal.type);
   const type=appearance?.type??goal.type;
   const sourceLevel=appearance?.level??(introSequence?sequenceAssetLevel(type)??id:id);
   return localName(type,sourceLevel,config.variant)??solidItemDisplayName(ITEMS[type].sourceItemId)??names[type];
  });
  const named=targetNames.filter(name=>/[\u3400-\u9fff]/u.test(name));
  const goalSummary=named.length===targetNames.length?named.join('、'):`收集 ${goals.length} 类物件`;
  const heading=document.createElement('strong');
  heading.textContent=detailed||referenceOnly?goalSummary:title;
  const total=goals.reduce((sum,goal)=>sum+goal.count,0);
  targets.textContent=detailed||referenceOnly?`${time} · ${total} 件目标`:goalSummary;
  marker.textContent=current?'当前':completed.has(id)?'已过关':'›';
  if(marker.textContent==='›')marker.setAttribute('aria-hidden','true');
  content.append(heading,targets);
  button.append(number,content,marker);
  button.onclick=()=>{
   if(id===level&&(state.status==='paused'||savedRound)){
    closeLevels();
    return;
   }
   closeLevels(false);
   start(id);
  };
  return button;
 });
 const list=$('level-list');
 list.replaceChildren(...buttons);
 list.scrollTop=0;
 const lastPage=Math.ceil(LEVELS.length/levelsPerPage)-1;
 $('level-prev').disabled=levelPage===0;
 $('level-next').disabled=levelPage===lastPage;
 $('level-range').textContent=`第 ${levelPage+1} / ${lastPage+1} 页`;
 $('level-pages').hidden=Boolean(search);
 $('level-search-status').hidden=!search;
 $('level-search-status').textContent=found?'找到 1 关':'没有找到这个关号';
}

$('level-search').oninput=renderLevelList;
$('level-search').onkeydown=event=>{
 if(event.key==='Enter')$('level-list').querySelector('button')?.click();
};
$('levels').onclick=openLevels;
$('modal-levels').onclick=openLevels;
$('close-levels').onclick=()=>closeLevels();
$('level-prev').onclick=()=>{levelPage--;renderLevelList();};
$('level-next').onclick=()=>{levelPage++;renderLevelList();};
$('level-menu').addEventListener('keydown',event=>{
 if(event.key==='Escape')closeLevels();
});
function frame(now){if(now<recordUntil)renderDirty=true;if(benchmarkUntil&&now>=benchmarkUntil){benchmarkReport={level:state.level,frameSamples:frameTimes.length,frameMedianMs:percentile(frameTimes,.5),frameP95Ms:percentile(frameTimes,.95),renderSubmitP95Ms:percentile(renderTimes,.95),viewport:[innerWidth,innerHeight],active:[...groups.values()].filter(g=>g.userData.tripo).length};benchmarkUntil=0;}const dt=(now-lastTime)/1000;lastTime=now;if(dt>0&&dt<1){frameTimes.push(dt*1000);if(frameTimes.length>300)frameTimes.shift();}if(now<benchmarkUntil){renderDirty=true;scene.rotation.z=Math.sin(now*.002)*.025;}else if(scene.rotation.z!==0){scene.rotation.z=0;renderDirty=true;}const prev=state.status;tick(state,dt);advanceContacts(dt);if(prev==='playing'&&state.status==='timeout'){clearRound();showResult();}if(state.status==='playing'&&now-lastCheckpoint>=3000)saveRound();updateTimer();for(const g of groups.values()){if(!contactPile&&g.userData.target&&g.position.distanceToSquared(g.userData.target)>0.000001){g.position.lerp(g.userData.target,.14);renderDirty=true;}}if(renderDirty){const renderStart=performance.now();pileInstances.sync();syncChainButtons();renderer.render(scene,camera);renderTimes.push(performance.now()-renderStart);if(renderTimes.length>300)renderTimes.shift();drawTotal++;renderDirty=false;}requestAnimationFrame(frame);}
$('secondary').disabled=true;
await prepareRoundAssets();
localizedIcons.clear();
updateConfiguration();
lastTime=performance.now();
rebuild(false,savedRound?.boardOrder);
$('primary').disabled=false;
$('secondary').disabled=false;
$('modal-levels').disabled=false;
$('levels').disabled=false;
requestAnimationFrame(frame);
window.prototypeState=(options={})=>{
 const topDepth=Math.max(...[...groups.values()].map(group=>group.userData.depth??0));
 const board=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
 const selectable=pickableGroups();
 const lime=usesLimeReference();
 const probeTypes=options.types&&new Set(options.types);
 const items=[...groups.values()].map(group=>{
  const {id,type,depth=0}=group.userData;
  let sample=group.position.clone().project(camera),clickable=false;
  if(selectable.includes(group)&&(!probeTypes||probeTypes.has(type))&&(!options.topOnly||depth===topDepth)){
   const scale=lime?group.scale.x:usesMarketStyle(state.level)?Math.min(1,group.scale.x):1;
   const fineProbe=group.userData.hasPickAssist||state.level===37&&boardDefinition(type).sourceItemId===18;
   const offsets=fineProbe?[0,-.09,.09,-.2,.2,-.32,.32,-.44,.44]:[0,-.2,.2,-.4,.4];
   findVisiblePoint:for(const dx of offsets)for(const dy of offsets){
    const point=group.position.clone().add(new THREE.Vector3(dx*scale,dy*scale,0)).project(camera);
    ray.setFromCamera(new THREE.Vector2(point.x,point.y),camera);
    let hit=hitBoardGroup(ray,selectable);
    if(!hit&&state.config.layout?.chainStacks)hit=nearbyTouchTarget({clientX:board.left+(point.x+1)*board.width/2,clientY:board.top+(1-point.y)*board.height/2},board,selectable);
    if(hit!==group)continue;
    sample=point;
    clickable=true;
    break findVisiblePoint;
   }
  }
  return {id,type,assetRevision:group.userData.assetRevision,assetKind:group.userData.assetKind,featured:group.userData.featured??false,visualType:visualType(type),solid:group.children.length>0&&!group.userData.referenceModel,depth,clickable,x:board.left+(sample.x+1)*board.width/2,y:board.top+(1-sample.y)*board.height/2};
 });
 return {level:state.level,variant:state.config.variant,layoutStatus:state.config.layoutStatus,zoom:boardZoom,
  title:state.config.title,frozen:state.frozen,source:state.config.source,status:state.status,remaining:state.remaining,
  tray:state.tray.map(item=>({...item})),collected:[...state.collected],goals:state.goals,uses:{...state.uses},items};
};

window.tripoRuntime=()=>({...tripoAssetStatus(),household:householdAssetStatus(),level:state.level,status:state.status,benchmarkReport,drawTotal,frameSamples:frameTimes.length,frameMedianMs:percentile(frameTimes,.5),frameP95Ms:percentile(frameTimes,.95),renderSubmitP95Ms:percentile(renderTimes,.95),viewport:[innerWidth,innerHeight],drop:drop?{seconds:drop.elapsed,impacts:contactImpacts}:null,lastDrop,contactImpacts,contactMoving,active:[...groups.values()].filter(g=>g.userData.tripo).length,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,pixelRatio:renderer.getPixelRatio(),mobileProfile});

if(requested.has('qa')){const panel=document.createElement('pre');panel.id='render-stats';panel.style.cssText='position:fixed;bottom:0;left:0;z-index:99;background:#fff;padding:8px;font-size:11px;pointer-events:none';document.body.append(panel);setInterval(()=>panel.textContent=JSON.stringify(window.tripoRuntime()),1000);}

if(requested.has('qa')){const capture=document.createElement('button');capture.id='capture-scene';capture.textContent='检查盘面图';capture.style.cssText='position:fixed;top:0;right:0;z-index:100';const img=document.createElement('img');img.id='captured-scene';img.style.display='none';capture.onclick=()=>{pileInstances.sync();syncChainButtons();renderer.render(scene,camera);img.src=canvas.toDataURL('image/png');};document.body.append(capture,img);}

function percentile(values,p){if(!values.length)return null;return Math.round([...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*p)]*100)/100;}
if(requested.has('qa')){const stress=document.createElement('button');stress.id='stress-render';stress.textContent='连续渲染测试10秒';stress.style.cssText='position:fixed;top:28px;right:0;z-index:100';stress.onclick=()=>{frameTimes.length=0;renderTimes.length=0;benchmarkUntil=performance.now()+10000;};document.body.append(stress);}
if(requested.has('qa')&&canvas.captureStream&&window.MediaRecorder){
 const record=document.createElement('button');record.textContent='录制盘面6秒';record.style.cssText='position:fixed;top:66px;right:0;z-index:100';
 const video=document.createElement('a');video.id='recorded-scene';video.hidden=true;
 record.onclick=()=>{record.disabled=true;recordUntil=performance.now()+6000;const stream=canvas.captureStream(30),mimeType=['video/mp4','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));const recorder=new MediaRecorder(stream,mimeType?{mimeType}:{}),chunks=[];
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>{video.href=reader.result;video.textContent=recorder.mimeType;record.disabled=false;};reader.readAsDataURL(new Blob(chunks,{type:recorder.mimeType}));};recorder.start();setTimeout(()=>recorder.stop(),6000);
 };document.body.append(record,video);
}
