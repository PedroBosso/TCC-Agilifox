# 📱 Dicas Rápidas de Mobile UX/UI

Otimizações específicas para melhorar a experiência em celulares.

---

## 🎯 Área de Toque Mínima

**Guideline WCAG:** 48x48 dp (density-independent pixels)

### ❌ Antes (muito pequeno)
```typescript
<Pressable style={{ width: 30, height: 30 }}>
  <Text>X</Text>
</Pressable>
```

### ✅ Depois
```typescript
<Pressable style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
  <Text>X</Text>
</Pressable>
```

---

## 🔤 Tamanho Mínimo de Fonte

**Guideline:** Corpo de texto mínimo 16px (para evitar zoom automático do iOS)

### ❌ Antes
```typescript
<Text style={{ fontSize: 12 }}>Clique aqui</Text>
```

### ✅ Depois
```typescript
<Text style={{ fontSize: 16 }}>Clique aqui</Text>
```

---

## 🎨 Contraste de Cores

**Guideline WCAG AA:** Mínimo 4.5:1 para texto

### ❌ Ruim
- Texto `#666` em fundo `#f3e9d7` = ~3.2:1 ❌
- Texto `#000` em fundo `#f3e9d7` = ~9.8:1 ✅

### ✅ Use nossos cores
```typescript
import { colors } from '@/theme';

// Bom contraste
<Text style={{ color: colors.text }}>Seu texto</Text> // #1a1a1a
```

---

## 📐 Espaçamento e Margens

**Guideline:** Mínimo 8px entre elementos tocáveis

```typescript
// ✅ Bom espaçamento
<View style={{ gap: spacing.md }}> {/* 16px */}
  <Button onPress={...} />
  <Button onPress={...} />
</View>
```

---

## ⚡ Feedback Imediato

Usuários devem **sempre** saber que tocaram algo.

### ✅ Estados de Pressão
```typescript
<Pressable
  style={({ pressed }) => [
    styles.button,
    pressed && {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
    },
  ]}
  onPress={handlePress}
>
  <Text>Pressione-me</Text>
</Pressable>
```

### ✅ Estados de Carregamento
```typescript
{isLoading ? (
  <ActivityIndicator color={colors.primary} />
) : (
  <Text>Enviando...</Text>
)}
```

---

## 🛡️ Proteção contra Cliques Duplos

```typescript
// src/hooks/useClickDebounce.ts
import { useRef } from 'react';

export function useClickDebounce(callback: () => void, delay: number = 300) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedClick = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(callback, delay);
  };

  return debouncedClick;
}

// Uso:
const handleSubmit = useClickDebounce(() => {
  // Seu código aqui - só executará uma vez
}, 300);

<Pressable onPress={handleSubmit}>
  <Text>Enviar (protegido contra duplos cliques)</Text>
</Pressable>
```

---

## 🌗 Teclado Virtual (iOS/Android)

### ❌ Problema
```typescript
// Teclado esconde o input
<TextInput style={{ marginBottom: 10 }} />
```

### ✅ Solução
```typescript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <ScrollView
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
    <TextInput ... />
  </ScrollView>
</KeyboardAvoidingView>
```

---

## 🔄 Refresh/Pull-to-Refresh

```typescript
// Em listas (FlatList, ScrollView)
<FlatList
  data={items}
  onRefresh={handleRefresh}
  refreshing={isLoading}
  showsVerticalScrollIndicator={false}
/>
```

---

## 📍 Estado Seguro (Safe Area)

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function MeuComponente() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,    // Evita notch/statusbar
        paddingBottom: insets.bottom, // Evita home indicator
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {/* Seu conteúdo seguro */}
    </View>
  );
}
```

---

## 🖼️ Imagens Otimizadas

### ❌ Ruim
```typescript
<Image
  source={require('@/assets/large-image.png')}
  style={{ width: 100, height: 100 }} // Carrega em 2000x2000!
/>
```

### ✅ Melhor
```typescript
<Image
  source={require('@/assets/large-image.png')}
  style={{ width: 100, height: 100 }}
  resizeMode="cover" // Corta em vez de distorcer
  testID="profile-image"
/>
```

---

## ♿ Acessibilidade

### ✅ Adicionar labels descritivos
```typescript
<Pressable
  accessible={true}
  accessibilityLabel="Excluir visitante"
  accessibilityHint="Clique para remover da lista"
  onPress={handleDelete}
>
  <Text>✕</Text>
</Pressable>
```

### ✅ Cores semânticas
```typescript
// Não confie APENAS em cor
<View
  style={{
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error, // Adiciona variação visual
  }}
>
  <Text>⚠️ Erro: Campo obrigatório</Text>
</View>
```

---

## 📊 Checklist de UX/UI Mobile

- [ ] Todos os botões têm área mínima 48x48 dp
- [ ] Texto corporal tem no mínimo 16px
- [ ] Contraste texto/fundo é 4.5:1 ou melhor
- [ ] Espaçamento mínimo 8px entre elementos
- [ ] Todos os Pressables têm feedback visual
- [ ] Formulários usam `KeyboardAvoidingView`
- [ ] Imagens têm `resizeMode` definido
- [ ] Estados vazios têm ícones + mensagens
- [ ] Carregamentos mostram ActivityIndicator
- [ ] Erros têm cores semânticas (vermelho)
- [ ] Componentes têm `accessibilityLabel`

---

**Aplicar essas práticas vai elevar muito a qualidade do seu app! 🚀**
