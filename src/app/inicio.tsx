import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function Inicio(){
return( //Topo do código
    <View style = {styles.container}>
        <View style={styles.header}>
            <Text style={styles.headerText}>Apto. XXXX X</Text>
            <View style={styles.iconGroup}>
                <Image style={styles.int} source={require('../../assets/images/int.png')} />
                <Image style={styles.int} source={require('../../assets/images/user.png')} />
            </View>
        </View>
        <Text style={styles.welcomeText}>Bem vindo               XXXX!</Text>
        <View style={styles.buttonContainer}>
            {/* Base do código */}
            <Pressable style={styles.button} onPress={() => router.push('/comunicados')}>
                <Image source={require('../../assets/images/megafone.png')} style={styles.image} />
                <Text style={styles.buttonText}>Comunicados</Text>
            </Pressable>

            <Pressable style={styles.button3}>
                <Image source={require('../../assets/images/pacote.png')} style={styles.image} />
                <Text style={styles.buttonText}>Minhas encomendas</Text>
            </Pressable>

            <Pressable style={styles.button5}>
                <Image source={require('../../assets/images/pessoas.png')} style={styles.image} />
                <Text style={styles.buttonText}>Meus visitantes</Text>
            </Pressable>

            <Pressable style={styles.button6}>
                <Image source={require('../../assets/images/aviso.png')} style={styles.image} />
                <Text style={styles.buttonText}>Ocorrências</Text>
            </Pressable>

            <Pressable style={styles.button8}>
                <Image source={require('../../assets/images/contas.png')} style={styles.image} />
                <Text style={styles.buttonText}>Prestação de contas</Text>
            </Pressable>

            <Pressable style={styles.button1}>
                <Image source={require('../../assets/images/calendario.png')} style={styles.image} />
                <Text style={styles.buttonText}>Reservas de ambiente</Text>
            </Pressable>

            <Pressable style={styles.button4}>
                <Image source={require('../../assets/images/lupa.png')} style={styles.image} />
                <Text style={styles.buttonText}>Achados e perdidos</Text>
            </Pressable>

            <Pressable style={styles.button2}>
                <Image source={require('../../assets/images/meet.png')} style={styles.image} />
                <Text style={styles.buttonText}>Assembleia online</Text>
            </Pressable>

            <Pressable style={styles.button7}>
                <Image source={require('../../assets/images/pagamentos.png')} style={styles.image} />
                <Text style={styles.buttonText}>Pagamentos</Text>
            </Pressable>

            <Pressable style={styles.button9}>
                <Image source={require('../../assets/images/cotas.png')} style={styles.image} />
                <Text style={styles.buttonText}>Cotas pendentes</Text>
            </Pressable>

            <Pressable style={styles.button10} onPress={() => router.push('/telaCad')}>
                <Image source={require('../../assets/images/pessoas.png')} style={styles.image} />
                <Text style={styles.buttonText}>Cadastro</Text>
            </Pressable>
        </View>

</View>
    )
}
const styles = StyleSheet.create({
    welcomeText: {
        fontSize: 35,
        fontWeight: 'thin',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    up:{
        flexDirection: 'row',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingRight: 20,
    },
    iconGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    int:{
        width: 60,
        height: 60,
    },
    container: {
        backgroundColor: '#f3e9d7',
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: 45,
        paddingLeft: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    headerText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000',
    },
    button: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,

    },
    button1: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,
    },
    button2: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,
    },
    button3: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,
    },
    button4: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,
    },
    button5: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,
    },
    button6: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,
    },
    button7: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,
    },
    button8: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,
    },
    button9: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,
    },
    button10: {
        flexDirection: 'column',
        alignItems: 'center',
        borderBlockColor: "#000000",
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        width: 90,
        height: 100,
        margin: 10,
    },
    buttonText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#000000',
        marginTop: 20,
    },
    image: {
        width: '60%',
        height: '60%',
    }
});


