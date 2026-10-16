// Tela do porteiro para ler o QR code do visitante, conferir a autorização no banco e registrar a entrada.

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TituloComVoltar } from '../components/BotaoVoltar';
import { supabase } from '../lib/supabase';

const PREFIXO_QR = 'agilifox-visita:';
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StatusAutorizacao = 'ativo' | 'agendado' | 'expirado' | 'cancelado';

interface Autorizacao {
  id: string;
  nome_visitante: string;
  detalhe: string | null;
  apartamento: string;
  status: StatusAutorizacao;
  data_inicio: string | null;
  data_fim: string | null;
  recorrente: boolean;
  morador_id: string;
}

interface Leitura {
  autorizacao: Autorizacao;
  moradorNome: string;
  bloco: string | null;
  motivoRecusa: string | null;
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Devolve o motivo da recusa, ou null quando o visitante pode entrar.
function verificarValidade(autorizacao: Autorizacao): string | null {
  if (autorizacao.status === 'cancelado') return 'O morador cancelou esta autorização.';
  if (autorizacao.status === 'expirado') return 'Este QR code já foi usado ou expirou.';

  const agora = Date.now();
  if (autorizacao.data_inicio && agora < new Date(autorizacao.data_inicio).getTime()) {
    return `A visita está agendada para ${formatarDataHora(autorizacao.data_inicio)}.`;
  }
  if (autorizacao.data_fim && agora > new Date(autorizacao.data_fim).getTime()) {
    return 'O período desta autorização já terminou.';
  }
  return null;
}

function textoUnidade(apartamento: string, bloco: string | null): string {
  const apto = apartamento ? `Apto ${apartamento}` : 'Apartamento não informado';
  return bloco ? `${apto} · ${bloco}` : apto;
}

export default function LerQrVisitante() {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const [verificando, setVerificando] = useState(false);
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [liberando, setLiberando] = useState(false);
  const leituraTravada = useRef(false);

  function liberarNovaLeitura() {
    leituraTravada.current = false;
    setVerificando(false);
    setLeitura(null);
  }

  function avisarERetomar(titulo: string, mensagem: string) {
    Alert.alert(titulo, mensagem, [{ text: 'OK', onPress: liberarNovaLeitura }]);
  }

  async function handleQrLido({ data }: BarcodeScanningResult) {
    // A câmera dispara várias leituras seguidas do mesmo código; a trava evita consultas repetidas.
    if (leituraTravada.current) return;
    leituraTravada.current = true;
    setVerificando(true);

    const texto = data.trim();
    const id = texto.startsWith(PREFIXO_QR) ? texto.slice(PREFIXO_QR.length) : '';
    if (!FORMATO_UUID.test(id)) {
      avisarERetomar('QR code inválido', 'Este QR code não é um convite de visitante do Agilifox.');
      return;
    }

    const { data: autorizacao, error } = await supabase
      .from('autorizacoes_visita')
      .select('id, nome_visitante, detalhe, apartamento, status, data_inicio, data_fim, recorrente, morador_id')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      avisarERetomar('Erro', 'Não foi possível consultar a autorização. Verifique a internet.');
      return;
    }
    if (!autorizacao) {
      avisarERetomar('Convite não encontrado', 'Nenhuma autorização corresponde a este QR code.');
      return;
    }

    const { data: morador } = await supabase
      .from('profiles')
      .select('nome, bloco')
      .eq('id', autorizacao.morador_id)
      .maybeSingle();

    setLeitura({
      autorizacao,
      moradorNome: morador?.nome ?? 'Morador',
      bloco: morador?.bloco ?? null,
      motivoRecusa: verificarValidade(autorizacao),
    });
    setVerificando(false);
  }

  async function handleLiberarEntrada() {
    if (!leitura) return;
    const { autorizacao, bloco } = leitura;

    setLiberando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLiberando(false);
      Alert.alert('Erro', 'Não foi possível identificar o usuário logado.');
      return;
    }

    const { error } = await supabase.from('registros_acesso').insert({
      tipo_pessoa: 'visitante',
      nome: autorizacao.nome_visitante,
      apartamento: bloco ? `${autorizacao.apartamento} - ${bloco}` : autorizacao.apartamento,
      direcao: 'entrada',
      status: 'liberado',
      liberado_por: user.id,
    });

    if (error) {
      setLiberando(false);
      Alert.alert('Erro', 'Não foi possível registrar a entrada.');
      return;
    }

    // Visita única: depois da entrada, o mesmo QR code deixa de valer.
    let avisoExtra = '';
    if (!autorizacao.recorrente) {
      const { error: erroExpirar } = await supabase
        .from('autorizacoes_visita')
        .update({ status: 'expirado' })
        .eq('id', autorizacao.id);
      if (erroExpirar) {
        avisoExtra = ' Atenção: não foi possível encerrar o QR code, ele ainda pode ser usado.';
      }
    }

    setLiberando(false);
    Alert.alert('Entrada liberada', `${autorizacao.nome_visitante} pode entrar.${avisoExtra}`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  const cabecalho = (
    <View style={styles.header}>
      <TituloComVoltar>
        <Text style={styles.headerLabel}>Portaria</Text>
        <Text style={styles.headerText}>Ler QR code do visitante</Text>
      </TituloComVoltar>
    </View>
  );

  if (!permissao) {
    return (
      <View style={[styles.container, styles.centro]}>
        <ActivityIndicator size="large" color="#e49c15" />
      </View>
    );
  }

  if (!permissao.granted) {
    return (
      <View style={styles.container}>
        {cabecalho}
        <View style={styles.centro}>
          <Ionicons name="camera-outline" size={48} color="#e49c15" />
          <Text style={styles.aviso}>Para ler o QR code do visitante, o Agilifox precisa usar a câmera.</Text>
          {permissao.canAskAgain ? (
            <Pressable style={styles.botaoPrincipal} onPress={pedirPermissao}>
              <Text style={styles.botaoPrincipalTexto}>Permitir câmera</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.botaoPrincipal} onPress={() => Linking.openSettings()}>
              <Text style={styles.botaoPrincipalTexto}>Abrir configurações do celular</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  if (leitura) {
    const { autorizacao, moradorNome, bloco, motivoRecusa } = leitura;
    const autorizado = motivoRecusa === null;

    return (
      <View style={styles.container}>
        {cabecalho}
        <ScrollView contentContainerStyle={styles.resultadoConteudo}>
          <View style={[styles.selo, autorizado ? styles.seloAutorizado : styles.seloRecusado]}>
            <Ionicons
              name={autorizado ? 'checkmark-circle' : 'close-circle'}
              size={22}
              color={autorizado ? '#1E7B3A' : '#B42318'}
            />
            <Text style={[styles.seloTexto, { color: autorizado ? '#1E7B3A' : '#B42318' }]}>
              {autorizado ? 'Entrada autorizada' : 'Entrada não autorizada'}
            </Text>
          </View>

          <View style={styles.cartao}>
            <Text style={styles.cartaoNome}>{autorizacao.nome_visitante}</Text>
            <Text style={styles.cartaoLinha}>{textoUnidade(autorizacao.apartamento, bloco)}</Text>
            <Text style={styles.cartaoLinha}>Autorizado por {moradorNome}</Text>
            {!!autorizacao.detalhe && <Text style={styles.cartaoDetalhe}>{autorizacao.detalhe}</Text>}
            <Text style={styles.cartaoTipo}>
              {autorizacao.recorrente ? 'Visita recorrente' : 'Visita única'}
            </Text>
            {!autorizado && <Text style={styles.motivo}>{motivoRecusa}</Text>}
          </View>

          {autorizado && (
            <Pressable
              style={[styles.botaoPrincipal, liberando && { opacity: 0.6 }]}
              onPress={handleLiberarEntrada}
              disabled={liberando}
            >
              {liberando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.botaoPrincipalTexto}>Liberar entrada</Text>
              )}
            </Pressable>
          )}

          <Pressable style={styles.botaoSecundario} onPress={liberarNovaLeitura} disabled={liberando}>
            <Text style={styles.botaoSecundarioTexto}>Ler outro QR code</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {cabecalho}
      <View style={styles.cameraMoldura}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={verificando ? undefined : handleQrLido}
        />
        <View style={styles.mira} />
        {verificando && (
          <View style={styles.verificando}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.verificandoTexto}>Conferindo autorização...</Text>
          </View>
        )}
      </View>
      <Text style={styles.instrucao}>
        Aponte a câmera para o QR code que o visitante recebeu do morador.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3e9d7',
    paddingTop: 45,
    paddingHorizontal: 15,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  header: {
    flexDirection: 'row',
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
  aviso: {
    fontSize: 15,
    color: '#555555',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  cameraMoldura: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mira: {
    width: '65%',
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: '#e49c15',
    borderRadius: 16,
    pointerEvents: 'none',
  },
  verificando: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  verificandoTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  instrucao: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 10,
  },
  resultadoConteudo: {
    paddingBottom: 30,
  },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 14,
  },
  seloAutorizado: {
    backgroundColor: '#DFF3E4',
  },
  seloRecusado: {
    backgroundColor: '#FDE2E1',
  },
  seloTexto: {
    fontSize: 15,
    fontWeight: '700',
  },
  cartao: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartaoNome: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  cartaoLinha: {
    fontSize: 15,
    color: '#444444',
    marginBottom: 2,
  },
  cartaoDetalhe: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
  },
  cartaoTipo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e49c15',
    marginTop: 10,
  },
  motivo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B42318',
    marginTop: 10,
  },
  botaoPrincipal: {
    backgroundColor: '#e49c15',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  botaoPrincipalTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  botaoSecundario: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e49c15',
  },
  botaoSecundarioTexto: {
    color: '#e49c15',
    fontSize: 15,
    fontWeight: '700',
  },
});
