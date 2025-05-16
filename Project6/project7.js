// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	var T = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	var cX = Math.cos( rotationX );
	var sX = Math.sin( rotationX );
	var cY = Math.cos( rotationY );
	var sY = Math.sin( rotationY );
	
	var Rx = [
		1,  0,  0,  0,
		0, cX, sX,  0,
		0,-sX, cX,  0,
		0,  0,  0,  1
	];
	var Ry = [
		cY, 0,-sY,  0,
		 0, 1,  0,  0,
		sY, 0, cY,  0,
		 0, 0,  0,  1
	];
	var mv = MatrixMult( T, MatrixMult( Ry, Rx ) );
	return mv;
}

const VertexShader = `
	attribute vec3 pos;       
	attribute vec2 texCoord;  
	attribute vec3 normal;    

	uniform mat4 mvp;           // ModelViewProjection matrix
	uniform mat4 mv;            // ModelView matrix
	uniform mat3 normalMatrix;  
	uniform bool swapYZ;      
	varying vec3 v_pos_cam;     
	varying vec2 v_texCoord;    
	varying vec3 v_normal_cam;  // Normal in camera space

	void main()
	{
		vec3 p = pos;
		if (swapYZ) {
			p = vec3(pos.x, pos.z, pos.y); 
		}
		v_pos_cam = (mv * vec4(p, 1.0)).xyz;

		// Transform normal to camera space and normalize
		v_normal_cam = normalize(normalMatrix * normal);
		
		v_texCoord = texCoord;
		gl_Position = mvp * vec4(p, 1.0);
	}
`;
const FragmentShader = `
	precision mediump float;

	varying vec3 v_pos_cam;     
	varying vec2 v_texCoord;    
	varying vec3 v_normal_cam;  

	uniform vec3 lightDir;      // Light direction in camera space 
	uniform float shininess;    // Shininess exponent (alpha)
	uniform bool useTexture;    
	uniform sampler2D sampler;  

	void main()
	{
		
		vec3 N = normalize(v_normal_cam); // Normal vector
		vec3 L = normalize(lightDir);     // Light direction vector
		vec3 V = normalize(-v_pos_cam);   // View direction vector
		vec3 H = normalize(L + V);        // Halfway vector

		// Material properties
		vec3 Ks = vec3(1.0, 1.0, 1.0);  
		vec3 Kd_default = vec3(1.0, 1.0, 1.0); 

		// Light properties
		vec3 I = vec3(1.0, 1.0, 1.0); // Light intensity (white)

		// Determine diffuse color Kd
		vec3 Kd = Kd_default;
		if (useTexture) {
			Kd = texture2D(sampler, v_texCoord).rgb; // Use texture color if enabled
		}

		// Calculate diffuse term 
		float NdotL = max(dot(N, L), 0.0);
		vec3 diffuse = Kd * I * NdotL;

		// Calculate specular term 
		float NdotH = max(dot(N, H), 0.0);
		float specIntensity = (shininess == 0.0 && NdotH == 0.0) ? 0.0 : pow(NdotH, shininess);
		vec3 specular = Ks * I * specIntensity;

		// Combine terms
		vec3 color = diffuse + specular;

		// Final color
		gl_FragColor = vec4(color, 1.0);
	}
`;


class MeshDrawer
{
	constructor()
	{

		this.prog = InitShaderProgram( VertexShader, FragmentShader );

		//Get attribute locations
		this.posAttrib = gl.getAttribLocation( this.prog, 'pos' );
		this.texCoordAttrib = gl.getAttribLocation( this.prog, 'texCoord' );
		this.normalAttrib = gl.getAttribLocation( this.prog, 'normal' );

		//Get uniform locations
		this.mvpUniform = gl.getUniformLocation( this.prog, 'mvp' );
		this.mvUniform = gl.getUniformLocation( this.prog, 'mv' );
		this.normalMatrixUniform = gl.getUniformLocation( this.prog, 'normalMatrix' );
		this.swapYZUniform = gl.getUniformLocation( this.prog, 'swapYZ' );
		this.lightDirUniform = gl.getUniformLocation( this.prog, 'lightDir' );
		this.shininessUniform = gl.getUniformLocation( this.prog, 'shininess' );
		this.useTextureUniform = gl.getUniformLocation( this.prog, 'useTexture' );
		this.samplerUniform = gl.getUniformLocation( this.prog, 'sampler' );

		//Create buffer objects
		this.vertBuffer = gl.createBuffer();
		this.texCoordBuffer = gl.createBuffer();
		this.normalBuffer = gl.createBuffer();

		//Create texture object and initialize with a 1x1 white pixel
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		

		//Initialize state variables like in the example
		this.numTriangles = 0;
		this.hasTexture = false; 
		this.showTex = true;    
		this.doSwapYZ = false;   

		// Set initial uniform values
		gl.useProgram(this.prog);
		gl.uniform1i(this.swapYZUniform, this.doSwapYZ);
		gl.uniform1i(this.useTextureUniform, this.showTex && this.hasTexture);
		gl.uniform1i(this.samplerUniform, 0); 
	}

	setMesh( vertPos, texCoords, normals )
	{
		//num of vertices
		this.numVertices = vertPos.length / 3;

		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		// Update texture coordinate buffer (if available)
		if (texCoords && texCoords.length > 0) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		} else {}

		// normal buffer
		if (normals && normals.length > 0) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
		} else {
			// good practice to avoid errors in the shader they say
			console.warn("Mesh loaded without normals. Shading may be incorrect.");
            const dummyNormals = [];
            for(let i=0; i < this.numVertices; ++i) {
                dummyNormals.push(0, 1, 0);
            }
 			gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dummyNormals), gl.STATIC_DRAW);
		}		
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	swapYZ( swap )
	{
		this.doSwapYZ = swap;
		gl.useProgram(this.prog);
		gl.uniform1i(this.swapYZUniform, this.doSwapYZ);
	}

	draw( matrixMVP, matrixMV, matrixNormal )
	{
		//again good practive they say
		if (this.numVertices === 0) return; 
		gl.useProgram(this.prog);

		//Set matrix uniforms again
		gl.uniformMatrix4fv(this.mvpUniform, false, matrixMVP);
		gl.uniformMatrix4fv(this.mvUniform, false, matrixMV);
		gl.uniformMatrix3fv(this.normalMatrixUniform, false, matrixNormal);

		//Bind Vertex Position Buffer again
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.vertexAttribPointer(this.posAttrib, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.posAttrib);

		//Bind Texture Coordinate Buffer and set attribute pointer again
		if (this.texCoordAttrib !== -1) { 
			gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
			gl.vertexAttribPointer(this.texCoordAttrib, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.texCoordAttrib);
		}

		//Bind Normal Buffer and set attribute pointer again
		if (this.normalAttrib !== -1) {  
			gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
			gl.vertexAttribPointer(this.normalAttrib, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.normalAttrib);
		}

		//bind the texture again
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.useTextureUniform, this.showTex && this.hasTexture);
		gl.drawArrays( gl.TRIANGLES, 0, this.numVertices );

        //Unbind buffers 
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
	}

	setTexture( img )
	{
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); 
   		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); 
		gl.bindTexture(gl.TEXTURE_2D, null);

		this.hasTexture = true;
		gl.useProgram(this.prog);
		gl.uniform1i(this.useTextureUniform, this.showTex && this.hasTexture); 
	}

	showTexture( show )
	{
		this.showTex = show;
		gl.useProgram(this.prog);
		gl.uniform1i(this.useTextureUniform, this.showTex && this.hasTexture);
	}
	setLightDir( x, y, z )
	{
		gl.useProgram(this.prog);
		gl.uniform3f(this.lightDirUniform, x, y, z);
	}
	setShininess( shininess )
	{
		gl.useProgram(this.prog);
		gl.uniform1f(this.shininessUniform, shininess);
	}
}


function SimTimeStep( dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution )
{
	var numParticles = positions.length;
	var forces = Array( numParticles );


	for (let i = 0; i < numParticles; i++) {
		forces[i] = new Vec3(0, 0, 0); // Make sure Vec3 is accessible here or pass as argument/use `new window.Vec3`
	}

	//vector of forces
	for (let i = 0; i < numParticles; i++) {
		let Fg = gravity.mul(particleMass); 
		forces[i].inc(Fg);
	}

	//Spring forces 
	for (let s = 0; s < springs.length; s++) {
		let spring = springs[s];
		let p0_idx = spring.p0;
		let p1_idx = spring.p1;
		let restLength = spring.rest;

		let pos0 = positions[p0_idx]; 
		let pos1 = positions[p1_idx]; 
		
		let deltaP = pos0.sub(pos1); // distance vector from p1 to p0
		let L = deltaP.len();

		//this is for normalizing the vector
		let unit_deltaP;
		if (L < 1e-9) { 
			// Avoid division by zero if length is zero or very small
            unit_deltaP = new Vec3(0,0,0); 
            L = 0; 
		} else {
            unit_deltaP = deltaP.div(L); 
        }


		//equation of the spring F = -k * (L - L_rest) * unit_vector)
		let displacement = L - restLength;
		let F_s_mag = -stiffness * displacement;
		let F_s_vec = unit_deltaP.mul(F_s_mag);

		// Damping force (F_d = -c_damp * (v_rel . unit_vector) * unit_vector)
		let vel0 = velocities[p0_idx]; 
		let vel1 = velocities[p1_idx]; 
		let deltaV = vel0.sub(vel1);   // relative velocity of p0 to p1
		let v_rel_along_spring = deltaV.dot(unit_deltaP); //dot product
		let F_d_mag = -damping * v_rel_along_spring;
		let F_d_vec = unit_deltaP.mul(F_d_mag);
		
		// adding the dumping force to the spring force
		let F_total_spring = F_s_vec.add(F_d_vec);

		// Apply the spring force to both particles
		forces[p0_idx].inc(F_total_spring);
		forces[p1_idx].dec(F_total_spring); // Apply equal and opposite force to p1
	}
	
	// updating state of the particles
	for (let i = 0; i < numParticles; i++) {
		// a = F / m
		let acceleration = forces[i].div(particleMass);
		
		//updating the velocity of all particles
		velocities[i].inc(acceleration.mul(dt));
		
		// updating the position of all particles
		positions[i].inc(velocities[i].mul(dt));
	}
	

	const wall_min = -1.0;
	const wall_max =  1.0;

	//handling collisions with walls with restitution
	for (let i = 0; i < numParticles; i++) {
		let pos = positions[i]; 
		let vel = velocities[i]; 

		// X-axis collision
		if (pos.x < wall_min) {
			pos.x = wall_min;
			vel.x = -vel.x * restitution;
		} else if (pos.x > wall_max) {
			pos.x = wall_max;
			vel.x = -vel.x * restitution;
		}

		// Y-axis collision
		if (pos.y < wall_min) {
			pos.y = wall_min;
			vel.y = -vel.y * restitution;
		} else if (pos.y > wall_max) {
			pos.y = wall_max;
			vel.y = -vel.y * restitution;
		}

		// Z-axis collision
		if (pos.z < wall_min) {
			pos.z = wall_min;
			vel.z = -vel.z * restitution;
		} else if (pos.z > wall_max) {
			pos.z = wall_max;
			vel.z = -vel.z * restitution;
		}
	}
}

