const VertexShader = `
    attribute vec3 a_position;
    attribute vec3 a_normal;
    attribute vec2 a_texCoord;

    uniform mat4 mvp;
    uniform mat4 model; 

    varying vec3 v_normal;
    varying vec3 v_fragPos;
    varying vec2 v_texCoord;
    
    void main() {
        vec4 worldPos = model * vec4(a_position, 1.0);
        v_fragPos = worldPos.xyz;
        gl_Position = mvp * worldPos;
        v_normal = normalize(mat3(model) * a_normal);
        v_texCoord = a_texCoord;
    }
`;

const FragmentShader = `
    precision mediump float;

    varying vec3 v_normal;
    varying vec3 v_fragPos;
    varying vec2 v_texCoord;

    uniform vec4 u_color;      // The ball's default solid color
    uniform vec3 u_lightPos;   
    uniform vec3 u_viewPos;    
    uniform sampler2D u_sampler;
    uniform bool u_useTexture; // ADDED: A flag to switch between color and texture

    void main() {
        vec3 baseColor;
        if (u_useTexture) {
            baseColor = texture2D(u_sampler, v_texCoord).rgb;
        } else {
            baseColor = u_color.rgb;
        }
        
        // --- base color ---
        float ambientStrength = 0.1;
        vec3 ambientColor = ambientStrength * baseColor;

        // --- Diffuse calculation ---
        vec3 norm = normalize(v_normal); 
        vec3 lightDir = normalize(u_lightPos - v_fragPos);
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuseColor = diff * baseColor;

        // --- Specular calculation---
        float specularStrength = 0.8; 
        float shininess = 32.0;      
        vec3 viewDir = normalize(u_viewPos - v_fragPos);
        vec3 halfwayDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(norm, halfwayDir), 0.0), shininess);
        vec3 specularColor = specularStrength * spec * vec3(1.0, 1.0, 1.0);

        // Combine components
        vec3 finalColor = ambientColor + diffuseColor + specularColor;
        
        // Set the final fragment color
        gl_FragColor = vec4(finalColor, u_color.a);
    }
`; 

class BallDrawer
{
    constructor()
    {
        this.prog = InitShaderProgram( VertexShader, FragmentShader );

        // ... (Attribute locations are the same)
        this.posAttribLoc = gl.getAttribLocation( this.prog, 'a_position' );
        this.normAttribLoc = gl.getAttribLocation( this.prog, 'a_normal' );
        this.texCoordAttribLoc = gl.getAttribLocation(this.prog, 'a_texCoord');

        // Uniform locations
        this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
        this.model = gl.getUniformLocation( this.prog, 'model' );
        this.mv = gl.getUniformLocation( this.prog, 'mv' );
        this.colorUniformLoc = gl.getUniformLocation( this.prog, 'u_color' );
        this.lightPosUniformLoc = gl.getUniformLocation( this.prog, 'u_lightPos' );
        this.samplerLoc = gl.getUniformLocation(this.prog, 'u_sampler');
        this.useTextureLoc = gl.getUniformLocation(this.prog, 'u_useTexture'); // ADDED

        // ... (The rest of the constructor is unchanged from the previous "file input" answer)
        const { vertices, indices, normals, texCoords } = this.createSphereData(1.0, 16, 16);
        this.numIndices = indices.length;
        this.vertBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        this.textures = {}; 
        this.texturesReady = {};
    }

    draw( mvp, mv , modelMatrix, color, lightPos, useTexture )
    {
        if (this.numIndices === 0) return;

        gl.useProgram(this.prog);

        // Set uniforms
        gl.uniformMatrix4fv(this.mvp , false, mvp);
        gl.uniformMatrix4fv(this.mv, false, mv); 
        gl.uniformMatrix4fv(this.model ,false, modelMatrix); 
        gl.uniform4fv(this.colorUniformLoc, color);
        gl.uniform3fv(this.lightPosUniformLoc, lightPos);
        gl.uniform1i(this.samplerLoc, 0); 
        gl.uniform1i(this.useTextureLoc, useTexture ? 1 : 0); 

        // Bind attributes (this code is identical to before)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer(this.posAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.posAttribLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.normAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.normAttribLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.vertexAttribPointer(this.texCoordAttribLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.texCoordAttribLoc);
        
        // Draw the sphere
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements( gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0 );
    }

    loadSingleTexture(url, typeName) {
        this.texturesReady[typeName] = false;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
        this.textures[typeName] = texture;
        const image = new Image();
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.textures[typeName]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            this.texturesReady[typeName] = true;
        };
        image.onerror = () => { console.error(`Failed to load texture for '${typeName}' from provided data.`); }
        image.src = url;
    }
    createSphereData(radius, lats, longs) {
        let vertices = [], indices = [], normals = [], texCoords = [];
        for (let i = 0; i <= lats; i++) {
            let latAngle = Math.PI / lats * i, sinLat = Math.sin(latAngle), cosLat = Math.cos(latAngle);
            for (let j = 0; j <= longs; j++) {
                let longAngle = 2 * Math.PI / longs * j, sinLong = Math.sin(longAngle), cosLong = Math.cos(longAngle);
                vertices.push(radius * sinLat * cosLong, radius * cosLat, radius * sinLat * sinLong);
                normals.push(sinLat * cosLong, cosLat, sinLat * sinLong);
                texCoords.push(1 - (j / longs), 1 - (i / lats));
            }
        }
        for (let i = 0; i < lats; i++) {
            for (let j = 0; j < longs; j++) {
                let first = (i * (longs + 1)) + j, second = first + longs + 1;
                indices.push(first, second, first + 1, second, second + 1, first + 1);
            }
        }
        return { vertices, indices, normals, texCoords };
    }
    setTexture( img ) {}
}