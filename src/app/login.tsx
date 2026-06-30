import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '../../components/input';
import { Senha } from '../../components/senha';

const Routes = {
    inicio: './inicio',
    cadastro: './cadastro',
} as const;

export default function Index(){ 

    return (
        <View style={styles.container}>
            {/* Background decorativo */}
            <View style={styles.decorativeCircle} />
            
            {/* Logo e título */}
            <View style={styles.headerSection}>
                <Image
                    source={require("../../assets/images/logo.png")}
                    style={styles.illustration}
                />
                <Text style={styles.title}>Bem vindo</Text>
                <Text style={styles.subtitle}>Faça seu login para continuar</Text>
            </View>

            {/* Formulário */}
            <View style={styles.formSection}>
                <Input />
                <Senha />

                <Pressable 
                    style={({ pressed }) => [
                        styles.button,
                        pressed && styles.buttonPressed
                    ]} 
                    onPress={() => router.push(Routes.inicio)}
                >
                    <Text style={styles.buttonText}>Login</Text>
                </Pressable>
            </View>

            {/* Footer com link cadastro */}
            <View style={styles.footerSection}>
                <Text style={styles.footerText}>
                    Não tem uma conta? 
                    <Text 
                        style={styles.linkText} 
                        onPress={() => router.push(Routes.cadastro)}
                    >
                        {' '}Cadastre-se aqui
                    </Text>
                </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f3e9d7',
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    decorativeCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(228, 156, 21, 0.08)',
        top: -100,
        right: -100,
    },
    headerSection: {
        alignItems: 'center',
        marginTop: 20,
        zIndex: 1,
    },
    illustration: {
        width: 280,
        height: 280,
        resizeMode: "contain",
        marginBottom: 20,
        transform: [{ scale: 1.5 }],
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        textAlign: "center",
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        fontWeight: '500',
    },
    formSection: {
        flex: 1,
        justifyContent: 'center',
        width: '100%',
    },
    button: {
        marginTop: 28,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#e49c15',
        justifyContent: "center",
        alignItems: "center",
        shadowColor: '#e49c15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonPressed: {
        backgroundColor: '#c67e0a',
        shadowOpacity: 0.15,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    footerSection: {
        alignItems: 'center',
        marginBottom: 10,
    },
    footerText: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        fontWeight: '500',
    },
    linkText: {
        color: '#e49c15',
        fontWeight: '700',
    }
})