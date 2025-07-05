// Vertex shader source code
var boxVS = `
	attribute vec3 pos;
	uniform mat4 mvp;
	void main()
	{
		gl_Position = mvp * vec4(pos,1);
	}
`;
// Fragment shader source code
var boxFS = `
	precision mediump float;
	void main()
	{
		gl_FragColor = vec4(1,1,1,1); // White color
	}
`;


class BoxDrawer {
	constructor()
	{
		// Compile the shader program
		this.prog = InitShaderProgram( boxVS, boxFS );
		
		// Get the ids of the uniform variables in the shaders
		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
		
		// Get the ids of the vertex attributes in the shaders
		this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
		
		// Create the buffer objects
		
		this.vertbuffer = gl.createBuffer();
		var pos = [
			-2, -1, -2, // 0
			-2, -1,  2, // 1
			-2,  1, -2, // 2
			-2,  1,  2, // 3
			 2, -1, -2, // 4
			 2, -1,  2, // 5
			 2,  1, -2, // 6
			 2,  1,  2  // 7
		];
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

		this.linebuffer = gl.createBuffer();
		var line = [
			0,1,   1,3,   3,2,   2,0, // Bottom/Top face edges (or front/back depending on initial orientation)
			4,5,   5,7,   7,6,   6,4, // Other face edges
			0,4,   1,5,   3,7,   2,6,  // Connecting edges

		];
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(line), gl.STATIC_DRAW);
	}
	draw( trans )
	{
		// Draw the line segments
		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp, false, trans ); // Pass the MVP matrix
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertbuffer );
		gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 ); // Define how 'pos' is read
		gl.enableVertexAttribArray( this.vertPos ); // Enable the 'pos' attribute
		gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.linebuffer );
		gl.drawElements( gl.LINES, 24, gl.UNSIGNED_BYTE, 0 ); // Draw 12 lines (24 indices)
	}
}
