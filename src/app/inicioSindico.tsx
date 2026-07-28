import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const Routes = {
    comunicados: './comunicados',
    ocorrencias: './ocorrenciasSindico',
    prestacaoContas: './prestacaoContas',
    financeiro: './financeiro',
    ambiente: './ambienteSindico',
    assembleia: './assembleiasSindico',
    achadosperdidos: './achados',
    carros: './carrosSindico',
    moradores: './moradores',
    pets: './petsPorteiro',
    encomendas: './encomendasSindico',
    visitantes: './visitantesSindico',
    contas: './contas'
} as const;

const menuItems = [
    { id: '1', label: 'Comunicados', icon: require('../../assets/images/megafone.png'), color: '#e49c42', route: Routes.comunicados },
    { id: '2', label: 'Ocorrências', icon: require('../../assets/images/aviso.png'), color: '#e8a815', route: Routes.ocorrencias },
    { id: '3', label: 'Prestação de Contas', icon: require('../../assets/images/pagamentos.png'), color: '#e49c15', route: Routes.prestacaoContas },
    { id: '4', label: 'Financeiro', icon: require('../../assets/images/pagamentos.png'), color: '#e8a842', route: Routes.financeiro },
    { id: '5', label: 'Reservas de ambiente', icon: require('../../assets/images/calendario.png'), color: '#e49c42', route: Routes.ambiente },
    { id: '6', label: 'Assembleia online', icon: require('../../assets/images/meet.png'), color: '#e8a815', route: Routes.assembleia },
    { id: '7', label: 'Achados e perdidos', icon: require('../../assets/images/lupa.png'), color: '#e49c15', route: Routes.achadosperdidos },
    { id: '8', label: 'Estacionamento', icon: require('../../assets/images/carro.png'), color: '#e8a842', route: Routes.carros },
    { id: '9', label: 'Moradores', icon: require('../../assets/images/pessoas.png'), color: '#e49c42', route: Routes.moradores },
    { id: '10', label: 'Pets do condomínio', icon: require('../../assets/images/animal.png'), color: '#e8a815', route: Routes.pets },
    { id: '11', label: 'Encomendas', icon: require('../../assets/images/pacote.png'), color: '#e49c15', route: Routes.encomendas },
    { id: '12', label: 'Visitantes', icon: require('../../assets/images/pessoas.png'), color: '#e8a842', route: Routes.visitantes },
    { id: '12', label: 'Contas', icon: require('../../assets/images/contas.png'), color: '#e8a842', route: Routes.contas },
];

export default function InicioSindico(){
    return (
        <View style={styles.container}>
           {/* Header fixo */}
           <View style={styles.header}>
               <View>
                   <Text style={styles.headerLabel}>Painel do Síndico</Text>
                   <Text style={styles.headerText}>Jardim das Flores</Text>
               </View>
               <View style={styles.iconGroup}>
                   <Image style={styles.int} source={require('../../assets/images/int.png')} />
                   <View style={styles.userIconWrapper}>
                       <Image style={styles.userIcon} source={require('../../assets/images/user.png')} />
                   </View>
               </View>
           </View>

           {/* Conteúdo scrollável */}
           <ScrollView 
               style={styles.scrollContent}
               showsVerticalScrollIndicator={true}
               scrollEventThrottle={16}
           >
               {/* Welcome Section */}
               <View style={styles.welcomeSection}>
                   <Text style={styles.welcomeText}>Bem-vindo(a), Síndico(a)! 👋</Text>
                   <Text style={styles.welcomeSubtext}>O que você gostaria de gerenciar hoje?</Text>
               </View>

               {/* Grid de Botões */}
               <View style={styles.buttonContainer}>
                   {menuItems.map((item) => (
                       <Pressable 
                           key={item.id}
                           style={({ pressed }) => [
                               styles.button,
                               { backgroundColor: item.color },
                               pressed && styles.buttonPressed
                           ]}
                           onPress={() => item.route && router.push(item.route)}
                       >
                           <View style={styles.iconWrapper}>
                               <Image source={item.icon} style={styles.image} />
                           </View>
                           <Text style={styles.buttonText}>{item.label}</Text>
                       </Pressable>
                   ))}
               </View>

               {/* Espaço extra ao final para padding */}
               <View style={styles.bottomPadding} />
           </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f3e9d7',
        flex: 1,
        paddingTop: 45,
        paddingHorizontal: 15,
    },
    scrollContent: {
        flex: 1,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(228, 156, 21, 0.2)',
    },
    headerLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#999999',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1a1a1a',
    },
    iconGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    int: {
        width: 50,
        height: 50,
        borderRadius: 10,
    },
    userIconWrapper: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#e49c15',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#e49c15',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    userIcon: {
        width: '150%',
        height: '150%',
    },
    welcomeSection: {
        marginBottom: 24,
        paddingHorizontal: 5,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    welcomeSubtext: {
        fontSize: 14,
        color: '#666666',
        fontWeight: '500',
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        width: '48%',
        height: 140,
        borderRadius: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    iconWrapper: {
        width: 72,
        height: 72,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '200%',
        height: '200%',
        resizeMode: 'contain',
    },
    buttonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
        textAlign: 'center',
        marginTop: 8,
    },
    bottomPadding: {
        height: 20,
    },
});