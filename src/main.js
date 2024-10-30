
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

import { GlslPipeline } from 'glsl-pipeline';

import shader_vert from "./glsl/main.vert";
import shader_frag from "./glsl/main.frag";

let W = window,
    D = document;

const hdrUrl = 'assets/little_paris_eiffel_tower_2k.hdr';
const meshUrl = 'assets/dragon.obj';
// const meshUrl = 'assets/teapot.glb';

let width = W.innerWidth;
let height = W.innerHeight;
let pixelRatio = W.devicePixelRatio;

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio(pixelRatio);
renderer.setSize(width, height);
renderer.shadowMap.enabled = true;
D.body.appendChild(renderer.domElement);

let uniforms = {};

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

// Scene: IBL
glsl_pipeline.setCubemap(hdrUrl, scene);

// Scene: Lights
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

// Scene: Floor
const floor = new THREE.PlaneGeometry(5, 5, 1, 36);
floor.rotateX(-Math.PI * 0.5);
floor.translate(0, -0.7, 0);
const floorMesh = new THREE.Mesh(floor, glsl_pipeline.branchMaterial("FLOOR"));
floorMesh.castShadow = false;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

// Scene: 2 spheres (dialectic/metallic) and color checker billboards
scene.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1,200), glsl_pipeline.branchMaterial("DEVLOOK_SPHERE_0")));
scene.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1,200), glsl_pipeline.branchMaterial("DEVLOOK_SPHERE_1")));
const devlook_billboard_0 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glsl_pipeline.branchMaterial("DEVLOOK_BILLBOARD_0"));
devlook_billboard_0.material.transparent = true;
scene.add(devlook_billboard_0);

const onProgress = function ( xhr ) { if ( xhr.lengthComputable ) { console.log(xhr.loaded / xhr.total * 100); } };
const onError = function ( e ) { console.error( e ); };

// Scene: set loader
var filepathSplit = meshUrl.split('.');
var fileExt = filepathSplit.pop().toLowerCase();
var loader = undefined;
if (fileExt == "obj") {
    loader = new OBJLoader();
}
else if (fileExt == "gltf" || fileExt == "glb") {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath( 'https://unpkg.com/three@latest/examples/jsm/libs/draco/gltf/' );
    loader = new GLTFLoader();
    loader.setDRACOLoader( dracoLoader );
}

// Scene: Load the mesh
loader.load(meshUrl, function ( object ) {
    const model = object.scene || object;
    // for each child in the model
    model.traverse((child) => {
        if (child.isMesh) {
            // Smooth surface
            child.geometry.deleteAttribute('normal');
            child.geometry = BufferGeometryUtils.mergeVertices(child.geometry);
            child.geometry.computeVertexNormals(child.geometry);
            // Set material
            child.material = glsl_pipeline.material;
            // Shadows
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    // Add to scene
    scene.add( model ); 
}, onProgress, onError );

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
