class Ball {
    constructor(x, y, z, radius, color) {
        this.position = { x: x, y: y, z: z };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.acceleration = { x: 0, y: 0, z: 0 }; // For applying forces

        this.radius = radius;
        this.color = color;
        
        // Example of deriving mass from density and volume. Density is arbitrary here.
        const DENSITY = 3.0; 
        const volume = (4/3) * Math.PI * Math.pow(this.radius, 3);
        this.mass = DENSITY * volume;
        this.invMass = (this.mass > 0) ? 1.0 / this.mass : 0; // Inverse mass is useful (0 for static objects)
    }

    // Applies a force (like gravity or a push) using F=ma => a = F/m
    applyForce(force) {
        // We accumulate forces here. Note: this assumes the force is constant over the frame.
        this.acceleration.x += force.x * this.invMass;
        this.acceleration.y += force.y * this.invMass;
        this.acceleration.z += force.z * this.invMass;
    }

    applygravity() {
        this.acceleration.y += GRAVITY;
    }
    
    // Applies an impulse (a sudden change in velocity), like a push from the mouse
    // Impulse J = delta_p (change in momentum), and delta_p = m * delta_v
    // So, delta_v = J / m = J * invMass
    applyImpulse(impulse) {
        this.velocity.x += impulse.x * this.invMass;
        this.velocity.y += impulse.y * this.invMass;
        this.velocity.z += impulse.z * this.invMass;
    }


    // Updates the ball's state over a time step using basic Verlet or Euler integration
    update(deltaTime) {
        // Update velocity from acceleration
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.velocity.z += this.acceleration.z * deltaTime;

        // Update position from velocity
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;

        // IMPORTANT: Clear acceleration for the next frame so forces don't accumulate indefinitely
        this.acceleration.x = 0;
        this.acceleration.y = 0;
        this.acceleration.z = 0;
    }
}
