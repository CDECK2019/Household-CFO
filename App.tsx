
import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  TrendingUp, 
  ShieldCheck, 
  ChevronRight, 
  Plus, 
  Trash2,
  BrainCircuit,
  PieChart,
  HeartPulse,
  PiggyBank,
  Briefcase,
  Receipt,
  ArrowRightLeft,
  Coins,
  UserPlus,
  Info,
  CheckCircle2,
  MessageSquare,
  Send,
  Sparkles,
  RefreshCcw,
  FileUp,
  Loader2,
  Check,
  X,
  Zap,
  Target,
  ChevronDown
} from 'lucide-react';
import { HouseholdData, AnalysisResponse, MaritalStatus, Child, BudgetCategory, HouseholdMember, IncomeSource, Security, InvestmentAccount, DeepInsight } from './types';
import { INITIAL_HOUSEHOLD_DATA, US_STATES } from './constants';
import { analyzeHouseholdFinances, startAdvisorChat, categorizeExpenses, generateDeepInsights } from './services/geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'income' | 'cashflow' | 'analysis' | 'advisor' | 'portfolio'>(() => {
    const saved = localStorage.getItem('homeland_cfo_active_tab');
    if (saved) return saved as any;
    
    // Check if we have enough data to warrant showing the dashboard first
    const savedData = localStorage.getItem('homeland_cfo_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const hasIncome = parsed.incomeMembers?.some((m: any) => m.incomeSources?.some((s: any) => s.amount > 0));
        const hasExpenses = parsed.budget?.some((c: any) => c.amount > 0);
        if (hasIncome && hasExpenses) return 'dashboard';
      } catch (e) {
        console.error("Failed to parse saved data for tab initialization", e);
      }
    }
    
    return 'profile';
  });
  const [data, setData] = useState<HouseholdData>(() => {
    const saved = localStorage.getItem('homeland_cfo_data');
    return saved ? JSON.parse(saved) : INITIAL_HOUSEHOLD_DATA;
  });
  const [onboardingStep, setOnboardingStep] = useState<number>(() => {
    if (data.onboardingComplete) return -1;
    const saved = localStorage.getItem('homeland_cfo_onboarding_step');
    return saved ? parseInt(saved) : 0;
  });
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(() => {
    const saved = localStorage.getItem('homeland_cfo_analysis');
    return saved ? JSON.parse(saved) : null;
  });
  const [loadingDeepInsights, setLoadingDeepInsights] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResilienceInfo, setShowResilienceInfo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // CSV Import State
  const [importPreview, setImportPreview] = useState<BudgetCategory[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('homeland_cfo_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatSession = useRef<any>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem('homeland_cfo_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('homeland_cfo_onboarding_step', onboardingStep.toString());
  }, [onboardingStep]);

  useEffect(() => {
    if (analysis) {
      localStorage.setItem('homeland_cfo_analysis', JSON.stringify(analysis));
    }
  }, [analysis]);

  useEffect(() => {
    localStorage.setItem('homeland_cfo_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('homeland_cfo_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const totalExpenses = data.budget.reduce((sum, cat) => sum + cat.amount, 0);
    const totalIncome = data.incomeMembers.reduce((sum, member) => 
      sum + member.incomeSources.reduce((mSum, source) => mSum + source.amount, 0), 0
    );
    
    // Sync portfolio total to assets.investments if portfolio is not empty
    const portfolioTotal = data.portfolio.reduce((sum, acc) => sum + acc.securities.reduce((sSum, sec) => sSum + sec.value, 0), 0);
    
    setData(prev => {
      const updates: Partial<HouseholdData> = {
        monthlyExpenses: totalExpenses,
        annualIncome: totalIncome
      };
      
      if (portfolioTotal > 0 && prev.assets.investments !== portfolioTotal) {
        updates.assets = { ...prev.assets, investments: portfolioTotal };
      }
      
      return { ...prev, ...updates };
    });
  }, [data.budget, data.incomeMembers, data.portfolio]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Formatting helpers for monetary inputs
  const formatMoney = (val: number) => {
    return val === 0 ? "" : val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseMoney = (val: string) => {
    const clean = val.replace(/,/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeHouseholdFinances(data);
      setAnalysis(result);
      setActiveTab('analysis');
      // Reset chat session when new analysis is run to refresh context
      chatSession.current = null;
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetDeepInsights = async () => {
    if (!analysis) return;
    setLoadingDeepInsights(true);
    try {
      const insights = await generateDeepInsights(data, analysis);
      const updatedAnalysis = { ...analysis, deepInsights: insights };
      setAnalysis(updatedAnalysis);
      localStorage.setItem('homeland_cfo_analysis', JSON.stringify(updatedAnalysis));
    } catch (error) {
      console.error('Failed to get deep insights:', error);
    } finally {
      setLoadingDeepInsights(false);
    }
  };

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim() || chatLoading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setChatLoading(true);

    try {
      if (!chatSession.current) {
        chatSession.current = await startAdvisorChat(data, analysis);
      }
      
      const streamResponse = await chatSession.current.sendMessageStream({ message: text });
      
      // Add an empty model message that we'll update in real-time
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      let fullText = '';
      for await (const chunk of streamResponse) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0) {
              newMessages[newMessages.length - 1] = { role: 'model', text: fullText };
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Chat failed", error);
      setMessages(prev => [...prev, { role: 'model', text: "An error occurred while communicating with your AI advisor." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const suggestedTopics = [
    "Additional income strategies for my state",
    "Creative child-friendly investment strategies",
    "Optimize my tax efficiency this year",
    "Social programs I might qualify for",
    "How to hack my HSA further?"
  ];

  const updateAsset = (key: keyof typeof data.assets, value: number) => {
    setData(prev => ({ ...prev, assets: { ...prev.assets, [key]: value } }));
  };

  const updateDebt = (key: keyof typeof data.debts, value: number) => {
    setData(prev => ({ ...prev, debts: { ...prev.debts, [key]: value } }));
  };

  const addCustomAsset = () => {
    const newItem = { id: Math.random().toString(36).substr(2, 9), name: 'New Asset', amount: 0 };
    setData(prev => ({ ...prev, customAssets: [...prev.customAssets, newItem] }));
  };

  const updateCustomAsset = (id: string, updates: Partial<{ name: string, amount: number }>) => {
    setData(prev => ({
      ...prev,
      customAssets: prev.customAssets.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const removeCustomAsset = (id: string) => {
    setData(prev => ({ ...prev, customAssets: prev.customAssets.filter(item => item.id !== id) }));
  };

  const addCustomDebt = () => {
    const newItem = { id: Math.random().toString(36).substr(2, 9), name: 'New Liability', amount: 0 };
    setData(prev => ({ ...prev, customDebts: [...prev.customDebts, newItem] }));
  };

  const updateCustomDebt = (id: string, updates: Partial<{ name: string, amount: number }>) => {
    setData(prev => ({
      ...prev,
      customDebts: prev.customDebts.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const removeCustomDebt = (id: string) => {
    setData(prev => ({ ...prev, customDebts: prev.customDebts.filter(item => item.id !== id) }));
  };

  const addPortfolioAccount = () => {
    const newAccount: InvestmentAccount = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Account',
      type: 'Brokerage',
      securities: []
    };
    setData(prev => ({ ...prev, portfolio: [...prev.portfolio, newAccount] }));
  };

  const removePortfolioAccount = (id: string) => {
    setData(prev => ({ ...prev, portfolio: prev.portfolio.filter(acc => acc.id !== id) }));
  };

  const updatePortfolioAccount = (id: string, updates: Partial<InvestmentAccount>) => {
    setData(prev => ({
      ...prev,
      portfolio: prev.portfolio.map(acc => acc.id === id ? { ...acc, ...updates } : acc)
    }));
  };

  const addSecurity = (accountId: string) => {
    const newSecurity: Security = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: '',
      name: '',
      shares: 0,
      price: 0,
      value: 0,
      type: 'Stock'
    };
    setData(prev => ({
      ...prev,
      portfolio: prev.portfolio.map(acc => acc.id === accountId ? { ...acc, securities: [...acc.securities, newSecurity] } : acc)
    }));
  };

  const updateSecurity = (accountId: string, securityId: string, updates: Partial<Security>) => {
    setData(prev => ({
      ...prev,
      portfolio: prev.portfolio.map(acc => {
        if (acc.id === accountId) {
          return {
            ...acc,
            securities: acc.securities.map(sec => {
              if (sec.id === securityId) {
                const updated = { ...sec, ...updates };
                
                // Auto-detect Crypto type based on symbol or name if type isn't explicitly changed
                const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'DOGE', 'XRP', 'LINK', 'MATIC', 'UNI', 'LTC', 'BCH', 'USDC', 'USDT'];
                const symbolUpper = (updated.symbol || '').toUpperCase();
                const nameLower = (updated.name || '').toLowerCase();
                
                if (!updates.type && (cryptoSymbols.includes(symbolUpper) || nameLower.includes('bitcoin') || nameLower.includes('ethereum') || nameLower.includes('crypto'))) {
                  updated.type = 'Crypto';
                }

                if ('shares' in updates || 'price' in updates) {
                  updated.value = (updated.shares || 0) * (updated.price || 0);
                }
                return updated;
              }
              return sec;
            })
          };
        }
        return acc;
      })
    }));
  };

  const removeSecurity = (accountId: string, securityId: string) => {
    setData(prev => ({
      ...prev,
      portfolio: prev.portfolio.map(acc => acc.id === accountId ? { ...acc, securities: acc.securities.filter(sec => sec.id !== securityId) } : acc)
    }));
  };

  const updateBudgetCategory = (id: string, updates: Partial<BudgetCategory>) => {
    setData(prev => ({
      ...prev,
      budget: prev.budget.map(cat => cat.id === id ? { ...cat, ...updates } : cat)
    }));
  };

  const addBudgetCategory = () => {
    const newCat: BudgetCategory = { id: Math.random().toString(36).substr(2, 9), name: 'New Category', amount: 0, isCustom: true };
    setData(prev => ({ ...prev, budget: [...prev.budget, newCat] }));
  };

  const removeBudgetCategory = (id: string) => {
    setData(prev => ({
      ...prev,
      budget: prev.budget.filter(cat => cat.id !== id)
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Extract description and amount from CSV
          const rawData = results.data as any[];
          const expensesToCategorize = rawData.map(row => {
            // Find a column that looks like an amount
            const amountKey = Object.keys(row).find(key => 
              key.toLowerCase().includes('amount') || 
              key.toLowerCase().includes('price') || 
              key.toLowerCase().includes('cost') ||
              key.toLowerCase().includes('debit')
            );
            
            // Find a column that looks like a description
            const descKey = Object.keys(row).find(key => 
              key.toLowerCase().includes('description') || 
              key.toLowerCase().includes('memo') || 
              key.toLowerCase().includes('name') ||
              key.toLowerCase().includes('payee') ||
              key.toLowerCase().includes('category')
            ) || Object.keys(row)[0];

            const amount = Math.abs(parseFloat(String(row[amountKey || '']).replace(/[^0-9.-]+/g, ""))) || 0;
            const description = String(row[descKey] || 'Unknown Expense');

            return { description, amount };
          }).filter(e => e.amount > 0);

          if (expensesToCategorize.length === 0) {
            alert("No valid expenses found in CSV. Please ensure there are 'Description' and 'Amount' columns.");
            setIsImporting(false);
            return;
          }

          const currentCategoryNames = data.budget.map(c => c.name);
          const categorized = await categorizeExpenses(expensesToCategorize, currentCategoryNames);
          
          const previewWithIds = categorized.map(cat => ({
            ...cat,
            id: crypto.randomUUID(),
            isCustom: true,
            icon: 'Receipt'
          }));

          setImportPreview(previewWithIds);
        } catch (error) {
          console.error("Import failed:", error);
          alert("Failed to process CSV. Please try again.");
        } finally {
          setIsImporting(false);
        }
      }
    });
  };

  const applyImport = () => {
    if (!importPreview) return;
    
    setData({
      ...data,
      budget: [...data.budget, ...importPreview]
    });
    setImportPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addIncomeMember = () => {
    const newMember: HouseholdMember = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Person ${data.incomeMembers.length + 1}`,
      incomeSources: [
        { id: Math.random().toString(36).substr(2, 9), name: 'W2 Income', amount: 0, type: 'W2' }
      ]
    };
    setData(prev => ({ ...prev, incomeMembers: [...prev.incomeMembers, newMember] }));
  };

  const removeIncomeMember = (id: string) => {
    setData(prev => ({ ...prev, incomeMembers: prev.incomeMembers.filter(m => m.id !== id) }));
  };

  const updateMemberName = (id: string, name: string) => {
    setData(prev => ({
      ...prev,
      incomeMembers: prev.incomeMembers.map(m => m.id === id ? { ...m, name } : m)
    }));
  };

  const addIncomeSource = (memberId: string) => {
    const newSource: IncomeSource = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Income Source',
      amount: 0,
      type: 'Other'
    };
    setData(prev => ({
      ...prev,
      incomeMembers: prev.incomeMembers.map(m => m.id === memberId ? { ...m, incomeSources: [...m.incomeSources, newSource] } : m)
    }));
  };

  const updateIncomeSource = (memberId: string, sourceId: string, updates: Partial<IncomeSource>) => {
    setData(prev => ({
      ...prev,
      incomeMembers: prev.incomeMembers.map(m => m.id === memberId ? {
        ...m,
        incomeSources: m.incomeSources.map(s => s.id === sourceId ? { ...s, ...updates } : s)
      } : m)
    }));
  };

  const removeIncomeSource = (memberId: string, sourceId: string) => {
    setData(prev => ({
      ...prev,
      incomeMembers: prev.incomeMembers.map(m => m.id === memberId ? {
        ...m,
        incomeSources: m.incomeSources.filter(s => s.id !== sourceId)
      } : m)
    }));
  };

  const handleNumChildrenChange = (num: number) => {
    const currentNum = data.children.length;
    if (num > currentNum) {
      const additional = Array.from({ length: num - currentNum }).map(() => ({
        id: Math.random().toString(36).substr(2, 9),
        age: 0,
        isDependent: true,
        isEmployed: false,
        fullCustody: false
      }));
      setData(prev => ({ ...prev, children: [...prev.children, ...additional] }));
    } else if (num < currentNum) {
      setData(prev => ({ ...prev, children: prev.children.slice(0, num) }));
    }
  };

  const assetData = [
    { name: 'Savings', value: data.assets.savings },
    { name: '401k', value: data.assets.retirement401k },
    { name: 'IRA', value: data.assets.ira },
    { name: 'Real Estate', value: data.assets.realEstate },
    { name: 'Investments', value: data.assets.investments },
    { name: 'Pension', value: data.assets.pension },
    { name: 'Vehicle', value: data.assets.vehicleEquity },
    ...data.customAssets.map(a => ({ name: a.name, value: a.amount }))
  ].filter(a => a.value > 0);

  // Expert Metrics
  const totalAssets = assetData.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = (Object.values(data.debts) as number[]).reduce((a, b) => a + b, 0) + data.customDebts.reduce((a, b) => a + b.amount, 0);
  const savingsRate = data.annualIncome > 0 ? ((data.contributions.rothIraAnnual + data.contributions.k401Annual + data.contributions.hsaAnnual) / data.annualIncome) * 100 : 0;
  const emergencyFundMonths = data.monthlyExpenses > 0 ? (data.assets.savings + data.assets.investments) / data.monthlyExpenses : 0;
  const monthlySurplus = (data.annualIncome / 12) - data.monthlyExpenses;

  // Portfolio Diversification Data
  const diversificationMap: Record<string, number> = {};
  data.portfolio.forEach(acc => {
    acc.securities.forEach(sec => {
      let type = sec.type;
      
      // Smart override: if it looks like crypto but is labeled as something else, count it as crypto
      const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'DOGE', 'XRP', 'LINK', 'MATIC', 'UNI', 'LTC', 'BCH', 'USDC', 'USDT'];
      const symbolUpper = (sec.symbol || '').toUpperCase();
      const nameLower = (sec.name || '').toLowerCase();
      
      if (cryptoSymbols.includes(symbolUpper) || nameLower.includes('bitcoin') || nameLower.includes('ethereum') || nameLower.includes('crypto') || nameLower.includes('solana')) {
        type = 'Crypto';
      }
      
      diversificationMap[type] = (diversificationMap[type] || 0) + sec.value;
    });
  });

  // Also scan custom assets for diversification to catch things like "Bitcoin" added as a custom asset
  data.customAssets.forEach(asset => {
    const nameLower = asset.name.toLowerCase();
    if (nameLower.includes('bitcoin') || nameLower.includes('btc') || nameLower.includes('crypto') || nameLower.includes('eth') || nameLower.includes('ethereum') || nameLower.includes('solana') || nameLower.includes('doge')) {
      diversificationMap['Crypto'] = (diversificationMap['Crypto'] || 0) + asset.amount;
    } else if (nameLower.includes('stock') || nameLower.includes('equity') || nameLower.includes('share')) {
      diversificationMap['Stock'] = (diversificationMap['Stock'] || 0) + asset.amount;
    } else if (nameLower.includes('bond') || nameLower.includes('treasury')) {
      diversificationMap['Bond'] = (diversificationMap['Bond'] || 0) + asset.amount;
    } else if (nameLower.includes('cash') || nameLower.includes('savings') || nameLower.includes('checking')) {
      diversificationMap['Cash'] = (diversificationMap['Cash'] || 0) + asset.amount;
    } else if (nameLower.includes('etf') || nameLower.includes('fund')) {
      diversificationMap['ETF'] = (diversificationMap['ETF'] || 0) + asset.amount;
    } else {
      diversificationMap['Other'] = (diversificationMap['Other'] || 0) + asset.amount;
    }
  });

  const diversificationData = Object.entries(diversificationMap)
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const assetVsLiabilityData = [
    { name: 'Assets', value: totalAssets },
    { name: 'Liabilities', value: totalLiabilities }
  ];

  const calculateLocalResilience = () => {
    const emergencyScore = Math.min(100, (emergencyFundMonths / 6) * 100);
    
    const dti = data.annualIncome > 0 ? totalLiabilities / data.annualIncome : 1;
    const debtScore = Math.max(0, 100 - (dti * 100));
    
    const savingsScore = Math.min(100, (savingsRate / 20) * 100);
    
    const assetTypes = assetData.filter(a => a.value > 0).length;
    const diversificationScore = Math.min(100, (assetTypes / 5) * 100);
    
    const totalScore = Math.round(
      (emergencyScore * 0.3) + 
      (debtScore * 0.3) + 
      (savingsScore * 0.25) + 
      (diversificationScore * 0.15)
    );
    
    let grade = 'F';
    if (totalScore >= 95) grade = 'A+';
    else if (totalScore >= 90) grade = 'A';
    else if (totalScore >= 80) grade = 'B';
    else if (totalScore >= 70) grade = 'C';
    else if (totalScore >= 60) grade = 'D';
    
    return { score: totalScore, grade };
  };

  const localResilience = calculateLocalResilience();

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#f43f5e', '#06b6d4', '#84cc16', '#f97316'];
  const DIVERSIFICATION_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#f43f5e'];

  const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all text-slate-900 shadow-sm";
  const labelClass = "block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis";
  const cardClass = "throb-container p-8 rounded-[40px] relative z-10 overflow-hidden";
  const textHeading = "text-slate-900";
  const textBody = "text-slate-500";

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-emerald-600 bg-emerald-50 border border-emerald-100';
    if (grade.startsWith('B')) return 'text-emerald-500 bg-emerald-50 border border-emerald-100';
    if (grade.startsWith('C')) return 'text-amber-500 bg-amber-50 border border-amber-100';
    return 'text-red-500 bg-red-50 border border-red-100';
  };

  const completeOnboarding = () => {
    setData(prev => ({ ...prev, onboardingComplete: true }));
    setOnboardingStep(-1);
    setActiveTab('dashboard');
  };

  const nextOnboardingStep = () => {
    if (onboardingStep < 9) {
      setOnboardingStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevOnboardingStep = () => {
    if (onboardingStep > 0) {
      setOnboardingStep(prev => prev - 1);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8faf9] text-slate-900 font-sans relative z-10 overflow-x-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-emerald-950 flex items-center justify-between px-6 z-[60] shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-1.5 rounded-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Homeland<span className="text-emerald-400">CFO</span></h1>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-emerald-100 hover:text-white transition-colors"
          >
            {sidebarOpen ? <RefreshCcw className="w-6 h-6 rotate-45" /> : <LayoutDashboard className="w-6 h-6" />}
          </button>
        </div>
      )}

      {/* Sidebar */}
      {data.onboardingComplete && (
        <aside className={`
          ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
          w-64 bg-emerald-950 text-white flex-shrink-0 flex flex-col fixed h-full z-[70] transition-transform duration-300 ease-in-out
        `}>
          <div className="p-8 flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Homeland<span className="text-emerald-400">CFO</span></h1>
          </div>

          <nav className="mt-4 flex-1 px-4 space-y-1">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', glow: true },
              { id: 'advisor', icon: MessageSquare, label: 'AI Advisor' },
              { id: 'analysis', icon: BrainCircuit, label: 'CFO Insights', disabled: !analysis },
              { id: 'portfolio', icon: TrendingUp, label: 'Portfolio' },
              { id: 'income', icon: Coins, label: 'Income' },
              { id: 'cashflow', icon: Receipt, label: 'Expenses' },
              { id: 'profile', icon: Users, label: 'Profile & Intake' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if ('disabled' in item && item.disabled) return;
                  setActiveTab(item.id as any);
                  if (isMobile) setSidebarOpen(false);
                }}
                disabled={'disabled' in item && item.disabled}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition relative overflow-hidden ${
                  activeTab === item.id 
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' 
                    : 'text-slate-400 hover:bg-white/5'
                } ${'disabled' in item && item.disabled ? 'opacity-30 cursor-not-allowed' : ''} ${'glow' in item && item.glow ? 'glow-dashboard' : ''}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold text-sm">{item.label}</span>
                {'glow' in item && item.glow && (
                  <div className="absolute inset-0 bg-emerald-400/5 animate-pulse pointer-events-none" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-5 bg-emerald-900/40 m-4 rounded-2xl border border-white/5">
            <div className="text-[10px] text-emerald-500/80 uppercase font-bold mb-2">Household Resilience</div>
            <div className="h-1.5 bg-emerald-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-1000" 
                style={{ width: `${analysis ? analysis.resilienceScore : localResilience.score}%` }}
              ></div>
            </div>
            <p className="text-[10px] mt-2 text-emerald-100/60 font-medium">
              Score: {analysis ? analysis.resilienceScore : localResilience.score}/100
            </p>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`
        ${isMobile ? 'ml-0 pt-20' : (data.onboardingComplete ? 'ml-64' : 'ml-0')}
        flex-1 overflow-y-auto p-6 md:p-10 lg:p-14 relative flex flex-col min-h-screen transition-all duration-300
      `}>
        {!data.onboardingComplete ? (
          <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center py-12">
            <div className="mb-12 text-center">
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Homeland<span className="text-emerald-500">CFO</span></h1>
              </div>
              
              <div className="w-full max-w-md mx-auto h-2 bg-slate-100 rounded-full mb-8 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                  style={{ width: `${((onboardingStep + 1) / 10) * 100}%` }}
                />
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-emerald-100">
                <Sparkles className="w-3.5 h-3.5" /> Step {onboardingStep + 1} of 10
              </div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4">
                {onboardingStep === 0 ? 'Welcome to Homeland CFO' :
                 onboardingStep === 1 ? 'Demographics & Location' :
                 onboardingStep === 2 ? 'Housing Characteristics' :
                 onboardingStep === 3 ? 'Health Insurance' :
                 onboardingStep === 4 ? 'Retirement Contributions' :
                 onboardingStep === 5 ? 'Household Income' :
                 onboardingStep === 6 ? 'Monthly Expenses' :
                 onboardingStep === 7 ? 'Current Assets' :
                 onboardingStep === 8 ? 'Current Liabilities' :
                 'Investment Portfolio'}
              </h2>
              <p className="text-slate-500 font-medium text-xl max-w-2xl mx-auto">
                {onboardingStep === 0 ? "Bringing the tools of the most financially sophisticated to everyone." :
                 onboardingStep === 1 ? "Let's start with the basics of your household." :
                 onboardingStep === 2 ? 'Tell us about your physical living environment.' :
                 onboardingStep === 3 ? 'Your health strategy is a key part of your financial CFO plan.' :
                 onboardingStep === 4 ? 'How are you currently preparing for the long-term?' :
                 onboardingStep === 5 ? 'Track every income stream across all household members.' :
                 onboardingStep === 6 ? 'What does your typical monthly burn look like?' :
                 onboardingStep === 7 ? 'What do you currently own?' :
                 onboardingStep === 8 ? 'What are your current financial obligations?' :
                 'Granular security-level tracking of your investments.'}
              </p>
            </div>

            <div className="animate-in fade-in zoom-in-95 duration-700">
              {onboardingStep === 0 && (
                <section className={`${cardClass} shadow-[0_30px_100px_-20px_rgba(16,185,129,0.15)] border border-emerald-50 bg-white p-10 md:p-16`}>
                  <div className="max-w-3xl mx-auto text-center">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <BrainCircuit className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tighter mb-2">CFO Intelligence</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Advanced analytics and strategy usually reserved for high-net-worth individuals.</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <ShieldCheck className="w-6 h-6 text-blue-600" />
                        </div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tighter mb-2">Resilience Scoring</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Stress-test your household against economic shocks with our proprietary grading system.</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Target className="w-6 h-6 text-amber-600" />
                        </div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tighter mb-2">Tactical Advice</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Personalized recommendations for tax optimization, benefits, and wealth building.</p>
                      </div>
                    </div>
                    
                    <div className="bg-emerald-50/50 p-8 rounded-[32px] border border-emerald-100 text-left mb-8">
                      <h4 className="text-emerald-900 font-black uppercase tracking-widest text-xs mb-4">The Onboarding Process</h4>
                      <ul className="space-y-4">
                        <li className="flex items-start gap-4">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">Profile Capture</p>
                            <p className="text-xs text-slate-500 font-medium">We'll ask about your demographics, housing, and health insurance to build your baseline.</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-4">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">Financial Mapping</p>
                            <p className="text-xs text-slate-500 font-medium">Input your income streams, expenses, assets, and liabilities for a full balance sheet view.</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-4">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">CFO Activation</p>
                            <p className="text-xs text-slate-500 font-medium">Once complete, our AI CFO analyzes your data to generate your first strategic action plan.</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                    
                    <p className="text-slate-400 text-xs font-medium italic">
                      Your data is stored locally in your browser. We never sell your personal financial information.
                    </p>
                  </div>
                </section>
              )}

              {onboardingStep === 1 && (
                <section className={`${cardClass} shadow-[0_30px_100px_-20px_rgba(16,185,129,0.15)] border border-emerald-50 bg-white`}>
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div>
                        <label className={labelClass}>Residency (State)</label>
                        <select 
                          value={data.state}
                          onChange={(e) => setData({...data, state: e.target.value})}
                          className={inputClass}
                        >
                          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Zip Code</label>
                        <input 
                          type="text"
                          placeholder="90210"
                          value={data.zipCode}
                          onChange={(e) => setData({...data, zipCode: e.target.value})}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Tax Filing Status</label>
                        <select 
                          value={data.maritalStatus}
                          onChange={(e) => setData({...data, maritalStatus: e.target.value as any})}
                          className={inputClass}
                        >
                          {Object.values(MaritalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className={labelClass}>Age</label>
                        <input 
                          type="number"
                          value={data.age}
                          onChange={(e) => setData({...data, age: Number(e.target.value)})}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Adults</label>
                        <input 
                          type="number"
                          min="1"
                          value={data.numAdults}
                          onChange={(e) => setData({...data, numAdults: Number(e.target.value)})}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Children</label>
                        <input 
                          type="number"
                          min="0"
                          value={data.children.length}
                          onChange={(e) => handleNumChildrenChange(Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {onboardingStep === 2 && (
                <section className={`${cardClass} shadow-[0_30px_100px_-20px_rgba(16,185,129,0.15)] border border-emerald-50 bg-white`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <label className={labelClass}>Ownership</label>
                      <select 
                        value={data.houseCharacteristics.ownership}
                        onChange={(e) => setData({...data, houseCharacteristics: { ...data.houseCharacteristics, ownership: e.target.value as any }})}
                        className={inputClass}
                      >
                        <option value="Rent">Rent</option>
                        <option value="Own">Own</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Square Footage</label>
                      <input 
                        type="number"
                        value={data.houseCharacteristics.squareFootage}
                        onChange={(e) => setData({...data, houseCharacteristics: { ...data.houseCharacteristics, squareFootage: Number(e.target.value) }})}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Heating Source</label>
                      <select 
                        value={data.houseCharacteristics.primaryHeatingSource}
                        onChange={(e) => setData({...data, houseCharacteristics: { ...data.houseCharacteristics, primaryHeatingSource: e.target.value as any }})}
                        className={inputClass}
                      >
                        <option value="Gas">Gas</option>
                        <option value="Electric">Electric</option>
                        <option value="Oil">Oil</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox"
                          checked={data.houseCharacteristics.isInsulated}
                          onChange={(e) => setData({...data, houseCharacteristics: { ...data.houseCharacteristics, isInsulated: e.target.checked }})}
                          id="is-insulated"
                          className="w-6 h-6 appearance-none bg-white border border-slate-300 rounded-md checked:bg-emerald-600 checked:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm"
                        />
                        {data.houseCharacteristics.isInsulated && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <label htmlFor="is-insulated" className="text-sm font-bold text-slate-600 cursor-pointer select-none">Is the house well-insulated?</label>
                    </div>
                    <div className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox"
                          checked={data.houseCharacteristics.hasGasAppliances}
                          onChange={(e) => setData({...data, houseCharacteristics: { ...data.houseCharacteristics, hasGasAppliances: e.target.checked }})}
                          id="has-gas-appliances"
                          className="w-6 h-6 appearance-none bg-white border border-slate-300 rounded-md checked:bg-emerald-600 checked:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm"
                        />
                        {data.houseCharacteristics.hasGasAppliances && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <label htmlFor="has-gas-appliances" className="text-sm font-bold text-slate-600 cursor-pointer select-none">Does the house use gas appliances?</label>
                    </div>
                  </div>
                </section>
              )}

              {onboardingStep === 3 && (
                <section className={`${cardClass} shadow-[0_30px_100px_-20px_rgba(16,185,129,0.15)] border border-emerald-50 bg-white`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <label className={labelClass}>Plan Type</label>
                      <select 
                        value={data.healthInsurance.planType}
                        onChange={(e) => setData({...data, healthInsurance: { ...data.healthInsurance, planType: e.target.value as any, hasHSA: e.target.value === 'HDHP' }})}
                        className={inputClass}
                      >
                        <option value="PPO">PPO (Standard)</option>
                        <option value="HDHP">HDHP (HSA-Eligible)</option>
                        <option value="HMO">HMO</option>
                        <option value="None">No Plan</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Monthly Premium</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">$</span>
                        <input 
                          type="text"
                          value={formatMoney(data.healthInsurance.monthlyPremium)}
                          onChange={(e) => setData({...data, healthInsurance: { ...data.healthInsurance, monthlyPremium: parseMoney(e.target.value) }})}
                          className={`${inputClass} pl-8`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Employer Contribution</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">$</span>
                        <input 
                          type="text"
                          value={formatMoney(data.healthInsurance.employerContribution)}
                          onChange={(e) => setData({...data, healthInsurance: { ...data.healthInsurance, employerContribution: parseMoney(e.target.value) }})}
                          className={`${inputClass} pl-8`}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {onboardingStep === 4 && (
                <section className={`${cardClass} shadow-[0_30px_100px_-20px_rgba(16,185,129,0.15)] border border-emerald-50 bg-white`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <label className={labelClass}>401(k) / 403(b) Annual</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">$</span>
                        <input 
                          type="text"
                          value={formatMoney(data.contributions.k401Annual)}
                          onChange={(e) => setData({...data, contributions: { ...data.contributions, k401Annual: parseMoney(e.target.value) }})}
                          className={`${inputClass} pl-8`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Roth IRA Annual</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">$</span>
                        <input 
                          type="text"
                          value={formatMoney(data.contributions.rothIraAnnual)}
                          onChange={(e) => setData({...data, contributions: { ...data.contributions, rothIraAnnual: parseMoney(e.target.value) }})}
                          className={`${inputClass} pl-8`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>HSA Annual Contribution</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">$</span>
                        <input 
                          type="text"
                          disabled={!data.healthInsurance.hasHSA}
                          value={formatMoney(data.contributions.hsaAnnual)}
                          onChange={(e) => setData({...data, contributions: { ...data.contributions, hsaAnnual: parseMoney(e.target.value) }})}
                          className={`${inputClass} pl-8 ${!data.healthInsurance.hasHSA ? 'opacity-30 cursor-not-allowed bg-slate-50' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {onboardingStep === 5 && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
                  {data.incomeMembers.map((member) => (
                    <div key={member.id} className={`${cardClass} bg-white shadow-[0_30px_100px_-20px_rgba(16,185,129,0.15)] border border-emerald-50`}>
                      <div className="flex justify-between items-center mb-6">
                        <input 
                          type="text"
                          value={member.name}
                          onChange={(e) => updateMemberName(member.id, e.target.value)}
                          className="bg-transparent border-b-2 border-emerald-500/30 focus:border-emerald-500 text-xl font-black text-slate-800 outline-none px-1"
                        />
                        <button onClick={() => removeIncomeMember(member.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        {member.incomeSources.map((source) => (
                          <div key={source.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="md:col-span-4">
                              <input 
                                type="text"
                                value={source.name}
                                onChange={(e) => updateIncomeSource(member.id, source.id, { name: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <select 
                                value={source.type}
                                onChange={(e) => updateIncomeSource(member.id, source.id, { type: e.target.value as any })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                              >
                                <option value="W2">W2 Income</option>
                                <option value="Investment">Investment</option>
                                <option value="Interest">Interest</option>
                                <option value="Capital Gains">Capital Gains</option>
                                <option value="Side-Hustle">Side-Hustle</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div className="md:col-span-4 relative">
                              <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                              <input 
                                type="text"
                                value={formatMoney(source.amount)}
                                onChange={(e) => updateIncomeSource(member.id, source.id, { amount: parseMoney(e.target.value) })}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                            <div className="md:col-span-1 text-center">
                              <button onClick={() => removeIncomeSource(member.id, source.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addIncomeSource(member.id)} className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors ml-2 uppercase tracking-widest">
                        <Plus className="w-4 h-4" /> Add Source
                      </button>
                    </div>
                  ))}
                  <button onClick={addIncomeMember} className="w-full py-6 border-2 border-dashed border-emerald-100 rounded-[32px] text-emerald-600/50 font-bold text-sm hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                    <UserPlus className="w-5 h-5" /> Add Member
                  </button>
                </div>
              )}

              {onboardingStep === 6 && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
                  <section className={`${cardClass} bg-white shadow-[0_30px_100px_-20px_rgba(16,185,129,0.15)] border border-emerald-50`}>
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-4">
                        <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-slate-200 transition-all">
                          {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                          Import CSV
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Burn</div>
                        <div className="text-2xl font-black text-emerald-600 tracking-tight">${formatCurrency(data.monthlyExpenses)}</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {data.budget.map((category) => (
                        <div key={category.id} className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex-1">
                            {category.isCustom ? (
                              <input 
                                type="text"
                                value={category.name}
                                onChange={(e) => updateBudgetCategory(category.id, { name: e.target.value })}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 w-full max-w-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            ) : (
                              <div className="text-sm font-black text-slate-700 uppercase tracking-tighter">{category.name}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="relative max-w-[150px]">
                              <span className="absolute left-4 top-2 text-slate-400 text-sm font-bold">$</span>
                              <input 
                                type="text"
                                value={formatMoney(category.amount)}
                                onChange={(e) => updateBudgetCategory(category.id, { amount: parseMoney(e.target.value) })}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                            {category.isCustom && (
                              <button onClick={() => removeBudgetCategory(category.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={addBudgetCategory} className="w-full mt-6 py-4 border-2 border-dashed border-emerald-100 rounded-2xl text-emerald-600/50 font-bold text-xs hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                      <Plus className="w-4 h-4" /> Add Custom Expense
                    </button>
                  </section>
                </div>
              )}

              {onboardingStep === 7 && (
                <section className={`${cardClass} bg-white shadow-[0_30px_100px_-20px_rgba(16,185,129,0.15)] border border-emerald-50`}>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-bold text-slate-800">Assets</h3>
                    <button onClick={addCustomAsset} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 uppercase tracking-widest">
                      <Plus className="w-3 h-3" /> Add Asset
                    </button>
                  </div>
                  <div className="space-y-4">
                    {Object.keys(data.assets).map((key) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">
                          {key === 'retirement401k' ? '401k' : key.replace(/([A-Z])/g, ' $1')}
                        </label>
                        <div className="relative w-56">
                          <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                          <input 
                            type="text"
                            value={formatMoney(data.assets[key as keyof typeof data.assets])}
                            onChange={(e) => updateAsset(key as any, parseMoney(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    ))}
                    {data.customAssets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between gap-4 group">
                        <input 
                          type="text"
                          value={asset.name}
                          onChange={(e) => updateCustomAsset(asset.id, { name: e.target.value })}
                          className="bg-transparent border-b border-slate-200 focus:border-emerald-500 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none py-1 flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <div className="relative w-56">
                            <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                            <input 
                              type="text"
                              value={formatMoney(asset.amount)}
                              onChange={(e) => updateCustomAsset(asset.id, { amount: parseMoney(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                            />
                          </div>
                          <button onClick={() => removeCustomAsset(asset.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {onboardingStep === 8 && (
                <section className={`${cardClass} bg-white shadow-[0_30px_100px_-20px_rgba(16,185,129,0.15)] border border-emerald-50`}>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-bold text-slate-800">Liabilities</h3>
                    <button onClick={addCustomDebt} className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 uppercase tracking-widest">
                      <Plus className="w-3 h-3" /> Add Liability
                    </button>
                  </div>
                  <div className="space-y-4">
                    {Object.keys(data.debts).map((key) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">{key.replace(/([A-Z])/g, ' $1')}</label>
                        <div className="relative w-56">
                          <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                          <input 
                            type="text"
                            value={formatMoney(data.debts[key as keyof typeof data.debts])}
                            onChange={(e) => updateDebt(key as any, parseMoney(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    ))}
                    {data.customDebts.map((debt) => (
                      <div key={debt.id} className="flex items-center justify-between gap-4 group">
                        <input 
                          type="text"
                          value={debt.name}
                          onChange={(e) => updateCustomDebt(debt.id, { name: e.target.value })}
                          className="bg-transparent border-b border-slate-200 focus:border-emerald-500 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none py-1 flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <div className="relative w-56">
                            <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                            <input 
                              type="text"
                              value={formatMoney(debt.amount)}
                              onChange={(e) => updateCustomDebt(debt.id, { amount: parseMoney(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                            />
                          </div>
                          <button onClick={() => removeCustomDebt(debt.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {onboardingStep === 9 && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
                  {data.portfolio.map((account) => (
                    <div key={account.id} className={`${cardClass} bg-white shadow-[0_30px_100px_-20px_rgba(16,185,129,0.15)] border border-emerald-50`}>
                      <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-6 flex-1">
                          <input 
                            type="text"
                            value={account.name}
                            onChange={(e) => updatePortfolioAccount(account.id, { name: e.target.value })}
                            className="bg-transparent border-b-2 border-emerald-500/30 focus:border-emerald-500 text-xl font-black text-slate-800 outline-none px-1"
                          />
                          <select 
                            value={account.type}
                            onChange={(e) => updatePortfolioAccount(account.id, { type: e.target.value as any })}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            <option value="401k">401(k)</option>
                            <option value="Roth IRA">Roth IRA</option>
                            <option value="Traditional IRA">Traditional IRA</option>
                            <option value="Brokerage">Brokerage</option>
                            <option value="HSA">HSA</option>
                            <option value="529">529 Plan</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <button onClick={() => removePortfolioAccount(account.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        {account.securities.map((security) => (
                          <div key={security.id} className="grid grid-cols-12 gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="col-span-3">
                              <input 
                                type="text"
                                placeholder="Symbol"
                                value={security.symbol}
                                onChange={(e) => updateSecurity(account.id, security.id, { symbol: e.target.value.toUpperCase() })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                            <div className="col-span-5">
                              <input 
                                type="text"
                                placeholder="Security Name"
                                value={security.name}
                                onChange={(e) => updateSecurity(account.id, security.id, { name: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                            <div className="col-span-3 relative">
                              <span className="absolute left-2 top-2 text-slate-400 text-[10px] font-bold">$</span>
                              <input 
                                type="text"
                                value={formatMoney(security.value)}
                                onChange={(e) => updateSecurity(account.id, security.id, { value: parseMoney(e.target.value) })}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-5 pr-2 py-2 text-xs font-bold text-slate-800 text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                            <div className="col-span-1 text-center">
                              <button onClick={() => removeSecurity(account.id, security.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addSecurity(account.id)} className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors ml-2 uppercase tracking-widest">
                        <Plus className="w-4 h-4" /> Add Security
                      </button>
                    </div>
                  ))}
                  <button onClick={addPortfolioAccount} className="w-full py-6 border-2 border-dashed border-emerald-100 rounded-[32px] text-emerald-600/50 font-bold text-sm hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                    <Plus className="w-5 h-5" /> Add Investment Account
                  </button>
                </div>
              )}
            </div>

            <div className="mt-12 flex justify-between items-center">
              <button 
                onClick={prevOnboardingStep}
                disabled={onboardingStep === 0}
                className="px-8 py-4 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-colors disabled:opacity-0"
              >
                Back
              </button>
              <button 
                onClick={nextOnboardingStep}
                className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                {onboardingStep === 0 ? 'Get Started' : onboardingStep === 9 ? 'Complete Setup' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <header className="mb-8 md:mb-12 max-w-5xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 flex-shrink-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'profile' ? 'Household profile' : 
               activeTab === 'income' ? 'Granular Income' :
               activeTab === 'cashflow' ? 'Monthly Expenses' :
               activeTab === 'dashboard' ? 'Financial Position' : 
               activeTab === 'advisor' ? 'CFO Conversational Advisor' : 'Strategic Action Plan'}
            </h2>
            <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">
              {activeTab === 'profile' ? "Tell me about your household and i'll help you save money!" : 
               activeTab === 'income' ? 'Track every income stream across all household members.' :
               activeTab === 'cashflow' ? 'Manage your monthly budget with granular precision.' :
               activeTab === 'portfolio' ? 'Granular security-level tracking of your investments.' :
               activeTab === 'advisor' ? 'Interact directly with your strategic household CFO.' :
               'Real-time overview of your wealth and liabilities.'}
            </p>
          </div>
          
          {(activeTab === 'profile' || activeTab === 'cashflow' || activeTab === 'income' || activeTab === 'portfolio') && (
            <button 
              onClick={handleRunAnalysis}
              disabled={loading}
              className="w-full md:w-auto group relative flex items-center justify-center md:justify-start gap-4 pl-3 pr-9 py-2 rounded-full border-2 border-emerald-500/80 bg-white/75 backdrop-blur-3xl shadow-[0_15px_35px_-10px_rgba(16,185,129,0.2)] hover:bg-white/95 hover:border-emerald-600 transition-all duration-500 disabled:opacity-50 active:scale-95"
            >
              <div className="relative flex items-center justify-center">
                {loading ? (
                  <div className="w-10 h-10 flex items-center justify-center bg-emerald-600 rounded-full shadow-lg">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-600/10 rounded-full border border-emerald-500/20 group-hover:bg-emerald-600 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-500">
                    <BrainCircuit className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors duration-500" />
                  </div>
                )}
              </div>
              <span className="relative text-[15px] font-black text-emerald-900 uppercase tracking-tight">
                {loading ? 'Creating Strategy...' : 'Generate CFO Strategy'}
              </span>
            </button>
          )}
        </header>

        {activeTab === 'profile' && (
          <div className="max-w-5xl space-y-6 md:space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
              <section className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                <div className="flex justify-between items-center mb-6 md:mb-8">
                  <h3 className={`text-sm md:text-base font-bold flex items-center gap-3 ${textHeading}`}>
                    <div className="p-2 bg-emerald-50 rounded-lg"><Users className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" /></div>
                    Demographics & Location
                  </h3>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="text-[9px] md:text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest flex items-center gap-2 transition-colors"
                  >
                    <RefreshCcw className="w-3 h-3" /> Reset
                  </button>
                </div>
                
                <div className="space-y-6 md:space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                    <div>
                      <label className={labelClass}>Residency (State)</label>
                      <select 
                        value={data.state}
                        onChange={(e) => setData({...data, state: e.target.value})}
                        className={inputClass}
                      >
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Zip Code</label>
                      <input 
                        type="text"
                        placeholder="90210"
                        value={data.zipCode}
                        onChange={(e) => setData({...data, zipCode: e.target.value})}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Tax Filing Status</label>
                      <select 
                        value={data.maritalStatus}
                        onChange={(e) => setData({...data, maritalStatus: e.target.value as any})}
                        className={inputClass}
                      >
                        {Object.values(MaritalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 md:gap-6">
                    <div>
                      <label className={labelClass}>Age</label>
                      <input 
                        type="number"
                        value={data.age}
                        onChange={(e) => setData({...data, age: Number(e.target.value)})}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Adults</label>
                      <input 
                        type="number"
                        min="1"
                        value={data.numAdults}
                        onChange={(e) => setData({...data, numAdults: Number(e.target.value)})}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Children</label>
                      <input 
                        type="number"
                        min="0"
                        value={data.children.length}
                        onChange={(e) => handleNumChildrenChange(Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
                
                {data.children.length > 0 && (
                  <div className="mt-8 md:mt-10 space-y-4 pt-6 md:pt-8 border-t border-slate-100">
                    <h4 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Child Detailed Parameters</h4>
                    {data.children.map((child, index) => (
                      <div key={child.id} className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center gap-6'} py-4 px-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all`}>
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-black text-slate-400 w-14 uppercase">Child {index + 1}</div>
                          {isMobile && (
                             <div className="w-16">
                              <input 
                                type="number"
                                value={child.age}
                                onChange={(e) => {
                                  const newChildren = [...data.children];
                                  newChildren[index].age = Number(e.target.value);
                                  setData({...data, children: newChildren});
                                }}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold w-full outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                              />
                            </div>
                          )}
                        </div>
                        {!isMobile && (
                          <div className="w-16">
                            <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Age</label>
                            <input 
                              type="number"
                              value={child.age}
                              onChange={(e) => {
                                const newChildren = [...data.children];
                                newChildren[index].age = Number(e.target.value);
                                setData({...data, children: newChildren});
                              }}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold w-full outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                            />
                          </div>
                        )}
                        <div className={`flex items-center gap-4 ${isMobile ? 'justify-between' : 'flex-1 justify-end'}`}>
                          <div className="flex items-center gap-2">
                            <div className="relative flex items-center">
                              <input 
                                type="checkbox"
                                checked={child.isEmployed}
                                onChange={(e) => {
                                  const newChildren = [...data.children];
                                  newChildren[index].isEmployed = e.target.checked;
                                  setData({...data, children: newChildren});
                                }}
                                id={`employed-${child.id}`}
                                className="w-5 h-5 appearance-none bg-white border border-slate-300 rounded-md checked:bg-emerald-600 checked:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm"
                              />
                              {child.isEmployed && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>
                            <label htmlFor={`employed-${child.id}`} className="text-[10px] font-bold text-slate-500 cursor-pointer select-none">Employed?</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative flex items-center">
                              <input 
                                type="checkbox"
                                checked={child.fullCustody}
                                onChange={(e) => {
                                  const newChildren = [...data.children];
                                  newChildren[index].fullCustody = e.target.checked;
                                  setData({...data, children: newChildren});
                                }}
                                id={`custody-${child.id}`}
                                className="w-5 h-5 appearance-none bg-white border border-slate-300 rounded-md checked:bg-emerald-600 checked:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm"
                              />
                              {child.fullCustody && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>
                            <label htmlFor={`custody-${child.id}`} className="text-[10px] font-bold text-slate-500 cursor-pointer select-none">Full custody?</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                <h3 className={`text-sm md:text-base font-bold mb-6 flex items-center gap-3 ${textHeading}`}>
                  <div className="p-2 bg-emerald-50 rounded-lg"><Wallet className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" /></div>
                  Income Summary
                </h3>
                <div className="space-y-4 md:space-y-5">
                  <div className="p-5 md:p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="text-[9px] md:text-[10px] font-bold text-emerald-600 uppercase mb-2 tracking-widest">Total Gross Income</div>
                    <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">${formatCurrency(data.annualIncome)}</div>
                    <button onClick={() => setActiveTab('income')} className="text-[10px] md:text-xs text-emerald-600 hover:text-emerald-700 mt-4 flex items-center gap-1 font-bold transition-colors uppercase tracking-widest">
                      Refine Streams <ArrowRightLeft className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-5 md:p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Monthly Budgeted</div>
                    <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">${formatCurrency(data.monthlyExpenses)}</div>
                    <button onClick={() => setActiveTab('cashflow')} className="text-[10px] md:text-xs text-emerald-600 hover:text-emerald-700 mt-4 flex items-center gap-1 font-bold transition-colors uppercase tracking-widest">
                      Adjust Budget <ArrowRightLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <section className={cardClass}>
              <h3 className={`text-base font-bold mb-8 flex items-center gap-3 ${textHeading}`}>
                <div className="p-2 bg-emerald-50 rounded-lg"><HeartPulse className="w-5 h-5 text-emerald-600" /></div>
                Health Insurance & HSA Strategy
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <label className={labelClass}>Plan Type</label>
                  <select 
                    value={data.healthInsurance.planType}
                    onChange={(e) => setData({...data, healthInsurance: { ...data.healthInsurance, planType: e.target.value as any, hasHSA: e.target.value === 'HDHP' }})}
                    className={inputClass}
                  >
                    <option value="PPO">PPO (Standard)</option>
                    <option value="HDHP">HDHP (HSA-Eligible)</option>
                    <option value="HMO">HMO</option>
                    <option value="None">No Plan</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Monthly Premium</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">$</span>
                    <input 
                      type="text"
                      value={formatMoney(data.healthInsurance.monthlyPremium)}
                      onChange={(e) => setData({...data, healthInsurance: { ...data.healthInsurance, monthlyPremium: parseMoney(e.target.value) }})}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Employer Contribution</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">$</span>
                    <input 
                      type="text"
                      value={formatMoney(data.healthInsurance.employerContribution)}
                      onChange={(e) => setData({...data, healthInsurance: { ...data.healthInsurance, employerContribution: parseMoney(e.target.value) }})}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <h3 className={`text-base font-bold mb-8 flex items-center gap-3 ${textHeading}`}>
                <div className="p-2 bg-emerald-50 rounded-lg"><Briefcase className="w-5 h-5 text-emerald-600" /></div>
                Physical House Characteristics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <label className={labelClass}>Ownership</label>
                  <select 
                    value={data.houseCharacteristics.ownership}
                    onChange={(e) => setData({...data, houseCharacteristics: { ...data.houseCharacteristics, ownership: e.target.value as any }})}
                    className={inputClass}
                  >
                    <option value="Rent">Rent</option>
                    <option value="Own">Own</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Square Footage</label>
                  <input 
                    type="number"
                    value={data.houseCharacteristics.squareFootage}
                    onChange={(e) => setData({...data, houseCharacteristics: { ...data.houseCharacteristics, squareFootage: Number(e.target.value) }})}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Heating Source</label>
                  <select 
                    value={data.houseCharacteristics.primaryHeatingSource}
                    onChange={(e) => setData({...data, houseCharacteristics: { ...data.houseCharacteristics, primaryHeatingSource: e.target.value as any }})}
                    className={inputClass}
                  >
                    <option value="Gas">Gas</option>
                    <option value="Electric">Electric</option>
                    <option value="Oil">Oil</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox"
                      checked={data.houseCharacteristics.isInsulated}
                      onChange={(e) => setData({...data, houseCharacteristics: { ...data.houseCharacteristics, isInsulated: e.target.checked }})}
                      id="is-insulated"
                      className="w-6 h-6 appearance-none bg-white border border-slate-300 rounded-md checked:bg-emerald-600 checked:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm"
                    />
                    {data.houseCharacteristics.isInsulated && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <label htmlFor="is-insulated" className="text-sm font-bold text-slate-600 cursor-pointer select-none">Is the house well-insulated?</label>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox"
                      checked={data.houseCharacteristics.hasGasAppliances}
                      onChange={(e) => setData({...data, houseCharacteristics: { ...data.houseCharacteristics, hasGasAppliances: e.target.checked }})}
                      id="has-gas-appliances"
                      className="w-6 h-6 appearance-none bg-white border border-slate-300 rounded-md checked:bg-emerald-600 checked:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm"
                    />
                    {data.houseCharacteristics.hasGasAppliances && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <label htmlFor="has-gas-appliances" className="text-sm font-bold text-slate-600 cursor-pointer select-none">Does the house use gas appliances (Stove, Dryer, etc.)?</label>
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <h3 className={`text-base font-bold mb-8 flex items-center gap-3 ${textHeading}`}>
                <div className="p-2 bg-emerald-50 rounded-lg"><PiggyBank className="w-5 h-5 text-emerald-600" /></div>
                Retirement Contributions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <label className={labelClass}>401(k) / 403(b) Annual</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">$</span>
                    <input 
                      type="text"
                      value={formatMoney(data.contributions.k401Annual)}
                      onChange={(e) => setData({...data, contributions: { ...data.contributions, k401Annual: parseMoney(e.target.value) }})}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Roth IRA Annual</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">$</span>
                    <input 
                      type="text"
                      value={formatMoney(data.contributions.rothIraAnnual)}
                      onChange={(e) => setData({...data, contributions: { ...data.contributions, rothIraAnnual: parseMoney(e.target.value) }})}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>HSA Annual Contribution</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">$</span>
                    <input 
                      type="text"
                      disabled={!data.healthInsurance.hasHSA}
                      value={formatMoney(data.contributions.hsaAnnual)}
                      onChange={(e) => setData({...data, contributions: { ...data.contributions, hsaAnnual: parseMoney(e.target.value) }})}
                      className={`${inputClass} pl-8 ${!data.healthInsurance.hasHSA ? 'opacity-30 cursor-not-allowed bg-slate-50' : ''}`}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <section className={cardClass}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-base font-bold flex items-center gap-3 ${textHeading}`}>
                      <div className="p-2 bg-emerald-50 rounded-lg"><PieChart className="w-5 h-5 text-emerald-600" /></div>
                      Current Assets
                    </h3>
                    <button 
                      onClick={addCustomAsset}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 uppercase tracking-widest"
                    >
                      <Plus className="w-3 h-3" /> Add Asset
                    </button>
                  </div>
                  <div className="space-y-4">
                    {Object.keys(data.assets).map((key) => (
                      <div key={key} className="space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest capitalize">
                            {key === 'retirement401k' ? '401k' : key.replace(/([A-Z])/g, ' $1')}
                          </label>
                          <div className="relative w-full md:w-56">
                            <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                            <input 
                              type="text"
                              value={formatMoney(data.assets[key as keyof typeof data.assets])}
                              onChange={(e) => updateAsset(key as any, parseMoney(e.target.value))}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 shadow-sm"
                            />
                          </div>
                        </div>
                        {key === 'pension' && (
                          <div className="flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-blue-700 leading-relaxed font-semibold">
                              <span className="font-black uppercase tracking-tighter">Valuation Tip:</span> Benefit × 25 = Current Value.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {data.customAssets.map((asset) => (
                      <div key={asset.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 group">
                        <div className="flex items-center gap-2 flex-1">
                          <input 
                            type="text"
                            value={asset.name}
                            onChange={(e) => updateCustomAsset(asset.id, { name: e.target.value })}
                            className="bg-transparent border-b border-slate-200 focus:border-emerald-500 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none py-1 w-full"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative w-full md:w-56">
                            <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                            <input 
                              type="text"
                              value={formatMoney(asset.amount)}
                              onChange={(e) => updateCustomAsset(asset.id, { amount: parseMoney(e.target.value) })}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 shadow-sm"
                            />
                          </div>
                          <button 
                            onClick={() => removeCustomAsset(asset.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
               </section>

               <section className={cardClass}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-base font-bold flex items-center gap-3 ${textHeading}`}>
                      <div className="p-2 bg-red-50 rounded-lg"><TrendingUp className="w-5 h-5 text-red-600 rotate-180" /></div>
                      Current Liabilities
                    </h3>
                    <button 
                      onClick={addCustomDebt}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 uppercase tracking-widest"
                    >
                      <Plus className="w-3 h-3" /> Add Liability
                    </button>
                  </div>
                  <div className="space-y-4">
                    {Object.keys(data.debts).map((key) => (
                      <div key={key} className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                        <div className="relative w-full md:w-56">
                          <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                          <input 
                            type="text"
                            value={formatMoney(data.debts[key as keyof typeof data.debts])}
                            onChange={(e) => updateDebt(key as any, parseMoney(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 shadow-sm"
                          />
                        </div>
                      </div>
                    ))}

                    {data.customDebts.map((debt) => (
                      <div key={debt.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 group">
                        <div className="flex items-center gap-2 flex-1">
                          <input 
                            type="text"
                            value={debt.name}
                            onChange={(e) => updateCustomDebt(debt.id, { name: e.target.value })}
                            className="bg-transparent border-b border-slate-200 focus:border-emerald-500 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none py-1 w-full"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative w-full md:w-56">
                            <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                            <input 
                              type="text"
                              value={formatMoney(debt.amount)}
                              onChange={(e) => updateCustomDebt(debt.id, { amount: parseMoney(e.target.value) })}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 shadow-sm"
                            />
                          </div>
                          <button 
                            onClick={() => removeCustomDebt(debt.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
               </section>
            </div>
          </div>
        )}

        {activeTab === 'income' && (
          <div className="max-w-5xl space-y-10">
            <section className={cardClass}>
              <div className="flex justify-between items-center mb-10">
                <h3 className={`text-base font-bold flex items-center gap-3 ${textHeading}`}>
                  <div className="p-2 bg-emerald-50 rounded-lg"><Coins className="w-5 h-5 text-emerald-600" /></div>
                  Income Matrix
                </h3>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Annual</div>
                  <div className="text-3xl font-black text-emerald-600 tracking-tight">${formatCurrency(data.annualIncome)}</div>
                </div>
              </div>

              <div className="space-y-8">
                {data.incomeMembers.map((member) => (
                  <div key={member.id} className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-4">
                        <input 
                          type="text"
                          value={member.name}
                          onChange={(e) => updateMemberName(member.id, e.target.value)}
                          className="bg-transparent border-b-2 border-emerald-500/30 focus:border-emerald-500 text-xl font-black text-slate-800 outline-none px-1"
                        />
                      </div>
                      <button 
                        onClick={() => removeIncomeMember(member.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {member.incomeSources.map((source) => (
                        <div key={source.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 bg-white rounded-2xl border border-slate-50 group shadow-sm">
                          <div className="md:col-span-4">
                            <input 
                              type="text"
                              value={source.name}
                              onChange={(e) => updateIncomeSource(member.id, source.id, { name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <select 
                              value={source.type}
                              onChange={(e) => updateIncomeSource(member.id, source.id, { type: e.target.value as any })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                              <option value="W2">W2 Income</option>
                              <option value="Investment">Investment</option>
                              <option value="Interest">Interest</option>
                              <option value="Capital Gains">Capital Gains</option>
                              <option value="Side-Hustle">Side-Hustle</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="md:col-span-4 relative">
                            <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                            <input 
                              type="text"
                              value={formatMoney(source.amount)}
                              onChange={(e) => updateIncomeSource(member.id, source.id, { amount: parseMoney(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="md:col-span-1 text-center">
                            <button 
                              onClick={() => removeIncomeSource(member.id, source.id)}
                              className="text-slate-200 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => addIncomeSource(member.id)}
                      className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors ml-2 uppercase tracking-widest"
                    >
                      <Plus className="w-4 h-4" /> Add Source
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={addIncomeMember}
                className="w-full mt-10 py-6 border-2 border-dashed border-emerald-100 rounded-[32px] text-emerald-600/50 font-bold text-sm hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <UserPlus className="w-5 h-5" /> Add Member
              </button>
            </section>
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="max-w-5xl space-y-10">
            <section className={cardClass}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6">
                  <h3 className={`text-base font-bold flex items-center gap-3 ${textHeading}`}>
                    <div className="p-2 bg-emerald-50 rounded-lg"><Receipt className="w-5 h-5 text-emerald-600" /></div>
                    Expense Ledger
                  </h3>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-slate-200 transition-all disabled:opacity-50"
                    >
                      {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                      Import CSV
                    </button>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Burn</div>
                  <div className="text-3xl font-black text-emerald-600 tracking-tight">${formatCurrency(data.monthlyExpenses)}</div>
                </div>
              </div>

              {importPreview && (
                <div className="mb-10 p-8 bg-emerald-50/50 border-2 border-dashed border-emerald-200 rounded-[32px] animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-sm font-black text-emerald-800 uppercase tracking-tight">Import Preview</h4>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Gemini has categorized your expenses. Review and approve below.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setImportPreview(null)}
                        className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={applyImport}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-200 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve & Merge
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {importPreview.map((item, idx) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Category</span>
                          <span className="text-xs font-bold text-slate-800">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 block">Amount</span>
                          <span className="text-sm font-black text-emerald-600">${formatCurrency(item.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {data.budget.map((category) => (
                  <div key={category.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-50 group hover:border-emerald-200 transition-all shadow-sm">
                    <div className="flex-1 flex items-center gap-4">
                      {category.isCustom ? (
                        <input 
                          type="text"
                          value={category.name}
                          onChange={(e) => updateBudgetCategory(category.id, { name: e.target.value })}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 w-full max-w-xs focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                        />
                      ) : (
                        <div className="text-sm font-black text-slate-700 uppercase tracking-tighter">{category.name}</div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="relative max-w-[180px]">
                        <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">$</span>
                        <input 
                          type="text"
                          value={formatMoney(category.amount)}
                          onChange={(e) => updateBudgetCategory(category.id, { amount: parseMoney(e.target.value) })}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                        />
                      </div>
                      {category.isCustom && (
                        <button onClick={() => removeBudgetCategory(category.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={addBudgetCategory}
                className="w-full mt-8 py-5 border-2 border-dashed border-emerald-100 rounded-[32px] text-emerald-600/50 font-bold text-sm hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" /> Add Custom Expense
              </button>
            </section>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="max-w-5xl space-y-10">
            <section className={cardClass}>
              <div className="flex justify-between items-center mb-10">
                <h3 className={`text-base font-bold flex items-center gap-3 ${textHeading}`}>
                  <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                  Investment Portfolio
                </h3>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Portfolio Value</div>
                  <div className="text-3xl font-black text-emerald-600 tracking-tight">
                    ${formatCurrency(data.portfolio.reduce((sum, acc) => sum + acc.securities.reduce((sSum, sec) => sSum + sec.value, 0), 0))}
                  </div>
                </div>
              </div>

              <div className="space-y-12">
                {data.portfolio.map((account) => (
                  <div key={account.id} className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-6 flex-1">
                        <input 
                          type="text"
                          value={account.name}
                          onChange={(e) => updatePortfolioAccount(account.id, { name: e.target.value })}
                          className="bg-transparent border-b-2 border-emerald-500/30 focus:border-emerald-500 text-xl font-black text-slate-800 outline-none px-1"
                        />
                        <select 
                          value={account.type}
                          onChange={(e) => updatePortfolioAccount(account.id, { type: e.target.value as any })}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="401k">401(k)</option>
                          <option value="Roth IRA">Roth IRA</option>
                          <option value="Traditional IRA">Traditional IRA</option>
                          <option value="Brokerage">Brokerage</option>
                          <option value="HSA">HSA</option>
                          <option value="529">529 Plan</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Account Value</div>
                          <div className="text-lg font-black text-slate-700">
                            ${formatCurrency(account.securities.reduce((sum, s) => sum + s.value, 0))}
                          </div>
                        </div>
                        <button 
                          onClick={() => removePortfolioAccount(account.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {account.securities.length > 0 && (
                        <div className="grid grid-cols-12 gap-4 px-4 mb-2">
                          <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Symbol</div>
                          <div className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Security Name</div>
                          <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</div>
                          <div className="col-span-1 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Shares</div>
                          <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Price</div>
                          <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Value</div>
                        </div>
                      )}
                      {account.securities.map((security) => (
                        <div key={security.id} className="grid grid-cols-12 gap-4 items-center p-4 bg-white rounded-2xl border border-slate-50 group shadow-sm">
                          <div className="col-span-2">
                            <input 
                              type="text"
                              placeholder="VTI"
                              value={security.symbol}
                              onChange={(e) => updateSecurity(account.id, security.id, { symbol: e.target.value.toUpperCase() })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="col-span-3">
                            <input 
                              type="text"
                              placeholder="Vanguard Total Stock"
                              value={security.name}
                              onChange={(e) => updateSecurity(account.id, security.id, { name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="col-span-2">
                            <select 
                              value={security.type}
                              onChange={(e) => updateSecurity(account.id, security.id, { type: e.target.value as any })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                              <option value="Stock">Stock</option>
                              <option value="Bond">Bond</option>
                              <option value="ETF">ETF</option>
                              <option value="Mutual Fund">Mutual Fund</option>
                              <option value="Crypto">Crypto</option>
                              <option value="Cash">Cash</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="col-span-1">
                            <input 
                              type="number"
                              value={security.shares}
                              onChange={(e) => updateSecurity(account.id, security.id, { shares: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="col-span-2 relative">
                            <span className="absolute left-2 top-2 text-slate-400 text-[10px] font-bold">$</span>
                            <input 
                              type="text"
                              value={formatMoney(security.price)}
                              onChange={(e) => updateSecurity(account.id, security.id, { price: parseMoney(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-5 pr-2 py-2 text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between gap-2">
                            <div className="text-xs font-black text-slate-800 flex-1 text-right">
                              ${formatCurrency(security.value)}
                            </div>
                            <button 
                              onClick={() => removeSecurity(account.id, security.id)}
                              className="text-slate-200 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => addSecurity(account.id)}
                      className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors ml-2 uppercase tracking-widest"
                    >
                      <Plus className="w-4 h-4" /> Add Security
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={addPortfolioAccount}
                className="w-full mt-10 py-6 border-2 border-dashed border-emerald-100 rounded-[32px] text-emerald-600/50 font-bold text-sm hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <Plus className="w-5 h-5" /> Add Investment Account
              </button>
            </section>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6 md:space-y-10 relative z-10 pb-20">
            {!analysis && (
              <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[40px] mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-emerald-600 rounded-3xl shadow-lg shadow-emerald-200">
                    <BrainCircuit className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Strategic Analysis Pending</h3>
                    <p className="text-slate-500 font-medium">Run your CFO analysis to unlock resilience grades and deep strategic insights.</p>
                  </div>
                </div>
                <button 
                  onClick={handleRunAnalysis}
                  disabled={loading}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                  {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate CFO Strategy
                </button>
              </div>
            )}

            {/* Top Row: Core KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'} flex flex-col justify-center items-center group`}>
                <div 
                  className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4 cursor-pointer hover:text-emerald-600 transition-colors"
                  onClick={() => setShowResilienceInfo(!showResilienceInfo)}
                >
                  Resilience Grade <Info className="w-3.5 h-3.5" />
                </div>
                {showResilienceInfo && (
                  <div className="absolute left-0 right-0 top-0 bg-white p-6 md:p-8 z-50 rounded-[32px] shadow-2xl text-[10px] leading-relaxed border border-emerald-100 backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-emerald-50 pb-2">
                      <div className="font-bold uppercase tracking-widest text-emerald-600">Scoring Protocol</div>
                      <button onClick={() => setShowResilienceInfo(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <ul className="space-y-3 text-slate-600">
                      <li className="flex items-start gap-2"><span className="font-bold text-emerald-600">Emergency Reserve (30%):</span> Liquid Savings vs Monthly Burn. 6 months = 100/100.</li>
                      <li className="flex items-start gap-2"><span className="font-bold text-emerald-600">Debt Management (30%):</span> DTI Ratio and Credit Utilization. DTI &lt; 25% = 100/100.</li>
                      <li className="flex items-start gap-2"><span className="font-bold text-emerald-600">Savings Velocity (25%):</span> Total Annual Contributions / Gross Income. 20% = 100/100.</li>
                      <li className="flex items-start gap-2"><span className="font-bold text-emerald-600">Asset Diversification (15%):</span> Balance between retirement, cash, and growth investments.</li>
                    </ul>
                    <p className="mt-4 text-slate-400 italic">This grade represents your household's structural financial strength and ability to weather economic shocks.</p>
                  </div>
                )}
                <div className={`text-5xl md:text-6xl font-black rounded-3xl px-6 md:px-8 py-3 md:py-4 mb-3 ${analysis ? getGradeColor(analysis.resilienceGrade) : getGradeColor(localResilience.grade)}`}>
                  {analysis ? analysis.resilienceGrade : localResilience.grade}
                </div>
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Score: {analysis ? analysis.resilienceScore : localResilience.score}/100</div>
              </div>

              <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Household Equity</div>
                <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">${formatCurrency(analysis ? analysis.netWorth : (totalAssets - totalLiabilities))}</div>
                <div className="mt-6 text-[10px] text-emerald-600 flex items-center gap-2 font-black bg-emerald-50 px-4 py-2 rounded-full w-fit uppercase tracking-widest">
                  <TrendingUp className="w-4 h-4" /> Growth Path
                </div>
              </div>
              
              <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Debt Exposure</div>
                <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  {analysis ? (analysis.debtToIncomeRatio * 100).toFixed(2) : (data.annualIncome > 0 ? ((totalLiabilities / data.annualIncome) * 100).toFixed(2) : '0.00')}%
                </div>
                <div className={`mt-6 text-[10px] flex items-center gap-2 font-black px-4 py-2 rounded-full w-fit uppercase tracking-widest ${
                  (analysis ? analysis.debtToIncomeRatio : (data.annualIncome > 0 ? totalLiabilities / data.annualIncome : 0)) < 0.36 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                   {(analysis ? analysis.debtToIncomeRatio : (data.annualIncome > 0 ? totalLiabilities / data.annualIncome : 0)) < 0.36 ? 'Optimal' : 'Caution'}
                </div>
              </div>

              <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Monthly Surplus</div>
                <div className={`text-3xl md:text-4xl font-black tracking-tight ${monthlySurplus >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${formatCurrency(monthlySurplus)}
                </div>
                <div className={`mt-6 text-[10px] font-black px-4 py-2 rounded-full w-fit uppercase tracking-widest ${monthlySurplus >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                   {monthlySurplus >= 0 ? 'Positive Cash Flow' : 'Deficit Spending'}
                </div>
              </div>
            </div>

            {/* Second Row: Efficiency Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Savings Velocity</div>
                <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{savingsRate.toFixed(2)}%</div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(savingsRate * 5, 100)}%` }} />
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Target: 20%</div>
              </div>

              <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Emergency Coverage</div>
                <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{emergencyFundMonths.toFixed(2)} <span className="text-lg md:text-xl text-slate-400">Months</span></div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min(emergencyFundMonths * 16.6, 100)}%` }} />
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Target: 6 Months</div>
              </div>

              <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Critical Actions</div>
                <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  {analysis ? analysis.recommendations.filter(r => r.priority === 'High').length : '0'}
                </div>
                <button 
                  onClick={() => analysis ? setActiveTab('analysis') : handleRunAnalysis()} 
                  className="mt-6 text-[10px] text-emerald-600 font-black hover:underline uppercase tracking-widest"
                >
                  {analysis ? 'Strategic Plan →' : 'Run Analysis →'}
                </button>
              </div>
            </div>

            {/* Third Row: Deep Visualizations (Only if analysis exists) */}
            {analysis && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                  <h3 className="text-lg md:text-xl font-black mb-8 md:mb-10 text-slate-800 uppercase tracking-tighter">Resilience Vectors</h3>
                  <div className="space-y-6 md:space-y-8">
                    {analysis.resilienceFactors.map((factor, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{factor.name}</div>
                          <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{factor.score}/100</div>
                        </div>
                        <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <div 
                            className={`h-full transition-all duration-1000 ${factor.score > 80 ? 'bg-emerald-500' : factor.score > 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'} flex flex-col items-center`}>
                  <h3 className="text-lg md:text-xl font-black mb-10 md:mb-12 text-slate-800 uppercase tracking-tighter w-full text-left">Capital Allocation</h3>
                  <div className={`${isMobile ? 'h-56' : 'h-64'} w-full`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={assetData}
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 70 : 85}
                          outerRadius={isMobile ? 100 : 115}
                          paddingAngle={0}
                          dataKey="value"
                        >
                          {assetData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value), 'Value']}
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', padding: '16px', color: '#1e293b' }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 md:gap-x-6 gap-y-3 mt-8 md:mt-10">
                    {assetData.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Portfolio & Balance Sheet (Always show if data exists) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
              <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                <h3 className="text-lg md:text-xl font-black mb-8 md:mb-10 text-slate-800 uppercase tracking-tighter">Portfolio Diversification</h3>
                <div className={`${isMobile ? 'h-56' : 'h-64'} w-full`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={diversificationData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={isMobile ? 80 : 100} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                      <Tooltip 
                        formatter={(value: number) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value), 'Value']}
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '12px' }}
                      />
                      <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                        {diversificationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DIVERSIFICATION_COLORS[index % DIVERSIFICATION_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${cardClass} ${isMobile ? 'p-6' : 'p-8'}`}>
                <h3 className="text-lg md:text-xl font-black mb-8 md:mb-10 text-slate-800 uppercase tracking-tighter">Balance Sheet Strength</h3>
                <div className={`${isMobile ? 'h-56' : 'h-64'} w-full`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assetVsLiabilityData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                        tickFormatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}
                      />
                      <Tooltip 
                        formatter={(value: number) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value), 'Value']}
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '12px' }}
                      />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                        <Cell fill="#10b981" />
                        <Cell fill="#f43f5e" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && analysis && (
          <div className="space-y-12 relative z-10">
            <div className="bg-emerald-950 text-white p-16 rounded-[56px] relative overflow-hidden shadow-3xl shadow-emerald-950/30">
               <div className="relative z-10 max-w-4xl">
                 <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-emerald-500/20 rounded-full border border-white/10 mb-8 backdrop-blur-xl">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300">CFO Confidential</span>
                 </div>
                 <h3 className="text-5xl font-black mb-8 leading-[1.1] tracking-tighter">Financial Integrity Assessment</h3>
                 <p className="text-emerald-100/80 leading-relaxed text-2xl font-medium max-w-2xl">
                   {analysis.summary}
                 </p>
               </div>
               <div className="absolute right-[-5%] top-[-5%] opacity-[0.03]">
                 <BrainCircuit className="w-[600px] h-[600px]" />
               </div>
            </div>

            <div className="space-y-10">
              <h3 className="text-3xl font-black text-slate-900 px-2 tracking-tighter">Strategic Action Plan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {analysis.recommendations.map((rec) => (
                  <div key={rec.id} className={cardClass}>
                    <div className="flex justify-between items-start mb-8">
                      <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        rec.priority === 'High' ? 'bg-red-50 text-red-600' : 
                        rec.priority === 'Medium' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {rec.priority} Priority
                      </span>
                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-5 py-2 rounded-full uppercase tracking-widest">
                        {rec.category}
                      </span>
                    </div>
                    
                    <h4 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">{rec.title}</h4>
                    <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">
                      {rec.description}
                    </p>
                    
                    <div className="bg-emerald-50 p-8 rounded-[32px] mb-10 border border-emerald-100">
                      <div className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-2">Projected Annual Impact</div>
                      <div className="text-4xl font-black text-emerald-600 tracking-tighter">{rec.estimatedImpact}</div>
                    </div>
                    
                    <div className="space-y-5">
                      <div className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 mb-4">
                        <div className="h-0.5 w-6 bg-emerald-600" /> Implementation Steps
                      </div>
                      {rec.actionSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-4 text-[15px] font-semibold text-slate-600">
                          <div className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ChevronRight className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="leading-tight">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {analysis.deepInsights && (
              <div className="space-y-10 mt-16 animate-in fade-in slide-in-from-bottom-10 duration-700">
                <h3 className="text-3xl font-black text-slate-900 px-2 tracking-tighter flex items-center gap-4">
                  <Zap className="w-8 h-8 text-emerald-600" />
                  Advanced CFO Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {analysis.deepInsights.map((insight, idx) => (
                    <div key={idx} className={`${cardClass} border-t-4 border-t-emerald-500 flex flex-col h-full`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
                          {insight.category}
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 mb-4 tracking-tight">{insight.title}</h4>
                      <p className="text-slate-500 text-sm mb-6 leading-relaxed font-medium flex-grow">
                        {insight.content}
                      </p>
                      <div className="mt-auto pt-4 border-t border-slate-50">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Strategic Impact</div>
                        <div className="text-xs font-bold text-slate-700">{insight.impact}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!analysis.deepInsights && (
              <div className="flex justify-center mt-16">
                <button 
                  onClick={handleGetDeepInsights}
                  disabled={loadingDeepInsights}
                  className="group flex items-center gap-4 px-10 py-5 bg-emerald-600 text-white rounded-full font-black uppercase tracking-widest shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loadingDeepInsights ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Zap className="w-6 h-6 group-hover:animate-pulse" />
                  )}
                  {loadingDeepInsights ? 'Mining Data...' : 'Generate Deep Insights'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'advisor' && (
          <div className="flex-1 flex flex-col max-w-5xl h-full relative z-10 overflow-hidden pb-8">
            <div className="flex-1 overflow-y-auto mb-6 pr-4 space-y-6 scrollbar-hide">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-12 pt-20">
                  <div className="p-6 bg-emerald-50 rounded-full mb-8">
                    <Sparkles className="w-12 h-12 text-emerald-600" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Tactical AI Advisor</h3>
                  <p className="text-slate-500 font-medium max-w-lg mb-10">
                    Your Homeland CFO is ready. I have full context of your financial profile and strategic goals. Ask me anything about optimizing your wealth.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {suggestedTopics.map((topic, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSendMessage(topic)}
                        className="p-5 text-left bg-white border border-slate-200 rounded-3xl hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-100 transition-all group flex items-start gap-4"
                      >
                        <div className="p-2 bg-emerald-50 rounded-xl group-hover:bg-emerald-600 transition-colors">
                          <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:text-white" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{topic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-6 rounded-[32px] ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-none'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {msg.role === 'user' ? (
                        <Users className="w-4 h-4 text-emerald-200" />
                      ) : (
                        <BrainCircuit className="w-4 h-4 text-emerald-600" />
                      )}
                      <span className={`text-[10px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {msg.role === 'user' ? 'Household Member' : 'AI CFO Advisor'}
                      </span>
                    </div>
                    <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-white border border-slate-200 p-6 rounded-[32px] rounded-tl-none shadow-sm">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex-shrink-0 relative">
              <div className="absolute inset-x-0 bottom-full h-12 bg-gradient-to-t from-[#f8faf9] to-transparent pointer-events-none mb-2"></div>
              <div className="p-4 bg-white/70 backdrop-blur-xl border border-slate-200 rounded-[36px] shadow-2xl flex items-center gap-4">
                <button 
                  onClick={() => {
                    setMessages([]);
                    chatSession.current = null;
                  }}
                  className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all"
                  title="Refresh Conversation"
                >
                  <RefreshCcw className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Consult your CFO advisor..."
                  className="flex-1 bg-transparent border-none outline-none text-slate-800 font-bold placeholder:text-slate-300 py-3"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || chatLoading}
                  className="bg-emerald-600 p-4 rounded-full text-white shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </main>
    </div>
  );
};

export default App;