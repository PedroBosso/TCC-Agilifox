// src/components/EmptyState.tsx
// 📭 Componente reutilizável para estados vazios

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface EmptyStateProps {
  icon?: string; // emoji
  title: string;
  description?: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  buttonLabel,
  onButtonPress,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}

      {buttonLabel && onButtonPress && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={onButtonPress}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  icon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },

  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  buttonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
});

// ── Exemplo de uso ──
/*
import { EmptyState } from '@/components/EmptyState';

{visitantes.length === 0 ? (
  <EmptyState
    icon="👥"
    title="Nenhum visitante cadastrado"
    description="Comece adicionando o primeiro visitante"
    buttonLabel="+ Cadastrar agora"
    onButtonPress={() => router.push('/cadastro')}
  />
) : (
  <FlatList {...} />
)}
*/
