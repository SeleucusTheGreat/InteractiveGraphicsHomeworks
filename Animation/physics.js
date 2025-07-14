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
    // --- Funnel Constants ---

    const FUNNEL_BOTTOM_RADIUS = 0.6; 
    const FUNNEL_TOP_RADIUS = FUNNEL_BOTTOM_RADIUS * 4; 
    const FUNNEL_HEIGHT = 2.0;


    const PULL_STRENGTH = 20.0;   
    const ROTATION_STRENGTH = 80.0; 
    const DRAIN_STRENGTH = 20.0;  

 
    const vortexCenterX = mouseState.worldX;
    const vortexCenterZ = mouseState.worldZ;
    const y_bottom = currentBoxBounds.y_bottom;
    const y_top = y_bottom + FUNNEL_HEIGHT;


    const totalForce = glMatrix.vec3.create();
    const toCenterVec = glMatrix.vec3.create();
    const swirlVec = glMatrix.vec3.create();
    const drainVec = glMatrix.vec3.fromValues(0, -1, 0); // Downward vector

    for (const ball of meshInstances) {
        const ballPos = ball.position;
        const ballY = ballPos[1];

        //Check if the ball is within the vertical range of the funnel
        if (ballY < y_bottom || ballY > y_top || FUNNEL_HEIGHT <= 0) {
            continue;
        }

        //Calculate the funnel's radius at the ball's current height
        const normalizedHeight = (ballY - y_bottom) / FUNNEL_HEIGHT; 
        const funnelRadiusAtY = FUNNEL_BOTTOM_RADIUS + normalizedHeight * (FUNNEL_TOP_RADIUS - FUNNEL_BOTTOM_RADIUS);

        //Check if the ball is inside the funnel's cone
        const dx = ballPos[0] - vortexCenterX;
        const dz = ballPos[2] - vortexCenterZ;
        const distanceSqToCenter = dx * dx + dz * dz;

        if (distanceSqToCenter > funnelRadiusAtY * funnelRadiusAtY) {
            continue; // Ball is outside the cone
        }

        const distanceToCenter = Math.sqrt(distanceSqToCenter);

        // radial falloff
        const radialFalloff = 1.0 - (distanceToCenter / funnelRadiusAtY);

        // Vertical falloff
        const verticalFalloff = 1.0 - normalizedHeight;

        glMatrix.vec3.zero(totalForce);

        // --- Inward Pull Force ---
        if (distanceToCenter > 0.01) {
            glMatrix.vec3.set(toCenterVec, -dx, 0, -dz);
            glMatrix.vec3.normalize(toCenterVec, toCenterVec);
            glMatrix.vec3.scaleAndAdd(totalForce, totalForce, toCenterVec, PULL_STRENGTH * radialFalloff);
        }

        // --- Rotational Force ---
        glMatrix.vec3.set(swirlVec, -dz, 0, dx);
        if(glMatrix.vec3.length(swirlVec) > 0.001) {
            glMatrix.vec3.normalize(swirlVec, swirlVec);
            glMatrix.vec3.scaleAndAdd(totalForce, totalForce, swirlVec, ROTATION_STRENGTH  * radialFalloff * verticalFalloff);
        }

        // --- Downward Force ---
        glMatrix.vec3.scaleAndAdd(totalForce, totalForce, drainVec, DRAIN_STRENGTH * verticalFalloff * radialFalloff);
        
        // combine all forces
        ball.applyForce(totalForce);
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
