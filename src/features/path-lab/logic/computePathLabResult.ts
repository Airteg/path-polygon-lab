import type {
  PathLabComputedResult,
  PathLabDiagnostic,
  PathLabInputState,
} from "../types/pathLabTypes";
import { createViewBoxFromPoints } from "./pathViewBox";
import { isPathExplicitlyClosed } from "./pathClosure";
import { optimizePolyline } from "./optimizePolyline";
import { samplePath } from "./samplePath";
import { normalizeOutputPolygon } from "./normalizeOutputPolygon";

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

  const normalizedOutput = normalizeOutputPolygon(
    optimizationResult.finalPolygon,
  );

  const outputNormalizationDiagnostics: PathLabDiagnostic[] =
    normalizedOutput.removedPointCount > 0
      ? [
          {
            code: "OUTPUT_NORMALIZATION_REMOVED_DUPLICATE_POINTS",
            level: "warning",
            message:
              "Output normalization removed adjacent duplicate points after coordinate rounding.",
            details: {
              removedPointCount: normalizedOutput.removedPointCount,
            },
          },
        ]
      : [];

  const diagnostics = [
    ...samplingResult.diagnostics,
    ...optimizationResult.diagnostics,
    ...outputNormalizationDiagnostics,
  ];

  return {
    pathLength: samplingResult.pathLength,
    rawSampledPolyline: samplingResult.rawSampledPolyline,
    finalPolygon: normalizedOutput.polygon,
    removedPointCount:
      optimizationResult.removedPointCount + normalizedOutput.removedPointCount,
    isPathClosed,
    viewBox: createViewBoxFromPoints(samplingResult.rawSampledPolyline),
    diagnostics,
  };
}
