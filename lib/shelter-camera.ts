import type { GeoProjection } from 'd3-geo';

export type MapCamera = { x: number; y: number; scale: number };
export const OVERVIEW_CAMERA: MapCamera = { x: 0, y: 0, scale: 1 };

// The focused viewport spans about 450 ground metres. Reserve the lower half
// for the dog directory, keeping the facility point visible above it.
export function shelterCamera(
  projection: GeoProjection,
  coordinates: [number, number],
  width: number,
  height: number,
): MapCamera {
  const point = projection(coordinates);
  if (!point) throw new Error('Shelter cannot be projected.');
  const metresPerBasePixel =
    (6378137 * Math.cos((coordinates[1] * Math.PI) / 180)) / projection.scale();
  const scale = (width * metresPerBasePixel) / 450;
  return {
    x: width * 0.5 - point[0] * scale,
    y: height * 0.26 - point[1] * scale,
    scale,
  };
}

// Interpolate the geographic centre and logarithmic zoom together. Interpolating
// translation directly would briefly send the target thousands of pixels away.
export function interpolateCamera(
  from: MapCamera,
  to: MapCamera,
  progress: number,
  width: number,
  height: number,
): MapCamera {
  const t = Math.min(1, Math.max(0, progress));
  const eased = t * t * (3 - 2 * t);
  const scale = Math.exp(
    Math.log(from.scale) + (Math.log(to.scale) - Math.log(from.scale)) * eased,
  );
  const cx = width / 2,
    cy = height / 2;
  const centerX =
    ((cx - from.x) / from.scale) * (1 - eased) +
    ((cx - to.x) / to.scale) * eased;
  const centerY =
    ((cy - from.y) / from.scale) * (1 - eased) +
    ((cy - to.y) / to.scale) * eased;
  return { x: cx - centerX * scale, y: cy - centerY * scale, scale };
}
