import { createSplash, setSplashProgress, hideSplash, loadAssets } from './assets/scripts/loader.js';
import { setupFullscreenButton } from './assets/scripts/fullscreen.js';
import { loadLanguage } from './assets/scripts/language.js';
import { isMobile} from './assets/scripts/utils/detect.js';

const canvas = document.getElementById('application-canvas');

const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    elementInput: new pc.ElementInput(canvas),
    graphicsDeviceOptions: {
        alpha: true,
        preserveDrawingBuffer: false,
        devicePixelRatio: false,
        antialias: false,
        preferWebGl2: true
    }
});

app.loader.addHandler("font", new pc.FontHandler(app.graphicsDevice));
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

window.addEventListener('resize', () => app.resizeCanvas());
document.getElementById("start-button")?.addEventListener("click", startApp);

const complexFile = isMobile() ? "assets/gsplats/Complex.sog" : "assets/gsplats/ComplexPC.sog";

const fontTexture = new pc.Asset("HelveticaTex", "texture", { url: "assets/fonts/Helvetica.png"});
app.assets.add(fontTexture);

const assetMap = {
    Complex: new pc.Asset("Complex", "gsplat", { url: complexFile }),
    FontTexture: fontTexture,
    Font: new pc.Asset("Helvetica", "font", { url: "assets/fonts/Helvetica.json" }, null, null, [fontTexture]),
    MainBuilding_Glass: new pc.Asset("MainBuilding_Glass", "container", { url: "assets/models/MainBuilding_Glass.glb" }),
    AddBuilding_Glass: new pc.Asset("AddBuilding_Glass", "container", { url: "assets/models/AddBuilding_Glass.glb" }),
    AddBuilding_Glass2: new pc.Asset("AddBuilding_Glass2", "container", { url: "assets/models/AddBuilding_Glass2.glb" }),
    ShaderFrag: new pc.Asset("ShaderFrag", "shader", { url: "assets/shaders/splat.frag" }),
    ShaderVert: new pc.Asset("ShaderVert", "shader", { url: "assets/shaders/splat.vert" }),
    env_px: new pc.Asset("env_px", "texture", { url: "assets/images/cubemap_1/px.png" }),
    env_nx: new pc.Asset("env_nx", "texture", { url: "assets/images/cubemap_1/nx.png" }),
    env_py: new pc.Asset("env_py", "texture", { url: "assets/images/cubemap_1/py.png" }),
    env_ny: new pc.Asset("env_ny", "texture", { url: "assets/images/cubemap_1/ny.png" }),
    env_pz: new pc.Asset("env_pz", "texture", { url: "assets/images/cubemap_1/pz.png" }),
    env_nz: new pc.Asset("env_nz", "texture", { url: "assets/images/cubemap_1/nz.png" })
};

const scriptAssets = [
    new pc.Asset("adjustPixelRatio.js", "script", { url: "assets/scripts/utils/adjustPixelRatio.js" }),
    new pc.Asset("augmentedRealityManager.js", "script", { url: "assets/scripts/AugmentedRealityManager.js" }),
    new pc.Asset("entityPositioner.js", "script", { url: "assets/scripts/EntityPositioner.js" }),
    new pc.Asset("btnAr.js", "script", { url: "assets/scripts/BtnAr.js" }),
    new pc.Asset("carousel.js", "script", { url: "assets/scripts/carousel.js" })
];

Object.values(assetMap).forEach(a => app.assets.add(a));
scriptAssets.forEach(a => app.assets.add(a));

const complexSize = isMobile() ? 10.1 * 1024 * 1024 : 21 * 1024 * 1024;

const assetList = [
    { asset: assetMap.Complex, size: complexSize },
    { asset: assetMap.FontTexture, size: 94 * 1024 },
    { asset: assetMap.MainBuilding_Glass, size: 5 * 1024 },
    { asset: assetMap.AddBuilding_Glass, size: 3 * 1024 },
    { asset: assetMap.AddBuilding_Glass2, size: 4 * 1024 },
    { asset: assetMap.ShaderFrag, size: 2 * 1024 },
    { asset: assetMap.ShaderVert, size: 3 * 1024 },
    { asset: scriptAssets[0], size: 1024 },
    { asset: scriptAssets[1], size: 10 * 1024 },
    { asset: scriptAssets[2], size: 10 * 1024 },
    { asset: scriptAssets[3], size: 10 * 1024 },
    { asset: scriptAssets[4], size: 10 * 1024 },
    { asset: assetMap.env_px, size: 125 * 1024 },
    { asset: assetMap.env_nx, size: 168 * 1024 },
    { asset: assetMap.env_py, size: 41 * 1024 },
    { asset: assetMap.env_ny, size: 255 * 1024 },
    { asset: assetMap.env_pz, size: 158 * 1024 },
    { asset: assetMap.env_nz, size: 143 * 1024 }
];

function startApp() {
    createSplash();

    loadAssets(app, assetList, () => {
        createScene();
    }, setSplashProgress);

    function createScene() {

        const WhiteMat = new pc.StandardMaterial();
        WhiteMat.diffuse = new pc.Color(1, 1, 1);
        WhiteMat.emissive = new pc.Color(1, 1, 1);
        const ReflectMat = new pc.StandardMaterial();

        const getSrc = (a) => {
            const t = a.resource;
            return t.getSource ? t.getSource() : (t._levels && t._levels[0]);
        };

        const sources = [
            getSrc(assetMap.env_px),
            getSrc(assetMap.env_nx),
            getSrc(assetMap.env_py),
            getSrc(assetMap.env_ny),
            getSrc(assetMap.env_pz),
            getSrc(assetMap.env_nz)
        ];
        const size = sources[0]?.width || sources[0]?.videoWidth;

        if (size) {
            const cubemap = new pc.Texture(app.graphicsDevice, {
                cubemap: true,
                width: size,
                height: size,
                format: pc.PIXELFORMAT_SRGBA,
                mipmaps: true
            });

            cubemap.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
            cubemap.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
            cubemap.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
            cubemap.magFilter  = pc.FILTER_LINEAR;

            cubemap.setSource(sources);
            cubemap.upload();

            ReflectMat.useSkybox = false;
            ReflectMat.useMetalness = true;
            ReflectMat.metalness = 1.0;
            ReflectMat.shininess = 0;
            ReflectMat.diffuse = new pc.Color(1, 1, 1);

            ReflectMat.cubeMap = cubemap;
            ReflectMat.cubeMapProjection = pc.CUBEPROJ_BOX;
            ReflectMat.reflectivity = 1;
            ReflectMat.cubeMapProjectionBox = new pc.BoundingBox( new pc.Vec3(9, -13, 1.5), new pc.Vec3(32, 32, 32));
            ReflectMat.update();
        }

        app.scene.ambientLight = new pc.Color(1, 1, 1);

        const Root = new pc.Entity("Root");
        app.root.addChild(Root);

        const ARPositioner = new pc.Entity("AR Positioner");
        Root.addChild(ARPositioner);

        const Model = new pc.Entity("Model");
        ARPositioner.addChild(Model);
        Model.enabled = false;

        const Target = new pc.Entity();
        Target.addComponent('render', {
            type: 'cylinder'
        });
        Target.setLocalScale(0.15, 0.01, 0.15);
        ARPositioner.addChild(Target);

        const Camera = new pc.Entity("Camera");
        Camera.setPosition(0, 0, 0);
        Camera.setEulerAngles(0, 0, 0);
        Camera.addComponent("camera", {clearColor: new pc.Color(0, 0, 0, 0), fov: 50});
        app.root.addChild(Camera);
        Camera.enabled = false;

        const ARCamera = new pc.Entity("ARCamera");
        ARCamera.setPosition(0, 0, 0);
        ARCamera.setEulerAngles(0, 0, 0, 0);
        ARCamera.addComponent("camera", {clearColor: new pc.Color(0, 0, 0, 0), fov: 50});
        app.root.addChild(ARCamera);        

        const Main = new pc.Entity("Main");
        Model.addChild(Main);
        const Glass = new pc.Entity("Glass");
        Model.addChild(Glass);
        Glass.enabled = false;

        const GlassMain = assetMap.MainBuilding_Glass.resource.instantiateRenderEntity();
        if (!GlassMain) {
            return;
        }
        GlassMain.findComponents('render').forEach(function (r) {
            if (r.meshInstances && r.meshInstances.length) {
                r.meshInstances.forEach(function (mi) {
                    mi.material = ReflectMat;
                });
            } else {
                r.material = ReflectMat;
            }
        });
        Glass.addChild(GlassMain);
        GlassMain.setPosition(0.354, 0.291, 3.204);
        GlassMain.setEulerAngles(90, 0, 0);
        GlassMain.setLocalScale(0.98, 0.98, 0.98);

        const GlassAdd = assetMap.AddBuilding_Glass.resource.instantiateRenderEntity();
        if (!GlassAdd) {
            return;
        }
        GlassAdd.findComponents('render').forEach(function (r) {
            if (r.meshInstances && r.meshInstances.length) {
                r.meshInstances.forEach(function (mi) {
                    mi.material = ReflectMat;
                });
            } else {
                r.material = ReflectMat;
            }
        });
        Glass.addChild(GlassAdd);
        GlassAdd.setPosition(6.942, 1.656, 3.981);
        GlassAdd.setEulerAngles(90, 0, 0);
        GlassAdd.setLocalScale(1, 1, 1);

        const GlassAdd2 = assetMap.AddBuilding_Glass2.resource.instantiateRenderEntity();
        if (!GlassAdd2) {
            return;
        }
        GlassAdd2.findComponents('render').forEach(function (r) {
            if (r.meshInstances && r.meshInstances.length) {
                r.meshInstances.forEach(function (mi) {
                    mi.material = ReflectMat;
                });
            } else {
                r.material = ReflectMat;
            }
        });
        Glass.addChild(GlassAdd2);
        GlassAdd2.setPosition(6.942, 1.656, 3.981);
        GlassAdd2.setEulerAngles(90, 0, 0);
        GlassAdd2.setLocalScale(1, 1, 1);

        const gsplatCurrent = new pc.Entity("GSPlatCurrent");
        gsplatCurrent.setPosition(0.215, -2, 0.246);
        gsplatCurrent.setEulerAngles(180, 0, 0);
        gsplatCurrent.addComponent("gsplat", { asset: assetMap.Complex});
        Main.addChild(gsplatCurrent);        

        Main.addComponent("script");
        Main.script.create("carousel", { 
            attributes: {
                camera: Camera,
                scaleFactor: 1.0,
                vertexShader: assetMap.ShaderVert,
                fragmentShader: assetMap.ShaderFrag,
                EnableGlass: Glass,
                cameraAR: ARCamera,
                cameraAdd: Camera
            }
        });

        Root.addComponent("script");
        Root.script.create("adjustPixelRatio");
        Root.script.create('augmentedRealityManager', {
            attributes: { defaultCameraEntity: Camera, arCameraEntity: ARCamera }
        });
        app.root.addChild(Root);

        ARPositioner.addComponent("script");
        ARPositioner.script.create('entityPositioner', {
            attributes: { targetEntity: Model, pointerPreviewEntity: Target }
        });

        const Screen2D = new pc.Entity("UIPanel");
        Screen2D.addComponent("screen", {
            screenSpace: true,
            scaleBlend: 0.5,
            scaleMode: pc.SCALEMODE_BLEND,
            referenceResolution: new pc.Vec2(720, 1280),
        });
        app.root.addChild(Screen2D);

        const ScreenButton = new pc.Entity("Button-AR");
        ScreenButton.addComponent("element", {
            type: "image",
            color: new pc.Color(0.1, 0.5, 1),
            pivot: new pc.Vec2(0.5, 0.5),
            anchor: new pc.Vec4(0.5, 0, 0.5, 0),
            width: 200,
            height: 60,
            useInput: true
        });

        ScreenButton.addComponent("button", {
            imageEntity: ScreenButton,
            active: true
        });

        const ButtonText = new pc.Entity("ButtonText");
        ButtonText.addComponent("element", {
            type: "text",
            text: "LAUNCH AR",
            fontSize: 24,
            fontAsset: assetMap.Font.id,
            pivot: new pc.Vec2(0.5, 0.5),
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            alignment: new pc.Vec2(0.5, 0.5),
            color: new pc.Color(1, 1, 1)
        });
        ScreenButton.addChild(ButtonText);
        ButtonText.setLocalPosition(0, -2, 0);
        ScreenButton.setLocalPosition(0, 80, 0);
        
        Screen2D.addChild(ScreenButton);

        ScreenButton.addComponent("script");
        ScreenButton.script.create('btnAr');

        hideSplash();
        app.start();
        document.getElementById("start-screen").remove();
        setupFullscreenButton();

        const _camEye = new pc.Vec3();
        const _camFwd = new pc.Vec3();
        let cameraInitialPos = null;

        app.on("update", dt => {
            if (app.xr && app.xr.active) {

                if (!cameraInitialPos) {
                    cameraInitialPos = Camera.getPosition().clone();
                }

                Camera.setPosition(cameraInitialPos);
                _camEye.copy(cameraInitialPos);

                _camFwd.copy(ARCamera.forward);
                if (_camFwd.lengthSq() < 1e-6) return;
                _camFwd.normalize();

                const toDeg = 180 / Math.PI;

                const yawRad = Math.atan2(_camFwd.x, _camFwd.z);
                let yawDeg = -yawRad * toDeg;

                const pitchForwardY = _camFwd.y;
                const pitchForwardZ = Math.sqrt(_camFwd.x * _camFwd.x + _camFwd.z * _camFwd.z);

                let pitchRadBase = Math.atan2(pitchForwardY, pitchForwardZ);

                const t   = Math.cos(yawRad);
                const eps = 0.2;

                let signBlend;
                if (t >  eps) {
                    signBlend = 1;
                } else if (t < -eps) {
                    signBlend = -1;
                } else {
                    signBlend = t / eps;
                }

                let pitchRad = pitchRadBase * signBlend;
                const pitchDeg = pitchRad * toDeg;

                Camera.setEulerAngles(pitchDeg, yawDeg, 0);

            } else {
                cameraInitialPos = null;
            }
        });
    };
};