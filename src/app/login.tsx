// import { fragment } from 'react'; dá pra usar no lugar do View, mas é melhor usar o View mesmo, porque o fragment não tem estilo, e o View tem, então é melhor usar o View para poder estilizar depois. 
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '../../components/input';
import { Senha } from '../../components/senha';
//Colocar o código em maiusculo
export default function Index(){ 
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Image
                source={require("../../assets/images/logo.png")}
                style={styles.illustration}
            />

            <Text style={styles.title}>Login</Text>

            <Input />
            <Senha />

            <Pressable style={styles.button} onPress={() => router.push('/inicio')}>
                <Text style={styles.buttonText}>Login</Text>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f3e9d7',
        flex: 1, 
    },
   illustration: {
        width: "100%",
        height: 300,
        resizeMode: "contain",
        marginTop: 2,
        marginHorizontal: "auto",
},
    title:{
        fontSize: 32,
        fontWeight: 900,
        textAlign: "center",
        marginTop: 1,
        marginHorizontal: "auto",
    },
    button: {
        marginHorizontal: 45,
        marginTop: 32,
        height: 40,
        borderRadius: 19,
        backgroundColor: "#e49c15",
        justifyContent: "center",
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    }
})