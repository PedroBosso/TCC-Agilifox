// Tela para o porteiro registrar a chegada de encomendas aos moradores — dados vão para o Supabase (tabela encomendas).

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

interface EncomendaPendente {
    id: string;
    apartamento: string;
    moradorNome: string;
    remetente: string | null;
    transportadora: string | null;
    codigoEntrega: string | null;
    observacao: string | null;
    status: string;
}

export default function CadastrarEncomendaPorteiro() {
    const [morador, setMorador] = useState('');
    const [apartamento, setApartamento] = useState('');
    const [codigo, setCodigo] = useState('');
    const [transportadora, setTransportadora] = useState('');
    const [observacao, setObservacao] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [pendentes, setPendentes] = useState<EncomendaPendente[]>([]);

    useEffect(() => {
        carregarPendentes();
    }, []);

    async function carregarPendentes() {
        const { data, error } = await supabase
            .from('encomendas')
            .select('id, apartamento, morador_id, morador_nome, remetente, transportadora, codigo_entrega, observacao, status')
            .in('status', ['aguardando', 'na_portaria'])
            .order('data_chegada', { ascending: false });

        if (error) return;

        const linhas = data ?? [];
        const moradorIds = Array.from(new Set(linhas.map((e: any) => e.morador_id).filter(Boolean)));
        let nomePorId = new Map<string, string>();

        if (moradorIds.length > 0) {
            const { data: perfis } = await supabase
                .from('profiles')
                .select('id, nome')
                .in('id', moradorIds);
            nomePorId = new Map((perfis ?? []).map((p) => [p.id, p.nome]));
        }

        setPendentes(
            linhas.map((e: any) => ({
                id: e.id,
                apartamento: e.apartamento,
                moradorNome: e.morador_nome ?? nomePorId.get(e.morador_id) ?? 'Morador',
                remetente: e.remetente,
                transportadora: e.transportadora,
                codigoEntrega: e.codigo_entrega,
                observacao: e.observacao,
                status: e.status,
            }))
        );
    }

    async function marcarRetirada(id: string) {
        const { error } = await supabase
            .from('encomendas')
            .update({ status: 'retirada', data_retirada: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            Alert.alert('Erro', 'Não foi possível marcar como retirada.');
            return;
        }
        carregarPendentes();
    }

    const handleCadastrar = async () => {
        if (!morador || !apartamento) {
            Alert.alert('Erro', 'Por favor, preencha pelo menos o nome do morador e o apartamento.');
            return;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        setEnviando(true);

        const { error } = await supabase.from('encomendas').insert({
            apartamento,
            morador_nome: morador,
            transportadora: transportadora || null,
            codigo_rastreio: codigo || null,
            observacao: observacao || null,
            registrado_por: user?.id ?? null,
            status: 'na_portaria',
        });

        setEnviando(false);

        if (error) {
            Alert.alert('Erro', 'Não foi possível cadastrar a encomenda.');
            return;
        }

        Alert.alert('Sucesso', `Encomenda cadastrada com sucesso para o apartamento ${apartamento}!`);
        setMorador('');
        setApartamento('');
        setCodigo('');
        setTransportadora('');
        setObservacao('');
        carregarPendentes();
    };

    return (
        <View style={styles.container}>
            {/* Header fixo */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerLabel}>Portaria</Text>
                    <Text style={styles.headerText}>Cadastrar Encomenda</Text>
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
                    <Text style={styles.welcomeText}>Encomendas</Text>
                    <Text style={styles.welcomeSubtext}>Acompanhe o que os moradores avisaram que está a caminho e registre a chegada de novos pacotes.</Text>
                </View>

                {pendentes.length > 0 && (
                    <View style={styles.listaSecao}>
                        <Text style={styles.listaTitulo}>Em aberto ({pendentes.length})</Text>

                        {pendentes.map((item) => (
                            <View key={item.id} style={styles.itemCard}>
                                <View style={styles.itemTopo}>
                                    <Text style={styles.itemApto}>{item.apartamento}</Text>
                                    <View style={[
                                        styles.itemSelo,
                                        item.status === 'aguardando' ? styles.seloAguardando : styles.seloNaPortaria
                                    ]}>
                                        <Text style={styles.itemSeloTexto}>
                                            {item.status === 'aguardando' ? 'Avisada pelo morador' : 'Na portaria'}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.itemMorador}>{item.moradorNome}</Text>

                                {(item.remetente || item.transportadora) && (
                                    <Text style={styles.itemDetalhe}>
                                        {item.remetente ?? item.transportadora}
                                    </Text>
                                )}

                                {item.observacao && (
                                    <Text style={styles.itemDetalhe}>{item.observacao}</Text>
                                )}

                                {item.codigoEntrega && (
                                    <View style={styles.codigoBox}>
                                        <Text style={styles.codigoLabel}>Código de entrega do morador</Text>
                                        <Text style={styles.codigoValor}>{item.codigoEntrega}</Text>
                                    </View>
                                )}

                                <Pressable
                                    style={({ pressed }) => [styles.botaoRetirada, pressed && { opacity: 0.85 }]}
                                    onPress={() => marcarRetirada(item.id)}
                                >
                                    <Text style={styles.botaoRetiradaTexto}>Marcar como retirada</Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}

                <Text style={styles.formTitulo}>Cadastrar nova encomenda</Text>

                {/* Formulário de Cadastro */}
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Apartamento e Bloco *</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Ex: Apto 302 - Bloco A"
                            placeholderTextColor="#999"
                            value={apartamento}
                            onChangeText={setApartamento}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nome do Morador *</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Ex: Maria Oliveira"
                            placeholderTextColor="#999"
                            value={morador}
                            onChangeText={setMorador}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Código de rastreio / etiqueta (opcional)</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Ex: BR123456789BR ou número do pacote"
                            placeholderTextColor="#999"
                            value={codigo}
                            onChangeText={setCodigo}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Empresa / transportadora</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Ex: Correios, Mercado Livre, Amazon"
                            placeholderTextColor="#999"
                            value={transportadora}
                            onChangeText={setTransportadora}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Observações / Descrição</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]}
                            placeholder="Ex: Caixa média de papelão, entregue na recepção."
                            placeholderTextColor="#999"
                            multiline={true}
                            numberOfLines={3}
                            value={observacao}
                            onChangeText={setObservacao}
                        />
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.submitButton,
                            pressed && { opacity: 0.85 },
                            enviando && { opacity: 0.6 }
                        ]}
                        onPress={handleCadastrar}
                        disabled={enviando}
                    >
                        <Text style={styles.submitButtonText}>
                            {enviando ? 'Cadastrando...' : 'Cadastrar e avisar morador'}
                        </Text>
                    </Pressable>
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
    listaSecao: {
        marginBottom: 24,
        gap: 12,
    },
    listaTitulo: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
        paddingHorizontal: 5,
    },
    itemCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    itemTopo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    itemApto: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
        flex: 1,
    },
    itemSelo: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    seloAguardando: {
        backgroundColor: '#FBEFD8',
    },
    seloNaPortaria: {
        backgroundColor: '#E7F4ED',
    },
    itemSeloTexto: {
        fontSize: 11,
        fontWeight: '700',
        color: '#555555',
    },
    itemMorador: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333333',
    },
    itemDetalhe: {
        fontSize: 13,
        color: '#666666',
    },
    codigoBox: {
        backgroundColor: '#f9f6f0',
        borderWidth: 1,
        borderColor: '#e2d4be',
        borderRadius: 10,
        padding: 10,
        marginTop: 6,
    },
    codigoLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A8377',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    codigoValor: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: 1,
        marginTop: 2,
    },
    botaoRetirada: {
        marginTop: 10,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#e49c15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    botaoRetiradaTexto: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 13,
    },
    formTitulo: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
        paddingHorizontal: 5,
        marginBottom: 12,
    },
    formContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        gap: 16,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#333333',
    },
    input: {
        backgroundColor: '#f9f6f0',
        borderWidth: 1,
        borderColor: '#e2d4be',
        borderRadius: 10,
        paddingHorizontal: 14,
        height: 48,
        fontSize: 14,
        color: '#1a1a1a',
    },
    textArea: {
        height: 80,
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: '#e49c15',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#e49c15',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    bottomPadding: {
        height: 20,
    },
});