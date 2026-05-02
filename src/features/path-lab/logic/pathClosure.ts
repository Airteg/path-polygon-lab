export function isPathExplicitlyClosed(pathData: string): boolean {
  return /[zZ]\s*$/.test(pathData.trim());
}
