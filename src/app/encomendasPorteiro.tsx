/**
 * CadastrarEncomendaPorteiro.tsx
 *
 * Tela para o porteiro registrar a chegada de encomendas aos moradores.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CadastrarEncomendaPorteiro() {
    const [morador, setMorador] = useState('');
    const [apartamento, setApartamento] = useState('');
    const [codigo, setCodigo] = useState('');
    const [transportadora, setTransportadora] = useState('');
    const [observacao, setObservacao] = useState('');

    const handleCadastrar = () => {
        if (!morador || !apartamento) {
            alert('Por favor, preencha pelo menos o nome do morador e o apartamento.');
            return;
        }

        alert(`Encomenda cadastrada com sucesso para o apartamento ${apartamento}! (Simulação)`);
        setMorador('');
        setApartamento('');
        setCodigo('');
        setTransportadora('');
        setObservacao('');
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
                    <Text style={styles.welcomeText}>Nova Encomenda 📦</Text>
                    <Text style={styles.welcomeSubtext}>Registre a chegada de um pacote para notificar o morador.</Text>
                </View>

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
                            pressed && { opacity: 0.85 }
                        ]}
                        onPress={handleCadastrar}
                    >
                        <Text style={styles.submitButtonText}>Cadastrar e avisar morador</Text>
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