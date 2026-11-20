import * as THREE from 'three';
import {RoundedBoxGeometry} from '../../node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

const molds = new Map();
const paints = new Map();
const tau = Math.PI * 2;
function finish(color, roughness, clearcoat = 0, details = {}) {
  return new THREE.MeshPhysicalMaterial({color, roughness, clearcoat, clearcoatRoughness: .19, ...details});
}

const redEnamel = finish('#cc5950', .27, .78);
const mint = finish('#439d80', .27, .73);
const bristle = finish('#efcca2', .73);
const mustard = finish('#e0ac45', .33, .41);
const leaf = finish('#639137', .47, .42);
const crumb = finish('#f5cc89', .74);
const butter = finish('#ffd16a', .42, .38);
const cheese = finish('#ffc45a', .46, .27);
const cream = finish('#ffefc8', .49, .26);
const yolk = finish('#ffac29', .31, .61);
const flesh = finish('#cadd74', .49, .35);
const stem = finish('#688541', .56);
const oak = finish('#c9905a', .48, .35);

function mesh(group, geometry, material, x = 0, y = 0, z = 0) {
  const child = new THREE.Mesh(geometry, material);
  child.position.set(x, y, z);
  group.add(child);
  return child;
}
function ball(group, mat, x, y, z, sx, sy, sz) {
  const item = mesh(group, new THREE.SphereGeometry(1, 40, 28), mat, x, y, z);
  item.scale.set(sx, sy, sz);
  return item;
}
function box(group, mat, x, y, z, w, h, d, radius) {
  return mesh(group, new RoundedBoxGeometry(w, h, d, 4, radius), mat, x, y, z);
}
function grain(colors, pattern, roughness, coat) {
  const key = colors.join(',') + pattern;
  if (paints.has(key)) return paints.get(key);
  const size = 512;
  const canvas = Object.assign(document.createElement('canvas'), {width: size, height: size});
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  colors.forEach((color, i) => gradient.addColorStop(i / (colors.length - 1), color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  let seed = 149 + pattern.length;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const count = pattern === 'wood' ? 160 : 3100;
  for (let i = 0; i < count; i++) {
    const x = random() * size, y = random() * size;
    const radius = .35 + random() * (pattern === 'toast' ? 3.2 : 1.55);
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = .11 + .27 * random();
    ctx.beginPath();
    ctx.ellipse(x, y, pattern === 'wood' ? 35 + random() * 150 : radius, radius * .65, 0, 0, tau);
    ctx.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = finish('#ffffff', roughness, coat, {map});
  material.name = pattern;
  paints.set(key, material);
  return material;
}

function brushedHandle() {
  const group = new THREE.Group();
  box(group, mint, 0, .041, .242, .20, .145, .53, .067);
  box(group, redEnamel, 0, .032, -.225, .49, .149, .43, .068);
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 8; column++) {
      const tuft = mesh(group, new THREE.CylinderGeometry(.020, .013, .10, 8), bristle,
        (column - 3.5) * .052, .144 - (row % 2) * .007, -.363 + row * .063);
      tuft.rotation.z = (column - 3.5) * .034;
    }
  }
  const ring = mesh(group, new THREE.TorusGeometry(.045, .015, 10, 24), mustard, 0, .042, .499);
  ring.rotation.x = Math.PI / 2;
  group.rotation.x = .32;
  return group;
}

function furniture(stool) {
  const g = new THREE.Group();
  const wood = grain(['#b97443', '#e7ae6d', '#f8cb89'], 'wood', .46, .40);
  const paint = stool ? mustard : mint;
  if (stool) ball(g, wood, 0, .178, .030, .336, .071, .297);
  else box(g, wood, 0, .18, .030, .67, .115, .58, .053);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const leg = box(g, oak, x * .245, -.03, z * .199 + .03, .083, .353, .090, .031);
      leg.rotation.set(-z * .12, 0, x * .16);
    }
    box(g, wood, x * .245, .004, .03, .055, .060, .43, .019);
    if (!stool) box(g, wood, x * .246, .386, -.215, .078, .39, .083, .036);
  }
  if (stool) ball(g, paint, 0, .227, .03, .314, .057, .273);
  else {
    box(g, paint, 0, .556, -.214, .65, .189, .091, .063);
    box(g, wood, 0, .393, -.214, .46, .058, .061, .026);
  }
  g.position.y = stool ? .03 : -.19;
  g.rotation.set(.39, -.32, -.14);
  return g;
}

function toastedBread(g, y, top = true) {
  const baked = grain(['#a95228', '#e5a352', '#f6c579'], 'toast', .70, .12);
  const crust = grain(['#853d22', '#b56e32', '#cb803e'], 'burnished crust', .63, .18);
  box(g, crust, 0, y, .042, .747, .124, .754, .062);
  ball(g, crust, -.166, y, -.262, .209, .078, .245);
  ball(g, crust, .166, y, -.262, .209, .078, .245);
  box(g, top ? baked : crumb, 0, y + .041, .038, .664, .076, .665, .037);
  ball(g, baked, -.155, y + .043, -.246, .177, .047, .208);
  ball(g, baked, .155, y + .043, -.246, .177, .047, .208);
}
function toast() {
  const g = new THREE.Group();
  toastedBread(g, -.017);
  const slice = box(g, butter, .084, .100, -.019, .248, .051, .222, .025);
  slice.rotation.y = .22;
  g.rotation.x = .14;
  return g;
}
function sandwich() {
  const g = new THREE.Group();
  toastedBread(g, -.165, false);
  for (let i = 0; i < 12; i++) {
    const angle = i * tau / 12;
    const ruffle = ball(g, leaf, Math.sin(angle) * .327, -.065, Math.cos(angle) * .374, .128, .032, .065);
    ruffle.rotation.set(Math.sin(i) * .29, angle, Math.cos(i) * .23);
  }
  for (const x of [-.195, .195]) ball(g, redEnamel, x, -.005, .098, .176, .045, .267);
  const filling = box(g, cheese, 0, .031, .018, .691, .054, .689, .024);
  filling.rotation.y = .13;
  toastedBread(g, .102);
  g.rotation.x = .47;
  return g;
}
function friedEgg() {
  const g = new THREE.Group();
  const edge = finish('#d99456', .65, .18);
  const radius = new THREE.Shape();
  const points = [];
  for (let i = 0; i < 16; i++) {
    const a = i * tau / 16;
    const r = .41 + .045 * Math.cos(a * 3 + .3) + .025 * Math.sin(a * 5);
    points.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  radius.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    radius.quadraticCurveTo(p.x, p.y, (p.x + q.x) * .5, (p.y + q.y) * .5);
  }
  radius.closePath();
  const cooked = new THREE.ExtrudeGeometry(radius, {steps: 1, depth: .034, bevelEnabled: true, bevelThickness: .022, bevelSize: .021, bevelSegments: 4, curveSegments: 7});
  const rim = mesh(g, cooked, edge, 0, -.024, 0);
  rim.rotation.x = -Math.PI / 2;
  const white = mesh(g, cooked.clone(), cream, 0, .011, 0);
  white.rotation.x = rim.rotation.x;
  white.scale.set(.97, .97, 1);
  ball(g, yolk, .054, .047, -.026, .209, .161, .204);
  return g;
}
function avocado() {
  const group = new THREE.Group();
  const skin = grain(['#213a2c', '#4b6740', '#687640'], 'avocado rind', .68, .27);
  const seed = grain(['#753f29', '#bf794f', '#e1a574'], 'avocado seed', .42, .52);
  function half(material, y, sx, sy, sz) {
    const item = ball(group, material, 0, y, .003, sx, sy, sz);
    const positions = item.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      positions.setX(i, positions.getX(i) * (1 + z * .31));
      positions.setY(i, Math.min(.18, positions.getY(i)));
    }
    item.geometry.computeVertexNormals();
  }
  half(skin, -.053, .339, .292, .490);
  half(leaf, .014, .312, .11, .457);
  half(flesh, .034, .281, .09, .416);
  ball(group, seed, 0, .045, .141, .198, .136, .199);
  return group;
}
function egg() {
  const group = new THREE.Group();
  const shell = grain(['#c98b63', '#edd2ae', '#faf0da'], 'eggshell speckles', .55, .16);
  const item = ball(group, shell, 0, .018, 0, .299, .301, .443);
  const positions = item.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const taper = 1 + positions.getZ(i) * .23;
    positions.setX(i, positions.getX(i) * taper);
    positions.setY(i, positions.getY(i) * taper);
  }
  item.geometry.computeVertexNormals();
  return group;
}
function tomato() {
  const g = new THREE.Group();
  const skin = grain(['#ae281f', '#e64d36', '#f98761'], 'tomato skin', .32, .60);
  const body = ball(g, skin, 0, 0, 0, .422, .308, .420);
  const positions = body.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const lobe = 1 + .06 * Math.cos(Math.atan2(z, x) * 6);
    positions.setXYZ(i, x * lobe, positions.getY(i) * (1 - .13 * Math.max(0, positions.getY(i)) ** 8), z * lobe);
  }
  body.geometry.computeVertexNormals();
  for (let i = 0; i < 6; i++) {
    const angle = i * tau / 6;
    const lobe = ball(g, leaf, Math.sin(angle) * .097, .267, Math.cos(angle) * .097, .034, .017, .136);
    lobe.rotation.set(.13, angle, 0);
  }
  const stalk = mesh(g, new THREE.CylinderGeometry(.030, .042, .115, 14), stem, 0, .31, 0);
  stalk.rotation.z = -.35;
  g.rotation.x = .20;
  return g;
}
function pepper() {
  const g = new THREE.Group();
  const skin = grain(['#2f613a', '#6c9e3e', '#9fa64a'], 'pepper skin', .29, .66);
  const body = ball(g, skin, 0, 0, 0, .345, .295, .462);
  const positions = body.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const rib = (1 + .15 * Math.cos(Math.atan2(y, x) * 4)) * (1 - z * .19);
    positions.setXYZ(i, x * rib, y * rib, z - .15 * z ** 5);
  }
  body.geometry.computeVertexNormals();
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.013, .025, -.342),
    new THREE.Vector3(.029, .083, -.455),
    new THREE.Vector3(.074, .134, -.491),
    new THREE.Vector3(.117, .158, -.482),
  ]);
  mesh(g, new THREE.TubeGeometry(path, 22, .044, 12), stem);
  g.rotation.x = .20;
  return g;
}

const pastryGold = finish('#c88740', .54, .26);
const jam = finish('#cb5265', .39, .46);
const icing = finish('#f38eaa', .36, .57);
const violetIcing = finish('#ba96cb', .34, .55);
const honey = finish('#e0a047', .35, .52);
const chocolate = finish('#925036', .50, .33);

function cupcake() {
  const g = new THREE.Group();
  const paper = finish('#41918c', .62, .22);
  const cup = new THREE.CylinderGeometry(.31, .225, .255, 128, 5);
  const positions = cup.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const ridges = 1 + .054 * Math.cos(Math.atan2(z, x) * 24);
    positions.setX(i, x * ridges);
    positions.setZ(i, z * ridges);
  }
  cup.computeVertexNormals();
  mesh(g, cup, paper, 0, -.169, 0);
  ball(g, pastryGold, 0, -.024, 0, .324, .105, .324);
  const swirl = [];
  for (let i = 0; i <= 78; i++) {
    const t = i / 78, angle = t * tau * 2.53;
    const radius = .237 * (1 - t) + .011;
    swirl.push(new THREE.Vector3(Math.sin(angle) * radius, .028 + t * .30, Math.cos(angle) * radius));
  }
  mesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(swirl), 90, .083, 14), icing);
  ball(g, jam, -.033, .392, .028, .069, .069, .067);
  g.rotation.set(.52, -.25, .08);
  return g;
}

function macaron() {
  const g = new THREE.Group();
  const shell = grain(['#9d7db7', '#c7a7d9', '#efcde8'], 'macaron speckles', .59, .20);
  ball(g, shell, 0, .083, 0, .408, .123, .371);
  ball(g, shell, 0, -.087, 0, .408, .121, .371);
  ball(g, cream, 0, 0, 0, .379, .058, .343);
  for (const y of [-.056, .057]) {
    for (let i = 0; i < 28; i++) {
      const angle = i * tau / 28;
      const size = .052 + .007 * Math.sin(i * 1.6);
      ball(g, violetIcing, .354 * Math.sin(angle), y, .322 * Math.cos(angle), size, .023, size);
    }
  }
  g.rotation.set(.54, .13, .12);
  return g;
}

function waffle() {
  const group = new THREE.Group();
  const crust = grain(['#a6612b', '#db9b47', '#f9c374'], 'waffle lattice', .63, .22);
  const inside = grain(['#b37530', '#ce924b', '#eeb76c'], 'waffle wells', .73, .08);
  box(group, inside, 0, -.052, 0, .773, .107, .773, .044);
  for (let i = 0; i < 5; i++) {
    const offset = (i - 2) * .178;
    box(group, crust, offset, .017, 0, .069, .082, .775, .033);
    box(group, crust, 0, .017, offset, .775, .082, .069, .033);
  }
  const pat = box(group, butter, .136, .066, -.092, .169, .038, .174, .018);
  pat.rotation.y = -.22;
  const trail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.034, .065, -.078), new THREE.Vector3(.018, .063, .009),
    new THREE.Vector3(-.022, .054, .061), new THREE.Vector3(-.078, .046, .081),
  ]);
  mesh(group, new THREE.TubeGeometry(trail, 20, .019, 10), honey);
  group.rotation.set(.25, .29, 0);
  return group;
}

function wedge(g, material, y, thickness, inset) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -.397 + inset);
  shape.lineTo(.335 - inset, .253);
  shape.quadraticCurveTo(0, .452 - inset * .3, -.335 + inset, .253);
  shape.lineTo(0, -.397 + inset);
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: thickness, bevelEnabled: true, bevelThickness: .013, bevelSize: .016, bevelSegments: 3, steps: 1, curveSegments: 14});
  const slice = mesh(g, geometry, material, 0, y, 0);
  slice.rotation.x = -Math.PI / 2;
}
function cake() {
  const g = new THREE.Group();
  const sponge = grain(['#dba56d', '#eac087', '#ffe4b2'], 'cake sponge', .68, .12);
  wedge(g, sponge, -.197, .094, 0);
  wedge(g, jam, -.101, .027, .011);
  wedge(g, cream, -.071, .044, .008);
  wedge(g, sponge, -.024, .092, 0);
  wedge(g, cream, .069, .069, 0);
  for (const x of [-.13, .01, .143]) {
    ball(g, jam, x, .178, -.175 + .16 * Math.abs(x), .065, .062, .069);
  }
  const curls = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.02,.156,.14), new THREE.Vector3(.043,.154,.101),
    new THREE.Vector3(-.015,.152,.072), new THREE.Vector3(.035,.152,.027),
  ]);
  mesh(g, new THREE.TubeGeometry(curls, 20, .015, 10), chocolate);
  g.rotation.set(.44, -.24, .10);
  return g;
}
function croissant() {
  const group = new THREE.Group();
  const layer = grain(['#a75828', '#d47e36', '#ffd28a'], 'laminated pastry', .52, .31);
  const exposed = grain(['#bd7135', '#e9a552', '#ffda94'], 'rolled pastry edges', .57, .22);
  function strip(start, end, lift, material) {
    const vertices = [], normal = [], uv = [], indices = [];
    const rows = 24, columns = 22;
    for (let r = 0; r <= rows; r++) {
      const t = r / rows, a = start + (end - start) * t;
      const radius = (.080 + .135 * Math.cos(a * .70) ** 2) * Math.max(.32, 1 - Math.abs(a / 1.68) ** 7) + lift;
      for (let c = 0; c <= columns; c++) {
        const b = c / columns * tau;
        const side = Math.cos(b), up = Math.sin(b);
        vertices.push((.384 + radius * side) * Math.sin(a), radius * .78 * up, (.329 + radius * side) * Math.cos(a) - .13);
        normal.push(side * Math.sin(a), up, side * Math.cos(a));
        uv.push(c / columns, t);
        if (r > 0 && c > 0) {
          const i = r * (columns + 1) + c, previous = i - columns - 1;
          indices.push(i - 1, previous, previous - 1, i - 1, i, previous);
        }
      }
    }
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    shape.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
    shape.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    shape.setIndex(indices);
    mesh(group, shape, material);
  }
  strip(-1.68, 1.68, 0, layer);
  for (const start of [-1.27, -.81, -.37, .25, .68, 1.16]) strip(start, start + .09, .011, exposed);
  for (const x of [-1, 1]) ball(group, layer, x * .382, 0, -.165, .053, .051, .049);
  group.rotation.set(.27, -.26, .09);
  return group;
}

const desserts = {cupcake, macaron, waffle, cake, croissant};

const builders = {
  ...desserts,
  brush: brushedHandle, chair: () => furniture(false), stool: () => furniture(true),
  sandwich, friedegg: friedEgg, toast, avocado, tomato, egg, pepper,
};
export function kitchenRebuildKind(key) {
  return Object.hasOwn(builders, key) ? key : null;
}
export function makeKitchenRebuild(key) {
  if (!molds.has(key)) {
    const sculpt = builders[key]();
    sculpt.updateMatrixWorld(true);
    const batches = new Map();
    sculpt.traverse(piece => {
      if (!piece.isMesh) return;
      const geometry = piece.geometry.index ? piece.geometry.toNonIndexed() : piece.geometry.clone();
      geometry.applyMatrix4(piece.matrixWorld);
      if (!batches.has(piece.material)) batches.set(piece.material, []);
      batches.get(piece.material).push(geometry);
      piece.geometry.dispose();
    });
    const model = new THREE.Group();
    for (const [material, parts] of batches) {
      const child = mesh(model, mergeGeometries(parts), material);
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.sharedGeometry = true;
      parts.forEach(part => part.dispose());
    }
    model.userData = {solid: true, assetKind: key, assetRevision: Object.hasOwn(desserts, key) ? 'dessert-props-1' : 'kitchen-props-1'};
    molds.set(key, model);
  }
  return molds.get(key).clone(true);
}
