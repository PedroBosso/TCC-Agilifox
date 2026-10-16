import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface BotaoVoltarProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Seta de voltar usada em todas as telas. Se não houver tela anterior, leva para o início do usuário.
export default function BotaoVoltar({ onPress, style }: BotaoVoltarProps) {
  function voltar() {
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <Pressable
      onPress={voltar}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [styles.botao, pressed && styles.botaoPressionado, style]}
    >
      <Ionicons name="chevron-back" size={24} color="#2B2823" />
    </Pressable>
  );
}

interface TituloComVoltarProps {
  children: ReactNode;
  onVoltar?: () => void;
}

// Coloca a seta de voltar à esquerda dos textos do cabeçalho.
export function TituloComVoltar({ children, onVoltar }: TituloComVoltarProps) {
  return (
    <View style={styles.linha}>
      <BotaoVoltar onPress={onVoltar} />
      <View style={styles.textos}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexGrow: 1,
    flexShrink: 1,
  },
  textos: {
    flexShrink: 1,
  },
  botao: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  botaoPressionado: {
    opacity: 0.6,
  },
});
