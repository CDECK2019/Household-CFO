
import { GoogleGenAI, Type } from "@google/genai";
import { HouseholdData, AnalysisResponse } from "../types";

export const analyzeHouseholdFinances = async (data: HouseholdData): Promise<AnalysisResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const budgetSummary = data.budget.map(b => `${b.name}: $${b.amount}/mo`).join(', ');
  
  const incomeSummary = data.incomeMembers.map(m => {
    const memberIncome = m.incomeSources.map(s => `${s.name} (${s.type}): $${s.amount}/yr`).join(', ');
    return `${m.name}: [${memberIncome}]`;
  }).join(' | ');

  const prompt = `
    As a world-class Household CFO and Wealth Strategist, analyze the following household financial profile.
    
    Household Data:
    - Residency: ${data.state}
    - Marital Status: ${data.maritalStatus}
    - Total Annual Gross Income: $${data.annualIncome}
    - Granular Annual Income by Member: ${incomeSummary}
    - Granular Monthly Budget: ${budgetSummary}
    - Total Monthly Expenses: $${data.monthlyExpenses}
    - Health Plan: ${data.healthInsurance.planType} (Premium: $${data.healthInsurance.monthlyPremium}/mo, Employer: $${data.healthInsurance.employerContribution}/mo, HSA: ${data.healthInsurance.hasHSA ? 'Yes' : 'No'})
    - Current Contributions: Roth IRA: $${data.contributions.rothIraAnnual}/yr, 401k: $${data.contributions.k401Annual}/yr, HSA: $${data.contributions.hsaAnnual}/yr
    - Children: ${data.children.length} children
    - Assets: ${JSON.stringify(data.assets)}
    - Debts: ${JSON.stringify(data.debts)}

    TASK:
    1. CALCULATE FINANCIAL RESILIENCE GRADE:
       Use the "CFO Resilience Framework":
       - Emergency Reserve (30%): Liquid Savings vs Monthly Burn. (6 months = 100/100)
       - Debt Management (30%): DTI Ratio and Credit Utilization. (DTI < 25% = 100/100)
       - Savings Velocity (25%): Total Annual Contributions / Gross Income. (20% = 100/100)
       - Asset Diversification (15%): Balance between retirement, cash, and growth investments.
       Provide an overall Grade (A+ to F) and individual factor scores.

    2. STRATEGIC RECOMMENDATIONS:
       - Focus on Income Generation, HSA hacks, Tax Efficiency (529s, child employment), and Social Programs.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
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
