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

export type TriggerSignal = {
  source: string;
  triggerType: "weather" | "delay" | "accident";
  severity: number;
  eventKey: string;
  delayMinutes?: number;
  weatherRiskIndex?: number;
  collisionDetected?: boolean;
};

function stableSeed(text: string) {
  let seed = 0;
  for (let index = 0; index < text.length; index += 1) {
    seed = (seed * 31 + text.charCodeAt(index)) % 1000;
  }
  return seed / 1000;
}

function createEventKey(source: string, scope: string) {
  return `${source}-${scope}-${Date.now()}`;
}

export function getWeatherSignal(scope: string): TriggerSignal {
  const risk = stableSeed(`${scope}-weather`);
  return {
    source: "mock_weather_api",
    triggerType: "weather",
    severity: Math.min(1, 0.35 + risk),
    weatherRiskIndex: risk,
    eventKey: createEventKey("weather", scope)
  };
}

export function getWaterLoggingSignal(scope: string): TriggerSignal {
  const risk = stableSeed(`${scope}-waterlogging`);
  return {
    source: "mock_water_logging_api",
    triggerType: "weather",
    severity: Math.min(1, 0.25 + risk),
    weatherRiskIndex: Math.min(1, risk + 0.2),
    eventKey: createEventKey("waterlogging", scope)
  };
}

export function getTrafficDelaySignal(scope: string): TriggerSignal {
  const risk = stableSeed(`${scope}-traffic`);
  return {
    source: "mock_traffic_api",
    triggerType: "delay",
    severity: Math.min(1, 0.3 + risk),
    delayMinutes: Math.round(20 + risk * 90),
    eventKey: createEventKey("traffic", scope)
  };
}

export function getAccidentSignal(scope: string): TriggerSignal {
  const risk = stableSeed(`${scope}-accident`);
  return {
    source: "mock_safety_api",
    triggerType: "accident",
    severity: Math.min(1, 0.4 + risk),
    collisionDetected: risk > 0.55,
    eventKey: createEventKey("accident", scope)
  };
}

export function getOrderFailureSignal(scope: string): TriggerSignal {
  const risk = stableSeed(`${scope}-payment`);
  return {
    source: "mock_order_failure_api",
    triggerType: "delay",
    severity: Math.min(1, 0.2 + risk),
    delayMinutes: Math.round(10 + risk * 60),
    eventKey: createEventKey("order-failure", scope)
  };
}
