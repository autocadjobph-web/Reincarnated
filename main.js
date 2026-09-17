

// NOTE: three.min.js (classic global build) is loaded first via a <script> tag
// in index.html, so the global `THREE` object is already available here.
// This file is a plain classic script now (no "import" statements), which is
// what lets it load correctly when index.html is opened directly as a local
// file — ES module scripts are blocked by the browser in that situation.

// ---------------------------------------------------------------------------
// Minimal drop-in replacement for three.js's OrbitControls (which is only
// distributed as an ES module for this three.js version, so it can't be
// loaded as a classic script). Supports exactly what this game uses:
// enableDamping, dampingFactor, maxPolarAngle, minDistance, maxDistance,
// drag-to-rotate, scroll/pinch-to-zoom, and controls.update() each frame.
// ---------------------------------------------------------------------------
class OrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = new THREE.Vector3(0, 0, 0);

        this.enableDamping = false;
        this.dampingFactor = 0.05;
        this.maxPolarAngle = Math.PI;
        this.minDistance = 0;
        this.maxDistance = Infinity;
        this.rotateSpeed = 1.0;
        this.zoomSpeed = 1.0;

        this._sphericalDelta = { theta: 0, phi: 0 };
        this._scale = 1;
        this._dragging = false;
        this._pointerId = null;
        this._lastX = 0;
        this._lastY = 0;
        this._pinchDist = null;

        domElement.style.touchAction = 'none';

        domElement.addEventListener('pointerdown', (e) => {
            this._dragging = true;
            this._pointerId = e.pointerId;
            this._lastX = e.clientX;
            this._lastY = e.clientY;
        });

        window.addEventListener('pointermove', (e) => {
            if (!this._dragging || e.pointerId !== this._pointerId) return;
            const dx = e.clientX - this._lastX;
            const dy = e.clientY - this._lastY;
            this._lastX = e.clientX;
            this._lastY = e.clientY;

            const el = this.domElement;
            this._sphericalDelta.theta -= (2 * Math.PI * dx / el.clientHeight) * this.rotateSpeed;
            this._sphericalDelta.phi -= (2 * Math.PI * dy / el.clientHeight) * this.rotateSpeed;
        });

        window.addEventListener('pointerup', (e) => {
            if (e.pointerId === this._pointerId) {
                this._dragging = false;
                this._pointerId = null;
            }
        });

        domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            // Scale the zoom step by how much the wheel actually moved, not
            // just its direction — otherwise a trackpad's stream of many
            // small events compounds into a huge zoom for one swipe.
            // ~100 is a typical single "notch" on a mouse wheel; clamp so
            // an unusually large single event can't cause a big jump either.
            const clampedDelta = Math.max(-100, Math.min(100, e.deltaY));
            const zoomScale = Math.pow(0.95, this.zoomSpeed * (clampedDelta / 100));
            this._scale *= zoomScale;
        }, { passive: false });

        // Basic two-finger pinch-to-zoom support for mobile.
        domElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);

                if (this._pinchDist !== null && this._pinchDist > 0) {
                    // Scale continuously by the actual finger-distance ratio
                    // (instead of a fixed step per touchmove event), so fast
                    // vs. slow pinches feel proportional rather than the
                    // per-event rate compounding on faster devices.
                    const ratio = this._pinchDist / dist;
                    const eased = Math.pow(ratio, this.zoomSpeed);
                    this._scale *= eased;
                }
                this._pinchDist = dist;
            }
        }, { passive: false });

        domElement.addEventListener('touchend', () => {
            this._pinchDist = null;
        });
    }

    update() {
        const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);

        spherical.theta += this._sphericalDelta.theta;
        spherical.phi += this._sphericalDelta.phi;
        spherical.phi = Math.max(0.001, Math.min(this.maxPolarAngle - 0.001, spherical.phi));

        spherical.radius *= this._scale;
        spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, spherical.radius));

        offset.setFromSpherical(spherical);
        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);

        if (this.enableDamping && !this._dragging) {
            // Only let residual rotation glide/decay after the pointer is
            // released. While actively dragging, each frame's delta is this
            // frame's real input and must be consumed (zeroed) immediately —
            // otherwise it keeps re-applying itself on every subsequent
            // frame, compounding a single drag into ~20x its real distance.
            this._sphericalDelta.theta *= (1 - this.dampingFactor);
            this._sphericalDelta.phi *= (1 - this.dampingFactor);
        } else {
            this._sphericalDelta.theta = 0;
            this._sphericalDelta.phi = 0;
        }

        this._scale = 1;
    }
}

// Web Audio API Sound Effects Synthesizer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    if (type === 'chop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'mine') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'build') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'monster') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

// Resources State
let wood = 0;
let stone = 0;
let tentCount = 0;
let houseCount = 0;
let keepCount = 0;
let workerCount = 2;
let timeOfDay = 0; // 0 to 1 cycle

function updateHUD() {
    document.getElementById('wood-count').innerText = wood;
    document.getElementById('stone-count').innerText = stone;
    document.getElementById('tent-count').innerText = tentCount;
    document.getElementById('house-count').innerText = houseCount;
    document.getElementById('keep-count').innerText = keepCount;
    document.getElementById('worker-count').innerText = workerCount;

    const tentBtn = document.getElementById('btn-tent');
    const fenceBtn = document.getElementById('btn-fence');
    const wallBtn = document.getElementById('btn-wall');
    const pathBtn = document.getElementById('btn-path');
    const workerBtn = document.getElementById('btn-worker');
    
    tentBtn.style.display = (wood >= 3) ? 'block' : 'none';
    fenceBtn.style.display = (houseCount > 0 && wood >= 2) ? 'block' : 'none';
    wallBtn.style.display = (stone >= 2) ? 'block' : 'none';
    pathBtn.style.display = (stone >= 1) ? 'block' : 'none';
    workerBtn.style.display = (wood >= 5) ? 'block' : 'none';
}

// 1. Scene, Camera, and Renderer Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2332);
scene.fog = new THREE.FogExp2(0x1a2332, 0.035);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 14, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 2. Camera Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.minDistance = 5;
controls.maxDistance = 40;
controls.rotateSpeed = 0.25; 
controls.zoomSpeed = 0.7;   

// 3. Lighting & Night Window Glows
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
sunLight.position.set(15, 25, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 50;
const d = 15;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
scene.add(sunLight);

// 4. Ground Terrain
const groundGeo = new THREE.PlaneGeometry(30, 30, 32, 32);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e5a36, roughness: 0.8, metalness: 0.1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// River
const riverPoints = [];
for (let z = -15; z <= 15; z += 1) {
    const x = Math.sin(z * 0.2) * 3;
    riverPoints.push(new THREE.Vector3(x, 0.02, z));
}
const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
const riverGeo = new THREE.TubeGeometry(riverCurve, 64, 1.2, 8, false);
const riverMat = new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });
const river = new THREE.Mesh(riverGeo, riverMat);
scene.add(river);

const grid = new THREE.GridHelper(30, 30, 0x446644, 0x334433);
grid.position.y = 0.01;
scene.add(grid);

// Materials
const canvasMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.6 });
const buildingMat = new THREE.MeshStandardMaterial({ color: 0xd9c5b2, roughness: 0.7 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0xa63a2b, roughness: 0.5 });
const keepMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.5, metalness: 0.3 });
const keepRoofMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.4 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.6 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.9, metalness: 0.1 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.8 });
const pathMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.9 });
const workerMat = new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.5 });
const monsterMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.6 });
const monsterHornMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
const windowGlowMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });

const trees = [];
const rocks = [];
const tents = [];
const houses = [];
const keeps = [];
const fences = [];
const walls = [];
const paths = [];
const workers = [];
const monsters = [];

function hideAllMenus() {
    document.getElementById('build-menu').style.display = 'none';
    document.getElementById('tent-menu').style.display = 'none';
    document.getElementById('house-menu').style.display = 'none';
}

function createTent(x, z) {
    const group = new THREE.Group();
    const tentGeo = new THREE.ConeGeometry(0.9, 0.9, 4);
    const tentMesh = new THREE.Mesh(tentGeo, canvasMat);
    tentMesh.position.y = 0.45;
    tentMesh.castShadow = true;
    group.add(tentMesh);

    group.position.set(x, 0, z);
    scene.add(group);

    const tentData = { mesh: group, hp: 50, maxHp: 50 };
    tents.push(tentData);
    group.userData = { type: 'tent', reference: tentData };
    tentCount++;
    playSound('build');
    updateHUD();
}

function createHouse(x, z) {
    const group = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(1.2, 1, 1.2);
    const base = new THREE.Mesh(baseGeo, buildingMat);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const roofGeo = new THREE.ConeGeometry(1.0, 0.8, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.4;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const winGeo = new THREE.BoxGeometry(0.3, 0.3, 0.05);
    const win = new THREE.Mesh(winGeo, windowGlowMat);
    win.position.set(0, 0.5, 0.61);
    win.name = 'windowGlow';
    win.visible = false;
    group.add(win);

    group.position.set(x, 0, z);
    scene.add(group);

    const houseData = { mesh: group, hp: 100, maxHp: 100 };
    houses.push(houseData);
    group.userData = { type: 'house', reference: houseData };
    houseCount++;
    playSound('build');
    updateHUD();
}

function createKeep(houseData) {
    const pos = houseData.mesh.position;
    scene.remove(houseData.mesh);
    const index = houses.indexOf(houseData);
    if (index !== -1) houses.splice(index, 1);
    houseCount--;

    const group = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(1.6, 1.4, 1.6);
    const base = new THREE.Mesh(baseGeo, keepMat);
    base.position.y = 0.7;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const roofGeo = new THREE.ConeGeometry(1.3, 1.0, 4);
    const roof = new THREE.Mesh(roofGeo, keepRoofMat);
    roof.position.y = 1.9;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const winGeo = new THREE.BoxGeometry(0.4, 0.4, 0.05);
    const win = new THREE.Mesh(winGeo, windowGlowMat);
    win.position.set(0, 0.7, 0.81);
    win.name = 'windowGlow';
    win.visible = false;
    group.add(win);

    group.position.set(pos.x, 0, pos.z);
    scene.add(group);

    const keepData = { mesh: group, hp: 250, maxHp: 250 };
    keeps.push(keepData);
    keepCount++;
    playSound('build');
    updateHUD();
}

function upgradeTentToHouse(tentData) {
    const pos = tentData.mesh.position;
    scene.remove(tentData.mesh);
    const index = tents.indexOf(tentData);
    if (index !== -1) tents.splice(index, 1);
    tentCount--;
    createHouse(pos.x, pos.z);
}

function createFence(x, z) {
    const group = new THREE.Group();
    const postGeo = new THREE.BoxGeometry(0.2, 0.5, 0.8);
    const post = new THREE.Mesh(postGeo, trunkMat);
    post.position.y = 0.25;
    post.castShadow = true;
    group.add(post);
    group.position.set(x, 0, z);
    scene.add(group);
    fences.push({ mesh: group, hp: 40 });
    playSound('build');
}

function createWall(x, z) {
    const group = new THREE.Group();
    const wallGeo = new THREE.BoxGeometry(1.0, 0.8, 0.3);
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.y = 0.4;
    wallMesh.castShadow = true;
    group.add(wallMesh);
    group.position.set(x, 0, z);
    scene.add(group);
    walls.push({ mesh: group, hp: 120 });
    playSound('build');
}

function createPath(x, z) {
    const pathGeo = new THREE.PlaneGeometry(1.0, 1.0);
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(x, 0.015, z);
    scene.add(pathMesh);
    paths.push(pathMesh);
    playSound('build');
}

function createRock(x, z) {
    const group = new THREE.Group();
    const rockGeo = new THREE.DodecahedronGeometry(0.5, 1);
    const rockMesh = new THREE.Mesh(rockGeo, rockMat);
    rockMesh.position.y = 0.3;
    rockMesh.castShadow = true;
    group.add(rockMesh);
    group.position.set(x, 0, z);
    scene.add(group);
    rocks.push({ mesh: group });
}

function spawnWorker(x, z) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.35, 4, 8);
    const body = new THREE.Mesh(bodyGeo, workerMat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);
    group.position.set(x, 0, z);
    scene.add(group);

    workers.push({
        mesh: group,
        state: 'wandering',
        targetRes: null,
        carrying: null,
        targetPos: new THREE.Vector3((Math.random() - 0.5) * 15, 0, (Math.random() - 0.5) * 15),
        speed: 2.2
    });
    workerCount++;
    playSound('build');
    updateHUD();
}

function spawnMonster(x, z) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.CapsuleGeometry(0.25, 0.4, 4, 8);
    const body = new THREE.Mesh(bodyGeo, monsterMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    const hornGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
    const horn1 = new THREE.Mesh(hornGeo, monsterHornMat);
    horn1.position.set(0.12, 0.8, 0);
    horn1.rotation.z = -0.2;
    group.add(horn1);
    const horn2 = horn1.clone();
    horn2.position.x = -0.12;
    horn2.rotation.z = 0.2;
    group.add(horn2);

    group.position.set(x, 0, z);
    scene.add(group);

    monsters.push({
        mesh: group,
        speed: 1.8,
        attackCooldown: 0
    });
}

// Initial Forest & Rocks
const initialTrees = [
    {x: -6, z: -4}, {x: -4, z: -6}, {x: 6, z: 4}, {x: 7, z: -3},
    {x: -5, z: 5}, {x: 4, z: 6}, {x: -7, z: 2}, {x: 5, z: -5}
];
initialTrees.forEach(t => createTree(t.x, t.z, true));

const initialRocks = [
    {x: -1.5, z: -5}, {x: 1.8, z: -2}, {x: -1.8, z: 3}, {x: 1.5, z: 6}
];
initialRocks.forEach(r => createRock(r.x, r.z));

spawnWorker(0, 1);
spawnWorker(1, 0);
spawnMonster(-8, -8);
spawnMonster(8, 8);

updateHUD();

// Interaction Handling
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetBuildPosition = null;
let selectedTentData = null;
let selectedHouseData = null;
let pointerDownX = 0;
let pointerDownY = 0;

renderer.domElement.addEventListener('pointerdown', (event) => {
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
});

renderer.domElement.addEventListener('pointerup', (event) => {
    const moveDist = Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY);
    if (moveDist > 4) {
        hideAllMenus();
        return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Harvest Tree
    const treeMeshes = trees.map(t => t.mesh);
    const treeIntersects = raycaster.intersectObjects(treeMeshes, true);
    if (treeIntersects.length > 0) {
        hideAllMenus();
        let clickedGroup = treeIntersects[0].object;
        while (clickedGroup.parent && clickedGroup.parent !== scene) clickedGroup = clickedGroup.parent;
        const foundIndex = trees.findIndex(t => t.mesh === clickedGroup);
        if (foundIndex !== -1 && trees[foundIndex].isMature) {
            scene.remove(trees[foundIndex].mesh);
            trees.splice(foundIndex, 1);
            wood += 2;
            playSound('chop');
            updateHUD();
        }
        return;
    }

    // Mine Rock
    const rockMeshes = rocks.map(r => r.mesh);
    const rockIntersects = raycaster.intersectObjects(rockMeshes, true);
    if (rockIntersects.length > 0) {
        hideAllMenus();
        let clickedGroup = rockIntersects[0].object;
        while (clickedGroup.parent && clickedGroup.parent !== scene) clickedGroup = clickedGroup.parent;
        const foundIndex = rocks.findIndex(r => r.mesh === clickedGroup);
        if (foundIndex !== -1) {
            scene.remove(rocks[foundIndex].mesh);
            rocks.splice(foundIndex, 1);
            stone += 3;
            playSound('mine');
            updateHUD();
        }
        return;
    }

    // Tent selection
    const tentMeshes = tents.map(t => t.mesh);
    const tentIntersects = raycaster.intersectObjects(tentMeshes, true);
    if (tentIntersects.length > 0) {
        hideAllMenus();
        let clickedGroup = tentIntersects[0].object;
        while (clickedGroup.parent && clickedGroup.parent !== scene) clickedGroup = clickedGroup.parent;
        const foundTent = tents.find(t => t.mesh === clickedGroup);
        if (foundTent) {
            selectedTentData = foundTent;
            const menu = document.getElementById('tent-menu');
            menu.style.left = `${event.clientX}px`;
            menu.style.top = `${event.clientY}px`;
            menu.style.display = 'block';
        }
        return;
    }

    // House selection
    const houseMeshes = houses.map(h => h.mesh);
    const houseIntersects = raycaster.intersectObjects(houseMeshes, true);
    if (houseIntersects.length > 0) {
        hideAllMenus();
        let clickedGroup = houseIntersects[0].object;
        while (clickedGroup.parent && clickedGroup.parent !== scene) clickedGroup = clickedGroup.parent;
        const foundHouse = houses.find(h => h.mesh === clickedGroup);
        if (foundHouse) {
            selectedHouseData = foundHouse;
            const menu = document.getElementById('house-menu');
            menu.style.left = `${event.clientX}px`;
            menu.style.top = `${event.clientY}px`;
            menu.style.display = 'block';
        }
        return;
    }

    // Ground Build Menu
    const intersects = raycaster.intersectObject(ground);
    if (intersects.length > 0) {
        hideAllMenus();
        targetBuildPosition = intersects[0].point;
        const buildMenu = document.getElementById('build-menu');
        buildMenu.style.left = `${event.clientX}px`;
        buildMenu.style.top = `${event.clientY}px`;
        buildMenu.style.display = 'block';
    } else {
        hideAllMenus();
    }
});

window.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.game-menu') && event.target !== renderer.domElement) {
        hideAllMenus();
    }
});

// Menu Buttons
document.getElementById('btn-tent').addEventListener('click', () => {
    if (targetBuildPosition && wood >= 3) {
        wood -= 3;
        createTent(targetBuildPosition.x, targetBuildPosition.z);
        updateHUD();
    }
    hideAllMenus();
});

document.getElementById('btn-fence').addEventListener('click', () => {
    if (targetBuildPosition && wood >= 2) {
        wood -= 2;
        createFence(targetBuildPosition.x, targetBuildPosition.z);
        updateHUD();
    }
    hideAllMenus();
});

document.getElementById('btn-wall').addEventListener('click', () => {
    if (targetBuildPosition && stone >= 2) {
        stone -= 2;
        createWall(targetBuildPosition.x, targetBuildPosition.z);
        updateHUD();
    }
    hideAllMenus();
});

document.getElementById('btn-path').addEventListener('click', () => {
    if (targetBuildPosition && stone >= 1) {
        stone -= 1;
        createPath(targetBuildPosition.x, targetBuildPosition.z);
        updateHUD();
    }
    hideAllMenus();
});

document.getElementById('btn-worker').addEventListener('click', () => {
    if (wood >= 5) {
        wood -= 5;
        spawnWorker(0, 0);
        updateHUD();
    }
    hideAllMenus();
});

document.getElementById('btn-tree').addEventListener('click', () => {
    if (targetBuildPosition) {
        createTree(targetBuildPosition.x, targetBuildPosition.z, false);
        playSound('build');
    }
    hideAllMenus();
});

document.getElementById('btn-upgrade-house').addEventListener('click', () => {
    if (selectedTentData && wood >= 5) {
        wood -= 5;
        upgradeTentToHouse(selectedTentData);
        updateHUD();
    }
    hideAllMenus();
});

document.getElementById('btn-upgrade-keep').addEventListener('click', () => {
    if (selectedHouseData && stone >= 10) {
        stone -= 10;
        createKeep(selectedHouseData);
        updateHUD();
    } else if (stone < 10) {
        alert('Not enough stone to build a keep! (Need 10 stone)');
    }
    hideAllMenus();
});

// 6. Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Day / Night Cycle
    timeOfDay = (timeOfDay + delta * 0.015) % 1.0;
    const sunAngle = timeOfDay * Math.PI * 2;
    sunLight.position.x = Math.cos(sunAngle) * 20;
    sunLight.position.y = Math.sin(sunAngle) * 25;

    let timeLabel = "Day";
    let isNight = false;

    if (timeOfDay > 0.25 && timeOfDay < 0.35) {
        timeLabel = "Sunset";
        scene.background.set(0x4a2e2b);
        scene.fog.color.set(0x4a2e2b);
        sunLight.intensity = 0.4;
    } else if (timeOfDay >= 0.35 && timeOfDay <= 0.75) {
        timeLabel = "Night";
        scene.background.set(0x06080f);
        scene.fog.color.set(0x06080f);
        sunLight.intensity = 0.1;
        isNight = true;
    } else if (timeOfDay > 0.75 && timeOfDay < 0.85) {
        timeLabel = "Sunrise";
        scene.background.set(0x36233b);
        scene.fog.color.set(0x36233b);
        sunLight.intensity = 0.5;
    } else {
        timeLabel = "Day";
        scene.background.set(0x1a2332);
        scene.fog.color.set(0x1a2332);
        sunLight.intensity = 1.2;
    }
    document.getElementById('time-label').innerText = timeLabel;

    scene.traverse(obj => {
        if (obj.name === 'windowGlow') {
            obj.visible = isNight;
        }
    });

    // Workers AI
    workers.forEach(w => {
        if (w.state === 'wandering') {
            const dist = w.mesh.position.distanceTo(w.targetPos);
            if (dist < 0.5) {
                const matureTrees = trees.filter(t => t.isMature);
                if (matureTrees.length > 0 && Math.random() > 0.4) {
                    w.targetRes = matureTrees[Math.floor(Math.random() * matureTrees.length)];
                    w.state = 'gathering';
                } else if (rocks.length > 0) {
                    w.targetRes = rocks[Math.floor(Math.random() * rocks.length)];
                    w.state = 'gathering';
                } else {
                    w.targetPos.set((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20);
                }
            } else {
                const dir = new THREE.Vector3().subVectors(w.targetPos, w.mesh.position).normalize();
                w.mesh.position.addScaledVector(dir, w.speed * delta);
                w.mesh.lookAt(w.targetPos.x, w.mesh.position.y, w.targetPos.z);
            }
        } else if (w.state === 'gathering') {
            if (!w.targetRes || !w.targetRes.mesh.parent) {
                w.state = 'wandering';
                return;
            }
            const resPos = w.targetRes.mesh.position;
            const dist = w.mesh.position.distanceTo(resPos);
            if (dist < 1.0) {
                if (trees.includes(w.targetRes)) {
                    const idx = trees.indexOf(w.targetRes);
                    if (idx !== -1) {
                        scene.remove(trees[idx].mesh);
                        trees.splice(idx, 1);
                        wood += 2;
                        playSound('chop');
                    }
                } else if (rocks.includes(w.targetRes)) {
                    const idx = rocks.indexOf(w.targetRes);
                    if (idx !== -1) {
                        scene.remove(rocks[idx].mesh);
                        rocks.splice(idx, 1);
                        stone += 3;
                        playSound('mine');
                    }
                }
                updateHUD();
                w.state = 'wandering';
                w.targetPos.set(0, 0, 0);
            } else {
                const dir = new THREE.Vector3().subVectors(resPos, w.mesh.position).normalize();
                w.mesh.position.addScaledVector(dir, w.speed * delta);
                w.mesh.lookAt(resPos.x, w.mesh.position.y, resPos.z);
            }
        }
    });

    // Monster AI
    monsters.forEach(m => {
        if (isNight) {
            let allTargets = [];
            tents.forEach(t => allTargets.push({ pos: t.mesh.position, type: 'tent', ref: t }));
            houses.forEach(h => allTargets.push({ pos: h.mesh.position, type: 'house', ref: h }));
            keeps.forEach(k => allTargets.push({ pos: k.position, type: 'keep', ref: { mesh: k, hp: 250 } }));

            let targetPos = new THREE.Vector3(0, 0, 0);
            if (allTargets.length > 0) {
                allTargets.sort((a, b) => m.mesh.position.distanceTo(a.pos) - m.mesh.position.distanceTo(b.pos));
                targetPos = allTargets[0].pos;
            }

            const dist = m.mesh.position.distanceTo(targetPos);
            if (dist > 1.2) {
                const dir = new THREE.Vector3().subVectors(targetPos, m.mesh.position).normalize();
                m.mesh.position.addScaledVector(dir, m.speed * delta);
                m.mesh.lookAt(targetPos.x, m.mesh.position.y, targetPos.z);
            } else {
                m.attackCooldown += delta;
                if (m.attackCooldown > 1.5) {
                    m.attackCooldown = 0;
                    playSound('monster');
                    if (allTargets.length > 0) {
                        const target = allTargets[0];
                        target.ref.hp -= 15;
                        if (target.ref.hp <= 0) {
                            scene.remove(target.ref.mesh);
                            if (target.type === 'tent') {
                                tents.splice(tents.indexOf(target.ref), 1);
                                tentCount--;
                            } else if (target.type === 'house') {
                                houses.splice(houses.indexOf(target.ref), 1);
                                houseCount--;
                            }
                            updateHUD();
                        }
                    }
                }
            }
        } else {
            const spawnCenter = new THREE.Vector3(0, 0, 0);
            if (m.mesh.position.distanceTo(spawnCenter) > 15) {
                const dir = new THREE.Vector3().subVectors(spawnCenter, m.mesh.position).normalize();
                m.mesh.position.addScaledVector(dir, m.speed * delta);
                m.mesh.lookAt(spawnCenter.x, m.mesh.position.y, spawnCenter.z);
            }
        }
    });

    // Tree growth
    trees.forEach(tree => {
        if (!tree.isMature) {
            tree.growthProgress += delta * 0.02; 
            if (tree.growthProgress >= 1.0) {
                tree.growthProgress = 1.0;
                tree.isMature = true;
            }
            tree.mesh.scale.set(tree.growthProgress, tree.growthProgress, tree.growthProgress);
        }
    });

    controls.update();
    renderer.render(scene, camera);
}

animate();

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});