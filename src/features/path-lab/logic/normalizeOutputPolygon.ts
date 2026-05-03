import type { Polygon2D, Vec2 } from "../../../shared/types/geometry";

export const OUTPUT_DECIMAL_PLACES = 2;

export const OUTPUT_ZERO_EPSILON = 1e-9;

export type OutputPolygonNormalizationResult = {
  polygon: Polygon2D;
  removedPointCount: number;
};

function normalizeOutputNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const zeroSafeValue = Math.abs(value) < OUTPUT_ZERO_EPSILON ? 0 : value;
  const factor = 10 ** OUTPUT_DECIMAL_PLACES;
  const roundedValue = Math.round(zeroSafeValue * factor) / factor;

  return Object.is(roundedValue, -0) ? 0 : roundedValue;
}

function normalizeOutputPoint(point: Vec2): Vec2 {
  return {
    x: normalizeOutputNumber(point.x),
    y: normalizeOutputNumber(point.y),
  };
}

function areSamePoint(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

function removeAdjacentDuplicates(points: readonly Vec2[]): Vec2[] {
  const result: Vec2[] = [];

  for (const point of points) {
    const previous = result.at(-1);

    if (!previous || !areSamePoint(previous, point)) {
      result.push(point);
    }
  }

  return result;
}

export function normalizeOutputPolygon(
  polygon: readonly Vec2[],
): OutputPolygonNormalizationResult {
  const normalizedPolygon = polygon.map(normalizeOutputPoint);
  const withoutAdjacentDuplicates = removeAdjacentDuplicates(normalizedPolygon);

  return {
    polygon: withoutAdjacentDuplicates,
    removedPointCount: polygon.length - withoutAdjacentDuplicates.length,
  };
}
