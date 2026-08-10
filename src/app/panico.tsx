/**
 * TelaBotaoPanico.tsx
 *
 * Botão de Pânico para o morador. Ao pressentir ameaça ou visita indesejada,
 * o morador mantém o botão pressionado por 3 segundos (evita acionamento
 * acidental num toque rápido) para enviar um alerta imediato à portaria, que
 * decide se liga para a polícia ou age por conta própria — ver
 * TelaAlertasPanicoPortaria.tsx.
 *
 * Front-end apenas — os dados abaixo são mockados. Como não há backend
 * conectado, o "visualizado pela portaria" é simulado com um timeout local
 * só para fins de demonstração.
 *
 * Para integrar com back-end depois, basta substituir:
 *   1. `handleAcionarAlerta` por um POST para o seu endpoint de emergência
 *      (idealmente com push notification / socket para a portaria ver na hora)
 *   2. O timeout de simulação de "visualizado" por uma atualização real vinda
 *      do servidor (polling ou websocket) refletindo a ação do porteiro
 *   3. `handleCancelarAlerta` e `handleEnviarDetalhes` por PATCH no mesmo endpoint
 *
 * Dependências: apenas React e React Native "puro" — nenhuma lib extra necessária.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    Modal,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ---------- Tipos ----------

type StatusAlerta = 'ativo' | 'atendido' | 'cancelado';
type Aba = 'principal' | 'historico';

interface AlertaPanico {
  id: string;
  dataISO: string;
  status: StatusAlerta;
  visualizadoPortariaISO?: string;
  detalhes?: string;
}

// ---------- Configuração ----------

const DURACAO_SEGURAR_MS = 3000;

const CONFIG_STATUS: Record<StatusAlerta, { nome: string; cor: string; fundo: string }> = {
  ativo: { nome: 'Ativo', cor: '#C0392B', fundo: '#FBEAE8' },
  atendido: { nome: 'Atendido', cor: '#2F855A', fundo: '#E7F4ED' },
  cancelado: { nome: 'Cancelado', cor: '#8A8377', fundo: '#F0ECE5' },
};

// ---------- Helpers ----------

function addDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 24 * 60 * 60 * 1000);
}

function formatarHora(dataISO: string): string {
  return new Date(dataISO).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarDataHoraExtensa(dataISO: string): string {
  const data = new Date(dataISO);
  const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${dataFormatada} às ${formatarHora(dataISO)}`;
}

// ---------- Dados mockados ----------

function gerarHistoricoMock(agora: Date): AlertaPanico[] {
  return [
    {
      id: 'h1',
      dataISO: addDias(agora, -18).toISOString(),
      status: 'cancelado',
      visualizadoPortariaISO: addDias(agora, -18).toISOString(),
      detalhes: 'Toque acidental, cancelado logo em seguida.',
    },
  ];
}

// ---------- Subcomponentes ----------

function Selo({ status }: { status: StatusAlerta }) {
  const config = CONFIG_STATUS[status];
  return (
    <View style={[styles.selo, { backgroundColor: config.fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: config.cor }]} />
      <Text style={[styles.seloTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

function CartaoHistorico({ alerta }: { alerta: AlertaPanico }) {
  return (
    <View style={styles.cartaoHistorico}>
      <View style={styles.cartaoHistoricoTopo}>
        <Text style={styles.cartaoHistoricoData}>{formatarDataHoraExtensa(alerta.dataISO)}</Text>
        <Selo status={alerta.status} />
      </View>
      {alerta.detalhes && <Text style={styles.cartaoHistoricoDetalhes}>{alerta.detalhes}</Text>}
    </View>
  );
}

function EstadoVazioHistorico() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>✓</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhum alerta anterior</Text>
      <Text style={styles.estadoVazioTexto}>Seu histórico de acionamentos aparece aqui.</Text>
    </View>
  );
}

// ---------- Modal de confirmação de cancelamento ----------

function ModalConfirmarCancelamento({
  visivel,
  onFechar,
  onConfirmar,
}: {
  visivel: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <Modal visible={visivel} animationType="fade" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundoCentro}>
        <View style={styles.dialogoCartao}>
          <Text style={styles.dialogoTitulo}>Cancelar alerta?</Text>
          <Text style={styles.dialogoTexto}>
            A portaria será avisada de que foi um engano. Só cancele se você já estiver seguro(a).
          </Text>
          <View style={styles.dialogoAcoes}>
            <TouchableOpacity style={styles.dialogoBotaoVoltar} onPress={onFechar} activeOpacity={0.8}>
              <Text style={styles.dialogoBotaoVoltarTexto}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dialogoBotaoConfirmar} onPress={onConfirmar} activeOpacity={0.85}>
              <Text style={styles.dialogoBotaoConfirmarTexto}>Sim, cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaBotaoPanico() {
  const hoje = useRef(new Date()).current;
  const [abaAtiva, setAbaAtiva] = useState<Aba>('principal');
  const [alertaAtual, setAlertaAtual] = useState<AlertaPanico | null>(null);
  const [historico, setHistorico] = useState<AlertaPanico[]>(() => gerarHistoricoMock(hoje));
  const [detalhesTexto, setDetalhesTexto] = useState('');
  const [modalCancelarVisivel, setModalCancelarVisivel] = useState(false);

  const progressoAnim = useRef(new Animated.Value(0)).current;
  const timeoutAcionamentoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutVisualizacaoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutAcionamentoRef.current) clearTimeout(timeoutAcionamentoRef.current);
      if (timeoutVisualizacaoRef.current) clearTimeout(timeoutVisualizacaoRef.current);
    };
  }, []);

  function handlePressIn() {
    Animated.timing(progressoAnim, {
      toValue: 1,
      duration: DURACAO_SEGURAR_MS,
      useNativeDriver: false,
    }).start();

    timeoutAcionamentoRef.current = setTimeout(() => {
      handleAcionarAlerta();
    }, DURACAO_SEGURAR_MS);
  }

  function handlePressOut() {
    if (timeoutAcionamentoRef.current) {
      clearTimeout(timeoutAcionamentoRef.current);
      timeoutAcionamentoRef.current = null;
    }
    Animated.timing(progressoAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }

  function handleAcionarAlerta() {
    progressoAnim.setValue(0);
    const novoAlerta: AlertaPanico = {
      id: String(Date.now()),
      dataISO: new Date().toISOString(),
      status: 'ativo',
    };
    setAlertaAtual(novoAlerta);
    setDetalhesTexto('');

    // Simulação apenas para demonstração — em produção isso viria do servidor
    // quando a portaria de fato abrir/visualizar o alerta.
    timeoutVisualizacaoRef.current = setTimeout(() => {
      setAlertaAtual((atual) =>
        atual && atual.id === novoAlerta.id ? { ...atual, visualizadoPortariaISO: new Date().toISOString() } : atual
      );
    }, 6000);
  }

  function handleConfirmarCancelamento() {
    if (!alertaAtual) return;
    if (timeoutVisualizacaoRef.current) clearTimeout(timeoutVisualizacaoRef.current);

    const alertaCancelado: AlertaPanico = {
      ...alertaAtual,
      status: 'cancelado',
      detalhes: detalhesTexto.trim() || undefined,
    };
    setHistorico((atual) => [alertaCancelado, ...atual]);
    setAlertaAtual(null);
    setModalCancelarVisivel(false);
  }

  function handleEnviarDetalhes() {
    if (!alertaAtual || detalhesTexto.trim().length === 0) return;
    setAlertaAtual({ ...alertaAtual, detalhes: detalhesTexto.trim() });
  }

  const larguraProgresso = progressoAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Botão de Pânico</Text>
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'principal' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('principal')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'principal' && styles.abaTextoAtivo]}>Pânico</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'historico' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('historico')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'historico' && styles.abaTextoAtivo]}>Histórico</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'principal' ? (
        alertaAtual ? (
          // ---------- Estado: alerta enviado ----------
          <View style={styles.enviadoContainer}>
            <View style={styles.enviadoIconeCirculo}>
              <Text style={styles.enviadoIconeTexto}>!</Text>
            </View>

            <Text style={styles.enviadoTitulo}>Alerta enviado à portaria</Text>
            <Text style={styles.enviadoData}>Enviado às {formatarHora(alertaAtual.dataISO)}</Text>

            <View style={styles.statusBox}>
              {alertaAtual.visualizadoPortariaISO ? (
                <>
                  <View style={[styles.statusPonto, { backgroundColor: '#2F855A' }]} />
                  <Text style={styles.statusTexto}>
                    Visualizado pela portaria às {formatarHora(alertaAtual.visualizadoPortariaISO)}
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.statusPonto, { backgroundColor: '#B7791F' }]} />
                  <Text style={styles.statusTexto}>Aguardando confirmação da portaria...</Text>
                </>
              )}
            </View>

            <Text style={styles.campoLabel}>Adicionar detalhes (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: pessoa não identificada no corredor..."
              placeholderTextColor="#A8A199"
              value={detalhesTexto}
              onChangeText={setDetalhesTexto}
              multiline
              numberOfLines={2}
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.botaoEnviarDetalhes, detalhesTexto.trim().length === 0 && styles.botaoDesabilitado]}
              onPress={handleEnviarDetalhes}
              disabled={detalhesTexto.trim().length === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarDetalhesTexto}>Enviar detalhes à portaria</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botaoCancelarAlerta}
              onPress={() => setModalCancelarVisivel(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.botaoCancelarAlertaTexto}>Foi engano, cancelar alerta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // ---------- Estado: inicial ----------
          <View style={styles.inicialContainer}>
            <Text style={styles.inicialInstrucao}>
              Em caso de ameaça ou visita indesejada, mantenha o botão pressionado por 3 segundos para alertar a
              portaria.
            </Text>

            <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.botaoPanico}>
              <Text style={styles.botaoPanicoIcone}>!</Text>
              <Text style={styles.botaoPanicoTexto}>SEGURE PARA{'\n'}ACIONAR</Text>
            </Pressable>

            <View style={styles.progressoFundo}>
              <Animated.View style={[styles.progressoPreenchido, { width: larguraProgresso }]} />
            </View>

            <Text style={styles.inicialAviso}>A portaria decide se aciona a polícia ou age por conta própria.</Text>
          </View>
        )
      ) : (
        <FlatList
          data={historico}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CartaoHistorico alerta={item} />}
          contentContainerStyle={historico.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
          ListEmptyComponent={<EstadoVazioHistorico />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ModalConfirmarCancelamento
        visivel={modalCancelarVisivel}
        onFechar={() => setModalCancelarVisivel(false)}
        onConfirmar={handleConfirmarCancelamento}
      />
    </SafeAreaView>
  );
}

// ---------- Estilos ----------

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  cabecalho: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cabecalhoSaudacao: {
    fontSize: 13,
    color: '#8A8377',
    marginBottom: 2,
  },
  cabecalhoTitulo: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2B2823',
  },
  abas: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#F0ECE5',
    borderRadius: 12,
    padding: 4,
  },
  abaBotao: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  abaBotaoAtiva: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  abaTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8377',
  },
  abaTextoAtivo: {
    color: '#2B2823',
  },
  inicialContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  inicialInstrucao: {
    fontSize: 14,
    color: '#6B6459',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  botaoPanico: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C0392B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  botaoPanicoIcone: {
    fontSize: 46,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  botaoPanicoTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  progressoFundo: {
    width: 200,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EDE9E1',
    marginTop: 20,
    overflow: 'hidden',
  },
  progressoPreenchido: {
    height: 6,
    backgroundColor: '#C0392B',
  },
  inicialAviso: {
    fontSize: 12,
    color: '#A8A199',
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 17,
  },
  enviadoContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  enviadoIconeCirculo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FBEAE8',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  enviadoIconeTexto: {
    fontSize: 30,
    fontWeight: '800',
    color: '#C0392B',
  },
  enviadoTitulo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2B2823',
    textAlign: 'center',
    marginBottom: 4,
  },
  enviadoData: {
    fontSize: 13,
    color: '#8A8377',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statusPonto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  statusTexto: {
    fontSize: 13,
    color: '#2B2823',
    fontWeight: '600',
    flex: 1,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7F5F1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2B2823',
    borderWidth: 1,
    borderColor: '#EDE9E1',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  botaoEnviarDetalhes: {
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  botaoEnviarDetalhesTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
  },
  botaoCancelarAlerta: {
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 10,
  },
  botaoCancelarAlertaTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8377',
    textDecorationLine: 'underline',
  },
  listaConteudo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 40,
  },
  cartaoHistorico: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cartaoHistoricoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cartaoHistoricoData: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
  },
  cartaoHistoricoDetalhes: {
    fontSize: 12,
    color: '#8A8377',
    lineHeight: 17,
  },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  seloPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  seloTexto: {
    fontSize: 11,
    fontWeight: '600',
  },
  estadoVazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  estadoVazioCirculo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0ECE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  estadoVazioIcone: {
    fontSize: 22,
    color: '#A8A199',
    fontWeight: '600',
  },
  estadoVazioTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 4,
  },
  estadoVazioTexto: {
    fontSize: 13,
    color: '#8A8377',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalFundoCentro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43, 40, 35, 0.55)',
    padding: 24,
  },
  dialogoCartao: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  dialogoTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 8,
  },
  dialogoTexto: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 19,
    marginBottom: 16,
  },
  dialogoAcoes: {
    flexDirection: 'row',
    gap: 10,
  },
  dialogoBotaoVoltar: {
    flex: 1,
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dialogoBotaoVoltarTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
  },
  dialogoBotaoConfirmar: {
    flex: 1,
    backgroundColor: '#C0392B',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dialogoBotaoConfirmarTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});