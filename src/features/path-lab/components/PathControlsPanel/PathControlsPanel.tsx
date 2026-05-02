import type { ChangeEvent } from "react";

import type {
  PathLabComputedResult,
  PathLabInputState,
} from "../../types/pathLabTypes";
import {
  ButtonRow,
  DiagnosticItem,
  DiagnosticsList,
  FieldGroup,
  Label,
  NumberInput,
  Panel,
  PrimaryButton,
  SecondaryButton,
  StatRow,
  StatsCard,
  TextArea,
} from "./PathControlsPanel.styles";

type PathControlsPanelProps = {
  input: PathLabInputState;
  result: PathLabComputedResult | null;
  onInputChange: (nextInput: PathLabInputState) => void;
  onCompute: () => void;
  onPrintFinalPolygonJson: () => void;
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return Number.parseFloat(value.toFixed(2)).toString();
}

export function PathControlsPanel({
  input,
  result,
  onInputChange,
  onCompute,
  onPrintFinalPolygonJson,
}: PathControlsPanelProps) {
  function handlePathDataChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onInputChange({
      ...input,
      pathData: event.target.value,
    });
  }

  function handleStepPercentChange(event: ChangeEvent<HTMLInputElement>) {
    onInputChange({
      ...input,
      stepPercent: Number(event.target.value),
    });
  }

  return (
    <Panel>
      <FieldGroup>
        <Label htmlFor="path-data">SVG path</Label>
        <TextArea
          id="path-data"
          value={input.pathData}
          spellCheck={false}
          onChange={handlePathDataChange}
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="step-percent">Мінімальний приріст, %</Label>
        <NumberInput
          id="step-percent"
          type="number"
          min={0.1}
          step={0.1}
          value={input.stepPercent}
          onChange={handleStepPercentChange}
        />
      </FieldGroup>

      <ButtonRow>
        <PrimaryButton type="button" onClick={onCompute}>
          Перерахувати
        </PrimaryButton>

        <SecondaryButton
          type="button"
          disabled={!result}
          onClick={onPrintFinalPolygonJson}
        >
          Вивести finalPolygon JSON у Console
        </SecondaryButton>
      </ButtonRow>

      <StatsCard>
        <StatRow>
          <span>Path length</span>
          <strong>{result ? formatNumber(result.pathLength) : "—"}</strong>
        </StatRow>

        <StatRow>
          <span>Raw output points</span>
          <strong>{result?.rawSampledPolyline.length ?? "—"}</strong>
        </StatRow>

        <StatRow>
          <span>Final polygon nodes</span>
          <strong>{result?.finalPolygon.length ?? "—"}</strong>
        </StatRow>

        <StatRow>
          <span>Removed collinear points</span>
          <strong>{result?.removedPointCount ?? "—"}</strong>
        </StatRow>

        <StatRow>
          <span>Path closed by Z/z</span>
          <strong>{result ? (result.isPathClosed ? "yes" : "no") : "—"}</strong>
        </StatRow>
      </StatsCard>

      {result && result.diagnostics.length > 0 && (
        <DiagnosticsList>
          {result.diagnostics.map((diagnostic) => (
            <DiagnosticItem
              key={`${diagnostic.level}-${diagnostic.code}`}
              level={diagnostic.level}
            >
              <strong>{diagnostic.code}</strong>
              {diagnostic.message}
            </DiagnosticItem>
          ))}
        </DiagnosticsList>
      )}
    </Panel>
  );
}
