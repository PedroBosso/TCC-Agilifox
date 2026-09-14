// Tela do porteiro para monitorar entradas/saídas e liberar acessos manualmente.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

type TipoPessoa = 'morador' | 'visitante' | 'entregador';
type Direcao = 'entrada' | 'saida';
type StatusAcesso = 'liberado' | 'aguardando';

interface RegistroAcesso {
    id: string;
    tipo_pessoa: TipoPessoa;
    nome: string;
    apartamento: string | null;
    direcao: Direcao;
    status: StatusAcesso;
    registrado_em: string;
}

const LABEL_TIPO: Record<TipoPessoa, string> = {
    morador: 'Morador',
    visitante: 'Visitante',
    entregador: 'Entregador',
};

const LABEL_DIRECAO: Record<Direcao, string> = {
    entrada: 'Entrada',
    saida: 'Saída',
};

function formatarHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ControleAcesso() {
    const [registros, setRegistros] = useState<RegistroAcesso[]>([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        carregarRegistros();
    }, []);

    async function carregarRegistros() {
        setCarregando(true);
        const { data, error } = await supabase
            .from('registros_acesso')
            .select('id, tipo_pessoa, nome, apartamento, direcao, status, registrado_em')
            .order('registrado_em', { ascending: false });

        if (error) {
            Alert.alert('Erro', 'Não foi possível carregar os registros de acesso.');
        } else {
            setRegistros(data ?? []);
        }
        setCarregando(false);
    }

    // Libera manualmente um acesso pendente
    const handleLiberar = async (id: string) => {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            Alert.alert('Erro', 'Não foi possível identificar o usuário logado.');
            return;
        }

        const { error } = await supabase
            .from('registros_acesso')
            .update({ status: 'liberado', liberado_por: user.id })
            .eq('id', id);

        if (error) {
            Alert.alert('Erro', 'Não foi possível liberar o acesso.');
            return;
        }

        setRegistros((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: 'liberado' } : item))
        );
        Alert.alert('Sucesso', 'Acesso liberado com sucesso!');
    };

    if (carregando) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#e49c15" />
            </View>
        );
    }

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
                    <Text style={styles.welcomeText}>Entradas e Saídas</Text>
                    <Text style={styles.welcomeSubtext}>Monitore o fluxo e libere acessos manualmente em caso de problemas.</Text>
                </View>

                {/* Lista de Registros */}
                <View style={styles.listContainer}>
                    {registros.length === 0 && (
                        <Text style={{ color: '#999999', textAlign: 'center', marginTop: 12 }}>
                            Nenhum registro de acesso ainda.
                        </Text>
                    )}
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
                                        {LABEL_TIPO[item.tipo_pessoa]}{item.apartamento ? ` • Apto ${item.apartamento}` : ''}
                                    </Text>
                                    <Text style={styles.horaText}>
                                        {LABEL_DIRECAO[item.direcao]} às {formatarHora(item.registrado_em)}
                                    </Text>
                                </View>
                            </View>

                            {/* Área de Status e Ação */}
                            <View style={styles.actionContainer}>
                                {item.status === 'aguardando' ? (
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