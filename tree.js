// tree.js

function createTree(x, z, mature = false) {
    const group = new THREE.Group();
    
    // 1. Sleek, realistic trunk
    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.18, 1.0, 8);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // 2. Layered pine canopy using truncated cones (looks like a real stylized pine, not ice cream)
    const levels = 3;
    for (let i = 0; i < levels; i++) {
        // ConeGeometry(radiusTop, radiusBottom, height, radialSegments)
        const radiusBottom = 0.6 - (i * 0.15);
        const radiusTop = radiusBottom * 0.4;
        const heightGeo = 0.7;
        
        const foliageGeo = new THREE.ConeGeometry(radiusBottom, heightGeo, 7);
        
        const layerMat = leavesMat.clone();
        if (layerMat.color) {
            const hsl = {};
            layerMat.color.getHSL(hsl);
            // Gradient: darker green at bottom, brighter green at top
            layerMat.color.setHSL(hsl.h, hsl.s, hsl.l + (i * 0.05));
        }

        const leaves = new THREE.Mesh(foliageGeo, layerMat);
        // Overlap them nicely so it forms a solid pine shape
        leaves.position.y = 0.8 + (i * 0.45);
        
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        group.add(leaves);
    }

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
