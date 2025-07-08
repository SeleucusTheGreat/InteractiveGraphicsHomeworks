const VertexShader = `
    attribute vec3 a_position;
    attribute vec3 a_normal;

    uniform mat4 mvp;
    uniform mat4 model; 

    varying vec3 v_normal;
    varying vec3 v_fragPos;
    
    void main() {
        // Transform position to world space using the model matrix
        vec4 worldPos = model * vec4(a_position, 1.0);
        v_fragPos = worldPos.xyz;
        
        // Transform to clip space using the full Model-View-Projection matrix
        gl_Position = mvp * worldPos;
        
        // Transform normal to world space (using the model matrix)
        // Using mat3 avoids issues with non-uniform scaling, though we use uniform scaling here.
        v_normal = normalize(mat3(model) * a_normal);
    }
`;

const FragmentShader = `
    precision mediump float;

    
    varying vec3 v_normal;    // World-space normal
    varying vec3 v_fragPos;   // World-space fragment position


    uniform vec4 u_color;      // Base color 
    uniform vec3 u_lightPos;   // Light position in world space
    uniform vec3 u_viewPos;    // Camera position in world space

    void main() {
        // --- Lighting properties ---

        float ambientStrength = 0.1;
        vec3 ambientColor = ambientStrength * u_color.rgb;

        // --- Diffuse calculation ---
        
        vec3 norm = normalize(v_normal); 
        vec3 lightDir = normalize(u_lightPos - v_fragPos);
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuseColor = diff * u_color.rgb;

        // --- Specular calculation---

        float specularStrength = 0.8; 
        float shininess = 32.0;      
        vec3 viewDir = normalize(u_viewPos - v_fragPos);  // view vector
        vec3 halfwayDir = normalize(lightDir + viewDir); // halfway vector
        float spec = pow(max(dot(norm, halfwayDir), 0.0), shininess); // specular factor
        vec3 specularColor = specularStrength * spec * vec3(1.0, 1.0, 1.0);


        // Combine ambient, diffuse, and specular components
        vec3 finalColor = ambientColor + diffuseColor + specularColor;
        
        // Set the final fragment color, retaining the original alpha
        gl_FragColor = vec4(finalColor, u_color.a);
    }
`; 

class BallDrawer
{
    constructor()
    {
        this.prog = InitShaderProgram( VertexShader, FragmentShader );

        // Attribute locations
        this.posAttribLoc = gl.getAttribLocation( this.prog, 'a_position' );
        this.normAttribLoc = gl.getAttribLocation( this.prog, 'a_normal' );
        
        // Uniform locations
        this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
        this.model = gl.getUniformLocation( this.prog, 'model' ); // Changed from 'traslation'
        this.mv = gl.getUniformLocation( this.prog, 'mv' ); // This uniform is passed but not used in shader
        this.colorUniformLoc = gl.getUniformLocation( this.prog, 'u_color' );
        this.lightPosUniformLoc = gl.getUniformLocation( this.prog, 'u_lightPos' );
        
        const { vertices, indices, normals } = this.createSphereData(1.0, 16, 16);
        this.numIndices = indices.length;

        // --- Buffers ---
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

                // For a perfect sphere, normals are just normalized positions
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

    draw( mvp, mv , modelMatrix, color, lightPos )
    {

        if (this.numIndices === 0) return;

        gl.useProgram(this.prog);

        // Set uniforms
        gl.uniformMatrix4fv(this.mvp , false, mvp);
        gl.uniformMatrix4fv(this.mv, false, mv); // Still passing this, though unused in shader
        gl.uniformMatrix4fv(this.model ,false, modelMatrix); // Use the new 'model' uniform
        gl.uniform4fv(this.colorUniformLoc, color);
        gl.uniform3fv(this.lightPosUniformLoc, lightPos);

        // Bind and set vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer(this.posAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.posAttribLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.normAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.normAttribLoc);
        
        // Draw the sphere
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements( gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0 );

        // Clean up
        gl.disableVertexAttribArray(this.posAttribLoc);
        gl.disableVertexAttribArray(this.normAttribLoc); 
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    setTexture( img ) {}
}