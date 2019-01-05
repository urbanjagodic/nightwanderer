
class Target {

    constructor() {
        this.targetVertexPositionBuffer = null;
        this.targetVertexTextureCoordBuffer = null;
        this.targetVertexIndexBuffer = null;
        this.targetTexture = null;
        this.positionMatrix = this.setPositionMatrix();
        this.treePositions = [];
    }


    getPositionMatrix() {
        return this.positionMatrix;
    }
    getTexture() {
        return this.targetTexture;
    }
    getTargetVertexPositionBuffer() {
        return this.targetVertexPositionBuffer;
    }
    getTargetVertexTextureCoordBuffer() {
        return this.targetVertexTextureCoordBuffer;
    }
    getTargetVertexIndexBuffer() {
        return this.targetVertexIndexBuffer;
    }

    setTexture(texture) {
        this.targetTexture = texture;
    }

    setVertexPositionBuffer(gl) {
        let somePositionBuffer;
        somePositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, somePositionBuffer);
        let vertices = [
            -0.05, -0.05, 0.05,
            0.05, -0.05, 0.05,
            0.05, 0.05, 0.05,
            -0.05, 0.05, 0.05,

            // Back face
            -0.05, -0.05, -0.05,
            -0.05, 0.05, -0.05,
            0.05, 0.05, -0.05,
            0.05, -0.05, -0.05,

            // Top face
            -0.05, 0.05, -0.05,
            -0.05, 0.05, 0.05,
            0.05, 0.05, 0.05,
            0.05, 0.05, -0.05,

            // Bottom face
            -0.05, -0.05, -0.05,
            0.05, -0.05, -0.05,
            0.05, -0.05, 0.05,
            -0.05, -0.05, 0.05,

            // Right face
            0.05, -0.05, -0.05,
            0.05, 0.05, -0.05,
            0.05, 0.05, 0.05,
            0.05, -0.05, 0.05,

            // Left face
            -0.05, -0.05, -0.05,
            -0.05, -0.05, 0.05,
            -0.05, 0.05, 0.05,
            -0.05, 0.05, -0.05,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        somePositionBuffer.itemSize = 3;
        somePositionBuffer.numItems = 24;
        this.targetVertexPositionBuffer = somePositionBuffer;
    }
    setVertexTextureCoordBuffer(gl) {
        let someVertexCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, someVertexCoordBuffer);
        let textureCoordinates = [
            // Front
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Back
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Top
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Bottom
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Right
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Left
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
        someVertexCoordBuffer.itemSize = 2;
        someVertexCoordBuffer.numItems = 24;
        this.targetVertexTextureCoordBuffer = someVertexCoordBuffer;
    }
    setVertexIndexBuffer(gl) {
        let someIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, someIndexBuffer);

        // This array defines each face as two triangles, using the
        // indices into the vertex array to specify each triangle's
        // position.
        var treeVertexIndices = [
            0, 1, 2, 0, 2, 3,    // Front face
            4, 5, 6, 4, 6, 7,    // Back face
            8, 9, 10, 8, 10, 11,  // Top face
            12, 13, 14, 12, 14, 15, // Bottom face
            16, 17, 18, 16, 18, 19, // Right face
            20, 21, 22, 20, 22, 23  // Left face
        ];

        // Now send the element array to GL
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(treeVertexIndices), gl.STATIC_DRAW);
        someIndexBuffer.itemSize = 1;
        someIndexBuffer.numItems = 36;
        this.targetVertexIndexBuffer = someIndexBuffer;
    }

    setPositionMatrix() {
        return [this.returnRandomPosition(), 0.4, this.returnRandomPosition()];
    }

    returnRandomPosition() {
        let generatedNum = (Math.random() * (11.0));
        return Math.floor(Math.random() * 2) == 1 ? generatedNum * -1 : generatedNum;
    }
    returnRandomTargetType() {
        return Math.floor(Math.random() * 4);
    }

    checkIfCollisionWithUser(xUser, zUser) {
        let xTree = this.getPositionMatrix()[0];
        let zTree = this.getPositionMatrix()[2];

        let leftSide = xTree - 0.1;
        let rightSide = xTree + 0.1;

        let bottomSide = zTree - 0.1;
        let topSide = zTree + 0.1;

        if (xUser > leftSide && xUser < rightSide &&
            zUser > bottomSide && zUser < topSide) {
            return true;
        }
        return false;
    }

    checkIfCollisionWithATree(treePosition) {
        this.treePositions.push(treePosition);

        let xPosition = this.getPositionMatrix()[0];
        let zPosition = this.getPositionMatrix()[2];

        for (let myTreePosition of this.treePositions) {
            let xTree = myTreePosition.treeX;
            let zTree = myTreePosition.treeZ;

            let leftSide = xTree - 1.05;
            let rightSide = xTree + 1.05;

            let bottomSide = zTree - 1.05;
            let topSide = zTree + 1.05;

            if ((xPosition > leftSide && xPosition < rightSide &&
                zPosition > bottomSide && zPosition < topSide)) {
                return true;
            }
        }
        return false;
    }

}
