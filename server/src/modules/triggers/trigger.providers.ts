export function weatherRiskAdapter(input: { weatherRiskIndex?: number; severity: number }): number {
  return Math.max(input.weatherRiskIndex ?? 0, input.severity);
}

export function deliveryDelayAdapter(input: { delayMinutes?: number; severity: number }): number {
  const delayScore = Math.min(1, (input.delayMinutes ?? 0) / 120);
  return Math.max(delayScore, input.severity);
}

export function accidentTelemetryAdapter(input: { collisionDetected?: boolean; severity: number }): number {
  if (input.collisionDetected) {
    return Math.max(0.85, input.severity);
  }
  return input.severity;
}
