// Global variable definitionvar canvas;
var canvas;
var gl;
var shaderProgram;

// Buffers
var worldVertexPositionBuffer = null;
var worldVertexTextureCoordBuffer = null;
let skyVertexPositionBuffer = null;
let skyVertexTextureCoordBuffer = null;

let rotationCubeX = 0;
let rotationCubeY = 0;

var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var floorTexture;
let skyTexture;

var texturesLoaded = false;

let flashlightOn = true;
let pressedSpaceCounter = 0;
let lives = 4;
let collisionTime = 0;
let hitTree = false;

let trees = [];
for (let i = 0; i < 70; i++) {
    trees.push(new Tree());
}
let obstacles = [];
let rotationObstacleX = 0;
let rotationObstacleY = 0;
let hitObstaclesIndexes = [];
for (let i = 0; i < 45; i++) {
    obstacles.push(new Obstacle());
}
let timeInMillis = 0;

let target = new Target();
let rotationTargetX = 0;
let rotationTargetY = 0;
let rotationTargetZ = 0;

// Keyboard handling helper variable for reading the status of keys
var currentlyPressedKeys = {};

// Variables for storing current position and speed
var pitch = 0;
var pitchRate = 0;
var yaw = 0;
var yawRate = 0;
var xPosition = 0;
var yPosition = 0.4;
var zPosition = 0;
var speed = 0;
let jump = false;
let jumpStart = 0;

// Used to make us "jog" up and down as we move forward.
var joggingAngle = 0;

// Helper variable for animation
var lastTime = 0;
let treePositions = [];


//
// Matrix utility functions
//
// mvPush   ... push current matrix on matrix stack
// mvPop    ... pop top matrix from stack
// degToRad ... convert degrees to radians
//
function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

//
// initGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initGL(canvas) {
    var gl = null;
    try {
        // Try to grab the standard context. If it fails, fallback to experimental.
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) { }

    // If we don't have a GL context, give up now
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
    return gl;
}

//
// getShader
//
// Loads a shader program by scouring the current document,
// looking for a script with the specified ID.
//
function getShader(gl, id) {
    var shaderScript = document.getElementById(id);

    // Didn't find an element with the specified ID; abort.
    if (!shaderScript) {
        return null;
    }

    // Walk through the source element's children, building the
    // shader source string.
    var shaderSource = "";
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType == 3) {
            shaderSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    // Now figure out what type of shader script we have,
    // based on its MIME type.
    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;  // Unknown shader type
    }

    // Send the source to the shader object
    gl.shaderSource(shader, shaderSource);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    // Create the shader program
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program.");
    }

    // start using shading program for rendering
    gl.useProgram(shaderProgram);

    // store location of aVertexPosition variable defined in shader
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");

    // turn on vertex position attribute at specified position
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    // store location of aVertexNormal variable defined in shader
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");

    // store location of aTextureCoord variable defined in shader
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    // store location of uPMatrix variable defined in shader - projection matrix 
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    // store location of uMVMatrix variable defined in shader - model-view matrix 
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    // store location of uSampler variable defined in shader
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

//
// setMatrixUniforms
//
// Set the uniforms in shaders.
//
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//
// initTextures
//
function initTextures() {
    floorTexture = gl.createTexture();
    floorTexture.image = new Image();
    floorTexture.image.crossOrigin = "anonymous";
    floorTexture.image.onload = function () {
        handleTextureLoaded(floorTexture)
    }
    floorTexture.image.src = "../assets/forest_floor.png";

    skyTexture = gl.createTexture();
    skyTexture.image = new Image();
    skyTexture.image.crossOrigin = "anonymous";
    skyTexture.image.onload = function () {
        handleTextureLoaded(skyTexture)
    }
    skyTexture.image.src = "../assets/sky2.png";


    for (let myTree of trees) {
        let someTexture;
        someTexture = gl.createTexture();
        someTexture.image = new Image();
        someTexture.image.onload = function () {
            handleTextureLoaded(someTexture);
        };  // async loading


        someTexture.image.src = "../assets/tree_texture_" + randomTexture() + ".png";
        myTree.setTexture(someTexture);
    }

    for (let obstacle of obstacles) {
        let someTexture;
        someTexture = gl.createTexture();
        someTexture.image = new Image();
        someTexture.image.onload = function () {
            handleTextureLoaded(someTexture);
        };  // async loading

        let myImage;
        switch (obstacle.getObstacleType()) {
            case 0:
                myImage = "../assets/increase_time_texture.png";
                break;
            case 1:
                myImage = "../assets/decrease_time_texture.png";
                break;
            case 2:
                myImage = "../assets/give_life_texture.png";
                break;
            case 3:
                myImage = "../assets/take_life_texture.png";
        }
        someTexture.image.src = myImage;
        obstacle.setTexture(someTexture);
    }

    // target texture
    let someTargetTexture = gl.createTexture();
    someTargetTexture.image = new Image();
    someTargetTexture.image.crossOrigin = "anonymous";
    someTargetTexture.image.onload = function () {
        handleTextureLoaded(someTargetTexture)
    }
    someTargetTexture.image.src = "../assets/target_texture.png";
    target.setTexture(someTargetTexture);
}

function handleTextureLoaded(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // when texture loading is finished we can draw scene.
    texturesLoaded = true;
}

//
// handleLoadedWorld
//
// Initialisation of world 
//
function handleLoadedWorld(data) {
    var lines = data.split("\n");
    var vertexCount = 0;
    var vertexPositions = [];
    var vertexTextureCoords = [];
    var skyVertexCount = 0;
    var skyVertexPositions = [];
    var skyVertexTextureCoords = [];

    let addToSky = false;
    for (var i in lines) {
        var vals = lines[i].replace(/^\s+/, "").split(/\s+/);

        if (vals[0] == "SKY") {
            addToSky = true;
        }
        if (vals.length == 5 && vals[0] != "//") {
            // It is a line describing a vertex; get X, Y and Z first
            if (addToSky) {
                skyVertexPositions.push(parseFloat(vals[0]));
                skyVertexPositions.push(parseFloat(vals[1]));
                skyVertexPositions.push(parseFloat(vals[2]));

                // And then the texture coords
                skyVertexTextureCoords.push(parseFloat(vals[3]));
                skyVertexTextureCoords.push(parseFloat(vals[4]));
                skyVertexCount += 1;
            }
            else {
                vertexPositions.push(parseFloat(vals[0]));
                vertexPositions.push(parseFloat(vals[1]));
                vertexPositions.push(parseFloat(vals[2]));

                // And then the texture coords
                vertexTextureCoords.push(parseFloat(vals[3]));
                vertexTextureCoords.push(parseFloat(vals[4]));
                vertexCount += 1;
            }
        }
    }
    worldVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    worldVertexPositionBuffer.itemSize = 3;
    worldVertexPositionBuffer.numItems = vertexCount;

    worldVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
    worldVertexTextureCoordBuffer.itemSize = 2;
    worldVertexTextureCoordBuffer.numItems = vertexCount;

    // sky
    skyVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyVertexPositions), gl.STATIC_DRAW);
    skyVertexPositionBuffer.itemSize = 3;
    skyVertexPositionBuffer.numItems = skyVertexCount;

    skyVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
    skyVertexTextureCoordBuffer.itemSize = 2;
    skyVertexTextureCoordBuffer.numItems = skyVertexCount;


    // all the trees


    for (let myTree of trees) {

        let somePositionBuffer;
        let someVertexCoordBuffer;
        let someIndexBuffer;
    
        somePositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, somePositionBuffer);
        let vertices = [
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, -1.0, -1.0,

            // Top face
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,

            // Right face
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        somePositionBuffer.itemSize = 3;
        somePositionBuffer.numItems = 24;

        someVertexCoordBuffer = gl.createBuffer();
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

        // Build the element array buffer; this specifies the indices
        // into the vertex array for each face's vertices.
        someIndexBuffer = gl.createBuffer();
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

        myTree.setVertexPositionBuffer(somePositionBuffer);
        myTree.setVertexTextureCoordBuffer(someVertexCoordBuffer);
        myTree.setVertexIndexBuffer(someIndexBuffer);
    }

    // obstacles

    for (let obstacle of obstacles) {
        obstacle.setVertexPositionBuffer(gl);
        obstacle.setVertexTextureCoordBuffer(gl);
        obstacle.setVertexIndexBuffer(gl);
    }

    // target 
    target.setVertexPositionBuffer(gl);
    target.setVertexTextureCoordBuffer(gl);
    target.setVertexIndexBuffer(gl);
    
}


//
//
// Loading world 
//
function loadWorld() {
    var request = new XMLHttpRequest();
    request.open("GET", "../assets/world.txt");
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            handleLoadedWorld(request.responseText);
        }
    }
    request.send();
}


//
// drawScene
//
// Draw the scene.
//
function drawScene() {
    // set the rendering environment to full canvas size
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // If buffers are empty we stop loading the application.
    if (worldVertexTextureCoordBuffer == null || worldVertexPositionBuffer == null) {
        return;
    }

    // Establish the perspective with which we want to view the
    // scene. Our field of view is 45 degrees, with a width/height
    // ratio of 640:480, and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    mat4.identity(mvMatrix);

    // Now move the drawing position a bit to where we want to start
    // drawing the world.
    mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
    mat4.translate(mvMatrix, [-xPosition, -yPosition, -zPosition]);

    // Activate textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, floorTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, worldVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Draw the world by binding the array buffer to the world's vertices
    // array, setting attributes, and pushing it to GL.
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, worldVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Draw the world.
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, worldVertexPositionBuffer.numItems);

    // sky
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skyTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, skyVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, skyVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, skyVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, skyVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, skyVertexPositionBuffer.numItems);

    

    
    // random generated trees

    for (let myTree of trees) {

        mvPushMatrix();

        mat4.translate(mvMatrix, myTree.getPositionMatrix());
        // Save the current matrix, then rotate before we draw.
        //mat4.rotate(mvMatrix, degToRad(rotationCubeX), [0, 0, 1]);
        //mat4.rotate(mvMatrix, degToRad(rotationCubeY), [0, 1, 0]);

        // Draw the cube by binding the array buffer to the cube's vertices
        // array, setting attributes, and pushing it to GL.
        gl.bindBuffer(gl.ARRAY_BUFFER, myTree.getTreeVertexPositionBuffer());
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, myTree.getTreeVertexPositionBuffer().itemSize, gl.FLOAT, false, 0, 0);

        // Set the texture attribute for the vertices.
        gl.bindBuffer(gl.ARRAY_BUFFER, myTree.getTreeVertexTextureCoordBuffer());
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, myTree.getTreeVertexTextureCoordBuffer().itemSize, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, myTree.getTexture());
        gl.uniform1i(shaderProgram.samplerUniform, 0);

        // Draw the cube.
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, myTree.getTreeVertexIndexBuffer());
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, myTree.getTreeVertexIndexBuffer().numItems, gl.UNSIGNED_SHORT, 0);

        mvPopMatrix();
    }

    // random generated obstacles

    for (let i = 0; i < obstacles.length; i++) {

        if (!hitObstaclesIndexes.includes(i)) {

            let obstacle = obstacles[i];
            mvPushMatrix();

            mat4.translate(mvMatrix, obstacle.getPositionMatrix());
            // Save the current matrix, then rotate before we draw.
            mat4.rotate(mvMatrix, degToRad(rotationObstacleX), [1, 0, 0]);
            mat4.rotate(mvMatrix, degToRad(rotationObstacleY), [0, 1, 0]);

            // Draw the cube by binding the array buffer to the cube's vertices
            // array, setting attributes, and pushing it to GL.
            gl.bindBuffer(gl.ARRAY_BUFFER, obstacle.getObstacleVertexPositionBuffer());
            gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, obstacle.getObstacleVertexPositionBuffer().itemSize, gl.FLOAT, false, 0, 0);

            // Set the texture attribute for the vertices.
            gl.bindBuffer(gl.ARRAY_BUFFER, obstacle.getObstacleVertexTextureCoordBuffer());
            gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, obstacle.getObstacleVertexTextureCoordBuffer().itemSize, gl.FLOAT, false, 0, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, obstacle.getTexture());
            gl.uniform1i(shaderProgram.samplerUniform, 0);

            // Draw the cube.
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obstacle.getObstacleVertexIndexBuffer());
            setMatrixUniforms();
            gl.drawElements(gl.TRIANGLES, obstacle.getObstacleVertexIndexBuffer().numItems, gl.UNSIGNED_SHORT, 0);

            mvPopMatrix();
        }
    }

    // draw taget


    mat4.translate(mvMatrix, target.getPositionMatrix());
    // Save the current matrix, then rotate before we draw.
    mat4.rotate(mvMatrix, degToRad(rotationTargetY), [0, 1, 0]);
    mat4.rotate(mvMatrix, degToRad(rotationTargetZ), [0, 0, 1]);

    // Draw the cube by binding the array buffer to the cube's vertices
    // array, setting attributes, and pushing it to GL.
    gl.bindBuffer(gl.ARRAY_BUFFER, target.getTargetVertexPositionBuffer());
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, target.getTargetVertexPositionBuffer().itemSize, gl.FLOAT, false, 0, 0);

    // Set the texture attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, target.getTargetVertexTextureCoordBuffer());
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, target.getTargetVertexTextureCoordBuffer().itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target.getTexture());
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    // Draw the cube.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, target.getTargetVertexIndexBuffer());
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, target.getTargetVertexIndexBuffer().numItems, gl.UNSIGNED_SHORT, 0);


    /* ---------------------------------------------------------------- */

    // set position to x,y,z view elements of the screen
    document.getElementById("xPosition").innerHTML = xPosition.toFixed(2);
    document.getElementById("yPosition").innerHTML = yPosition.toFixed(2);
    document.getElementById("zPosition").innerHTML = zPosition.toFixed(2);

    if (flashlightOn) {
        document.getElementsByClassName("box")[0].style.background = "transparent";
        document.getElementsByClassName("box")[0].style.borderRadius = "300px";
    }
    else {
        document.getElementsByClassName("box")[0].style.background = "rgba(0, 0, 0, 0.95)";
        document.getElementsByClassName("box")[0].style.borderRadius = "0px";
    }

}

//
// animate
//
// Called every time before redeawing the screen.
//
function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;


        // jump functionality
        if (jump) {
            jumpStart = timeNow;
            jump = false;
        }
        let jumpTime = timeNow - jumpStart;
        if (jumpTime <= 300 && yPosition < 2.3) {
            yPosition += 0.05;
        }
        if (300 < jumpTime && yPosition > 0.45) {
            yPosition -= 0.08; 
        }

        /* Collision detection for the walls */

        if (xPosition > 11.6) {
            xPosition -= 0.04;
        }
        else if (xPosition < -11.6) {
            xPosition += 0.04;
        }
        if (zPosition > 11.6) {
            zPosition -= 0.04;
        }
        else if (zPosition < -11.6) {
            zPosition += 0.04;
        }
        if (yPosition > 11.5) {
            yPosition -= 0.05;
        }
        /* --------------------------------- */

        /* collision for trees, player loses a life if 
         * he hits a tree 
         * */

        for (let myTree of trees) {

            if (myTree.checkIfCollisionWithUser(xPosition, zPosition)) {
                if (collisionTime == 0) {
                    let lifeID = "life" + lives;
                    document.getElementById(lifeID).style.display = "none";
                    document.getElementById("healthMessage").innerHTML = "-1 life";
                    document.getElementById("healthMessage").style.color = "red";
                    document.getElementById("healthMessage").style.display = "block";
                    setTimeout(function () {
                        document.getElementById("healthMessage").style.display = "none";
                    }, 2500);
                    lives--;
                    playObstacleMusic(2);
                    collisionTime = timeNow;
                }
                else {
                    if ((timeNow - collisionTime) > 1200) {
                        collisionTime = 0;
                    }
                }
            }
        }
        /* -------------------------------- */

        /* collision detection for obstacles
         * if he hits:
         *    blue - increase time by 10s
         *    red -  decrease time by 10s
         *    green - add one life
         */

        for (let i = 0; i < obstacles.length; i++) {
            if (!hitObstaclesIndexes.includes(i)) {

                let timeMessage = document.getElementById("timeMessage");
                let healthMessage = document.getElementById("healthMessage");
                let addHitIndex = true;
                let obstacle = obstacles[i];

                if (obstacle.checkIfCollisionWithUser(xPosition, zPosition)) {
                    switch (obstacle.getObstacleType()) {
                        case 0:
                            timeInMillis -= 11000;
                            playObstacleMusic(1);
                            timeMessage.innerHTML = "+10s";
                            timeMessage.style.color = "green";
                            timeMessage.style.display = "block";
                            setTimeout(function () {
                                timeMessage.style.display = "none";
                            }, 2500);
                            break;
                        case 1:
                            timeInMillis += 9000;
                            playObstacleMusic(4);
                            timeMessage.innerHTML = "-10s";
                            timeMessage.style.color = "red";
                            timeMessage.style.display = "block";
                            setTimeout(function () {
                                timeMessage.style.display = "none";
                            }, 2500);
                            break;
                        case 2:
                            if (lives == 4) {
                                addHitIndex = false;
                                healthMessage.innerHTML = "Cannot pick item <br/> Maximum lives :)";
                                healthMessage.style.color = "orange";
                                healthMessage.style.display = "block";
                                setTimeout(function () {
                                    healthMessage.style.display = "none";
                                }, 2500);
                            }
                            else {
                                lives++;
                                playObstacleMusic(0);
                                document.getElementById("life" + lives).style.display = "inline-block";
                                healthMessage.innerHTML = "+1 life";
                                healthMessage.style.color = "green";
                                healthMessage.style.display = "block";
                                setTimeout(function () {
                                    healthMessage.style.display = "none";
                                }, 2500);
                            }
                            break;
                        case 3:
                            if (lives > 0) {
                                document.getElementById("life" + lives).style.display = "none";
                            }
                            playObstacleMusic(3);
                            healthMessage.innerHTML = "-1 life";
                            healthMessage.style.color = "red";
                            healthMessage.style.display = "block";
                            setTimeout(function () {
                                healthMessage.style.display = "none";
                            }, 2500);
                            lives--;
                            break;
                    }
                    if (addHitIndex)
                        hitObstaclesIndexes.push(i);
                }
            }
        }
        /* ------------------------------------------------------------------ */

        if (speed != 0) {
            xPosition -= Math.sin(degToRad(yaw)) * speed * elapsed;
            zPosition -= Math.cos(degToRad(yaw)) * speed * elapsed;
        }

        yaw += yawRate * elapsed;
        pitch += pitchRate * elapsed;

        rotationObstacleX += (90 * elapsed) / 1000.0;
        rotationObstacleY += (90 * elapsed) / 1000.0;

        rotationTargetZ += (400 * elapsed) / 1000.0;
        rotationTargetY += (400 * elapsed) / 1000.0;

    }
    lastTime = timeNow;
}

//
// Keyboard handling helper functions
//
// handleKeyDown    ... called on keyDown event
// handleKeyUp      ... called on keyUp event
//
function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
    // reseting the pressed state for individual key
    currentlyPressedKeys[event.keyCode] = false;
}

//
// handleKeys
//
// Called every time before redeawing the screen for keyboard
// input handling. Function continuisly updates helper variables.
//

function handleKeys() {
    if (currentlyPressedKeys[38]) {
        // Up key
        pitchRate = 0.1;
    } else if (currentlyPressedKeys[40]) {
        // Down key
        pitchRate = -0.1;
    } else {
        pitchRate = 0;
    }
    if (currentlyPressedKeys[65] || currentlyPressedKeys[37]) {
        // Left cursor key or A
        yawRate = 0.1;
    } else if (currentlyPressedKeys[68] || currentlyPressedKeys[39]) {
        // Right cursor key or D
        yawRate = -0.1;
    } else {
        yawRate = 0;
    }

    if (currentlyPressedKeys[87]) {
        //  W
        speed = 0.003;
    } else if (currentlyPressedKeys[83]) {
        // S
        speed = -0.003;
    } else {
        speed = 0;
    }
    // space key for jumping
    if (currentlyPressedKeys[32]) {
        jump = true;
    }
    // F key to turn on/off flashlight
    if (currentlyPressedKeys[70]) {
        if (flashlightOn) {
            setTimeout(function () {
                flashlightOn = false;
            }, 200)
        }
        else {
            setTimeout(function () {
                flashlightOn = true;
            }, 200)
        }
    }
    // C key to crouch
    if (currentlyPressedKeys[67]) {
        if (yPosition > 0.1)
            yPosition -= 0.01;
    }
    else {
        if (yPosition < 0.4)
            yPosition += 0.01;
    }
}


//
// start method of the game,
// called when user clicks the start button
//
function start() {

    timeInMillis = 0;
    let playAudio = true;
    canvas = document.getElementById("glcanvas");
    let startScreen = document.getElementsByClassName("startScreen")[0];
    let myAudio = new Audio("../assets/background_music.mp3");
    myAudio.volume = 0.2;
    let audioIcon = document.getElementById("soundButton");
    audioIcon.src = "../assets/sound_on.png";

    audioIcon.onclick = function () {
        if (playAudio) {
            audioIcon.src = "../assets/turn_off.png";
            myAudio.pause();
            playAudio = false;
        }
        else {
            audioIcon.src = "../assets/sound_on.png";
            myAudio.play();
            playAudio = true;
        }
    }
    myAudio.loop = true;
    myAudio.play();
    startScreen.style.display = "none";
    gl = initGL(canvas); 

    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);                      
        gl.clearDepth(1.0);                                     
        gl.enable(gl.DEPTH_TEST);                               
        gl.depthFunc(gl.LEQUAL);                               

        initShaders();
        initTextures();
        loadWorld();

        /* generate random start position of the player */
        xPosition = returnRandomPosition();
        zPosition = returnRandomPosition();
        while (target.checkIfCollisionWithUser(xPosition, zPosition)) {
            target.setPositionMatrix();
        }

        /* generate positions of the player, so that it doesnt collide with and of the tree
         * starting position of the player and position of the target object
         * */
        for (let myTree of trees) {
            while (collisionWithATree({
                treeX: myTree.getPositionMatrix()[0],
                treeZ: myTree.getPositionMatrix()[2]
            })) {
                xPosition = returnRandomPosition();
                zPosition = returnRandomPosition();
            }
        }
        for (let myTree of trees) {
            while (target.checkIfCollisionWithATree({
                treeX: myTree.getPositionMatrix()[0],
                treeZ: myTree.getPositionMatrix()[2]
            })) {
                target.setPositionMatrix();
            }
        }

        document.onkeydown = handleKeyDown;
        document.onkeyup = handleKeyUp;

        let beginTime = 0;

        // Set up to draw the scene periodically.
        let gameInterval = setInterval(function () {
            if (texturesLoaded) {
                timeInMillis += 10;
                beginTime += 10;
                if (timeInMillis % 1000 == 0) {
                    let currentTime = 60 - (timeInMillis / 1000);
                    document.getElementById("currentTime").innerHTML = currentTime + " ";
                }
                // color time red if less than 10 seconds
                if (timeInMillis >= 50000) {
                    document.getElementsByClassName("timeDiv")[0].style.color = "red";
                }

                // collision with target causes to win the game
                if (target.checkIfCollisionWithUser(xPosition, zPosition)) {
                    myAudio.pause();
                    document.getElementById("winTime").innerHTML = Math.floor((beginTime / 1000));
                    showWinningScreen();
                    document.getElementsByClassName("timeDiv")[0].style.color = "white";
                    document.getElementById("currentTime").innerHTML = "60 ";
                    // reinitialize obstacles
                    /*hitObstaclesIndexes = [];
                    obstacles = [];
                    for (let i = 0; i < 45; i++) {
                        obstacles.push(new Obstacle());
                    }*/
                    lives = 4;
                    for (let i = 1; i <= 4; i++) {
                        document.getElementById("life" + i).style.display = "inline-block";
                    }
                    clearInterval(gameInterval);
                }

                // end of the game after 60 seconds 
                if (timeInMillis >= 60000 || lives < 1) {
                    myAudio.pause();
                    showEndScreen();
                    document.getElementsByClassName("timeDiv")[0].style.color = "white";
                    document.getElementById("currentTime").innerHTML = "60 ";
                    // reinitialize obstacles
                    /*hitObstaclesIndexes = [];
                    obstacles = [];
                    for (let i = 0; i < 45; i++) {
                        obstacles.push(new Obstacle());
                    }*/
                    lives = 4;
                    for (let i = 1; i <= 4; i++) {
                        document.getElementById("life" + i).style.display = "inline-block";
                    }
                    clearInterval(gameInterval);
                }
                requestAnimationFrame(animate);
                handleKeys();
                drawScene();
            }
        }, 10);
    }
}

function showInstructions() {
    let optionsInstructions = document.getElementsByClassName("optionsInstructions")[0];
    let optionsMenu = document.getElementsByClassName("optionsContainer")[0];
    optionsInstructions.style.display = "block";
    optionsMenu.style.display = "none";
}

function backToOptionsOne() {
    let optionsInstructions = document.getElementsByClassName("optionsInstructions")[0];
    let optionsMenu = document.getElementsByClassName("optionsContainer")[0];
    optionsInstructions.style.display = "none";
    optionsMenu.style.display = "inline-block";
}
function showCredits() {
    let optionsCredits = document.getElementsByClassName("optionsCredits")[0];
    let optionsMenu = document.getElementsByClassName("optionsContainer")[0];
    optionsCredits.style.display = "block";
    optionsMenu.style.display = "none";
}

function backToOptionsTwo() {
    let optionsCredits = document.getElementsByClassName("optionsCredits")[0];
    let optionsMenu = document.getElementsByClassName("optionsContainer")[0];
    optionsCredits.style.display = "none";
    optionsMenu.style.display = "inline-block";
}

function showControls() {
    let optionsCredits = document.getElementsByClassName("optionsControls")[0];
    let optionsMenu = document.getElementsByClassName("optionsContainer")[0];
    optionsCredits.style.display = "block";
    optionsMenu.style.display = "none";
}

function backToOptionsFromControls() {
    let optionsCredits = document.getElementsByClassName("optionsControls")[0];
    let optionsMenu = document.getElementsByClassName("optionsContainer")[0];
    optionsCredits.style.display = "none";
    optionsMenu.style.display = "inline-block";
}

function showEndScreen() {
    let endScreen = document.getElementsByClassName("endScreen")[0];
    let startScreen = document.getElementsByClassName("startScreen")[0];

    endScreen.style.display = "block";
    let timer = setTimeout(function () {
        startScreen.style.display = "block";
        endScreen.style.display = "none";
        clearTimeout(timer)
        }, 4000);
}

function showWinningScreen() {
    let winScreen = document.getElementsByClassName("winScreen")[0];
    let startScreen = document.getElementsByClassName("startScreen")[0];

    winScreen.style.display = "block";
    let timer = setTimeout(function () {
        startScreen.style.display = "block";
        winScreen.style.display = "none";
        clearTimeout(timer)
    }, 4000);
}


function hoverSound() {
    try {
        let hoverAudio = new Audio("../assets/sound_effect.mp3");
        hoverAudio.play();
    }
    catch {
        console.log("Problem with loading audio: ");
    }
}

function returnRandomPosition() {
    let generatedNum = (Math.random() * (11.45));
    return Math.floor(Math.random() * 2) == 1 ? generatedNum * -1 : generatedNum;
}

function randomTexture() {
    return Math.floor(Math.random() * 5) + 1;
}

function playObstacleMusic(flag) {
    let audioSrc;
    // added life
    if (flag == 0)
        audioSrc = "../assets/added_life.wav";
    // added time
    else if (flag == 1)
        audioSrc = "../assets/added_time.wav";
    // wall hit
    else if (flag == 2)
        audioSrc = "../assets/wall_hit.wav";
    // taken life
    else if (flag == 3)
        audioSrc = "../assets/taken_life.wav";
    // taken time
    else
        audioSrc = "../assets/taken_time.wav";

    let audioFile = new Audio(audioSrc);
    audioFile.play();
}

function collisionWithATree(treePosition) {
    treePositions.push(treePosition);
    for (let myTreePosition of treePositions) {
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