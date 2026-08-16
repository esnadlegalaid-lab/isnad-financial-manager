import AsyncStorage from '@react-native-async-storage/async-storage';

import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useColorScheme } from 'react-native';

import colors from '@/constants/colors';

/* =========================================================
   TYPES
   ========================================================= */

export type AccountType =
  | 'cash'
  | 'bank'
  | 'card'
  | 'savings'
  | 'asset'
  | 'liability'
  | 'equity'
  | 'income'
  | 'expense';

export type AccountClass =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'income'
  | 'expense';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer';

export type GoalStatus =
  | 'active'
  | 'completed';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;

  /**
   * نوع الحساب المحاسبي الحقيقي.
   * الحسابات النقدية والبنكية والبطاقات والادخار = أصول.
   */
  accountClass: AccountClass;

  /**
   * الحسابات التي ينشئها النظام تلقائياً للتصنيفات
   * لا تظهر كمحافظ/حسابات مالية للمستخدم في الواجهة
   * عند تحديث الواجهة لاحقاً.
   */
  isSystem?: boolean;

  active?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;

  /**
   * كل تصنيف مالي حقيقي له حساب أستاذ خاص به.
   */
  ledgerAccountId?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;

  /**
   * income / expense / transfer
   */
  type: TransactionType;

  /**
   * العملية الأصلية المرتبطة بالقيد.
   */
  transactionId?: string;

  reference?: string;
}

export interface JournalLine {
  id: string;
  entryId: string;
  accountId: string;

  /**
   * لا يمكن أن يكون المدين والدائن موجبين في نفس السطر.
   */
  debit: number;
  credit: number;

  note?: string;
}

export interface TransactionItem {
  id: string;

  /**
   * الحساب الرئيسي المتأثر بالعملية.
   * في الدخل = الحساب المستلم.
   * في المصروف = الحساب المدفوع منه.
   */
  accountId: string;

  categoryId: string;

  type: TransactionType;

  amount: number;

  note: string;

  date: string;

  /**
   * القيد المحاسبي الناتج عن العملية.
   */
  journalEntryId?: string;
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

  /**
   * دفتر اليومية.
   */
  journalEntries: JournalEntry[];

  /**
   * أسطر القيود.
   */
  journalLines: JournalLine[];

  debts: Debt[];
  loans: Loan[];
  goals: FinancialGoal[];

  settings: Settings;
}

/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY =
  '@isnad_financial_manager_accounting_v1';

const OLD_STORAGE_KEY =
  '@isnad_financial_manager_v5';

/* =========================================================
   HELPERS
   ========================================================= */

const PALETTE = [
  '#0C8F74',
  '#D98E3A',
  '#5578C8',
  '#AE6DB0',
  '#4C9E9A',
  '#D85555',
];

const makeId = () =>
  `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;

const positiveAmount = (value: number) =>
  Number.isFinite(value)
    ? Math.abs(value)
    : 0;

const isValidDate = (value: string) => {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    year < 1900 ||
    year > 2200 ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false;
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const todayISO = () =>
  new Date().toISOString().slice(0, 10);

/* =========================================================
   ACCOUNT CLASS
   ========================================================= */

function inferAccountClass(
  type: AccountType
): AccountClass {
  switch (type) {
    case 'liability':
      return 'liability';

    case 'equity':
      return 'equity';

    case 'income':
      return 'income';

    case 'expense':
      return 'expense';

    case 'cash':
    case 'bank':
    case 'card':
    case 'savings':
    case 'asset':
    default:
      return 'asset';
  }
}

/* =========================================================
   INITIAL STATE
   ========================================================= */

const initialState: FinanceState = {
  accounts: [],
  categories: [],
  transactions: [],
  journalEntries: [],
  journalLines: [],
  debts: [],
  loans: [],
  goals: [],

  settings: {
    id: 'singleton',
    currency: 'YER',
    darkMode: false,
  },
};

/* =========================================================
   SUMMARY
   ========================================================= */

export interface FinancialSummary {
  balance: number;
  income: number;
  expenses: number;
  netCashFlow: number;

  outstandingDebts: number;
  outstandingLoans: number;

  goalProgress: number;

  deficit: number;

  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;

  totalDebits: number;
  totalCredits: number;

  journalBalanced: boolean;
}

/* =========================================================
   ACCOUNT BALANCE
   ========================================================= */

export function getAccountBalance(
  state: FinanceState,
  accountId: string
): number {
  const account = state.accounts.find(
    item => item.id === accountId
  );

  if (!account) {
    return 0;
  }

  const movement = state.journalLines
    .filter(line => line.accountId === accountId)
    .reduce(
      (sum, line) =>
        sum + line.debit - line.credit,
      0
    );

  /*
   * الأصول والمصروفات طبيعتها مدينة.
   * الالتزامات وحقوق الملكية والإيرادات طبيعتها دائنة.
   */
  const accountClass =
    account.accountClass ??
    inferAccountClass(account.type);

  if (
    accountClass === 'liability' ||
    accountClass === 'equity' ||
    accountClass === 'income'
  ) {
    return (
      account.openingBalance -
      movement
    );
  }

  return (
    account.openingBalance +
    movement
  );
}

/* =========================================================
   SUMMARY CALCULATION
   ========================================================= */

function calculateSummary(
  state: FinanceState
): FinancialSummary {
  const totalDebits =
    state.journalLines.reduce(
      (sum, line) => sum + line.debit,
      0
    );

  const totalCredits =
    state.journalLines.reduce(
      (sum, line) => sum + line.credit,
      0
    );

  const journalBalanced =
    Math.abs(totalDebits - totalCredits) <
    0.000001;

  const totalAssets =
    state.accounts
      .filter(
        account =>
          account.accountClass === 'asset'
      )
      .reduce(
        (sum, account) =>
          sum +
          getAccountBalance(
            state,
            account.id
          ),
        0
      );

  const totalLiabilities =
    state.accounts
      .filter(
        account =>
          account.accountClass ===
          'liability'
      )
      .reduce(
        (sum, account) =>
          sum +
          getAccountBalance(
            state,
            account.id
          ),
        0
      );

  const totalEquity =
    state.accounts
      .filter(
        account =>
          account.accountClass ===
          'equity'
      )
      .reduce(
        (sum, account) =>
          sum +
          getAccountBalance(
            state,
            account.id
          ),
        0
      );

  const income =
    state.transactions
      .filter(
        transaction =>
          transaction.type === 'income'
      )
      .reduce(
        (sum, transaction) =>
          sum + transaction.amount,
        0
      );

  const expenses =
    state.transactions
      .filter(
        transaction =>
          transaction.type === 'expense'
      )
      .reduce(
        (sum, transaction) =>
          sum + transaction.amount,
        0
      );

  const outstandingDebts =
    state.debts.reduce(
      (sum, debt) =>
        sum +
        Math.max(
          debt.amount - debt.paid,
          0
        ),
      0
    );

  const outstandingLoans =
    state.loans.reduce(
      (sum, loan) =>
        sum +
        Math.max(
          loan.amount - loan.received,
          0
        ),
      0
    );

  const activeGoals =
    state.goals.filter(
      goal =>
        goal.status === 'active'
    );

  const goalProgress =
    activeGoals.length
      ? activeGoals.reduce(
          (sum, goal) =>
            sum +
            (goal.saved /
              Math.max(
                goal.target,
                1
              )) *
              100,
          0
        ) / activeGoals.length
      : 0;

  const balance = totalAssets;

  const deficit = Math.max(
    outstandingDebts - balance,
    0
  );

  return {
    balance,
    income,
    expenses,
    netCashFlow:
      income - expenses,

    outstandingDebts,
    outstandingLoans,

    goalProgress,
    deficit,

    totalAssets,
    totalLiabilities,
    totalEquity,

    totalDebits,
    totalCredits,

    journalBalanced,
  };
}

/* =========================================================
   CONTEXT TYPE
   ========================================================= */

interface FinanceContextValue {
  state: FinanceState;

  colors: typeof colors.light;

  isDark: boolean;

  summary: FinancialSummary;

  loaded: boolean;

  storageError: string | null;

  /* -----------------------------
     Transactions
     ----------------------------- */

  addTransaction: (
    item: Omit<
      TransactionItem,
      'id' | 'journalEntryId'
    >
  ) => void;

  addTransfer: (item: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    note?: string;
  }) => void;

  deleteTransaction: (
    id: string
  ) => void;

  /* -----------------------------
     Journal
     ----------------------------- */

  addJournalEntry: (item: {
    date: string;
    description: string;
    lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      note?: string;
    }>;
    type?: TransactionType;
    reference?: string;
  }) => string;

  getAccountBalance: (
    accountId: string
  ) => number;

  /* -----------------------------
     Categories
     ----------------------------- */

  addCategory: (
    item: Omit<
      Category,
      'id' | 'ledgerAccountId'
    >
  ) => void;

  /* -----------------------------
     Accounts
     ----------------------------- */

  addAccount: (
    item: Omit<Account, 'id'>
  ) => void;

  /* -----------------------------
     Debts / Loans / Goals
     ----------------------------- */

  addDebt: (
    item: Omit<Debt, 'id'>
  ) => void;

  addLoan: (
    item: Omit<Loan, 'id'>
  ) => void;

  addGoal: (
    item: Omit<
      FinancialGoal,
      'id' | 'status'
    >
  ) => void;

  updateDebtPaid: (
    id: string,
    paid: number
  ) => void;

  updateLoanReceived: (
    id: string,
    received: number
  ) => void;

  updateGoalSaved: (
    id: string,
    saved: number
  ) => void;

  /* -----------------------------
     Settings
     ----------------------------- */

  setDarkMode: (
    value: boolean
  ) => void;

  setCurrency: (
    value: string
  ) => void;
}

/* =========================================================
   CONTEXT
   ========================================================= */

const FinanceContext =
  createContext<FinanceContextValue | null>(
    null
  );

/* =========================================================
   NORMALIZATION / MIGRATION
   ========================================================= */

function normalizeState(
  data: Partial<FinanceState>
): FinanceState {
  const accounts =
    Array.isArray(data.accounts)
      ? data.accounts.map(account => ({
          ...account,

          accountClass:
            account.accountClass ??
            inferAccountClass(
              account.type
            ),

          active:
            account.active ??
            true,
        }))
      : [];

  const categories =
    Array.isArray(data.categories)
      ? data.categories.map(category => ({
          ...category,
        }))
      : [];

  return {
    accounts,

    categories,

    transactions:
      Array.isArray(data.transactions)
        ? data.transactions
        : [],

    journalEntries:
      Array.isArray(data.journalEntries)
        ? data.journalEntries
        : [],

    journalLines:
      Array.isArray(data.journalLines)
        ? data.journalLines
        : [],

    debts:
      Array.isArray(data.debts)
        ? data.debts
        : [],

    loans:
      Array.isArray(data.loans)
        ? data.loans
        : [],

    goals:
      Array.isArray(data.goals)
        ? data.goals
        : [],

    settings: {
      ...initialState.settings,
      ...(data.settings ?? {}),
      id: 'singleton',
    },
  };
}

/* =========================================================
   LEGACY MIGRATION
   ========================================================= */

/**
 * يقوم بتحويل البيانات القديمة إلى النواة الجديدة.
 *
 * البيانات القديمة كانت تحتوي على:
 *
 * transaction:
 * income / expense
 *
 * أما النظام الجديد فيولد قيداً مزدوجاً:
 *
 * دخل:
 *   مدين  الحساب
 *   دائن  حساب الإيراد
 *
 * مصروف:
 *   مدين  حساب المصروف
 *   دائن  الحساب
 */
function migrateLegacyState(
  legacy: Partial<FinanceState>
): FinanceState {
  const base =
    normalizeState(legacy);

  const accounts = [...base.accounts];

  const categories =
    [...base.categories];

  const journalEntries: JournalEntry[] =
    [...base.journalEntries];

  const journalLines: JournalLine[] =
    [...base.journalLines];

  const transactions: TransactionItem[] =
    [...base.transactions];

  const findOrCreateCategoryAccount = (
    category: Category
  ): string => {
    if (category.ledgerAccountId) {
      return category.ledgerAccountId;
    }

    const accountId =
      `system_category_${category.id}`;

    const alreadyExists =
      accounts.some(
        account =>
          account.id === accountId
      );

    if (!alreadyExists) {
      accounts.push({
        id: accountId,

        name:
          category.type === 'income'
            ? `إيراد: ${category.name}`
            : `مصروف: ${category.name}`,

        type:
          category.type === 'income'
            ? 'income'
            : 'expense',

        openingBalance: 0,

        color: category.color,

        accountClass:
          category.type === 'income'
            ? 'income'
            : 'expense',

        isSystem: true,

        active: true,
      });
    }

    category.ledgerAccountId =
      accountId;

    return accountId;
  };

  for (
    const transaction of transactions
  ) {
    /*
     * لا ننشئ قيداً جديداً إذا كان موجوداً.
     */
    if (transaction.journalEntryId) {
      continue;
    }

    const category =
      categories.find(
        item =>
          item.id ===
          transaction.categoryId
      );

    const mainAccount =
      accounts.find(
        item =>
          item.id ===
          transaction.accountId
      );

    if (
      !category ||
      !mainAccount
    ) {
      continue;
    }

    const amount =
      positiveAmount(
        transaction.amount
      );

    if (
      amount <= 0 ||
      !isValidDate(
        transaction.date
      )
    ) {
      continue;
    }

    const categoryAccountId =
      findOrCreateCategoryAccount(
        category
      );

    const entryId =
      makeId();

    const entry: JournalEntry = {
      id: entryId,

      date:
        transaction.date,

      description:
        transaction.note ||
        category.name,

      type:
        transaction.type,

      transactionId:
        transaction.id,
    };

    journalEntries.push(entry);

    if (
      transaction.type ===
      'income'
    ) {
      journalLines.push(
        {
          id: makeId(),

          entryId,

          accountId:
            mainAccount.id,

          debit: amount,

          credit: 0,

          note:
            transaction.note,
        },
        {
          id: makeId(),

          entryId,

          accountId:
            categoryAccountId,

          debit: 0,

          credit: amount,

          note:
            transaction.note,
        }
      );
    } else if (
      transaction.type ===
      'expense'
    ) {
      journalLines.push(
        {
          id: makeId(),

          entryId,

          accountId:
            categoryAccountId,

          debit: amount,

          credit: 0,

          note:
            transaction.note,
        },
        {
          id: makeId(),

          entryId,

          accountId:
            mainAccount.id,

          debit: 0,

          credit: amount,

          note:
            transaction.note,
        }
      );
    }

    transaction.journalEntryId =
      entryId;
  }

  return {
    ...base,

    accounts,

    categories,

    transactions,

    journalEntries,

    journalLines,
  };
}

/* =========================================================
   PROVIDER
   ========================================================= */

export function FinanceProvider({
  children,
}: PropsWithChildren) {
  const systemDark =
    useColorScheme() === 'dark';

  const [state, setState] =
    useState<FinanceState>(
      initialState
    );

  const [loaded, setLoaded] =
    useState(false);

  const [
    storageError,
    setStorageError,
  ] = useState<string | null>(
    null
  );

  /* =======================================================
     LOAD
     ======================================================= */

  useEffect(() => {
    let active = true;

    const loadState =
      async () => {
        try {
          let saved =
            await AsyncStorage.getItem(
              STORAGE_KEY
            );

          /*
           * توافق مع الإصدار القديم.
           */
          if (!saved) {
            saved =
              await AsyncStorage.getItem(
                OLD_STORAGE_KEY
              );
          }

          if (!active) {
            return;
          }

          if (saved) {
            try {
              const parsed =
                JSON.parse(saved);

              const migrated =
                migrateLegacyState(
                  parsed
                );

              setState(
                migrated
              );
            } catch (error) {
              console.error(
                'Invalid financial data:',
                error
              );

              /*
               * لا نمسح البيانات القديمة.
               * فقط نبدأ بحالة آمنة.
               */
              setStorageError(
                'تعذر قراءة البيانات المحفوظة.'
              );

              setState(
                initialState
              );
            }
          } else {
            setState(
              initialState
            );
          }
        } catch (error) {
          console.error(
            'Failed to load financial data:',
            error
          );

          if (active) {
            setStorageError(
              'تعذر الوصول إلى التخزين المحلي.'
            );

            setState(
              initialState
            );
          }
        } finally {
          if (active) {
            setLoaded(true);
          }
        }
      };

    loadState();

    return () => {
      active = false;
    };
  }, []);

  /* =======================================================
     SAVE
     ======================================================= */

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const saveState =
      async () => {
        try {
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
          );

          setStorageError(null);
        } catch (error) {
          console.error(
            'Failed to save financial data:',
            error
          );

          setStorageError(
            'تعذر حفظ البيانات على الجهاز.'
          );
        }
      };

    saveState();
  }, [state, loaded]);

  /* =======================================================
     STATE UPDATE
     ======================================================= */

  const update = (
    fn: (
      previous: FinanceState
    ) => FinanceState
  ) => {
    setState(
      previous =>
        fn(previous)
    );
  };

  /* =======================================================
     PROVIDER VALUE
     ======================================================= */

  const value =
    useMemo<FinanceContextValue>(
      () => {
        const isDark =
          state.settings.darkMode ??
          systemDark;

        /* =================================================
           ADD JOURNAL ENTRY
           ================================================= */

        const addJournalEntry = (
          item: {
            date: string;
            description: string;
            lines: Array<{
              accountId: string;
              debit: number;
              credit: number;
              note?: string;
            }>;
            type?: TransactionType;
            reference?: string;
          }
        ) => {
          if (
            !isValidDate(
              item.date
            )
          ) {
            throw new Error(
              'التاريخ غير صالح. استخدم YYYY-MM-DD.'
            );
          }

          if (
            !item.description.trim()
          ) {
            throw new Error(
              'وصف القيد مطلوب.'
            );
          }

          if (
            !item.lines ||
            item.lines.length <
              2
          ) {
            throw new Error(
              'القيد يجب أن يحتوي على سطرين على الأقل.'
            );
          }

          let totalDebit = 0;
          let totalCredit = 0;

          for (
            const line of item.lines
          ) {
            const debit =
              positiveAmount(
                line.debit
              );

            const credit =
              positiveAmount(
                line.credit
              );

            if (
              debit > 0 &&
              credit > 0
            ) {
              throw new Error(
                'لا يمكن أن يكون السطر مديناً ودائناً في الوقت نفسه.'
              );
            }

            if (
              debit === 0 &&
              credit === 0
            ) {
              throw new Error(
                'يوجد سطر قيد بلا قيمة.'
              );
            }

            const accountExists =
              state.accounts.some(
                account =>
                  account.id ===
                  line.accountId
              );

            if (
              !accountExists
            ) {
              throw new Error(
                'الحساب المحدد في القيد غير موجود.'
              );
            }

            totalDebit +=
              debit;

            totalCredit +=
              credit;
          }

          if (
            Math.abs(
              totalDebit -
                totalCredit
            ) > 0.000001
          ) {
            throw new Error(
              `القيد غير متوازن. المدين ${totalDebit} والدائن ${totalCredit}.`
            );
          }

          const entryId =
            makeId();

          update(
            previous => ({
              ...previous,

              journalEntries: [
                {
                  id: entryId,

                  date:
                    item.date,

                  description:
                    item.description.trim(),

                  type:
                    item.type ??
                    'transfer',

                  reference:
                    item.reference,
                },

                ...previous.journalEntries,
              ],

              journalLines: [
                ...item.lines.map(
                  line => ({
                    id: makeId(),

                    entryId,

                    accountId:
                      line.accountId,

                    debit:
                      positiveAmount(
                        line.debit
                      ),

                    credit:
                      positiveAmount(
                        line.credit
                      ),

                    note:
                      line.note,
                  })
                ),

                ...previous.journalLines,
              ],
            })
          );

          return entryId;
        };

        /* =================================================
           ADD TRANSACTION
           ================================================= */

        const addTransaction = (
          item: Omit<
            TransactionItem,
            'id' |
              'journalEntryId'
          >
        ) => {
          if (
            item.type ===
            'transfer'
          ) {
            throw new Error(
              'استخدم addTransfer للتحويلات.'
            );
          }

          if (
            !isValidDate(
              item.date
            )
          ) {
            throw new Error(
              'تاريخ العملية غير صالح.'
            );
          }

          const amount =
            positiveAmount(
              item.amount
            );

          if (
            amount <= 0
          ) {
            throw new Error(
              'مبلغ العملية يجب أن يكون أكبر من صفر.'
            );
          }

          const category =
            state.categories.find(
              category =>
                category.id ===
                item.categoryId
            );

          if (!category) {
            throw new Error(
              'التصنيف غير موجود.'
            );
          }

          if (
            category.type !==
            item.type
          ) {
            throw new Error(
              'نوع التصنيف لا يتوافق مع نوع العملية.'
            );
          }

          const account =
            state.accounts.find(
              account =>
                account.id ===
                item.accountId
            );

          if (!account) {
            throw new Error(
              'الحساب غير موجود.'
            );
          }

          let categoryAccountId =
            category.ledgerAccountId;

          /*
           * إنشاء حساب أستاذ للتصنيف
           * عند الحاجة.
           */
          if (
            !categoryAccountId
          ) {
            categoryAccountId =
              `system_category_${category.id}`;

            const systemAccount: Account =
              {
                id:
                  categoryAccountId,

                name:
                  category.type ===
                  'income'
                    ? `إيراد: ${category.name}`
                    : `مصروف: ${category.name}`,

                type:
                  category.type ===
                  'income'
                    ? 'income'
                    : 'expense',

                openingBalance:
                  0,

                color:
                  category.color,

                accountClass:
                  category.type ===
                  'income'
                    ? 'income'
                    : 'expense',

                isSystem:
                  true,

                active:
                  true,
              };

            update(
              previous => ({
                ...previous,

                accounts:
                  previous.accounts.some(
                    existing =>
                      existing.id ===
                      systemAccount.id
                  )
                    ? previous.accounts
                    : [
                        ...previous.accounts,
                        systemAccount,
                      ],

                categories:
                  previous.categories.map(
                    existing =>
                      existing.id ===
                      category.id
                        ? {
                            ...existing,
                            ledgerAccountId:
                              categoryAccountId,
                          }
                        : existing
                  ),
              })
            );
          }

          const transactionId =
            makeId();

          const journalEntryId =
            makeId();

          const entry: JournalEntry =
            {
              id:
                journalEntryId,

              date:
                item.date,

              description:
                item.note?.trim() ||
                category.name,

              type:
                item.type,

              transactionId,
            };

          const transaction: TransactionItem =
            {
              ...item,

              id:
                transactionId,

              amount,

              journalEntryId,
            };

          let lines: JournalLine[];

          if (
            item.type ===
            'income'
          ) {
            /*
             * دخل:
             *
             * مدين  الحساب المستلم
             * دائن  الإيراد
             */
            lines = [
              {
                id: makeId(),

                entryId:
                  journalEntryId,

                accountId:
                  account.id,

                debit:
                  amount,

                credit: 0,

                note:
                  item.note,
              },

              {
                id: makeId(),

                entryId:
                  journalEntryId,

                accountId:
                  categoryAccountId,

                debit: 0,

                credit:
                  amount,

                note:
                  item.note,
              },
            ];
          } else {
            /*
             * مصروف:
             *
             * مدين  المصروف
             * دائن  الحساب المدفوع منه
             */
            lines = [
              {
                id: makeId(),

                entryId:
                  journalEntryId,

                accountId:
                  categoryAccountId,

                debit:
                  amount,

                credit: 0,

                note:
                  item.note,
              },

              {
                id: makeId(),

                entryId:
                  journalEntryId,

                accountId:
                  account.id,

                debit: 0,

                credit:
                  amount,

                note:
                  item.note,
              },
            ];
          }

          update(
            previous => ({
              ...previous,

              transactions: [
                transaction,

                ...previous.transactions,
              ],

              journalEntries: [
                entry,

                ...previous.journalEntries,
              ],

              journalLines: [
                ...lines,

                ...previous.journalLines,
              ],
            })
          );
        };

        /* =================================================
           TRANSFER
           ================================================= */

        const addTransfer = (
          item: {
            fromAccountId: string;
            toAccountId: string;
            amount: number;
            date: string;
            note?: string;
          }
        ) => {
          if (
            item.fromAccountId ===
            item.toAccountId
          ) {
            throw new Error(
              'لا يمكن التحويل إلى نفس الحساب.'
            );
          }

          if (
            !isValidDate(
              item.date
            )
          ) {
            throw new Error(
              'تاريخ التحويل غير صالح.'
            );
          }

          const amount =
            positiveAmount(
              item.amount
            );

          if (
            amount <= 0
          ) {
            throw new Error(
              'مبلغ التحويل يجب أن يكون أكبر من صفر.'
            );
          }

          const from =
            state.accounts.find(
              account =>
                account.id ===
                item.fromAccountId
            );

          const to =
            state.accounts.find(
              account =>
                account.id ===
                item.toAccountId
            );

          if (!from || !to) {
            throw new Error(
              'حساب التحويل غير موجود.'
            );
          }

          const entryId =
            makeId();

          const transactionId =
            makeId();

          const entry: JournalEntry =
            {
              id:
                entryId,

              date:
                item.date,

              description:
                item.note?.trim() ||
                'تحويل بين الحسابات',

              type:
                'transfer',

              transactionId,
            };

          const transaction: TransactionItem =
            {
              id:
                transactionId,

              accountId:
                item.fromAccountId,

              categoryId:
                '',

              type:
                'transfer',

              amount,

              note:
                item.note ??
                '',

              date:
                item.date,

              journalEntryId:
                entryId,
            };

          /*
           * التحويل:
           *
           * مدين  الحساب المستلم
           * دائن  الحساب المرسل
           */
          const lines: JournalLine[] =
            [
              {
                id: makeId(),

                entryId,

                accountId:
                  item.toAccountId,

                debit:
                  amount,

                credit: 0,

                note:
                  item.note,
              },

              {
                id: makeId(),

                entryId,

                accountId:
                  item.fromAccountId,

                debit: 0,

                credit:
                  amount,

                note:
                  item.note,
              },
            ];

          update(
            previous => ({
              ...previous,

              transactions: [
                transaction,

                ...previous.transactions,
              ],

              journalEntries: [
                entry,

                ...previous.journalEntries,
              ],

              journalLines: [
                ...lines,

                ...previous.journalLines,
              ],
            })
          );
        };

        /* =================================================
           DELETE TRANSACTION
           ================================================= */

        const deleteTransaction = (
          id: string
        ) => {
          const transaction =
            state.transactions.find(
              item =>
                item.id === id
            );

          if (!transaction) {
            return;
          }

          const journalEntryId =
            transaction.journalEntryId;

          update(
            previous => ({
              ...previous,

              transactions:
                previous.transactions.filter(
                  item =>
                    item.id !== id
                ),

              journalEntries:
                journalEntryId
                  ? previous.journalEntries.filter(
                      entry =>
                        entry.id !==
                        journalEntryId
                    )
                  : previous.journalEntries,

              journalLines:
                journalEntryId
                  ? previous.journalLines.filter(
                      line =>
                        line.entryId !==
                        journalEntryId
                    )
                  : previous.journalLines,
            })
          );
        };

        /* =================================================
           ADD CATEGORY
           ================================================= */

        const addCategory = (
          item: Omit<
            Category,
            'id' |
              'ledgerAccountId'
          >
        ) => {
          if (
            !item.name.trim()
          ) {
            throw new Error(
              'اسم التصنيف مطلوب.'
            );
          }

          /*
           * منع تكرار التصنيف في نفس النوع.
           */
          const duplicate =
            state.categories.some(
              category =>
                category.type ===
                  item.type &&
                category.name
                  .trim()
                  .toLowerCase() ===
                  item.name
                    .trim()
                    .toLowerCase()
            );

          if (duplicate) {
            throw new Error(
              'هذا التصنيف موجود مسبقاً.'
            );
          }

          const categoryId =
            makeId();

          const ledgerAccountId =
            `system_category_${categoryId}`;

          const accountClass =
            item.type === 'income'
              ? 'income'
              : 'expense';

          const category: Category =
            {
              ...item,

              id:
                categoryId,

              name:
                item.name.trim(),

              ledgerAccountId,
            };

          const account: Account =
            {
              id:
                ledgerAccountId,

              name:
                item.type ===
                'income'
                  ? `إيراد: ${item.name.trim()}`
                  : `مصروف: ${item.name.trim()}`,

              type:
                item.type ===
                'income'
                  ? 'income'
                  : 'expense',

              openingBalance:
                0,

              color:
                item.color,

              accountClass,

              isSystem:
                true,

              active:
                true,
            };

          update(
            previous => ({
              ...previous,

              categories: [
                ...previous.categories,
                category,
              ],

              accounts: [
                ...previous.accounts,
                account,
              ],
            })
          );
        };

        /* =================================================
           ADD ACCOUNT
           ================================================= */

        const addAccount = (
          item: Omit<Account, 'id'>
        ) => {
          if (
            !item.name.trim()
          ) {
            throw new Error(
              'اسم الحساب مطلوب.'
            );
          }

          const duplicate =
            state.accounts.some(
              account =>
                !account.isSystem &&
                account.name
                  .trim()
                  .toLowerCase() ===
                  item.name
                    .trim()
                    .toLowerCase()
            );

          if (duplicate) {
            throw new Error(
              'يوجد حساب بهذا الاسم بالفعل.'
            );
          }

          const accountClass =
            item.accountClass ??
            inferAccountClass(
              item.type
            );

          update(
            previous => ({
              ...previous,

              accounts: [
                ...previous.accounts,

                {
                  ...item,

                  id:
                    makeId(),

                  name:
                    item.name.trim(),

                  accountClass,

                  active:
                    item.active ??
                    true,

                  isSystem:
                    item.isSystem ??
                    false,
                },
              ],
            })
          );
        };

        /* =================================================
           DEBT
           ================================================= */

        const addDebt = (
          item: Omit<Debt, 'id'>
        ) => {
          if (
            !item.name.trim()
          ) {
            throw new Error(
              'اسم الدين مطلوب.'
            );
          }

          if (
            !isValidDate(
              item.dueDate
            )
          ) {
            throw new Error(
              'تاريخ استحقاق الدين غير صالح.'
            );
          }

          const amount =
            positiveAmount(
              item.amount
            );

          if (
            amount <= 0
          ) {
            throw new Error(
              'قيمة الدين يجب أن تكون أكبر من صفر.'
            );
          }

          update(
            previous => ({
              ...previous,

              debts: [
                {
                  ...item,

                  id:
                    makeId(),

                  amount,

                  paid:
                    Math.min(
                      amount,
                      Math.max(
                        0,
                        item.paid
                      )
                    ),
                },

                ...previous.debts,
              ],
            })
          );
        };

        /* =================================================
           LOAN
           ================================================= */

        const addLoan = (
          item: Omit<Loan, 'id'>
        ) => {
          if (
            !item.name.trim()
          ) {
            throw new Error(
              'اسم القرض مطلوب.'
            );
          }

          if (
            !isValidDate(
              item.dueDate
            )
          ) {
            throw new Error(
              'تاريخ استحقاق القرض غير صالح.'
            );
          }

          const amount =
            positiveAmount(
              item.amount
            );

          if (
            amount <= 0
          ) {
            throw new Error(
              'قيمة القرض يجب أن تكون أكبر من صفر.'
            );
          }

          update(
            previous => ({
              ...previous,

              loans: [
                {
                  ...item,

                  id:
                    makeId(),

                  amount,

                  received:
                    Math.min(
                      amount,
                      Math.max(
                        0,
                        item.received
                      )
                    ),
                },

                ...previous.loans,
              ],
            })
          );
        };

        /* =================================================
           GOAL
           ================================================= */

        const addGoal = (
          item: Omit<
            FinancialGoal,
            'id' |
              'status'
          >
        ) => {
          if (
            !item.name.trim()
          ) {
            throw new Error(
              'اسم الهدف مطلوب.'
            );
          }

          if (
            !isValidDate(
              item.deadline
            )
          ) {
            throw new Error(
              'موعد الهدف غير صالح.'
            );
          }

          if (
            item.target <= 0
          ) {
            throw new Error(
              'قيمة الهدف يجب أن تكون أكبر من صفر.'
            );
          }

          update(
            previous => ({
              ...previous,

              goals: [
                {
                  ...item,

                  id:
                    makeId(),

                  saved:
                    Math.min(
                      Math.max(
                        0,
                        item.saved
                      ),
                      item.target
                    ),

                  status:
                    item.saved >=
                    item.target
                      ? 'completed'
                      : 'active',
                },

                ...previous.goals,
              ],
            })
          );
        };

        /* =================================================
           DEBT PAYMENT
           ================================================= */

        const updateDebtPaid = (
          id: string,
          paid: number
        ) => {
          update(
            previous => ({
              ...previous,

              debts:
                previous.debts.map(
                  item =>
                    item.id === id
                      ? {
                          ...item,

                          paid:
                            Math.min(
                              item.amount,
                              Math.max(
                                0,
                                paid
                              )
                            ),
                        }
                      : item
                ),
            })
          );
        };

        /* =================================================
           LOAN RECEIVED
           ================================================= */

        const updateLoanReceived = (
          id: string,
          received: number
        ) => {
          update(
            previous => ({
              ...previous,

              loans:
                previous.loans.map(
                  item =>
                    item.id === id
                      ? {
                          ...item,

                          received:
                            Math.min(
                              item.amount,
                              Math.max(
                                0,
                                received
                              )
                            ),
                        }
                      : item
                ),
            })
          );
        };

        /* =================================================
           GOAL SAVED
           ================================================= */

        const updateGoalSaved = (
          id: string,
          saved: number
        ) => {
          update(
            previous => ({
              ...previous,

              goals:
                previous.goals.map(
                  item =>
                    item.id === id
                      ? {
                          ...item,

                          saved:
                            Math.min(
                              item.target,
                              Math.max(
                                0,
                                saved
                              )
                            ),

                          status:
                            saved >=
                            item.target
                              ? 'completed'
                              : 'active',
                        }
                      : item
                ),
            })
          );
        };

        /* =================================================
           SETTINGS
           ================================================= */

        const setDarkMode = (
          value: boolean
        ) => {
          update(
            previous => ({
              ...previous,

              settings: {
                ...previous.settings,

                darkMode:
                  value,
              },
            })
          );
        };

        const setCurrency = (
          value: string
        ) => {
          update(
            previous => ({
              ...previous,

              settings: {
                ...previous.settings,

                currency:
                  value.trim() ||
                  'YER',
              },
            })
          );
        };

        return {
          state,

          colors:
            (isDark
              ? colors.dark
              : colors.light) as typeof colors.light,

          isDark,

          loaded,

          storageError,

          summary:
            calculateSummary(
              state
            ),

          addTransaction,

          addTransfer,

          deleteTransaction,

          addJournalEntry,

          getAccountBalance:
            (accountId: string) =>
              getAccountBalance(
                state,
                accountId
              ),

          addCategory,

          addAccount,

          addDebt,

          addLoan,

          addGoal,

          updateDebtPaid,

          updateLoanReceived,

          updateGoalSaved,

          setDarkMode,

          setCurrency,
        };
      },

      [
        state,
        systemDark,
        loaded,
        storageError,
      ]
    );

  return (
    <FinanceContext.Provider
      value={value}
    >
      {children}
    </FinanceContext.Provider>
  );
}

/* =========================================================
   HOOK
   ========================================================= */

export function useFinance() {
  const value =
    useContext(
      FinanceContext
    );

  if (!value) {
    throw new Error(
      'useFinance must be used inside FinanceProvider'
    );
  }

  return value;
}

/* =========================================================
   MONEY FORMAT
   ========================================================= */

export function formatMoney(
  amount: number,
  currency: string
) {
  return `${Math.round(
    amount
  ).toLocaleString(
    'ar-SA'
  )} ${currency}`;
}

/* =========================================================
   CATEGORY COLOR
   ========================================================= */

export const categoryColor = (
  category:
    | Category
    | undefined
) =>
  category?.color ??
  PALETTE[0];

export { PALETTE };

/* =========================================================
   DATE HELPERS
   ========================================================= */

export {
  isValidDate,
  todayISO,
};
