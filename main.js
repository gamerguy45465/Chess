import { initShaderProgram } from "./shader.js";
import { ChessSet } from "./chessSet.js";

main();
async function main() {
    console.log('This is working');



    let view = "Regular";
    //let view = "Regular";

    //
    // start gl
    //
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
        alert('Your browser does not support WebGL');
    }
    gl.clearColor(0.75, 0.85, 0.8, 1.0);
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.enable(gl.CULL_FACE);

    //
    // Setup keyboard events, just in case you want them later:
    //
    window.addEventListener("keydown", keyDown);
    function keyDown(event) {
        if(event.key == "o")
        {
            view = "Observation";
        }
        if(event.key == "r")
        {
            view = "Regular";
        }
    }
    window.addEventListener("keyup", keyUp);
    function keyUp(event) {
    }

    //
    // Create shader
    //
    const shaderProgram = initShaderProgram(gl, await (await fetch("vertex.glsl")).text(), await (await fetch("fragment.glsl")).text());
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "uTexture"), 0);


    //
    // load a modelview matrix and normalMatrix onto the shader
    //
    const modelViewMatrix = mat4.create();
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelViewMatrix"), false, modelViewMatrix);

    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, modelViewMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNormalMatrix"), false, normalMatrix);

    //
    // Other shader variables:
    //
    function setLightDirection(x, y, z) {
        gl.uniform3fv(
            gl.getUniformLocation(shaderProgram, "uLightDirection"),
            [x, y, z]
        );
    }
    setLightDirection(1, -1, -1);


    //
    // Create content to display
    //
    const chessSet = new ChessSet();
    await chessSet.init(gl);


    //
    // Position Matrices
    //

    const white_matrix = [
        [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2], [5, 0, 2], [6, 0, 2], [7, 0, 2], [8, 0, 2],
        [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1], [5, 0, 1], [6, 0, 1], [7, 0, 1], [8, 0, 1]
    ];

    const black_matrix = [
        [1, 0, 7], [2, 0, 7], [3, 0, 7], [4, 0, 7], [5, 0, 7], [6, 0, 7], [7, 0, 7], [8, 0, 7],
        [1, 0, 8], [2, 0, 8], [3, 0, 8], [4, 0, 8], [5, 0, 8], [6, 0, 8], [7, 0, 8], [8, 0, 8]
    ];

    const BOARD_MIN = 1;
    const BOARD_MAX = 8;
    const PIECE_PICK_RADIUS = 0.55;
    const BACK_RANK_PIECE_TYPES = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
    let currentViewProjectionMatrix = mat4.create();
    let dragState = null;

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function worldToBoard(worldX, worldZ) {
        return {
            x: worldX + 4.5,
            z: -worldZ + 4.5
        };
    }

    function getPieceTypeByIndex(index) {
        if (index < 8) {
            return "pawn";
        }
        return BACK_RANK_PIECE_TYPES[index - 8] ?? "unknown";
    }

    function createPieceState(color, matrix) {
        return matrix.map((position, index) => ({
            color,
            index,
            type: getPieceTypeByIndex(index),
            position,
            hasMoved: false,
            captured: false
        }));
    }

    const pieceStateByColor = {
        white: createPieceState("white", white_matrix),
        black: createPieceState("black", black_matrix)
    };

    function getPieceStateByColor(color) {
        return color === "white" ? pieceStateByColor.white : pieceStateByColor.black;
    }

    function getBoardHit(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return null;
        }

        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;

        const inverseViewProjection = mat4.create();
        if (!mat4.invert(inverseViewProjection, currentViewProjectionMatrix)) {
            return null;
        }

        const nearClip = vec4.fromValues(ndcX, ndcY, -1, 1);
        const farClip = vec4.fromValues(ndcX, ndcY, 1, 1);
        const nearWorld = vec4.create();
        const farWorld = vec4.create();
        vec4.transformMat4(nearWorld, nearClip, inverseViewProjection);
        vec4.transformMat4(farWorld, farClip, inverseViewProjection);

        if (Math.abs(nearWorld[3]) < 1e-6 || Math.abs(farWorld[3]) < 1e-6) {
            return null;
        }

        const near = vec3.fromValues(
            nearWorld[0] / nearWorld[3],
            nearWorld[1] / nearWorld[3],
            nearWorld[2] / nearWorld[3]
        );
        const far = vec3.fromValues(
            farWorld[0] / farWorld[3],
            farWorld[1] / farWorld[3],
            farWorld[2] / farWorld[3]
        );

        const direction = vec3.create();
        vec3.subtract(direction, far, near);
        vec3.normalize(direction, direction);
        if (Math.abs(direction[1]) < 1e-6) {
            return null;
        }

        // Intersect the cursor ray with the board plane at y = 0.
        const t = (0 - near[1]) / direction[1];
        if (t < 0) {
            return null;
        }

        return {
            x: near[0] + direction[0] * t,
            z: near[2] + direction[2] * t
        };
    }

    function key(x, z) { return `${x},${z}`; }

    function buildBoardMap(pieceStateByColor, excludedPiece = null) {
        const board = new Map();
        for (const color of ["white", "black"]) {
            for (const p of pieceStateByColor[color]) {
                if (!p.captured && p !== excludedPiece) {
                    const x = Math.round(p.position[0]);
                    const z = Math.round(p.position[2]);
                    board.set(key(x, z), p);
                }
            }
        }
        return board;
    }


    function isPathClear(from, to, board) {
        const sx = Math.sign(to.x - from.x);
        const sz =Math.sign(to.z - from.z);
        let x = from.x + sx;
        let z = from.z + sz;
        while(x !== to.x || z !== to.z) {
            if(board.has(key(x, z))) return false;
            x += sx;
            z += sz;
        }
        return true;
    }

    function isLegalMove(piece, from, to, board) {
        if (to.x < 1 || to.x > 8 || to.z < 1 || to.z > 8) return false;
        if (from.x === to.x && from.z === to.z) return false;

        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const adx = Math.abs(dx);
        const adz = Math.abs(dz);


        const target = board.get(key(to.x, to.z));
        if(target && target.color === piece.color) return false;

        if (piece.type === "pawn") {
            const dir = piece.color === "white" ? 1 : -1;
            const one = dz === dir && dx === 0 && !target;
            const two = !piece.hasMoved && dz === 2 * dir && dx === 0 &&
                !target && !board.has(key(from.x, from.z + dir));
            const capture = dz === dir && adx === 1 && target && target.color !== piece.color;
            return one || two || capture;
        }

        if (piece.type === "knight") return (adx === 1 && adz === 2) || (adx === 2 && adz === 1);

        if (piece.type === "bishop") return adx === adz && isPathClear(from, to, board);
        if (piece.type === "rook") return (dx === 0 || dz === 0) && isPathClear(from, to, board);
        if (piece.type === "queen") {
            const diag = adx === adz;
            const straight = dx === 0 || dz === 0;
            return (diag || straight) && isPathClear(from, to, board);
        }

        if (piece.type === "king") return adx <= 1 && adz <= 1;

        return false;
    }

    function updateDraggedPiece(clientX, clientY) {
        if (!dragState) { // if no piece is currently selected, it exits
            return;
        }

        const hit = getBoardHit(clientX, clientY); // converts the mouse position into a board-plane hit point
        if (!hit) {
            return;
        }

        const boardPos = worldToBoard(hit.x, hit.z); // converts that world-space hit ot board coordinates
        const piece = dragState.selectedPiece.position;
        piece[0] = clamp(boardPos.x, BOARD_MIN, BOARD_MAX); // updates the pieces
        piece[2] = clamp(boardPos.z, BOARD_MIN, BOARD_MAX);
    }

    function snapDraggedPieceToSquare() {
        if (!dragState) {
            return;
        }

        const piece = dragState.selectedPiece.position;
        piece[0] = clamp(Math.round(piece[0]), BOARD_MIN, BOARD_MAX);
        piece[2] = clamp(Math.round(piece[2]), BOARD_MIN, BOARD_MAX);
    }

    function getClosestPiece(clientX, clientY) {
        const hit = getBoardHit(clientX, clientY);
        if (!hit) {
            return null;
        }

        const boardPos = worldToBoard(hit.x, hit.z);
        let closest = null;
        let bestDistance = Infinity;

        function tryPieces(pieceStates) {
            for (const pieceState of pieceStates) {
                if (pieceState.captured) {
                    continue;
                }
                const piece = pieceState.position;
                const distance = Math.hypot(boardPos.x - piece[0], boardPos.z - piece[2]);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    closest = pieceState;
                }
            }
        }

        tryPieces(getPieceStateByColor("white"));
        tryPieces(getPieceStateByColor("black"));
        if (bestDistance > PIECE_PICK_RADIUS) {
            return null;
        }

        return closest;
    }


    window.addEventListener("resize", reportWindowSize);
    function reportWindowSize() {
        let physicalToCSSPixelsRatio = window.devicePixelRatio; // Do this for no pixelation. Set to 1.0 for better speed.
        gl.canvas.width = gl.canvas.clientWidth * physicalToCSSPixelsRatio;
        gl.canvas.height = gl.canvas.clientHeight * physicalToCSSPixelsRatio;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
    reportWindowSize();




    canvas.addEventListener("mousedown", event => {
        if (event.button !== 0) {
            return;
        }

        const closestPiece = getClosestPiece(event.clientX, event.clientY);
        if (!closestPiece) {
            return;
        }

        dragState = {
            selectedPiece: closestPiece,
            startX: Math.round(closestPiece.position[0]),
            startZ: Math.round(closestPiece.position[2])
        };
        updateDraggedPiece(event.clientX, event.clientY);
    });

    window.addEventListener("mousemove", event => {
        if (!dragState) {
            return;
        }
        updateDraggedPiece(event.clientX, event.clientY);
    });

    window.addEventListener("mouseup", event => {
        if (event.button !== 0 || !dragState) return;

        const piece = dragState.selectedPiece;
        const from = { x: dragState.startX, z: dragState.startZ };
        const to = {
            x: clamp(Math.round(piece.position[0]), 1, 8),
            z: clamp(Math.round(piece.position[2]), 1, 8)
        };

        const board = buildBoardMap(pieceStateByColor, piece);

        if (isLegalMove(piece, from, to, board)) {
            const target = board.get(key(to.x, to.z));
            if (target && target.color !== piece.color) {
                target.captured = true;
                target.position[0] = 0;
                target.position[2] = 0;
            }
            piece.position[0] = to.x;
            piece.position[2] = to.z;
            piece.hasMoved = true;
        } else {
            piece.position[0] = from.x;
            piece.position[2] = from.z;
        }

        dragState = null;
    });

    //
    // Main render loop
    //
    let init_anim = true;
    let previousTime = 0;
    let frameCounter = 0;
    function redraw(currentTime) {
        currentTime *= .001; // milliseconds to seconds
        let DT = currentTime - previousTime;
        if (DT > .5)
            DT = .5;
        frameCounter += 1;
        if (Math.floor(currentTime) != Math.floor(previousTime)) {
            //console.log(frameCounter);
            frameCounter = 0;
        }
        previousTime = currentTime;

        //
        // Draw
        //

        if(view == "Regular")
        {
            const eye = [0, 6, 9];
            const at = [0, 1.5, 2.3]
            const up = [0, 1, 0];

            //
            // Draw Camera Animation
            //

            if(init_anim)
            {
                for(let i = 0; i < 500; i++)
                {
                    eye[0] = i;
                    console.log(eye);
                    currentViewProjectionMatrix = setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight, DT);
                }
                eye[0] = 0;
                init_anim = false;


            }
            else
            {
                currentViewProjectionMatrix = setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight, DT);

            }




        }

        if(view == "Observation")
        {
            const eye = [0, 20, 2];
            const at = [0, 5.5, 1.3]
            const up = [0, 1, 0];
            currentViewProjectionMatrix = setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight, DT);


        }


        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        chessSet.draw(gl, shaderProgram, currentTime, white_matrix, black_matrix);

        requestAnimationFrame(redraw);
    }
    requestAnimationFrame(redraw);
};

function setObservationView(gl, shaderProgram, eye, at, up, canvasAspect, deltaTime = 1 / 60) {
    if (!setObservationView.smoothEye) {
        setObservationView.smoothEye = [...eye];
        setObservationView.smoothAt = [...at];
    }

    const clampedDT = Math.max(0, Math.min(deltaTime, 0.5));
    const followSpeed = 8;
    const alpha = 1 - Math.exp(-followSpeed * clampedDT);
    for (let i = 0; i < 3; i++) {
        setObservationView.smoothEye[i] += (eye[i] - setObservationView.smoothEye[i]) * alpha;
        setObservationView.smoothAt[i] += (at[i] - setObservationView.smoothAt[i]) * alpha;
    }

    const projectionMatrix = mat4.create();
    const fov = 60 * Math.PI / 180;
    const near = 1;
    const far = 100;
    mat4.perspective(projectionMatrix, fov, canvasAspect, near, far);

    const lookAtMatrix = mat4.create();
    mat4.lookAt(lookAtMatrix, setObservationView.smoothEye, setObservationView.smoothAt, up);
    mat4.multiply(projectionMatrix, projectionMatrix, lookAtMatrix);

    const projectionMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

    gl.uniform3fv(
        gl.getUniformLocation(shaderProgram, "uEyePosition"),
        setObservationView.smoothEye
    );

    return projectionMatrix;
}
