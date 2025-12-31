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
    vec3 L = normalize(uLightDirection);
    float intensity = max(dot(N, L), 0.0);

    // Toon shading: band the intensity
    float toon;
    if (intensity > 0.8) {
        toon = 1.0;
    } else if (intensity > 0.3) {
        toon = 0.6;
    } else {
        toon = 0.3;
    }

    vec3 ambient = uAmbientColor;
    vec3 diffuse = vBaseColor * toon;
    vec3 color = ambient + diffuse;

    // Apply selection additive highlight (uSelectionFactor 0-1)
    color = mix(color, color + uSelectionEmissive, uSelectionFactor);

    gl_FragColor = vec4(color, 1.0);
}
`;

// Plastic style shader adapted from README TODO (soft half-lambert diffuse, plastic specular, Fresnel outline)
export const plasticVertex = `
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
varying vec3 vViewDir;
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
    vViewDir = -normalize(mvPos.xyz);
#ifdef USE_INSTANCING
    vNormal = normalize(normalMatrix * (mat3(instanceMatrix) * normal));
#else
    vNormal = normalize(normalMatrix * normal);
#endif
}
`;

export const plasticFragment = `
precision highp float;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vBaseColor;

uniform vec3 uLightDirection;
uniform vec3 uSpecularColor;
uniform float uShininess;
uniform float uOutlineWidth; // 0-1, where lower => thicker rim

uniform vec3 uSelectionEmissive;
uniform float uSelectionFactor;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDir);
    vec3 lightDir = normalize(uLightDirection);

    // 1. half-Lambert diffuse (softer shadow)
    float diffuse = dot(normal, lightDir) * 0.5 + 0.5;
    vec3 diffuseColor = mix(vBaseColor * 0.2, vBaseColor, diffuse);

    // 2. plastic specular using Blinn-Phong half-vector
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), max(1.0, uShininess));
    vec3 specularColor = uSpecularColor * spec * 0.8;

    // 3. Fresnel outline (black rim at grazing angles)
    float fresnel = dot(normal, viewDir);
    float outline = smoothstep(uOutlineWidth, uOutlineWidth + 0.05, fresnel);

    vec3 finalColor = diffuseColor + specularColor;

    // Apply outline: mix with black based on outline factor
    finalColor = mix(vec3(0.0), finalColor, outline);

    // Apply selection additive highlight
    finalColor = mix(finalColor, finalColor + uSelectionEmissive, uSelectionFactor);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export function createAtomMaterial({ color = new THREE.Color(0xffffff), lightDir = new THREE.Vector3(0.5, 0.2, 1.0), ambient = new THREE.Color(0.12, 0.12, 0.12), specular = new THREE.Color(1.0, 1.0, 1.0), shininess = 32, selectionEmissive = new THREE.Color(0.24, 0.6, 1.0), style = 'toon', outlineWidth = 0.25 } = {}) {
    // style: 'toon' (default) or 'plastic'
    const isPlastic = style === 'plastic';
    const mat = new THREE.RawShaderMaterial({
        vertexShader: isPlastic ? plasticVertex : atomVertex,
        fragmentShader: isPlastic ? plasticFragment : atomFragment,
        uniforms: Object.assign({}, isPlastic ? {
            uColor: { value: color },
            uLightDirection: { value: lightDir.clone().normalize() },
            uSpecularColor: { value: specular },
            uShininess: { value: shininess },
            uOutlineWidth: { value: outlineWidth },
            uSelectionEmissive: { value: selectionEmissive },
            uSelectionFactor: { value: 0.0 }
        } : {
            uColor: { value: color },
            uLightDirection: { value: lightDir.clone().normalize() },
            uAmbientColor: { value: ambient },
            uSpecularColor: { value: specular },
            uShininess: { value: shininess },
            uSelectionEmissive: { value: selectionEmissive },
            uSelectionFactor: { value: 0.0 }
        }),
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

// Outline shaders for backface outline technique
export const outlineVertex = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
#ifdef USE_INSTANCING
  attribute mat4 instanceMatrix;
#endif

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
    vec4 worldPos;
#ifdef USE_INSTANCING
    worldPos = instanceMatrix * vec4(position, 1.0);
#else
    worldPos = vec4(position, 1.0);
#endif
    vec4 mvPos = modelViewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPos;
}
`;

export const outlineFragment = `
precision highp float;

uniform vec3 uColor;

void main() {
    gl_FragColor = vec4(uColor, 1.0);
}
`;

export function createOutlineMaterial({ color = new THREE.Color(0x000000) } = {}) {
    const mat = new THREE.RawShaderMaterial({
        vertexShader: outlineVertex,
        fragmentShader: outlineFragment,
        uniforms: {
            uColor: { value: color }
        },
        side: THREE.BackSide,
        transparent: false
    });
    return mat;
}
