precision mediump float;
varying vec4 fragPosition;
varying vec2 fragUV;
varying vec3 fragNormal;

uniform sampler2D uTexture;
uniform vec3 uEyePosition;
uniform vec3 uLightDirection;

void main() {
    vec4 materialColor = texture2D(uTexture, fragUV);
    vec4 finalColor = vec4(0,0,0,1);

    // Add ambient:
    float ambient = 0.1;
    finalColor += materialColor * ambient;

    // Add diffuse:
    vec3 normalizedNormalVector = normalize(fragNormal);
    vec3 lightDirection = normalize(uLightDirection);
    vec3 toLight = lightDirection*-1.0;
    float d = dot(normalizedNormalVector, toLight) * (1.0 - ambient);
    if(d>0.0){
        finalColor += materialColor * d;

        // Add specular:
        vec3 toEye = uEyePosition - fragPosition.xyz;
        toEye = normalize(toEye);

        vec3 lightDirectionReflected = reflect(lightDirection, normalizedNormalVector);
        float d2 =dot(toEye, lightDirectionReflected);
        if(d2>0.0){
            float shininess = 80.0;
            d2 = pow(d2, shininess);
            vec4 specularColor = vec4(1.0,1.0,1.0,0.0);
            finalColor += specularColor*d2;
        }
    }

    if(finalColor[0] > 1.0)
    finalColor[0] = 1.0;
    if(finalColor[1] > 1.0)
    finalColor[1] = 1.0;
    if(finalColor[2] > 1.0)
    finalColor[2] = 1.0;

    gl_FragColor = finalColor;
}