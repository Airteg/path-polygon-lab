import type {
  PathLabComputedResult,
  PathLabDiagnostic,
  PathLabInputState,
} from "../types/pathLabTypes";
import { createViewBoxFromPoints } from "./pathViewBox";
import { isPathExplicitlyClosed } from "./pathClosure";
import { optimizePolyline } from "./optimizePolyline";
import { samplePath } from "./samplePath";

function hasErrorDiagnostics(
  diagnostics: readonly PathLabDiagnostic[],
): boolean {
  return diagnostics.some((diagnostic) => diagnostic.level === "error");
}

export function computePathLabResult(
  input: PathLabInputState,
): PathLabComputedResult {
  const isPathClosed = isPathExplicitlyClosed(input.pathData);

  const samplingResult = samplePath({
    pathData: input.pathData,
    stepPercent: input.stepPercent,
  });

  if (hasErrorDiagnostics(samplingResult.diagnostics)) {
    return {
      pathLength: samplingResult.pathLength,
      rawSampledPolyline: samplingResult.rawSampledPolyline,
      finalPolygon: [],
      removedPointCount: 0,
      isPathClosed,
      viewBox: createViewBoxFromPoints(samplingResult.rawSampledPolyline),
      diagnostics: samplingResult.diagnostics,
    };
  }

  const optimizationResult = optimizePolyline(
    samplingResult.rawSampledPolyline,
  );

  const diagnostics = [
    ...samplingResult.diagnostics,
    ...optimizationResult.diagnostics,
  ];

  return {
    pathLength: samplingResult.pathLength,
    rawSampledPolyline: samplingResult.rawSampledPolyline,
    finalPolygon: optimizationResult.finalPolygon,
    removedPointCount: optimizationResult.removedPointCount,
    isPathClosed,
    viewBox: createViewBoxFromPoints(samplingResult.rawSampledPolyline),
    diagnostics,
  };
}
