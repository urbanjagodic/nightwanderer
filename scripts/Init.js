// init class

class Init {

    constructor() {
        this.canvas;
        this.gl;
    }

    static start() {
        this.canvas = document.getElementById("glCanvas");
        this.canvas.width = window.innerWidth - 40;
        this.canvas.height = window.innerHeight - 90;

        this.gl = this.initialize(this.canvas);
        if (this.gl) {
            this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
            this.gl.clearDepth(1.0);
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.depthFunc(this.gl.LEQUAL);

            let shaders = new Shaders(this.gl);
            shaders.initShaders();
            shaders.initBuffers();
            setInterval(shaders.drawScene(), 15);
        }
    }



    static initialize(canvas) {
        this.gl = null;
        try {
            this.gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        }
        catch (e) {}
        if (!this.gl)
            alert("Unable to initialize WebGL. Your browser may not support it!");

        return this.gl;
    }
}