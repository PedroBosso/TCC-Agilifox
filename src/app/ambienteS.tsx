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

type Aba = 'reservas' | 'ambientes';
type StatusReservaBase = 'pendente' | 'confirmada' | 'recusada' | 'cancelada';
type StatusReservaExibicao = StatusReservaBase | 'concluida';
type FiltroStatus = 'todas' | StatusReservaExibicao;

interface Ambiente {
  id: string;
  nome: string;
  capacidade: number;
  taxa: number | null;
  regras: string;
  cor: string;
  ativo: boolean;
}

interface HorarioPadrao {
  id: string;
  label: string;
}

interface Reserva {
  id: string;
  ambienteId: string;
  morador: string;
  apto: string;
  dataISO: string;
  horarioId: string;
  status: StatusReservaBase;
  observacao?: string;
  motivoRecusa?: string;
}

// ---------- Configuração ----------

const HORARIOS_PADRAO: HorarioPadrao[] = [
  { id: 'manha', label: '08:00 – 12:00' },
  { id: 'tarde', label: '13:00 – 18:00' },
  { id: 'noite', label: '19:00 – 23:00' },
];

const PALETA_AMBIENTE = ['#7E57A6', '#C0392B', '#B7791F', '#3D6FB4', '#2F855A', '#2C7873'];

const CONFIG_STATUS: Record<StatusReservaExibicao, { nome: string; cor: string; fundo: string }> = {
  pendente: { nome: 'Pendente', cor: '#B7791F', fundo: '#FBF1DE' },
  confirmada: { nome: 'Confirmada', cor: '#2F855A', fundo: '#E7F4ED' },
  concluida: { nome: 'Concluída', cor: '#8A8377', fundo: '#F0ECE5' },
  recusada: { nome: 'Recusada', cor: '#C0392B', fundo: '#FBEAE8' },
  cancelada: { nome: 'Cancelada', cor: '#8A8377', fundo: '#F0ECE5' },
};

// ---------- Helpers ----------

function addDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 24 * 60 * 60 * 1000);
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataExtensa(dataISO: string): string {
  return new Date(dataISO).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function getHorario(id: string): HorarioPadrao {
  return HORARIOS_PADRAO.find((h) => h.id === id) ?? HORARIOS_PADRAO[0];
}

function calcularStatusExibicao(reserva: Reserva, hoje: Date): StatusReservaExibicao {
  if (reserva.status === 'recusada') return 'recusada';
  if (reserva.status === 'cancelada') return 'cancelada';
  if (reserva.status === 'pendente') return 'pendente';
  const dataReserva = new Date(reserva.dataISO + 'T00:00:00');
  return dataReserva < new Date(hoje.toISOString().split('T')[0] + 'T00:00:00') ? 'concluida' : 'confirmada';
}

// ---------- Dados mockados ----------

function gerarDadosMock(hoje: Date): { ambientes: Ambiente[]; reservas: Reserva[] } {
  const ambientes: Ambiente[] = [
    {
      id: 'salao_festas',
      nome: 'Salão de Festas',
      capacidade: 80,
      taxa: 150,
      regras: 'Devolução da chave até 10h do dia seguinte. Limpeza por conta do morador.',
      cor: PALETA_AMBIENTE[0],
      ativo: true,
    },
    {
      id: 'churrasqueira_1',
      nome: 'Churrasqueira 1',
      capacidade: 20,
      taxa: 60,
      regras: 'Uso permitido até as 22h. Traga seus próprios utensílios.',
      cor: PALETA_AMBIENTE[1],
      ativo: true,
    },
    {
      id: 'churrasqueira_2',
      nome: 'Churrasqueira 2',
      capacidade: 20,
      taxa: 60,
      regras: 'Uso permitido até as 22h. Traga seus próprios utensílios.',
      cor: PALETA_AMBIENTE[2],
      ativo: true,
    },
    {
      id: 'quadra',
      nome: 'Quadra Poliesportiva',
      capacidade: 12,
      taxa: null,
      regras: 'Uso gratuito. Máximo de 2h por reserva em horários concorridos.',
      cor: PALETA_AMBIENTE[3],
      ativo: true,
    },
    {
      id: 'espaco_gourmet',
      nome: 'Espaço Gourmet',
      capacidade: 30,
      taxa: 100,
      regras: 'Inclui forno e churrasqueira elétrica. Reserva com 48h de antecedência.',
      cor: PALETA_AMBIENTE[4],
      ativo: true,
    },
    {
      id: 'sala_jogos',
      nome: 'Sala de Jogos',
      capacidade: 15,
      taxa: 40,
      regras: 'Uso do console e mesa de sinuca. Máximo de 3h por reserva.',
      cor: PALETA_AMBIENTE[5],
      ativo: true,
    },
  ];

  const reservas: Reserva[] = [
    {
      id: 'r1',
      ambienteId: 'salao_festas',
      morador: 'Carla Mendes',
      apto: 'Apto 204',
      dataISO: addDias(hoje, 3).toISOString(),
      horarioId: 'noite',
      status: 'pendente',
      observacao: 'Aniversário de 15 anos da minha filha, cerca de 40 convidados.',
    },
    {
      id: 'r2',
      ambienteId: 'churrasqueira_1',
      morador: 'Rafael Souza',
      apto: 'Apto 305',
      dataISO: addDias(hoje, 1).toISOString(),
      horarioId: 'tarde',
      status: 'confirmada',
      observacao: 'Almoço em família.',
    },
    {
      id: 'r3',
      ambienteId: 'sala_jogos',
      morador: 'João Ferreira',
      apto: 'Apto 301',
      dataISO: addDias(hoje, 2).toISOString(),
      horarioId: 'noite',
      status: 'pendente',
      observacao: 'Torneio de sinuca com os amigos do bloco.',
    },
    {
      id: 'r4',
      ambienteId: 'quadra',
      morador: 'Bruna Lima',
      apto: 'Apto 108',
      dataISO: addDias(hoje, 4).toISOString(),
      horarioId: 'manha',
      status: 'confirmada',
    },
    {
      id: 'r5',
      ambienteId: 'espaco_gourmet',
      morador: 'Marcos Silva',
      apto: 'Apto 402',
      dataISO: addDias(hoje, -2).toISOString(),
      horarioId: 'noite',
      status: 'recusada',
      motivoRecusa: 'Conflito com manutenção agendada no mesmo horário.',
    },
    {
      id: 'r6',
      ambienteId: 'churrasqueira_2',
      morador: 'Ana Paula Rocha',
      apto: 'Apto 604',
      dataISO: addDias(hoje, -5).toISOString(),
      horarioId: 'tarde',
      status: 'confirmada',
    },
  ];

  return { ambientes, reservas };
}

// ---------- Subcomponentes ----------

function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, ativo && styles.chipAtivo]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Selo({ status }: { status: StatusReservaExibicao }) {
  const config = CONFIG_STATUS[status];
  return (
    <View style={[styles.selo, { backgroundColor: config.fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: config.cor }]} />
      <Text style={[styles.seloTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

interface CartaoReservaProps {
  reserva: Reserva;
  ambiente: Ambiente;
  hoje: Date;
  onAprovar: () => void;
  onRecusar: () => void;
  onCancelar: () => void;
}

function CartaoReserva({ reserva, ambiente, hoje, onAprovar, onRecusar, onCancelar }: CartaoReservaProps) {
  const status = calcularStatusExibicao(reserva, hoje);
  const horario = getHorario(reserva.horarioId);

  return (
    <View style={[styles.cartao, { borderLeftColor: ambiente.cor }]}>
      <View style={styles.cartaoTopo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartaoAmbiente}>{ambiente.nome}</Text>
          <Text style={styles.cartaoMorador}>
            {reserva.morador} · {reserva.apto}
          </Text>
        </View>
        <Selo status={status} />
      </View>

      <Text style={styles.cartaoData}>
        {formatarDataExtensa(reserva.dataISO)} · {horario.label}
      </Text>

      {reserva.observacao && <Text style={styles.cartaoObservacao}>´{reserva.observacao}´</Text>}
      {reserva.motivoRecusa && <Text style={styles.cartaoMotivoRecusa}>Motivo da recusa: {reserva.motivoRecusa}</Text>}

      {status === 'pendente' && (
        <View style={styles.cartaoAcoes}>
          <TouchableOpacity style={styles.botaoRecusar} onPress={onRecusar} activeOpacity={0.85}>
            <Text style={styles.botaoRecusarTexto}>Recusar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoAprovar} onPress={onAprovar} activeOpacity={0.85}>
            <Text style={styles.botaoAprovarTexto}>Aprovar</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'confirmada' && (
        <TouchableOpacity style={styles.botaoCancelar} onPress={onCancelar} activeOpacity={0.7}>
          <Text style={styles.botaoCancelarTexto}>Cancelar reserva</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface LinhaAmbienteProps {
  ambiente: Ambiente;
  onEditar: () => void;
  onAlternarAtivo: () => void;
}

function LinhaAmbiente({ ambiente, onEditar, onAlternarAtivo }: LinhaAmbienteProps) {
  return (
    <View style={styles.linhaAmbiente}>
      <View style={styles.linhaAmbienteTopo}>
        <View style={[styles.linhaAmbienteIcone, { backgroundColor: ambiente.cor }]}>
          <Text style={styles.linhaAmbienteIconeTexto}>{ambiente.nome.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.linhaAmbienteNome}>{ambiente.nome}</Text>
          <Text style={styles.linhaAmbienteDetalhe}>
            Até {ambiente.capacidade} pessoas · {ambiente.taxa ? formatarMoeda(ambiente.taxa) : 'Gratuito'}
          </Text>
        </View>
        <Selo
          status={ambiente.ativo ? 'confirmada' : 'cancelada'}
        />
      </View>

      <Text style={styles.linhaAmbienteRegras}>{ambiente.regras}</Text>

      <View style={styles.linhaAmbienteAcoes}>
        <TouchableOpacity onPress={onEditar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.acaoTexto}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAlternarAtivo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.acaoTexto}>{ambiente.ativo ? 'Desativar' : 'Ativar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EstadoVazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>+</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>{titulo}</Text>
      <Text style={styles.estadoVazioTexto}>{texto}</Text>
    </View>
  );
}

// ---------- Modal de recusa ----------

interface ModalRecusarProps {
  reserva: Reserva | null;
  onFechar: () => void;
  onConfirmar: (id: string, motivo: string) => void;
}

function ModalRecusar({ reserva, onFechar, onConfirmar }: ModalRecusarProps) {
  const [motivo, setMotivo] = useState('');

  React.useEffect(() => {
    if (reserva) setMotivo('');
  }, [reserva]);

  return (
    <Modal visible={!!reserva} animationType="fade" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundoCentro}>
        <View style={styles.dialogoCartao}>
          <Text style={styles.dialogoTitulo}>Recusar reserva</Text>
          <Text style={styles.dialogoTexto}>
            {reserva?.morador} ({reserva?.apto}) será avisado(a) de que a reserva foi recusada.
          </Text>

          <Text style={styles.campoLabel}>Motivo (opcional, mas recomendado)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Conflito de horário com manutenção..."
            placeholderTextColor="#A8A199"
            value={motivo}
            onChangeText={setMotivo}
            multiline
            numberOfLines={3}
            maxLength={200}
          />

          <View style={styles.dialogoAcoes}>
            <TouchableOpacity style={styles.dialogoBotaoVoltar} onPress={onFechar} activeOpacity={0.8}>
              <Text style={styles.dialogoBotaoVoltarTexto}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dialogoBotaoRecusar}
              onPress={() => reserva && onConfirmar(reserva.id, motivo.trim())}
              activeOpacity={0.85}
            >
              <Text style={styles.dialogoBotaoConfirmarTexto}>Confirmar recusa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Modal de cancelamento (reserva já confirmada) ----------

function ModalCancelar({
  reserva,
  onFechar,
  onConfirmar,
}: {
  reserva: Reserva | null;
  onFechar: () => void;
  onConfirmar: (id: string) => void;
}) {
  return (
    <Modal visible={!!reserva} animationType="fade" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundoCentro}>
        <View style={styles.dialogoCartao}>
          <Text style={styles.dialogoTitulo}>Cancelar reserva confirmada?</Text>
          <Text style={styles.dialogoTexto}>
            {reserva?.morador} ({reserva?.apto}) já tinha essa reserva aprovada. Use apenas em casos excepcionais,
            como manutenção de emergência.
          </Text>

          <View style={styles.dialogoAcoes}>
            <TouchableOpacity style={styles.dialogoBotaoVoltar} onPress={onFechar} activeOpacity={0.8}>
              <Text style={styles.dialogoBotaoVoltarTexto}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dialogoBotaoRecusar}
              onPress={() => reserva && onConfirmar(reserva.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.dialogoBotaoConfirmarTexto}>Cancelar reserva</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Modal de cadastro/edição de ambiente ----------

interface ModalAmbienteProps {
  visivel: boolean;
  ambienteEditando: Ambiente | null;
  onFechar: () => void;
  onSalvar: (dados: Omit<Ambiente, 'id' | 'cor' | 'ativo'>, idEdicao: string | null) => void;
}

function ModalAmbiente({ visivel, ambienteEditando, onFechar, onSalvar }: ModalAmbienteProps) {
  const [nome, setNome] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [taxa, setTaxa] = useState('');
  const [regras, setRegras] = useState('');

  React.useEffect(() => {
    if (visivel) {
      setNome(ambienteEditando?.nome ?? '');
      setCapacidade(ambienteEditando ? String(ambienteEditando.capacidade) : '');
      setTaxa(ambienteEditando?.taxa ? String(ambienteEditando.taxa) : '');
      setRegras(ambienteEditando?.regras ?? '');
    }
  }, [visivel, ambienteEditando]);

  const podeSalvar = nome.trim().length > 0 && capacidade.trim().length > 0 && !isNaN(Number(capacidade));

  function handleSalvar() {
    if (!podeSalvar) return;
    const taxaNumerica = taxa.trim().length > 0 ? Number(taxa.replace(',', '.')) : null;
    onSalvar(
      {
        nome: nome.trim(),
        capacidade: Number(capacidade),
        taxa: taxaNumerica && !isNaN(taxaNumerica) ? taxaNumerica : null,
        regras: regras.trim() || 'Sem regras específicas cadastradas.',
      },
      ambienteEditando?.id ?? null
    );
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>{ambienteEditando ? 'Editar ambiente' : 'Novo ambiente'}</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.campoLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Sala de Jogos"
              placeholderTextColor="#A8A199"
              value={nome}
              onChangeText={setNome}
              maxLength={50}
            />

            <Text style={styles.campoLabel}>Capacidade (pessoas)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: 15"
              placeholderTextColor="#A8A199"
              value={capacidade}
              onChangeText={setCapacidade}
              keyboardType="numeric"
            />

            <Text style={styles.campoLabel}>Taxa de uso (R$) — deixe em branco se for gratuito</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: 40"
              placeholderTextColor="#A8A199"
              value={taxa}
              onChangeText={setTaxa}
              keyboardType="numeric"
            />

            <Text style={styles.campoLabel}>Regras de uso</Text>
            <TextInput
              style={[styles.input, styles.inputMultilinha]}
              placeholder="Ex.: Máximo de 3h por reserva..."
              placeholderTextColor="#A8A199"
              value={regras}
              onChangeText={setRegras}
              multiline
              numberOfLines={3}
              maxLength={250}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.botaoEnviar, !podeSalvar && styles.botaoEnviarDesabilitado]}
              onPress={handleSalvar}
              disabled={!podeSalvar}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Salvar ambiente</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaGerenciarAmbientesSindico() {
  const hoje = useMemo(() => new Date(), []);
  const dadosIniciais = useMemo(() => gerarDadosMock(hoje), [hoje]);

  const [abaAtiva, setAbaAtiva] = useState<Aba>('reservas');
  const [ambientes, setAmbientes] = useState<Ambiente[]>(dadosIniciais.ambientes);
  const [reservas, setReservas] = useState<Reserva[]>(dadosIniciais.reservas);

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todas');
  const [filtroAmbienteId, setFiltroAmbienteId] = useState<string>('todos');

  const [reservaParaRecusar, setReservaParaRecusar] = useState<Reserva | null>(null);
  const [reservaParaCancelar, setReservaParaCancelar] = useState<Reserva | null>(null);
  const [modalAmbienteVisivel, setModalAmbienteVisivel] = useState(false);
  const [ambienteEditando, setAmbienteEditando] = useState<Ambiente | null>(null);

  function getAmbiente(id: string): Ambiente {
    return ambientes.find((a) => a.id === id) ?? ambientes[0];
  }

  const reservasFiltradas = useMemo(() => {
    return reservas
      .filter((r) => filtroAmbienteId === 'todos' || r.ambienteId === filtroAmbienteId)
      .filter((r) => filtroStatus === 'todas' || calcularStatusExibicao(r, hoje) === filtroStatus)
      .sort((a, b) => new Date(a.dataISO).getTime() - new Date(b.dataISO).getTime());
  }, [reservas, filtroAmbienteId, filtroStatus, hoje]);

  const totalPendentes = reservas.filter((r) => calcularStatusExibicao(r, hoje) === 'pendente').length;

  function handleAprovar(id: string) {
    setReservas((atual) => atual.map((r) => (r.id === id ? { ...r, status: 'confirmada' } : r)));
  }

  function handleConfirmarRecusa(id: string, motivo: string) {
    setReservas((atual) =>
      atual.map((r) => (r.id === id ? { ...r, status: 'recusada', motivoRecusa: motivo || undefined } : r))
    );
    setReservaParaRecusar(null);
  }

  function handleConfirmarCancelamento(id: string) {
    setReservas((atual) => atual.map((r) => (r.id === id ? { ...r, status: 'cancelada' } : r)));
    setReservaParaCancelar(null);
  }

  function handleAbrirNovoAmbiente() {
    setAmbienteEditando(null);
    setModalAmbienteVisivel(true);
  }

  function handleAbrirEdicaoAmbiente(ambiente: Ambiente) {
    setAmbienteEditando(ambiente);
    setModalAmbienteVisivel(true);
  }

  function handleSalvarAmbiente(dados: Omit<Ambiente, 'id' | 'cor' | 'ativo'>, idEdicao: string | null) {
    if (idEdicao) {
      setAmbientes((atual) => atual.map((a) => (a.id === idEdicao ? { ...a, ...dados } : a)));
    } else {
      const proximaCor = PALETA_AMBIENTE[ambientes.length % PALETA_AMBIENTE.length];
      setAmbientes((atual) => [...atual, { ...dados, id: String(Date.now()), cor: proximaCor, ativo: true }]);
    }
    setModalAmbienteVisivel(false);
  }

  function handleAlternarAtivoAmbiente(id: string) {
    setAmbientes((atual) => atual.map((a) => (a.id === id ? { ...a, ativo: !a.ativo } : a)));
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Ambientes</Text>
        </View>
        {totalPendentes > 0 && (
          <View style={styles.contadorPendentes}>
            <Text style={styles.contadorPendentesTexto}>
              {totalPendentes} pendente{totalPendentes > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'reservas' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('reservas')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'reservas' && styles.abaTextoAtivo]}>Reservas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'ambientes' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('ambientes')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'ambientes' && styles.abaTextoAtivo]}>Ambientes</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'reservas' ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtrosScroll}
            contentContainerStyle={styles.filtrosConteudo}
          >
            <Chip label="Todas" ativo={filtroStatus === 'todas'} onPress={() => setFiltroStatus('todas')} />
            <Chip label="Pendentes" ativo={filtroStatus === 'pendente'} onPress={() => setFiltroStatus('pendente')} />
            <Chip
              label="Confirmadas"
              ativo={filtroStatus === 'confirmada'}
              onPress={() => setFiltroStatus('confirmada')}
            />
            <Chip
              label="Concluídas"
              ativo={filtroStatus === 'concluida'}
              onPress={() => setFiltroStatus('concluida')}
            />
            <Chip label="Recusadas" ativo={filtroStatus === 'recusada'} onPress={() => setFiltroStatus('recusada')} />
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtrosScrollSecundario}
            contentContainerStyle={styles.filtrosConteudo}
          >
            <Chip label="Todos ambientes" ativo={filtroAmbienteId === 'todos'} onPress={() => setFiltroAmbienteId('todos')} />
            {ambientes.map((amb) => (
              <Chip
                key={amb.id}
                label={amb.nome}
                ativo={filtroAmbienteId === amb.id}
                onPress={() => setFiltroAmbienteId(amb.id)}
              />
            ))}
          </ScrollView>

          <FlatList
            data={reservasFiltradas}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CartaoReserva
                reserva={item}
                ambiente={getAmbiente(item.ambienteId)}
                hoje={hoje}
                onAprovar={() => handleAprovar(item.id)}
                onRecusar={() => setReservaParaRecusar(item)}
                onCancelar={() => setReservaParaCancelar(item)}
              />
            )}
            contentContainerStyle={
              reservasFiltradas.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
            }
            ListEmptyComponent={
              <EstadoVazio titulo="Nenhuma reserva encontrada" texto="Ajuste os filtros para ver outras reservas." />
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <>
          <FlatList
            data={ambientes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <LinhaAmbiente
                ambiente={item}
                onEditar={() => handleAbrirEdicaoAmbiente(item)}
                onAlternarAtivo={() => handleAlternarAtivoAmbiente(item.id)}
              />
            )}
            contentContainerStyle={ambientes.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
            ListEmptyComponent={
              <EstadoVazio titulo="Nenhum ambiente cadastrado" texto='Toque no botão "+" para adicionar o primeiro.' />
            }
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity style={styles.fab} onPress={handleAbrirNovoAmbiente} activeOpacity={0.85}>
            <Text style={styles.fabTexto}>+</Text>
          </TouchableOpacity>
        </>
      )}

      <ModalRecusar
        reserva={reservaParaRecusar}
        onFechar={() => setReservaParaRecusar(null)}
        onConfirmar={handleConfirmarRecusa}
      />

      <ModalCancelar
        reserva={reservaParaCancelar}
        onFechar={() => setReservaParaCancelar(null)}
        onConfirmar={handleConfirmarCancelamento}
      />

      <ModalAmbiente
        visivel={modalAmbienteVisivel}
        ambienteEditando={ambienteEditando}
        onFechar={() => setModalAmbienteVisivel(false)}
        onSalvar={handleSalvarAmbiente}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  contadorPendentes: {
    backgroundColor: '#FBF1DE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  contadorPendentesTexto: {
    color: '#B7791F',
    fontSize: 12,
    fontWeight: '700',
  },
  abas: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
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
  filtrosScroll: {
    flexGrow: 0,
    marginTop: 14,
  },
  filtrosScrollSecundario: {
    flexGrow: 0,
    marginTop: 8,
    marginBottom: 6,
  },
  filtrosConteudo: {
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0ECE5',
    marginRight: 8,
  },
  chipAtivo: {
    backgroundColor: '#2B2823',
  },
  chipTexto: {
    fontSize: 13,
    color: '#6B6459',
    fontWeight: '500',
  },
  chipTextoAtivo: {
    color: '#FFFFFF',
  },
  listaConteudo: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 100,
  },
  cartao: {
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
  cartaoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cartaoAmbiente: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2823',
  },
  cartaoMorador: {
    fontSize: 12,
    color: '#6B6459',
    marginTop: 1,
  },
  cartaoData: {
    fontSize: 12,
    color: '#8A8377',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  cartaoObservacao: {
    fontSize: 12,
    color: '#6B6459',
    fontStyle: 'italic',
    lineHeight: 17,
    marginBottom: 8,
  },
  cartaoMotivoRecusa: {
    fontSize: 12,
    color: '#C0392B',
    lineHeight: 17,
    marginBottom: 8,
  },
  cartaoAcoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  botaoAprovar: {
    flex: 1,
    backgroundColor: '#2F855A',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  botaoAprovarTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  botaoRecusar: {
    flex: 1,
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  botaoRecusarTexto: {
    color: '#C0392B',
    fontSize: 13,
    fontWeight: '700',
  },
  botaoCancelar: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 6,
  },
  botaoCancelarTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C0392B',
  },
  linhaAmbiente: {
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
  linhaAmbienteTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  linhaAmbienteIcone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linhaAmbienteIconeTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  linhaAmbienteNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
  },
  linhaAmbienteDetalhe: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 1,
  },
  linhaAmbienteRegras: {
    fontSize: 12,
    color: '#6B6459',
    lineHeight: 17,
    marginBottom: 10,
  },
  linhaAmbienteAcoes: {
    flexDirection: 'row',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    paddingTop: 10,
  },
  acaoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D6FB4',
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2B2823',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabTexto: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
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
    marginBottom: 8,
  },
  dialogoAcoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
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
  dialogoBotaoRecusar: {
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
    maxHeight: '90%',
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
    marginBottom: 8,
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
    marginTop: 24,
  },
  botaoEnviarDesabilitado: {
    backgroundColor: '#D8D3C8',
  },
  botaoEnviarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});