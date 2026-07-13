import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ---------- Tipos ----------

type StatusReserva = 'pendente' | 'confirmada' | 'cancelada';
type StatusExibicao = StatusReserva | 'concluida';
type Aba = 'reservar' | 'minhas';

interface Ambiente {
  id: string;
  nome: string;
  capacidade: number;
  taxa: number | null;
  regras: string;
  cor: string;
}

interface HorarioPadrao {
  id: string;
  label: string;
}

interface Reserva {
  id: string;
  ambienteId: string;
  dataISO: string; // 'YYYY-MM-DD'
  horarioId: string;
  status: StatusReserva;
  deQuemEh: 'eu' | 'outro';
  observacao?: string;
}

// ---------- Dados fixos ----------

const AMBIENTES: Ambiente[] = [
  {
    id: 'salao_festas',
    nome: 'Salão de Festas',
    capacidade: 80,
    taxa: 150,
    regras: 'Devolução da chave até 10h do dia seguinte. Limpeza por conta do morador.',
    cor: '#7E57A6',
  },
  {
    id: 'churrasqueira_1',
    nome: 'Churrasqueira 1',
    capacidade: 20,
    taxa: 60,
    regras: 'Uso permitido até as 22h. Traga seus próprios utensílios.',
    cor: '#C0392B',
  },
  {
    id: 'churrasqueira_2',
    nome: 'Churrasqueira 2',
    capacidade: 20,
    taxa: 60,
    regras: 'Uso permitido até as 22h. Traga seus próprios utensílios.',
    cor: '#B7791F',
  },
  {
    id: 'quadra',
    nome: 'Quadra Poliesportiva',
    capacidade: 12,
    taxa: null,
    regras: 'Uso gratuito. Máximo de 2h por reserva em horários concorridos.',
    cor: '#3D6FB4',
  },
  {
    id: 'espaco_gourmet',
    nome: 'Espaço Gourmet',
    capacidade: 30,
    taxa: 100,
    regras: 'Inclui forno e churrasqueira elétrica. Reserva com 48h de antecedência.',
    cor: '#2F855A',
  },
];

const HORARIOS_PADRAO: HorarioPadrao[] = [
  { id: 'manha', label: '08:00 – 12:00' },
  { id: 'tarde', label: '13:00 – 18:00' },
  { id: 'noite', label: '19:00 – 23:00' },
];

// ---------- Helpers de data ----------

function addDias(data: Date, dias: number): Date {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarDiaSemanaAbrev(data: Date): string {
  return data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function formatarDataCurta(data: Date): string {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatarDataExtensa(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mesmoDia(a: Date, b: Date): boolean {
  return formatarDataISO(a) === formatarDataISO(b);
}

// ---------- Dados mockados de reservas ----------
// Gerados a partir de "hoje" para que a tela sempre mostre exemplos relevantes,
// independentemente da data em que o app for aberto.

function gerarReservasMock(): Reserva[] {
  const hoje = new Date();
  return [
    {
      id: 'r1',
      ambienteId: 'salao_festas',
      dataISO: formatarDataISO(addDias(hoje, 2)),
      horarioId: 'noite',
      status: 'confirmada',
      deQuemEh: 'outro',
    },
    {
      id: 'r2',
      ambienteId: 'churrasqueira_1',
      dataISO: formatarDataISO(addDias(hoje, 1)),
      horarioId: 'tarde',
      status: 'confirmada',
      deQuemEh: 'eu',
      observacao: 'Aniversário do meu filho, cerca de 15 pessoas.',
    },
    {
      id: 'r3',
      ambienteId: 'quadra',
      dataISO: formatarDataISO(addDias(hoje, 1)),
      horarioId: 'manha',
      status: 'confirmada',
      deQuemEh: 'outro',
    },
    {
      id: 'r4',
      ambienteId: 'espaco_gourmet',
      dataISO: formatarDataISO(addDias(hoje, 4)),
      horarioId: 'noite',
      status: 'pendente',
      deQuemEh: 'eu',
      observacao: 'Jantar de confraternização do trabalho.',
    },
    {
      id: 'r5',
      ambienteId: 'salao_festas',
      dataISO: formatarDataISO(addDias(hoje, -6)),
      horarioId: 'tarde',
      status: 'confirmada',
      deQuemEh: 'eu',
      observacao: 'Chá de bebê da minha esposa.',
    },
    {
      id: 'r6',
      ambienteId: 'churrasqueira_2',
      dataISO: formatarDataISO(addDias(hoje, -2)),
      horarioId: 'noite',
      status: 'cancelada',
      deQuemEh: 'eu',
    },
  ];
}

function getAmbiente(id: string): Ambiente {
  return AMBIENTES.find((a) => a.id === id) ?? AMBIENTES[0];
}

function getHorario(id: string): HorarioPadrao {
  return HORARIOS_PADRAO.find((h) => h.id === id) ?? HORARIOS_PADRAO[0];
}

function calcularStatusExibicao(reserva: Reserva, hoje: Date): StatusExibicao {
  if (reserva.status === 'cancelada') return 'cancelada';
  const dataReserva = new Date(reserva.dataISO + 'T00:00:00');
  if (dataReserva < new Date(formatarDataISO(hoje) + 'T00:00:00') && reserva.status === 'confirmada') {
    return 'concluida';
  }
  return reserva.status;
}

const CONFIG_STATUS: Record<StatusExibicao, { nome: string; cor: string; fundo: string }> = {
  pendente: { nome: 'Pendente', cor: '#B7791F', fundo: '#FBF1DE' },
  confirmada: { nome: 'Confirmada', cor: '#2F855A', fundo: '#E7F4ED' },
  cancelada: { nome: 'Cancelada', cor: '#C0392B', fundo: '#FBEAE8' },
  concluida: { nome: 'Concluída', cor: '#8A8377', fundo: '#F0ECE5' },
};

// ---------- Subcomponentes ----------

function Selo({ status }: { status: StatusExibicao }) {
  const config = CONFIG_STATUS[status];
  return (
    <View style={[styles.selo, { backgroundColor: config.fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: config.cor }]} />
      <Text style={[styles.seloTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

interface CartaoAmbienteProps {
  ambiente: Ambiente;
  selecionado: boolean;
  onPress: () => void;
}

function CartaoAmbiente({ ambiente, selecionado, onPress }: CartaoAmbienteProps) {
  return (
    <TouchableOpacity
      style={[
        styles.cartaoAmbiente,
        selecionado && { borderColor: ambiente.cor, backgroundColor: '#FFFFFF' },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.cartaoAmbienteIcone, { backgroundColor: ambiente.cor }]}>
        <Text style={styles.cartaoAmbienteIconeTexto}>{ambiente.nome.charAt(0)}</Text>
      </View>
      <Text style={styles.cartaoAmbienteNome} numberOfLines={2}>
        {ambiente.nome}
      </Text>
      <Text style={styles.cartaoAmbienteTaxa}>
        {ambiente.taxa ? formatarMoeda(ambiente.taxa) : 'Gratuito'}
      </Text>
    </TouchableOpacity>
  );
}

interface ItemDataProps {
  data: Date;
  selecionada: boolean;
  onPress: () => void;
}

function ItemData({ data, selecionada, onPress }: ItemDataProps) {
  const hoje = mesmoDia(data, new Date());
  return (
    <TouchableOpacity
      style={[styles.itemData, selecionada && styles.itemDataSelecionada]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.itemDataDiaSemana, selecionada && styles.itemDataTextoSelecionado]}>
        {hoje ? 'Hoje' : formatarDiaSemanaAbrev(data)}
      </Text>
      <Text style={[styles.itemDataNumero, selecionada && styles.itemDataTextoSelecionado]}>
        {data.getDate()}
      </Text>
    </TouchableOpacity>
  );
}

interface BotaoHorarioProps {
  horario: HorarioPadrao;
  ocupado: boolean;
  selecionado: boolean;
  onPress: () => void;
}

function BotaoHorario({ horario, ocupado, selecionado, onPress }: BotaoHorarioProps) {
  return (
    <TouchableOpacity
      style={[
        styles.botaoHorario,
        selecionado && styles.botaoHorarioSelecionado,
        ocupado && styles.botaoHorarioOcupado,
      ]}
      onPress={onPress}
      disabled={ocupado}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.botaoHorarioTexto,
          selecionado && styles.botaoHorarioTextoSelecionado,
          ocupado && styles.botaoHorarioTextoOcupado,
        ]}
      >
        {horario.label}
      </Text>
      <Text style={[styles.botaoHorarioStatus, ocupado && styles.botaoHorarioTextoOcupado]}>
        {ocupado ? 'Ocupado' : 'Disponível'}
      </Text>
    </TouchableOpacity>
  );
}

interface CartaoMinhaReservaProps {
  reserva: Reserva;
  hoje: Date;
  onCancelar: (id: string) => void;
}

function CartaoMinhaReserva({ reserva, hoje, onCancelar }: CartaoMinhaReservaProps) {
  const ambiente = getAmbiente(reserva.ambienteId);
  const horario = getHorario(reserva.horarioId);
  const statusExibicao = calcularStatusExibicao(reserva, hoje);
  const podeCancelar = statusExibicao === 'pendente' || statusExibicao === 'confirmada';

  return (
    <View style={[styles.cartaoReserva, { borderLeftColor: ambiente.cor }]}>
      <View style={styles.cartaoReservaTopo}>
        <View style={styles.cartaoReservaTopoEsquerda}>
          <View style={[styles.cartaoReservaIcone, { backgroundColor: ambiente.cor }]}>
            <Text style={styles.cartaoReservaIconeTexto}>{ambiente.nome.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.cartaoReservaNome}>{ambiente.nome}</Text>
            <Text style={styles.cartaoReservaData}>
              {formatarDataExtensa(reserva.dataISO)} · {horario.label}
            </Text>
          </View>
        </View>
      </View>

      {reserva.observacao ? (
        <Text style={styles.cartaoReservaObservacao} numberOfLines={2}>
          {reserva.observacao}
        </Text>
      ) : null}

      <View style={styles.cartaoReservaRodape}>
        <Selo status={statusExibicao} />
        {podeCancelar && (
          <TouchableOpacity onPress={() => onCancelar(reserva.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cartaoReservaCancelar}>Cancelar reserva</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function EstadoVazioReservas() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>+</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Você ainda não tem reservas</Text>
      <Text style={styles.estadoVazioTexto}>
        Escolha um ambiente na aba “Reservar” para agendar seu horário.
      </Text>
    </View>
  );
}

// ---------- Modal de confirmação ----------

interface ModalConfirmacaoProps {
  visivel: boolean;
  ambiente: Ambiente;
  data: Date;
  horario: HorarioPadrao;
  onFechar: () => void;
  onConfirmar: (observacao: string) => void;
}

function ModalConfirmacao({ visivel, ambiente, data, horario, onFechar, onConfirmar }: ModalConfirmacaoProps) {
  const [observacao, setObservacao] = useState('');

  function limparEFechar() {
    setObservacao('');
    onFechar();
  }

  function handleConfirmar() {
    onConfirmar(observacao.trim());
    setObservacao('');
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={limparEFechar}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalFundo}
      >
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Confirmar reserva</Text>
            <TouchableOpacity onPress={limparEFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.resumoReserva}>
              <View style={[styles.resumoReservaIcone, { backgroundColor: ambiente.cor }]}>
                <Text style={styles.resumoReservaIconeTexto}>{ambiente.nome.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resumoReservaNome}>{ambiente.nome}</Text>
                <Text style={styles.resumoReservaDetalhe}>
                  {formatarDataExtensa(formatarDataISO(data))}
                </Text>
                <Text style={styles.resumoReservaDetalhe}>{horario.label}</Text>
              </View>
            </View>

            <View style={styles.resumoReservaTaxaLinha}>
              <Text style={styles.resumoReservaTaxaLabel}>Taxa de uso</Text>
              <Text style={styles.resumoReservaTaxaValor}>
                {ambiente.taxa ? formatarMoeda(ambiente.taxa) : 'Gratuito'}
              </Text>
            </View>

            <Text style={styles.resumoReservaRegras}>{ambiente.regras}</Text>

            <Text style={styles.campoLabel}>Observações (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultilinha]}
              placeholder="Ex.: número de convidados, motivo do evento..."
              placeholderTextColor="#A8A199"
              value={observacao}
              onChangeText={setObservacao}
              multiline
              numberOfLines={3}
              maxLength={300}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.botaoEnviar} onPress={handleConfirmar} activeOpacity={0.85}>
              <Text style={styles.botaoEnviarTexto}>Confirmar reserva</Text>
            </TouchableOpacity>

            <Text style={styles.resumoReservaAviso}>
              Sua reserva ficará pendente até a aprovação da administração.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaReservaAmbientes() {
  const hoje = useMemo(() => new Date(), []);
  const diasDisponiveis = useMemo(() => Array.from({ length: 14 }, (_, i) => addDias(hoje, i)), [hoje]);

  const [abaAtiva, setAbaAtiva] = useState<Aba>('reservar');
  const [ambienteSelecionadoId, setAmbienteSelecionadoId] = useState<string>(AMBIENTES[0].id);
  const [dataSelecionada, setDataSelecionada] = useState<Date>(hoje);
  const [horarioSelecionadoId, setHorarioSelecionadoId] = useState<string | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>(gerarReservasMock);
  const [modalVisivel, setModalVisivel] = useState(false);

  const ambienteSelecionado = getAmbiente(ambienteSelecionadoId);
  const dataSelecionadaISO = formatarDataISO(dataSelecionada);

  function estaOcupado(horarioId: string): boolean {
    return reservas.some(
      (r) =>
        r.ambienteId === ambienteSelecionadoId &&
        r.dataISO === dataSelecionadaISO &&
        r.horarioId === horarioId &&
        r.status !== 'cancelada'
    );
  }

  const minhasReservas = useMemo(
    () =>
      [...reservas]
        .filter((r) => r.deQuemEh === 'eu')
        .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime()),
    [reservas]
  );

  function handleSelecionarAmbiente(id: string) {
    setAmbienteSelecionadoId(id);
    setHorarioSelecionadoId(null);
  }

  function handleSelecionarData(data: Date) {
    setDataSelecionada(data);
    setHorarioSelecionadoId(null);
  }

  function handleSelecionarHorario(horarioId: string) {
    setHorarioSelecionadoId(horarioId);
  }

  function handleAbrirConfirmacao() {
    if (!horarioSelecionadoId) return;
    setModalVisivel(true);
  }

  function handleConfirmarReserva(observacao: string) {
    if (!horarioSelecionadoId) return;

    const novaReserva: Reserva = {
      id: String(Date.now()),
      ambienteId: ambienteSelecionadoId,
      dataISO: dataSelecionadaISO,
      horarioId: horarioSelecionadoId,
      status: 'pendente',
      deQuemEh: 'eu',
      observacao: observacao || undefined,
    };

    setReservas((atual) => [novaReserva, ...atual]);
    setModalVisivel(false);
    setHorarioSelecionadoId(null);
    setAbaAtiva('minhas');
  }

  function handleCancelarReserva(id: string) {
    setReservas((atual) => atual.map((r) => (r.id === id ? { ...r, status: 'cancelada' } : r)));
  }

  const horarioSelecionadoInfo = horarioSelecionadoId ? getHorario(horarioSelecionadoId) : null;

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}> 
        <TouchableOpacity style={styles.botaoVoltar} onPress={() => router.push('./inicio')}>
          <Ionicons name="chevron-back" size={24} color="#2B2823" />
        </TouchableOpacity>
        <View style={styles.cabecalhoTextoWrapper}>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Reserva de Ambientes</Text>
        </View>
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'reservar' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('reservar')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'reservar' && styles.abaTextoAtivo]}>Reservar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'minhas' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('minhas')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'minhas' && styles.abaTextoAtivo]}>
            Minhas reservas
          </Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'reservar' ? (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.conteudoScroll}>
            <Text style={styles.secaoTitulo}>Escolha o ambiente</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listaAmbientes}
            >
              {AMBIENTES.map((ambiente) => (
                <CartaoAmbiente
                  key={ambiente.id}
                  ambiente={ambiente}
                  selecionado={ambiente.id === ambienteSelecionadoId}
                  onPress={() => handleSelecionarAmbiente(ambiente.id)}
                />
              ))}
            </ScrollView>

            <View style={styles.regrasBox}>
              <Text style={styles.regrasBoxTitulo}>
                Capacidade: {ambienteSelecionado.capacidade} pessoas
              </Text>
              <Text style={styles.regrasBoxTexto}>{ambienteSelecionado.regras}</Text>
            </View>

            <Text style={styles.secaoTitulo}>Escolha a data</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listaDatas}
            >
              {diasDisponiveis.map((data) => (
                <ItemData
                  key={formatarDataISO(data)}
                  data={data}
                  selecionada={mesmoDia(data, dataSelecionada)}
                  onPress={() => handleSelecionarData(data)}
                />
              ))}
            </ScrollView>

            <Text style={styles.secaoTitulo}>Escolha o horário</Text>
            <View style={styles.listaHorarios}>
              {HORARIOS_PADRAO.map((horario) => (
                <BotaoHorario
                  key={horario.id}
                  horario={horario}
                  ocupado={estaOcupado(horario.id)}
                  selecionado={horario.id === horarioSelecionadoId}
                  onPress={() => handleSelecionarHorario(horario.id)}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.rodapeFixo}>
            {horarioSelecionadoInfo && (
              <Text style={styles.rodapeFixoResumo}>
                {ambienteSelecionado.nome} · {formatarDataCurta(dataSelecionada)} ·{' '}
                {horarioSelecionadoInfo.label}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.botaoEnviar, !horarioSelecionadoId && styles.botaoEnviarDesabilitado]}
              onPress={handleAbrirConfirmacao}
              disabled={!horarioSelecionadoId}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Reservar horário selecionado</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <FlatList
          data={minhasReservas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CartaoMinhaReserva reserva={item} hoje={hoje} onCancelar={handleCancelarReserva} />
          )}
          contentContainerStyle={
            minhasReservas.length === 0 ? styles.listaVaziaContainer : styles.conteudoScroll
          }
          ListEmptyComponent={<EstadoVazioReservas />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ModalConfirmacao
        visivel={modalVisivel}
        ambiente={ambienteSelecionado}
        data={dataSelecionada}
        horario={horarioSelecionadoInfo ?? HORARIOS_PADRAO[0]}
        onFechar={() => setModalVisivel(false)}
        onConfirmar={handleConfirmarReserva}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  botaoVoltar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cabecalhoTextoWrapper: {
    flex: 1,
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
  conteudoScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 12,
  },
  listaAmbientes: {
    paddingBottom: 4,
    paddingRight: 4,
  },
  cartaoAmbiente: {
    width: 118,
    backgroundColor: '#F7F5F1',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: 12,
    marginRight: 10,
  },
  cartaoAmbienteIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cartaoAmbienteIconeTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  cartaoAmbienteNome: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 6,
    minHeight: 34,
  },
  cartaoAmbienteTaxa: {
    fontSize: 11,
    color: '#8A8377',
  },
  regrasBox: {
    backgroundColor: '#F7F5F1',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    marginBottom: 22,
  },
  regrasBoxTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 4,
  },
  regrasBoxTexto: {
    fontSize: 12,
    color: '#6B6459',
    lineHeight: 17,
  },
  listaDatas: {
    paddingBottom: 4,
    paddingRight: 4,
  },
  itemData: {
    width: 52,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F7F5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  itemDataSelecionada: {
    backgroundColor: '#2B2823',
  },
  itemDataDiaSemana: {
    fontSize: 11,
    color: '#8A8377',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  itemDataNumero: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2823',
  },
  itemDataTextoSelecionado: {
    color: '#FFFFFF',
  },
  listaHorarios: {
    marginTop: 22,
  },
  botaoHorario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F5F1',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  botaoHorarioSelecionado: {
    borderColor: '#2B2823',
    backgroundColor: '#FFFFFF',
  },
  botaoHorarioOcupado: {
    backgroundColor: '#F7F5F1',
    opacity: 0.5,
  },
  botaoHorarioTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2823',
  },
  botaoHorarioTextoSelecionado: {
    color: '#2B2823',
  },
  botaoHorarioTextoOcupado: {
    color: '#A8A199',
  },
  botaoHorarioStatus: {
    fontSize: 12,
    color: '#2F855A',
    fontWeight: '600',
  },
  rodapeFixo: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    backgroundColor: '#FAF8F5',
  },
  rodapeFixoResumo: {
    fontSize: 12,
    color: '#6B6459',
    marginBottom: 10,
    textAlign: 'center',
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cartaoReserva: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cartaoReservaTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cartaoReservaTopoEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cartaoReservaIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cartaoReservaIconeTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cartaoReservaNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 2,
  },
  cartaoReservaData: {
    fontSize: 12,
    color: '#8A8377',
    textTransform: 'capitalize',
  },
  cartaoReservaObservacao: {
    fontSize: 12,
    color: '#6B6459',
    marginTop: 10,
    lineHeight: 17,
  },
  cartaoReservaRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  cartaoReservaCancelar: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C0392B',
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
    fontSize: 26,
    color: '#A8A199',
    fontWeight: '300',
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
  modalFundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(43, 40, 35, 0.4)',
  },
  modalCartao: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    maxHeight: '88%',
  },
  modalAlcinha: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E0D8',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitulo: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2B2823',
  },
  modalFechar: {
    fontSize: 14,
    color: '#8A8377',
  },
  resumoReserva: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5F1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  resumoReservaIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resumoReservaIconeTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  resumoReservaNome: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 3,
  },
  resumoReservaDetalhe: {
    fontSize: 12,
    color: '#6B6459',
    textTransform: 'capitalize',
  },
  resumoReservaTaxaLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9E1',
    marginBottom: 14,
  },
  resumoReservaTaxaLabel: {
    fontSize: 13,
    color: '#6B6459',
  },
  resumoReservaTaxaValor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B2823',
  },
  resumoReservaRegras: {
    fontSize: 12,
    color: '#8A8377',
    lineHeight: 17,
    marginBottom: 4,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 16,
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
  },
  inputMultilinha: {
    minHeight: 80,
    paddingTop: 12,
  },
  botaoEnviar: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  botaoEnviarDesabilitado: {
    backgroundColor: '#D8D3C8',
  },
  botaoEnviarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  resumoReservaAviso: {
    fontSize: 11,
    color: '#A8A199',
    textAlign: 'center',
    marginTop: 12,
  },
});