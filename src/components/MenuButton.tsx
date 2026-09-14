// Botão de menu reutilizável com suporte a variações

import {
    Image,
    ImageSourcePropType,
    Pressable,
    StyleSheet,
    Text,
    ViewStyle
} from 'react-native';
import { colors, spacing, typography } from '../theme';

interface MenuButtonProps {
  icon: ImageSourcePropType;
  label: string;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  testID?: string;
}

export function MenuButton({
  icon,
  label,
  onPress,
  size = 'medium',
  variant = 'primary',
  style,
  testID,
}: MenuButtonProps) {
  const sizeMap = {
    small: { width: 75, height: 85, iconSize: 40 },
    medium: { width: 100, height: 110, iconSize: 50 },
    large: { width: 120, height: 130, iconSize: 60 },
  };

  const currentSize = sizeMap[size];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        {
          width: currentSize.width,
          height: currentSize.height,
        },
        pressed && styles.pressed,
        style,
      ]}
      testID={testID}
    >
      <Image
        source={icon}
        style={[
          styles.icon,
          { width: currentSize.iconSize, height: currentSize.iconSize },
        ]}
      />
      <Text
        style={[styles.label, size === 'small' && styles.labelSmall]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3, // Android
  },

  // ── Variante Principal (com borda) ──
  primary: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  // ── Variante Secundária (preenchida) ──
  secondary: {
    backgroundColor: colors.primaryLight,
    borderWidth: 0,
  },

  // ── Estado Pressionado ──
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },

  // ── Ícone ──
  icon: {
    resizeMode: 'contain',
  },

  // ── Label ──
  label: {
    ...typography.tiny,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  labelSmall: {
    fontSize: 11, // Menor para botões pequenos
  },
});

// Exemplo de uso:
// <MenuButton icon={require('@/assets/images/megafone.png')} label="Comunicados" onPress={...} />
