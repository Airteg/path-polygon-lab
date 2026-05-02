import type { Vec2 } from "../../../shared/types/geometry";

type PointsToPathDataOptions = {
  closePath?: boolean;
};

function formatSvgNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Number.parseFloat(value.toFixed(4)).toString();
}

function formatSvgPoint(point: Vec2): string {
  return `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`;
}

export function pointsToPolylinePoints(points: readonly Vec2[]): string {
  return points.map(formatSvgPoint).join(" ");
}

export function pointsToPathData(
  points: readonly Vec2[],
  options: PointsToPathDataOptions = {},
): string {
  if (points.length === 0) {
    return "";
  }

  const [firstPoint, ...restPoints] = points;

  const commands = [
    `M ${formatSvgNumber(firstPoint.x)} ${formatSvgNumber(firstPoint.y)}`,
    ...restPoints.map(
      (point) => `L ${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`,
    ),
  ];

  if (options.closePath) {
    commands.push("Z");
  }

  return commands.join(" ");
}

export function createPointLabel(point: Vec2, index: number): string {
  return `${index}: (${formatSvgNumber(point.x)}, ${formatSvgNumber(point.y)})`;
}

export function createPointKey(point: Vec2, index: number): string {
  return `${index}-${formatSvgNumber(point.x)}-${formatSvgNumber(point.y)}`;
}
