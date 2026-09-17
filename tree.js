import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let cachedTreeScene = null;
const loader = new GLTFLoader();

// Load the professional model file once
loader.load('tree.glb', (gltf) => {
    cachedTreeScene = gltf.scene;
}, undefined, (error) => {
    console.error('Error loading tree model:', error);
});

export function createTree(x, z, mature = false) {
    if (!cachedTreeScene) return; // Wait until model is loaded

    const group = cachedTreeScene.clone();

    group.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    group.position.set(x, 0, z);
    
    const baseScale = mature ? (0.85 + Math.random() * 0.35) : 0.3;
    group.scale.set(baseScale, baseScale, baseScale);
    group.rotation.y = Math.random() * Math.PI * 2;

    scene.add(group);

    trees.push({ 
        mesh: group, 
        isMature: mature, 
        growthProgress: mature ? 1.0 : 0.3,
        seed: Math.random() * 100 
    });
}
