import type { PathLabInputState } from "../types/pathLabTypes";

export const DEFAULT_PATH_DATA =
  "M 0 0 L 150 0 C 150 20 180 20 180 40 L 0 40 Z";

export const DEFAULT_STEP_PERCENT = 10;

export const DEFAULT_PATH_LAB_INPUT_STATE: PathLabInputState = {
  pathData: DEFAULT_PATH_DATA,
  stepPercent: DEFAULT_STEP_PERCENT,
};
