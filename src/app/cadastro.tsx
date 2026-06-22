

import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { faceService } from '../../services/faceServices';

const ROUTES = {
  RECONHECIMENTO: '../../src/reconhecimento',
} as const;

const CAMERA_CONFIG = {
  QUALITY: 0.7,
  PHOTO_WIDTH: 120,
  PHOTO_HEIGHT: 120,
  BORDER_RADIUS: 60,
} as const;

const UI_CONFIG = {
  SPACING: {
    PADDING_HORIZONTAL: 20,
    MARGIN_BOTTOM: 24,
    MARGIN_TOP: 8,
  },
} as const;

const COLORS_CONFIG = {
  PRIMARY: '#e49c15',
  BACKGROUND: '#f3e9d7',
  WHITE: '#fff',
  BORDER: '#ddd',
  PLACEHOLDER_BG: '#e8dcc8',
  PLACEHOLDER_BORDER: '#d4c4a8',
  TEXT_DARK: '#222',
  TEXT_GRAY: '#555',
  TEXT_LIGHT: '#999',
} as const;

type Etapa = 'formulario' | 'camera' | 'confirmacao';

export default function CadastroVisitante() {
  const [permission, requestPermission] = useCameraPermissions();
  const [etapa, setEtapa] = useState<Etapa>('formulario');
  const [nome, setNome] = useState('');
  const [apartamento, setApartamento] = useState('');
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // ── Abre câmera (solicita permissão se necessário) ──────────
  const abrirCamera = async () => {
    if (!nome.trim() || !apartamento.trim()) {
      Alert.alert('Atenção', 'Preencha o nome e o apartamento antes de tirar a foto.');
      return;
    }
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permissão negada', 'É necessário acesso à câmera para cadastrar o visitante.');
        return;
      }
    }
    setEtapa('camera');
  };

  // ── Captura a foto ──────────────────────────────────────────
  const tirarFoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: CAMERA_CONFIG.QUALITY,
        exif: false,
      });
      if (photo?.base64) {
        setFotoBase64(photo.base64);
        setEtapa('confirmacao');
      }
    } catch (error) {
  const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
  console.error('Erro ao capturar foto:', error);
  Alert.alert('Erro na captura', `Não foi possível capturar a foto: ${mensagem}`);
}
  };

  // ── Envia para o backend ────────────────────────────────────
  const salvar = async () => {
    if (!fotoBase64) return;
    setCarregando(true);
    try {
      await faceService.cadastrarVisitante({
        nome: nome.trim(),
        apartamento: apartamento.trim(),
        fotoBase64,
        dataRegistro: new Date().toISOString(),
      });
      Alert.alert('✅ Sucesso', `${nome} foi cadastrado com sucesso!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
  console.error('Erro ao cadastrar:', err);
  Alert.alert(
    'Erro no cadastro',
    `Não foi possível cadastrar o visitante: ${errorMessage}. Verifique a conexão e tente novamente.`
  );
} finally {
      setCarregando(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  //  ETAPA 1 — Formulário
  // ══════════════════════════════════════════════════════════════
  if (etapa === 'formulario') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.voltar}>←</Text>
            </Pressable>
            <Text style={styles.titulo}>Novo visitante</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Prévia da foto */}
          <View style={styles.fotoContainer}>
            {fotoBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${fotoBase64}` }}
                style={styles.fotoPrevia}
              />
            ) : (
              <View style={styles.fotoPlaceholder}>
                <Text style={styles.fotoPlaceholderIcon}>👤</Text>
                <Text style={styles.fotoPlaceholderTexto}>Sem foto</Text>
              </View>
            )}
          </View>

          {/* Campos */}
          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: João da Silva"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Apartamento destino</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 101 A"
            value={apartamento}
            onChangeText={setApartamento}
            autoCapitalize="characters"
          />

          {/* Botão câmera */}
          <Pressable style={styles.btnCamera} onPress={abrirCamera}>
            <Text style={styles.btnCameraText}>
              {fotoBase64 ? 'Refazer foto' : 'Tirar foto do rosto'}
            </Text>
          </Pressable>

          {/* Botão salvar (só aparece com foto) */}
          {fotoBase64 && (
            <Pressable
              style={[styles.btnSalvar, carregando && styles.btnDesabilitado]}
              onPress={salvar}
              disabled={carregando}
            >
              {carregando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnSalvarText}>Salvar cadastro</Text>
              )}
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  ETAPA 2 — Câmera
  // ══════════════════════════════════════════════════════════════
  if (etapa === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          {/* Guia de posicionamento */}
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraInstrucao}>
              Posicione o rosto dentro do oval
            </Text>
            <View style={styles.oval} />
            <View style={styles.cameraBotoes}>
              <Pressable
                style={styles.btnCancelarCamera}
                onPress={() => setEtapa('formulario')}
              >
                <Text style={styles.btnCancelarCameraText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.btnCapturar} onPress={tirarFoto}>
                <View style={styles.btnCapturarInner} />
              </Pressable>
              <View style={{ width: 80 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  //   Confirmação da foto
 
  return (
    <View style={[styles.container, styles.confirmacaoContainer]}>
      <View style={styles.header}>
        <View style={{ width: 32 }} />
        <Text style={styles.titulo}>Confirmar foto</Text>
        <View style={{ width: 32 }} />
      </View>

      <Image
        source={{ uri: `data:image/jpeg;base64,${fotoBase64}` }}
        style={styles.fotoConfirmacao}
        resizeMode="cover"
      />

      <Text style={styles.confirmacaoNome}>{nome}</Text>
      <Text style={styles.confirmacaoApto}>Apto. {apartamento}</Text>

      <View style={styles.confirmacaoBotoes}>
        <Pressable
          style={styles.btnRefazer}
          onPress={() => setEtapa('camera')}
        >
          <Text style={styles.btnRefazerText}>Refazer</Text>
        </Pressable>
        <Pressable
          style={[styles.btnSalvar, { flex: 1 }, carregando && styles.btnDesabilitado]}
          onPress={salvar}
          disabled={carregando}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnSalvarText}>Confirmar</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3e9d7',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
  },
  voltar: {
    fontSize: 26,
    color: '#000',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  fotoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fotoPrevia: {
    width:CAMERA_CONFIG.PHOTO_WIDTH,
    height:CAMERA_CONFIG.PHOTO_HEIGHT,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS_CONFIG.PRIMARY,
  },
  fotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor:COLORS_CONFIG.PLACEHOLDER_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d4c4a8',
    borderStyle: 'dashed',
  },
  fotoPlaceholderIcon: {
    fontSize: 40,
  },
  fotoPlaceholderTexto: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 16,
    color: '#222',
  },
  btnCamera: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e49c15',
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnCameraText: {
    color: '#e49c15',
    fontSize: 15,
    fontWeight: '600',
  },
  btnSalvar: {
    backgroundColor: '#e49c15',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 14,
  },
  btnSalvarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnDesabilitado: {
    opacity: 0.6,
  },
  // ── Câmera ──
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 50,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cameraInstrucao: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  oval: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 2.5,
    borderColor: '#e49c15',
    borderStyle: 'dashed',
  },
  cameraBotoes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
  },
  btnCancelarCamera: {
    width: 80,
    alignItems: 'center',
  },
  btnCancelarCameraText: {
    color: '#fff',
    fontSize: 15,
  },
  btnCapturar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  btnCapturarInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  // ── Confirmação ──
  confirmacaoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fotoConfirmacao: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#e49c15',
    marginTop: 10,
  },
  confirmacaoNome: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#222',
  },
  confirmacaoApto: {
    fontSize: 15,
    color: '#777',
    marginTop: 4,
    marginBottom: 32,
  },
  confirmacaoBotoes: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btnRefazer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 16,
    alignItems: 'center',
  },
  btnRefazerText: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },
});