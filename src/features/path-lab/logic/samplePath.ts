import { getLength, getPointAtLength, parsePath } from "@remotion/paths";
import type { Instruction } from "@remotion/paths";

import type { Vec2 } from "../../../shared/types/geometry";
import type {
  PathLabDiagnostic,
  PathSamplingResult,
} from "../types/pathLabTypes";
import { resolveCurveReferenceSegmentCount } from "./curveSamplingConfig";
import { filterCurveSamplesByStep } from "./filterCurveSamplesByStep";

type SamplePathInput = {
  pathData: string;
  stepPercent: number;
};

type CurveFeatureReason =
  | "x-extremum"
  | "y-extremum"
  | "cosine-local-minimum"
  | "cosine-sign-change";

type CurveFeatureDebugPoint = {
  curveIndex: number;
  curveType: "C" | "Q";
  sampleIndex: number;
  t: number;
  point: Vec2;
  reasons: CurveFeatureReason[];
  cosine?: number;
};

type MutablePathState = {
  currentPoint: Vec2 | null;
  subpathStartPoint: Vec2 | null;
  points: Vec2[];
  pathLength: number;
  curveIndex: number;
  curveFeatures: CurveFeatureDebugPoint[];
  diagnostics: PathLabDiagnostic[];
};

type DenseCurveSamplesResult = {
  points: Vec2[];
  length: number;
  referenceSegmentCount: number;
};

type CurveFeatureCandidate = {
  index: number;
  point: Vec2;
  reasons: CurveFeatureReason[];
  cosine?: number;
};

const COSINE_ZERO_EPSILON = 1e-9;
const COSINE_FEATURE_THRESHOLD = 0.985;
const MIN_COSINE_VECTOR_LENGTH_FACTOR = 1e-6;

function publishCurveFeatures(features: CurveFeatureDebugPoint[]) {
  const debugStore = globalThis as unknown as {
    __PATH_POLYGON_LAB_CURVE_FEATURES__?: CurveFeatureDebugPoint[];
  };

  debugStore.__PATH_POLYGON_LAB_CURVE_FEATURES__ = features;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown path sampling error.";
}

function createErrorDiagnostic(
  code: string,
  message: string,
  details?: unknown,
): PathLabDiagnostic {
  return {
    code,
    level: "error",
    message,
    details,
  };
}

function createWarningDiagnostic(
  code: string,
  message: string,
  details?: unknown,
): PathLabDiagnostic {
  return {
    code,
    level: "warning",
    message,
    details,
  };
}

function resolveStepPercent(stepPercent: number): {
  resolvedStepPercent: number | null;
  diagnostics: PathLabDiagnostic[];
} {
  if (!Number.isFinite(stepPercent) || stepPercent <= 0) {
    return {
      resolvedStepPercent: null,
      diagnostics: [
        createErrorDiagnostic(
          "INVALID_STEP_PERCENT",
          "Step percent must be a finite number greater than 0.",
          { stepPercent },
        ),
      ],
    };
  }

  if (stepPercent > 100) {
    return {
      resolvedStepPercent: stepPercent,
      diagnostics: [
        createWarningDiagnostic(
          "HIGH_STEP_PERCENT",
          "Step percent is greater than 100. Curves may be reduced to only start/end points.",
          { stepPercent },
        ),
      ],
    };
  }

  return {
    resolvedStepPercent: stepPercent,
    diagnostics: [],
  };
}

function areSamePoint(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

function pushPoint(points: Vec2[], point: Vec2) {
  const previous = points.at(-1);

  if (!previous || !areSamePoint(previous, point)) {
    points.push(point);
  }
}

function getLineLength(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function formatPoint(point: Vec2): string {
  return `${point.x} ${point.y}`;
}

function clampUnit(value: number): number {
  if (value > 1) {
    return 1;
  }

  if (value < -1) {
    return -1;
  }

  return value;
}

function stableSign(value: number, epsilon: number = COSINE_ZERO_EPSILON) {
  if (value > epsilon) {
    return 1;
  }

  if (value < -epsilon) {
    return -1;
  }

  return 0;
}

function getVector(from: Vec2, to: Vec2): Vec2 {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
  };
}

function getVectorLength(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

function getDotProduct(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function getSafeCosineBetweenVectors(
  a: Vec2,
  b: Vec2,
  minVectorLength: number,
): number | null {
  const lengthA = getVectorLength(a);
  const lengthB = getVectorLength(b);

  if (lengthA <= minVectorLength || lengthB <= minVectorLength) {
    return null;
  }

  const rawCosine = getDotProduct(a, b) / (lengthA * lengthB);

  if (!Number.isFinite(rawCosine)) {
    return null;
  }

  return clampUnit(rawCosine);
}

function addFeatureCandidate(
  candidates: Map<number, CurveFeatureCandidate>,
  index: number,
  point: Vec2,
  reason: CurveFeatureReason,
  cosine?: number,
) {
  const existing = candidates.get(index);

  if (existing) {
    if (!existing.reasons.includes(reason)) {
      existing.reasons.push(reason);
    }

    if (cosine !== undefined) {
      existing.cosine =
        existing.cosine === undefined
          ? cosine
          : Math.min(existing.cosine, cosine);
    }

    return;
  }

  candidates.set(index, {
    index,
    point,
    reasons: [reason],
    cosine,
  });
}

function resolveCosineWindow(sampleCount: number): number {
  if (sampleCount < 8) {
    return 1;
  }

  return Math.max(2, Math.min(24, Math.floor(sampleCount * 0.04)));
}

function detectCoordinateExtrema(
  denseSamples: readonly Vec2[],
  candidates: Map<number, CurveFeatureCandidate>,
  curveLength: number,
) {
  const coordinateEpsilon = Math.max(curveLength * 1e-9, 1e-9);

  for (let index = 1; index < denseSamples.length - 1; index += 1) {
    const previous = denseSamples[index - 1]!;
    const current = denseSamples[index]!;
    const next = denseSamples[index + 1]!;

    const previousDx = current.x - previous.x;
    const nextDx = next.x - current.x;

    const previousDy = current.y - previous.y;
    const nextDy = next.y - current.y;

    const xSignBefore = stableSign(previousDx, coordinateEpsilon);
    const xSignAfter = stableSign(nextDx, coordinateEpsilon);

    const ySignBefore = stableSign(previousDy, coordinateEpsilon);
    const ySignAfter = stableSign(nextDy, coordinateEpsilon);

    if (xSignBefore !== 0 && xSignAfter !== 0 && xSignBefore !== xSignAfter) {
      addFeatureCandidate(candidates, index, current, "x-extremum");
    }

    if (ySignBefore !== 0 && ySignAfter !== 0 && ySignBefore !== ySignAfter) {
      addFeatureCandidate(candidates, index, current, "y-extremum");
    }
  }
}

function detectCosineFeatures(
  denseSamples: readonly Vec2[],
  candidates: Map<number, CurveFeatureCandidate>,
  curveLength: number,
) {
  const windowSize = resolveCosineWindow(denseSamples.length);
  const minVectorLength = Math.max(
    curveLength * MIN_COSINE_VECTOR_LENGTH_FACTOR,
    1e-9,
  );

  const cosineSamples: Array<{
    index: number;
    point: Vec2;
    cosine: number;
    sign: -1 | 0 | 1;
  }> = [];

  for (
    let index = windowSize;
    index < denseSamples.length - windowSize;
    index += 1
  ) {
    const before = denseSamples[index - windowSize]!;
    const current = denseSamples[index]!;
    const after = denseSamples[index + windowSize]!;

    const leftVector = getVector(before, current);
    const rightVector = getVector(current, after);
    const cosine = getSafeCosineBetweenVectors(
      leftVector,
      rightVector,
      minVectorLength,
    );

    if (cosine === null) {
      continue;
    }

    cosineSamples.push({
      index,
      point: current,
      cosine,
      sign: stableSign(cosine) as -1 | 0 | 1,
    });
  }

  for (let index = 1; index < cosineSamples.length - 1; index += 1) {
    const previous = cosineSamples[index - 1]!;
    const current = cosineSamples[index]!;
    const next = cosineSamples[index + 1]!;

    const isLocalMinimum =
      current.cosine < previous.cosine && current.cosine <= next.cosine;

    if (isLocalMinimum && current.cosine <= COSINE_FEATURE_THRESHOLD) {
      addFeatureCandidate(
        candidates,
        current.index,
        current.point,
        "cosine-local-minimum",
        current.cosine,
      );
    }

    if (
      previous.sign !== 0 &&
      current.sign !== 0 &&
      previous.sign !== current.sign
    ) {
      addFeatureCandidate(
        candidates,
        current.index,
        current.point,
        "cosine-sign-change",
        current.cosine,
      );
    }
  }
}

function detectCurveFeatures(
  denseSamples: readonly Vec2[],
  curveLength: number,
): CurveFeatureCandidate[] {
  if (denseSamples.length < 4) {
    return [];
  }

  const candidates = new Map<number, CurveFeatureCandidate>();

  detectCoordinateExtrema(denseSamples, candidates, curveLength);
  detectCosineFeatures(denseSamples, candidates, curveLength);

  return [...candidates.values()]
    .filter((candidate) => candidate.index > 0)
    .filter((candidate) => candidate.index < denseSamples.length - 1)
    .sort((a, b) => a.index - b.index);
}

function sampleDenseCurveSegment(
  segmentPathData: string,
): DenseCurveSamplesResult {
  const length = getLength(segmentPathData);
  const referenceSegmentCount = resolveCurveReferenceSegmentCount(length);
  const points: Vec2[] = [];

  for (let index = 0; index <= referenceSegmentCount; index += 1) {
    const distance = (length * index) / referenceSegmentCount;
    const point = getPointAtLength(segmentPathData, distance);

    points.push({
      x: point.x,
      y: point.y,
    });
  }

  return {
    points,
    length,
    referenceSegmentCount,
  };
}

function getSlicedSamplesByForcedFeatures(
  denseSamples: readonly Vec2[],
  features: readonly CurveFeatureCandidate[],
): Vec2[][] {
  const forcedIndexes = [
    0,
    ...features.map((feature) => feature.index),
    denseSamples.length - 1,
  ];

  const uniqueIndexes = [...new Set(forcedIndexes)].sort((a, b) => a - b);
  const slices: Vec2[][] = [];

  for (let index = 0; index < uniqueIndexes.length - 1; index += 1) {
    const startIndex = uniqueIndexes[index]!;
    const endIndex = uniqueIndexes[index + 1]!;

    if (endIndex <= startIndex) {
      continue;
    }

    slices.push(denseSamples.slice(startIndex, endIndex + 1));
  }

  return slices;
}

function requireCurrentPoint(
  state: MutablePathState,
  instruction: Instruction,
): Vec2 | null {
  if (state.currentPoint) {
    return state.currentPoint;
  }

  state.diagnostics.push(
    createErrorDiagnostic(
      "PATH_COMMAND_BEFORE_MOVE",
      "Path command was found before an initial move command.",
      { instruction },
    ),
  );

  return null;
}

function handleMoveInstruction(
  state: MutablePathState,
  instruction: Extract<Instruction, { type: "M" | "m" }>,
) {
  const nextPoint =
    instruction.type === "M"
      ? { x: instruction.x, y: instruction.y }
      : state.currentPoint
        ? {
            x: state.currentPoint.x + instruction.dx,
            y: state.currentPoint.y + instruction.dy,
          }
        : { x: instruction.dx, y: instruction.dy };

  state.currentPoint = nextPoint;
  state.subpathStartPoint = nextPoint;
  pushPoint(state.points, nextPoint);
}

function handleLineToPoint(state: MutablePathState, nextPoint: Vec2) {
  const currentPoint = requireCurrentPoint(state, {
    type: "L",
    x: nextPoint.x,
    y: nextPoint.y,
  });

  if (!currentPoint) {
    return;
  }

  state.pathLength += getLineLength(currentPoint, nextPoint);
  state.currentPoint = nextPoint;
  pushPoint(state.points, nextPoint);
}

function handleLineInstruction(
  state: MutablePathState,
  instruction: Extract<
    Instruction,
    { type: "L" | "l" | "H" | "h" | "V" | "v" }
  >,
) {
  const currentPoint = requireCurrentPoint(state, instruction);

  if (!currentPoint) {
    return;
  }

  if (instruction.type === "L") {
    handleLineToPoint(state, { x: instruction.x, y: instruction.y });
    return;
  }

  if (instruction.type === "l") {
    handleLineToPoint(state, {
      x: currentPoint.x + instruction.dx,
      y: currentPoint.y + instruction.dy,
    });
    return;
  }

  if (instruction.type === "H") {
    handleLineToPoint(state, { x: instruction.x, y: currentPoint.y });
    return;
  }

  if (instruction.type === "h") {
    handleLineToPoint(state, {
      x: currentPoint.x + instruction.dx,
      y: currentPoint.y,
    });
    return;
  }

  if (instruction.type === "V") {
    handleLineToPoint(state, { x: currentPoint.x, y: instruction.y });
    return;
  }

  handleLineToPoint(state, {
    x: currentPoint.x,
    y: currentPoint.y + instruction.dy,
  });
}

function pushFilteredCurvePoints(
  state: MutablePathState,
  segmentPathData: string,
  stepPercent: number,
  curveType: "C" | "Q",
) {
  const denseSamples = sampleDenseCurveSegment(segmentPathData);
  const features = detectCurveFeatures(
    denseSamples.points,
    denseSamples.length,
  );
  const slices = getSlicedSamplesByForcedFeatures(
    denseSamples.points,
    features,
  );

  features.forEach((feature) => {
    state.curveFeatures.push({
      curveIndex: state.curveIndex,
      curveType,
      sampleIndex: feature.index,
      t: feature.index / denseSamples.referenceSegmentCount,
      point: feature.point,
      reasons: feature.reasons,
      cosine: feature.cosine,
    });
  });

  state.pathLength += denseSamples.length;

  for (const slice of slices) {
    const filtered = filterCurveSamplesByStep({
      denseSamples: slice,
      curveLength: denseSamples.length,
      stepPercent,
    });

    filtered.points.forEach((point) => pushPoint(state.points, point));
  }

  state.curveIndex += 1;
}

function handleCubicInstruction(
  state: MutablePathState,
  instruction: Extract<Instruction, { type: "C" | "c" }>,
  stepPercent: number,
) {
  const currentPoint = requireCurrentPoint(state, instruction);

  if (!currentPoint) {
    return;
  }

  const absoluteInstruction =
    instruction.type === "C"
      ? {
          cp1: { x: instruction.cp1x, y: instruction.cp1y },
          cp2: { x: instruction.cp2x, y: instruction.cp2y },
          end: { x: instruction.x, y: instruction.y },
        }
      : {
          cp1: {
            x: currentPoint.x + instruction.cp1dx,
            y: currentPoint.y + instruction.cp1dy,
          },
          cp2: {
            x: currentPoint.x + instruction.cp2dx,
            y: currentPoint.y + instruction.cp2dy,
          },
          end: {
            x: currentPoint.x + instruction.dx,
            y: currentPoint.y + instruction.dy,
          },
        };

  const segmentPathData = [
    `M ${formatPoint(currentPoint)}`,
    `C ${formatPoint(absoluteInstruction.cp1)}`,
    formatPoint(absoluteInstruction.cp2),
    formatPoint(absoluteInstruction.end),
  ].join(" ");

  pushFilteredCurvePoints(state, segmentPathData, stepPercent, "C");
  state.currentPoint = absoluteInstruction.end;
}

function handleQuadraticInstruction(
  state: MutablePathState,
  instruction: Extract<Instruction, { type: "Q" | "q" }>,
  stepPercent: number,
) {
  const currentPoint = requireCurrentPoint(state, instruction);

  if (!currentPoint) {
    return;
  }

  const absoluteInstruction =
    instruction.type === "Q"
      ? {
          cp: { x: instruction.cpx, y: instruction.cpy },
          end: { x: instruction.x, y: instruction.y },
        }
      : {
          cp: {
            x: currentPoint.x + instruction.cpdx,
            y: currentPoint.y + instruction.cpdy,
          },
          end: {
            x: currentPoint.x + instruction.dx,
            y: currentPoint.y + instruction.dy,
          },
        };

  const segmentPathData = [
    `M ${formatPoint(currentPoint)}`,
    `Q ${formatPoint(absoluteInstruction.cp)}`,
    formatPoint(absoluteInstruction.end),
  ].join(" ");

  pushFilteredCurvePoints(state, segmentPathData, stepPercent, "Q");
  state.currentPoint = absoluteInstruction.end;
}

function handleCloseInstruction(state: MutablePathState) {
  if (!state.currentPoint || !state.subpathStartPoint) {
    state.diagnostics.push(
      createErrorDiagnostic(
        "CLOSE_COMMAND_WITHOUT_SUBPATH",
        "Close command was found before a valid subpath start.",
      ),
    );

    return;
  }

  state.pathLength += getLineLength(
    state.currentPoint,
    state.subpathStartPoint,
  );
  state.currentPoint = state.subpathStartPoint;
  pushPoint(state.points, state.subpathStartPoint);
}

function handleUnsupportedInstruction(
  state: MutablePathState,
  instruction: Instruction,
) {
  state.diagnostics.push(
    createWarningDiagnostic(
      "UNSUPPORTED_PATH_COMMAND_SAMPLED_AS_ENDPOINT_ONLY",
      "This path command is not fully sampled yet. Only its endpoint is preserved when possible.",
      { instruction },
    ),
  );

  const currentPoint = requireCurrentPoint(state, instruction);

  if (!currentPoint) {
    return;
  }

  if (
    instruction.type === "A" ||
    instruction.type === "S" ||
    instruction.type === "T"
  ) {
    handleLineToPoint(state, { x: instruction.x, y: instruction.y });
    return;
  }

  if (
    instruction.type === "a" ||
    instruction.type === "s" ||
    instruction.type === "t"
  ) {
    handleLineToPoint(state, {
      x: currentPoint.x + instruction.dx,
      y: currentPoint.y + instruction.dy,
    });
  }
}

export function samplePath({
  pathData,
  stepPercent,
}: SamplePathInput): PathSamplingResult {
  publishCurveFeatures([]);

  const trimmedPathData = pathData.trim();

  const stepPercentResult = resolveStepPercent(stepPercent);

  if (stepPercentResult.resolvedStepPercent === null) {
    return {
      pathLength: 0,
      rawSampledPolyline: [],
      diagnostics: stepPercentResult.diagnostics,
    };
  }

  let instructions: Instruction[];

  try {
    instructions = parsePath(trimmedPathData);
  } catch (error) {
    return {
      pathLength: 0,
      rawSampledPolyline: [],
      diagnostics: [
        ...stepPercentResult.diagnostics,
        createErrorDiagnostic(
          "PATH_PARSE_FAILED",
          "Failed to parse SVG path.",
          {
            error: getErrorMessage(error),
          },
        ),
      ],
    };
  }

  const state: MutablePathState = {
    currentPoint: null,
    subpathStartPoint: null,
    points: [],
    pathLength: 0,
    curveIndex: 0,
    curveFeatures: [],
    diagnostics: [...stepPercentResult.diagnostics],
  };

  try {
    for (const instruction of instructions) {
      if (instruction.type === "M" || instruction.type === "m") {
        handleMoveInstruction(state, instruction);
        continue;
      }

      if (
        instruction.type === "L" ||
        instruction.type === "l" ||
        instruction.type === "H" ||
        instruction.type === "h" ||
        instruction.type === "V" ||
        instruction.type === "v"
      ) {
        handleLineInstruction(state, instruction);
        continue;
      }

      if (instruction.type === "C" || instruction.type === "c") {
        handleCubicInstruction(
          state,
          instruction,
          stepPercentResult.resolvedStepPercent,
        );
        continue;
      }

      if (instruction.type === "Q" || instruction.type === "q") {
        handleQuadraticInstruction(
          state,
          instruction,
          stepPercentResult.resolvedStepPercent,
        );
        continue;
      }

      if (instruction.type === "Z") {
        handleCloseInstruction(state);
        continue;
      }

      handleUnsupportedInstruction(state, instruction);
    }
  } catch (error) {
    publishCurveFeatures(state.curveFeatures);

    return {
      pathLength: state.pathLength,
      rawSampledPolyline: [],
      diagnostics: [
        ...state.diagnostics,
        createErrorDiagnostic(
          "PATH_SEGMENT_SAMPLING_FAILED",
          "Failed to sample SVG path by instructions.",
          { error: getErrorMessage(error) },
        ),
      ],
    };
  }

  publishCurveFeatures(state.curveFeatures);

  return {
    pathLength: state.pathLength,
    rawSampledPolyline: state.points,
    diagnostics: state.diagnostics,
  };
}
