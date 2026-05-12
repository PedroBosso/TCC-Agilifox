import { StyleSheet, TextInput } from "react-native";
//Responsável pelo campo de input da senha, onde o usuário irá digitar sua senha para fazer login.

export function Senha() {
        return <TextInput style={styles.senha} textContentType="password" placeholder="Digite sua Senha"/>
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