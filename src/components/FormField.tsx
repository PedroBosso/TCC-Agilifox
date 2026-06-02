// src/components/FormField.tsx
// 📝 Campo de formulário reutilizável com validação

import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  required?: boolean;
}

export function FormField({
  label,
  error,
  isPassword,
  required = false,
  ...inputProps
}: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}>*</Text>}
      </Text>

      <TextInput
        {...inputProps}
        style={[styles.input, error && styles.inputError]}
        secureTextEntry={isPassword}
        placeholderTextColor={colors.placeholder}
        editable={!inputProps.editable === false}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },

  label: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  required: {
    color: colors.error,
    marginLeft: spacing.xs,
  },

  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    // ✨ Transição suave na borda ao focar
  },

  inputError: {
    borderColor: colors.error,
    backgroundColor: '#fff5f5', // Fundo levemente avermelhado
  },

  errorText: {
    ...typography.tiny,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});

// ── Exemplo de uso ──
/*
import { FormField } from '@/components/FormField';

<FormField
  label="Email"
  placeholder="seu@email.com"
  value={email}
  onChangeText={setEmail}
  error={errors.email}
  required
/>

<FormField
  label="Senha"
  placeholder="••••••••"
  value={password}
  onChangeText={setPassword}
  error={errors.password}
  isPassword
  required
/>
*/
