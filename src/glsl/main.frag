uniform samplerCube             u_cubeMap;

uniform sampler2D               u_lightShadowMap;
uniform mat4                    u_lightMatrix;
uniform vec3                    u_light;
uniform vec3                    u_lightColor;
uniform vec3                    u_SH[9];
uniform float                   u_lightIntensity;

uniform vec3                    u_camera;
uniform vec2                    u_resolution;
uniform float                   u_time;
uniform int                     u_frame;

varying vec4                    v_lightCoord;
varying vec4                    v_position;
varying vec4                    v_color;
varying vec3                    v_normal;
varying vec2                    v_texcoord;

#define SCENE_SH_ARRAY          u_SH
#define SCENE_CUBEMAP           u_cubeMap
// #define IBL_IMPORTANCE_SAMPLING

#define CAMERA_POSITION         u_camera
#define SURFACE_POSITION        v_position

#define LIGHT_DIRECTION         u_light
#define LIGHT_COORD             v_lightCoord
#define LIGHT_COLOR             u_lightColor
#define LIGHT_INTENSITY         u_lightIntensity

#ifdef PLATFORM_WEBGL
#define MODEL_VERTEX_NORMAL     v_normal
#define MODEL_VERTEX_TEXCOORD   v_texcoord
#define MODEL_VERTEX_TANGENT    v_tangent
#define MODEL_VERTEX_COLOR      v_color
#endif

#include "lygia/math/unpack.glsl"
#define SAMPLERSHADOW_FNC(TEX, UV) unpack(SAMPLER_FNC(TEX, UV))
#define SHADOWMAP_BIAS 0.1

// #include "lygia/lighting/atmosphere.glsl"
// #define ENVMAP_FNC(NORM, ROUGHNESS, METALLIC) atmosphere(NORM, normalize(LIGHT_DIRECTION))

// #include "lygia/sample/equirect.glsl"
// #define ENVMAP_FNC(NORM, ROUGHNESS, METALLIC) srgb2rgb(sampleEquirect(u_tex0, NORM, 1.0 + 26.0 * ROUGHNESS).rgb)

#include "lygia/math/saturate.glsl"
#include "lygia/space/ratio.glsl"
#include "lygia/space/scale.glsl"
#include "lygia/color/space/rgb2srgb.glsl"
#include "lygia/color/space/srgb2rgb.glsl"
#include "lygia/draw/colorChecker.glsl"
#include "lygia/space/lookAt.glsl"

#ifndef BACKGROUND
#include "lygia/lighting/material/new.glsl"
#include "lygia/lighting/pbr.glsl"
#endif

void main() {
    vec4 color = vec4(vec3(0.0), 1.0);
    vec2 pixel = 1.0 / u_resolution;
    vec2 st = gl_FragCoord.xy * pixel;
    vec2 uv = v_texcoord;

    Material material = materialNew();

    #if defined(FLOOR)
    material.albedo.rgb = vec3(0.25);
    material.roughness = 1.0;
    material.metallic = 0.001;

    #elif defined(DEVLOOK_SPHERE_0)
    material.metallic = 0.0;
    material.roughness = 1.0;

    #elif defined(DEVLOOK_SPHERE_1)
    material.metallic = 1.0;
    material.roughness = 0.0;

    #elif defined(DEVLOOK_BILLBOARD_0)
    material.roughness = 1.0;
    material.metallic = 0.0;
    material.albedo = srgb2rgb(colorChecker(uv));

    #else
    material.albedo.rgb = vec3(1.0);

    #endif

    color = pbr(material);

    color = rgb2srgb(color);

    gl_FragColor = color;
}