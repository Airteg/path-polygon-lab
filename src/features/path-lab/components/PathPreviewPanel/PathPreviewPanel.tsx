import { useState } from "react";

import type { PathLabComputedResult } from "../../types/pathLabTypes";
import { formatSvgViewBox } from "../../logic/pathViewBox";
import {
  createPointKey,
  pointsToPathData,
  pointsToPolylinePoints,
} from "../../logic/polygonSvg";
import {
  EmptyState,
  FinalPolygonPath,
  GhostOriginalPath,
  Panel,
  PreviewBody,
  PreviewCard,
  PreviewHeader,
  PreviewTitle,
  PreviewToggle,
  PreviewToggles,
  RawPolyline,
  Svg,
  VertexDot,
  VertexLabel,
} from "./PathPreviewPanel.styles";

type PathPreviewPanelProps = {
  pathData: string;
  result: PathLabComputedResult | null;
};

type OptimizedPreviewVisibility = {
  showOriginalPath: boolean;
  showFinalPolygon: boolean;
  showVertexLabels: boolean;
};

export function PathPreviewPanel({ pathData, result }: PathPreviewPanelProps) {
  const [visibility, setVisibility] = useState<OptimizedPreviewVisibility>({
    showOriginalPath: true,
    showFinalPolygon: true,
    showVertexLabels: true,
  });

  function updateVisibility(
    key: keyof OptimizedPreviewVisibility,
    value: boolean,
  ) {
    setVisibility((current) => ({
      ...current,
      [key]: value,
    }));
  }

  if (!result) {
    return (
      <Panel>
        <PreviewCard>
          <PreviewHeader>
            <PreviewTitle>
              <p>Playground</p>
              <h2>Path / raw sampled polyline / final polygon</h2>
            </PreviewTitle>
          </PreviewHeader>

          <PreviewBody>
            <EmptyState>
              Натисни “Перерахувати”, щоб побачити preview.
            </EmptyState>
          </PreviewBody>
        </PreviewCard>
      </Panel>
    );
  }

  const viewBox = formatSvgViewBox(result.viewBox);
  const rawPolylinePoints = pointsToPolylinePoints(result.rawSampledPolyline);
  const finalPolygonPathData = pointsToPathData(result.finalPolygon, {
    closePath: result.isPathClosed,
  });

  return (
    <Panel>
      <PreviewCard>
        <PreviewHeader>
          <PreviewTitle>
            <p>Playground</p>
            <h2>Path / raw sampled polyline / final polygon</h2>
          </PreviewTitle>

          <PreviewToggles>
            <PreviewToggle>
              <input
                type="checkbox"
                checked={visibility.showOriginalPath}
                onChange={(event) =>
                  updateVisibility("showOriginalPath", event.target.checked)
                }
              />
              Path
            </PreviewToggle>

            <PreviewToggle>
              <input
                type="checkbox"
                checked={visibility.showFinalPolygon}
                onChange={(event) =>
                  updateVisibility("showFinalPolygon", event.target.checked)
                }
              />
              Polygon
            </PreviewToggle>

            <PreviewToggle>
              <input
                type="checkbox"
                checked={visibility.showVertexLabels}
                onChange={(event) =>
                  updateVisibility("showVertexLabels", event.target.checked)
                }
              />
              Numbers
            </PreviewToggle>
          </PreviewToggles>
        </PreviewHeader>

        <PreviewBody>
          <Svg viewBox={viewBox} role="img" aria-label="Path polygon preview">
            {visibility.showOriginalPath && <GhostOriginalPath d={pathData} />}

            {result.rawSampledPolyline.length > 0 && (
              <RawPolyline points={rawPolylinePoints} />
            )}

            {visibility.showFinalPolygon && result.finalPolygon.length > 0 && (
              <FinalPolygonPath d={finalPolygonPathData} />
            )}

            {visibility.showFinalPolygon &&
              result.finalPolygon.map((point, index) => (
                <g key={createPointKey(point, index)}>
                  <VertexDot cx={point.x} cy={point.y} r={0.5} />

                  {visibility.showVertexLabels && (
                    <VertexLabel x={point.x + 2.4} y={point.y - 2.4}>
                      {index}
                    </VertexLabel>
                  )}
                </g>
              ))}
          </Svg>
        </PreviewBody>
      </PreviewCard>
    </Panel>
  );
}
