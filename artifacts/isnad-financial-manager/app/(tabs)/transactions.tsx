import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppHeader, FormModal, IconBadge, SectionTitle, EmptyState } from '@/components/FinanceUI';
import { formatMoney, useFinance } from '@/store/FinanceContext';

export default function TransactionsScreen() {
  const { state, colors, addTransaction, deleteTransaction } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const currency = state.settings.currency;
  const transactions = useMemo(() => filter === 'all' ? state.transactions : state.transactions.filter(tx => tx.type === filter), [state.transactions, filter]);
  return (
    <Screen>
      <AppHeader title="المعاملات" subtitle={`${state.transactions.length} معاملة محفوظة محلياً`} action={() => setShowForm(true)} />
      <View style={styles.filters}>
        {[{ value: 'all', label: 'الكل' }, { value: 'income', label: 'الدخل' }, { value: 'expense', label: 'المصروفات' }].map(item => <Pressable key={item.value} onPress={() => setFilter(item.value as typeof filter)} style={[styles.filter, { backgroundColor: filter === item.value ? colors.primary : colors.card, borderColor: filter === item.value ? colors.primary : colors.border }]}><Text style={{ color: filter === item.value ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>{item.label}</Text></Pressable>)}
      </View>
      <SectionTitle title="سجل المعاملات" />
      {transactions.length === 0 ? <EmptyState icon="swap-vertical" title="لا توجد معاملات" description="ابدأ بتسجيل أول دخل أو مصروف لمتابعة وضعك المالي." onPress={() => setShowForm(true)} action="إضافة معاملة" /> : <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{transactions.map((tx, index) => { const category = state.categories.find(c => c.id === tx.categoryId); const account = state.accounts.find(a => a.id === tx.accountId); return <Pressable key={tx.id} onLongPress={() => Alert.alert('حذف المعاملة', 'هل تريد حذف هذه المعاملة؟', [{ text: 'إلغاء', style: 'cancel' }, { text: 'حذف', style: 'destructive', onPress: () => deleteTransaction(tx.id) }])} style={[styles.row, index < transactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}><IconBadge icon={tx.type === 'income' ? 'arrow-bottom-left' : 'arrow-top-right'} color={category?.color ?? colors.primary} size={43} /><View style={styles.info}><Text style={[styles.title, { color: colors.foreground }]}>{tx.note || category?.name || 'معاملة'}</Text><Text style={[styles.sub, { color: colors.mutedForeground }]}>{category?.name} • {account?.name} • {tx.date}</Text></View><Text style={[styles.amount, { color: tx.type === 'income' ? colors.primary : colors.destructive }]}>{tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount, currency)}</Text></Pressable>; })}</View>}
      <FormModal visible={showForm} title="معاملة جديدة" onClose={() => setShowForm(false)} onSubmit={values => addTransaction({ accountId: values.accountId, categoryId: values.categoryId, type: values.type as 'income' | 'expense', amount: Number(values.amount), note: values.note, date: new Date().toISOString().slice(0, 10) })} fields={[{ key: 'type', label: 'نوع المعاملة', choices: [{ label: 'دخل', value: 'income', color: colors.primary }, { label: 'مصروف', value: 'expense', color: colors.destructive }] }, { key: 'amount', label: 'المبلغ', placeholder: '0', keyboardType: 'decimal-pad' }, { key: 'categoryId', label: 'التصنيف', choices: state.categories.map(c => ({ label: c.name, value: c.id, color: c.color })) }, { key: 'accountId', label: 'الحساب', choices: state.accounts.map(a => ({ label: a.name, value: a.id, color: a.color })) }, { key: 'note', label: 'ملاحظة', placeholder: 'وصف مختصر' }]} initialValues={{ type: 'expense', categoryId: state.categories.find(c => c.type === 'expense')?.id ?? '', accountId: state.accounts[0]?.id ?? '' }} />
    </Screen>
  );
}
const styles = StyleSheet.create({ filters: { flexDirection: 'row-reverse', gap: 8 }, filter: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 10 }, listCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' }, row: { minHeight: 79, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 }, info: { flex: 1, alignItems: 'flex-end' }, title: { fontFamily: 'Inter_600SemiBold', fontSize: 13 }, sub: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 5, textAlign: 'right' }, amount: { fontFamily: 'Inter_700Bold', fontSize: 12, maxWidth: 100, textAlign: 'left' } });