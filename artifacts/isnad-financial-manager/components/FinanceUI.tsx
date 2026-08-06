import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '@/store/FinanceContext';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const { colors } = useFinance();
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 92 }]}>
      {children}
    </View>
  );
  return scroll ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>{content}</ScrollView> : content;
}

export function AppHeader({ title, subtitle, onBack, action, actionIcon = 'plus' }: { title: string; subtitle?: string; onBack?: () => void; action?: () => void; actionIcon?: IconName }) {
  const { colors } = useFinance();
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {onBack ? (
        <Pressable onPress={onBack} style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
          <MaterialCommunityIcons name="arrow-right" size={21} color={colors.foreground} />
        </Pressable>
      ) : action ? (
        <Pressable onPress={action} style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}>
          <MaterialCommunityIcons name={actionIcon} size={21} color={colors.primaryForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const { colors } = useFinance();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionText, { color: colors.foreground }]}>{title}</Text>
      {action && onPress ? <Pressable onPress={onPress}><Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function IconBadge({ icon, color, size = 44 }: { icon: IconName; color: string; size?: number }) {
  return (
    <View style={[styles.iconBadge, { width: size, height: size, borderRadius: size / 3, backgroundColor: `${color}20` }]}>
      <MaterialCommunityIcons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

export function MetricCard({ label, value, icon, color, wide = false }: { label: string; value: string; icon: IconName; color: string; wide?: boolean }) {
  const { colors } = useFinance();
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }, wide && styles.metricWide]}>
      <IconBadge icon={icon} color={color} size={36} />
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

export function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const { colors } = useFinance();
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
      <View style={[styles.progressFill, { backgroundColor: color, width: `${Math.max(0, Math.min(progress, 100))}%` }]} />
    </View>
  );
}

export function EmptyState({ icon, title, description, onPress, action }: { icon: IconName; title: string; description: string; onPress?: () => void; action?: string }) {
  const { colors } = useFinance();
  return (
    <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <IconBadge icon={icon} color={colors.primary} size={54} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>{description}</Text>
      {onPress && action ? <Button title={action} onPress={onPress} compact /> : null}
    </View>
  );
}

export function Button({ title, onPress, compact = false, variant = 'primary', icon }: { title: string; onPress: () => void; compact?: boolean; variant?: 'primary' | 'secondary' | 'danger'; icon?: IconName }) {
  const { colors } = useFinance();
  const backgroundColor = variant === 'primary' ? colors.primary : variant === 'danger' ? `${colors.destructive}16` : colors.secondary;
  const textColor = variant === 'primary' ? colors.primaryForeground : variant === 'danger' ? colors.destructive : colors.secondaryForeground;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, compact && styles.buttonCompact, { backgroundColor, opacity: pressed ? 0.78 : 1 }]}>
      {icon ? <MaterialCommunityIcons name={icon} size={17} color={textColor} /> : null}
      <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

type FormField = { key: string; label: string; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'decimal-pad'; choices?: { label: string; value: string; color?: string }[] };
export function FormModal({ visible, title, fields, initialValues, submitLabel = 'حفظ', onClose, onSubmit }: { visible: boolean; title: string; fields: FormField[]; initialValues?: Record<string, string>; submitLabel?: string; onClose: () => void; onSubmit: (values: Record<string, string>) => void }) {
  const { colors } = useFinance();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const [error, setError] = useState('');
  const fieldKey = fields.map(f => `${f.key}:${f.choices?.map(c => c.value).join(',') ?? ''}`).join('|');
  const defaults = useMemo(() => initialValues ?? {}, [fieldKey]);
  React.useEffect(() => { if (visible) { setValues(defaults); setError(''); } }, [visible, defaults]);
  const submit = () => {
    const missing = fields.find(field => !values[field.key]?.trim());
    if (missing) { setError(`يرجى تعبئة حقل ${missing.label}`); return; }
    onSubmit(values);
    onClose();
  };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.background, paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
            <Pressable onPress={onClose}><MaterialCommunityIcons name="close" size={23} color={colors.mutedForeground} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {fields.map(field => (
              <View key={field.key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{field.label}</Text>
                {field.choices ? (
                  <View style={styles.choiceRow}>
                    {field.choices.map(choice => {
                      const selected = values[field.key] === choice.value;
                      return <Pressable key={choice.value} onPress={() => setValues(prev => ({ ...prev, [field.key]: choice.value }))} style={[styles.choice, { backgroundColor: selected ? (choice.color ?? colors.primary) : colors.card, borderColor: selected ? (choice.color ?? colors.primary) : colors.border }]}><Text style={{ color: selected ? colors.primaryForeground : colors.foreground, fontWeight: '700', fontSize: 13 }}>{choice.label}</Text></Pressable>;
                    })}
                  </View>
                ) : (
                  <TextInput
                    value={values[field.key] ?? ''}
                    onChangeText={value => setValues(prev => ({ ...prev, [field.key]: value }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType={field.keyboardType ?? 'default'}
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
                    textAlign="right"
                  />
                )}
              </View>
            ))}
            {error ? <Text style={[styles.formError, { color: colors.destructive }]}>{error}</Text> : null}
            <Button title={submitLabel} onPress={submit} icon="check" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function LoadingView() {
  const { colors } = useFinance();
  return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { flexGrow: 1 },
  header: { minHeight: 66, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerCopy: { alignItems: 'flex-end', flex: 1 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 },
  iconButton: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginLeft: 12 },
  sectionTitle: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 13 },
  sectionText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  sectionAction: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  iconBadge: { alignItems: 'center', justifyContent: 'center' },
  metricCard: { width: '48.3%', minHeight: 134, borderRadius: 19, borderWidth: 1, padding: 14, marginBottom: 10 },
  metricWide: { width: '100%' },
  metricLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 10, textAlign: 'right' },
  metricValue: { fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 5, textAlign: 'right' },
  progressTrack: { height: 8, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  empty: { borderWidth: 1, borderRadius: 20, padding: 26, alignItems: 'center', marginTop: 8 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 14 },
  emptyDescription: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 21, marginTop: 7, marginBottom: 15 },
  button: { minHeight: 51, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 17 },
  buttonCompact: { minHeight: 43, paddingHorizontal: 18, marginTop: 8 },
  buttonText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, maxHeight: '91%' },
  modalHandle: { width: 42, height: 4, borderRadius: 4, backgroundColor: '#B8C3BF', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  field: { marginBottom: 15 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textAlign: 'right', marginBottom: 7 },
  input: { height: 49, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontFamily: 'Inter_500Medium', fontSize: 15 },
  choiceRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 42, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  formError: { textAlign: 'right', fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: -4 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export const uiStyles = styles;