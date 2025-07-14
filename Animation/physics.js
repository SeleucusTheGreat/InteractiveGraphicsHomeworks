function UpdatePhysics(deltaTime) {
    if (meshInstances.length === 0) return;

    
    handleGravity();
    handleDampingAndFriction()
    handleInterObjectCollisions();
    handleMouseInteraction(deltaTime); 
    handleBoxCollisions();

    
    for (const ball of meshInstances) {
        ball.update(deltaTime);
    }
}

function handleDampingAndFriction() {
    const dampingForce = glMatrix.vec3.create();
    

    for (const ball of meshInstances) {

        
        if (ball.position[1] <= currentBoxBounds.y_bottom + ball.radius + FLOOR_CONTACT_THRESHOLD) {
            const floorFrictionForce = glMatrix.vec3.fromValues(ball.velocity[0], 0, ball.velocity[2]);
            glMatrix.vec3.scale(floorFrictionForce, floorFrictionForce, -FLOOR_FRICTION_DAMPING);
            ball.applyForce(floorFrictionForce);

        }
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
    } else if (currentInteractionMode === 'vortex') { // Add this else-if block
        handleVortexInteraction(deltaTime);
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

function handleVortexInteraction(deltaTime) {
    const NUM_VORTEX_LAYERS = 2;       
    const VORTEX_LAYER_HEIGHT = 0.25;  
    const VORTEX_BASE_RADIUS = 0.25;     
    const VORTEX_RADIUS_INCREMENT = 0.25; 
    const SCALING = 0.5; 

    // --- Force Constants ---
    const VORTEX_PULL_STRENGTH = 20.0;
    const VORTEX_ROTATION_STRENGTH = 40.0;

    // --- State ---
    const vortexCenterX = mouseState.worldX;
    const vortexCenterZ = mouseState.worldZ;
    const floorY = currentBoxBounds.y_bottom;

    const vortexLayers = [];
    for (let i = 0; i < NUM_VORTEX_LAYERS; i++) {
        const layer_y_min = floorY + (i * VORTEX_LAYER_HEIGHT);
        const layer_y_max = layer_y_min + VORTEX_LAYER_HEIGHT;
        const radius = VORTEX_BASE_RADIUS + (i * VORTEX_RADIUS_INCREMENT);
        vortexLayers.push({
            y_min: layer_y_min,
            y_max: layer_y_max,
            radius: radius,
            radiusSq: radius * radius,
            number: i 
        });
    }

    const totalForce = glMatrix.vec3.create();
    const pullForce = glMatrix.vec3.create();
    const rotationForce = glMatrix.vec3.create();

    for (const ball of meshInstances) {
        const ballPos = ball.position;


        for (const layer of vortexLayers) {
            //Check if the ball is within the vertical bounds of this layer
            if (ballPos[1] >= layer.y_min && ballPos[1] < layer.y_max) {
                const dx = ballPos[0] - vortexCenterX;
                const dz = ballPos[2] - vortexCenterZ;
                const distanceSq = dx * dx + dz * dz;

                //Check if the ball is within the horizontal radius of this layer
                if (distanceSq <= layer.radiusSq) {
                    const distance = Math.sqrt(distanceSq);
                    
                    // linear falloff
                    const falloff = 1.0 - (distance / layer.radius);

                    glMatrix.vec3.zero(totalForce);

                    // --- Pull-in force ---
                    const pullDir = glMatrix.vec3.fromValues(-dx, 0, -dz);
                    glMatrix.vec3.normalize(pullDir, pullDir);
                    glMatrix.vec3.scale(pullForce, pullDir, VORTEX_PULL_STRENGTH);
                    glMatrix.vec3.add(totalForce, totalForce, pullForce);

                    // --- Rotational force ---
                    const rotationDir = glMatrix.vec3.fromValues(-dz, 0, dx);
                    glMatrix.vec3.normalize(rotationDir, rotationDir);
                    glMatrix.vec3.scale(rotationForce, rotationDir, VORTEX_ROTATION_STRENGTH);
                    glMatrix.vec3.add(totalForce, totalForce, rotationForce);

                    // Apply the combined force
                    ball.applyForce(totalForce);

                    // A ball can only be in one layer at a time
                }
            }
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

function handlePushInteraction(deltaTime) {
    const impulse = glMatrix.vec3.create(); 
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
