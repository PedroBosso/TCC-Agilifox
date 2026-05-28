// app/visitantes/reconhecimento.tsx
// Tela de reconhecimento facial de visitante.
// Abre a câmera frontal, captura a foto e envia para o backend comparar.

import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { faceService, ReconhecimentoResult } from '../../services/faceServices';

type Estado = 'camera' | 'processando' | 'resultado';

export default function Reconhecimento() {
  const [permission, requestPermission] = useCameraPermissions();
  const [estado, setEstado] = useState<Estado>('camera');
  const [resultado, setResultado] = useState<ReconhecimentoResult | null>(null);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // ── Solicita permissão ao montar ────────────────────────────
  const verificarPermissao = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Permissão negada',
          'Acesso à câmera é necessário para o reconhecimento.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    }
  };

  // ── Captura e envia para reconhecimento ─────────────────────
  const reconhecer = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
        exif: false,
      });

      if (!photo?.base64) {
        Alert.alert('Erro', 'Não foi possível capturar a imagem.');
        return;
      }

      setFotoCapturada(photo.base64);
      setEstado('processando');

      const res = await faceService.reconhecerRosto(photo.base64);
      setResultado(res);
      setEstado('resultado');
    } catch (err) {
      Alert.alert('Erro', 'Falha ao comunicar com o servidor. Tente novamente.');
      setEstado('camera');
    }
  };

  const reiniciar = () => {
    setEstado('camera');
    setResultado(null);
    setFotoCapturada(null);
  };

  // ══════════════════════════════════════════════════════════════
  //  Sem permissão
  // ══════════════════════════════════════════════════════════════
  if (!permission) {
    return (
      <View style={styles.centralized}>
        <ActivityIndicator size="large" color="#e49c15" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centralized}>
        <Text style={styles.semPermissaoText}>
          Câmera não autorizada.
        </Text>
        <Pressable style={styles.btnPermissao} onPress={verificarPermissao}>
          <Text style={styles.btnPermissaoText}>Permitir câmera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#888' }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  ESTADO: processando
  // ══════════════════════════════════════════════════════════════
  if (estado === 'processando') {
    return (
      <View style={[styles.container, styles.centralized]}>
        {fotoCapturada && (
          <Image
            source={{ uri: `data:image/jpeg;base64,${fotoCapturada}` }}
            style={styles.fotoProcessando}
          />
        )}
        <ActivityIndicator size="large" color="#e49c15" style={{ marginTop: 24 }} />
        <Text style={styles.processandoText}>Identificando visitante...</Text>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  ESTADO: resultado
  // ══════════════════════════════════════════════════════════════
  if (estado === 'resultado' && resultado) {
    const encontrado = resultado.encontrado;
    const confiancaPct = resultado.confianca
      ? Math.round(resultado.confianca * 100)
      : null;

    return (
      <View style={[styles.container, styles.centralized, { paddingHorizontal: 24 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.voltar}>←</Text>
          </Pressable>
          <Text style={styles.titulo}>Resultado</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Foto capturada */}
        {fotoCapturada && (
          <Image
            source={{ uri: `data:image/jpeg;base64,${fotoCapturada}` }}
            style={[
              styles.fotoResultado,
              { borderColor: encontrado ? '#28a745' : '#dc3545' },
            ]}
          />
        )}

        {/* Badge de status */}
        <View style={[styles.badge, { backgroundColor: encontrado ? '#d4edda' : '#f8d7da' }]}>
          <Text style={[styles.badgeText, { color: encontrado ? '#155724' : '#721c24' }]}>
            {encontrado ? '✅ Visitante reconhecido' : '❌ Visitante não encontrado'}
          </Text>
        </View>

        {/* Dados do visitante reconhecido */}
        {encontrado && resultado.visitante && (
          <View style={styles.cardVisitante}>
            {resultado.visitante.fotoBase64 && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${resultado.visitante.fotoBase64}` }}
                style={styles.fotoCadastro}
              />
            )}
            <View>
              <Text style={styles.nomeReconhecido}>{resultado.visitante.nome}</Text>
              <Text style={styles.aptoReconhecido}>
                Apto. {resultado.visitante.apartamento}
              </Text>
              {confiancaPct !== null && (
                <Text style={styles.confianca}>Confiança: {confiancaPct}%</Text>
              )}
            </View>
          </View>
        )}

        {/* Mensagem extra do servidor */}
        {resultado.mensagem && (
          <Text style={styles.mensagemServidor}>{resultado.mensagem}</Text>
        )}

        {/* Botões */}
        <View style={styles.resultadoBotoes}>
          <Pressable style={styles.btnTentarNovamente} onPress={reiniciar}>
            <Text style={styles.btnTentarNovamenteText}>Tentar novamente</Text>
          </Pressable>

          {!encontrado && (
            <Pressable
              style={styles.btnCadastrar}
              onPress={() => router.push('../../src/cadastro')}
            >
              <Text style={styles.btnCadastrarText}>+ Cadastrar</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  ESTADO: camera
  // ══════════════════════════════════════════════════════════════
  return (
    <View style={styles.cameraWrapper}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front">
        <View style={styles.overlay}>
          {/* Topo */}
          <View style={styles.topoCamera}>
            <Pressable onPress={() => router.back()} style={styles.btnVoltar}>
              <Text style={styles.btnVoltarText}>←</Text>
            </Pressable>
            <Text style={styles.instrucao}>
              Posicione o rosto no centro
            </Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Oval guia */}
          <View style={styles.oval} />

          {/* Botão capturar */}
          <View style={styles.rodapeCamera}>
            <Pressable style={styles.btnCapturar} onPress={reconhecer}>
              <View style={styles.btnCapturarInner} />
            </Pressable>
            <Text style={styles.capturarLabel}>Identificar visitante</Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3e9d7',
  },
  centralized: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3e9d7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  // ── Sem permissão ──
  semPermissaoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  btnPermissao: {
    backgroundColor: '#e49c15',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnPermissaoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // ── Processando ──
  fotoProcessando: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#e49c15',
  },
  processandoText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  // ── Resultado ──
  fotoResultado: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    marginTop: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardVisitante: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fotoCadastro: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#e49c15',
  },
  nomeReconhecido: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  aptoReconhecido: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  confianca: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 4,
    fontWeight: '600',
  },
  mensagemServidor: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  resultadoBotoes: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  btnTentarNovamente: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    alignItems: 'center',
  },
  btnTentarNovamenteText: {
    color: '#555',
    fontWeight: '600',
  },
  btnCadastrar: {
    flex: 1,
    backgroundColor: '#e49c15',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  btnCadastrarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // ── Câmera ──
  cameraWrapper: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    paddingVertical: 50,
    alignItems: 'center',
  },
  topoCamera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
  },
  btnVoltar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnVoltarText: {
    color: '#fff',
    fontSize: 22,
  },
  instrucao: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  oval: {
    width: 230,
    height: 290,
    borderRadius: 115,
    borderWidth: 2.5,
    borderColor: '#e49c15',
    borderStyle: 'dashed',
  },
  rodapeCamera: {
    alignItems: 'center',
  },
  btnCapturar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  btnCapturarInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  capturarLabel: {
    color: '#fff',
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
  },
});