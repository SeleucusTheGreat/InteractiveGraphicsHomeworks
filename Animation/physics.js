
function UpdatePhysics(deltaTime) {
    if (meshInstances.length === 0) return;

    // 1. Apply continuous forces (like gravity)
    handleGravity();
    
    // 2. Handle discrete events (collisions and interactions)
    // These functions might directly change velocity and position.
    handleInterObjectCollisions();
    handleMouseInteraction(deltaTime); 
    handleBoxCollisions();

    // 3. Integrate: Update position and velocity based on accumulated forces/changes
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
        // Calculate distance from mouse projection on the floor to the ball's projection
        const dx = ball.position.x - mouseState.worldX;
        // The y-distance is from the ball's center to the floor plane (y=-1)
        const dy = ball.position.y - (-1.0); 
        const dz = ball.position.z - mouseState.worldZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        const totalRadius = MOUSE_INTERACTION_RADIUS + ball.radius;

        if (distSq < (totalRadius * totalRadius)) {
            // Apply mouse velocity as a force/impulse
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
    for (let i = 0; i < meshInstances.length; i++) {
        for (let j = i + 1; j < meshInstances.length; j++) {
            const inst1 = meshInstances[i];
            const inst2 = meshInstances[j];

            const dx = inst2.position.x - inst1.position.x;
            const dy = inst2.position.y - inst1.position.y;
            const dz = inst2.position.z - inst1.position.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            
            const totalRadius = inst1.radius + inst2.radius;
            const diameterSq = totalRadius * totalRadius;

            // Check for collision
            if (distSq < diameterSq && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                
                // --- Positional Correction (resolve overlap) ---
                const overlap = totalRadius - dist;
                const nx = dx / dist; // Normalized collision axis
                const ny = dy / dist;
                const nz = dz / dist;

                // Move each ball away from the other along the collision axis
                inst1.position.x -= overlap * 0.5 * nx;
                inst1.position.y -= overlap * 0.5 * ny;
                inst1.position.z -= overlap * 0.5 * nz;
                inst2.position.x += overlap * 0.5 * nx;
                inst2.position.y += overlap * 0.5 * ny;
                inst2.position.z += overlap * 0.5 * nz;

                // --- Velocity Resolution (elastic collision) ---
                // Project velocities onto the collision axis
                const p1 = inst1.velocity.x * nx + inst1.velocity.y * ny + inst1.velocity.z * nz;
                const p2 = inst2.velocity.x * nx + inst2.velocity.y * ny + inst2.velocity.z * nz;

                // Swap the projected velocities (for perfectly elastic collision with equal mass)
                // (A more advanced solution would use mass in the calculation)
                const v1_prime_proj = p2;
                const v2_prime_proj = p1;

                // Update velocities
                inst1.velocity.x += (v1_prime_proj - p1) * nx;
                inst1.velocity.y += (v1_prime_proj - p1) * ny;
                inst1.velocity.z += (v1_prime_proj - p1) * nz;
                inst2.velocity.x += (v2_prime_proj - p2) * nx;
                inst2.velocity.y += (v2_prime_proj - p2) * ny;
                inst2.velocity.z += (v2_prime_proj - p2) * nz;
            }
        }
    }
}

function handleBoxCollisions() {
    for (const ball of meshInstances) {
        // Bottom wall
        if (ball.position.y < -BOX_BOUNDS.y + ball.radius) {
            ball.position.y = -BOX_BOUNDS.y + ball.radius; // Correct position
            ball.velocity.y *= -DAMPING; // Reverse and dampen velocity
        }
        // Top wall
        if (ball.position.y > BOX_BOUNDS.y - ball.radius) {
            ball.position.y = BOX_BOUNDS.y - ball.radius;
            ball.velocity.y *= -DAMPING;
        }

        // Left wall (-X)
        if (ball.position.x < -BOX_BOUNDS.x + ball.radius) {
            ball.position.x = -BOX_BOUNDS.x + ball.radius;
            ball.velocity.x *= -DAMPING;
        }
        // Right wall (+X)
        if (ball.position.x > BOX_BOUNDS.x - ball.radius) {
            ball.position.x = BOX_BOUNDS.x - ball.radius;
            ball.velocity.x *= -DAMPING;
        }

        // Back wall (-Z)
        if (ball.position.z < -BOX_BOUNDS.z + ball.radius) {
            ball.position.z = -BOX_BOUNDS.z + ball.radius;
            ball.velocity.z *= -DAMPING;
        }
        // Front wall (+Z)
        if (ball.position.z > BOX_BOUNDS.z - ball.radius) {
            ball.position.z = BOX_BOUNDS.z - ball.radius;
            ball.velocity.z *= -DAMPING;
        }
    }
}