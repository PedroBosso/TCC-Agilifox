// src/theme/typography.ts
// 🔤 Escala tipográfica padronizada
// Substitui tamanhos aleatórios por sistema consistente

export const typography = {
  // ── Headings ──
  h1: {
    fontSize: 32,
    fontWeight: '900' as const,  // Extra bold para títulos
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,  // Bold
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
  },

  // ── Body ──
  body: {
    fontSize: 16,
    fontWeight: '400' as const,  // Regular
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,  // Semi-bold
    lineHeight: 24,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: '500' as const,  // Médio
    lineHeight: 24,
  },

  // ── Small ──
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  smallBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },

  // ── Tiny (labels, captions) ──
  tiny: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  tinyBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },

  // ── Micro (badges, small text) ──
  micro: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
};

// ── Exemplo de uso ──
// import { typography } from '@/theme/typography';
// import { StyleSheet } from 'react-native';
//
// const styles = StyleSheet.create({
//   title: typography.h2,
//   description: typography.body,
//   label: typography.small,
//   caption: typography.tiny,
// });
