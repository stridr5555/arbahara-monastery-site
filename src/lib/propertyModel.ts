import * as T from "three";

/** Original, photo-informed geometry. Coordinates are illustrative, not survey data.
 * South is +Z, the road is east (+X); house southwest of the north–south pond. */
export function buildPropertyModel() {
  const group = new T.Group();
  group.name = "Crandall property — illustrative reconstruction";
  let seed = 2757;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
  const material = (
    color: T.ColorRepresentation,
    extra: T.MeshStandardMaterialParameters = {},
  ) => new T.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const texture = (kind: "grass" | "stone" | "roof" | "water") => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = {
      grass: "#697145",
      stone: "#aaa18a",
      roof: "#794c43",
      water: "#6f7660",
    }[kind];
    ctx.fillRect(0, 0, 512, 512);
    if (kind === "stone" || kind === "roof") {
      const h = kind === "roof" ? 16 : 32,
        w = kind === "roof" ? 35 : 64;
      for (let y = 0; y < 512; y += h)
        for (let x = -w; x < 512; x += w) {
          const v = Math.floor(random() * 30);
          ctx.fillStyle =
            kind === "roof"
              ? `rgb(${110 + v},${68 + v},${60 + v})`
              : `rgb(${155 + v},${147 + v},${125 + v})`;
          ctx.fillRect(x + (((y / h) % 2) * w) / 2, y, w - 1, h - 1);
        }
    } else {
      if (kind === "grass")
        for (let i = 0; i < 1000; i++) {
          const x = random() * 512,
            y = random() * 512,
            radius = 8 + random() * 60;
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, random() > 0.5 ? "#45563270" : "#a1975860");
          gradient.addColorStop(1, "#69714500");
          ctx.fillStyle = gradient;
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
      for (let i = 0; i < 22000; i++) {
        const v = Math.floor(random() * 50);
        ctx.fillStyle =
          kind === "grass"
            ? `rgba(${80 + v},${91 + v},${45 + v / 2},.32)`
            : `rgba(208,202,153,${random() * 0.13})`;
        ctx.fillRect(
          random() * 512,
          random() * 512,
          kind === "water" ? 8 + random() * 22 : 1,
          1 + random() * 3,
        );
      }
    }
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.anisotropy = 4;
    map.repeat.set(kind === "grass" ? 10 : 2, kind === "grass" ? 12 : 2);
    return map;
  };
  const grass = material("#a2a477", { map: texture("grass"), bumpScale: 0.15 });
  grass.bumpMap = grass.map;
  const stone = material("#eee1c8", { map: texture("stone"), bumpScale: 0.08 });
  stone.bumpMap = stone.map;
  const roof = material("#c39c87", { map: texture("roof"), bumpScale: 0.06 });
  roof.bumpMap = roof.map;
  const ivory = material("#e7e0cd"),
    dark = material("#273832"),
    concrete = material("#bdb7a1");
  const bark = material("#65503a"),
    gravel = material("#bdaf88", { side: T.DoubleSide }),
    rock = material("#625c43", { flatShading: true });
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  const box = (
    parent: T.Group,
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: T.Material,
  ) => {
    const mesh = new T.Mesh(boxGeo, mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const terrain = new T.Mesh(new T.BoxGeometry(113, 6, 141, 28, 2, 35), rock);
  const tp = terrain.geometry.attributes.position;
  for (let i = 0; i < tp.count; i++)
    if (Math.abs(tp.getX(i)) > 55 || Math.abs(tp.getZ(i)) > 69) {
      tp.setX(i, tp.getX(i) + (random() - 0.5) * 2.2);
      tp.setZ(i, tp.getZ(i) + (random() - 0.5) * 2.2);
    }
  terrain.geometry.computeVertexNormals();
  terrain.position.y = -3.2;
  terrain.receiveShadow = true;
  group.add(terrain);
  const lawn = new T.Mesh(new T.PlaneGeometry(112, 140, 70, 85), grass);
  lawn.rotation.x = -Math.PI / 2;
  lawn.receiveShadow = true;
  group.add(lawn);
  // Continuous roadway and curving drive are native ribbons, not image planes.
  const drive = new T.CatmullRomCurve3([
    new T.Vector3(55, 0.12, -35),
    new T.Vector3(39, 0.12, -24),
    new T.Vector3(28, 0.12, 0),
    new T.Vector3(27, 0.12, 39),
    new T.Vector3(9, 0.12, 51),
    new T.Vector3(-27, 0.12, 51),
    new T.Vector3(-34, 0.12, 45),
  ]);
  const ribbon = (
    curve: T.CatmullRomCurve3,
    width: number,
    mat: T.Material,
    name: string,
  ) => {
    const points = curve.getPoints(180),
      positions: number[] = [],
      indices: number[] = [],
      uv: number[] = [];
    points.forEach((p, i) => {
      const tangent = curve.getTangent(i / 180),
        side = new T.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(
          width / 2,
        );
      positions.push(
        p.x + side.x,
        p.y,
        p.z + side.z,
        p.x - side.x,
        p.y,
        p.z - side.z,
      );
      uv.push(0, i / 8, 1, i / 8);
      if (i < 180) {
        const n = i * 2;
        indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      }
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, mat);
    mesh.name = name;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  ribbon(drive, 3.2, gravel, "Curving gravel drive");
  box(
    group,
    "Eastern road context — not a property boundary",
    58,
    -0.05,
    0,
    6,
    0.15,
    141,
    material("#636560"),
  );
  const roadMark = material("#d8c689");
  for (let z = -66; z < 70; z += 9)
    box(group, "Road center marking", 58, 0.04, z, 0.15, 0.02, 3, roadMark);
  // Irregular pond, earthen bank and water surface geometry.
  const pond = new T.Shape();
  pond.moveTo(-10, -38);
  pond.bezierCurveTo(-17, -27, -12, -8, -5, 1);
  pond.bezierCurveTo(0, 7, 9, 2, 12, -10);
  pond.bezierCurveTo(17, -24, 18, -39, 10, -43);
  pond.bezierCurveTo(4, -47, -5, -44, -10, -38);
  const pondMesh = (
    scale: number,
    y: number,
    mat: T.Material,
    name: string,
  ) => {
    const mesh = new T.Mesh(new T.ShapeGeometry(pond, 60), mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.scale.setScalar(scale);
    mesh.position.set(1, y, -4);
    mesh.name = name;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  pondMesh(
    1.09,
    0.05,
    material("#958665", { side: T.DoubleSide }),
    "Natural pond bank",
  );
  pondMesh(
    1,
    0.09,
    material("#b2ba8d", {
      map: texture("water"),
      roughness: 0.28,
      metalness: 0.28,
      side: T.DoubleSide,
    }),
    "Pond water",
  );
  // Main residence: cream stone, steep red-brown roof, two dormers, white chimney, porch.
  const house = new T.Group();
  house.name = "Residence";
  house.position.set(-18, 0, 30);
  group.add(house);
  box(house, "Foundation", 0, 0.22, 0, 16.5, 0.45, 12.5, concrete);
  box(house, "Stone residence walls", 0, 3.2, 0, 16, 6, 12, stone);
  const gable = (
    parent: T.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    rise: number,
    depth: number,
    roofMat: T.Material,
    wallMat: T.Material,
  ) => {
    const shape = new T.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(0, rise);
    shape.lineTo(w / 2, 0);
    shape.closePath();
    const wall = new T.Mesh(
      new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
      wallMat,
    );
    wall.position.set(x, y, z - depth / 2);
    wall.castShadow = true;
    parent.add(wall);
    const slope = Math.atan2(rise, w / 2),
      len = Math.hypot(w / 2, rise);
    for (const side of [-1, 1]) {
      const panel = box(
        parent,
        "Textured pitched roof",
        x + (side * w) / 4,
        y + rise / 2 + 0.12,
        z,
        len + 0.5,
        0.22,
        depth + 0.75,
        roofMat,
      );
      panel.rotation.z = -side * slope;
    }
  };
  const mainRoof = new T.Group();
  mainRoof.rotation.y = Math.PI / 2;
  mainRoof.position.y = 6.2;
  house.add(mainRoof);
  gable(mainRoof, 0, 0, 0, 12.8, 5.7, 16.5, roof, stone);
  box(house, "Covered porch floor", 2.5, 0.35, 8, 11.8, 0.3, 4.8, concrete);
  const porchRoof = box(
    house,
    "Continuous roof over covered porch",
    2.5,
    5.65,
    8,
    11.8,
    0.24,
    5.3,
    roof,
  );
  porchRoof.rotation.x = 0.59;
  for (const x of [-2.8, 0.8, 4.5, 8]) {
    box(house, "Porch white column", x, 2.5, 9.5, 0.22, 4.2, 0.22, ivory);
    box(house, "Column base", x, 0.65, 9.5, 0.45, 0.5, 0.45, ivory);
  }
  box(house, "Porch fascia", 2.5, 4.25, 10.3, 11.8, 0.3, 0.16, ivory);
  const window = (
    parent: T.Group,
    x: number,
    y: number,
    z: number,
    w = 1.5,
    h = 2.3,
  ) => {
    box(
      parent,
      "White window surround",
      x,
      y,
      z,
      w + 0.28,
      h + 0.28,
      0.16,
      ivory,
    );
    box(parent, "Recessed window glass", x, y, z + 0.09, w, h, 0.04, dark);
    box(parent, "Window mullion", x, y, z + 0.13, 0.06, h, 0.05, ivory);
    box(parent, "Window crossbar", x, y, z + 0.13, w, 0.06, 0.05, ivory);
    box(
      parent,
      "Window sill",
      x,
      y - h / 2 - 0.13,
      z + 0.1,
      w + 0.4,
      0.15,
      0.3,
      ivory,
    );
  };
  // Distinctive stone front gable and red-brick side wing visible in land-01.
  const brick = material("#b2694f", { map: texture("stone"), bumpScale: 0.08 });
  brick.bumpMap = brick.map;
  box(house, "Stone front gable walls", -5.4, 4, 5.8, 4.8, 7.8, 3.5, stone);
  gable(house, -5.4, 7.9, 5.8, 5.5, 3.5, 4, roof, stone);
  box(house, "Tall window brick surround", -5.4, 3.9, 7.6, 2.8, 6, 0.2, brick);
  window(house, -5.4, 3.9, 7.75, 2.2, 5.4);
  box(house, "Red brick side wing", -10.5, 2.6, -1, 6, 5, 8, brick);
  gable(house, -10.5, 5.1, -1, 6.6, 2.5, 8.5, roof, brick);
  window(house, -10.5, 2.8, 3.1, 2.7, 2.8);
  for (const x of [-6, 3.7, 6.2]) window(house, x, 2.8, 6.1, 1.3, 2.2);
  box(house, "Front door surround", -1.5, 1.9, 6.16, 1.6, 3.1, 0.2, ivory);
  box(house, "Front door", -1.5, 1.9, 6.3, 1.2, 2.8, 0.1, material("#8c7c62"));
  for (const x of [-0.5, 4]) {
    box(house, "Dormer body", x, 9.1, 3.5, 2.4, 2.8, 2.5, ivory);
    gable(house, x, 10.5, 3.5, 2.8, 1.35, 2.9, roof, ivory);
    window(house, x, 9.1, 4.83, 1.5, 2.1);
  }
  box(house, "White chimney", 6.1, 10.5, -1.5, 1.2, 6.5, 1.2, ivory);
  box(house, "Chimney cap", 6.1, 13.8, -1.5, 1.5, 0.2, 1.5, dark);
  box(house, "Front step", 0, 0.2, 10.8, 4.5, 0.3, 1.3, concrete);
  const garage = new T.Group();
  garage.name = "Two-door garage";
  garage.position.set(-34, 0, 43);
  group.add(garage);
  box(garage, "Garage walls", 0, 2.4, 0, 11, 4.8, 8, ivory);
  gable(garage, 0, 4.8, 0, 11.6, 2.7, 8.5, roof, ivory);
  box(garage, "Garage apron", 0, 0.08, 6, 11.5, 0.15, 5, concrete);
  box(garage, "Garage dormer body", 0, 5.7, 1, 1.6, 1.8, 1.5, ivory);
  gable(garage, 0, 6.6, 1, 2, 1, 1.9, roof, ivory);
  window(garage, 0, 5.7, 1.83, 0.9, 1.3);
  for (const x of [-2.7, 2.7]) {
    box(garage, "Garage door frame", x, 2, 4.05, 4.8, 4, 0.15, dark);
    box(garage, "Garage door", x, 1.95, 4.16, 4.55, 3.7, 0.12, ivory);
    for (let y = 0.45; y < 3.8; y += 0.55)
      box(garage, "Door panel seam", x, y, 4.24, 4.4, 0.035, 0.02, concrete);
    for (const dx of [-1.2, 0, 1.2])
      box(
        garage,
        "Garage upper window",
        x + dx,
        3.1,
        4.24,
        0.75,
        0.35,
        0.03,
        dark,
      );
  }
  for (const z of [-32, -38])
    box(group, "Entrance stone pier", 51, 1.25, z, 1.1, 2.5, 1.1, stone);
  for (let i = 0; i < 12; i++)
    box(
      group,
      "Entrance gate rail",
      51.1,
      1.1,
      -37.7 + i * 0.49,
      0.06,
      1.5,
      0.06,
      dark,
    );
  for (const y of [0.5, 1.7])
    box(group, "Gate horizontal rail", 51.1, y, -35, 0.08, 0.08, 5.8, dark);
  for (let x = -44; x < 2; x += 4)
    box(group, "Residence garden fence post", x, 0.9, 59, 0.1, 1.8, 0.1, dark);
  for (const y of [0.4, 1.3])
    box(group, "Garden fence rail", -22, y, 59, 46, 0.04, 0.04, dark);
  // Native instanced canopies retain parallax and shadows through every flight.
  const trees: { x: number; z: number; h: number; r: number }[] = [],
    drivePoints = drive.getPoints(45);
  for (let i = 0; i < 1100; i++) {
    const x = -54 + random() * 106,
      z = -68 + random() * 134;
    const wooded =
      x < -29 || z < -45 || (z < 10 && x > 17) || (x < -9 && z < 20);
    if (!wooded && random() > 0.075) continue;
    if (((x - 1) / 18) ** 2 + ((z + 24) / 32) ** 2 < 1.25) continue;
    if (Math.abs(x + 18) < 14 && Math.abs(z - 30) < 19) continue;
    if (Math.abs(x + 34) < 10 && Math.abs(z - 43) < 11) continue;
    if (drivePoints.some((p) => Math.hypot(x - p.x, z - p.z) < 5)) continue;
    if (x > 47 || z > 53) continue;
    trees.push({ x, z, h: 4.5 + random() * 5, r: 2 + random() * 2.2 });
  }
  trees.push({ x: -31, z: 24, h: 8, r: 4 }, { x: -3, z: 23, h: 7, r: 3.5 });
  const trunk = new T.InstancedMesh(
    new T.CylinderGeometry(0.2, 0.4, 1, 7),
    bark,
    trees.length,
  );
  const leafCanvas = document.createElement("canvas");
  leafCanvas.width = leafCanvas.height = 256;
  const leafCtx = leafCanvas.getContext("2d")!;
  leafCtx.fillStyle = "#cccccc";
  leafCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8500; i++) {
    const v = Math.floor(90 + random() * 165);
    leafCtx.fillStyle = `rgb(${v},${v},${v})`;
    leafCtx.fillRect(
      random() * 256,
      random() * 256,
      1 + random() * 4,
      1 + random() * 2,
    );
  }
  const leafMap = new T.CanvasTexture(leafCanvas);
  leafMap.colorSpace = T.SRGBColorSpace;
  const leafGeo = new T.IcosahedronGeometry(1, 2),
    lp = leafGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const v =
      1 +
      0.08 *
        Math.sin(lp.getX(i) * 13 + lp.getY(i) * 7) *
        Math.cos(lp.getZ(i) * 11);
    lp.setXYZ(i, lp.getX(i) * v, lp.getY(i) * v, lp.getZ(i) * v);
  }
  // Keep continuous normals across duplicated vertices; avoid a cracked/faceted canopy.
  const normals = leafGeo.attributes.normal;
  for (let i = 0; i < lp.count; i++) {
    const length = Math.hypot(lp.getX(i), lp.getY(i), lp.getZ(i));
    normals.setXYZ(
      i,
      lp.getX(i) / length,
      lp.getY(i) / length,
      lp.getZ(i) / length,
    );
  }
  const leaves = new T.InstancedMesh(
    leafGeo,
    material("#ffffff", {
      map: leafMap,
      bumpMap: leafMap,
      bumpScale: 0.12,
      roughness: 1,
    }),
    trees.length * 7,
  );
  const dummy = new T.Object3D(),
    color = new T.Color();
  trees.forEach((tree, i) => {
    const hue = 0.2 + random() * 0.05,
      saturation = 0.3 + random() * 0.13,
      lightness = 0.3 + random() * 0.08;
    dummy.position.set(tree.x, tree.h / 2, tree.z);
    dummy.scale.set(1, tree.h, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunk.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 7; j++) {
      const angle = j * 2.4 + random(),
        radius = j ? tree.r * 0.55 : 0;
      dummy.position.set(
        tree.x + Math.cos(angle) * radius,
        tree.h - 1 + random() * 1.6,
        tree.z + Math.sin(angle) * radius,
      );
      dummy.scale.set(
        tree.r * (0.65 + random() * 0.2),
        tree.r * (0.75 + random() * 0.2),
        tree.r * (0.7 + random() * 0.2),
      );
      dummy.rotation.set(random(), random(), random());
      dummy.updateMatrix();
      leaves.setMatrixAt(i * 7 + j, dummy.matrix);
      color.setHSL(
        hue,
        saturation,
        lightness + random() * 0.025,
        T.SRGBColorSpace,
      );
      leaves.setColorAt(i * 7 + j, color);
    }
  });
  trunk.castShadow = leaves.castShadow = true;
  leaves.receiveShadow = true;
  group.add(trunk, leaves);
  const edgeRocks = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 1),
    rock,
    380,
  );
  for (let i = 0; i < 380; i++) {
    const along = random(),
      edge = i % 4;
    const x = edge < 2 ? -56 + along * 112 : edge === 2 ? -56 : 56,
      z = edge < 2 ? (edge === 0 ? -70 : 70) : -70 + along * 140;
    dummy.position.set(x, -2.3 - random(), z);
    dummy.scale.set(1 + random() * 2, 1.3 + random() * 2.5, 1 + random() * 2);
    dummy.rotation.set(random(), random(), random());
    dummy.updateMatrix();
    edgeRocks.setMatrixAt(i, dummy.matrix);
  }
  edgeRocks.castShadow = edgeRocks.receiveShadow = true;
  group.add(edgeRocks);
  const tufts = new T.InstancedMesh(
    new T.ConeGeometry(0.09, 0.45, 3),
    material("#71734a"),
    14000,
  );
  for (let i = 0; i < 14000; i++) {
    const x = -54 + random() * 106,
      z = -68 + random() * 136;
    const excluded =
      ((x - 1) / 17) ** 2 + ((z + 24) / 30) ** 2 < 1.1 ||
      (Math.abs(x + 18) < 10 && Math.abs(z - 30) < 12) ||
      (Math.abs(x + 34) < 7 && Math.abs(z - 43) < 9) ||
      drivePoints.some((p) => Math.hypot(x - p.x, z - p.z) < 2);
    dummy.position.set(x, excluded ? -10 : 0.2, z);
    dummy.scale.set(1, 0.5 + random(), 1);
    dummy.rotation.set(0, random() * 6, 0.15);
    dummy.updateMatrix();
    tufts.setMatrixAt(i, dummy.matrix);
  }
  group.add(tufts);
  const shrubs = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 1),
    material("#495332"),
    36,
  );
  for (let i = 0; i < 36; i++) {
    dummy.position.set(-25 + i * 0.44, 0.6, 40);
    dummy.scale.set(0.5, 0.7, 0.55);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    shrubs.setMatrixAt(i, dummy.matrix);
  }
  shrubs.castShadow = true;
  group.add(shrubs);
  const stones = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 0),
    rock,
    180,
  );
  for (let i = 0; i < 180; i++) {
    const a = random() * Math.PI * 2;
    dummy.position.set(
      2 + Math.cos(a) * (14 + random()),
      0.2,
      -24 + Math.sin(a) * (24 + random()),
    );
    dummy.scale.set(0.4 + random(), 0.3 + random() * 0.4, 0.5 + random());
    dummy.rotation.set(random(), random(), random());
    dummy.updateMatrix();
    stones.setMatrixAt(i, dummy.matrix);
  }
  stones.castShadow = true;
  group.add(stones);
  return group;
}
