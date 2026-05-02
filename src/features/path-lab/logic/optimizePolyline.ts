import type { Vec2 } from "../../../shared/types/geometry";
import type { PathOptimizationResult } from "../types/pathLabTypes";

function areSamePoint(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

function crossProductZ(a: Vec2, b: Vec2, c: Vec2): number {
  const abX = b.x - a.x;
  const abY = b.y - a.y;

  const bcX = c.x - b.x;
  const bcY = c.y - b.y;

  return abX * bcY - abY * bcX;
}

function isStrictlyCollinear(a: Vec2, b: Vec2, c: Vec2): boolean {
  return crossProductZ(a, b, c) === 0;
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

function isClosedPolyline(points: readonly Vec2[]): boolean {
  if (points.length < 2) {
    return false;
  }

  const first = points[0];
  const last = points.at(-1);

  return Boolean(last && areSamePoint(first, last));
}

function removeClosingDuplicate(points: readonly Vec2[]): Vec2[] {
  if (!isClosedPolyline(points)) {
    return [...points];
  }

  return points.slice(0, -1);
}

function removeOpenPolylineCollinearPoints(points: readonly Vec2[]): Vec2[] {
  if (points.length < 3) {
    return [...points];
  }

  const result: Vec2[] = [points[0]!];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = result.at(-1);
    const current = points[index];
    const next = points[index + 1];

    if (
      previous &&
      current &&
      next &&
      isStrictlyCollinear(previous, current, next)
    ) {
      continue;
    }

    if (current) {
      result.push(current);
    }
  }

  result.push(points.at(-1)!);

  return result;
}

function removeClosedPolylineCollinearPoints(points: readonly Vec2[]): Vec2[] {
  if (points.length < 3) {
    return [...points];
  }

  let currentPoints = [...points];
  let changed = true;

  while (changed) {
    changed = false;

    const nextPoints: Vec2[] = [];

    for (let index = 0; index < currentPoints.length; index += 1) {
      const previous =
        currentPoints[
          (index - 1 + currentPoints.length) % currentPoints.length
        ];
      const current = currentPoints[index];
      const next = currentPoints[(index + 1) % currentPoints.length];

      if (
        previous &&
        current &&
        next &&
        isStrictlyCollinear(previous, current, next)
      ) {
        changed = true;
        continue;
      }

      if (current) {
        nextPoints.push(current);
      }
    }

    currentPoints = nextPoints;

    if (currentPoints.length < 3) {
      break;
    }
  }

  return currentPoints;
}

export function optimizePolyline(
  rawSampledPolyline: readonly Vec2[],
): PathOptimizationResult {
  const withoutAdjacentDuplicates =
    removeAdjacentDuplicates(rawSampledPolyline);
  const wasClosed = isClosedPolyline(withoutAdjacentDuplicates);
  const normalizedInput = removeClosingDuplicate(withoutAdjacentDuplicates);

  const finalPolygon = wasClosed
    ? removeClosedPolylineCollinearPoints(normalizedInput)
    : removeOpenPolylineCollinearPoints(normalizedInput);

  return {
    finalPolygon,
    removedPointCount: rawSampledPolyline.length - finalPolygon.length,
    diagnostics: [],
  };
}
