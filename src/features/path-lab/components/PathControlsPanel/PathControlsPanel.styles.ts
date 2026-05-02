import styled from "@emotion/styled";

export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Label = styled.label`
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  resize: vertical;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.92);
  color: #e5e7eb;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  outline: none;

  &:focus {
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.16);
  }
`;

export const NumberInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.92);
  color: #e5e7eb;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.16);
  }
`;

export const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
`;

export const PrimaryButton = styled.button`
  width: 100%;
  padding: 11px 14px;
  border: 0;
  border-radius: 12px;
  background: #38bdf8;
  color: #082f49;
  cursor: pointer;
  font-weight: 800;

  &:hover {
    background: #7dd3fc;
  }
`;

export const SecondaryButton = styled.button`
  width: 100%;
  padding: 11px 14px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.72);
  color: #e5e7eb;
  cursor: pointer;
  font-weight: 700;

  &:hover:not(:disabled) {
    border-color: #38bdf8;
    color: #bae6fd;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

export const StatsCard = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.48);
`;

export const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #cbd5e1;
  font-size: 13px;

  strong {
    color: #f8fafc;
    font-size: 14px;
  }
`;

export const DiagnosticsList = styled.div`
  display: grid;
  gap: 8px;
`;

export const DiagnosticItem = styled.div<{
  level: "error" | "warning" | "info";
}>`
  padding: 10px 12px;
  border-radius: 12px;
  background: ${({ level }) =>
    level === "error"
      ? "rgba(239, 68, 68, 0.14)"
      : level === "warning"
        ? "rgba(245, 158, 11, 0.14)"
        : "rgba(56, 189, 248, 0.12)"};
  color: #e5e7eb;
  font-size: 12px;
  line-height: 1.45;

  strong {
    display: block;
    margin-bottom: 4px;
    color: #f8fafc;
  }
`;
