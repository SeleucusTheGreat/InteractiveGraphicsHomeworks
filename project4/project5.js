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

