
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { LightProbeHelper } from 'three/addons/helpers/LightProbeHelper.js';
import { LightProbeGenerator } from 'three/addons/lights/LightProbeGenerator.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

import { GlslPipeline } from 'glsl-pipeline';

import shader_vert from "./glsl/main.vert";
import shader_frag from "./glsl/main.frag";

let W = window,
    D = document;

let width = W.innerWidth;
let height = W.innerHeight;
let pixelRatio = W.devicePixelRatio;

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio(pixelRatio);
renderer.setSize(width, height);
renderer.shadowMap.enabled = true;
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
D.body.appendChild(renderer.domElement);

let uniforms = {
    u_cubeMap: { type: "t", value: null },
    u_SH: { type: "vec3", value:[
        new THREE.Vector3(0.0, 0.0, 0.0), 
        new THREE.Vector3(0.0, 0.0, 0.0),
        new THREE.Vector3(0.0, 0.0, 0.0),
        new THREE.Vector3(0.0, 0.0, 0.0),
        new THREE.Vector3(0.0, 0.0, 0.0),
        new THREE.Vector3(0.0, 0.0, 0.0),
        new THREE.Vector3(0.0, 0.0, 0.0),
        new THREE.Vector3(0.0, 0.0, 0.0),
        new THREE.Vector3(0.0, 0.0, 0.0),
    ]},
};

// GLSL Buffers
const glsl_pipeline = new GlslPipeline(renderer, uniforms);
glsl_pipeline.load(shader_frag, shader_vert);

// Camera
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.z = 3;
const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

// Scene
const scene = new THREE.Scene();

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget( 256 );
let cubeCamera = new THREE.CubeCamera( 1, 1000, cubeRenderTarget );
cubeCamera.position.set(0, 1, 0);
let lightProbe;

new RGBELoader()
    .setPath( 'assets/' )
    .load( 'little_paris_eiffel_tower_2k.hdr', function ( texture ) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.encoding = THREE.RGBEEncoding;
        texture.flipY = true;

        scene.background = texture;
        scene.environment = texture;
        uniforms.u_cubeMap.value = texture;

        cubeCamera.update( renderer, scene );
        const probe = LightProbeGenerator.fromCubeRenderTarget( renderer, cubeRenderTarget );
        probe.then( ( p ) => { 
            lightProbe = p;
            uniforms.u_SH.value = lightProbe.sh.coefficients;
            uniforms.u_cubeMap.value = cubeRenderTarget.texture;
        } );
    } );

// Scene, Lights
const light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(0, 10, 8);
light.lookAt(0, 0, 0);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 20;
scene.add(light);
glsl_pipeline.setLight(light);

// Scene, Floor
const floor = new THREE.PlaneGeometry(5, 5, 1, 36);
floor.rotateX(-Math.PI * 0.5);
floor.translate(0, -0.7, 0);
const floorMesh = new THREE.Mesh(floor, glsl_pipeline.branchMaterial("FLOOR"));
floorMesh.castShadow = false;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

// Scene, devlook
const devlook_sphere_0 = new THREE.Mesh(new THREE.IcosahedronGeometry(1,200), glsl_pipeline.branchMaterial("DEVLOOK_SPHERE_0"));
scene.add(devlook_sphere_0);

const devlook_sphere_1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1,200), glsl_pipeline.branchMaterial("DEVLOOK_SPHERE_1"));
scene.add(devlook_sphere_1);

const devlook_billboard_0 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glsl_pipeline.branchMaterial("DEVLOOK_BILLBOARD_0"));
devlook_billboard_0.material.transparent = true;
scene.add(devlook_billboard_0);

// Scene, Mesh
const objLoader = new OBJLoader();
objLoader.load(
    'assets/dragon.obj',
    function ( object ) { 
        // Smooth surface
        object.children[0].geometry.deleteAttribute('normal');
        object.children[0].geometry = BufferGeometryUtils.mergeVertices(object.children[0].geometry);
        object.children[0].geometry.computeVertexNormals(object.children[0].geometry);
        // Set material
        object.children[0].material = glsl_pipeline.material;
        object.children[0].castShadow = true;
        object.children[0].receiveShadow = true;
        // Add to scene
        scene.add( object ); 
    },
    function ( xhr ) { console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' ); },
    function ( error ) { console.log( 'An error happened' ); }
);

const draw = () => {
    glsl_pipeline.renderScene(scene, camera);
    requestAnimationFrame(draw);
};

const resize = () => {
    width = W.innerWidth;
    height = W.innerHeight;
    pixelRatio = W.devicePixelRatio;

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);

    glsl_pipeline.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
};

W.addEventListener("resize", resize);
resize();

draw();