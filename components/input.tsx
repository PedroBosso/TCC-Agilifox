import { StyleSheet, TextInput } from "react-native";
// Responsável pelo campo de input do email, onde o usuário irá digitar seu email para fazer login.

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function Input({ value, onChangeText, placeholder = 'Digite seu Email' }: InputProps) {
  return (
    <TextInput
      style={styles.input}
      textContentType="emailAddress"
      keyboardType="email-address"
      autoCapitalize="none"
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 19,
    marginHorizontal: 45,
    marginTop: 32,
    paddingHorizontal: 16,
  },
});