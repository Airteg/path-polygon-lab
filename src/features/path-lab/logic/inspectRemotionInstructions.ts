import {
  parsePath,
  reduceInstructions,
  serializeInstructions,
} from "@remotion/paths";

export type RemotionInstructionInspection = {
  parsedInstructions: unknown[];
  reducedInstructions: unknown[];
  reducedPathData: string;
};

export function inspectRemotionInstructions(
  pathData: string,
): RemotionInstructionInspection {
  const parsedInstructions = parsePath(pathData);
  const reducedInstructions = reduceInstructions(parsedInstructions);
  const reducedPathData = serializeInstructions(reducedInstructions);

  return {
    parsedInstructions,
    reducedInstructions,
    reducedPathData,
  };
}
