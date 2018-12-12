// Global variable definitionvar canvas;
var canvas;
var gl;
var shaderProgram;

// Buffers
var worldVertexPositionBuffer = null;
var worldVertexTextureCoordBuffer = null;
let treeVertexPositionBuffer = null;
let treeVertexColorBuffer = null;
let treeVertexIndexBuffer = null;

let skyVertexPositionBuffer = null;
let skyVertexTextureCoordBuffer = null;

let backwards = true;
let forward = true;
let left = true;
let right = true;

let rotationCube = 0;

let neki = false;


// Model-view and projection matrix and model-view matrix stack
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

// Variables for storing textures
var floorTexture;
let skyTexture;

// Variable that stores  loading state of textures.
var texturesLoaded = false;

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
let jumpStart;
let jumpEnd;

// Used to make us "jog" up and down as we move forward.
var joggingAngle = 0;

// Helper variable for animation
var lastTime = 0;

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
}

function handleTextureLoaded(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Third texture usus Linear interpolation approximation with nearest Mipmap selection
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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


    treeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, treeVertexPositionBuffer);
    let vertices = [
        // Front face
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
    treeVertexPositionBuffer.itemSize = 3;
    treeVertexPositionBuffer.numItems = 24;

    treeVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, treeVertexColorBuffer);
    let colors = [
        [1.0, 0.5, 0.0, 1.0], // Front face
        [1.0, 1.0, 0.0, 1.0], // Back face
        [0.0, 1.0, 0.0, 1.0], // Top face
        [1.0, 0.5, 0.5, 1.0], // Bottom face
        [1.0, 0.0, 1.0, 1.0], // Right face
        [0.0, 0.0, 1.0, 1.0]  // Left face
    ];

    var unpackedColors = [];
    for (var i in colors) {
        var color = colors[i];
        // Repeat each color four times for the four vertices of the face
        for (var j = 0; j < 4; j++) {
            unpackedColors = unpackedColors.concat(color);
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
    treeVertexColorBuffer.itemSize = 4;
    treeVertexColorBuffer.numItems = 24;

    // Build the element array buffer; this specifies the indices
    // into the vertex array for each face's vertices.
    treeVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, treeVertexIndexBuffer);

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
    treeVertexIndexBuffer.itemSize = 1;
    treeVertexIndexBuffer.numItems = 36;
    


    document.getElementById("loadingtext").textContent = "";
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

    //mvPopMatrix();
    


    /*
    // CUBE
    //mvPushMatrix();
    // Now move the drawing position a bit to where we want to start
    // drawing the cube.
    mat4.translate(mvMatrix, [3.0, 3.0, 3.0]);

    // Save the current matrix, then rotate before we draw.
    //mvPushMatrix();
    mat4.rotate(mvMatrix, degToRad(rotationCube), [1, 1, 1]);

    // Draw the cube by binding the array buffer to the cube's vertices
    // array, setting attributes, and pushing it to GL.
    gl.bindBuffer(gl.ARRAY_BUFFER, treeVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, treeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Set the colors attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, treeVertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, treeVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, treeVertexIndexBuffer);

    // Draw the cube.
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, treeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    // Restore the original matrix
    mvPopMatrix();
    */
    
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
        if (jumpTime <= 300) {
            yPosition += 0.05; 
        }
        if (300 < jumpTime && yPosition > 0.4) {
            yPosition -= 0.08; 
        }

        if (speed != 0) {

            if (xPosition < 11.5) {

                xPosition -= Math.sin(degToRad(yaw)) * speed * elapsed;
                zPosition -= Math.cos(degToRad(yaw)) * speed * elapsed;
            }
        }


        //console.log("X: " + xPosition + " Y: " + yPosition + " Z: " + zPosition);

        yaw += yawRate * elapsed;
        pitch += pitchRate * elapsed;
        rotationCube += (75 * elapsed) / 1000.0;

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
    console.log("X: " + xPosition.toFixed(2) + " Y: " + yPosition.toFixed(2) + " Z: " + zPosition.toFixed(2));
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
        // Page Up
        pitchRate = 0.1;
    } else if (currentlyPressedKeys[40]) {
        // Page Down
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
        // Up cursor key or W
        speed = 0.003;
    } else if (currentlyPressedKeys[83]) {
        // Down cursor key
        speed = -0.003;
    } else {
        speed = 0;
    }

    if (currentlyPressedKeys[32]) {
        jump = true;
    }

}

//
// start
//
// Called when the canvas is created to get the ball rolling.
// Figuratively, that is. There's nothing moving in this demo.
//
function start() {
    canvas = document.getElementById("glcanvas");

    gl = initGL(canvas);      // Initialize the GL context

    // Only continue if WebGL is available and working
    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque
        gl.clearDepth(1.0);                                     // Clear everything
        gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
        gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things

        // Initialize the shaders; this is where all the lighting for the
        // vertices and so forth is established.
        initShaders();
        // Next, load and set up the textures we'll be using.
        initTextures();
        // Initialise world objects
        loadWorld();
      

        // Bind keyboard handling functions to document handlers
        document.onkeydown = handleKeyDown;
        document.onkeyup = handleKeyUp;

        // Set up to draw the scene periodically.
        setInterval(function () {
            if (texturesLoaded) { // only draw scene and animate when textures are loaded.
                requestAnimationFrame(animate);
                handleKeys();
                drawScene();
            }
        }, 15);
    }
}
