import type {
  Polygon2D,
  Polyline2D,
  SvgViewBox,
} from "../../../shared/types/geometry";

export type PathLabInputState = {
  pathData: string;
  stepPercent: number;
};

export type PathLabDiagnosticLevel = "error" | "warning" | "info";

export type PathLabDiagnostic = {
  code: string;
  level: PathLabDiagnosticLevel;
  message: string;
  details?: unknown;
};

export type PathSamplingResult = {
  pathLength: number;
  rawSampledPolyline: Polyline2D;
  diagnostics: PathLabDiagnostic[];
};

export type PathOptimizationResult = {
  finalPolygon: Polygon2D;
  removedPointCount: number;
  diagnostics: PathLabDiagnostic[];
};

export type PathLabComputedResult = {
  pathLength: number;
  rawSampledPolyline: Polyline2D;
  finalPolygon: Polygon2D;
  removedPointCount: number;
  isPathClosed: boolean;
  viewBox: SvgViewBox;
  diagnostics: PathLabDiagnostic[];
};

export type PathLabState = PathLabInputState & {
  result: PathLabComputedResult | null;
};
