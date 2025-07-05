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

    for (const ball of meshInstances) {
        
        const dx = ball.position[0] - mouseState.worldX;
        const dy = ball.position[1] - (-1.0); 
        const dz = ball.position[2] - mouseState.worldZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        const totalRadius = MOUSE_INTERACTION_RADIUS + ball.radius;

        if (distSq < (totalRadius * totalRadius)) {
            // Apply mouse velocity as an impulse
            const impulseX = mouseState.velX * MOUSE_FORCE_MULTIPLIER;
            const impulseZ = mouseState.velZ * MOUSE_FORCE_MULTIPLIER;
            ball.applyImpulse({ x: impulseX, y: 0, z: impulseZ });

            // Apply a "push away" force from the center of the mouse cursor
            const dist = Math.sqrt(distSq);
            if (dist > 0.01) {
                const pushImpulse = {
                    x: (dx / dist) * PUSHSTRENGHT * deltaTime,
                    y: (dy / dist ) * PUSHSTRENGHT * deltaTime,
                    z: (dz / dist) * PUSHSTRENGHT * deltaTime
                };
                ball.applyImpulse(pushImpulse);
            }
        }
    }
}


function handleInterObjectCollisions() {
    const collisionNormal = glMatrix.vec3.create(); 
    const correction = glMatrix.vec3.create();     

    for (let i = 0; i < meshInstances.length; i++) {
        for (let j = i + 1; j < meshInstances.length; j++) {
            const inst1 = meshInstances[i];
            const inst2 = meshInstances[j];

            glMatrix.vec3.subtract(collisionNormal, inst2.position, inst1.position);
            const distSq = glMatrix.vec3.squaredLength(collisionNormal);
            
            const totalRadius = inst1.radius + inst2.radius;
            const diameterSq = totalRadius * totalRadius;

            // Check for collision
            if (distSq < diameterSq && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                
                // Normalize the collision normal vector
                glMatrix.vec3.scale(collisionNormal, collisionNormal, 1.0 / dist);

                // --- Positional Correction (resolve overlap) ---
                const overlap = totalRadius - dist;
                glMatrix.vec3.scale(correction, collisionNormal, overlap * 0.5);
                glMatrix.vec3.subtract(inst1.position, inst1.position, correction);
                glMatrix.vec3.add(inst2.position, inst2.position, correction);

                // --- Velocity Resolution (elastic collision) ---
                // Project velocities onto the collision axis
                const p1 = glMatrix.vec3.dot(inst1.velocity, collisionNormal);
                const p2 = glMatrix.vec3.dot(inst2.velocity, collisionNormal);

                // For perfectly elastic collision with equal mass, the projected velocities are swapped.
                // A more advanced solution would use mass: v1' = (v1(m1-m2) + 2m2v2) / (m1+m2)
                const v1_prime_proj = p2;
                const v2_prime_proj = p1;

                // The change in velocity is the difference between the new and old projected velocities.
                const deltaV1 = v1_prime_proj - p1;
                const deltaV2 = v2_prime_proj - p2;

                // Add the change in velocity along the collision normal back to the original velocities.
                glMatrix.vec3.scaleAndAdd(inst1.velocity, inst1.velocity, collisionNormal, deltaV1);
                glMatrix.vec3.scaleAndAdd(inst2.velocity, inst2.velocity, collisionNormal, deltaV2);
            }
        }
    }
}

function handleBoxCollisions() {
    for (const ball of meshInstances) {
        // Bottom wall
        if (ball.position[1] < -BOX_BOUNDS.y + ball.radius) {
            ball.position[1] = -BOX_BOUNDS.y + ball.radius; 
            ball.velocity[1] *= -DAMPING; 
        }
        // Top wall
        if (ball.position[1] > BOX_BOUNDS.y - ball.radius) {
            ball.position[1] = BOX_BOUNDS.y - ball.radius;
            ball.velocity[1] *= -DAMPING;
        }

        // Left wall (-X)
        if (ball.position[0] < -BOX_BOUNDS.x + ball.radius) {
            ball.position[0] = -BOX_BOUNDS.x + ball.radius;
            ball.velocity[0] *= -DAMPING;
        }
        // Right wall (+X)
        if (ball.position[0] > BOX_BOUNDS.x - ball.radius) {
            ball.position[0] = BOX_BOUNDS.x - ball.radius;
            ball.velocity[0] *= -DAMPING;
        }

        // Back wall (-Z)
        if (ball.position[2] < -BOX_BOUNDS.z + ball.radius) {
            ball.position[2] = -BOX_BOUNDS.z + ball.radius;
            ball.velocity[2] *= -DAMPING;
        }
        // Front wall (+Z)
        if (ball.position[2] > BOX_BOUNDS.z - ball.radius) {
            ball.position[2] = BOX_BOUNDS.z - ball.radius;
            ball.velocity[2] *= -DAMPING;
        }
    }
}