import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

interface Camera {
    id: string;
    nome: string;
    area: string | null;
    online: boolean;
}

const NOME_AREA: Record<string, string> = {
    entrada: 'Entrada',
    garagem: 'Garagem',
    areas_comuns: 'Áreas comuns',
    seguranca: 'Segurança',
};

export default function CamerasPorteiro() {
    const [cameras, setCameras] = useState<Camera[]>([]);

    useEffect(() => {
        carregarCameras();
    }, []);

    async function carregarCameras() {
        const { data, error } = await supabase
            .from('cameras')
            .select('id, nome, area, online')
            .eq('ativa', true);

        if (error) {
            Alert.alert('Erro', 'Não foi possível carregar as câmeras.');
            return;
        }

        setCameras(data ?? []);
    }

    return (
        <View style={styles.container}>
            {/* Header fixo */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerLabel}>Portaria</Text>
                    <Text style={styles.headerText}>Monitoramento</Text>
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
                    <Text style={styles.welcomeText}>Câmeras ao Vivo</Text>
                    <Text style={styles.welcomeSubtext}>Selecione uma câmera para ampliar a visualização.</Text>
                </View>

                {/* Lista de Câmeras */}
                <View style={styles.camerasContainer}>
                    {cameras.map((cam) => (
                        <View key={cam.id} style={styles.cameraCard}>
                            <View style={styles.cameraInfo}>
                                <View style={styles.cameraIconWrapper}>
                                    <Image
                                        source={require('../../assets/images/lupa.png')}
                                        style={styles.imageIcon}
                                    />
                                </View>
                                <View style={styles.cameraTextContent}>
                                    <Text style={styles.cameraName}>{cam.nome}</Text>
                                    <Text style={styles.cameraLocal}>{cam.area ? NOME_AREA[cam.area] ?? cam.area : 'Área não definida'}</Text>
                                </View>
                            </View>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: cam.online ? '#e49c42' : '#999999' }
                            ]}>
                                <Text style={styles.statusText}>{cam.online ? 'Online' : 'Offline'}</Text>
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
    camerasContainer: {
        width: '100%',
        gap: 12,
    },
    cameraCard: {
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
    cameraInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    cameraIconWrapper: {
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
    cameraTextContent: {
        flex: 1,
    },
    cameraName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    cameraLocal: {
        fontSize: 13,
        color: '#666666',
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    bottomPadding: {
        height: 20,
    },
});
