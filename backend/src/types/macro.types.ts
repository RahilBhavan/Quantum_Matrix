/**
 * Macro-Economic Data Types
 * 
 * Type definitions for macroeconomic indicators that affect crypto markets:
 * - CPI (Consumer Price Index / Inflation)
 * - Federal Funds Rate
 * - DXY (US Dollar Index)
 */

export interface MacroIndicator {
    value: number;
    previousValue: number;
    change: number;
    changePercent: number;
    trend: 'rising' | 'falling' | 'stable';
    lastUpdate: string;
    source: string;
}

export interface CPIData extends MacroIndicator {
    yoyChange: number;        // Year-over-year inflation rate
    momChange: number;        // Month-over-month change
    isAboveTarget: boolean;   // Above Fed's 2% target
}

export interface FedRateData extends MacroIndicator {
    targetRangeLow: number;
    targetRangeHigh: number;
    effectiveRate: number;
    fedStance: 'hawkish' | 'neutral' | 'dovish';
}

export interface DXYData extends MacroIndicator {
    strength: 'strong' | 'neutral' | 'weak';
    movingAverage20d: number | null;
    isAboveMA: boolean | null;
}

export interface MacroSignals {
    cpi: CPIData | null;
    federalFundsRate: FedRateData | null;
    dxy: DXYData | null;
    compositeScore: number;           // -1 (bearish) to +1 (bullish) for crypto
    interpretation: MacroInterpretation;
    signals: {
        cpiSignal: number;            // -1 to +1
        rateSignal: number;           // -1 to +1
        dxySignal: number;            // -1 to +1
    };
    lastUpdate: string;
    dataFreshness: 'fresh' | 'stale' | 'fallback';
}

export type MacroInterpretation =
    | 'Very Hawkish'    // Strong headwinds for crypto
    | 'Hawkish'         // Moderate headwinds
    | 'Neutral'         // Mixed signals
    | 'Dovish'          // Supportive conditions
    | 'Very Dovish';    // Strong tailwinds for crypto

/**
 * FRED API Response Types
 */
export interface FREDObservation {
    date: string;
    value: string;
}

export interface FREDResponse {
    observations: FREDObservation[];
}

/**
 * Macro context for S³ scoring
 */
export interface MacroContext {
    globalLiquiditySignal: number;    // -1 to +1
    volatilityImpact: 'low' | 'normal' | 'high';
    shouldIncreaseMacroWeight: boolean;
}
