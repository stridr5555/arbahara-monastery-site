import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

/** Actual photographs on planes in 3D, never invented terrain or surveyed geometry. */
export default function LandScene({
  progress,
  onStatus,
}: {
  progress: RefObject<number>;
  onStatus: (status: "loading" | "ready" | "fallback") => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    onStatus("loading");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      onStatus("fallback");
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0x121713);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    let disposed = false;
    let failed = false;
    let loaded = false;
    let lastTime = 0;
    let current = progress.current;
    const textures: THREE.Texture[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const manager = new THREE.LoadingManager();
    manager.onLoad = () => {
      if (!disposed && !failed) {
        loaded = true;
        onStatus("ready");
      }
    };
    manager.onError = () => {
      failed = true;
      if (!disposed) {
        renderer.setAnimationLoop(null);
        onStatus("fallback");
      }
    };
    const loader = new THREE.TextureLoader(manager);
    const texture = (src: string) => {
      const map = loader.load(src, (ready) => {
        if (disposed) ready.dispose();
      });
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      textures.push(map);
      return map;
    };
    const plane = (map: THREE.Texture, width: number, height: number) => {
      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshBasicMaterial({
        map,
        side: THREE.DoubleSide,
      });
      geometries.push(geometry);
      materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      return mesh;
    };
    const aerial = plane(
      texture("/assets/property/user-map-overhead.jpg"),
      24,
      13.5,
    );
    aerial.rotation.x = -Math.PI / 2;
    const residence = plane(
      texture("/assets/property/land-02.webp"),
      7.4,
      4.14,
    );
    residence.position.set(-5, 2.6, 3);
    const entrance = plane(texture("/assets/property/land-01.webp"), 5.3, 3.52);
    entrance.position.set(-9.8, 1.9, -1);
    entrance.rotation.y = 0.4;
    const vision = plane(
      texture("/assets/images/monastery-campus-master-plan.png"),
      8.2,
      6.15,
    );
    vision.position.set(6, 3.2, -1);
    vision.rotation.y = -0.1;
    for (const photo of [residence, entrance, vision]) {
      const edge = new THREE.EdgesGeometry(photo.geometry);
      const material = new THREE.LineBasicMaterial({ color: 0xba995d });
      geometries.push(edge);
      materials.push(material);
      photo.add(new THREE.LineSegments(edge, material));
    }
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1, 14, 13),
      new THREE.Vector3(-5.4, 5.8, 12.5),
      new THREE.Vector3(0, 10, 0.5),
      new THREE.Vector3(6.8, 5.8, 11.4),
      new THREE.Vector3(5.4, 4.4, 9.9),
    ]);
    const focusPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(-5, 2.4, 3),
      new THREE.Vector3(0, 0, -2.8),
      new THREE.Vector3(6, 3.2, -1),
      new THREE.Vector3(6, 3.2, -1),
    ]);
    const position = new THREE.Vector3();
    const focus = new THREE.Vector3();
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = camera.aspect < 1.1 ? 68 : 48;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const draw = (now: number) => {
      if (document.hidden || !loaded || disposed || failed) {
        lastTime = 0;
        return;
      }
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
      lastTime = now;
      current = THREE.MathUtils.damp(current, progress.current, 4, dt);
      path.getPoint(current, position);
      focusPath.getPoint(current, focus);
      camera.position.copy(position);
      camera.lookAt(focus);
      vision.visible = current >= 0.67;
      renderer.render(scene, camera);
      host.dataset.cameraProgress = current.toFixed(4);
    };
    renderer.setAnimationLoop(draw);
    const lost = (event: Event) => {
      event.preventDefault();
      failed = true;
      renderer.setAnimationLoop(null);
      onStatus("fallback");
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [progress, onStatus]);
  return <div className="photo-tour-webgl" ref={mount} aria-hidden="true" />;
}
