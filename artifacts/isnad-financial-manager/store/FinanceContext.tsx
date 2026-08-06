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

// Deliberately reset local persistence on every app launch. This prevents an
// older Expo Go/browser session from restoring data that should no longer be
// present in the clean release.
const STORAGE_KEY = '@isnad_financial_manager_v4_force_reset';
const PALETTE = ['#0C8F74', '#D98E3A', '#5578C8', '#AE6DB0', '#4C9E9A', '#D85555'];
const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const initialState: FinanceState = {
  accounts: [],
  categories: [],
  transactions: [],
  debts: [],
  loans: [],
  goals: [],
  settings: { id: 'singleton', currency: 'YER', darkMode: false },
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
  addCategory: (item: Omit<Category, 'id'>) => void;
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
    let active = true;
    const resetLocalStorage = async () => {
      try {
        // AsyncStorage.clear() also clears the web LocalStorage-backed store,
        // ensuring old v1/v2/v3 keys cannot be restored on the next launch.
        await AsyncStorage.clear();
      } finally {
        if (!active) return;
        setState(initialState);
        setLoaded(true);
      }
    };

    resetLocalStorage().catch(() => {
      if (!active) return;
      setState(initialState);
      setLoaded(true);
    });

    return () => {
      active = false;
    };
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
      addCategory: item => update(prev => ({ ...prev, categories: [...prev.categories, { ...item, id: makeId() }] })),
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