export const MB = 1024 * 1024;

// Practical ceiling for browser-side processing on average desktop hardware.
export const DEFAULT_MAX_FILE_SIZE_MB = 500;

export type UploadRiskLevel = "low" | "medium" | "high";

export interface UploadRiskEstimate {
  level: UploadRiskLevel;
  usageRatio: number;
}

export function mbToBytes(mb: number): number {
  return mb * MB;
}

export function estimateUploadRisk(fileSizeBytes: number, maxSizeMb = DEFAULT_MAX_FILE_SIZE_MB): UploadRiskEstimate {
  const maxBytes = mbToBytes(maxSizeMb);
  const usageRatio = maxBytes > 0 ? fileSizeBytes / maxBytes : 1;

  if (usageRatio >= 0.75) {
    return { level: "high", usageRatio };
  }

  if (usageRatio >= 0.4) {
    return { level: "medium", usageRatio };
  }

  return { level: "low", usageRatio };
}

export function highestUploadRisk(estimates: UploadRiskEstimate[]): UploadRiskEstimate | null {
  if (estimates.length === 0) {
    return null;
  }

  return estimates.reduce((highest, current) => {
    const order: Record<UploadRiskLevel, number> = { low: 0, medium: 1, high: 2 };
    return order[current.level] > order[highest.level] ? current : highest;
  });
}
