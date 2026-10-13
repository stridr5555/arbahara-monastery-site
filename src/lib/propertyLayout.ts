/** Traced from the owner's 480 × 270 aerial reference, not a cadastral survey.
 * Pixel-to-scene conversion keeps all landmarks on the SAME plan and scale.
 * Scene units are illustrative, not metres. South is +Z, east is +X. */
export const aerialPoint = (
  x: number,
  y: number,
): readonly [number, number] => [(x - 240) * 0.36, (y - 135) * 0.36];
export const propertyLayout = {
  residence: aerialPoint(146, 190),
  garage: aerialPoint(132, 221),
  entrance: aerialPoint(407, 79),
  pondCenter: aerialPoint(243, 101),
  drive: [
    [407, 79],
    [377, 94],
    [345, 115],
    [318, 132],
    [305, 152],
    [304, 185],
    [302, 212],
    [285, 230],
    [253, 238],
    [214, 241],
    [179, 237],
    [158, 228],
    [142, 223],
  ].map(([x, y]) => aerialPoint(x, y)),
  pond: [
    [221, 49],
    [241, 43],
    [264, 48],
    [287, 59],
    [291, 72],
    [274, 87],
    [265, 111],
    [254, 143],
    [240, 162],
    [223, 159],
    [207, 143],
    [201, 119],
    [202, 96],
    [208, 78],
    [218, 65],
  ].map(([x, y]) => aerialPoint(x, y)),
} as const;
