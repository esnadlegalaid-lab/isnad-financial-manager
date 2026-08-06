import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, AppHeader, FormModal, IconBadge, SectionTitle, EmptyState } from '@/components/FinanceUI';
import { useFinance } from '@/store/FinanceContext';

export default function CategoriesScreen() {
  const router = useRouter();
  const { state, colors, addCategory } = useFinance();
  const [showForm, setShowForm] = useState(false);
  return (
    <Screen>
      <AppHeader title="التصنيفات" subtitle="نظّم دخلك ومصروفاتك" onBack={() => router.back()} action={() => setShowForm(true)} />
      <SectionTitle title="تصنيفات الدخل" />
      {state.categories.filter(category => category.type === 'income').length === 0 ? (
        <EmptyState icon="arrow-bottom-left" title="لا توجد تصنيفات دخل" description="أضف تصنيفاً مثل راتب أو عمل حر." onPress={() => setShowForm(true)} action="إضافة تصنيف" />
      ) : (
        state.categories.filter(category => category.type === 'income').map(category => <CategoryRow key={category.id} name={category.name} icon="arrow-bottom-left" color={category.color} colors={colors} />)
      )}
      <SectionTitle title="تصنيفات المصروفات" />
      {state.categories.filter(category => category.type === 'expense').length === 0 ? (
        <EmptyState icon="arrow-top-right" title="لا توجد تصنيفات مصروفات" description="أضف تصنيفاً مثل طعام أو مواصلات." onPress={() => setShowForm(true)} action="إضافة تصنيف" />
      ) : (
        state.categories.filter(category => category.type === 'expense').map(category => <CategoryRow key={category.id} name={category.name} icon="arrow-top-right" color={category.color} colors={colors} />)
      )}
      <FormModal
        visible={showForm}
        title="إضافة تصنيف"
        onClose={() => setShowForm(false)}
        onSubmit={values => addCategory({ name: values.name, type: values.type as 'income' | 'expense', color: values.type === 'income' ? colors.primary : colors.destructive })}
        fields={[
          { key: 'name', label: 'اسم التصنيف', placeholder: 'مثال: راتب أو طعام' },
          { key: 'type', label: 'نوع التصنيف', choices: [{ label: 'دخل', value: 'income', color: colors.primary }, { label: 'مصروف', value: 'expense', color: colors.destructive }] },
        ]}
        initialValues={{ type: 'expense' }}
      />
    </Screen>
  );
}

function CategoryRow({ name, icon, color, colors }: { name: string; icon: 'arrow-bottom-left' | 'arrow-top-right'; color: string; colors: ReturnType<typeof useFinance>['colors'] }) {
  return <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}><IconBadge icon={icon} color={color} size={42} /><Text style={[styles.name, { color: colors.foreground }]}>{name}</Text></View>;
}

const styles = StyleSheet.create({
  row: { minHeight: 66, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, marginBottom: 9 },
  name: { flex: 1, textAlign: 'right', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});