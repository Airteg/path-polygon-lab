import { useState } from "react";

import { DEFAULT_PATH_LAB_INPUT_STATE } from "./constants/defaultPathLabState";
import { PathControlsPanel } from "./components/PathControlsPanel/PathControlsPanel";
import { PathLabLayout } from "./components/PathLabLayout/PathLabLayout";
import { PathPreviewPanel } from "./components/PathPreviewPanel/PathPreviewPanel";
import { computePathLabResult } from "./logic/computePathLabResult";
import type {
  PathLabComputedResult,
  PathLabInputState,
} from "./types/pathLabTypes";
import { inspectRemotionInstructions } from "./logic/inspectRemotionInstructions";

type ComputedSnapshot = {
  input: PathLabInputState;
  result: PathLabComputedResult;
};

export function PathLab() {
  const [input, setInput] = useState<PathLabInputState>(
    DEFAULT_PATH_LAB_INPUT_STATE,
  );

  const [computedSnapshot, setComputedSnapshot] =
    useState<ComputedSnapshot | null>(() => {
      const initialInput = DEFAULT_PATH_LAB_INPUT_STATE;

      return {
        input: initialInput,
        result: computePathLabResult(initialInput),
      };
    });

  function handleCompute() {
    setComputedSnapshot({
      input,
      result: computePathLabResult(input),
    });
  }

  function handlePrintFinalPolygonJson() {
    if (!computedSnapshot) {
      return;
    }

    const debugStore = globalThis as unknown as {
      __PATH_POLYGON_LAB_CURVE_FEATURES__?: unknown;
    };

    let instructionInspection: unknown = null;

    try {
      instructionInspection = inspectRemotionInstructions(
        computedSnapshot.input.pathData,
      );
    } catch (error) {
      instructionInspection = {
        error,
      };
    }

    console.group("[path-polygon-lab] output");
    console.log(
      "finalPolygon",
      JSON.stringify(computedSnapshot.result.finalPolygon, null, 2),
    );
    console.log(
      "curveFeatures",
      debugStore.__PATH_POLYGON_LAB_CURVE_FEATURES__,
    );
    console.log("remotionInstructions", instructionInspection);
    console.groupEnd();
  }

  return (
    <PathLabLayout
      sidebar={
        <PathControlsPanel
          input={input}
          result={computedSnapshot?.result ?? null}
          onInputChange={setInput}
          onCompute={handleCompute}
          onPrintFinalPolygonJson={handlePrintFinalPolygonJson}
        />
      }
      playground={
        <PathPreviewPanel
          pathData={computedSnapshot?.input.pathData ?? input.pathData}
          result={computedSnapshot?.result ?? null}
        />
      }
    />
  );
}
