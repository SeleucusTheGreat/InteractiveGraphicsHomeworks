function UpdatePhysics(deltaTime) {
    if (meshInstances.length === 0) return;

    
    handleGravity();
    handleInterObjectCollisions();
    handleMouseInteraction(deltaTime); 
    handleBoxCollisions();

    
    for (const ball of meshInstances) {
        ball.update(deltaTime);
    }
}

function handleGravity () {
    for (const ball of meshInstances) {
        ball.applygravity();
    }
}


function handleMouseInteraction(deltaTime) {
    if (!mouseState.hasMoved) return;

    if (currentInteractionMode === 'push') {
        handlePushInteraction(deltaTime);
    } else if (currentInteractionMode === 'tornado') {
        handleTornadoInteraction(deltaTime);
    }
}

// "Push" mode uses the original impulse-based logic
function handlePushInteraction(deltaTime) {
    for (const ball of meshInstances) {
        const dx = ball.position[0] - mouseState.worldX;
        const dy = ball.position[1] - (-0.95); 
        const dz = ball.position[2] - mouseState.worldZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        const totalRadius = MOUSE_INTERACTION_RADIUS + ball.radius;

        if (distSq < (totalRadius * totalRadius)) {
            // Apply mouse impulse based on its velocity
            const impulseX = mouseState.velX * MOUSE_IMPULSE_MULTIPLIER;
            const impulseY = (mouseState.velX + mouseState.velZ) * MOUSE_IMPULSE_MULTIPLIER * 0.5;
            const impulseZ = mouseState.velZ * MOUSE_IMPULSE_MULTIPLIER;
            ball.applyImpulse({ x: impulseX, y: impulseY, z: impulseZ });
        }
    }
}

// "Tornado" mode applies continuous forces to create a vortex
function handleTornadoInteraction(deltaTime) {
    const mouseWorldPos = glMatrix.vec3.fromValues(mouseState.worldX, mouseState.worldY, mouseState.worldZ);
    const toCenterVec = glMatrix.vec3.create();
    const upVector = glMatrix.vec3.fromValues(0, 1, 0);
    const tangentialVec = glMatrix.vec3.create();

    for (const ball of meshInstances) {
        glMatrix.vec3.subtract(toCenterVec, mouseWorldPos, ball.position);
        
        // We measure distance on the XZ plane to create a cylindrical area of effect
        const distOnPlane = Math.sqrt(toCenterVec[0]*toCenterVec[0] + toCenterVec[2]*toCenterVec[2]);

        if (distOnPlane > 0.01 && distOnPlane < TORNADO_RADIUS) {
            
            // Forces are stronger closer to the center and weaker at the edge
            const falloff = 1.0 - (distOnPlane / TORNADO_RADIUS);

            // --- 1. Inward Pull Force ---
            const pullForce = glMatrix.vec3.clone(toCenterVec);
            glMatrix.vec3.normalize(pullForce, pullForce); // Get direction
            const pullMagnitude = TORNADO_PULL_STRENGTH * falloff;
            glMatrix.vec3.scale(pullForce, pullForce, pullMagnitude);
            ball.applyForce({ x: pullForce[0], y: pullForce[1], z: pullForce[2] });

            // --- 2. Rotational (Tangential) Force ---
            // Cross product of "up" and "to center" gives a perpendicular vector for rotation
            glMatrix.vec3.cross(tangentialVec, upVector, toCenterVec);
            glMatrix.vec3.normalize(tangentialVec, tangentialVec); // Get direction
            const rotationMagnitude = TORNADO_ROTATION_STRENGTH * falloff;
            glMatrix.vec3.scale(tangentialVec, tangentialVec, rotationMagnitude);
            ball.applyForce({ x: tangentialVec[0], y: tangentialVec[1], z: tangentialVec[2] });

            // --- 3. Lift Force ---
            // A simple upward force to make the balls rise into the vortex
            ball.applyForce({ x: 0, y: TORNADO_LIFT_STRENGTH, z: 0 });
        }
    }
}

function handleInterObjectCollisions() {
    const collisionNormal = glMatrix.vec3.create();
    const relativeVelocity = glMatrix.vec3.create();
    const impulseVec = glMatrix.vec3.create();

    for (let i = 0; i < meshInstances.length; i++) {
        for (let j = i + 1; j < meshInstances.length; j++) {
            const inst1 = meshInstances[i];
            const inst2 = meshInstances[j];

            glMatrix.vec3.subtract(collisionNormal, inst1.position, inst2.position);
            const distSq = glMatrix.vec3.squaredLength(collisionNormal);

            const totalRadius = inst1.radius + inst2.radius;
            const diameterSq = totalRadius * totalRadius;

            // Check for collision
            if (distSq < diameterSq && distSq > 0.005) {
                const dist = Math.sqrt(distSq);
                glMatrix.vec3.normalize(collisionNormal, collisionNormal);

                //Positional Correction (to prevent sticking) ---
                const overlap = totalRadius - dist;
                const totalInvMass = inst1.invMass + inst2.invMass;
                if (totalInvMass > 0) {
                    // This moves each ball proportionally to its inverse mass
                    const correctionAmount = overlap / totalInvMass;
                    glMatrix.vec3.scaleAndAdd(inst1.position, inst1.position, collisionNormal, correctionAmount * inst1.invMass);
                    glMatrix.vec3.scaleAndAdd(inst2.position, inst2.position, collisionNormal, -correctionAmount * inst2.invMass);
                }

                //Impulse Resolution 
                
                glMatrix.vec3.subtract(relativeVelocity, inst1.velocity, inst2.velocity);

                //velocity along the normal
                const velAlongNormal = glMatrix.vec3.dot(relativeVelocity, collisionNormal);

                //Do not resolve if velocities are separating
                if (velAlongNormal > 0) {
                    continue;
                }

                //Calculate impulse scalar
                const j = -(1 + RESTITUTION) * velAlongNormal / totalInvMass;
            

                //Apply impulse vector
                glMatrix.vec3.scale(impulseVec, collisionNormal, j);

                glMatrix.vec3.scaleAndAdd(inst1.velocity, inst1.velocity, impulseVec, inst1.invMass);
                glMatrix.vec3.scaleAndAdd(inst2.velocity, inst2.velocity, impulseVec, -inst2.invMass);
            }
        }
    }
}


function handleBoxCollisions() {
    for (const ball of meshInstances) {
        // Bottom wall
        if (ball.position[1] < currentBoxBounds.y_bottom + ball.radius) {
            ball.position[1] = currentBoxBounds.y_bottom + ball.radius;
            ball.velocity[1] *= -RESTITUTION;
        }
        // Top wall
        if (ball.position[1] > currentBoxBounds.y_top - ball.radius) {
            ball.position[1] = currentBoxBounds.y_top - ball.radius;
            ball.velocity[1] *= -RESTITUTION;
        }

        // Left wall (-X)
        if (ball.position[0] < -currentBoxBounds.x + ball.radius) {
            ball.position[0] = -currentBoxBounds.x + ball.radius;
            ball.velocity[0] *= -RESTITUTION;
        }
        // Right wall (+X)
        if (ball.position[0] > currentBoxBounds.x - ball.radius) {
            ball.position[0] = currentBoxBounds.x - ball.radius;
            ball.velocity[0] *= -RESTITUTION;
        }

        // Back wall (-Z)
        if (ball.position[2] < -currentBoxBounds.z + ball.radius) {
            ball.position[2] = -currentBoxBounds.z + ball.radius;
            ball.velocity[2] *= -RESTITUTION;
        }
        // Front wall (+Z)
        if (ball.position[2] > currentBoxBounds.z - ball.radius) {
            ball.position[2] = currentBoxBounds.z - ball.radius;
            ball.velocity[2] *= -RESTITUTION;
        }
    }
}