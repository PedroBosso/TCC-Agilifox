import { StyleSheet, TextInput } from "react-native";
// Responsável pelo campo de input da senha, onde o usuário irá digitar sua senha para fazer login.

interface SenhaProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function Senha({ value, onChangeText, placeholder = 'Digite sua Senha' }: SenhaProps) {
  return (
    <TextInput
      style={styles.senha}
      secureTextEntry
      textContentType="password"
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
    />
  );
}

const styles = StyleSheet.create({
  senha: {
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 19,
    marginHorizontal: 45,
    marginTop: 32,
    paddingHorizontal: 16,
  },
})