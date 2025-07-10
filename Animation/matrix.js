
function MatrixMult( A, B ) {
    const out = mat4.create(); // gl-matrix functions require a destination matrix
    mat4.multiply(out, A, B);
    return out;
}

function IdentityMatrix() {
    return mat4.create();
}

function TranslationMatrix(x, y, z) {
    const out = mat4.create();
    mat4.fromTranslation(out, [x, y, z]);
    return out;
}

function RotationXMatrix(angle) {
    const out = mat4.create();
    mat4.fromXRotation(out, angle);
    return out;
}

function RotationYMatrix(angle) {
    const out = mat4.create();
    mat4.fromYRotation(out, angle);
    return out;
}

function ScalingMatrix(sx, sy, sz) {
    const out = mat4.create();
    mat4.fromScaling(out, [sx, sy, sz]);
    return out;
}

function LookAtMatrix(eye, center, up) {
    const out = mat4.create();
    mat4.lookAt(out, eye, center, up);
    return out;
}


function ViewMatrix( translationX, translationY, translationZ, rotationX, rotationY ) {
    const translateMatrix = TranslationMatrix(translationX, translationY, -translationZ);
    const rotYMatrix = RotationYMatrix(rotationY);
    const rotXMatrix = RotationXMatrix(rotationX);
    const rotationMatrix = MatrixMult(rotYMatrix, rotXMatrix);
    const finalMatrix = MatrixMult(translateMatrix, rotationMatrix);
    
	return finalMatrix;
}

function ViewProjectionMatrix( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY ) {
    const trans = ViewMatrix(translationX, translationY, translationZ, rotationX, rotationY);
	const mvp = MatrixMult(projectionMatrix, trans);
	return mvp;
}


function invertMatrix(m) {
    const out = mat4.create();
    if (mat4.invert(out, m)) {
        return out;
    }
    return null; 
}