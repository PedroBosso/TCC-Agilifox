// src/theme/spacing.ts
// 📏 Sistema de espaçamento padronizado
// Base: 8px (mobile-first)
// Úso: spacing.sm, spacing.md, spacing.lg, etc

export const spacing = {
  xs: 4,    // Extra pequeno (gaps entre elementos)
  sm: 8,    // Pequeno (padding interno de botões)
  md: 16,   // Médio (espaço padrão entre seções)
  lg: 24,   // Grande (seções principais)
  xl: 32,   // Extra grande (topo/fundo de tela)
  xxl: 48,  // Super grande (espaços generosos)
};

// ── Shortcuts para Layout ──
export const padding = {
  horizontal: spacing.md,    // Lateral padrão: 16px
  vertical: spacing.md,      // Vertical padrão: 16px
  container: spacing.lg,     // Padding de container: 24px
};

export const margin = {
  horizontal: spacing.md,
  vertical: spacing.md,
  section: spacing.lg,       // Espaço entre seções: 24px
};

// ── Exemplo de uso ──
// import { spacing, padding } from '@/theme/spacing';
//
// const styles = StyleSheet.create({
//   container: {
//     paddingHorizontal: padding.horizontal,    // 16px
//     paddingVertical: padding.vertical,        // 16px
//     marginBottom: margin.section,             // 24px
//   },
//   gap: spacing.sm,                            // 8px
// });
