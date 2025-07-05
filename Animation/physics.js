

function UpdatePhysics(deltaTime) {
    if (meshInstances.length === 0) return;
    GravityUpdate(deltaTime);
    handleInterObjectCollisions();
    handleMouseInteraction(deltaTime); 
    handleBoxCollisions();
}


function GravityUpdate(deltaTime){
     for (const inst of meshInstances) {
        inst.vy += GRAVITY * deltaTime;
        inst.x += inst.vx * deltaTime;
        inst.y += inst.vy * deltaTime;
        inst.z += inst.vz * deltaTime;
    }
}


function handleMouseInteraction(deltaTime) {
    if (!mouseState.hasMoved) return;


    for (const inst of meshInstances) {
        const dx = inst.x - mouseState.worldX;
        const dy = inst.y - (-0.5);
        const dz = inst.z - mouseState.worldZ;
        const distSq = dx * dx + dy * dy + dz * dz;
        const totalRadius = MOUSE_INTERACTION_RADIUS + SPHERE_RADIOUS;
        const dist = Math.sqrt(distSq);

        if (dist < totalRadius) {
            
            inst.vx += mouseState.velX * MOUSE_FORCE_MULTIPLIER;
            
            inst.vz += mouseState.velZ * MOUSE_FORCE_MULTIPLIER; 

            const dist = Math.sqrt(distSq);
            if (dist > 0.01) {
                inst.vx += (dx / dist) * PUSHSTRENGHT;
                inst.vz += (dz / dist) * PUSHSTRENGHT;
            }
        }
    }
}


function handleInterObjectCollisions() {
    const instanceRadius = SPHERE_RADIOUS;
    const diameterSq = (2 * instanceRadius) * (2 * instanceRadius); 

    for (let i = 0; i < meshInstances.length; i++) {
        for (let j = i + 1; j < meshInstances.length; j++) {
            const inst1 = meshInstances[i];
            const inst2 = meshInstances[j];

            const dx = inst2.x - inst1.x;
            const dy = inst2.y - inst1.y;
            const dz = inst2.z - inst1.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq < diameterSq && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const overlap = (2 * instanceRadius) - dist;

                const nx = dx / dist;
                const ny = dy / dist;
                const nz = dz / dist;

                inst1.x -= overlap * 0.5 * nx;
                inst1.y -= overlap * 0.5 * ny;
                inst1.z -= overlap * 0.5 * nz;
                inst2.x += overlap * 0.5 * nx;
                inst2.y += overlap * 0.5 * ny;
                inst2.z += overlap * 0.5 * nz;

                const p1 = inst1.vx * nx + inst1.vy * ny + inst1.vz * nz;
                const p2 = inst2.vx * nx + inst2.vy * ny + inst2.vz * nz;

                inst1.vx += (p2 - p1) * nx;
                inst1.vy += (p2 - p1) * ny;
                inst1.vz += (p2 - p1) * nz;
                inst2.vx += (p1 - p2) * nx;
                inst2.vy += (p1 - p2) * ny;
                inst2.vz += (p1 - p2) * nz;
            }
        }
    }
}

function handleBoxCollisions() {
    const instanceHalfSize = SPHERE_RADIOUS;

    for (const inst of meshInstances) {
        if (inst.y < -BOX_BOUNDS.y + instanceHalfSize) {
            inst.y = -BOX_BOUNDS.y + instanceHalfSize;
            inst.vy *= -DAMPING;
        }
        if (inst.y > BOX_BOUNDS.y - instanceHalfSize) {
            inst.y = BOX_BOUNDS.y - instanceHalfSize;
            inst.vy *= -DAMPING;
        }

        if (inst.x < -BOX_BOUNDS.x + instanceHalfSize) {
            inst.x = -BOX_BOUNDS.x + instanceHalfSize;
            inst.vx *= -DAMPING;
        }
        if (inst.x > BOX_BOUNDS.x - instanceHalfSize) {
            inst.x = BOX_BOUNDS.x - instanceHalfSize;
            inst.vx *= -DAMPING;
        }

        if (inst.z < -BOX_BOUNDS.z + instanceHalfSize) {
            inst.z = -BOX_BOUNDS.z + instanceHalfSize;
            inst.vz *= -DAMPING;
        }
        if (inst.z > BOX_BOUNDS.z - instanceHalfSize) {
            inst.z = BOX_BOUNDS.z - instanceHalfSize;
            inst.vz *= -DAMPING;
        }
    }
}
