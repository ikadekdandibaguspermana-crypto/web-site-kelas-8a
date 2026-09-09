(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.warn('[earth3d] Three.js gagal dimuat (cek koneksi/CDN). Background bumi 3D dilewati.');
    return;
  }

  var wrap = document.getElementById('earthCanvasWrap');
  if (!wrap) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isDesktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var TEX_BASE_DESKTOP = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/';
  var TEX_BASE_LITE = 'css/asset/earth-lite/';

  var TEX = isDesktopPointer
    ? {
        atmos: TEX_BASE_DESKTOP + 'earth_atmos_2048.jpg',
        specular: TEX_BASE_DESKTOP + 'earth_specular_2048.jpg',
        normal: TEX_BASE_DESKTOP + 'earth_normal_2048.jpg',
        clouds: TEX_BASE_DESKTOP + 'earth_clouds_1024.png'
      }
    : {
        atmos: TEX_BASE_LITE + 'earth_atmos_lite.jpg',
        specular: TEX_BASE_LITE + 'earth_specular_lite.jpg',
        normal: TEX_BASE_LITE + 'earth_normal_lite.jpg',
        clouds: TEX_BASE_LITE + 'earth_clouds_lite.png'
      };

  var EARTH_RADIUS = 2.15;
  var SPHERE_SEGMENTS = isDesktopPointer ? 64 : 32; // geometri lebih ringan di HP

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0.35, 6.4);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    console.warn('[earth3d] WebGL tidak didukung perangkat ini. Background bumi 3D dilewati.');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); 
  wrap.appendChild(renderer.domElement);

  var sunLight = new THREE.DirectionalLight(0xfff3d6, 1.4);
  scene.add(sunLight);

  var ambient = new THREE.AmbientLight(0x1c2748, 1.15);
  scene.add(ambient);

  var earthGroup = new THREE.Group();
  earthGroup.rotation.z = (23.4 * Math.PI) / 180;
  scene.add(earthGroup);

  var loader = new THREE.TextureLoader();

  var earthMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 9,
    specular: 0x2a2a2a
  });
  var earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    earthMat
  );
  earthGroup.add(earthMesh);

  loader.load(
    TEX.atmos,
    function (tex) {
      if (renderer.capabilities) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    },
    undefined,
    function () { console.warn('[earth3d] Gagal memuat tekstur permukaan bumi.'); }
  );
  loader.load(TEX.specular, function (tex) {
    earthMat.specularMap = tex;
    earthMat.needsUpdate = true;
  });
  loader.load(TEX.normal, function (tex) {
    earthMat.normalMap = tex;
    earthMat.normalScale = new THREE.Vector2(0.55, 0.55);
    earthMat.needsUpdate = true;
  });

  var cloudMat = new THREE.MeshLambertMaterial({
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  });
  var cloudMesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS * 1.015, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    cloudMat
  );
  earthGroup.add(cloudMesh);
  loader.load(TEX.clouds, function (tex) {
    cloudMat.map = tex;
    cloudMat.alphaMap = tex;
    cloudMat.needsUpdate = true;
  });

  var atmoMat = new THREE.ShaderMaterial({
    vertexShader: [
      'varying vec3 vNormal;',
      'void main() {',
      '  vNormal = normalize( normalMatrix * normal );',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vNormal;',
      'void main() {',
      '  float intensity = pow( 0.62 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 3.2 );',
      '  gl_FragColor = vec4( 0.35, 0.62, 1.0, 1.0 ) * intensity;',
      '}'
    ].join('\n'),
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  });
  var atmoMesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS * 1.18, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    atmoMat
  );
  scene.add(atmoMesh);

  (function addStars() {
    var starCount = isDesktopPointer ? 800 : 350;
    var positions = new Float32Array(starCount * 3);
    for (var i = 0; i < starCount; i++) {
      var r = 55 + Math.random() * 40;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    var starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.32,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5
    });
    scene.add(new THREE.Points(starGeo, starMat));
  })();

  function updateSunPosition() {
    var now = new Date();
    var utcHours =
      now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    var subsolarLon = (12 - utcHours) * 15; 

    var startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
    var dayOfYear = Math.floor((now - startOfYear) / 86400000);
    var decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10)); 

    var lonRad = (subsolarLon * Math.PI) / 180;
    var latRad = (decl * Math.PI) / 180;
    var dist = 30;

    sunLight.position.set(
      dist * Math.cos(latRad) * Math.sin(lonRad),
      dist * Math.sin(latRad),
      dist * Math.cos(latRad) * Math.cos(lonRad)
    );
  }
  updateSunPosition();
  setInterval(updateSunPosition, 5 * 60 * 1000);

  var controls = null;
  if (isDesktopPointer && THREE.OrbitControls) {
    var dragTarget = document.getElementById('beranda') || renderer.domElement;
    controls = new THREE.OrbitControls(camera, dragTarget);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableRotate = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.5;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.82;
  }

  if (!isDesktopPointer) {
    (function setupMobileDrag() {
      var dragEl = document.getElementById('beranda');
      if (!dragEl) return;

      var spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);

      var touchActive = false;
      var decided = null; 
      var startX = 0, startY = 0, lastX = 0, lastY = 0;
      var ROTATE_SENSITIVITY = 0.008;
      var DIRECTION_THRESHOLD = 8; 

      dragEl.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        touchActive = true;
        decided = null;
        startX = lastX = e.touches[0].clientX;
        startY = lastY = e.touches[0].clientY;
      }, { passive: true });

      dragEl.addEventListener('touchmove', function (e) {
        if (!touchActive || e.touches.length !== 1) return;
        var x = e.touches[0].clientX;
        var y = e.touches[0].clientY;

        if (decided === null) {
          var dx0 = x - startX;
          var dy0 = y - startY;
          if (Math.abs(dx0) < DIRECTION_THRESHOLD && Math.abs(dy0) < DIRECTION_THRESHOLD) {
            lastX = x; lastY = y;
            return;
          }
          decided = Math.abs(dx0) > Math.abs(dy0) * 1.3 ? 'rotate' : 'scroll';
        }

        if (decided === 'rotate') {
          e.preventDefault();
          var dx = x - lastX;
          spherical.theta -= dx * ROTATE_SENSITIVITY;
          camera.position.setFromSpherical(spherical);
          camera.lookAt(0, 0, 0);
        }


        lastX = x; lastY = y;
      }, { passive: false });

      dragEl.addEventListener('touchend', function () {
        touchActive = false;
        decided = null;
      }, { passive: true });
    })();
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    var delta = Math.min(clock.getDelta(), 0.1);

    if (!reduceMotion) {
      earthMesh.rotation.y += delta * 0.05;
      cloudMesh.rotation.y += delta * 0.065;
    }
    if (controls) controls.update();

    renderer.render(scene, camera);
  }
  animate();
})();