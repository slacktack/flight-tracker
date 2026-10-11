// Top-down airliner, nose up, drawn once and registered as an SDF so MapLibre can tint it.
export function planeImage(size = 64): ImageData {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const s = size / 64;
  g.scale(s, s);
  g.fillStyle = '#fff';
  const p = new Path2D();
  // fuselage
  p.moveTo(32, 3);
  p.bezierCurveTo(35, 5, 35.5, 9, 35.5, 14);
  p.lineTo(35.5, 50);
  p.lineTo(32, 58);
  p.lineTo(28.5, 50);
  p.lineTo(28.5, 14);
  p.bezierCurveTo(28.5, 9, 29, 5, 32, 3);
  // wings
  p.moveTo(35, 23);
  p.lineTo(61, 37);
  p.lineTo(61, 41);
  p.lineTo(35, 34);
  p.moveTo(29, 23);
  p.lineTo(3, 37);
  p.lineTo(3, 41);
  p.lineTo(29, 34);
  // tailplane
  p.moveTo(34.5, 48);
  p.lineTo(45, 55);
  p.lineTo(45, 58);
  p.lineTo(33, 55);
  p.moveTo(29.5, 48);
  p.lineTo(19, 55);
  p.lineTo(19, 58);
  p.lineTo(31, 55);
  g.fill(p);
  return g.getImageData(0, 0, size, size);
}
