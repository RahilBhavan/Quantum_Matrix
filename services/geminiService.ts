import { GoogleGenAI, Type } from "@google/genai";
import { Ecosystem, Strategy, AiRecommendation, MarketSentiment, Asset, StrategyCondition } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeSentiment = async (news: string[]): Promise<MarketSentiment> => {
  if (!apiKey) {
    // Fallback if no key provided
    return {
      score: 72,
      label: 'Bullish',
      summary: 'Simulated: Institutional inflows driving momentum across major chains.',
      trendingTopics: ['L2 Scaling', 'Restaking', 'AI Tokens', 'Memecoins'],
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following crypto market news headlines and determine the market sentiment.
      
      Headlines:
      ${news.join('\n')}
      
      Return a JSON object with:
      - score: number 0-100 (0 is extreme fear, 100 is extreme greed)
      - label: one of 'Bearish', 'Neutral', 'Bullish', 'Euphoric'
      - summary: a short 1 sentence summary
      - trendingTopics: array of strings`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            label: { type: Type.STRING },
            summary: { type: Type.STRING },
            trendingTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as MarketSentiment;
  } catch (error) {
    console.error("Gemini Sentiment Error:", error);
    return {
      score: 50,
      label: 'Neutral',
      summary: 'Could not analyze sentiment at this time.',
      trendingTopics: [],
    };
  }
};

export const getPortfolioRecommendation = async (
  sentiment: MarketSentiment,
  ecosystem: Ecosystem,
  strategies: Strategy[]
): Promise<AiRecommendation> => {
  if (!apiKey) {
    // Fallback for demo without API Key
    return {
      allocations: ecosystem.assets.map(a => ({ 
        assetId: a.id, 
        layers: [
            { strategyId: strategies.find(s => s.type === 'Yield')?.id || strategies[0].id, condition: 'Neutral', weight: 50 },
            { strategyId: strategies.find(s => s.type === 'Momentum' || s.riskLevel === 'High')?.id || strategies[0].id, condition: 'Bullish', weight: 50 }
        ]
      })),
      reasoning: "Simulated: Stacking neutral yield strategies with bullish momentum triggers for upside capture.",
    };
  }

  try {
    const prompt = `
      Act as a DeFi Quantitative Portfolio Manager.
      
      Current Market Sentiment: ${sentiment.label} (Score: ${sentiment.score}/100)
      Summary: ${sentiment.summary}
      
      Selected Ecosystem: ${ecosystem.name}
      Assets to Allocate:
      ${JSON.stringify(ecosystem.assets.map(a => ({ id: a.id, symbol: a.symbol })))}
      
      Available Quant Strategies:
      ${JSON.stringify(strategies.map(s => ({ id: s.id, name: s.name, risk: s.riskLevel, type: s.type })))}
      
      Task: Create a "Strategy Stack" for each asset.
      - A Strategy Stack consists of multiple strategies triggered by different market conditions.
      - Conditions include: 'Always', 'Bullish', 'Bearish', 'Neutral', 'Euphoric', 'High Volatility', 'AI Adaptive'.
      - 'AI Adaptive' means the strategy activates only when its risk profile matches the AI sentiment.
      - Include a 'weight' (0-100) for each strategy.
      - For example: 50% Yield (Always) + 50% Momentum (Bullish).
      
      Return JSON with allocations for each asset.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            allocations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  assetId: { type: Type.STRING },
                  layers: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              strategyId: { type: Type.STRING },
                              condition: { type: Type.STRING, enum: ['Always', 'Bullish', 'Bearish', 'Neutral', 'Euphoric', 'High Volatility', 'AI Adaptive'] },
                              weight: { type: Type.INTEGER }
                          }
                      }
                  }
                },
              },
            },
            reasoning: { type: Type.STRING },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text) as AiRecommendation;
  } catch (error) {
    console.error("Gemini Recommendation Error:", error);
    return {
      allocations: [],
      reasoning: "AI analysis failed, please configure manually.",
    };
  }
};
