precision mediump float;

attribute vec3 vertPosition;
attribute vec2 vertUV;
attribute vec3 vertNormal;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
varying vec4 fragPosition;
varying vec2 fragUV;
varying vec3 fragNormal;

void main() {
    fragUV = vertUV;
    fragNormal = normalize(uNormalMatrix * vertNormal);
    fragPosition = uModelViewMatrix * vec4(vertPosition, 1.0);

    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(vertPosition, 1.0);
}
