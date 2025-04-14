// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
	var cosX = Math.cos(rotationX);
	var sinX = Math.sin(rotationX);
	var cosY = Math.cos(rotationY);
	var sinY = Math.sin(rotationY);
	
	//rotation matrixX moltiplied by rotation MatrixY in one matrix 
	var trans = [
		cosY, sinX*sinY, -cosX*sinY, 0,
		0, cosX, sinX, 0,
		sinY, -sinX*cosY, cosX*cosY, 0,
		translationX, translationY, translationZ, 1
	];
	var mvp = MatrixMult( projectionMatrix, trans );
	return mvp;
}


const VertexShader = `
    attribute vec3 a_position;
    attribute vec2 a_texcoord;
    uniform mat4 u_mvp;
    uniform bool u_swapYZ; 
    varying vec2 v_texcoord;

    void main() {
      vec3 pos = a_position;
      if (u_swapYZ) {
        pos = vec3(pos.x, pos.z, pos.y); 
      }
      gl_Position = u_mvp * vec4(pos, 1.0);
      v_texcoord = a_texcoord; 
    }
`;

const FragmentShader = `
	precision mediump float;
    uniform sampler2D u_sampler; 
    uniform bool u_showTexture;
	uniform bool u_textureLoaded; //this thing avoid to draw the texture if it is not loaded yet   
    varying vec2 v_texcoord;

    void main() {
      if (u_showTexture && u_textureLoaded) {
        gl_FragColor = texture2D(u_sampler, v_texcoord);
      } 
	  else {
        gl_FragColor = vec4(1.0, gl_FragCoord.z * gl_FragCoord.z, 0.0, 1.0); 
      }
    }
`; 

class MeshDrawer
{
	constructor()
	{
		this.prog = InitShaderProgram( VertexShader, FragmentShader );

		//getting the memory address of all the shader variables (uniform doesn't change from one vertex tot the other)
		this.posAttribLoc = gl.getAttribLocation( this.prog, 'a_position' );
		this.texAttribLoc = gl.getAttribLocation( this.prog, 'a_texcoord' );
		this.mvpUniformLoc   = gl.getUniformLocation( this.prog, 'u_mvp' );
		this.swapYZUniformLoc = gl.getUniformLocation( this.prog, 'u_swapYZ' );
		this.showTexUniformLoc = gl.getUniformLocation( this.prog, 'u_showTexture' );
		this.samplerUniformLoc = gl.getUniformLocation( this.prog, 'u_sampler' );
		this.texLoadedUniformLoc = gl.getUniformLocation( this.prog, 'u_textureLoaded' );

		//creating buffers and texture
		this.vertBuffer = gl.createBuffer();
		this.texBuffer  = gl.createBuffer(); 
		this.texture = gl.createTexture();
        
		// Initialize states and passing values to the shaders
		this.numVertices = 0; 
        this.textureLoaded = false; 
        this.showTextureFlag = true; // default is checked apparently
        this.swapYZFlag = false; 
        gl.useProgram(this.prog); // not needed but good practice they say
        gl.uniform1i(this.swapYZUniformLoc, this.swapYZFlag);
        gl.uniform1i(this.showTexUniformLoc, this.showTextureFlag);
        gl.uniform1i(this.texLoadedUniformLoc, this.textureLoaded);
        gl.uniform1i(this.samplerUniformLoc, 0); 
	}

	setMesh( vertPos, texCoords )
	{
		this.numVertices = vertPos.length / 3; // 3 components (x,y,z) per vertex so we need to divide it by 3
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind buffer
	}

	swapYZ( swap )
	{
        this.swapYZFlag = swap;
		gl.uniform1i(this.swapYZUniformLoc, this.swapYZFlag); 
	}

	draw( trans )
	{
        if (this.numVertices === 0) return; // Don't draw if no buffer is set

        gl.useProgram(this.prog);
        gl.uniformMatrix4fv(this.mvpUniformLoc, false, trans); // passing the trans matrix to the vertex shader

        
		// Bind the vertex buffer and the texture buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer(this.posAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.posAttribLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
        gl.vertexAttribPointer(this.texAttribLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.texAttribLoc);

        // Activate texture unit 0 and bind the texture if there is a texture
		if (this.textureLoaded) {
        	gl.activeTexture(gl.TEXTURE0);
        	gl.bindTexture(gl.TEXTURE_2D, this.texture);
		}
		// these needs to be update otherwise it doesn't swap or rotate or show the texture apparently
		gl.uniform1i(this.swapYZUniformLoc, this.swapYZFlag);
        gl.uniform1i(this.showTexUniformLoc, this.showTextureFlag);
        gl.uniform1i(this.texLoadedUniformLoc, this.textureLoaded);

		
		gl.drawArrays( gl.TRIANGLES, 0, this.numVertices );

        // Clean up 
        gl.disableVertexAttribArray(this.posAttribLoc);
        gl.disableVertexAttribArray(this.texAttribLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
	}

	
	setTexture( img )
	{
        // standard loading of the texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );

        // repeat the texure if the texture is smaller than the object
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); 
        
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); // trilinear filtering for minification
		gl.generateMipmap(gl.TEXTURE_2D);
        
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // bilinear filtering for magnification

        // Unbind the texture and update the shader
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.textureLoaded = true;
        gl.uniform1i(this.texLoadedUniformLoc, this.textureLoaded);
	}

	showTexture( show )
	{
        this.showTextureFlag = show;
		gl.uniform1i(this.showTexUniformLoc, this.showTextureFlag);
	}
}