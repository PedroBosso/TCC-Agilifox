/**
 * AdicionarCamerasSindico.tsx
 *
 * Tela para o síndico cadastrar e gerenciar câmeras do condomínio,
 * mantendo a identidade visual do painel do síndico.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AdicionarCamerasSindico() {
    const [nomeCam, setNomeCam] = useState('');
    const [localCam, setLocalCam] = useState('');
    const [urlCam, setUrlCam] = useState('');

    const handleSalvar = () => {
        // Como não há banco de dados ainda, apenas limpamos ou alertamos
        alert('Câmera cadastrada com sucesso! (Simulação)');
        setNomeCam('');
        setLocalCam('');
        setUrlCam('');
    };

    return (
        <View style={styles.container}>
            {/* Header fixo */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerLabel}>Painel do Síndico</Text>
                    <Text style={styles.headerText}>Gerenciar Câmeras</Text>
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
                    <Text style={styles.welcomeText}>Adicionar Nova Câmera ➕</Text>
                    <Text style={styles.welcomeSubtext}>Insira os dados do dispositivo para integrá-lo ao sistema.</Text>
                </View>

                {/* Formulário de Cadastro */}
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nome da Câmera</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Ex: Câmera Portaria Lateral"
                            placeholderTextColor="#999"
                            value={nomeCam}
                            onChangeText={setNomeCam}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Localização / Setor</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Ex: Corredor do Bloco C"
                            placeholderTextColor="#999"
                            value={localCam}
                            onChangeText={setLocalCam}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>URL do Stream / IP</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Ex: rtsp://192.168.1.50:554/stream"
                            placeholderTextColor="#999"
                            value={urlCam}
                            onChangeText={setUrlCam}
                        />
                    </View>

                    <Pressable 
                        style={({ pressed }) => [
                            styles.submitButton,
                            pressed && { opacity: 0.85 }
                        ]}
                        onPress={handleSalvar}
                    >
                        <Text style={styles.submitButtonText}>Salvar Câmera</Text>
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