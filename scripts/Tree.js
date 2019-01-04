// Tree class

class Tree {

    constructor() {
        this.treeVertexPositionBuffer = null;
        this.treeVertexTextureCoordBuffer = null;
        this.treeVertexIndexBuffer = null;
        this.treeTexture = null;
        this.positionMatrix = this.setPositionMatrix();
    }
    getPositionMatrix() {
        return this.positionMatrix;
    }
    getTexture() {
        return this.treeTexture;
    }
    getTreeVertexPositionBuffer() {
        return this.treeVertexPositionBuffer;
    }
    getTreeVertexTextureCoordBuffer() {
        return this.treeVertexTextureCoordBuffer;
    }
    getTreeVertexIndexBuffer() {
        return this.treeVertexIndexBuffer;
    }

    setTexture(texture) {
        this.treeTexture = texture;
    }

    setVertexPositionBuffer(buffer) {
        this.treeVertexPositionBuffer = buffer;
    }
    setVertexTextureCoordBuffer(buffer) {
        this.treeVertexTextureCoordBuffer = buffer;
    }
    setVertexIndexBuffer(buffer) {
        this.treeVertexIndexBuffer = buffer;
    }

    setPositionMatrix() {
        return [this.returnRandomPosition(), 1.0, this.returnRandomPosition()];
    }

    returnRandomPosition() {
        let generatedNum = (Math.random() * (11.0));
        return Math.floor(Math.random() * 2) == 1 ? generatedNum * -1 : generatedNum;
    }

    checkIfCollisionWithUser(xUser, zUser) {
        let xTree = this.getPositionMatrix()[0];
        let zTree = this.getPositionMatrix()[2];

        let leftSide = xTree - 1.05;
        let rightSide = xTree + 1.05;

        let bottomSide = zTree - 1.05;
        let topSide = zTree + 1.05;

        if (xUser > leftSide && xUser < rightSide &&
            zUser > bottomSide && zUser < topSide) {
            return true;
        }
        return false;
    }
}
