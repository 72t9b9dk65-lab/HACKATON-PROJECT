import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { geoPath } from 'd3-geo';
import { realShelters } from '../lib/hundstallet-shelters.ts';
import { prepareSwedenMap } from '../lib/sweden-map.ts';
import {
  OVERVIEW_CAMERA,
  shelterCamera,
  interpolateCamera,
} from '../lib/shelter-camera.ts';
const boundary = JSON.parse(
  readFileSync(new URL('../public/data/sweden.json', import.meta.url)),
);

test('Shelter zoom reaches the verified facility point at street scale on desktop and mobile', () => {
  for (const [width, height] of [
    [900, 770],
    [430, 780],
    [366, 780],
  ]) {
    const prepared = prepareSwedenMap(
      boundary,
      width,
      height,
      undefined,
      'donation',
    );
    for (const shelter of realShelters) {
      const target = shelterCamera(
        prepared.projection,
        shelter.coordinates,
        width,
        height,
      );
      assert.ok(
        target.scale > 1000,
        'Zoom must be substantially closer than the national overview',
      );
      const point = prepared.projection(shelter.coordinates);
      assert.ok(
        Math.abs(point[0] * target.scale + target.x - width / 2) < 0.001,
      );
      assert.ok(
        Math.abs(point[1] * target.scale + target.y - height * 0.26) < 0.001,
      );
      for (const progress of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
        const frame = interpolateCamera(
          OVERVIEW_CAMERA,
          target,
          progress,
          width,
          height,
        );
        assert.ok(Object.values(frame).every(Number.isFinite));
        assert.ok(frame.scale >= 0.999 && frame.scale <= target.scale + 0.001);
      }
      const arrival = interpolateCamera(
        OVERVIEW_CAMERA,
        target,
        1,
        width,
        height,
      );
      const home = interpolateCamera(target, OVERVIEW_CAMERA, 1, width, height);
      for (const key of ['x', 'y', 'scale']) {
        assert.ok(Math.abs(arrival[key] - target[key]) < 0.001);
        assert.ok(Math.abs(home[key] - OVERVIEW_CAMERA[key]) < 0.001);
      }
    }
  }
});

test('Each shelter has actual local roads and buildings that project at the focus point', () => {
  const prepared = prepareSwedenMap(boundary, 800, 770, undefined, 'donation');
  const path = geoPath(prepared.projection).digits(8);
  for (const shelter of realShelters) {
    assert.ok(shelter.coordinateSource.startsWith('https://'));
    const local = JSON.parse(
      readFileSync(
        new URL(
          `../public/data/hundstallet/${shelter.id}-map.json`,
          import.meta.url,
        ),
      ),
    );
    assert.ok(local.features.some((f) => f.properties.kind === 'building'));
    assert.ok(local.features.some((f) => f.properties.kind === 'road'));
    const target = shelterCamera(
      prepared.projection,
      shelter.coordinates,
      800,
      770,
    );
    let nearFacility = false;
    for (const feature of local.features) {
      const d = path(feature);
      assert.ok(d && !d.includes('NaN'));
      if (!['road', 'building'].includes(feature.properties.kind)) continue;
      const coordinates =
        feature.geometry.type === 'Polygon'
          ? feature.geometry.coordinates.flat()
          : feature.geometry.coordinates;
      for (const coordinate of coordinates) {
        const point = prepared.projection(coordinate);
        const x = point[0] * target.scale + target.x,
          y = point[1] * target.scale + target.y;
        if (Math.abs(x - 400) < 140 && Math.abs(y - 770 * 0.26) < 140)
          nearFacility = true;
      }
    }
    assert.ok(
      nearFacility,
      `${shelter.id}: nearby street or building geometry should be visible, not an empty map`,
    );
  }
});
