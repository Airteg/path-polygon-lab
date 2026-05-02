export const MAX_CURVE_REFERENCE_SEGMENT_COUNT = 1000;

export const CURVE_REFERENCE_SAMPLE_SPACING_PX = 1;

export function resolveCurveReferenceSegmentCount(curveLength: number): number {
  if (!Number.isFinite(curveLength) || curveLength <= 0) {
    return 1;
  }

  return Math.max(
    1,
    Math.min(
      MAX_CURVE_REFERENCE_SEGMENT_COUNT,
      Math.ceil(curveLength / CURVE_REFERENCE_SAMPLE_SPACING_PX),
    ),
  );
}
