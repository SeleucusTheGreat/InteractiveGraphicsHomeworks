//import * as math from 'mathjs';
// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform( positionX, positionY, rotation, scale )
{
	angle = rotation * (Math.PI / 180);
    cos_alpha = math.cos(angle);
    sin_alpha = math.sin(angle);

	const scaleMatrix = math.matrix([
        [scale,   0,   0],
        [0,     scale, 0],
        [0,       0,   1]
    ]);

	const rotationMatrix = math.matrix([
        [cos_alpha, -sin_alpha, 0],
        [sin_alpha, cos_alpha,  0],
        [0,              0,     1]
    ]);

	const translationMatrix = math.matrix([
        [1, 0, positionX],
        [0, 1, positionY],
        [0, 0, 1]
    ]);

	scale_rotation = math.multiply(rotationMatrix, scaleMatrix);
    finalMatrix = math.multiply(translationMatrix, scale_rotation);

	return [
        finalMatrix.get([0, 0]), finalMatrix.get([1, 0]), finalMatrix.get([2, 0]),
        finalMatrix.get([0, 1]), finalMatrix.get([1, 1]), finalMatrix.get([2, 1]),
        finalMatrix.get([0, 2]), finalMatrix.get([1, 2]), finalMatrix.get([2, 2])
    ];
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform( trans1, trans2 ) 
{
	const matrix1 = math.matrix([
        [trans1[0], trans1[3], trans1[6]],
        [trans1[1], trans1[4], trans1[7]],
        [trans1[2], trans1[5], trans1[8]]
    ]);
    
    const matrix2 = math.matrix([
        [trans2[0], trans2[3], trans2[6]],
        [trans2[1], trans2[4], trans2[7]],
        [trans2[2], trans2[5], trans2[8]]
    ]);
    
    resultMatrix = math.multiply(matrix2, matrix1);
     
    return [
        resultMatrix.get([0, 0]), resultMatrix.get([1, 0]), resultMatrix.get([2, 0]),
        resultMatrix.get([0, 1]), resultMatrix.get([1, 1]), resultMatrix.get([2, 1]),
        resultMatrix.get([0, 2]), resultMatrix.get([1, 2]), resultMatrix.get([2, 2])
    ];
}

