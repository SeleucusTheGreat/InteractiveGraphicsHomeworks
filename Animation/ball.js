class Ball {
    constructor(x, y, z, radius, color, density) {

        this.position = glMatrix.vec3.fromValues(x, y, z);
        this.velocity = glMatrix.vec3.create(); // Starts at [0, 0, 0]
        this.acceleration = glMatrix.vec3.create(); // Starts at [0, 0, 0]

        this.radius = radius;
        this.color = color;
        
        const DENSITY = density; 
        const volume = (4/3) * Math.PI * Math.pow(this.radius, 3);
        this.mass = DENSITY * volume;
        this.invMass = (this.mass > 0) ? 1.0 / this.mass : 0;
    }

    // F=ma => a = F/m
    applyForce(force) {
        const forceVec = glMatrix.vec3.fromValues(force.x, force.y, force.z);
        glMatrix.vec3.scaleAndAdd(this.acceleration, this.acceleration, forceVec, this.invMass);
    }

    applygravity() {
        // Apply gravity only on the Y axis
        this.acceleration[1] += GRAVITY;
    }
    
    
    // delta_v = J / m = J * invMass
    applyImpulse(impulse) {
        const impulseVec = glMatrix.vec3.fromValues(impulse.x, impulse.y, impulse.z);
        glMatrix.vec3.scaleAndAdd(this.velocity, this.velocity, impulseVec, this.invMass);
    }


    update(deltaTime) {
        // Update velocity from acceleration: v += a * dt
        glMatrix.vec3.scaleAndAdd(this.velocity, this.velocity, this.acceleration, deltaTime);

        // Update position from velocity: p += v * dt
        glMatrix.vec3.scaleAndAdd(this.position, this.position, this.velocity, deltaTime);

        // clear accellerations
        glMatrix.vec3.zero(this.acceleration);
    }

    momentum(){
        return this.mass*this.velocity
    }
}