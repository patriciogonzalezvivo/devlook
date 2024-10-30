// IBL
uniform samplerCube             u_cubeMap;
uniform vec3                    u_SH[9];

// Scene
uniform sampler2D               u_scene;
uniform sampler2D               u_sceneDepth;

uniform mat4                    u_viewMatrix;

uniform vec3                    u_camera;
uniform float                   u_cameraDistance;
uniform float                   u_cameraNearClip;
uniform float                   u_cameraFarClip;

uniform vec2                    u_resolution;
#define RESOLUTION              u_resolution
uniform vec2                    u_mouse;
uniform float                   u_time;


#if !defined(POSTPROCESSING)
// Shadow
uniform sampler2D               u_lightShadowMap;
uniform mat4                    u_lightMatrix;
uniform vec3                    u_light;
uniform vec3                    u_lightColor;
uniform float                   u_lightIntensity;
varying vec4                    v_lightCoord;
#define LIGHT_DIRECTION         u_light
#define LIGHT_COORD             v_lightCoord
#define LIGHT_COLOR             u_lightColor
#define LIGHT_INTENSITY         u_lightIntensity

// Surface position (from vertex shader - common)
varying vec4                    v_position;
#define SURFACE_POSITION        v_position

// More model data (from vertex shader - common)
#define MODEL_VERTEX_TANGENT    v_tangent
varying vec4                    v_color;
varying vec3                    v_normal;
#define MODEL_VERTEX_NORMAL     v_normal
varying vec2                    v_texcoord;
#define MODEL_VERTEX_TEXCOORD   v_texcoord
#endif

// Light uniforms (common)
#if defined(PLATFORM_WEBGL) && !defined(POSTPROCESSING)
    // hook model color (from vertext shader - threejs only)
    #define MODEL_VERTEX_COLOR  v_color

    // Reuse Three.js unpacking formulat for shadow maps
    #include <packing>
    #define SAMPLERSHADOW_FNC(TEX, UV) unpackRGBAToDepth(SAMPLER_FNC(TEX, UV))
    #define SHADOWMAP_BIAS 0.0
#endif

#if defined(DEVLOOK_SPHERE_0) || defined(DEVLOOK_SPHERE_1)
// The 2 spheres (dialectic/metallic) have camera at a constant distance
#define CAMERA_POSITION     (normalize(u_camera) * 3.0)
#elif defined(DEVLOOK_BILLBOARD_0)
// The color check billboard has a fixed camera
#define CAMERA_POSITION     vec3(0.0, 0.0, 3.0) 
#else
#define CAMERA_POSITION     u_camera
#endif

// #include "lygia/lighting/atmosphere.glsl"
// #define ENVMAP_FNC(NORM, ROUGHNESS, METALLIC) atmosphere(NORM, normalize(LIGHT_DIRECTION))

#include "lygia/space/ratio.glsl"
#include "lygia/color/space/rgb2srgb.glsl"
#include "lygia/color/space/srgb2rgb.glsl"

// Filter
#include "lygia/sample/clamp2edge.glsl"
#include "lygia/space/linearizeDepth.glsl"

// #define SAMPLEDOF_DEBUG
#define SAMPLEDOF_BLUR_SIZE 12.
#define SAMPLEDOF_DEPTH_SAMPLE_FNC(TEX, UV) linearizeDepth( sampleClamp2edge(TEX, UV).r, u_cameraNearClip, u_cameraFarClip)
#include "lygia/sample/dof.glsl"

// 2D Components 
#include "lygia/draw/colorChecker.glsl"

#define DIGITS_SIZE vec2(.01)
#define PIXEL_SIZE vec2(0.005)
#define PIXEL_KERNEL_SIZE 8
#include "lygia/draw/colorPicker.glsl"
#include "lygia/draw/matrix.glsl"

// PBR pipeline
#include "lygia/lighting/material/new.glsl"
#include "lygia/lighting/pbr.glsl"

void main() {
    vec4 color = vec4(0.0);
    vec2 pixel = 1.0 / u_resolution;
    vec2 st = gl_FragCoord.xy * pixel;

    // #if defined(POSTPROCESSING)
    //     vec2 uv = ratio(st, u_resolution);
    //     vec2 mouse = u_mouse * pixel;

    //     float fp = u_cameraDistance * 0.95;
    //     // fp = SAMPLEDOF_DEPTH_SAMPLE_FNC(u_sceneDepth, mouse);

    //     color = texture2D(u_scene, st);

    //     color.rgb = mix(color.rgb, sampleDoF(u_scene, u_sceneDepth, st, fp, 20.0), step(0.2,st.x));

    //     vec4 debug = vec4(0.0);
    //     debug += colorPicker(u_scene, mouse, u_resolution, uv - ratio(mouse, u_resolution));
    //     debug += matrix(st * vec2(1.0,u_resolution.y/u_resolution.x) * 2.0 - vec2(0.05), u_viewMatrix);
    //     color = mix(color, debug, debug.a);

    // #else

        // 3D PBR Scene 
        Material material = materialNew();
        material.albedo.rgb = vec3(1.0);
        // material.roughness = 0.5;
        // material.metallic = 0.2;

        #if defined(FLOOR)
        // Floor
        material.albedo.rgb = vec3(0.25);
        material.roughness = 1.0;
        material.metallic = 0.001;

        #elif defined(DEVLOOK_SPHERE_0)
        // Dialectic Sphere
        material.metallic = 0.0;
        material.roughness = 1.0;

        #elif defined(DEVLOOK_SPHERE_1)
        // Metallic Sphere
        material.metallic = 1.0;
        material.roughness = 0.0;

        #elif defined(DEVLOOK_BILLBOARD_0)
        // Color Checker Billboard
        material.roughness = 1.0;
        material.metallic = 0.0;
        material.albedo = srgb2rgb(colorChecker(v_texcoord));
        #endif

    color = pbr(material);
    color = rgb2srgb(color);
    // #endif

    gl_FragColor = color;
}