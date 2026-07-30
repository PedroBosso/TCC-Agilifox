/**
 * ControleAcesso.tsx
 *
 * Tela para o porteiro monitorar entradas e saídas e fazer a liberação
 * manual de moradores ou visitantes, mantendo o padrão visual do app.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Dados simulados para o TCC
const dadosIniciais = [
    { id: '1', nome: 'Carlos Silva', tipo: 'Morador', apto: '101 - Bloco A', status: 'Liberado', hora: '09:15', direcao: 'Entrada' },
    { id: '2', nome: 'Mariana Souza', tipo: 'Visitante', apto: '205 - Bloco B', status: 'Aguardando', hora: '09:22', direcao: 'Entrada' },
    { id: '3', nome: 'João (Sedex)', tipo: 'Entregador', apto: '302 - Bloco A', status: 'Aguardando', hora: '09:25', direcao: 'Entrada' },
    { id: '4', nome: 'Ana Costa', tipo: 'Morador', apto: '404 - Bloco C', status: 'Liberado', hora: '09:10', direcao: 'Saída' },
];

export default function ControleAcesso() {
    const [registros, setRegistros] = useState(dadosIniciais);

    // Função para simular a liberação manual
    const handleLiberar = (id: string) => {
        setRegistros((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, status: 'Liberado' } : item
            )
        );
        alert('Acesso liberado com sucesso!');
    };

    return (
        <View style={styles.container}>
            {/* Header fixo */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerLabel}>Portaria</Text>
                    <Text style={styles.headerText}>Controle de Acesso</Text>
                </View>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Voltar</Text>
                </Pressable>
            </View>

            {/* Conteúdo scrollável */}
            <ScrollView 
                style={styles.scrollContent}
                showsVerticalScrollIndicator={true}
            >
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeText}>Entradas e Saídas 🚪</Text>
                    <Text style={styles.welcomeSubtext}>Monitore o fluxo e libere acessos manualmente em caso de problemas.</Text>
                </View>

                {/* Lista de Registros */}
                <View style={styles.listContainer}>
                    {registros.map((item) => (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.cardInfo}>
                                <View style={styles.iconWrapper}>
                                    {/* Reaproveitando o ícone de pessoas */}
                                    <Image 
                                        source={require('../../assets/images/pessoas.png')} 
                                        style={styles.imageIcon} 
                                    />
                                </View>
                                <View style={styles.textContent}>
                                    <Text style={styles.nomeText}>{item.nome}</Text>
                                    <Text style={styles.detalheText}>
                                        {item.tipo} • Apto {item.apto}
                                    </Text>
                                    <Text style={styles.horaText}>
                                        {item.direcao} às {item.hora}
                                    </Text>
                                </View>
                            </View>

                            {/* Área de Status e Ação */}
                            <View style={styles.actionContainer}>
                                {item.status === 'Aguardando' ? (
                                    <Pressable 
                                        style={({ pressed }) => [
                                            styles.btnLiberar,
                                            pressed && { opacity: 0.8 }
                                        ]}
                                        onPress={() => handleLiberar(item.id)}
                                    >
                                        <Text style={styles.btnLiberarText}>Liberar</Text>
                                    </Pressable>
                                ) : (
                                    <View style={styles.badgeLiberado}>
                                        <Text style={styles.badgeText}>Liberado</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>
        </View>
    );
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
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#e49c15',
        borderRadius: 8,
    },
    backButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 12,
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
    listContainer: {
        width: '100%',
        gap: 12,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconWrapper: {
        width: 50,
        height: 50,
        backgroundColor: 'rgba(228, 156, 21, 0.15)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    imageIcon: {
        width: '60%',
        height: '60%',
        resizeMode: 'contain',
    },
    textContent: {
        flex: 1,
    },
    nomeText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    detalheText: {
        fontSize: 13,
        color: '#666666',
        fontWeight: '500',
        marginBottom: 2,
    },
    horaText: {
        fontSize: 11,
        color: '#999999',
    },
    actionContainer: {
        marginLeft: 10,
    },
    btnLiberar: {
        backgroundColor: '#e49c15',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        shadowColor: '#e49c15',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },
    btnLiberarText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
    },
    badgeLiberado: {
        backgroundColor: '#e9ecef',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    badgeText: {
        color: '#666666',
        fontSize: 12,
        fontWeight: '700',
    },
    bottomPadding: {
        height: 20,
    },
});