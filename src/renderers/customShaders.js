import * as THREE from 'three';

// Custom shaders for atom visuals. These provide a lightweight (Phong-like)
// shading model and support per-instance color via InstancedMesh's
// `instanceColor` attribute. For non-instanced usage, a uniform `uColor` is used.

export const atomVertex = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
#ifdef USE_INSTANCING
  attribute mat4 instanceMatrix;
#endif

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

#ifdef USE_INSTANCING
  attribute vec3 instanceColor;
#endif

uniform vec3 uColor;

varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vBaseColor;

void main() {
    vec4 worldPos;
#ifdef USE_INSTANCING
    worldPos = instanceMatrix * vec4(position, 1.0);
    vBaseColor = instanceColor;
#else
    worldPos = vec4(position, 1.0);
    vBaseColor = uColor;
#endif
    vec4 mvPos = modelViewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPos;
    vViewPos = -mvPos.xyz;
    // Transform normal properly when using instanced geometry: include instanceMatrix
    // so that per-instance rotations are applied to the normal (important for bonds
    // that are placed/oriented via instancing).
#ifdef USE_INSTANCING
    vNormal = normalize(normalMatrix * (mat3(instanceMatrix) * normal));
#else
    vNormal = normalize(normalMatrix * normal);
#endif
}
`;

export const atomFragment = `
precision highp float;

varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vBaseColor;

uniform vec3 uLightDirection; // world-space light direction
uniform vec3 uAmbientColor;
uniform vec3 uSpecularColor;
uniform float uShininess;

uniform vec3 uSelectionEmissive;
uniform float uSelectionFactor;

void main() {
    vec3 N = normalize(vNormal);
    // light direction is (assumed) normalized and in view-space: we transform it
    // here by ignoring camera transform simplicity; assume it's in view space
    vec3 L = normalize(uLightDirection);
    float lambert = max(dot(N, L), 0.0);

    // Simple Blinn-Phong
    vec3 V = normalize(-vViewPos);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), uShininess);

    vec3 ambient = uAmbientColor;
    vec3 diffuse = vBaseColor * lambert;
    vec3 specular = uSpecularColor * spec;

    vec3 color = ambient + diffuse + specular;

    // Apply selection additive highlight (uSelectionFactor 0-1)
    color = mix(color, color + uSelectionEmissive, uSelectionFactor);

    gl_FragColor = vec4(color, 1.0);
}
`;

export function createAtomMaterial({ color = new THREE.Color(0xffffff), lightDir = new THREE.Vector3(0.5, 0.2, 1.0), ambient = new THREE.Color(0.12, 0.12, 0.12), specular = new THREE.Color(1.0, 1.0, 1.0), shininess = 32, selectionEmissive = new THREE.Color(0.24, 0.6, 1.0) } = {}) {
    const mat = new THREE.RawShaderMaterial({
        vertexShader: atomVertex,
        fragmentShader: atomFragment,
        uniforms: {
            uColor: { value: color },
            uLightDirection: { value: lightDir.clone().normalize() },
            uAmbientColor: { value: ambient },
            uSpecularColor: { value: specular },
            uShininess: { value: shininess },
            uSelectionEmissive: { value: selectionEmissive },
            uSelectionFactor: { value: 0.0 }
        },
        side: THREE.DoubleSide,
        transparent: false
    });
    return mat;
}

// Lightweight bond fragment/vertex shader — simple colored cylinder using standard lambert lighting.
export const bondVertex = atomVertex; // Reuse same base, the geometry defines cylinder
export const bondFragment = `
precision highp float;

varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vBaseColor;

uniform vec3 uLightDirection;
uniform vec3 uAmbientColor;

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDirection);
    float lambert = max(dot(N, L), 0.0);
    vec3 ambient = uAmbientColor;
    vec3 diffuse = vBaseColor * lambert;
    vec3 color = ambient + diffuse;
    gl_FragColor = vec4(color, 1.0);
}
`;

export function createBondMaterial({ color = new THREE.Color(0xcccccc), lightDir = new THREE.Vector3(0.5, 0.2, 1.0), ambient = new THREE.Color(0.1, 0.1, 0.1) } = {}) {
    const mat = new THREE.RawShaderMaterial({
        vertexShader: bondVertex,
        fragmentShader: bondFragment,
        uniforms: {
            uColor: { value: color },
            uLightDirection: { value: lightDir.clone().normalize() },
            uAmbientColor: { value: ambient }
        },
        side: THREE.DoubleSide
    });
    return mat;
}
