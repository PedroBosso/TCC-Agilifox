// src/theme/colors.ts
// 🎨 Paleta de cores centralizada
// Mude aqui e as mudanças refletem em TODO app!

export const colors = {
  // ── Cores Primárias ──
  primary: '#e49c15',      // Laranja principal (seu brand)
  primaryLight: '#f0b84a',  // Mais claro para hover/disabled
  primaryDark: '#c67e0a',   // Mais escuro para ênfase

  // ── Cores Semânticas ──
  success: '#28a745',       // Verde para sucesso
  error: '#dc3545',         // Vermelho para erro
  warning: '#ffc107',       // Amarelo para aviso
  info: '#17a2b8',          // Azul para informação

  // ── Cores Neutras ──
  background: '#f3e9d7',    // Fundo principal (seu bege)
  surface: '#ffffff',       // Branco para cards/modais
  border: '#e0e0e0',        // Cinza claro para bordas
  divider: '#d9d9d9',       // Divisor entre elementos

  // ── Cores de Texto ──
  text: '#1a1a1a',          // ← MELHORADO: melhor contraste que #000
  textSecondary: '#666666', // Texto secundário
  textTertiary: '#999999',  // Texto terciário (hints)
  textInverse: '#ffffff',   // Texto invertido (sobre escuro)

  // ── Cores de Sobreposição ──
  overlay: 'rgba(0,0,0,0.4)',        // Escuro semi-transparente
  overlayLight: 'rgba(255,255,255,0.2)', // Claro semi-transparente
  overlayOpaque: 'rgba(0,0,0,0.7)',  // Mais opaco

  // ── Estados ──
  disabled: '#cccccc',      // Desabilitado
  placeholder: '#b0b0b0',   // Placeholder de inputs
};
