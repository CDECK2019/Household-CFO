
import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { HouseholdData, AnalysisResponse, MaritalStatus, Child, BudgetCategory, HouseholdMember, IncomeSource } from './types';
import { INITIAL_HOUSEHOLD_DATA, US_STATES } from './constants';
import { analyzeHouseholdFinances } from './services/geminiService';
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'income' | 'cashflow' | 'analysis'>('profile');
  const [data, setData] = useState<HouseholdData>(INITIAL_HOUSEHOLD_DATA);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResilienceInfo, setShowResilienceInfo] = useState(false);

  // Automatically update totals whenever budget or income changes
  useEffect(() => {
    const totalExpenses = data.budget.reduce((sum, cat) => sum + cat.amount, 0);
    const totalIncome = data.incomeMembers.reduce((sum, member) => 
      sum + member.incomeSources.reduce((mSum, source) => mSum + source.amount, 0), 0
    );
    setData(prev => ({ 
      ...prev, 
      monthlyExpenses: totalExpenses,
      annualIncome: totalIncome 
    }));
  }, [data.budget, data.incomeMembers]);

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeHouseholdFinances(data);
      setAnalysis(result);
      setActiveTab('analysis');
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  const updateAsset = (key: keyof typeof data.assets, value: number) => {
    setData(prev => ({ ...prev, assets: { ...prev.assets, [key]: value } }));
  };

  const updateDebt = (key: keyof typeof data.debts, value: number) => {
    setData(prev => ({ ...prev, debts: { ...prev.debts, [key]: value } }));
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

  // Income Management
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

  // Charts Data
  const assetData = [
    { name: 'Savings', value: data.assets.savings },
    { name: '401k', value: data.assets.retirement401k },
    { name: 'IRA', value: data.assets.ira },
    { name: 'Real Estate', value: data.assets.realEstate },
    { name: 'Investments', value: data.assets.investments },
    { name: 'Pension', value: data.assets.pension },
  ];

  const debtData = [
    { name: 'Mortgage', value: data.debts.mortgage },
    { name: 'Student Loans', value: data.debts.studentLoans },
    { name: 'Credit Cards', value: data.debts.creditCards },
    { name: 'Other', value: data.debts.other },
  ];

  const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

  const inputClass = "w-full max-w-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all text-slate-900";
  const labelClass = "block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide";
  const cardClass = "bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100";

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-emerald-600 bg-emerald-50';
    if (grade.startsWith('B')) return 'text-emerald-500 bg-emerald-50';
    if (grade.startsWith('C')) return 'text-amber-500 bg-amber-50';
    return 'text-red-500 bg-red-50';
  };

  return (
    <div className="flex min-h-screen bg-[#f8faf9] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-emerald-950 text-white flex-shrink-0 flex flex-col fixed h-full z-20 transition-all duration-300">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Household<span className="text-emerald-400">CFO</span></h1>
        </div>

        <nav className="mt-4 flex-1 px-4 space-y-1">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition ${activeTab === 'profile' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <Users className="w-5 h-5" />
            <span className="font-semibold text-sm">Profile & Intake</span>
          </button>

          <button 
            onClick={() => setActiveTab('income')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition ${activeTab === 'income' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <Coins className="w-5 h-5" />
            <span className="font-semibold text-sm">Income</span>
          </button>

          <button 
            onClick={() => setActiveTab('cashflow')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition ${activeTab === 'cashflow' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <Receipt className="w-5 h-5" />
            <span className="font-semibold text-sm">Expenses</span>
          </button>
          
          <button 
            onClick={() => analysis ? setActiveTab('dashboard') : null}
            disabled={!analysis}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-slate-400 hover:bg-white/5'} ${!analysis ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-semibold text-sm">Dashboard</span>
          </button>

          <button 
            onClick={() => analysis ? setActiveTab('analysis') : null}
            disabled={!analysis}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition ${activeTab === 'analysis' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-slate-400 hover:bg-white/5'} ${!analysis ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <BrainCircuit className="w-5 h-5" />
            <span className="font-semibold text-sm">CFO Insights</span>
          </button>
        </nav>

        <div className="p-5 bg-emerald-900/40 m-4 rounded-2xl border border-white/5">
          <div className="text-[10px] text-emerald-500/80 uppercase font-bold mb-2">Household Resilience</div>
          <div className="h-1.5 bg-emerald-950 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 w-[72%]"></div>
          </div>
          <p className="text-[10px] mt-2 text-emerald-100/60 font-medium">Complexity level: High</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 overflow-y-auto p-10 lg:p-14">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'profile' ? 'Contextual Intake' : 
               activeTab === 'income' ? 'Granular Income' :
               activeTab === 'cashflow' ? 'Monthly Expenses' :
               activeTab === 'dashboard' ? 'Financial Position' : 'Strategic Action Plan'}
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
              {activeTab === 'profile' ? 'Input your household variables for a tailored financial model.' : 
               activeTab === 'income' ? 'Track every income stream across all household members.' :
               activeTab === 'cashflow' ? 'Manage your monthly budget with granular precision.' :
               'Real-time overview of your wealth and liabilities.'}
            </p>
          </div>
          
          {(activeTab === 'profile' || activeTab === 'cashflow' || activeTab === 'income') && (
            <button 
              onClick={handleRunAnalysis}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-emerald-200 transition-all flex items-center gap-3 disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : <BrainCircuit className="w-6 h-6" />}
              {loading ? 'Crunching Numbers...' : 'Generate CFO Strategy'}
            </button>
          )}
        </header>

        {activeTab === 'profile' && (
          <div className="max-w-5xl space-y-10">
            {/* Core Profile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className={cardClass}>
                <h3 className="text-base font-bold mb-6 flex items-center gap-3 text-slate-800">
                  <div className="p-2 bg-emerald-50 rounded-lg"><Users className="w-5 h-5 text-emerald-600" /></div>
                  Demographics & Location
                </h3>
                <div className="space-y-5">
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
              </section>

              <section className={cardClass}>
                <h3 className="text-base font-bold mb-6 flex items-center gap-3 text-slate-800">
                  <div className="p-2 bg-emerald-50 rounded-lg"><Wallet className="w-5 h-5 text-emerald-600" /></div>
                  Income Summary
                </h3>
                <div className="space-y-5">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Total Annual Gross Income</div>
                    <div className="text-2xl font-bold text-emerald-900">${data.annualIncome.toLocaleString()}</div>
                    <button onClick={() => setActiveTab('income')} className="text-xs text-emerald-600 hover:underline mt-2 flex items-center gap-1 font-semibold">
                      Edit Income Streams <ArrowRightLeft className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Total Monthly Budgeted</div>
                    <div className="text-2xl font-bold text-emerald-900">${data.monthlyExpenses.toLocaleString()}</div>
                    <button onClick={() => setActiveTab('cashflow')} className="text-xs text-emerald-600 hover:underline mt-2 flex items-center gap-1 font-semibold">
                      Edit Detailed Budget <ArrowRightLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Health & HSA */}
            <section className={cardClass}>
              <h3 className="text-base font-bold mb-8 flex items-center gap-3 text-slate-800">
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
                  <label className={labelClass}>Monthly Premium (Out of Pocket)</label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">$</span>
                    <input 
                      type="number"
                      value={data.healthInsurance.monthlyPremium}
                      onChange={(e) => setData({...data, healthInsurance: { ...data.healthInsurance, monthlyPremium: Number(e.target.value) }})}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Employer Contribution / Month</label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">$</span>
                    <input 
                      type="number"
                      value={data.healthInsurance.employerContribution}
                      onChange={(e) => setData({...data, healthInsurance: { ...data.healthInsurance, employerContribution: Number(e.target.value) }})}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Retirement Contributions */}
            <section className={cardClass}>
              <h3 className="text-base font-bold mb-8 flex items-center gap-3 text-slate-800">
                <div className="p-2 bg-emerald-50 rounded-lg"><PiggyBank className="w-5 h-5 text-emerald-600" /></div>
                Annual Retirement Contributions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <label className={labelClass}>401(k) / 403(b) Annual ($)</label>
                  <input 
                    type="number"
                    value={data.contributions.k401Annual}
                    onChange={(e) => setData({...data, contributions: { ...data.contributions, k401Annual: Number(e.target.value) }})}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Roth IRA Annual ($)</label>
                  <input 
                    type="number"
                    value={data.contributions.rothIraAnnual}
                    onChange={(e) => setData({...data, contributions: { ...data.contributions, rothIraAnnual: Number(e.target.value) }})}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>HSA Annual Contribution ($)</label>
                  <input 
                    type="number"
                    disabled={!data.healthInsurance.hasHSA}
                    value={data.contributions.hsaAnnual}
                    onChange={(e) => setData({...data, contributions: { ...data.contributions, hsaAnnual: Number(e.target.value) }})}
                    className={`${inputClass} ${!data.healthInsurance.hasHSA ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                  />
                </div>
              </div>
            </section>

            {/* Balance Sheet */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <section className={cardClass}>
                  <h3 className="text-base font-bold mb-6 flex items-center gap-3 text-slate-800">
                    <div className="p-2 bg-emerald-50 rounded-lg"><PieChart className="w-5 h-5 text-emerald-600" /></div>
                    Current Assets
                  </h3>
                  <div className="space-y-4">
                    {Object.keys(data.assets).map((key) => (
                      <div key={key} className="space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                          <div className="relative w-full md:w-48">
                            <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">$</span>
                            <input 
                              type="number"
                              value={data.assets[key as keyof typeof data.assets]}
                              onChange={(e) => updateAsset(key as any, Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                            />
                          </div>
                        </div>
                        {key === 'pension' && (
                          <div className="flex items-start gap-2 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                              <span className="font-bold">Valuation Guide:</span> To value a pension based on future income, estimate your <span className="underline">annual</span> benefit at retirement and multiply by 20 (conservative) or 25 (standard). Alternatively, use your current "cash out" balance.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
               </section>

               <section className={cardClass}>
                  <h3 className="text-base font-bold mb-6 flex items-center gap-3 text-slate-800">
                    <div className="p-2 bg-red-50 rounded-lg"><TrendingUp className="w-5 h-5 text-red-600 rotate-180" /></div>
                    Current Liabilities
                  </h3>
                  <div className="space-y-4">
                    {Object.keys(data.debts).map((key) => (
                      <div key={key} className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                        <div className="relative w-full md:w-48">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">$</span>
                          <input 
                            type="number"
                            value={data.debts[key as keyof typeof data.debts]}
                            onChange={(e) => updateDebt(key as any, Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                          />
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
                <h3 className="text-base font-bold flex items-center gap-3 text-slate-800">
                  <div className="p-2 bg-emerald-50 rounded-lg"><Coins className="w-5 h-5 text-emerald-600" /></div>
                  Household Income Matrix
                </h3>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Annual Income</div>
                  <div className="text-3xl font-black text-emerald-600 tracking-tight">${data.annualIncome.toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-8">
                {data.incomeMembers.map((member) => (
                  <div key={member.id} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-emerald-100 transition-all">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-4">
                        <input 
                          type="text"
                          value={member.name}
                          onChange={(e) => updateMemberName(member.id, e.target.value)}
                          className="bg-transparent border-b-2 border-emerald-500/30 focus:border-emerald-500 text-xl font-bold text-slate-800 outline-none px-1"
                        />
                      </div>
                      <button 
                        onClick={() => removeIncomeMember(member.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {member.incomeSources.map((source) => (
                        <div key={source.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3 bg-white/60 rounded-xl border border-slate-100 group">
                          <div className="md:col-span-4">
                            <input 
                              type="text"
                              value={source.name}
                              onChange={(e) => updateIncomeSource(member.id, source.id, { name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <select 
                              value={source.type}
                              onChange={(e) => updateIncomeSource(member.id, source.id, { type: e.target.value as any })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
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
                            <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">$</span>
                            <input 
                              type="number"
                              value={source.amount}
                              onChange={(e) => updateIncomeSource(member.id, source.id, { amount: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="md:col-span-1 text-center">
                            <button 
                              onClick={() => removeIncomeSource(member.id, source.id)}
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => addIncomeSource(member.id)}
                      className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Income Stream
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={addIncomeMember}
                className="w-full mt-10 py-5 border-2 border-dashed border-emerald-200 rounded-[32px] text-emerald-600 font-bold text-sm hover:border-emerald-400 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" /> Add Household Member
              </button>
            </section>
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="max-w-5xl space-y-10">
            <section className={cardClass}>
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-base font-bold flex items-center gap-3 text-slate-800">
                  <div className="p-2 bg-emerald-50 rounded-lg"><Receipt className="w-5 h-5 text-emerald-600" /></div>
                  Granular Expense Tracking
                </h3>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Monthly Burn</div>
                  <div className="text-3xl font-black text-emerald-600 tracking-tight">${data.monthlyExpenses.toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-4">
                {data.budget.map((category) => (
                  <div key={category.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-colors group">
                    <div className="flex-1 flex items-center gap-4">
                      {category.isCustom ? (
                        <input 
                          type="text"
                          value={category.name}
                          onChange={(e) => updateBudgetCategory(category.id, { name: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 w-full max-w-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      ) : (
                        <div className="text-sm font-bold text-slate-700 min-w-[120px]">{category.name}</div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="relative max-w-[160px]">
                        <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">$</span>
                        <input 
                          type="number"
                          value={category.amount}
                          onChange={(e) => updateBudgetCategory(category.id, { amount: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      {category.isCustom && (
                        <button onClick={() => removeBudgetCategory(category.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={addBudgetCategory}
                className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Custom Expense Category
              </button>
            </section>
          </div>
        )}

        {activeTab === 'dashboard' && analysis && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                <div 
                  className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 cursor-help"
                  onMouseEnter={() => setShowResilienceInfo(true)}
                  onMouseLeave={() => setShowResilienceInfo(false)}
                >
                  Resilience Grade <Info className="w-3.5 h-3.5" />
                </div>
                {showResilienceInfo && (
                  <div className="absolute left-0 right-0 top-0 bg-emerald-900 text-white p-6 z-50 rounded-2xl shadow-2xl text-xs leading-relaxed border border-white/10">
                    <div className="font-bold mb-2 uppercase tracking-widest border-b border-white/10 pb-2">Resilience Framework</div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2"><div className="w-1 h-1 bg-emerald-400 rounded-full mt-1.5 flex-shrink-0" /> <strong>Emergency Reserve (30%):</strong> Liquidity vs Monthly Burn. 6 months coverage required for A+.</li>
                      <li className="flex items-start gap-2"><div className="w-1 h-1 bg-emerald-400 rounded-full mt-1.5 flex-shrink-0" /> <strong>Debt Load (30%):</strong> Total debt utilization and DTI ratio. Ideally &lt; 25%.</li>
                      <li className="flex items-start gap-2"><div className="w-1 h-1 bg-emerald-400 rounded-full mt-1.5 flex-shrink-0" /> <strong>Savings Velocity (25%):</strong> Annual savings vs Gross income. 20%+ target.</li>
                      <li className="flex items-start gap-2"><div className="w-1 h-1 bg-emerald-400 rounded-full mt-1.5 flex-shrink-0" /> <strong>Asset Diversity (15%):</strong> Health of retirement vs liquid portfolio.</li>
                    </ul>
                  </div>
                )}
                <div className={`text-5xl font-black rounded-2xl px-4 py-2 w-fit ${getGradeColor(analysis.resilienceGrade)}`}>
                  {analysis.resilienceGrade}
                </div>
                <div className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-tight">Score: {analysis.resilienceScore}/100</div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Household Equity</div>
                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">${analysis.netWorth.toLocaleString()}</div>
                <div className="mt-4 text-[10px] text-emerald-600 flex items-center gap-1.5 font-bold bg-emerald-50 px-3 py-1.5 rounded-full w-fit">
                  <TrendingUp className="w-3.5 h-3.5" /> Position: {analysis.netWorth > 0 ? 'Surplus' : 'Deficit'}
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Debt-to-Income</div>
                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">{(analysis.debtToIncomeRatio * 100).toFixed(1)}%</div>
                <div className={`mt-4 text-[10px] flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-full w-fit ${analysis.debtToIncomeRatio < 0.36 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                   {analysis.debtToIncomeRatio < 0.36 ? 'Healthy Load' : 'High Leverage'}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Impact Actions</div>
                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">{analysis.recommendations.filter(r => r.priority === 'High').length}</div>
                <button onClick={() => setActiveTab('analysis')} className="mt-4 text-[10px] text-emerald-600 font-bold hover:underline">
                  Execute Strategy →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Resilience Breakdown */}
              <div className={cardClass}>
                <h3 className="text-xl font-bold mb-8 text-slate-800">Resilience Breakdown</h3>
                <div className="space-y-6">
                  {analysis.resilienceFactors.map((factor, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="text-sm font-bold text-slate-700">{factor.name}</div>
                        <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{factor.score}/100</div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${factor.score > 80 ? 'bg-emerald-500' : factor.score > 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${factor.score}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold mb-10 text-slate-800">Wealth Allocation</h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={assetData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={105}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {assetData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-6">
                  {assetData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && analysis && (
          <div className="space-y-12">
            <div className="bg-emerald-900 text-white p-12 rounded-[40px] relative overflow-hidden shadow-2xl shadow-emerald-900/20">
               <div className="relative z-10 max-w-3xl">
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/30 rounded-full border border-white/10 mb-6 backdrop-blur-md">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">CFO Executive Summary</span>
                 </div>
                 <h3 className="text-4xl font-extrabold mb-6 leading-tight">Strategic Household Analysis</h3>
                 <p className="text-emerald-100/90 leading-relaxed text-xl font-medium italic">
                   "{analysis.summary}"
                 </p>
                 <div className="mt-8 flex items-center gap-6">
                    <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Resilience Rating</div>
                      <div className="text-2xl font-black text-white">{analysis.resilienceGrade}</div>
                    </div>
                    <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Net Worth</div>
                      <div className="text-2xl font-black text-white">${analysis.netWorth.toLocaleString()}</div>
                    </div>
                 </div>
               </div>
               <div className="absolute right-[-10%] top-[-10%] opacity-10">
                 <BrainCircuit className="w-[500px] h-[500px]" />
               </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-slate-900 px-2 flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl"><CheckCircle2 className="w-6 h-6 text-white" /></div>
                High-Impact Recommendations
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {analysis.recommendations.map((rec) => (
                  <div key={rec.id} className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:translate-y-[-4px] transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        rec.priority === 'High' ? 'bg-red-50 text-red-600' : 
                        rec.priority === 'Medium' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {rec.priority} Priority
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-3 py-1.5 rounded-full uppercase tracking-widest">
                        {rec.category}
                      </span>
                    </div>
                    
                    <h4 className="text-2xl font-extrabold text-slate-900 mb-4">{rec.title}</h4>
                    <p className="text-slate-500 text-base mb-8 leading-relaxed font-medium">
                      {rec.description}
                    </p>
                    
                    <div className="bg-[#f8faf9] p-6 rounded-2xl mb-8 border border-emerald-50">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Projected Annual Wealth Impact</div>
                      <div className="text-2xl font-black text-emerald-600 tracking-tight">{rec.estimatedImpact}</div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-2">
                        Execution Roadmap:
                      </div>
                      {rec.actionSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-4 text-sm font-semibold text-slate-600">
                          <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ChevronRight className="w-3 h-3 text-emerald-600" />
                          </div>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
