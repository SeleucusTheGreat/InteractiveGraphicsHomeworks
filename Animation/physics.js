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
    const impulse = glMatrix.vec3.create(); // Create vector once
    const MOUSE_IMPULSE_MULTIPLIER = 0.10; 
    const MOUSE_INTERACTION_RADIUS = 0.05; 
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
            
            // Set the values of the impulse vector
            glMatrix.vec3.set(impulse, impulseX, impulseY, impulseZ);
            ball.applyImpulse(impulse); // Pass the glMatrix vector
        }
    }
}


function handleTornadoInteraction(deltaTime) {
    // --- Constants ---
    const TORNADO_RADIUS = 1.5;
    const TORNADO_PULL_STRENGTH = 100.0;    
    const TORNADO_ROTATION_STRENGTH = 2.0; 
    const TORNADO_LIFT_STRENGTH = 10.0;  

    // --- State ---
    const tornadoCenterX = mouseState.worldX;
    const tornadoCenterZ = mouseState.worldZ;

    // --forces vectors--
    const totalForce = glMatrix.vec3.create();
    const pullForce = glMatrix.vec3.create();
    const rotationForce = glMatrix.vec3.create();
    const liftForce = glMatrix.vec3.create();

    for (const ball of meshInstances) {
        const ballPos = ball.position;
        const dx = ballPos[0] - tornadoCenterX;
        const dz = ballPos[2] - tornadoCenterZ;
        const distanceSq = dx * dx + dz * dz;
        const distance = Math.sqrt(distanceSq);

        // Check if the ball is within the tornado's cylinder
        if (distance <= TORNADO_RADIUS) {
            const liftFalloff = 1.0 - (distance / TORNADO_RADIUS);
            glMatrix.vec3.zero(totalForce); 

            // --- pull in forces --- 
            const pullDir = glMatrix.vec3.fromValues(-dx, 0, -dz);
            glMatrix.vec3.normalize(pullDir, pullDir);
            glMatrix.vec3.scale(pullForce, pullDir, TORNADO_PULL_STRENGTH*liftFalloff);
            glMatrix.vec3.add(totalForce, totalForce, pullForce);


            // ---- rotation forces ---
            const rotationDir = glMatrix.vec3.fromValues(-dz, 0, dx);
            glMatrix.vec3.normalize(rotationDir, rotationDir);
            glMatrix.vec3.scale(rotationForce, rotationDir, TORNADO_ROTATION_STRENGTH*liftFalloff);
            glMatrix.vec3.add(totalForce, totalForce, rotationForce);


            // --- lift forces ---
            glMatrix.vec3.scale(liftForce, [0, 1, 0], TORNADO_LIFT_STRENGTH * liftFalloff);
            glMatrix.vec3.add(totalForce, totalForce, liftForce);

            //--- combine them all ---
            ball.applyForce(totalForce);
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