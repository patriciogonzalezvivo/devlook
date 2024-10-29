
uniform mat4    u_lightMatrix;
varying vec4    v_lightCoord;

uniform mat4    u_modelViewProjectionMatrix;
uniform mat4    u_projectionMatrix;
uniform mat4    u_modelMatrix;
uniform mat4    u_viewMatrix;
uniform mat3    u_normalMatrix;

uniform vec3    u_camera;
uniform vec2    u_resolution;
uniform float   u_time;

varying vec4    v_position;
varying vec4    v_tangent;
varying vec4    v_color;
varying vec3    v_normal;
varying vec2    v_texcoord;

#ifdef PLATFORM_WEBGL

// ThreeJS 
#define POSITION_ATTRIBUTE  vec4(position,1.0)
#define TANGENT_ATTRIBUTE   tangent
#define COLOR_ATTRIBUTE     color
#define NORMAL_ATTRIBUTE    normal
#define TEXCOORD_ATTRIBUTE  uv
#define CAMERA_UP           vec3(0.0, -1.0, 0.0)
#define MODEL_MATRIX        modelMatrix
#define VIEW_MATRIX         viewMatrix
#define PROJECTION_MATRIX   projectionMatrix

#else

// GlslViewer
#define POSITION_ATTRIBUTE  a_position
attribute vec4              POSITION_ATTRIBUTE;

#ifdef MODEL_VERTEX_TANGENT
#define TANGENT_ATTRIBUTE   a_tangent
attribute vec4              TANGENT_ATTRIBUTE;
#endif

#ifdef MODEL_VERTEX_COLOR
#define COLOR_ATTRIBUTE     a_color
attribute vec4              COLOR_ATTRIBUTE;
#endif

#ifdef MODEL_VERTEX_NORMAL
#define NORMAL_ATTRIBUTE    a_normal
attribute vec3              NORMAL_ATTRIBUTE;
#endif

#ifdef MODEL_VERTEX_TEXCOORD
#define TEXCOORD_ATTRIBUTE  a_texcoord
attribute vec2              TEXCOORD_ATTRIBUTE;
#endif

#define CAMERA_UP           vec3(0.0, 1.0, 0.0)
#define MODEL_MATRIX        u_modelMatrix
#define VIEW_MATRIX         u_viewMatrix
#define PROJECTION_MATRIX   u_projectionMatrix

#endif

#include "lygia/math/const.glsl"
#include "lygia/math/toMat4.glsl"
#include "lygia/math/inverse.glsl"
#include "lygia/space/lookAt.glsl"
#include "lygia/space/orthographic.glsl"

void main(void) {
    v_position = POSITION_ATTRIBUTE;
    v_color = vec4(1.0);
    v_normal = NORMAL_ATTRIBUTE;
    
    #if defined(PLATFORM_WEBGL) || defined(MODEL_VERTEX_TEXCOORD)
    v_texcoord = TEXCOORD_ATTRIBUTE;
    #else
    v_texcoord = v_position.xy;
    #endif

    #if defined(USE_TANGENT) || defined(MODEL_VERTEX_TANGENT)
    v_tangent = TANGENT_ATTRIBUTE;
    #endif

    #if defined(USE_COLOR) || defined(MODEL_VERTEX_COLOR) 
    v_color = COLOR_ATTRIBUTE;
    #endif

    #if defined(FLOOR) && defined(PLATFORM_WEBGL)
    v_position.xz *= vec2(2.0, 2.0);
    float z = 1.0-(v_position.z * 0.1 + 0.25);
    v_position.y += pow(z, 12.0) * 0.5;

    #endif

#if defined(DEVLOOK_SPHERE_0) || defined(DEVLOOK_SPHERE_1) || defined(DEVLOOK_BILLBOARD_0)

    #ifdef LIGHT_SHADOWMAP
    v_lightCoord = vec4(0.0);
    #endif

    float area = 2.0;
    mat4 P = orthographic(  area, -area, 
                            area, -area, 
                            -1.0, 5.0);

    #if defined(DEVLOOK_BILLBOARD_0)
    mat4 V = mat4(1.0);
    float S = 0.65;
    #else
    mat4 V = inverse( toMat4( lookAt(normalize(u_camera), vec3(0.0), CAMERA_UP) ) );
    float S = 0.25;
    #endif

    gl_Position = P * V * POSITION_ATTRIBUTE;
    float aspect = u_resolution.y / u_resolution.x;
    gl_Position.xy *= vec2(aspect, 1.0) * S;
    gl_Position.x -= 0.8;

    #if defined(DEVLOOK_SPHERE_0)
    gl_Position.y += 0.8; 
    #elif defined(DEVLOOK_SPHERE_1)
    gl_Position.y += 0.5;
    #elif defined(DEVLOOK_BILLBOARD_0)
    gl_Position.y += 0.2;
    #endif

#else

    v_position = MODEL_MATRIX * v_position;
    #if defined(LIGHT_SHADOWMAP)
    v_lightCoord = u_lightMatrix * v_position;
    #endif
    
    gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * v_position;

#endif
}