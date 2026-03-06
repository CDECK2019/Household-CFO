
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { HouseholdData, AnalysisResponse, DeepInsight } from "../types";

export const analyzeHouseholdFinances = async (data: HouseholdData): Promise<AnalysisResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const budgetSummary = data.budget.map(b => `${b.name}: $${b.amount}/mo`).join(', ');
  
  const incomeSummary = data.incomeMembers.map(m => {
    const memberIncome = m.incomeSources.map(s => `${s.name} (${s.type}): $${s.amount}/yr`).join(', ');
    return `${m.name}: [${memberIncome}]`;
  }).join(' | ');

  const childrenDetails = data.children.map(c => `Age: ${c.age}, Employed: ${c.isEmployed ? 'Yes' : 'No'}, Full Custody: ${c.fullCustody ? 'Yes' : 'No'}`).join('; ');

  const prompt = `
    As a world-class Homeland CFO and Wealth Strategist, analyze the following household financial profile.
    
    Household Data:
    - Residency: ${data.state} (Zip Code: ${data.zipCode})
    - Head of Household Age: ${data.age}
    - Marital Status: ${data.maritalStatus}
    - Composition: ${data.numAdults} adults, ${data.children.length} children
    - Total Annual Gross Income: $${data.annualIncome}
    - Granular Annual Income by Member: ${incomeSummary}
    - Granular Monthly Budget: ${budgetSummary}
    - Total Monthly Expenses: $${data.monthlyExpenses}
    - House Characteristics: ${JSON.stringify(data.houseCharacteristics)}
    - Health Plan: ${data.healthInsurance.planType} (Premium: $${data.healthInsurance.monthlyPremium}/mo, Employer: $${data.healthInsurance.employerContribution}/mo, HSA: ${data.healthInsurance.hasHSA ? 'Yes' : 'No'})
    - Current Contributions: Roth IRA: $${data.contributions.rothIraAnnual}/yr, 401k: $${data.contributions.k401Annual}/yr, HSA: $${data.contributions.hsaAnnual}/yr
    - Children Details: ${childrenDetails || 'N/A'}
    - Assets: ${JSON.stringify(data.assets)}
    - Custom Assets: ${JSON.stringify(data.customAssets)}
    - Portfolio (Granular): ${JSON.stringify(data.portfolio)}
    - Debts: ${JSON.stringify(data.debts)}
    - Custom Debts: ${JSON.stringify(data.customDebts)}

    TASK:
    1. CALCULATE FINANCIAL RESILIENCE GRADE:
       Use the "CFO Resilience Framework":
       - Emergency Reserve (30%): Liquid Savings vs Monthly Burn. (6 months = 100/100)
       - Debt Management (30%): DTI Ratio and Credit Utilization. (DTI < 25% = 100/100)
       - Savings Velocity (25%): Total Annual Contributions / Gross Income. (20% = 100/100)
       - Asset Diversification (15%): Balance between retirement, cash, and growth investments.
       Provide an overall Grade (A+ to F) and individual factor scores.

    2. UTILITY BILL ANOMALY DETECTION:
       Analyze the "Utilities" category in the budget. Based on the Zip Code (${data.zipCode}), Square Footage (${data.houseCharacteristics.squareFootage} sqft), Insulation status, and Heating Source, determine if the utility spending is anomalous (too high or surprisingly low). Provide specific feedback on this in the summary or as a recommendation.

    3. INVESTMENT PORTFOLIO ASSESSMENT:
       Analyze the granular portfolio data. Assess asset allocation (stocks/bonds/crypto), risk exposure, and tax efficiency (e.g., are high-yield assets in tax-advantaged accounts?). Provide specific insights on how these investments interact with their overall household resilience and long-term goals.

    4. STRATEGIC RECOMMENDATIONS:
       - MANDATORY CHECK: Always verify if the user is contributing to a Roth IRA and an HSA. If contributions are zero or accounts are missing from the portfolio, prioritize recommendations to open and fund these immediately.
       - Focus on Income Generation, HSA hacks (using HSA as a stealth IRA), Tax Efficiency (529s, child employment), and Social Programs.
       - Consider spousal benefits, age-related tax breaks, and child-related tax credits (CTC, EITC).
       - Note: Full custody status significantly impacts eligibility for Head of Household status and various credits.
       - Include energy efficiency upgrades or utility assistance programs if anomalies are detected.

    IMPORTANT FORMATTING RULE:
    All monetary values in your response (especially in "estimatedImpact" and "summary") MUST be formatted as currency with exactly two decimal places (e.g., $1,250.00, $0.50).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          netWorth: { type: Type.NUMBER },
          debtToIncomeRatio: { type: Type.NUMBER },
          resilienceGrade: { type: Type.STRING },
          resilienceScore: { type: Type.NUMBER },
          resilienceFactors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                score: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["name", "score", "description"]
            }
          },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                category: { type: Type.STRING },
                priority: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                estimatedImpact: { type: Type.STRING },
                actionSteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["id", "category", "priority", "title", "description", "estimatedImpact", "actionSteps"]
            }
          }
        },
        required: ["summary", "netWorth", "debtToIncomeRatio", "resilienceGrade", "resilienceScore", "resilienceFactors", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const startAdvisorChat = async (data: HouseholdData, analysis: AnalysisResponse | null) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const budgetSummary = data.budget.map(b => `${b.name}: $${b.amount}/mo`).join(', ');
  const incomeSummary = data.incomeMembers.map(m => {
    const memberIncome = m.incomeSources.map(s => `${s.name} (${s.type}): $${s.amount}/yr`).join(', ');
    return `${m.name}: [${memberIncome}]`;
  }).join(' | ');

  const childrenDetails = data.children.map(c => `Age: ${c.age}, Employed: ${c.isEmployed ? 'Yes' : 'No'}, Full Custody: ${c.fullCustody ? 'Yes' : 'No'}`).join('; ');

  const systemInstruction = `
    You are the "Homeland CFO & Tactical Wealth Advisor", an AI with deep expertise in personal finance, tax law, social programs, and asset management.
    
    CONTEXT:
    Current Household Financial Profile:
    - State: ${data.state} (Zip Code: ${data.zipCode})
    - Age: ${data.age}
    - Status: ${data.maritalStatus}
    - Household Size: ${data.numAdults} adults, ${data.children.length} children
    - Children Details: ${childrenDetails || 'N/A'}
    - House Characteristics: ${JSON.stringify(data.houseCharacteristics)}
    - Income: $${data.annualIncome} total (${incomeSummary})
    - Burn Rate: $${data.monthlyExpenses}/mo
    - Net Worth Estimate: $${analysis?.netWorth || 'TBD'}
    - Assets: ${JSON.stringify(data.assets)}
    - Custom Assets: ${JSON.stringify(data.customAssets)}
    - Portfolio (Granular): ${JSON.stringify(data.portfolio)}
    - Debt Exposure: $${(Object.values(data.debts) as number[]).reduce((a, b) => a + b, 0) + data.customDebts.reduce((a, b) => a + b.amount, 0)} (DTI: ${analysis?.debtToIncomeRatio || 'TBD'})
    - Custom Debts: ${JSON.stringify(data.customDebts)}
    - Health Insurance: ${data.healthInsurance.planType} (HSA: ${data.healthInsurance.hasHSA ? 'Yes' : 'No'})
    
    PREVIOUS CFO INSIGHTS:
    ${analysis ? analysis.recommendations.map(r => `- ${r.title}: ${r.description}`).join('\n') : "No analysis run yet."}

    GUIDELINES:
    1. MANDATORY: Always check if the user has a Roth IRA and an HSA. If they are missing or underfunded, aggressively encourage their creation and funding as the "foundation of tax alpha".
    2. Be highly specific to the user's state (${data.state}) and demographic.
    3. Be creative: Suggest child-employment to fund Roth IRAs, 529 plan nuances, state-specific property tax abatements, and niche social programs (energy assistance, food stamps if applicable).
    3. Maintain a tactical, sophisticated, yet accessible tone. Use terms like "Capital Allocation", "Savings Velocity", and "Tax Alpha".
    4. Provide actionable steps for every piece of advice.
    5. If asked about children, focus on long-term wealth transfer and education optimization. Take 'Full Custody' status into account for custodial accounts and tax filing eligibility.
    6. MANDATORY FORMATTING: All monetary values in your responses MUST be formatted as currency with exactly two decimal places (e.g., $1,250.00, $0.50).
    
    Always act as a partner in their financial resilience.
  `;

  return ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    },
  });
};

export const categorizeExpenses = async (expenses: { description: string, amount: number }[], currentCategories: string[]): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
    I have a list of expenses from a CSV file. Please categorize and aggregate them into the following budget categories: [${currentCategories.join(', ')}]. 
    If an expense doesn't fit well into the existing categories, you can suggest a new appropriate category name.
    
    Expenses to categorize:
    ${expenses.map(e => `- ${e.description}: $${e.amount}`).join('\n')}
    
    TASK:
    Return a JSON array of objects, where each object represents an aggregated category:
    {
      "name": "Category Name",
      "amount": number (total for this category),
      "isFixed": boolean (best guess if this is a fixed or variable expense)
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            isFixed: { type: Type.BOOLEAN }
          },
          required: ["name", "amount", "isFixed"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};

export const generateDeepInsights = async (data: HouseholdData, analysis: AnalysisResponse): Promise<DeepInsight[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
    As a world-class Homeland CFO, provide 5-7 "Deep Insights" for this household based on their profile and previous analysis.
    
    Household Profile:
    - State: ${data.state}
    - Age: ${data.age}
    - Income: $${data.annualIncome}
    - Net Worth: $${analysis.netWorth}
    - Resilience Grade: ${analysis.resilienceGrade}
    
    Previous Recommendations:
    ${analysis.recommendations.map(r => `- ${r.title}`).join('\n')}
    
    TASK:
    Provide advanced, categorized insights that go beyond basic advice. Focus on:
    1. Investment: Asset location, specific risk hedges, or sector exposure.
    2. Tax: Niche state credits, advanced spousal strategies, or long-term tax bracket management.
    3. Personal Finance: Behavioral finance tips, specific burn-rate optimizations, or cash-flow timing.
    4. Estate Planning: Beneficiary nuances, trust considerations (if applicable), or wealth transfer.
    5. Risk Management: Insurance gaps, liability exposure, or emergency scenario planning.
    
    IMPORTANT FORMATTING RULE:
    All monetary values in your response (especially in "impact") MUST be formatted as currency with exactly two decimal places (e.g., $1,250.00, $0.50).

    Return a JSON array of objects:
    {
      "category": "Investment" | "Tax" | "Personal Finance" | "Estate Planning" | "Risk Management",
      "title": "Short, punchy title",
      "content": "Detailed, tactical explanation (2-3 sentences)",
      "impact": "Estimated financial or resilience impact"
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: ['Investment', 'Tax', 'Personal Finance', 'Estate Planning', 'Risk Management'] },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            impact: { type: Type.STRING }
          },
          required: ["category", "title", "content", "impact"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};
