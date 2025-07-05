const VertexShader = `
    attribute vec3 a_position;
    attribute vec3 a_normal;

    uniform mat4 u_mvp;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_viewMatrix;

    varying vec3 v_normal;
    varying vec3 v_fragPos;
    varying vec3 v_viewPos;

    void main() {
        // Transform position to world space
        vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
        v_fragPos = worldPos.xyz;
        
        // Transform to clip space
        gl_Position = u_mvp * vec4(a_position, 1.0);
        
        // Transform normal to world space
        v_normal = normalize(mat3(u_modelMatrix) * a_normal);
        
        // Extract view position from view matrix (camera position in world space)
        v_viewPos = vec3(u_viewMatrix[3][0], u_viewMatrix[3][1], u_viewMatrix[3][2]);
    }
`;

const FragmentShader = `
    precision mediump float;

    uniform vec4 u_color;      
    uniform vec3 u_lightPos;   // Light position in world space

    varying vec3 v_normal;
    varying vec3 v_fragPos;    // Fragment position in world space
    varying vec3 v_viewPos;    // Camera position in world space

    void main() {
        // --- Lighting Constants ---
        float ambientStrength = 0.1;
        vec3 lightColor = vec3(1.0, 1.0, 1.0);
        float shininess = 50.0;

        // --- Ambient Component ---
        vec3 ambient = ambientStrength * lightColor;

        // --- Diffuse Component ---
        vec3 norm = normalize(v_normal);
        vec3 lightDir = normalize(u_lightPos - v_fragPos);
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * lightColor;

        // --- Specular Component (Blinn-Phong) ---
        vec3 viewDir = normalize(v_viewPos - v_fragPos);
        vec3 halfwayDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(norm, halfwayDir), 0.0), shininess);
        vec3 specular = spec * lightColor; 

        // --- Final Color ---
        vec3 result = (ambient + diffuse) * u_color.rgb + specular;
        gl_FragColor = vec4(result, u_color.a);
    }
`; 

class MeshDrawer
{
    constructor()
    {
        this.prog = InitShaderProgram( VertexShader, FragmentShader );

        this.posAttribLoc = gl.getAttribLocation( this.prog, 'a_position' );
        this.normAttribLoc = gl.getAttribLocation( this.prog, 'a_normal' );
        this.mvpUniformLoc = gl.getUniformLocation( this.prog, 'u_mvp' );
        this.modelMatrixUniformLoc = gl.getUniformLocation( this.prog, 'u_modelMatrix' );
        this.viewMatrixUniformLoc = gl.getUniformLocation( this.prog, 'u_viewMatrix' );
        this.colorUniformLoc = gl.getUniformLocation( this.prog, 'u_color' );
        this.lightPosUniformLoc = gl.getUniformLocation( this.prog, 'u_lightPos' );
        
        const { vertices, indices, normals } = this.createSphereData(SPHERE_RADIOUS, 16, 16);
        this.numIndices = indices.length;

        this.vertBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    }

    createSphereData(radius, lats, longs) {
        let vertices = [];
        let indices = [];
        let normals = [];

        for (let i = 0; i <= lats; i++) {
            let latAngle = Math.PI / lats * i;
            let sinLat = Math.sin(latAngle);
            let cosLat = Math.cos(latAngle);

            for (let j = 0; j <= longs; j++) {
                let longAngle = 2 * Math.PI / longs * j;
                let sinLong = Math.sin(longAngle);
                let cosLong = Math.cos(longAngle);

                let x = radius * sinLat * cosLong;
                let y = radius * cosLat;
                let z = radius * sinLat * sinLong;
                vertices.push(x, y, z);

                let nx = x / radius;
                let ny = y / radius;
                let nz = z / radius;
                normals.push(nx, ny, nz);
            }
        }

        for (let i = 0; i < lats; i++) {
            for (let j = 0; j < longs; j++) {
                let first = (i * (longs + 1)) + j;
                let second = first + longs + 1;
                
                indices.push(first, second, first + 1, second, second + 1, first + 1);
            }
        }
        return { vertices, indices, normals };
    }

    draw( mvp, modelMatrix, viewMatrix, color, lightPos )
    {
        if (this.numIndices === 0) return;

        gl.useProgram(this.prog);

        gl.uniformMatrix4fv(this.mvpUniformLoc, false, mvp);
        gl.uniformMatrix4fv(this.modelMatrixUniformLoc, false, modelMatrix);
        gl.uniformMatrix4fv(this.viewMatrixUniformLoc, false, viewMatrix);
        gl.uniform4fv(this.colorUniformLoc, color);
        gl.uniform3fv(this.lightPosUniformLoc, lightPos);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer(this.posAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.posAttribLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.normAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.normAttribLoc);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements( gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0 );

        gl.disableVertexAttribArray(this.posAttribLoc);
        gl.disableVertexAttribArray(this.normAttribLoc); 
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    setTexture( img ) {}
}