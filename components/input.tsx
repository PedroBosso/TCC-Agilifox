import { StyleSheet, TextInput } from "react-native";
//Responsável pelo campo de input do email, onde o usuário irá digitar seu email para fazer login.

export function Input() {
    return <TextInput style={styles.input} textContentType="emailAddress" placeholder="Digite seu Email"/>

}

const styles = StyleSheet.create({
    input: {
        backgroundColor: '#fff',
        height: 50,
        borderRadius: 19,
        marginHorizontal: 45,
        marginTop: 32,
        paddingHorizontal: 16,
    }

})