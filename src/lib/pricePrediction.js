// Pure-math price prediction utilities.
// Linear regression (least squares) on REAL recorded price snapshots.
// No LLM, no external prediction API — just statistics on actual data.

/**
 * Compute least-squares linear regression on a set of (x, y) points.
 * Returns { slope, intercept, r2 } or null if not enough data.
 * r2 = coefficient of determination (0..1) — how well the line fits the data.
 */
export function linearRegression(points) {
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const meanY = sumY / n;
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  let ssTot = 0, ssRes = 0;
  for (const p of points) {
    const yPred = slope * p.x + intercept;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - yPred) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { slope, intercept, r2 };
}

/**
 * Build a 30-day-forward projection from real price history.
 *
 * @param {Array<{date: string, price: number}>} history — real daily snapshots, oldest first
 * @param {number} projectDays — how many days forward to project (default 30)
 * @returns {{
 *   points: Array<{x: number, y: number}>,      // real data, x = day index
 *   projection: Array<{x: number, y: number}>,  // dashed line from last real point forward
 *   predictedPrice: number,
 *   currentPrice: number,
 *   slope: number,                               // $/day
 *   r2: number,                                  // 0..1 fit quality
 *   confidence: "low" | "moderate" | "strong",
 *   dataPoints: number,
 *   spanDays: number,
 * } | null}
 */
export function buildPrediction(history, projectDays = 30) {
  if (!history || history.length < 5) return null;
  // Sort oldest first, dedupe by date, filter zero prices
  const sorted = [...history]
    .filter((h) => Number(h.price) > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length < 5) return null;

  const firstDate = new Date(sorted[0].date).getTime();
  const dayMs = 86400000;
  const points = sorted.map((h) => ({
    x: Math.round((new Date(h.date).getTime() - firstDate) / dayMs),
    y: Number(h.price),
  }));

  const reg = linearRegression(points);
  if (!reg) return null;

  const lastPoint = points[points.length - 1];
  const projectX = lastPoint.x + projectDays;
  const predictedPrice = Math.max(0, reg.slope * projectX + reg.intercept);
  const currentPrice = lastPoint.y;

  const projection = [
    { x: lastPoint.x, y: currentPrice },
    { x: projectX, y: Math.max(0, predictedPrice) },
  ];

  let confidence;
  if (reg.r2 >= 0.7) confidence = "strong";
  else if (reg.r2 >= 0.4) confidence = "moderate";
  else confidence = "low";

  return {
    points,
    projection,
    predictedPrice,
    currentPrice,
    slope: reg.slope,
    r2: reg.r2,
    confidence,
    dataPoints: points.length,
    spanDays: lastPoint.x,
  };
}

/**
 * Convert day-index chart data into date labels for the x-axis.
 */
export function dayToLabel(dayIndex, firstDateStr) {
  const d = new Date(firstDateStr);
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}