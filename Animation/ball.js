class Ball {
    constructor(x, y, z, radius, color, density, ballType) {

        this.position = glMatrix.vec3.fromValues(x, y, z);
        this.velocity = glMatrix.vec3.create(); //[0, 0, 0]
        this.acceleration = glMatrix.vec3.create(); //[0, 0, 0]

        this.radius = radius;
        this.color = color;
        this.ballType = ballType;
        
        const DENSITY = density; 
        const volume = (4/3) * Math.PI * Math.pow(this.radius, 3);
        this.mass = DENSITY * volume;
        this.invMass = (this.mass > 0) ? 1.0 / this.mass : 0;
    }

    // F=ma => a = F/m
    applyForce(forceVec) {
        glMatrix.vec3.scaleAndAdd(this.acceleration, this.acceleration, forceVec, this.invMass);
    }

    applygravity() {
        this.acceleration[1] += GRAVITY;
    }

    applyAcceleration(accVec) {
        glMatrix.vec3.add(this.acceleration, this.acceleration, accVec);
    }
    
    // velocity  = J * 1/Mass
    applyImpulse(impulseVec) { 
        glMatrix.vec3.scaleAndAdd(this.velocity, this.velocity, impulseVec, this.invMass);
    }


    update(deltaTime) {
        //v += a * dt
        glMatrix.vec3.scaleAndAdd(this.velocity, this.velocity, this.acceleration, deltaTime);

        // p += v * dt
        glMatrix.vec3.scaleAndAdd(this.position, this.position, this.velocity, deltaTime);

        // clear accellerations
        glMatrix.vec3.zero(this.acceleration);
    }

    momentum(){
        return this.mass*this.velocity
    }
}