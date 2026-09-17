// tree.js

function createTree(x, z, mature = false) {
    const group = new THREE.Group();
    
    // 1. Root Flare (wider at the bottom for a grounded look)
    const flareGeo = new THREE.CylinderGeometry(0.2, 0.38, 0.25, 8);
    const flare = new THREE.Mesh(flareGeo, trunkMat);
    flare.position.y = 0.12;
    flare.castShadow = true;
    flare.receiveShadow = true;
    group.add(flare);

    // 2. Main Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.18, 0.9, 8);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // 3. Layered Pine Canopy (Stacked cones with custom sizing and color shifts)
    const levels = 4;
    for (let i = 0; i < levels; i++) {
        const radiusBottom = 0.65 - (i * 0.12);
        const radiusTop = radiusBottom * 0.35;
        const heightGeo = 0.65;
        
        const foliageGeo = new THREE.ConeGeometry(radiusBottom, heightGeo, 7);
        
        // Subtle color variation per tier for lighting depth
        const layerMat = leavesMat.clone();
        if (layerMat.color) {
            const hsl = {};
            layerMat.color.getHSL(hsl);
            layerMat.color.setHSL(
                hsl.h + (Math.random() - 0.5) * 0.02, 
                hsl.s, 
                Math.max(0.1, hsl.l + (i * 0.04)) // Lighter toward the top
            );
        }

        const leaves = new THREE.Mesh(foliageGeo, layerMat);
        // Vertical stacking with natural overlap
        leaves.position.y = 0.75 + (i * 0.38);
        
        // Random organic rotation offset
        leaves.rotation.y = Math.random() * Math.PI * 2;
        
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        group.add(leaves);
    }

    group.position.set(x, 0, z);
    
    // Size variance for natural look
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
