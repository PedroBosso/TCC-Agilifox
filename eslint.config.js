// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Regras do React Compiler que chegaram com o eslint-config-expo do SDK 56.
    // Elas apontam o padrão de buscar dados no useEffect usado em todas as
    // telas: como a gravação do estado acontece depois de um await, a regra não
    // consegue verificar e assume o pior. São sugestões de otimização, não erros
    // de funcionamento.
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
