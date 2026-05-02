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

    console.group("[path-polygon-lab] finalPolygon");
    console.log(JSON.stringify(computedSnapshot.result.finalPolygon, null, 2));
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
