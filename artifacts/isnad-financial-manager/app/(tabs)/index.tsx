import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, AppHeader, FormModal, IconBadge, MetricCard, ProgressBar, SectionTitle } from '@/components/FinanceUI';
import { formatMoney, useFinance } from '@/store/FinanceContext';

export default function DashboardScreen() {
  const router = useRouter();
  const { state, colors, summary, addTransaction } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const recent = state.transactions.slice(0, 3);
  const latestGoals = state.goals.slice(0, 2);
  const currency = state.settings.currency;
  return (
    <Screen>
      <AppHeader title="مرحباً بك" subtitle="إليك ملخصك المالي اليوم" action={() => setShowForm(true)} />
      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <View style={styles.balanceTop}>
          <View style={styles.balancePill}><MaterialCommunityIcons name="shield-check-outline" size={15} color={colors.primaryForeground} /><Text style={[styles.balancePillText, { color: colors.primaryForeground }]}>آمن ومحلي</Text></View>
          <Text style={[styles.balanceLabel, { color: colors.primaryForeground }]}>إجمالي الرصيد</Text>
        </View>
        <Text style={[styles.balanceValue, { color: colors.primaryForeground }]}>{formatMoney(summary.balance, currency)}</Text>
        <View style={styles.balanceBottom}><Text style={[styles.balanceHint, { color: `${colors.primaryForeground}CC` }]}>صافي التدفق هذا الشهر</Text><Text style={[styles.balanceFlow, { color: colors.primaryForeground }]}>{summary.netCashFlow >= 0 ? '+' : ''}{formatMoney(summary.netCashFlow, currency)}</Text></View>
      </View>
      {summary.deficit > 0 ? <View style={[styles.alert, { backgroundColor: `${colors.destructive}14`, borderColor: `${colors.destructive}40` }]}><MaterialCommunityIcons name="alert-circle-outline" color={colors.destructive} size={21} /><Text style={[styles.alertText, { color: colors.destructive }]}>انتبه: الالتزامات الحالية تتجاوز الرصيد المتاح بمقدار {formatMoney(summary.deficit, currency)}</Text></View> : null}
      <SectionTitle title="نظرة سريعة" />
      <View style={styles.metricsGrid}>
        <MetricCard label="الدخل" value={formatMoney(summary.income, currency)} icon="arrow-bottom-left" color={colors.primary} />
        <MetricCard label="المصروفات" value={formatMoney(summary.expenses, currency)} icon="arrow-top-right" color={colors.destructive} />
        <MetricCard label="الديون المستحقة" value={formatMoney(summary.outstandingDebts, currency)} icon="calendar-alert" color="#D98E3A" />
        <MetricCard label="لي مستحق" value={formatMoney(summary.outstandingLoans, currency)} icon="hand-coin-outline" color="#5578C8" />
      </View>
      <SectionTitle title="آخر المعاملات" action="عرض الكل" onPress={() => router.push('/(tabs)/transactions')} />
      <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {recent.map((tx, index) => {
          const category = state.categories.find(c => c.id === tx.categoryId);
          return <View key={tx.id} style={[styles.transactionRow, index < recent.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}><IconBadge icon={tx.type === 'income' ? 'arrow-bottom-left' : 'cart-outline'} color={category?.color ?? colors.primary} size={40} /><View style={styles.rowInfo}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{category?.name ?? 'معاملة'}</Text><Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{tx.note || tx.date}</Text></View><Text style={[styles.rowAmount, { color: tx.type === 'income' ? colors.primary : colors.destructive }]}>{tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount, currency)}</Text></View>;
        })}
      </View>
      <SectionTitle title="أهدافي المالية" action="كل الأهداف" onPress={() => router.push('/goals')} />
      {latestGoals.map(goal => <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.goalTop}><Text style={[styles.goalPercentage, { color: goal.color }]}>{Math.round((goal.saved / goal.target) * 100)}%</Text><View style={styles.rowInfo}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{goal.name}</Text><Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{formatMoney(goal.saved, currency)} من {formatMoney(goal.target, currency)}</Text></View><IconBadge icon="flag-checkered" color={goal.color} size={40} /></View><ProgressBar progress={(goal.saved / goal.target) * 100} color={goal.color} /></View>)}
      <Pressable onPress={() => setShowForm(true)} style={({ pressed }) => [styles.fabHint, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}><MaterialCommunityIcons name="plus" color={colors.secondaryForeground} size={19} /><Text style={[styles.fabHintText, { color: colors.secondaryForeground }]}>سجّل معاملة جديدة</Text></Pressable>
      <FormModal visible={showForm} title="معاملة جديدة" onClose={() => setShowForm(false)} onSubmit={values => addTransaction({ accountId: values.accountId, categoryId: values.categoryId, type: values.type as 'income' | 'expense', amount: Number(values.amount), note: values.note, date: new Date().toISOString().slice(0, 10) })} fields={[{ key: 'type', label: 'نوع المعاملة', choices: [{ label: 'دخل', value: 'income', color: colors.primary }, { label: 'مصروف', value: 'expense', color: colors.destructive }] }, { key: 'amount', label: 'المبلغ', placeholder: '0', keyboardType: 'decimal-pad' }, { key: 'categoryId', label: 'التصنيف', choices: state.categories.map(c => ({ label: c.name, value: c.id, color: c.color })) }, { key: 'accountId', label: 'الحساب', choices: state.accounts.map(a => ({ label: a.name, value: a.id, color: a.color })) }, { key: 'note', label: 'ملاحظة', placeholder: 'مثال: مشتريات المنزل' }]} initialValues={{ type: 'expense', categoryId: state.categories.find(c => c.type === 'expense')?.id ?? '', accountId: state.accounts[0]?.id ?? '' }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: { borderRadius: 25, padding: 21, marginBottom: 10 },
  balanceTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, opacity: 0.85 },
  balancePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#FFFFFF22' },
  balancePillText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  balanceValue: { fontFamily: 'Inter_700Bold', fontSize: 30, textAlign: 'right', marginTop: 17, letterSpacing: -0.7 },
  balanceBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 18, alignItems: 'center' },
  balanceHint: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  balanceFlow: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  alert: { flexDirection: 'row-reverse', gap: 9, alignItems: 'center', borderRadius: 15, borderWidth: 1, padding: 12, marginTop: 10 },
  alertText: { flex: 1, textAlign: 'right', fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  listCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  transactionRow: { minHeight: 73, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  rowInfo: { flex: 1, alignItems: 'flex-end' },
  rowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  rowSub: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  rowAmount: { fontFamily: 'Inter_700Bold', fontSize: 13, maxWidth: 95, textAlign: 'left' },
  goalCard: { borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 10 },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  goalPercentage: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  fabHint: { borderRadius: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 15 },
  fabHintText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});
