/**
 * TelaAlertasPanicoPortaria.tsx
 *
 * Tela de Alertas de Pânico para a portaria. Mostra em destaque qualquer
 * alerta ativo (morador que acionou o botão de pânico em
 * TelaBotaoPanico.tsx), com acesso rápido para ligar para a polícia ou
 * marcar o alerta como atendido — a decisão de acionar ou não a polícia é
 * sempre do porteiro, o app só agiliza o contato.
 *
 * Front-end apenas — os dados abaixo são mockados (gerarAlertasMock).
 *
 * Para integrar com back-end depois, basta substituir:
 *   1. O estado inicial de `alertas` por uma chamada à API — idealmente com
 *      push notification/som/vibração quando um novo alerta ativo chegar,
 *      já que isso é uma emergência e não pode depender do porteiro abrir o app
 *   2. `handleConfirmarAtendimento` por um PATCH no endpoint correspondente
 *
 * Dependências: apenas React e React Native "puro" — nenhuma lib extra necessária.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    Animated,
    FlatList,
    Linking,
    Modal,
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

interface AlertaPanico {
  id: string;
  morador: string;
  apto: string;
  dataISO: string;
  status: StatusAlerta;
  atendidoISO?: string;
  observacaoAtendimento?: string;
  detalhesMorador?: string;
}

// ---------- Configuração ----------

const NUMERO_POLICIA = '190';

const CONFIG_STATUS: Record<StatusAlerta, { nome: string; cor: string; fundo: string }> = {
  ativo: { nome: 'Ativo', cor: '#C0392B', fundo: '#FBEAE8' },
  atendido: { nome: 'Atendido', cor: '#2F855A', fundo: '#E7F4ED' },
  cancelado: { nome: 'Cancelado pelo morador', cor: '#8A8377', fundo: '#F0ECE5' },
};

// ---------- Helpers ----------

function addMinutos(data: Date, minutos: number): Date {
  return new Date(data.getTime() + minutos * 60000);
}

function addDias(data: Date, dias: number): Date {
  return addMinutos(data, dias * 24 * 60);
}

function formatarTempoDecorrido(dataISO: string, agora: Date): string {
  const diffMin = Math.floor((agora.getTime() - new Date(dataISO).getTime()) / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  return `há ${diffHoras}h`;
}

function formatarDataHoraExtensa(dataISO: string): string {
  const data = new Date(dataISO);
  const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dataFormatada} às ${horaFormatada}`;
}

function ligarParaPolicia() {
  Linking.openURL(`tel:${NUMERO_POLICIA}`).catch(() => {
    // Em produção, mostrar aviso caso o dispositivo não suporte chamadas.
  });
}

// ---------- Dados mockados ----------
// Um alerta ativo já vem no mock para demonstrar a tela em seu estado mais
// importante — o de emergência real acontecendo agora.

function gerarAlertasMock(agora: Date): AlertaPanico[] {
  return [
    {
      id: 'p1',
      morador: 'Ana Paula Rocha',
      apto: 'Apto 604',
      dataISO: addMinutos(agora, -2).toISOString(),
      status: 'ativo',
    },
    {
      id: 'p2',
      morador: 'Marcos Silva',
      apto: 'Apto 402',
      dataISO: addDias(agora, -2).toISOString(),
      status: 'atendido',
      atendidoISO: addMinutos(addDias(agora, -2), 4).toISOString(),
      observacaoAtendimento: 'Confirmado por telefone com o morador — falso alarme, criança mexeu no aplicativo.',
    },
    {
      id: 'p3',
      morador: 'Carla Mendes',
      apto: 'Apto 204',
      dataISO: addDias(agora, -5).toISOString(),
      status: 'cancelado',
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

function PontoPulsante() {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return <Animated.View style={[styles.pontoPulsante, { opacity: pulseAnim }]} />;
}

interface CartaoAlertaAtivoProps {
  alerta: AlertaPanico;
  agora: Date;
  onAtender: () => void;
}

function CartaoAlertaAtivo({ alerta, agora, onAtender }: CartaoAlertaAtivoProps) {
  return (
    <View style={styles.cartaoAtivo}>
      <View style={styles.cartaoAtivoTopo}>
        <PontoPulsante />
        <Text style={styles.cartaoAtivoLabel}>ALERTA DE PÂNICO</Text>
      </View>

      <Text style={styles.cartaoAtivoMorador}>{alerta.morador}</Text>
      <Text style={styles.cartaoAtivoApto}>
        {alerta.apto} · acionado {formatarTempoDecorrido(alerta.dataISO, agora)}
      </Text>

      {alerta.detalhesMorador && <Text style={styles.cartaoAtivoDetalhes}>{alerta.detalhesMorador}</Text>}

      <View style={styles.cartaoAtivoAcoes}>
        <TouchableOpacity style={styles.botaoPolicia} onPress={ligarParaPolicia} activeOpacity={0.85}>
          <Text style={styles.botaoPoliciaTexto}>Ligar para a polícia (190)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botaoAtender} onPress={onAtender} activeOpacity={0.85}>
          <Text style={styles.botaoAtenderTexto}>Marcar como atendido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CartaoHistorico({ alerta }: { alerta: AlertaPanico }) {
  return (
    <View style={styles.cartaoHistorico}>
      <View style={styles.cartaoHistoricoTopo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartaoHistoricoMorador}>{alerta.morador}</Text>
          <Text style={styles.cartaoHistoricoApto}>
            {alerta.apto} · {formatarDataHoraExtensa(alerta.dataISO)}
          </Text>
        </View>
        <Selo status={alerta.status} />
      </View>
      {alerta.observacaoAtendimento && (
        <Text style={styles.cartaoHistoricoObservacao}>{alerta.observacaoAtendimento}</Text>
      )}
    </View>
  );
}

function EstadoSemAlertasAtivos() {
  return (
    <View style={styles.semAlertasBox}>
      <View style={styles.semAlertasCirculo}>
        <Text style={styles.semAlertasIcone}>✓</Text>
      </View>
      <Text style={styles.semAlertasTexto}>Nenhum alerta ativo no momento</Text>
    </View>
  );
}

// ---------- Modal de atendimento ----------

interface ModalAtenderProps {
  alerta: AlertaPanico | null;
  onFechar: () => void;
  onConfirmar: (id: string, observacao: string) => void;
}

function ModalAtender({ alerta, onFechar, onConfirmar }: ModalAtenderProps) {
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (alerta) setObservacao('');
  }, [alerta]);

  return (
    <Modal visible={!!alerta} animationType="fade" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundoCentro}>
        <View style={styles.dialogoCartao}>
          <Text style={styles.dialogoTitulo}>Marcar como atendido</Text>
          <Text style={styles.dialogoTexto}>
            Registre rapidamente o que foi feito em relação ao alerta de {alerta?.morador} ({alerta?.apto}).
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ex.: Confirmado por telefone, falso alarme..."
            placeholderTextColor="#A8A199"
            value={observacao}
            onChangeText={setObservacao}
            multiline
            numberOfLines={3}
            maxLength={250}
          />

          <View style={styles.dialogoAcoes}>
            <TouchableOpacity style={styles.dialogoBotaoVoltar} onPress={onFechar} activeOpacity={0.8}>
              <Text style={styles.dialogoBotaoVoltarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dialogoBotaoConfirmar}
              onPress={() => alerta && onConfirmar(alerta.id, observacao.trim())}
              activeOpacity={0.85}
            >
              <Text style={styles.dialogoBotaoConfirmarTexto}>Confirmar atendimento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaAlertasPanicoPortaria() {
  const referencia = useMemo(() => new Date(), []);
  const [alertas, setAlertas] = useState<AlertaPanico[]>(() => gerarAlertasMock(referencia));
  const [agora, setAgora] = useState(new Date());
  const [alertaParaAtender, setAlertaParaAtender] = useState<AlertaPanico | null>(null);

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  const alertasAtivos = useMemo(
    () =>
      alertas
        .filter((a) => a.status === 'ativo')
        .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime()),
    [alertas]
  );

  const historico = useMemo(
    () =>
      alertas
        .filter((a) => a.status !== 'ativo')
        .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime()),
    [alertas]
  );

  function handleConfirmarAtendimento(id: string, observacao: string) {
    setAlertas((atual) =>
      atual.map((a) =>
        a.id === id
          ? { ...a, status: 'atendido', atendidoISO: new Date().toISOString(), observacaoAtendimento: observacao || undefined }
          : a
      )
    );
    setAlertaParaAtender(null);
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Alertas de Pânico</Text>
        <Text style={styles.cabecalhoSubtitulo}>Consulta e atendimento da portaria</Text>
      </View>

      <FlatList
        data={historico}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartaoHistorico alerta={item} />}
        contentContainerStyle={styles.listaConteudo}
        ListHeaderComponent={
          <>
            {alertasAtivos.length > 0 ? (
              <>
                {alertasAtivos.map((alerta) => (
                  <CartaoAlertaAtivo
                    key={alerta.id}
                    alerta={alerta}
                    agora={agora}
                    onAtender={() => setAlertaParaAtender(alerta)}
                  />
                ))}
              </>
            ) : (
              <EstadoSemAlertasAtivos />
            )}

            <Text style={styles.secaoTitulo}>Histórico</Text>
          </>
        }
        showsVerticalScrollIndicator={false}
      />

      <ModalAtender
        alerta={alertaParaAtender}
        onFechar={() => setAlertaParaAtender(null)}
        onConfirmar={handleConfirmarAtendimento}
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
    fontSize: 24,
    fontWeight: '700',
    color: '#2B2823',
  },
  cabecalhoSubtitulo: {
    fontSize: 12,
    color: '#A8A199',
    marginTop: 2,
  },
  listaConteudo: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  cartaoAtivo: {
    backgroundColor: '#2B1815',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#C0392B',
  },
  cartaoAtivoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pontoPulsante: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#E05B4F',
    marginRight: 8,
  },
  cartaoAtivoLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E8B4AE',
    letterSpacing: 1,
  },
  cartaoAtivoMorador: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cartaoAtivoApto: {
    fontSize: 13,
    color: '#D8B8B4',
    marginBottom: 12,
  },
  cartaoAtivoDetalhes: {
    fontSize: 13,
    color: '#F0DAD7',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
  cartaoAtivoAcoes: {
    gap: 10,
  },
  botaoPolicia: {
    backgroundColor: '#C0392B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoPoliciaTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  botaoAtender: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  botaoAtenderTexto: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  semAlertasBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 24,
    marginBottom: 16,
  },
  semAlertasCirculo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E7F4ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  semAlertasIcone: {
    fontSize: 18,
    color: '#2F855A',
    fontWeight: '700',
  },
  semAlertasTexto: {
    fontSize: 13,
    color: '#6B6459',
    fontWeight: '600',
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 12,
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
    alignItems: 'flex-start',
  },
  cartaoHistoricoMorador: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
  },
  cartaoHistoricoApto: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 1,
  },
  cartaoHistoricoObservacao: {
    fontSize: 12,
    color: '#6B6459',
    lineHeight: 17,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    paddingTop: 10,
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
    marginBottom: 14,
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
    minHeight: 70,
    textAlignVertical: 'top',
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
    backgroundColor: '#2F855A',
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