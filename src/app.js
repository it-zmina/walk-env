import * as THREE from 'three';
import {VRButton} from "three/addons/webxr/VRButton";
import {BoxLineGeometry} from "three/addons/geometries/BoxLineGeometry";

import {GLTFLoader} from "three/addons/loaders/GLTFLoader";
import {DRACOLoader} from "three/addons/loaders/DRACOLoader";

import {XRControllerModelFactory} from "three/addons/webxr/XRControllerModelFactory";
import Stats from "three/addons/libs/stats.module";
import {LoadingBar} from "./utils/LoadingBar";
import {RGBELoader} from "three/addons/loaders/RGBELoader";

import venice_sunset_environment from "../assets/hdr/venice_sunset_1k.hdr"
import college from "../assets/college.glb"

import snowman from "../assets/snowman_-_low_poly.glb"
import {CanvasUI} from "./utils/CanvasUI";
const snowmanPosition = {x: 0, y: 0.5, z: -1, scale: 1.0}

class App {
    constructor() {
        const container = document.createElement('div');
        document.body.appendChild(container);

        this.clock = new THREE.Clock();
        this.counter = 0;

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
        this.camera.position.set(0, 1.6, 0);

        // Dolly and dummy camera objects
        this.dolly = new THREE.Object3D(  );
        this.dolly.position.set(0, 0, 10);
        this.dolly.add( this.camera );
        this.dummyCam = new THREE.Object3D();
        this.camera.add( this.dummyCam );

        this.scene = new THREE.Scene();
        this.scene.add( this.dolly );

        // this.scene.background = new THREE.Color(0x505050);
        const ambient = new THREE.HemisphereLight(0xFFFFFF, 0xAAAAAA, 0.8);
        this.scene.add(ambient);

        const light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        // this.renderer.shadowMap.enabled = true;

        container.appendChild(this.renderer.domElement);

        this.setEnvironment();

        // this.initScene();
        this.setupXR();

        this.getInputSources = true;

        window.addEventListener('resize', this.resize.bind(this));

        // this.renderer.setAnimationLoop(this.render.bind(this));
        this.vec3 = new THREE.Vector3()
        this.clock = new THREE.Clock()
        this.up = new THREE.Vector3(0,1,0)
        this.origin = new THREE.Vector3()
        this.raycaster = new THREE.Raycaster()

        this.stats = new Stats()
        container.appendChild( this.stats.dom )

        this.loadingBar = new LoadingBar()

        this.loadCollege()

        // Add here task 2
        this.vecDolly = new THREE.Vector3()
        this.vecObject = new THREE.Vector3()

        // TASK 2 load JSON file with text for info boards
        // this.boardShown = ''
        // this.boardData = collegeInfo
    }

    setEnvironment(){
        const loader = new RGBELoader().setDataType( THREE.HalfFloatType );
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();

        const self = this;

        loader.load( venice_sunset_environment, ( texture ) => {
            const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
            pmremGenerator.dispose();

            self.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( 'An error occurred setting the environment');
        } );
    }

    loadCollege(){

        // const loader = new GLTFLoader( ).setPath(this.assetsPath);
        // const dracoLoader = new DRACOLoader();
        // dracoLoader.setDecoderPath( '../../libs/three/js/draco/' );
        // loader.setDRACOLoader( dracoLoader );

        const self = this;

        const loader = new GLTFLoader()
        // Provide a DRACOLoader instance to decode compressed mesh data
        const draco = new DRACOLoader()
        draco.setDecoderPath('draco/')
        loader.setDRACOLoader(draco)

        // Load a glTF resource
        loader.load(
            // resource URL
            college,
            // called when the resource is loaded
             gltf => {

                 const college = gltf.scene.children[0];
                 self.scene.add(college)

                 college.traverse(function (child) {
                     if (child.isMesh) {
                         if (child.name.indexOf("PROXY") != -1) {
                             child.material.visible = false;
                             self.proxy = child
                         } else if (child.material.name.indexOf('Glass') != -1) {
                             child.material.opacity = 0.1
                             child.material.transparent = true
                         } else if (child.material.name.indexOf("SkyBox") != -1) {
                             const mat1 = child.material
                             const mat2 = new THREE.MeshBasicMaterial({map: mat1.map})
                             child.material = mat2
                             mat1.dispose()
                         }
                     }
                 })

                 self.loadingBar.visible = false

                 self.setupXR()
             },
            // called while loading is progressing
            xhr => {
                self.loadingBar.progress = (xhr.loaded / xhr.total);
            },
            // called when loading has errors
            error => {
                console.log('An error happened');
            }
        )
    }

    initScene() {
        this.room = new THREE.LineSegments(
            new BoxLineGeometry(6, 6, 6, 10, 10, 10),
            new THREE.LineBasicMaterial({color: 0x808080})
        );

        const geo1 = new THREE.SphereGeometry(0.1, 16, 8);
        const mat1 = new THREE.MeshStandardMaterial({color: 0x3333ff});
        const mat2 = new THREE.MeshStandardMaterial({color: 0x33ff33});
        this.materials = [mat1, mat2];
        this.rsphere = new THREE.Mesh(geo1, mat1);
        this.rsphere.position.set(0.5, 1.6, -1);
        this.scene.add(this.rsphere);
        this.lsphere = new THREE.Mesh(geo1, mat1);
        this.lsphere.position.set(-0.5, 1.6, -1);
        this.scene.add(this.lsphere);

        this.room.geometry.translate(0, 3, 0);
        this.scene.add(this.room);

        const self = this

        this.loadAsset(snowman, snowmanPosition.x, snowmanPosition.y, snowmanPosition.z, scene => {
            const scale = snowmanPosition.scale
            scene.scale.set(scale, scale, scale)
            self.snowman = scene
        })

    }

    loadAsset(gltfFilename, x, y, z, sceneHandler) {
        const self = this
        const loader = new GLTFLoader()
        // Provide a DRACOLoader instance to decode compressed mesh data
        const draco = new DRACOLoader()
        draco.setDecoderPath('draco/')
        loader.setDRACOLoader(draco)

        loader.load(gltfFilename, (gltf) => {
                const gltfScene = gltf.scene
                self.scene.add(gltfScene)
                gltfScene.position.set(x, y, z)
                if (sceneHandler) {
                    sceneHandler(gltfScene)
                }
                // self.loadingBar.visible = false
            },
            null,
            (error) => console.error(`An error happened: ${error}`)
        )
    }

    setupXR() {
        this.renderer.xr.enabled = true

        // Add grip controllers
        // const gripRight = this.renderer.xr.getControllerGrip(0)
        // gripRight.add(new XRControllerModelFactory().createControllerModel(gripRight))
        // this.scene.add(gripRight)
        //
        // const gripLeft = this.renderer.xr.getControllerGrip(1)
        // gripLeft.add(new XRControllerModelFactory().createControllerModel(gripLeft))
        // this.scene.add(gripLeft)

        // Add events
        function onSelectStart(event) {
            this.userData.selectPressed = true
        }

        function onSelectEnd(event) {
            this.userData.selectPressed = false
        }

        const self = this

        this.controllers = this.buildControllers(this.dolly)
        this.controllers.forEach((controller) => {
            controller.addEventListener('selectstart', onSelectStart)
            controller.addEventListener('selectend', onSelectEnd)
        })

        // Add Enter WebXR button
        document.body.appendChild(VRButton.createButton(this.renderer))

        // TASK 2 Initialize mesh for info board

        this.createUI();

        this.renderer.setAnimationLoop(this.render.bind(this))
    }

    buildControllers(parent = this.scene) {
        const controllerModelFactory = new XRControllerModelFactory();

        const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -1 ) ] );

        const line = new THREE.Line( geometry );
        line.scale.z = 0;

        const controllers = [];

        for(let i=0; i<=1; i++){
            const controller = this.renderer.xr.getController( i );
            controller.add( line.clone() );
            controller.userData.selectPressed = false;
            parent.add( controller );
            controllers.push( controller );

            const grip = this.renderer.xr.getControllerGrip( i );
            grip.add( controllerModelFactory.createControllerModel( grip ) );
            parent.add( grip );
        }

        return controllers;
    }

    moveDolly(dt){
        if (this.proxy === undefined) return;

        const wallLimit = 1.3;
        const speed = 2;
        let pos = this.dolly.position.clone();
        pos.y += 1;

        let dir = new THREE.Vector3();
        const q = new THREE.Quaternion();
        //Store original dolly rotation
        const quaternion = this.dolly.quaternion.clone();
        //Get rotation for movement from the headset pose
        this.dolly.quaternion.copy( this.dummyCam.getWorldQuaternion(q) );
        this.dolly.getWorldDirection(dir);
        dir.negate();
        this.raycaster.set(pos, dir);

        let blocked = false;

        let intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            if (intersect[0].distance < wallLimit) blocked = true;
        }

        if (!blocked){
            this.dolly.translateZ(-dt*speed);
            pos = this.dolly.getWorldPosition( this.origin );
        }

        // TASK 1. Update moving constraints

        dir.set(-1,0,0);
        dir.applyMatrix4(this.dolly.matrix);
        dir.normalize();
        this.raycaster.set(pos, dir);

        intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            if (intersect[0].distance<wallLimit) this.dolly.translateX(wallLimit-intersect[0].distance);
        }

        //cast right
        dir.set(1,0,0);
        dir.applyMatrix4(this.dolly.matrix);
        dir.normalize();
        this.raycaster.set(pos, dir);

        intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            if (intersect[0].distance<wallLimit) this.dolly.translateX(intersect[0].distance-wallLimit);
        }

        //cast down
        dir.set(0,-1,0);
        pos.y += 1.5;
        this.raycaster.set(pos, dir);

        intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            this.dolly.position.copy( intersect[0].point );
        }
        //Restore the original rotation
        this.dolly.quaternion.copy( quaternion );
    }

    get selectPressed(){
        return ( this.controllers !== undefined && (this.controllers[0].userData.selectPressed || this.controllers[1].userData.selectPressed) );
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createUI() {
        // Task 2

    }

    showInfoBoard(name, obj, pos) {
        // Task 2

    }

    render( timestamp, frame) {
        // if (this.renderer.xr.isPresenting) {
        //     const session = this.renderer.xr.getSession();
        //     const inputSources = session.inputSources;
        //
        //     this.counter += this.clock.getDelta()
        //     if (this.counter > .2) {
        //         this.getInputSources = true
        //         this.counter = 0
        //         // this.rightStick(1, -1, true)   // For DEBUG
        //         this.leftStick(1, 1, true)   // For DEBUG
        //     }
        //     if (this.getInputSources) {
        //         const info = [];
        //
        //         inputSources.forEach(inputSource => {
        //             const gp = inputSource.gamepad;
        //             const axes = gp.axes;
        //             const buttons = gp.buttons;
        //             const mapping = gp.mapping;
        //             this.useStandard = (mapping === 'xr-standard');
        //             const gamepad = {axes, buttons, mapping};
        //             const handedness = inputSource.handedness;
        //             const profiles = inputSource.profiles;
        //             this.type = "";
        //             profiles.forEach(profile => {
        //                 if (profile.indexOf('touchpad') !== -1) this.type = 'touchpad';
        //                 if (profile.indexOf('thumbstick') !== -1) this.type = 'thumbstick';
        //             });
        //             const targetRayMode = inputSource.targetRayMode;
        //             info.push({gamepad, handedness, profiles, targetRayMode});
        //         });
        //
        //         console.log(JSON.stringify(info));
        //
        //         this.getInputSources = false;
        //     } else if (this.useStandard && this.type !== "") {
        //         inputSources.forEach(inputSource => {
        //             const gp = inputSource.gamepad;
        //             const thumbstick = (this.type === 'thumbstick');
        //             const offset = (thumbstick) ? 2 : 0;
        //             const btnIndex = (thumbstick) ? 3 : 2;
        //             const btnPressed = gp.buttons[btnIndex].pressed;
        //             const material = (btnPressed) ? this.materials[1] : this.materials[0];
        //             const deltaX = gp.axes[offset]
        //             const deltaY = gp.axes[offset + 1]
        //             if (inputSource.handedness === 'right') {
        //                 this.rsphere.position.set(0.5, 1.6, -1).add(this.vec3.set(deltaX, -deltaY, 0));
        //                 this.rsphere.material = material;
        //                 this.rightStick(deltaX, deltaY, btnPressed)
        //             } else if (inputSource.handedness === 'left') {
        //                 this.lsphere.position.set(-0.5, 1.6, -1).add(this.vec3.set(deltaX, -deltaY, 0));
        //                 this.lsphere.material = material;
        //                 this.leftStick(deltaX, deltaY, btnPressed)
        //             }
        //         })
        //     }
        // }

        const dt = this.clock.getDelta();

        if (this.renderer.xr.isPresenting && this.selectPressed){
            this.moveDolly(dt);
        }

        // TASK 2. Show info board as the user gets 3 meters closer to the object.


        this.stats.update()
        this.renderer.render(this.scene, this.camera);
    }

    rightStick(deltaX, deltaY, buttonPressed) {
        if (this.snowman && buttonPressed) {
            // Zoom model
            const currentScale = this.snowman.scale.x
            let scale
            if (currentScale >= 1) {
                scale = currentScale - .1 * deltaY
            } else {
                scale = 1 / (1 / currentScale + .1 * deltaY)
            }
            this.snowman.scale.set(scale, scale, scale)
        } else if(this.snowman) {
            // Rotate model
            this.snowman.rotateY(Math.PI / 180 * 10 * deltaX)
            this.snowman.rotateZ(Math.PI / 180 * 10 * deltaY)
        }
    }

    leftStick(deltaX, deltaY, buttonPressed) {
        if (this.snowman && buttonPressed) {

        } else if(this.snowman) {
            this.snowman.position.add(this.vec3.set(.05 * deltaX, 0, .05 * deltaY))
        }
    }
}

export {App};
