import type { Vec2 } from "../../../shared/types/geometry";

export type FilterCurveSamplesByStepInput = {
  denseSamples: readonly Vec2[];
  curveLength: number;
  stepPercent: number;
};

export type FilterCurveSamplesByStepResult = {
  points: Vec2[];
  allowedStep: number;
};

function getDistance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function areSamePoint(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

function pushPointIfDifferent(points: Vec2[], point: Vec2) {
  const previous = points.at(-1);

  if (!previous || !areSamePoint(previous, point)) {
    points.push(point);
  }
}

function resolveAllowedStep(curveLength: number, stepPercent: number): number {
  if (!Number.isFinite(curveLength) || curveLength <= 0) {
    return 0;
  }

  if (!Number.isFinite(stepPercent) || stepPercent <= 0) {
    return 0;
  }

  return (curveLength * stepPercent) / 100;
}

export function filterCurveSamplesByStep({
  denseSamples,
  curveLength,
  stepPercent,
}: FilterCurveSamplesByStepInput): FilterCurveSamplesByStepResult {
  const allowedStep = resolveAllowedStep(curveLength, stepPercent);

  if (denseSamples.length <= 2 || allowedStep <= 0) {
    return {
      points: [...denseSamples],
      allowedStep,
    };
  }

  const result: Vec2[] = [];
  const firstPoint = denseSamples[0]!;
  const lastPoint = denseSamples.at(-1)!;

  let anchor = firstPoint;

  pushPointIfDifferent(result, firstPoint);

  for (let index = 1; index < denseSamples.length - 1; index += 1) {
    const candidate = denseSamples[index]!;
    const distanceFromAnchor = getDistance(anchor, candidate);

    if (distanceFromAnchor >= allowedStep) {
      pushPointIfDifferent(result, candidate);
      anchor = candidate;
    }
  }

  pushPointIfDifferent(result, lastPoint);

  return {
    points: result,
    allowedStep,
  };
}
