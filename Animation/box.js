var boxVS = `
	attribute vec3 pos;
	uniform mat4 mvp;
	void main()
	{
		gl_Position = mvp * vec4(pos,1);
	}
`;
var boxFS = `
	precision mediump float;
	void main()
	{
		gl_FragColor = vec4(1,1,1,1); 
	}
`;


class BoxDrawer {
	constructor()
	{
		this.prog = InitShaderProgram( boxVS, boxFS );
		
		// Get the ids of the uniform variables in the shaders
		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );

		// Get the id of the vertex position attribute
		this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
		this.vertexBuffers = {};

		// Standard Box Vertices
		const posStandard = [
			-2, -1, -2, // 0
			-2, -1,  2, // 1
			-2,  1, -2, // 2
			-2,  1,  2, // 3
			 2, -1, -2, // 4
			 2, -1,  2, // 5
			 2,  1, -2, // 6
			 2,  1,  2  // 7
		];
		this.vertexBuffers.standard = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.standard);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posStandard), gl.STATIC_DRAW);

		// Tall Box Vertices (top floor raised to y=10)
		const posTall = [
			-2, -1, -2, // 0
			-2, -1,  2, // 1
			-2, 10, -2, // 2
			-2, 10,  2, // 3
			 2, -1, -2, // 4
			 2, -1,  2, // 5
			 2, 10, -2, // 6
			 2, 10,  2  // 7
		];
		this.vertexBuffers.tall = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.tall);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posTall), gl.STATIC_DRAW);

		
		const posPool = [
			-4, -1, -4, // 0
			-4, -1,  4, // 1
			-4,  0, -4, // 2
			-4,  0,  4, // 3
			 4, -1, -4, // 4
			 4, -1,  4, // 5
			 4,  0, -4, // 6
			 4,  0,  4  // 7
		];
		this.vertexBuffers.pool = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.pool);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posPool), gl.STATIC_DRAW);
		this.linebuffer = gl.createBuffer();
		var line = [
			0,1,   1,3,   3,2,   2,0, 
			4,5,   5,7,   7,6,   6,4,
			0,4,   1,5,   3,7,   2,6, 
		];
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(line), gl.STATIC_DRAW);
	}
	draw( trans, boxType = 'standard' )
	{
		// Draw the line segments
		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp, false, trans ); // Pass the MVP matrix
		
		// draw the vertices for the specified box type
		const bufferToUse = this.vertexBuffers[boxType] || this.vertexBuffers.standard;
		gl.bindBuffer( gl.ARRAY_BUFFER, bufferToUse );
		gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertPos );

		// Draw the lines
		gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.linebuffer );
		gl.drawElements( gl.LINES, 24, gl.UNSIGNED_BYTE, 0 ); 
	}
}
