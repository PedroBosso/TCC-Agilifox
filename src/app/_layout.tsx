import { Stack } from 'expo-router';

// Cada tela desenha o próprio cabeçalho, por isso o nativo fica desligado.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
