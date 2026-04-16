type QuoteInput = {
  policyType: "weather" | "delay";
  regionRiskIndex: number;
  weatherRiskIndex: number;
  claimHistoryRate: number;
  weeklyHours: number;
  coverageLimit: number;
  deductible: number;
  hyperLocalZoneRisk?: number;
  predictiveWeatherIndex?: number;
  safeZone?: boolean;
};

const typeBase: Record<QuoteInput["policyType"], number> = {
  weather: 16,
  delay: 11
};

export class PremiumService {
  quote(input: QuoteInput) {
    const base = typeBase[input.policyType];
    const coverageFactor = input.coverageLimit / 1000;
    const zoneRisk = input.hyperLocalZoneRisk ?? input.regionRiskIndex;
    const forecastIndex = input.predictiveWeatherIndex ?? input.weatherRiskIndex;
    const regionFactor = 1 + input.regionRiskIndex * 0.35;
    const zoneFactor = 1 + zoneRisk * 0.3;
    const weatherFactor = 1 + forecastIndex * 0.35;
    const claimsFactor = 1 + input.claimHistoryRate * 0.7;
    const utilizationFactor = 1 + Math.max(0, input.weeklyHours - 30) / 100;
    const deductibleDiscount = Math.min(0.35, input.deductible / 3000);
    const safeZoneDiscount = input.safeZone ? 2 : 0;
    const coverageHoursBoost = input.predictiveWeatherIndex !== undefined ? Math.round((1 - input.predictiveWeatherIndex) * 4) : 0;

    const gross = base * coverageFactor * regionFactor * zoneFactor * weatherFactor * claimsFactor * utilizationFactor;
    const weeklyPremium = Number(Math.max(6, gross * (1 - deductibleDiscount) - safeZoneDiscount).toFixed(2));

    return {
      premium: weeklyPremium,
      breakdown: {
        base,
        coverageFactor,
        regionFactor,
        zoneFactor,
        weatherFactor,
        claimsFactor,
        utilizationFactor,
        deductibleDiscount,
        safeZoneDiscount,
        coverageHoursBoost
      }
    };
  }
}

export const premiumService = new PremiumService();
