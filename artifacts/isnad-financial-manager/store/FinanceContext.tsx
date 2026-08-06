import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

export type TransactionType = 'income' | 'expense';
export type GoalStatus = 'active' | 'completed';

// The local schema intentionally contains exactly seven persisted collections.
export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'card' | 'savings';
  openingBalance: number;
  color: string;
}
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
}
export interface TransactionItem {
  id: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  note: string;
  date: string;
}
export interface Debt {
  id: string;
  name: string;
  amount: number;
  paid: number;
  dueDate: string;
  note: string;
}
export interface Loan {
  id: string;
  name: string;
  amount: number;
  received: number;
  dueDate: string;
  note: string;
}
export interface FinancialGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  color: string;
  status: GoalStatus;
}
export interface Settings {
  id: 'singleton';
  currency: string;
  darkMode: boolean;
}

export interface FinanceState {
  accounts: Account[];
  categories: Category[];
  transactions: TransactionItem[];
  debts: Debt[];
  loans: Loan[];
  goals: FinancialGoal[];
  settings: Settings;
}

const STORAGE_KEY = '@isnad_financial_manager_v1';
const PALETTE = ['#0C8F74', '#D98E3A', '#5578C8', '#AE6DB0', '#4C9E9A', '#D85555'];
const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const initialState: FinanceState = {
  accounts: [
    { id: 'acc-main', name: 'المحفظة اليومية', type: 'cash', openingBalance: 2450, color: '#0C8F74' },
    { id: 'acc-bank', name: 'الحساب البنكي', type: 'bank', openingBalance: 12800, color: '#5578C8' },
    { id: 'acc-save', name: 'حساب الادخار', type: 'savings', openingBalance: 6200, color: '#D98E3A' },
  ],
  categories: [
    { id: 'cat-salary', name: 'الراتب', type: 'income', color: '#0C8F74' },
    { id: 'cat-freelance', name: 'عمل حر', type: 'income', color: '#4C9E9A' },
    { id: 'cat-food', name: 'طعام ومطاعم', type: 'expense', color: '#D85555' },
    { id: 'cat-transport', name: 'مواصلات', type: 'expense', color: '#D98E3A' },
    { id: 'cat-bills', name: 'فواتير', type: 'expense', color: '#5578C8' },
  ],
  transactions: [
    { id: 'tx-1', accountId: 'acc-bank', categoryId: 'cat-salary', type: 'income', amount: 15000, note: 'راتب شهر أغسطس', date: '2026-08-01' },
    { id: 'tx-2', accountId: 'acc-main', categoryId: 'cat-food', type: 'expense', amount: 86, note: 'غداء العمل', date: '2026-08-05' },
    { id: 'tx-3', accountId: 'acc-bank', categoryId: 'cat-bills', type: 'expense', amount: 420, note: 'فاتورة الإنترنت والكهرباء', date: '2026-08-04' },
    { id: 'tx-4', accountId: 'acc-main', categoryId: 'cat-transport', type: 'expense', amount: 120, note: 'تنقلات الأسبوع', date: '2026-08-03' },
  ],
  debts: [
    { id: 'debt-1', name: 'إيجار المنزل', amount: 3800, paid: 0, dueDate: '2026-08-28', note: 'دفعة شهر أغسطس' },
    { id: 'debt-2', name: 'بطاقة الائتمان', amount: 1250, paid: 400, dueDate: '2026-08-19', note: 'الحد الأدنى 250 ر.س' },
  ],
  loans: [
    { id: 'loan-1', name: 'سلفة أحمد', amount: 900, received: 300, dueDate: '2026-08-20', note: 'متبقي دفعتان' },
  ],
  goals: [
    { id: 'goal-1', name: 'رحلة الشتاء', target: 12000, saved: 4650, deadline: '2026-12-15', color: '#AE6DB0', status: 'active' },
    { id: 'goal-2', name: 'صندوق الطوارئ', target: 20000, saved: 13500, deadline: '2026-11-30', color: '#0C8F74', status: 'active' },
  ],
  settings: { id: 'singleton', currency: 'ر.س', darkMode: false },
};

export interface FinancialSummary {
  balance: number;
  income: number;
  expenses: number;
  netCashFlow: number;
  outstandingDebts: number;
  outstandingLoans: number;
  goalProgress: number;
  deficit: number;
}

function calculateSummary(state: FinanceState): FinancialSummary {
  const income = state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const opening = state.accounts.reduce((sum, a) => sum + a.openingBalance, 0);
  const outstandingDebts = state.debts.reduce((sum, d) => sum + Math.max(d.amount - d.paid, 0), 0);
  const outstandingLoans = state.loans.reduce((sum, l) => sum + Math.max(l.amount - l.received, 0), 0);
  const activeGoals = state.goals.filter(g => g.status === 'active');
  const goalProgress = activeGoals.length ? activeGoals.reduce((sum, g) => sum + (g.saved / Math.max(g.target, 1)) * 100, 0) / activeGoals.length : 0;
  const balance = opening + income - expenses;
  const deficit = Math.max(outstandingDebts - balance, 0);
  return { balance, income, expenses, netCashFlow: income - expenses, outstandingDebts, outstandingLoans, goalProgress, deficit };
}

interface FinanceContextValue {
  state: FinanceState;
  colors: typeof colors.light;
  isDark: boolean;
  summary: FinancialSummary;
  loaded: boolean;
  addTransaction: (item: Omit<TransactionItem, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (item: Omit<Account, 'id'>) => void;
  addDebt: (item: Omit<Debt, 'id'>) => void;
  addLoan: (item: Omit<Loan, 'id'>) => void;
  addGoal: (item: Omit<FinancialGoal, 'id' | 'status'>) => void;
  updateDebtPaid: (id: string, paid: number) => void;
  updateLoanReceived: (id: string, received: number) => void;
  updateGoalSaved: (id: string, saved: number) => void;
  setDarkMode: (value: boolean) => void;
  setCurrency: (value: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: PropsWithChildren) {
  const systemDark = useColorScheme() === 'dark';
  const [state, setState] = useState<FinanceState>(initialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setState(JSON.parse(raw) as FinanceState); } catch { setState(initialState); }
      } else {
        setState(initialState);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  const update = (fn: (prev: FinanceState) => FinanceState) => setState(prev => fn(prev));
  const value = useMemo<FinanceContextValue>(() => {
    const isDark = state.settings.darkMode ?? systemDark;
    return {
      state,
      colors: (isDark ? colors.dark : colors.light) as typeof colors.light,
      isDark,
      loaded,
      summary: calculateSummary(state),
      addTransaction: item => update(prev => ({ ...prev, transactions: [{ ...item, id: makeId() }, ...prev.transactions] })),
      deleteTransaction: id => update(prev => ({ ...prev, transactions: prev.transactions.filter(item => item.id !== id) })),
      addAccount: item => update(prev => ({ ...prev, accounts: [...prev.accounts, { ...item, id: makeId() }] })),
      addDebt: item => update(prev => ({ ...prev, debts: [{ ...item, id: makeId() }, ...prev.debts] })),
      addLoan: item => update(prev => ({ ...prev, loans: [{ ...item, id: makeId() }, ...prev.loans] })),
      addGoal: item => update(prev => ({ ...prev, goals: [{ ...item, id: makeId(), status: 'active' }, ...prev.goals] })),
      updateDebtPaid: (id, paid) => update(prev => ({ ...prev, debts: prev.debts.map(item => item.id === id ? { ...item, paid: Math.min(item.amount, Math.max(0, paid)) } : item) })),
      updateLoanReceived: (id, received) => update(prev => ({ ...prev, loans: prev.loans.map(item => item.id === id ? { ...item, received: Math.min(item.amount, Math.max(0, received)) } : item) })),
      updateGoalSaved: (id, saved) => update(prev => ({ ...prev, goals: prev.goals.map(item => item.id === id ? { ...item, saved: Math.min(item.target, Math.max(0, saved)), status: saved >= item.target ? 'completed' : 'active' } : item) })),
      setDarkMode: value => update(prev => ({ ...prev, settings: { ...prev.settings, darkMode: value } })),
      setCurrency: value => update(prev => ({ ...prev, settings: { ...prev.settings, currency: value } })),
    };
  }, [state, systemDark, loaded]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside FinanceProvider');
  return value;
}

export function formatMoney(amount: number, currency: string) {
  return `${Math.round(amount).toLocaleString('ar-SA')} ${currency}`;
}

export const categoryColor = (category: Category | undefined) => category?.color ?? PALETTE[0];
export { PALETTE };