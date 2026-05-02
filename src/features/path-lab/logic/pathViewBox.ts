import type {
  BoundingBox2D,
  SvgViewBox,
  Vec2,
} from "../../../shared/types/geometry";

const DEFAULT_VIEW_BOX: SvgViewBox = {
  x: -10,
  y: -10,
  width: 220,
  height: 120,
};

const DEFAULT_VIEW_BOX_PADDING = 12;

function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function getBoundingBox2D(
  points: readonly Vec2[],
): BoundingBox2D | null {
  const finitePoints = points.filter(isFinitePoint);

  if (finitePoints.length === 0) {
    return null;
  }

  let minX = finitePoints[0]!.x;
  let minY = finitePoints[0]!.y;
  let maxX = finitePoints[0]!.x;
  let maxY = finitePoints[0]!.y;

  for (const point of finitePoints) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    min: {
      x: minX,
      y: minY,
    },
    max: {
      x: maxX,
      y: maxY,
    },
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function createViewBoxFromPoints(
  points: readonly Vec2[],
  padding: number = DEFAULT_VIEW_BOX_PADDING,
): SvgViewBox {
  const bounds = getBoundingBox2D(points);

  if (!bounds) {
    return DEFAULT_VIEW_BOX;
  }

  const safePadding = Number.isFinite(padding) && padding >= 0 ? padding : 0;

  const width = bounds.width === 0 ? 1 : bounds.width;
  const height = bounds.height === 0 ? 1 : bounds.height;

  return {
    x: bounds.min.x - safePadding,
    y: bounds.min.y - safePadding,
    width: width + safePadding * 2,
    height: height + safePadding * 2,
  };
}

export function formatSvgViewBox(viewBox: SvgViewBox): string {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}
