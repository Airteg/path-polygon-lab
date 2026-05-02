export type Vec2 = {
  x: number;
  y: number;
};

export type BoundingBox2D = {
  min: Vec2;
  max: Vec2;
  width: number;
  height: number;
};

export type SvgViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Polyline2D = Vec2[];

export type Polygon2D = Vec2[];
