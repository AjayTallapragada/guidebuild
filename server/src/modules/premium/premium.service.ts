type QuoteInput = {
  policyType: "weather" | "delay" | "accident";
  regionRiskIndex: number;
  weatherRiskIndex: number;
  claimHistoryRate: number;
  weeklyHours: number;
  coverageLimit: number;
  deductible: number;
};

const typeBase: Record<QuoteInput["policyType"], number> = {
  weather: 18,
  delay: 12,
  accident: 22
};

export class PremiumService {
  quote(input: QuoteInput) {
    const base = typeBase[input.policyType];
    const coverageFactor = input.coverageLimit / 1000;
    const regionFactor = 1 + input.regionRiskIndex * 0.5;
    const weatherFactor = 1 + input.weatherRiskIndex * 0.45;
    const claimsFactor = 1 + input.claimHistoryRate * 0.7;
    const utilizationFactor = 1 + Math.max(0, input.weeklyHours - 30) / 100;
    const deductibleDiscount = Math.min(0.35, input.deductible / 3000);

    const gross = base * coverageFactor * regionFactor * weatherFactor * claimsFactor * utilizationFactor;
    const premium = Number((gross * (1 - deductibleDiscount)).toFixed(2));

    return {
      premium,
      breakdown: {
        base,
        coverageFactor,
        regionFactor,
        weatherFactor,
        claimsFactor,
        utilizationFactor,
        deductibleDiscount
      }
    };
  }
}

export const premiumService = new PremiumService();
