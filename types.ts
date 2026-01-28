
export enum MaritalStatus {
  SINGLE = 'Single',
  MARRIED_JOINT = 'Married Filing Jointly',
  MARRIED_SEPARATE = 'Married Filing Separately',
  HEAD_HOUSEHOLD = 'Head of Household'
}

export interface Child {
  id: string;
  age: number;
  isDependent: boolean;
  isEmployed: boolean;
}

export interface BudgetCategory {
  id: string;
  name: string;
  amount: number;
  isCustom: boolean;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  type: 'W2' | 'Investment' | 'Interest' | 'Capital Gains' | 'Side-Hustle' | 'Other';
}

export interface HouseholdMember {
  id: string;
  name: string;
  incomeSources: IncomeSource[];
}

export interface HouseholdData {
  state: string;
  maritalStatus: MaritalStatus;
  annualIncome: number;
  monthlyExpenses: number;
  healthInsurance: {
    planType: 'PPO' | 'HDHP' | 'HMO' | 'None';
    monthlyPremium: number;
    employerContribution: number;
    hasHSA: boolean;
  };
  contributions: {
    rothIraAnnual: number;
    k401Annual: number;
    hsaAnnual: number;
  };
  budget: BudgetCategory[];
  incomeMembers: HouseholdMember[];
  children: Child[];
  assets: {
    savings: number;
    retirement401k: number;
    ira: number;
    realEstate: number;
    investments: number;
    pension: number;
  };
  debts: {
    mortgage: number;
    studentLoans: number;
    creditCards: number;
    other: number;
  };
}

export interface Recommendation {
  id: string;
  category: 'Tax Optimization' | 'Social Programs' | 'Education' | 'Retirement' | 'State Benefits' | 'Health & HSA' | 'Budget & Cash Flow' | 'Income Strategy';
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  estimatedImpact: string;
  actionSteps: string[];
}

export interface ResilienceFactor {
  name: string;
  score: number; // 0-100
  description: string;
}

export interface AnalysisResponse {
  summary: string;
  netWorth: number;
  debtToIncomeRatio: number;
  resilienceGrade: string; // A+, A, B, etc.
  resilienceScore: number; // 0-100
  resilienceFactors: ResilienceFactor[];
  recommendations: Recommendation[];
}
