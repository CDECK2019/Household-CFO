
import { HouseholdData, MaritalStatus, HouseholdMember } from './types';

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

export const CORE_BUDGET_CATEGORIES = [
  { id: 'cat-1', name: 'Housing', amount: 1500, isCustom: false },
  { id: 'cat-2', name: 'Transportation', amount: 400, isCustom: false },
  { id: 'cat-3', name: 'Food & Dining', amount: 600, isCustom: false },
  { id: 'cat-4', name: 'Utilities', amount: 250, isCustom: false },
  { id: 'cat-5', name: 'Healthcare', amount: 300, isCustom: false },
  { id: 'cat-6', name: 'Income Tax / Withholding', amount: 1200, isCustom: false },
];

const INITIAL_MEMBER: HouseholdMember = {
  id: 'member-1',
  name: 'Person 1',
  incomeSources: [
    { id: 'inc-1', name: 'W2 Income', amount: 80000, type: 'W2' },
    { id: 'inc-2', name: 'Interest Income', amount: 2000, type: 'Interest' },
    { id: 'inc-3', name: 'Dividend Income', amount: 3000, type: 'Investment' },
  ]
};

export const INITIAL_HOUSEHOLD_DATA: HouseholdData = {
  state: 'California',
  maritalStatus: MaritalStatus.SINGLE,
  annualIncome: 85000,
  monthlyExpenses: 4250,
  healthInsurance: {
    planType: 'PPO',
    monthlyPremium: 200,
    employerContribution: 400,
    hasHSA: false
  },
  contributions: {
    rothIraAnnual: 6500,
    k401Annual: 10000,
    hsaAnnual: 0
  },
  budget: [...CORE_BUDGET_CATEGORIES],
  incomeMembers: [INITIAL_MEMBER],
  children: [],
  assets: {
    savings: 15000,
    retirement401k: 30000,
    ira: 8000,
    realEstate: 0,
    investments: 10000,
    pension: 0,
  },
  debts: {
    mortgage: 0,
    studentLoans: 15000,
    creditCards: 1200,
    other: 0,
  },
};
