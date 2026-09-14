// Alertas de Pânico para a portaria — destaque para alertas ativos (de panico.tsx) com ação de atender ou ligar para a polícia.

import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
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
import { supabase } from '../lib/supabase';

// ---------- Tipos ----------

type StatusAlerta = 'ativo' | 'atendido' | 'cancelado';

interface AlertaPanico {
  id: string;
  morador_id: string;
  status: StatusAlerta;
  detalhes_morador: string | null;
  visualizado_portaria_em: string | null;
  atendido_em: string | null;
  observacao_atendimento: string | null;
  criado_em: string;
  morador: string;
  apto: string;
}

// ---------- Configuração ----------

const NUMERO_POLICIA = '190';

const CONFIG_STATUS: Record<StatusAlerta, { nome: string; cor: string; fundo: string }> = {
  ativo: { nome: 'Ativo', cor: '#C0392B', fundo: '#FBEAE8' },
  atendido: { nome: 'Atendido', cor: '#2F855A', fundo: '#E7F4ED' },
  cancelado: { nome: 'Cancelado pelo morador', cor: '#8A8377', fundo: '#F0ECE5' },
};

// ---------- Helpers ----------

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
        {alerta.apto} · acionado {formatarTempoDecorrido(alerta.criado_em, agora)}
      </Text>

      {alerta.detalhes_morador && <Text style={styles.cartaoAtivoDetalhes}>{alerta.detalhes_morador}</Text>}

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
            {alerta.apto} · {formatarDataHoraExtensa(alerta.criado_em)}
          </Text>
        </View>
        <Selo status={alerta.status} />
      </View>
      {alerta.observacao_atendimento && (
        <Text style={styles.cartaoHistoricoObservacao}>{alerta.observacao_atendimento}</Text>
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
  const [alertas, setAlertas] = useState<AlertaPanico[]>([]);
  const [agora, setAgora] = useState(new Date());
  const [alertaParaAtender, setAlertaParaAtender] = useState<AlertaPanico | null>(null);

  useEffect(() => {
    carregarAlertas();
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setAgora(new Date());
      carregarAlertas();
    }, 30000);
    return () => clearInterval(intervalo);
  }, []);

  async function carregarAlertas() {
    const { data: alertasData, error } = await supabase
      .from('alertas_panico')
      .select('id, morador_id, status, detalhes_morador, visualizado_portaria_em, atendido_em, observacao_atendimento, criado_em')
      .order('criado_em', { ascending: false });

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar os alertas.');
      return;
    }

    const lista = alertasData ?? [];
    const moradorIds = [...new Set(lista.map((a) => a.morador_id))];

    const perfisPorId = new Map<string, { nome: string; apto: string | null }>();
    if (moradorIds.length > 0) {
      const { data: perfisData } = await supabase
        .from('profiles')
        .select('id, nome, apto')
        .in('id', moradorIds);
      (perfisData ?? []).forEach((p) => perfisPorId.set(p.id, { nome: p.nome, apto: p.apto }));
    }

    const alertasComPerfil: AlertaPanico[] = lista.map((a) => ({
      ...a,
      morador: perfisPorId.get(a.morador_id)?.nome ?? 'Morador',
      apto: perfisPorId.get(a.morador_id)?.apto ?? '—',
    }));

    // Ao exibir um alerta ativo pela primeira vez na portaria, marca o momento da visualização.
    const paraMarcar = alertasComPerfil.filter((a) => a.status === 'ativo' && !a.visualizado_portaria_em);
    if (paraMarcar.length > 0) {
      const agoraISO = new Date().toISOString();
      await Promise.all(
        paraMarcar.map((a) =>
          supabase.from('alertas_panico').update({ visualizado_portaria_em: agoraISO }).eq('id', a.id)
        )
      );
      paraMarcar.forEach((a) => {
        a.visualizado_portaria_em = agoraISO;
      });
    }

    setAlertas(alertasComPerfil);
  }

  const alertasAtivos = useMemo(() => alertas.filter((a) => a.status === 'ativo'), [alertas]);
  const historico = useMemo(() => alertas.filter((a) => a.status !== 'ativo'), [alertas]);

  async function handleConfirmarAtendimento(id: string, observacao: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('alertas_panico')
      .update({
        status: 'atendido',
        atendido_em: new Date().toISOString(),
        atendido_por: user.id,
        observacao_atendimento: observacao || null,
      })
      .eq('id', id);

    if (error) {
      Alert.alert('Erro', 'Não foi possível marcar o alerta como atendido.');
      return;
    }

    setAlertaParaAtender(null);
    carregarAlertas();
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
