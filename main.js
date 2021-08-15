const NNPath = './neuralNets/';

const NNWristVersion = '14';
const NNRingVersion = '8';

//戒指模型库参数
const AllRingModelNum=4;
const AllRingURL = ["models/ring/ring1/scene.gltf",
                    "models/ring/ring2/scene.gltf",
                    "models/ring/ring3/scene.gltf",
                    "models/ring/ring4/scene.gltf"] ;
const AllRingScale = [0.09,0.21,1.34,1.1];
const AllRingOffset = [[-4.67, -12.28, -3.1],
                        [-3.44534,-9.34517,-0.60030],
                        [-1.70940,-11.86151,0.44340],
                        [-1.66024,-11.74551,0.26554]];
//X,Y,Z,W
const AllQuaternion = [[-0.060, -0.995, -0.083, -0.004],
    [-0.590,0.051,-0.070,0.802],
    [-0.414,0.591,-0.471,0.507],
    [-0.563,0.041,-0.042,0.825]
];

const wristModesCommonSettings = {
  threshold: 0.92, // detection sensitivity, between 0 and 1

  poseLandmarksLabels: [
    "wristBack", "wristLeft", "wristRight", "wristPalm", "wristPalmTop", "wristBackTop", "wristRightBottom", "wristLeftBottom"
   ],
  isPoseFilter: true,

  // soft occluder parameters (soft because we apply a fading gradient)
  occluderType: "SOFTCYLINDER",
  occluderRadiusRange: [3.5,4.5], // first value: minimum or interior radius of the occluder (full transparency).
                               // second value: maximum or exterior radius of the occluder (full opacity, no occluding effect)
  occluderHeight: 48, // height of the cylinder
  occluderOffset: [0,0,0], // relative to the wrist 3D model
  occluderQuaternion: [0.707,0,0,0.707] // rotation of Math.PI/2 along X axis
};

const ringModesCommonSettings = {
  threshold: 0.9, // detection sensitivity, between 0 and 1

  poseLandmarksLabels: ["ringBack", "ringLeft", "ringRight", "ringPalm", "ringPalmTop", "ringBackTop",
     "ringBase0", "ringBase1", "ringMiddleFinger", "ringPinkyFinger", "ringBasePalm"], //*/
  isPoseFilter: false,

  // Occluder parameters:
  occluderType: "MODEL",
  occluderModelURL: 'assets/occluders/ringOccluder2.glb',
  occluderScale: 1
};

const wristModelCommonSettings = {
  URL: 'models/bracelet/bracelet1/scene.gltf',

  scale: 3.8,
  offset: [0, 3.5, 0],
  quaternion: [0,0,0,1], // Format: X,Y,Z,W (and not W,X,Y,Z like Blender)
};

const ringModelCommonSettings = {
  URL: AllRingURL[0],

  scale: AllRingScale[0],
  offset: AllRingOffset[0],
  quaternion: AllQuaternion[0], // Format: X,Y,Z,W (and not W,X,Y,Z like Blender)
};

const _settings = {
  VTOModes: {
    wrist: Object.assign({
      NNsPaths: [NNPath + 'NN_WRIST_RP_' + NNWristVersion + '.json', NNPath + 'NN_WRIST_RB_' + NNWristVersion + '.json']
    }, wristModesCommonSettings),

    wrist1Side: Object.assign({
      NNsPaths: [NNPath + 'NN_WRIST_RB_' + NNWristVersion + '.json']
    }, wristModesCommonSettings),

    ring: Object.assign({
      NNsPaths: [NNPath + 'NN_RING_RP_' + NNRingVersion + '.json', NNPath + 'NN_RING_RB_' + NNRingVersion + '.json']
    }, ringModesCommonSettings),

    ring1Side: Object.assign({
      NNsPaths: [NNPath + 'NN_RING_RB_' + NNRingVersion + '.json']
    }, ringModesCommonSettings),
  }, // end VTOModes

  models: {
    wristDemo: Object.assign({
      VTOMode: 'wrist'
    }, wristModelCommonSettings),

    ringDemo: Object.assign({
      VTOMode: 'ring'
    }, ringModelCommonSettings),
    
  initialModels: {
    wristDemo: Object.assign({
      VTOMode: 'wrist'
    }, wristModelCommonSettings),

    ringDemo: Object.assign({
      VTOMode: 'ring'
    }, ringModelCommonSettings),

  },
  initialModel: 'ringDemo',

  // debug flags:
  debugDisplayLandmarks: false,
  debugMeshMaterial: false,
  debugOccluder: false,
  debugWholeHand: false
};


let _VTOMode = null;
let _VTOModel = null;

const _states = {
  notLoaded: -1,
  loading: 0,
  idle: 1,
  running: 2,
  busy: 3
};
let _state = _states.notLoaded;
let _isSelfieCam = false;



function setFullScreen(cv){
  const pixelRatio = window.devicePixelRatio || 1;
  cv.width = pixelRatio * window.innerWidth;
  cv.height = pixelRatio * window.innerHeight;
}


// entry point:
function main(){
  _state = _states.loading;

  // get canvases and size them:
  const handTrackerCanvas = document.getElementById('handTrackerCanvas');
  const VTOCanvas = document.getElementById('VTOCanvas');

  setFullScreen(handTrackerCanvas);
  setFullScreen(VTOCanvas);

  // initial VTO mode:
  const initialModelSettings = _settings.models[_settings.initialModel];
  _VTOMode = initialModelSettings.VTOMode; // "ring" or "wrist"
  const VTOModeSettings = _settings.VTOModes[_VTOMode];

  // initialize Helper:
  HandTrackerVTOThreeHelper.init({
    stabilizationSettings: {
      switchNNErrorThreshold: 0.5
    },
    poseLandmarksLabels: VTOModeSettings.poseLandmarksLabels,
    poseFilter: (VTOModeSettings.isPoseFilter) ? PoseFlipFilter.instance({}) : null,
    NNsPaths: VTOModeSettings.NNsPaths,
    threshold: VTOModeSettings.threshold,
    VTOCanvas: VTOCanvas,
    handTrackerCanvas: handTrackerCanvas,
    debugDisplayLandmarks: _settings.debugDisplayLandmarks,
  }).then(start).catch(function(err){
    throw new Error(err);
  });
}


function set_lighting(three){
  const scene = three.scene;

  // TODO: customize
  const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x000000, 2 );
  scene.add(hemiLight);

  const pointLight = new THREE.PointLight( 0xffffff, 2 );
  pointLight.position.set(0, 100, 0);
  scene.add(pointLight);
}


function change_VTOMode(newVTOMode){
  console.log('INFO in main.js - change_VTOMode(): change VTO Mode to ', newVTOMode);

  // clear everything including occluders:
  HandTrackerVTOThreeHelper.clear_threeObjects(true);

  const VTOModeSettings = _settings.VTOModes[newVTOMode];
  return HandTrackerVTOThreeHelper.update({
    poseLandmarksLabels: VTOModeSettings.poseLandmarksLabels,
    poseFilter: (VTOModeSettings.isPoseFilter) ? PoseFlipFilter.instance({}) : null,
    NNsPaths: VTOModeSettings.NNsPaths,
    threshold: VTOModeSettings.threshold
  }).then(function(){
    _VTOMode = newVTOMode;
    set_occluder();
  }).then(function(){
    _state = _states.idle;
  });
}


function load_model(modelId, threeLoadingManager){
  if (   (_state !== _states.running && _state !== _states.idle)
      || modelId === _VTOModel){
    return; // model is already loaded or state is busy or loading
  }
  _state = _states.busy;
  const modelSettings = _settings.models[modelId];

  // remove previous model but not occluders:
  HandTrackerVTOThreeHelper.clear_threeObjects(false);

  // look if we should change the VTOMode:
  if (modelSettings.VTOMode !== _VTOMode ) {
    change_VTOMode(modelSettings.VTOMode).then(function(){
      load_model(modelId, threeLoadingManager);
    });
    return;
  }

  // load new model:
  new THREE.GLTFLoader(threeLoadingManager).load(modelSettings.URL, function(model){
    const me = model.scene.children[0]; // instance of THREE.Mesh
    //me.scale.set(1, 1, 1);


    for(var i=0; i<2; i++)
      me.add(
          new THREE.DirectionalLight( 0xffffff, 1 )
      )
    me.traverse(function(child){
      if (child.material){
        console.log(child)
        child.material.emissive =  child.material.color;
        child.material.emissiveMap = child.material.map ;
      }});

    // tweak the material:
    if (_settings.debugMeshMaterial){
      me.traverse(function(child){
        if (child.material){
          child.material = new THREE.MeshNormalMaterial();
        }});
    }

    // tweak position, scale and rotation:
    if (modelSettings.scale){
      me.scale.multiplyScalar(modelSettings.scale);
    }
    if (modelSettings.offset){
      const d = modelSettings.offset;
      const displacement = new THREE.Vector3(d[0], d[2], -d[1]); // inverse Y and Z
      me.position.add(displacement);
    }
    if (modelSettings.quaternion){
      const q = modelSettings.quaternion;
      me.quaternion.set(q[0], q[2], -q[1], q[3]);
    }

    // add to the tracker:
    HandTrackerVTOThreeHelper.add_threeObject(me);

    _state = _states.running;

  });
}


function start(three){
  set_lighting(three);

  three.loadingManager.onLoad = function(){
    console.log('INFO in main.js: All THREE.js stuffs are loaded');
    _state = _states.running;
  }

  if (_settings.debugWholeHand){
    add_wholeHand(three.loadingManager);
  }

  set_occluder().then(function(){
    _state = _states.idle;
  }).then(function(){
    load_model(_settings.initialModel, three.loadingManager);
  });
} //end start()


function add_wholeHand(threeLoadingManager){
  new THREE.GLTFLoader(threeLoadingManager).load('assets/debug/debugHand.glb', function(model){
    const debugHandModel = model.scene.children[0];
    debugHandModel.traverse(function(threeStuff){
      if (threeStuff.material){
        threeStuff.material = new THREE.MeshNormalMaterial();
      }
    })
    HandTrackerVTOThreeHelper.add_threeObject(debugHandModel);
  });
}


function set_occluder(){
  const VTOModeSettings = _settings.VTOModes[_VTOMode];

  if (VTOModeSettings.occluderType === 'SOFTCYLINDER'){
    return add_softOccluder(VTOModeSettings);
  } else if (VTOModeSettings.occluderType === 'MODEL'){
    return add_hardOccluder(VTOModeSettings);
  } else { // no occluder specified
    return Promise.resolve();
  }
}


function add_hardOccluder(VTOModeSettings){
  return new Promise(function(accept, reject){
    new THREE.GLTFLoader().load(VTOModeSettings.occluderModelURL, function(model){
      const me = model.scene.children[0]; // instance of THREE.Mesh
      me.scale.multiplyScalar(VTOModeSettings.occluderScale);

      if (_settings.debugOccluder){
        me.material = new THREE.MeshNormalMaterial();
        return;
      }
      HandTrackerVTOThreeHelper.add_threeOccluder(me);
      accept();
    });
  });
}


function add_softOccluder(VTOModeSettings){
  // add a soft occluder (for the wrist for example):
  const occluderRadius = VTOModeSettings.occluderRadiusRange[1];
  const occluderMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(occluderRadius, occluderRadius, VTOModeSettings.occluderHeight, 32, 1, true),
    new THREE.MeshNormalMaterial()
  );
  const dr = VTOModeSettings.occluderRadiusRange[1] - VTOModeSettings.occluderRadiusRange[0];
  occluderMesh.position.fromArray(VTOModeSettings.occluderOffset);
  occluderMesh.quaternion.fromArray(VTOModeSettings.occluderQuaternion);
  HandTrackerVTOThreeHelper.add_threeSoftOccluder(occluderMesh, occluderRadius, dr, _settings.debugOccluder);
  return Promise.resolve();
}


function flip_camera(){
  if (_state !== _states.running){
    return;
  }
  _state = _states.busy;
  WEBARROCKSHAND.update_videoSettings({
    facingMode: (_isSelfieCam) ? 'environment' : 'user'
  }).then(function(){
    _isSelfieCam = !_isSelfieCam;
    _state = _states.running;
    // mirror canvas using CSS in selfie cam mode:
    document.getElementById('canvases').style.transform = (_isSelfieCam) ? 'rotateY(180deg)' : '';
    console.log('INFO in main.js: Camera flipped successfully');
  }).catch(function(err){
    console.log('ERROR in main.js: Cannot flip camera -', err);
  });
}

function larger(){
  console.log("larger");
  _settings.models['ringDemo'].scale = _settings.models['ringDemo'].scale * 1.25;
  load_model('ringDemo')
  console.log(_settings.models['ringDemo'].scale)
}

function smaller(){
  console.log("smaller")
  _settings.models['ringDemo'].scale = _settings.models['ringDemo'].scale * 0.8;
  load_model('ringDemo')
  console.log(_settings.models['ringDemo'].scale)
}

function changeValue(value){
  _settings.models['ringDemo'].scale = _settings.initialModels['ringDemo'].scale * value;
  load_model('ringDemo')
  console.log(_settings.models['ringDemo'].scale)
}
