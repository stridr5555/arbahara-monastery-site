import * as T from "three";
import { buildPropertyModel } from "./propertyModel";
import type { CameraPose } from "./landTour";

export function createPropertyRenderer(
  host: HTMLDivElement,
  onLost: () => void,
) {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x0d110e, 0);
  renderer.domElement.setAttribute(
    "aria-label",
    "Three-dimensional property model",
  );
  renderer.domElement.setAttribute("role", "img");
  const scene = new T.Scene();
  // A small original sky environment gives the pond a reflected horizon.
  const sky = document.createElement("canvas");
  sky.width = 512;
  sky.height = 256;
  const ctx = sky.getContext("2d")!,
    gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#8da8b6");
  gradient.addColorStop(0.46, "#e3dfc1");
  gradient.addColorStop(0.54, "#4a5335");
  gradient.addColorStop(1, "#263025");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);
  const skyTexture = new T.CanvasTexture(sky);
  skyTexture.colorSpace = T.SRGBColorSpace;
  const pmrem = new T.PMREMGenerator(renderer),
    environment = pmrem.fromEquirectangular(skyTexture);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.5;
  skyTexture.dispose();
  pmrem.dispose();
  const model = buildPropertyModel();
  scene.add(model);
  scene.add(new T.HemisphereLight(0xf6edce, 0x384736, 1.4));
  const sun = new T.DirectionalLight(0xffe3aa, 2.5);
  sun.position.set(-45, 95, 55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -100;
  sun.shadow.camera.right = sun.shadow.camera.top = 100;
  sun.shadow.camera.far = 250;
  sun.shadow.normalBias = 0.3;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const fill = new T.DirectionalLight(0xd8e3de, 0.7);
  fill.position.set(75, 45, -60);
  scene.add(fill);
  const camera = new T.PerspectiveCamera(43, 1, 0.25, 700);
  let pose: CameraPose = { position: [145, 145, 218], target: [0, 0, 0] };
  let disposed = false;
  const draw = (next: CameraPose) => {
    if (disposed || document.hidden) return;
    pose = next;
    const mobile = host.clientWidth < 760;
    const framing = mobile ? 1.2 : 1;
    camera.position
      .set(...next.position)
      .sub(new T.Vector3(...next.target))
      .multiplyScalar(framing)
      .add(new T.Vector3(...next.target));
    camera.lookAt(...next.target);
    renderer.render(scene, camera);
    host.dataset.cameraPosition = camera.position
      .toArray()
      .map((v) => v.toFixed(3))
      .join(",");
    host.dataset.cameraTarget = next.target.map((v) => v.toFixed(3)).join(",");
    host.dataset.modelRotation = model.rotation.toArray().slice(0, 3).join(",");
  };
  const resize = () => {
    if (!host.clientWidth || !host.clientHeight) return;
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    draw(pose);
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  host.append(renderer.domElement);
  host.dataset.meshCount = String(model.children.length);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const onVisibility = () => {
    if (!document.hidden) draw(pose);
  };
  document.addEventListener("visibilitychange", onVisibility);
  return {
    draw,
    snapshot: () => pose,
    dispose: () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>(),
        textures = new Set<T.Texture>();
      scene.traverse((object) => {
        if (!(object instanceof T.Mesh)) return;
        geometries.add(object.geometry);
        for (const mat of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          materials.add(mat);
          for (const value of Object.values(mat))
            if (value instanceof T.Texture) textures.add(value);
        }
        if (object instanceof T.InstancedMesh) object.dispose();
      });
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      sun.shadow.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
