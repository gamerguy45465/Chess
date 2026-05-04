import { initShaderProgram } from "./shader.js";
import { ChessSet } from "./chessSet.js";

const SHOW_COORDINATE_AXES = true;

const AXIS_VERTEX_SHADER_SOURCE = `
precision mediump float;
attribute vec3 aPosition;
attribute vec3 aColor;
uniform mat4 uViewProjectionMatrix;
varying vec3 vColor;

void main() {
    vColor = aColor;
    gl_Position = uViewProjectionMatrix * vec4(aPosition, 1.0);
}
`;

const AXIS_FRAGMENT_SHADER_SOURCE = `
precision mediump float;
varying vec3 vColor;

void main() {
    gl_FragColor = vec4(vColor, 1.0);
}
`;

main();
async function main() {
    console.log('This is working');



    let view = "Regular";
    let animate = true;
    let openingAnimation = null;
    let test_anim = false;
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
        if (event.key == "a")
        {
            if (!openingAnimation) {
                return;
            }
            openingAnimation.enabled = true;
            startOpeningAnimation(performance.now() * 0.001);
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
    let axisRenderer = null;
    let axisLabelOverlay = null;
    if (SHOW_COORDINATE_AXES) {
        const axisSettings = {
            axisLength: 6.0,
            axisYOffset: 0.0
        };
        const axisShaderProgram = initShaderProgram(gl, AXIS_VERTEX_SHADER_SOURCE, AXIS_FRAGMENT_SHADER_SOURCE);
        axisRenderer = createAxesRenderer(gl, axisShaderProgram, axisSettings);
        axisLabelOverlay = createAxisLabelOverlay(canvas, axisSettings);
        gl.useProgram(shaderProgram);
    }


    //
    // Position Matrices
    //

    const white_matrix = [
        [1, 0, 2, 1, 1, 1, 0, 0, 0, 0], [2, 0, 2, 1, 1, 1, 0, 0, 0, 0], [3, 0, 2, 1, 1, 1, 0, 0, 0, 0], [4, 0, 2, 1, 1, 1, 0, 0, 0, 0], [5, 0, 2, 1, 1, 1, 0, 0, 0, 0], [6, 0, 2, 1, 1, 1, 0, 0, 0, 0], [7, 0, 2, 1, 1, 1, 0, 0, 0, 0], [8, 0, 2, 1, 1, 1, 0, 0, 0, 0],
        [1, 0, 1, 1, 1, 1, 0, 0, 0, 0], [2, 0, 1, 1, 1, 1, 0, 0, 0, 0], [3, 0, 1, 1, 1, 1, 0, 0, 0, 0], [4, 0, 1, 1, 1, 1, 0, 0, 0, 0], [5, 0, 1, 1, 1, 1, 0, 0, 0, 0], [6, 0, 1, 1, 1, 1, 0, 0, 0, 0], [7, 0, 1, 1, 1, 1, 0, 0, 0, 0], [8, 0, 1, 1, 1, 1, 0, 0, 0, 0]
    ];

    const black_matrix = [
        [1, 0, 7, 1, 1, 1, 0, 0, 0, 0], [2, 0, 7, 1, 1, 1, 0, 0, 0, 0], [3, 0, 7, 1, 1, 1, 0, 0, 0, 0], [4, 0, 7, 1, 1, 1, 0, 0, 0, 0], [5, 0, 7, 1, 1, 1, 0, 0, 0, 0], [6, 0, 7, 1, 1, 1, 0, 0, 0, 0], [7, 0, 7, 1, 1, 1, 0, 0, 0, 0], [8, 0, 7, 1, 1, 1, 0, 0, 0, 0],
        [1, 0, 8, 1, 1, 1, 0, 0, 0, 0], [2, 0, 8, 1, 1, 1, 0, 0, 0, 0], [3, 0, 8, 1, 1, 1, 0, 0, 0, 0], [4, 0, 8, 1, 1, 1, 0, 0, 0, 0], [5, 0, 8, 1, 1, 1, 0, 0, 0, 0], [6, 0, 8, 1, 1, 1, 0, 0, 0, 0], [7, 0, 8, 1, 1, 1, 0, 0, 0, 0], [8, 0, 8, 1, 1, 1, 0, 0, 0, 0]
    ];
    const initialWhitePositions = white_matrix.map(position => [...position]);
    const initialBlackPositions = black_matrix.map(position => [...position]);

    // First six plies of the Italian Game: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5
    const openingMoves = [
        { color: "white", from: { x: 5, z: 2 }, to: { x: 5, z: 4 } },
        { color: "black", from: { x: 5, z: 7 }, to: { x: 5, z: 5 } },
        { color: "white", from: { x: 7, z: 1 }, to: { x: 6, z: 3 } },
        { color: "black", from: { x: 2, z: 8 }, to: { x: 3, z: 6 } },
        { color: "white", from: { x: 6, z: 1 }, to: { x: 3, z: 4 } },
        { color: "black", from: { x: 6, z: 8 }, to: { x: 3, z: 5 } },
        { color: "white", from: { x: 2, z: 2 }, to: { x: 2, z: 3 } },
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

    function lerp(start, end, t) {
        return start + (end - start) * t;
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

    openingAnimation = {
        enabled: animate,
        moveDuration: 0.65,
        pauseDuration: 0.2,
        nextMoveTime: 0,
        moveIndex: 0,
        activeMove: null,
        finished: !animate
    };

    function getPieceStateByColor(color) {
        return color === "white" ? pieceStateByColor.white : pieceStateByColor.black;
    }

    function resetBoardState() {
        for (const piece of pieceStateByColor.white) {
            const initial = initialWhitePositions[piece.index];
            piece.position[0] = initial[0];
            piece.position[1] = initial[1];
            piece.position[2] = initial[2];
            piece.hasMoved = false;
            piece.captured = false;
        }

        for (const piece of pieceStateByColor.black) {
            const initial = initialBlackPositions[piece.index];
            piece.position[0] = initial[0];
            piece.position[1] = initial[1];
            piece.position[2] = initial[2];
            piece.hasMoved = false;
            piece.captured = false;
        }
    }

    function getPieceAtSquare(color, x, z) {
        return getPieceStateByColor(color).find(piece =>
            !piece.captured &&
            Math.round(piece.position[0]) === x &&
            Math.round(piece.position[2]) === z
        ) ?? null;
    }

    function isOpeningAnimationRunning() {
        return openingAnimation.enabled && !openingAnimation.finished;
    }

    function startOpeningAnimation(currentTime = 0) {
        resetBoardState();
        dragState = null;
        openingAnimation.moveIndex = 0;
        openingAnimation.activeMove = null;
        openingAnimation.nextMoveTime = currentTime;
        openingAnimation.finished = openingMoves.length === 0;
    }

    function startNextOpeningMove(currentTime) {
        const move = openingMoves[openingAnimation.moveIndex];
        if (!move) {
            openingAnimation.finished = true;
            return;
        }

        const movingPiece = getPieceAtSquare(move.color, move.from.x, move.from.z);
        if (!movingPiece) {
            console.warn("Opening animation stopped: missing piece at", move.from);
            openingAnimation.finished = true;
            return;
        }

        const board = buildBoardMap(pieceStateByColor, movingPiece);
        if (!isLegalMove(movingPiece, move.from, move.to, board)) {
            console.warn("Opening animation stopped: illegal move", move);
            openingAnimation.finished = true;
            return;
        }

        openingAnimation.activeMove = {
            piece: movingPiece,
            from: { ...move.from },
            to: { ...move.to },
            target: board.get(key(move.to.x, move.to.z)) ?? null,
            startTime: currentTime,
            endTime: currentTime + openingAnimation.moveDuration
        };
    }

    // Where the Animations are actually taking place
    function updateOpeningAnimation(currentTime) {
        if (!isOpeningAnimationRunning()) {
            return;
        }

        const activeMove = openingAnimation.activeMove;
        if (activeMove) {
            const duration = Math.max(activeMove.endTime - activeMove.startTime, 1e-5);
            const t = clamp((currentTime - activeMove.startTime) / duration, 0, 1);

            activeMove.piece.position[0] = lerp(activeMove.from.x, activeMove.to.x, t);
            activeMove.piece.position[2] = lerp(activeMove.from.z, activeMove.to.z, t);

            if (t >= 1) {
                activeMove.piece.position[0] = activeMove.to.x;
                activeMove.piece.position[2] = activeMove.to.z;
                activeMove.piece.hasMoved = true;

                if (activeMove.target && activeMove.target.color !== activeMove.piece.color) {
                    activeMove.target.captured = true;
                    activeMove.target.position[0] = 0;
                    activeMove.target.position[2] = 0;
                }

                openingAnimation.activeMove = null;
                openingAnimation.moveIndex += 1;
                openingAnimation.nextMoveTime = currentTime + openingAnimation.pauseDuration;

                if (openingAnimation.moveIndex >= openingMoves.length) {
                    openingAnimation.finished = true;
                }
            }
            return;
        }

        if (currentTime >= openingAnimation.nextMoveTime) {
            startNextOpeningMove(currentTime);
        }
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
        if (axisLabelOverlay) {
            axisLabelOverlay.resize();
        }
    }
    reportWindowSize();
    if (openingAnimation.enabled) {
        startOpeningAnimation(0);
    }




    canvas.addEventListener("mousedown", event => {
        if (event.button !== 0) {
            return;
        }
        if (isOpeningAnimationRunning()) {
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
        if (isOpeningAnimationRunning()) {
            return;
        }
        if (!dragState) {
            return;
        }
        updateDraggedPiece(event.clientX, event.clientY);
    });

    window.addEventListener("mouseup", event => {
        if (isOpeningAnimationRunning()) {
            dragState = null;
            return;
        }
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
    let the_time = 0;
    function redraw(currentTime) {
        gl.useProgram(shaderProgram);
        currentTime *= .001; // milliseconds to seconds
        let DT = currentTime - previousTime;
        if (DT > .5)
            DT = .5;
        frameCounter += 1;
        if (Math.floor(currentTime) != Math.floor(previousTime)) {
            //console.log(frameCounter);
            the_time += 1;
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
                    //console.log(eye);
                    currentViewProjectionMatrix = setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight, DT);
                }
                eye[0] = 0;
                init_anim = false;


            }
            else
            {
                currentViewProjectionMatrix = setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight, DT);

            }



            if(animate)
            {
                updateOpeningAnimation(currentTime);
            }
            else
            {
                test_anim = true;
            }


            //if(test_anim)
            //{
            eye[0] = -20;
            eye[1] = 5;
            eye[2] = -7;
            at[2] = 0;
            at[1] = 0;
            at[0] = 0;
            currentViewProjectionMatrix = setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight, DT);


            //}




        }

        if(view == "Observation")
        {
            const eye = [0, 20, 2];
            const at = [0, 5.5, 1.3]
            const up = [0, 1, 0];
            currentViewProjectionMatrix = setObservationView(gl, shaderProgram, eye, at, up, canvas.clientWidth / canvas.clientHeight, DT);


        }


        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        if(the_time >= 2 && the_time <= 4)
        {
            black_matrix[12][4] += 0.001;

        }
        if(the_time >= 5 && the_time <= 7)
        {
            white_matrix[12][6] = 90;
            white_matrix[12][8] = 1;
        }

        chessSet.draw(gl, shaderProgram, currentTime, white_matrix, black_matrix);
        if (SHOW_COORDINATE_AXES && axisRenderer) {
            axisRenderer.draw(currentViewProjectionMatrix);
            if (axisLabelOverlay) {
                axisLabelOverlay.draw(currentViewProjectionMatrix);
            }
            gl.useProgram(shaderProgram);
        }

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

function createAxesRenderer(gl, shaderProgram, options = {}) {
    const axisLength = options.axisLength ?? 6.0;
    const axisYOffset = options.axisYOffset ?? 0.0;
    const arrowSize = options.arrowSize ?? 0.45;
    const tickSize = options.tickSize ?? 0.12;
    const labelSize = options.labelSize ?? 0.28;
    const labelOffset = options.labelOffset ?? 0.55;
    const wingSize = arrowSize * 0.45;

    const vertices = [];
    function addLine(start, end, color) {
        vertices.push(start[0], start[1], start[2], color[0], color[1], color[2]);
        vertices.push(end[0], end[1], end[2], color[0], color[1], color[2]);
    }

    const red = [0.95, 0.2, 0.2];
    const green = [0.16, 0.85, 0.35];
    const blue = [0.25, 0.45, 0.95];

    // Axes through board center.
    addLine([-axisLength, axisYOffset, 0], [axisLength, axisYOffset, 0], red);
    addLine([0, axisYOffset - axisLength, 0], [0, axisYOffset + axisLength, 0], green);
    addLine([0, axisYOffset, -axisLength], [0, axisYOffset, axisLength], blue);

    // X-axis arrowheads (both directions).
    addLine([axisLength, axisYOffset, 0], [axisLength - arrowSize, axisYOffset, wingSize], red);
    addLine([axisLength, axisYOffset, 0], [axisLength - arrowSize, axisYOffset, -wingSize], red);
    addLine([-axisLength, axisYOffset, 0], [-axisLength + arrowSize, axisYOffset, wingSize], red);
    addLine([-axisLength, axisYOffset, 0], [-axisLength + arrowSize, axisYOffset, -wingSize], red);

    // Y-axis arrowheads (both directions).
    addLine([0, axisYOffset + axisLength, 0], [wingSize, axisYOffset + axisLength - arrowSize, 0], green);
    addLine([0, axisYOffset + axisLength, 0], [-wingSize, axisYOffset + axisLength - arrowSize, 0], green);
    addLine([0, axisYOffset - axisLength, 0], [wingSize, axisYOffset - axisLength + arrowSize, 0], green);
    addLine([0, axisYOffset - axisLength, 0], [-wingSize, axisYOffset - axisLength + arrowSize, 0], green);

    // Z-axis arrowheads (both directions).
    addLine([0, axisYOffset, axisLength], [wingSize, axisYOffset, axisLength - arrowSize], blue);
    addLine([0, axisYOffset, axisLength], [-wingSize, axisYOffset, axisLength - arrowSize], blue);
    addLine([0, axisYOffset, -axisLength], [wingSize, axisYOffset, -axisLength + arrowSize], blue);
    addLine([0, axisYOffset, -axisLength], [-wingSize, axisYOffset, -axisLength + arrowSize], blue);

    // Integer tick marks.
    for (let t = Math.ceil(-axisLength); t <= Math.floor(axisLength); t++) {
        addLine([t, axisYOffset, -tickSize], [t, axisYOffset, tickSize], red);
        addLine([-tickSize, axisYOffset + t, 0], [tickSize, axisYOffset + t, 0], green);
        addLine([-tickSize, axisYOffset, t], [tickSize, axisYOffset, t], blue);
    }

    // Axis labels near positive directions.
    const xCenter = axisLength + labelOffset;
    const yForXZLabels = axisYOffset + 0.25;
    addLine([xCenter - labelSize, yForXZLabels - labelSize, 0], [xCenter + labelSize, yForXZLabels + labelSize, 0], red);
    addLine([xCenter - labelSize, yForXZLabels + labelSize, 0], [xCenter + labelSize, yForXZLabels - labelSize, 0], red);

    const yCenter = axisYOffset + axisLength + labelOffset;
    addLine([0, yCenter + labelSize * 2, 0], [0, yCenter + labelSize * 0.5, 0], green);
    addLine([0, yCenter + labelSize * 0.5, 0], [-labelSize, yCenter + labelSize * 1.5, 0], green);
    addLine([0, yCenter + labelSize * 0.5, 0], [labelSize, yCenter + labelSize * 1.5, 0], green);

    const zCenter = axisLength + labelOffset;
    addLine([-labelSize, yForXZLabels + labelSize, zCenter], [labelSize, yForXZLabels + labelSize, zCenter], blue);
    addLine([labelSize, yForXZLabels + labelSize, zCenter], [-labelSize, yForXZLabels - labelSize, zCenter], blue);
    addLine([-labelSize, yForXZLabels - labelSize, zCenter], [labelSize, yForXZLabels - labelSize, zCenter], blue);

    const axisBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, axisBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    const colorLocation = gl.getAttribLocation(shaderProgram, "aColor");
    const viewProjectionLocation = gl.getUniformLocation(shaderProgram, "uViewProjectionMatrix");
    const vertexCount = vertices.length / 6;
    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

    return {
        draw(viewProjectionMatrix) {
            if (!viewProjectionMatrix) {
                return;
            }

            const depthTestEnabled = gl.isEnabled(gl.DEPTH_TEST);
            gl.useProgram(shaderProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, axisBuffer);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, stride, 0);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
            gl.enableVertexAttribArray(colorLocation);
            gl.uniformMatrix4fv(viewProjectionLocation, false, viewProjectionMatrix);

            if (depthTestEnabled) {
                gl.disable(gl.DEPTH_TEST);
            }
            gl.drawArrays(gl.LINES, 0, vertexCount);
            if (depthTestEnabled) {
                gl.enable(gl.DEPTH_TEST);
            }
        }
    };
}

function createAxisLabelOverlay(targetCanvas, options = {}) {
    const axisLength = options.axisLength ?? 6.0;
    const axisYOffset = options.axisYOffset ?? 0.0;

    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.style.position = "fixed";
    overlayCanvas.style.pointerEvents = "none";
    overlayCanvas.style.zIndex = "10";
    overlayCanvas.style.left = "0px";
    overlayCanvas.style.top = "0px";
    document.body.appendChild(overlayCanvas);

    const ctx = overlayCanvas.getContext("2d");

    function resize() {
        const rect = targetCanvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        overlayCanvas.width = Math.max(1, Math.round(rect.width * ratio));
        overlayCanvas.height = Math.max(1, Math.round(rect.height * ratio));
        overlayCanvas.style.width = `${rect.width}px`;
        overlayCanvas.style.height = `${rect.height}px`;
        overlayCanvas.style.left = `${rect.left}px`;
        overlayCanvas.style.top = `${rect.top}px`;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function projectToScreen(world, viewProjectionMatrix, width, height) {
        const clip = vec4.create();
        vec4.transformMat4(clip, vec4.fromValues(world[0], world[1], world[2], 1), viewProjectionMatrix);
        if (clip[3] <= 0.001) {
            return null;
        }

        const ndcX = clip[0] / clip[3];
        const ndcY = clip[1] / clip[3];
        const ndcZ = clip[2] / clip[3];
        if (ndcZ < -1 || ndcZ > 1) {
            return null;
        }

        return {
            x: (ndcX * 0.5 + 0.5) * width,
            y: (-ndcY * 0.5 + 0.5) * height
        };
    }

    function drawLabel(text, x, y, color) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.75)";
        ctx.lineWidth = 3;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    function draw(viewProjectionMatrix) {
        if (!viewProjectionMatrix) {
            return;
        }

        const width = targetCanvas.clientWidth;
        const height = targetCanvas.clientHeight;
        ctx.clearRect(0, 0, width, height);
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const minTick = Math.ceil(-axisLength);
        const maxTick = Math.floor(axisLength);

        for (let tick = minTick; tick <= maxTick; tick++) {
            const xPoint = projectToScreen([tick, axisYOffset, 0], viewProjectionMatrix, width, height);
            if (xPoint) {
                drawLabel(String(tick), xPoint.x, xPoint.y - 12, "rgb(242, 70, 70)");
            }

            const yPoint = projectToScreen([0, axisYOffset + tick, 0], viewProjectionMatrix, width, height);
            if (yPoint) {
                drawLabel(String(tick), yPoint.x + 14, yPoint.y, "rgb(60, 222, 98)");
            }

            const zPoint = projectToScreen([0, axisYOffset, tick], viewProjectionMatrix, width, height);
            if (zPoint) {
                drawLabel(String(tick), zPoint.x - 14, zPoint.y + 12, "rgb(70, 132, 255)");
            }
        }
    }

    resize();
    return { resize, draw };
}
