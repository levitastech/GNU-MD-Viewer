export const LIMITS = {
  documentEncodedBytes: 20_000_000,
  imageEncodedBytes: 10_000_000,
  imageDimensionPixels: 16_384,
  imageDecodedRgbaBytes: 64_000_000,
  codeSourceBytes: 1_000_000,
  codeLines: 50_000,
  katexSourceCharacters: 16_384,
  katexMaxExpand: 1_000,
  katexMaxSizeEm: 20,
  mermaidSourceCharacters: 65_536,
  mermaidLines: 2_000,
  mermaidEdges: 500,
  enrichmentConcurrentJobs: 2,
  enrichmentQueuedJobs: 32,
} as const;

export const imagePixelBudget = Math.floor(LIMITS.imageDecodedRgbaBytes / 4);
