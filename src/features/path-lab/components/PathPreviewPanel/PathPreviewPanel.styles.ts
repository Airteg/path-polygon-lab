import styled from "@emotion/styled";

export const Panel = styled.div`
  height: 100%;
  min-height: calc(100vh - 48px);
  display: grid;
  grid-template-rows: 1fr;
`;

export const PreviewCard = styled.section`
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.78);
  overflow: hidden;
`;

export const PreviewHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.48);
`;
export const PreviewTitle = styled.div`
  min-width: 0;

  p {
    margin: 0 0 4px;
    color: #38bdf8;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    color: #f8fafc;
    font-size: 16px;
    line-height: 1.2;
  }
`;

export const PreviewToggles = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`;

export const PreviewToggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;

  input {
    width: 13px;
    height: 13px;
    accent-color: #38bdf8;
    cursor: pointer;
  }
`;
export const PreviewBody = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 16px;
`;

export const EmptyState = styled.div`
  height: 100%;
  display: grid;
  place-items: center;
  color: #94a3b8;
  font-size: 14px;
  text-align: center;
`;

export const Svg = styled.svg`
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 14px;
  background:
    linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px),
    rgba(2, 6, 23, 0.72);
  background-size: 20px 20px;
`;

export const GhostOriginalPath = styled.path`
  fill: none;
  stroke: rgba(248, 250, 252, 0.32);
  stroke-width: 1.2;
  vector-effect: non-scaling-stroke;
`;

export const RawPolyline = styled.polyline`
  fill: none;
  stroke: rgba(56, 189, 248, 0.55);
  stroke-width: 1;
  stroke-dasharray: 4 4;
  vector-effect: non-scaling-stroke;
`;

export const FinalPolygonPath = styled.path`
  fill: rgba(56, 189, 248, 0.08);
  stroke: #38bdf8;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
`;

export const VertexDot = styled.circle`
  fill: #facc15;
  stroke: #0f172a;
  stroke-width: 0.5;
  vector-effect: non-scaling-stroke;
`;

export const VertexLabel = styled.text`
  fill: #fde68a;
  font-size: 1px;
  font-weight: 300;
  paint-order: stroke;
  stroke: #020617;
  stroke-width: 1px;
  stroke-linejoin: round;
  pointer-events: none;
  user-select: none;
`;
