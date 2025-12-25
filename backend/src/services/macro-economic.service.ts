import { logger } from '../middleware/logger.js';
import { cacheService } from './cache.service.js';
import type {
    MacroSignals,
    MacroInterpretation,
    CPIData,
    FedRateData,
    DXYData,
    FREDResponse,
    MacroContext,
} from '../types/macro.types.js';

/**
 * Macro-Economic Service
 * 
 * Fetches and analyzes macroeconomic indicators that impact crypto markets:
 * - CPI (Consumer Price Index) - Inflation data
 * - Federal Funds Rate - Interest rate policy
 * - DXY (US Dollar Index) - Dollar strength
 * 
 * These factors often dominate sentiment in high-volatility states.
 */

// FRED API base URL (Federal Reserve Economic Data)
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

// Series IDs for FRED data
const FRED_SERIES = {
    CPI: 'CPIAUCSL',           // Consumer Price Index for All Urban Consumers
    CPI_CORE: 'CPILFESL',      // Core CPI (excluding food & energy)
    FED_FUNDS: 'FEDFUNDS',     // Effective Federal Funds Rate
    FED_FUNDS_TARGET: 'DFEDTARU', // Federal Funds Target Rate Upper
};

// Cache configuration
const MACRO_CACHE_KEY = 'macro:signals';
const MACRO_CACHE_TTL = 60 * 60; // 1 hour (macro data updates slowly)

class MacroEconomicService {
    private readonly fredApiKey: string | undefined;

    constructor() {
        // FRED API key is optional - we have fallbacks
        this.fredApiKey = process.env.FRED_API_KEY;
        if (!this.fredApiKey) {
            logger.warn('FRED_API_KEY not set - using fallback macro data');
        }
    }

    /**
     * Get all macro-economic signals with composite score
     */
    async getMacroSignals(): Promise<MacroSignals> {
        // Check cache first
        const cached = await cacheService.get<MacroSignals>(MACRO_CACHE_KEY);
        if (cached) {
            logger.debug('Returning cached macro signals');
            return cached;
        }

        // Fetch all indicators in parallel
        const [cpi, fedRate, dxy] = await Promise.allSettled([
            this.fetchCPIData(),
            this.fetchFedRateData(),
            this.fetchDXYData(),
        ]);

        const cpiData = cpi.status === 'fulfilled' ? cpi.value : null;
        const fedRateData = fedRate.status === 'fulfilled' ? fedRate.value : null;
        const dxyData = dxy.status === 'fulfilled' ? dxy.value : null;

        // Calculate individual signals
        const cpiSignal = this.calculateCPISignal(cpiData);
        const rateSignal = this.calculateRateSignal(fedRateData);
        const dxySignal = this.calculateDXYSignal(dxyData);

        // Calculate composite score
        // Higher CPI, higher rates, stronger dollar = BEARISH for crypto
        const compositeScore = this.calculateCompositeScore(cpiSignal, rateSignal, dxySignal);

        // Determine data freshness
        const dataFreshness = this.determineDataFreshness(cpiData, fedRateData, dxyData);

        const result: MacroSignals = {
            cpi: cpiData,
            federalFundsRate: fedRateData,
            dxy: dxyData,
            compositeScore,
            interpretation: this.interpretScore(compositeScore),
            signals: {
                cpiSignal,
                rateSignal,
                dxySignal,
            },
            lastUpdate: new Date().toISOString(),
            dataFreshness,
        };

        // Cache the result
        await cacheService.set(MACRO_CACHE_KEY, result, MACRO_CACHE_TTL);

        logger.info('Macro signals calculated', {
            compositeScore: compositeScore.toFixed(3),
            interpretation: result.interpretation,
            freshness: dataFreshness,
        });

        return result;
    }

    /**
     * Fetch CPI (inflation) data from FRED
     */
    private async fetchCPIData(): Promise<CPIData | null> {
        try {
            if (!this.fredApiKey) {
                return this.getFallbackCPIData();
            }

            const response = await fetch(
                `${FRED_BASE_URL}?series_id=${FRED_SERIES.CPI}&api_key=${this.fredApiKey}&file_type=json&sort_order=desc&limit=13`,
                { headers: { 'Accept': 'application/json' } }
            );

            if (!response.ok) {
                throw new Error(`FRED API error: ${response.status}`);
            }

            const data = (await response.json()) as FREDResponse;
            const observations = data.observations.filter(o => o.value !== '.');

            if (observations.length < 2) {
                return this.getFallbackCPIData();
            }

            const current = parseFloat(observations[0].value);
            const previous = parseFloat(observations[1].value);
            const yearAgo = observations.length >= 12 ? parseFloat(observations[11].value) : current * 0.97;

            const momChange = ((current - previous) / previous) * 100;
            const yoyChange = ((current - yearAgo) / yearAgo) * 100;

            return {
                value: current,
                previousValue: previous,
                change: current - previous,
                changePercent: momChange,
                momChange,
                yoyChange,
                isAboveTarget: yoyChange > 2.0, // Fed's 2% target
                trend: momChange > 0.1 ? 'rising' : momChange < -0.1 ? 'falling' : 'stable',
                lastUpdate: observations[0].date,
                source: 'FRED',
            };
        } catch (error) {
            logger.error('Failed to fetch CPI data:', error);
            return this.getFallbackCPIData();
        }
    }

    /**
     * Fetch Federal Funds Rate from FRED
     */
    private async fetchFedRateData(): Promise<FedRateData | null> {
        try {
            if (!this.fredApiKey) {
                return this.getFallbackFedRateData();
            }

            const response = await fetch(
                `${FRED_BASE_URL}?series_id=${FRED_SERIES.FED_FUNDS}&api_key=${this.fredApiKey}&file_type=json&sort_order=desc&limit=3`,
                { headers: { 'Accept': 'application/json' } }
            );

            if (!response.ok) {
                throw new Error(`FRED API error: ${response.status}`);
            }

            const data = (await response.json()) as FREDResponse;
            const observations = data.observations.filter(o => o.value !== '.');

            if (observations.length < 2) {
                return this.getFallbackFedRateData();
            }

            const current = parseFloat(observations[0].value);
            const previous = parseFloat(observations[1].value);
            const change = current - previous;

            // Determine Fed stance based on rate trajectory
            let fedStance: 'hawkish' | 'neutral' | 'dovish' = 'neutral';
            if (change > 0.1) fedStance = 'hawkish';
            else if (change < -0.1) fedStance = 'dovish';

            return {
                value: current,
                previousValue: previous,
                change,
                changePercent: (change / previous) * 100,
                effectiveRate: current,
                targetRangeLow: current - 0.25,
                targetRangeHigh: current + 0.25,
                fedStance,
                trend: change > 0 ? 'rising' : change < 0 ? 'falling' : 'stable',
                lastUpdate: observations[0].date,
                source: 'FRED',
            };
        } catch (error) {
            logger.error('Failed to fetch Fed rate data:', error);
            return this.getFallbackFedRateData();
        }
    }

    /**
     * Fetch DXY (US Dollar Index) proxy data
     * Uses alternative sources since DXY isn't directly available from FRED
     */
    private async fetchDXYData(): Promise<DXYData | null> {
        try {
            // Try to get DXY from a free source
            // Using exchangerate.host as a proxy for dollar strength
            const response = await fetch(
                'https://api.exchangerate.host/latest?base=USD&symbols=EUR,GBP,JPY,CHF',
                { headers: { 'Accept': 'application/json' } }
            );

            if (!response.ok) {
                return this.getFallbackDXYData();
            }

            const data = (await response.json()) as { rates?: { [key: string]: number } };

            if (!data.rates) {
                return this.getFallbackDXYData();
            }

            // Calculate a simple dollar strength index from major pairs
            // Higher value = stronger dollar
            const eurRate = data.rates.EUR || 0.92;
            const gbpRate = data.rates.GBP || 0.79;
            const jpyRate = data.rates.JPY || 149;

            // Approximate DXY calculation (simplified)
            // Real DXY is weighted: EUR 57.6%, JPY 13.6%, GBP 11.9%, CAD 9.1%, SEK 4.2%, CHF 3.6%
            const dxyProxy = (1 / eurRate) * 50 + (jpyRate / 100) * 25 + (1 / gbpRate) * 25;
            const normalizedDxy = dxyProxy * 1.1; // Scale to approximate real DXY range (90-110)

            return {
                value: Math.round(normalizedDxy * 100) / 100,
                previousValue: normalizedDxy * 0.995, // Approximate
                change: normalizedDxy * 0.005,
                changePercent: 0.5,
                strength: normalizedDxy > 105 ? 'strong' : normalizedDxy < 95 ? 'weak' : 'neutral',
                trend: 'stable',
                movingAverage20d: null,
                isAboveMA: null,
                lastUpdate: new Date().toISOString(),
                source: 'exchangerate.host',
            };
        } catch (error) {
            logger.error('Failed to fetch DXY data:', error);
            return this.getFallbackDXYData();
        }
    }

    /**
     * Calculate CPI signal for crypto (-1 to +1)
     * High inflation = bearish for crypto (risk-off)
     */
    private calculateCPISignal(cpi: CPIData | null): number {
        if (!cpi) return 0;

        // YoY inflation above 2% target is bearish
        // Below 2% is bullish (easier monetary policy likely)
        const yoyDeviation = cpi.yoyChange - 2.0;

        // Scale: 0% YoY = +0.5, 2% = 0, 5% = -0.5, 8% = -1.0
        const signal = -yoyDeviation / 6;

        return Math.max(-1, Math.min(1, signal));
    }

    /**
     * Calculate Fed Rate signal for crypto (-1 to +1)
     * Higher rates = bearish for crypto (tighter liquidity)
     */
    private calculateRateSignal(fedRate: FedRateData | null): number {
        if (!fedRate) return 0;

        // Neutral rate assumed around 2.5%
        // Above = hawkish (bearish for crypto)
        // Below = dovish (bullish for crypto)
        const neutralRate = 2.5;
        const deviation = fedRate.effectiveRate - neutralRate;

        // Scale: 0% = +0.5, 2.5% = 0, 5% = -0.5, 7.5% = -1.0
        const signal = -deviation / 5;

        // Add momentum factor
        let momentumBonus = 0;
        if (fedRate.fedStance === 'dovish') momentumBonus = 0.1;
        if (fedRate.fedStance === 'hawkish') momentumBonus = -0.1;

        return Math.max(-1, Math.min(1, signal + momentumBonus));
    }

    /**
     * Calculate DXY signal for crypto (-1 to +1)
     * Strong dollar = bearish for crypto
     */
    private calculateDXYSignal(dxy: DXYData | null): number {
        if (!dxy) return 0;

        // DXY neutral around 100
        // Above = strong dollar (bearish for crypto)
        // Below = weak dollar (bullish for crypto)
        const neutralDxy = 100;
        const deviation = dxy.value - neutralDxy;

        // Scale: 90 = +0.5, 100 = 0, 110 = -0.5, 120 = -1.0
        const signal = -deviation / 20;

        return Math.max(-1, Math.min(1, signal));
    }

    /**
     * Calculate composite macro score
     * Weighted average of all signals
     */
    private calculateCompositeScore(
        cpiSignal: number,
        rateSignal: number,
        dxySignal: number
    ): number {
        // Weights based on typical crypto market sensitivity
        const cpiWeight = 0.35;
        const rateWeight = 0.35;
        const dxyWeight = 0.30;

        const composite =
            cpiSignal * cpiWeight +
            rateSignal * rateWeight +
            dxySignal * dxyWeight;

        return Math.round(composite * 1000) / 1000;
    }

    /**
     * Interpret composite score into human-readable stance
     */
    private interpretScore(score: number): MacroInterpretation {
        if (score <= -0.4) return 'Very Hawkish';
        if (score <= -0.15) return 'Hawkish';
        if (score <= 0.15) return 'Neutral';
        if (score <= 0.4) return 'Dovish';
        return 'Very Dovish';
    }

    /**
     * Determine data freshness
     */
    private determineDataFreshness(
        cpi: CPIData | null,
        fedRate: FedRateData | null,
        dxy: DXYData | null
    ): 'fresh' | 'stale' | 'fallback' {
        const hasFreshData = [cpi, fedRate, dxy].filter(d => d?.source !== 'fallback').length;

        if (hasFreshData >= 2) return 'fresh';
        if (hasFreshData >= 1) return 'stale';
        return 'fallback';
    }

    /**
     * Get macro context for S³ integration
     */
    async getMacroContext(): Promise<MacroContext> {
        const signals = await this.getMacroSignals();

        // Determine if we should increase macro weight based on conditions
        const shouldIncreaseMacroWeight =
            Math.abs(signals.compositeScore) > 0.3 || // Strong macro signal
            signals.interpretation === 'Very Hawkish' ||
            signals.interpretation === 'Very Dovish';

        return {
            globalLiquiditySignal: signals.compositeScore,
            volatilityImpact: shouldIncreaseMacroWeight ? 'high' : 'normal',
            shouldIncreaseMacroWeight,
        };
    }

    // Fallback data methods
    private getFallbackCPIData(): CPIData {
        return {
            value: 313.0,
            previousValue: 312.5,
            change: 0.5,
            changePercent: 0.16,
            momChange: 0.16,
            yoyChange: 2.9, // Approximate current inflation
            isAboveTarget: true,
            trend: 'stable',
            lastUpdate: new Date().toISOString(),
            source: 'fallback',
        };
    }

    private getFallbackFedRateData(): FedRateData {
        return {
            value: 4.33,
            previousValue: 4.33,
            change: 0,
            changePercent: 0,
            effectiveRate: 4.33,
            targetRangeLow: 4.25,
            targetRangeHigh: 4.50,
            fedStance: 'neutral',
            trend: 'stable',
            lastUpdate: new Date().toISOString(),
            source: 'fallback',
        };
    }

    private getFallbackDXYData(): DXYData {
        return {
            value: 104.5,
            previousValue: 104.0,
            change: 0.5,
            changePercent: 0.48,
            strength: 'strong',
            trend: 'stable',
            movingAverage20d: null,
            isAboveMA: null,
            lastUpdate: new Date().toISOString(),
            source: 'fallback',
        };
    }
}

export const macroEconomicService = new MacroEconomicService();
