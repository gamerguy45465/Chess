import { setShaderAttributes, loadTexture } from "./helpers.js";

class ChessSet {
    constructor() {
    }
    async init(gl) {
        this.blackTexture = loadTexture(gl, 'pieces/PiezasAjedrezDiffuseMarmolBlackBrighter.png', [80, 80, 80, 255]);
        this.whiteTexture = loadTexture(gl, 'pieces/PiezasAjedrezDiffuseMarmol.png', [220, 220, 220, 255]);
        this.boardTexture = loadTexture(gl, 'pieces/TableroDiffuse01.png', [255, 171, 0, 255]);
        this.buffers = {};
        await readObj(gl, "pieces/PiezasAjedrezAdjusted.obj", this.buffers);
    }

    // tx goes to the right. ty is up. tz come toward the viewer (playing the white pieces)
    // using tx=0 and tz=0 would land the piece at the cross hairs in the middle of the board.
    // Use tx=-1.5 and tz=3.5 to get white's left bishop where it goes.
    // Since we want to say that white's left bishop goes at column 3, row 1,
    //      call the drawAt function to convert (3,1) to (-1.5, 3.5)
    drawItem(gl, shaderProgram, itemName, tx=0, ty=0, tz=0, sx=1, sy=1, sz=1, radians=0, rx=0, ry=0, rz=0) {
        // create and set modevViewMatrix:
        const modelViewMatrix = mat4.create();

        mat4.translate(modelViewMatrix, modelViewMatrix, [tx, ty, tz]); // modelView = modelView * createdTranslationMatrix
        mat4.scale(modelViewMatrix, modelViewMatrix, [ sx, sy, sz]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, radians, [rx, ry, rz]);

        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelViewMatrix"), false, modelViewMatrix);

        // create and set normalMatrix:
        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, modelViewMatrix);
        gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNormalMatrix"), false, normalMatrix);

        // draw the current item:
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[itemName]);
        setShaderAttributes(gl, shaderProgram);
        gl.drawArrays(gl.TRIANGLES, 0, this.buffers[itemName].vertexCount);
    }

    drawAt(gl, shaderProgram, itemName, atx=0, aty=0, atz=0, sx=1, sy=1, sz=1, degrees=0, rx=0, ry=0, rz=0) {
        // make atz=1 map to tz=3.5 and atz=2 to tz=2.5
        const radians = degrees*Math.PI/180.0;
        this.drawItem(gl, shaderProgram, itemName, atx-4.5, aty, -atz+4.5, sx, sy, sz, radians, rx, ry, rz) ;
    }

    draw(gl, shaderProgram, currentTime, whiteMatrix, blackMatrix) {
        // For Convenience
        const items = {8: "rook", 9: "knight", 10: "bishop", 11: "queen", 12: "king", 13: "bishop", 14: "knight", 15: "rook"};


        // Set the board texture and draw the board:
        gl.bindTexture(gl.TEXTURE_2D, this.boardTexture);
        this.drawItem(gl, shaderProgram, "cube");

        // Set the white pieces texture:
        gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);

        // Draw the white pawns:
        for(let x = 0; x <= 7; x++)
        {
            const white = whiteMatrix[x];
            this.drawAt(gl, shaderProgram, "pawn", white[0], white[1], white[2]);

        }


        // Draw the white special pieces:
        for(let x = 8; x <= 15; x++)
        {
            const white = whiteMatrix[x];
            this.drawAt(gl, shaderProgram, items[x], white[0], white[1], white[2]);
        }


        // Set the black pieces texture:
        gl.bindTexture(gl.TEXTURE_2D, this.blackTexture);

        // Draw the black pawns:
        for (let x=0; x<=7; x++){
            const black = blackMatrix[x];
            this.drawAt(gl, shaderProgram, "pawn", black[0], black[1], black[2]);
        }

        for (let x = 8; x <= 15; x++)
        {
            const black = blackMatrix[x];
            this.drawAt(gl, shaderProgram, items[x], black[0], black[1], black[2]);
        }
    }
}

// Read the objects inside the filename, which should be in .obj format.
// Put them in the dictionary this.buffers.
async function readObj(gl, filename, buffers) {
    const response = await fetch(filename);
    const text = await response.text()

    const lines = text.split("\n");
    let objectName = "";
    const vertexList = [];
    const normalList = [];
    const uvList = [];
    let currentFaceList = [];

    for (const line of lines) {
        const values = line.split(' ');
        if (values[0] == 'o') {
            if (currentFaceList.length > 0) {
                AddVertexBufferObject(gl, buffers, objectName, vertexList, uvList, normalList, currentFaceList)
                currentFaceList = []
            }
            objectName = values[1];
        }
        else if (values[0] == 'v') {
            vertexList.push(parseFloat(values[1]), parseFloat(values[2]), parseFloat(values[3]))
        }
        else if (values[0] == 'vn') {
            normalList.push(parseFloat(values[1]), parseFloat(values[2]), parseFloat(values[3]))
        }
        else if (values[0] == 'vt') {
            uvList.push(parseFloat(values[1]), 1 - parseFloat(values[2]))
        }
        else if (values[0] == 'f') {
            const numVerts = values.length - 1;
            const fieldsV0 = values[1].split('/');
            for (let i = 2; i < numVerts; i++) {
                const fieldsV1 = values[i].split('/');
                const fieldsV2 = values[i + 1].split('/');
                currentFaceList.push(parseInt(fieldsV0[0]) - 1, parseInt(fieldsV0[1]) - 1, parseInt(fieldsV0[2]) - 1);
                currentFaceList.push(parseInt(fieldsV1[0]) - 1, parseInt(fieldsV1[1]) - 1, parseInt(fieldsV1[2]) - 1);
                currentFaceList.push(parseInt(fieldsV2[0]) - 1, parseInt(fieldsV2[1]) - 1, parseInt(fieldsV2[2]) - 1);
            }
        }
    }
    if (currentFaceList.length > 0) {
        AddVertexBufferObject(gl, buffers, objectName, vertexList, uvList, normalList, currentFaceList)
    }
}


function AddVertexBufferObject(gl, buffers, objectName, vertexList, uvList, normalList, currentFaceList) {
    const vertices = [];
    for (let i = 0; i < currentFaceList.length; i += 3) {
        const vertexIndex = currentFaceList[i] * 3;
        const uvIndex = currentFaceList[i + 1] * 2;
        const normalIndex = currentFaceList[i + 2] * 3;
        vertices.push(vertexList[vertexIndex + 0], vertexList[vertexIndex + 1], vertexList[vertexIndex + 2], // x,y,x
            uvList[uvIndex + 0], uvList[uvIndex + 1], // u,v
            normalList[normalIndex + 0], normalList[normalIndex + 1], normalList[normalIndex + 2] // nx,ny,nz
        );
    }

    const vertexBufferObject = gl.createBuffer();
    vertexBufferObject.vertexCount = vertices.length / 8;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    buffers[objectName] = vertexBufferObject;
}

export { ChessSet };