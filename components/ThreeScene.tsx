
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AppMode, HandData } from '../types';

interface ThreeSceneProps {
  mode: AppMode;
  handData: HandData | null;
  onLoaded: () => void;
}

class Particle {
  mesh: THREE.Object3D;
  targetPos: THREE.Vector3;
  targetRot: THREE.Euler;
  targetScale: THREE.Vector3;
  type: 'SHAPE' | 'PHOTO' | 'DUST' | 'STAR' | 'NEEDLE';
  twinkleOffset: number;
  twinkleSpeed: number;
  velocity: THREE.Vector3;
  baseScale: number;

  constructor(mesh: THREE.Object3D, type: 'SHAPE' | 'PHOTO' | 'DUST' | 'STAR' | 'NEEDLE') {
    this.mesh = mesh;
    this.type = type;
    this.targetPos = new THREE.Vector3().copy(mesh.position);
    this.targetRot = new THREE.Euler().copy(mesh.rotation);
    this.targetScale = new THREE.Vector3().copy(mesh.scale);
    this.baseScale = mesh.scale.x;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.twinkleSpeed = 0.5 + Math.random() * 2;
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      -0.01 - Math.random() * 0.03,
      (Math.random() - 0.5) * 0.02
    );
  }

  update(mode: AppMode, time: number, isMobile: boolean) {
    const lerpFactor = mode === AppMode.FOCUS ? 0.08 : 0.05;
    this.mesh.position.lerp(this.targetPos, lerpFactor);
    this.mesh.quaternion.slerp(new THREE.Quaternion().setFromEuler(this.targetRot), lerpFactor);
    
    if (this.type === 'SHAPE' || this.type === 'DUST' || this.type === 'STAR') {
        const s = this.baseScale * (0.8 + Math.sin(time * this.twinkleSpeed + this.twinkleOffset) * 0.3);
        const tScale = new THREE.Vector3(s, s, s);
        this.mesh.scale.lerp(tScale, 0.1);
    } else {
        this.mesh.scale.lerp(this.targetScale, lerpFactor);
    }

    if (this.type === 'DUST' && mode !== AppMode.FOCUS) {
        this.targetPos.add(this.velocity);
        if (this.targetPos.y < -20) this.targetPos.y = 30;
    }

    if (mode === AppMode.SCATTER) {
        this.mesh.rotation.x += this.velocity.x * 5;
        this.mesh.rotation.y += this.velocity.y * 5;
    }
  }
}

const ThreeScene: React.FC<ThreeSceneProps> = ({ mode, handData, onLoaded }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const mainGroupRef = useRef<THREE.Group>(new THREE.Group());
  const particlesRef = useRef<Particle[]>([]);
  const isMobile = window.innerWidth < 768;

  const addPhotoToScene = (texture: THREE.Texture) => {
    if (!sceneRef.current) return;
    const frameGeo = new THREE.BoxGeometry(4.2, 5.2, 0.15);
    const frameMat = new THREE.MeshStandardMaterial({ 
        color: 0xd4af37, metalness: 0.9, roughness: 0.1, envMapIntensity: 1.5
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    const photoGeo = new THREE.PlaneGeometry(4, 5);
    const photoMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const photo = new THREE.Mesh(photoGeo, photoMat);
    photo.position.z = 0.08;
    frame.add(photo);
    frame.position.set((Math.random()-0.5)*50, (Math.random()-0.5)*50, (Math.random()-0.5)*50);
    mainGroupRef.current.add(frame);
    particlesRef.current.push(new Particle(frame, 'PHOTO'));
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(isMobile ? 60 : 45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 5, isMobile ? 65 : 55);
    
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Capped for mobile
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 2.2;
    containerRef.current.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 
      isMobile ? 0.4 : 0.6, // Lower bloom for mobile
      0.5, 
      0.85
    );
    composer.addPass(bloomPass);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const coreLight = new THREE.PointLight(0xff7700, 10, 25);
    coreLight.position.set(0, 5, 0);
    scene.add(coreLight);

    const floorGeo = new THREE.CircleGeometry(40, 32);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x050505, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.6
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -12;
    scene.add(floor);

    scene.add(mainGroupRef.current);

    // Optimized Particle Counts for Mobile
    const counts = {
        needles: isMobile ? 600 : 1200,
        ornaments: isMobile ? 400 : 800,
        snow: isMobile ? 800 : 2000
    };

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
    const emeraldMat = new THREE.MeshStandardMaterial({ color: 0x014421, roughness: 0.5 });
    const rubyMat = new THREE.MeshStandardMaterial({ color: 0x9b111e, roughness: 0.2 });

    const starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), new THREE.MeshBasicMaterial({ color: 0xfffce0 }));
    mainGroupRef.current.add(starMesh);
    particlesRef.current.push(new Particle(starMesh, 'STAR'));

    const sphereGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const needleGeo = new THREE.CylinderGeometry(0.02, 0.05, 1.5, 4);

    for(let i = 0; i < counts.needles; i++) {
        const mesh = new THREE.Mesh(needleGeo, emeraldMat);
        mainGroupRef.current.add(mesh);
        particlesRef.current.push(new Particle(mesh, 'NEEDLE'));
    }
    for(let i = 0; i < counts.ornaments; i++) {
        const mesh = new THREE.Mesh(sphereGeo, Math.random() > 0.6 ? goldMat : rubyMat);
        mainGroupRef.current.add(mesh);
        particlesRef.current.push(new Particle(mesh, 'SHAPE'));
    }
    const snowGeo = new THREE.IcosahedronGeometry(0.08, 0);
    const snowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    for(let i = 0; i < counts.snow; i++) {
        const mesh = new THREE.Mesh(snowGeo, snowMat);
        mesh.position.set((Math.random()-0.5)*100, Math.random()*50 - 20, (Math.random()-0.5)*100);
        mainGroupRef.current.add(mesh);
        particlesRef.current.push(new Particle(mesh, 'DUST'));
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#051a05'; ctx.fillRect(0,0,512,640);
    ctx.fillStyle = '#d4af37'; ctx.font = 'bold 70px Cinzel'; ctx.textAlign = 'center';
    ctx.fillText('MERRY', 256, 280); ctx.fillText('CHRISTMAS', 256, 380);
    addPhotoToScene(new THREE.CanvasTexture(canvas));

    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      particlesRef.current.forEach(p => p.update(mode, time, isMobile));
      starMesh.rotation.y += 0.02;
      if (handData) {
        mainGroupRef.current.rotation.y = THREE.MathUtils.lerp(mainGroupRef.current.rotation.y, (handData.x - 0.5) * 2.0, 0.1);
        mainGroupRef.current.rotation.x = THREE.MathUtils.lerp(mainGroupRef.current.rotation.x, (handData.y - 0.5) * 1.5, 0.1);
      } else {
        mainGroupRef.current.rotation.y += 0.003;
      }
      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.fov = window.innerWidth < 768 ? 60 : 45;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('add-photo', ((e: CustomEvent) => {
        new THREE.TextureLoader().load(e.detail, (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            addPhotoToScene(t);
        });
    }) as EventListener);

    onLoaded();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!particlesRef.current.length) return;
    const needles = particlesRef.current.filter(p => p.type === 'NEEDLE');
    const shapes = particlesRef.current.filter(p => p.type === 'SHAPE');
    const photos = particlesRef.current.filter(p => p.type === 'PHOTO');
    const star = particlesRef.current.find(p => p.type === 'STAR');

    if (mode === AppMode.TREE) {
      if (star) star.targetPos.set(0, 16.5, 0);
      needles.forEach((p, i) => {
          const t = i / needles.length;
          const radius = 9 * Math.pow(1 - t, 1.3);
          const angle = t * 50 * Math.PI;
          p.targetPos.set(Math.cos(angle) * radius, t * 28 - 12, Math.sin(angle) * radius);
          p.targetRot.set(Math.random(), angle, Math.random());
      });
      shapes.forEach((p, i) => {
        const t = i / shapes.length;
        const radius = 9.5 * Math.pow(1 - t, 1.3);
        const angle = t * 35 * Math.PI + Math.PI;
        p.targetPos.set(Math.cos(angle) * radius, t * 28 - 12, Math.sin(angle) * radius);
      });
      photos.forEach((p, i) => {
          const a = (i / photos.length) * Math.PI * 2;
          const r = isMobile ? 12 : 16;
          p.targetPos.set(Math.cos(a)*r, 2 + Math.random()*5, Math.sin(a)*r);
          p.targetRot.set(0, -a + Math.PI, 0);
          p.targetScale.set(0.6, 0.6, 0.6);
      });
    } else if (mode === AppMode.SCATTER) {
      particlesRef.current.forEach(p => {
        const r = 10 + Math.random() * 25;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        p.targetPos.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      });
    } else if (mode === AppMode.FOCUS) {
        const focusIdx = Math.floor(Math.random() * photos.length);
        photos.forEach((p, i) => {
            if (i === focusIdx) {
                p.targetPos.set(0, 3, isMobile ? 30 : 35);
                p.targetRot.set(0, 0, 0);
                p.targetScale.set(isMobile ? 3.5 : 5.5, isMobile ? 3.5 : 5.5, 5.5);
            } else {
                p.targetPos.set((Math.random()-0.5)*80, (Math.random()-0.5)*80, -40);
            }
        });
        if (star) star.targetPos.set(0, 40, -50);
    }
  }, [mode]);

  return <div ref={containerRef} className="w-full h-full touch-none" />;
};

export default ThreeScene;
