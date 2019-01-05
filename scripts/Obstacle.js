
class Obstacle {

    constructor() {
        this.obstacleVertexPositionBuffer = null;
        this.obstacleVertexTextureCoordBuffer = null;
        this.obstacleVertexIndexBuffer = null;
        this.obstacleTexture = null;
        this.positionMatrix = this.setPositionMatrix();
        // 0 - add time, 1 - decrease time, 2 - give life, 3 - take life
        this.obstacleType = this.returnRandomObstacleType();
    }

    getObstacleType() {
        return this.obstacleType;
    }

    getPositionMatrix() {
        return this.positionMatrix;
    }
    getTexture() {
        return this.obstacleTexture;
    }
    getObstacleVertexPositionBuffer() {
        return this.obstacleVertexPositionBuffer;
    }
    getObstacleVertexTextureCoordBuffer() {
        return this.obstacleVertexTextureCoordBuffer;
    }
    getObstacleVertexIndexBuffer() {
        return this.obstacleVertexIndexBuffer;
    }

    setTexture(texture) {
        this.obstacleTexture = texture;
    }

    setVertexPositionBuffer(gl) {
        let somePositionBuffer;
        somePositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, somePositionBuffer);
        let vertices = [
            -0.1, -0.1, 0.1,
            0.1, -0.1, 0.1,
            0.1, 0.1, 0.1,
            -0.1, 0.1, 0.1,

            // Back face
            -0.1, -0.1, -0.1,
            -0.1, 0.1, -0.1,
            0.1, 0.1, -0.1,
            0.1, -0.1, -0.1,

            // Top face
            -0.1, 0.1, -0.1,
            -0.1, 0.1, 0.1,
            0.1, 0.1, 0.1,
            0.1, 0.1, -0.1,

            // Bottom face
            -0.1, -0.1, -0.1,
            0.1, -0.1, -0.1,
            0.1, -0.1, 0.1,
            -0.1, -0.1, 0.1,

            // Right face
            0.1, -0.1, -0.1,
            0.1, 0.1, -0.1,
            0.1, 0.1, 0.1,
            0.1, -0.1, 0.1,

            // Left face
            -0.1, -0.1, -0.1,
            -0.1, -0.1, 0.1,
            -0.1, 0.1, 0.1,
            -0.1, 0.1, -0.1,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        somePositionBuffer.itemSize = 3;
        somePositionBuffer.numItems = 24;
        this.obstacleVertexPositionBuffer = somePositionBuffer;
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
        this.obstacleVertexTextureCoordBuffer = someVertexCoordBuffer;
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
        this.obstacleVertexIndexBuffer = someIndexBuffer;
    }

    setPositionMatrix() {
        return [this.returnRandomPosition(), 0.3, this.returnRandomPosition()];
    }

    returnRandomPosition() {
        let generatedNum = (Math.random() * (11.0));
        return Math.floor(Math.random() * 2) == 1 ? generatedNum * -1 : generatedNum;
    }

    returnRandomObstacleType() {
        return Math.floor(Math.random() * 4);
    }

    checkIfCollisionWithUser(xUser, zUser) {
        let xTree = this.getPositionMatrix()[0];
        let zTree = this.getPositionMatrix()[2];

        let leftSide = xTree - 0.3;
        let rightSide = xTree + 0.3;

        let bottomSide = zTree - 0.3;
        let topSide = zTree + 0.3;

        if (xUser > leftSide && xUser < rightSide &&
            zUser > bottomSide && zUser < topSide) {
            return true;
        }
        return false;
    }

}
