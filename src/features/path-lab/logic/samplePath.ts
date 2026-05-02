import { getLength, getPointAtLength, parsePath } from "@remotion/paths";
import type { Instruction } from "@remotion/paths";

import type { Vec2 } from "../../../shared/types/geometry";
import type {
  PathLabDiagnostic,
  PathSamplingResult,
} from "../types/pathLabTypes";
import { filterCurveSamplesByStep } from "./filterCurveSamplesByStep";
import { resolveCurveReferenceSegmentCount } from "./curveSamplingConfig";

type SamplePathInput = {
  pathData: string;
  stepPercent: number;
};

type MutablePathState = {
  currentPoint: Vec2 | null;
  subpathStartPoint: Vec2 | null;
  points: Vec2[];
  pathLength: number;
  diagnostics: PathLabDiagnostic[];
};

type DenseCurveSamplesResult = {
  points: Vec2[];
  length: number;
  referenceSegmentCount: number;
};

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
) {
  const denseSamples = sampleDenseCurveSegment(segmentPathData);

  const filtered = filterCurveSamplesByStep({
    denseSamples: denseSamples.points,
    curveLength: denseSamples.length,
    stepPercent,
  });

  state.pathLength += denseSamples.length;
  filtered.points.forEach((point) => pushPoint(state.points, point));
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

  pushFilteredCurvePoints(state, segmentPathData, stepPercent);
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

  pushFilteredCurvePoints(state, segmentPathData, stepPercent);
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
  const trimmedPathData = pathData.trim();

  if (!trimmedPathData) {
    return {
      pathLength: 0,
      rawSampledPolyline: [],
      diagnostics: [
        createErrorDiagnostic(
          "EMPTY_PATH_DATA",
          "SVG path data must not be empty.",
        ),
      ],
    };
  }

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

  return {
    pathLength: state.pathLength,
    rawSampledPolyline: state.points,
    diagnostics: state.diagnostics,
  };
}
