/**
 * TelaAssembleiaSindico.tsx
 *
 * Tela de Assembleias Online para o síndico. O síndico cadastra a assembleia
 * (título, tipo, data, horário, duração) e adiciona o link da reunião
 * (Google Meet, Zoom, Teams...) para que os moradores possam entrar na hora
 * certa. Quem apenas entra na reunião é o morador, na tela
 * TelaAssembleiaMorador.tsx.
 *
 * Front-end apenas — os dados abaixo são mockados (gerarAssembleiasMock).
 *
 * Para integrar com back-end depois, basta substituir:
 *   1. O estado inicial de `assembleias` por uma chamada à API (useEffect + fetch/axios)
 *   2. `handlePublicar` por um POST para o seu endpoint
 *   3. `handleSalvarLink`, `handleCancelarAssembleia` e `handleEncerrarAgora` por
 *      chamadas PATCH no endpoint correspondente
 *
 * Dependências: apenas React e React Native "puro" — nenhuma lib extra necessária.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

type TipoAssembleia = 'ordinaria' | 'extraordinaria';
type StatusAssembleia = 'agendada' | 'ao_vivo' | 'encerrada' | 'cancelada';
type Aba = 'nova' | 'publicadas';

interface Assembleia {
  id: string;
  titulo: string;
  tipo: TipoAssembleia;
  dataISO: string; // horário de início
  duracaoMinutos: number;
  linkReuniao: string;
  status: 'agendada' | 'cancelada'; // status base definido pelo síndico
  encerradaManualmente?: boolean;
}

// ---------- Configuração visual ----------

const CONFIG_TIPO: Record<TipoAssembleia, { nome: string; cor: string }> = {
  ordinaria: { nome: 'Ordinária', cor: '#3D6FB4' },
  extraordinaria: { nome: 'Extraordinária', cor: '#7E57A6' },
};

const CONFIG_STATUS: Record<StatusAssembleia, { nome: string; cor: string; fundo: string }> = {
  agendada: { nome: 'Agendada', cor: '#B7791F', fundo: '#FBF1DE' },
  ao_vivo: { nome: 'Ao vivo agora', cor: '#C0392B', fundo: '#FBEAE8' },
  encerrada: { nome: 'Encerrada', cor: '#8A8377', fundo: '#F0ECE5' },
  cancelada: { nome: 'Cancelada', cor: '#8A8377', fundo: '#F0ECE5' },
};

const HORARIOS_COMUNS = ['09:00', '14:00', '19:00', '19:30', '20:00', '20:30'];

const DURACOES: { valor: number; label: string }[] = [
  { valor: 30, label: '30 min' },
  { valor: 60, label: '1h' },
  { valor: 90, label: '1h30' },
  { valor: 120, label: '2h' },
];

// ---------- Helpers de data ----------

function addDias(data: Date, dias: number): Date {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

function addMinutos(data: Date, minutos: number): Date {
  return new Date(data.getTime() + minutos * 60000);
}

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function mesmoDia(a: Date, b: Date): boolean {
  return formatarDataISO(a) === formatarDataISO(b);
}

function formatarDiaSemanaAbrev(data: Date): string {
  return data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function formatarDataHoraExtensa(dataISO: string): string {
  const data = new Date(dataISO);
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dataFormatada} às ${horaFormatada}`;
}

function combinarDataHora(data: Date, horario: string): string {
  const [horas, minutos] = horario.split(':').map(Number);
  const combinada = new Date(data);
  combinada.setHours(horas, minutos, 0, 0);
  return combinada.toISOString();
}

function calcularStatusExibicao(assembleia: Assembleia, agora: Date): StatusAssembleia {
  if (assembleia.status === 'cancelada') return 'cancelada';
  if (assembleia.encerradaManualmente) return 'encerrada';

  const inicio = new Date(assembleia.dataISO);
  const fim = addMinutos(inicio, assembleia.duracaoMinutos);
  const liberaEntradaEm = addMinutos(inicio, -15);

  if (agora < liberaEntradaEm) return 'agendada';
  if (agora <= fim) return 'ao_vivo';
  return 'encerrada';
}

// ---------- Dados mockados ----------
// Gerados a partir de "agora" para que a tela sempre demonstre os diferentes
// estados possíveis (agendada, ao vivo, encerrada, cancelada).

function gerarAssembleiasMock(agora: Date): Assembleia[] {
  return [
    {
      id: 'a1',
      titulo: 'Assembleia Geral Ordinária — Prestação de Contas',
      tipo: 'ordinaria',
      dataISO: addMinutos(agora, -10).toISOString(),
      duracaoMinutos: 90,
      linkReuniao: 'https://meet.google.com/exemplo-condominio',
      status: 'agendada',
    },
    {
      id: 'a2',
      titulo: 'Assembleia Extraordinária — Troca do playground',
      tipo: 'extraordinaria',
      dataISO: addDias(agora, 5).toISOString(),
      duracaoMinutos: 60,
      linkReuniao: 'https://meet.google.com/outro-exemplo',
      status: 'agendada',
    },
    {
      id: 'a3',
      titulo: 'Assembleia Geral Extraordinária — Nova empresa de portaria',
      tipo: 'extraordinaria',
      dataISO: addDias(agora, -35).toISOString(),
      duracaoMinutos: 60,
      linkReuniao: 'https://meet.google.com/encerrada-1',
      status: 'agendada',
    },
    {
      id: 'a4',
      titulo: 'Assembleia Geral Ordinária — Reforma do playground',
      tipo: 'ordinaria',
      dataISO: addDias(agora, 12).toISOString(),
      duracaoMinutos: 90,
      linkReuniao: 'https://meet.google.com/cancelada-1',
      status: 'cancelada',
    },
  ];
}

// ---------- Subcomponentes ----------

function SeloTipo({ tipo }: { tipo: TipoAssembleia }) {
  const config = CONFIG_TIPO[tipo];
  return (
    <View style={[styles.seloTipo, { backgroundColor: `${config.cor}1A` }]}>
      <Text style={[styles.seloTipoTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

function SeloStatus({ status }: { status: StatusAssembleia }) {
  const config = CONFIG_STATUS[status];
  return (
    <View style={[styles.selo, { backgroundColor: config.fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: config.cor }]} />
      <Text style={[styles.seloTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
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

interface CartaoAssembleiaProps {
  assembleia: Assembleia;
  agora: Date;
  onEditarLink: (assembleia: Assembleia) => void;
  onCancelar: (id: string) => void;
  onEncerrarAgora: (id: string) => void;
}

function CartaoAssembleia({
  assembleia,
  agora,
  onEditarLink,
  onCancelar,
  onEncerrarAgora,
}: CartaoAssembleiaProps) {
  const status = calcularStatusExibicao(assembleia, agora);
  const podeCancelar = status === 'agendada' || status === 'ao_vivo';
  const podeEncerrar = status === 'ao_vivo';
  const podeEditarLink = status === 'agendada' || status === 'ao_vivo';

  return (
    <View style={styles.cartao}>
      <View style={styles.cartaoTopo}>
        <SeloTipo tipo={assembleia.tipo} />
        <SeloStatus status={status} />
      </View>

      <Text style={styles.cartaoTitulo}>{assembleia.titulo}</Text>
      <Text style={styles.cartaoData}>{formatarDataHoraExtensa(assembleia.dataISO)}</Text>

      <View style={styles.cartaoLinkLinha}>
        <Text style={styles.cartaoLinkLabel}>Link:</Text>
        <Text style={styles.cartaoLinkTexto} numberOfLines={1}>
          {assembleia.linkReuniao || 'Nenhum link adicionado'}
        </Text>
      </View>

      <View style={styles.cartaoAcoes}>
        {podeEditarLink && (
          <TouchableOpacity onPress={() => onEditarLink(assembleia)} style={styles.cartaoAcaoBotao}>
            <Text style={styles.cartaoAcaoTexto}>Editar link</Text>
          </TouchableOpacity>
        )}
        {podeEncerrar && (
          <TouchableOpacity onPress={() => onEncerrarAgora(assembleia.id)} style={styles.cartaoAcaoBotao}>
            <Text style={styles.cartaoAcaoTexto}>Encerrar agora</Text>
          </TouchableOpacity>
        )}
        {podeCancelar && (
          <TouchableOpacity onPress={() => onCancelar(assembleia.id)} style={styles.cartaoAcaoBotao}>
            <Text style={styles.cartaoAcaoTextoCancelar}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function EstadoVazio() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>+</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhuma assembleia publicada</Text>
      <Text style={styles.estadoVazioTexto}>
        Use a aba ´Nova assembleia´ para agendar a primeira reunião.
      </Text>
    </View>
  );
}

// ---------- Modal de edição de link ----------

interface ModalEditarLinkProps {
  assembleia: Assembleia | null;
  onFechar: () => void;
  onSalvar: (id: string, novoLink: string) => void;
}

function ModalEditarLink({ assembleia, onFechar, onSalvar }: ModalEditarLinkProps) {
  const [link, setLink] = useState('');

  useEffect(() => {
    if (assembleia) setLink(assembleia.linkReuniao);
  }, [assembleia]);

  function handleSalvar() {
    if (!assembleia || !link.trim()) return;
    onSalvar(assembleia.id, link.trim());
  }

  return (
    <Modal visible={!!assembleia} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalFundo}
      >
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Editar link</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          {assembleia && <Text style={styles.modalSubtitulo}>{assembleia.titulo}</Text>}

          <Text style={styles.campoLabel}>Link da reunião</Text>
          <TextInput
            style={styles.input}
            placeholder="https://meet.google.com/..."
            placeholderTextColor="#A8A199"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.botaoEnviar, !link.trim() && styles.botaoEnviarDesabilitado]}
            onPress={handleSalvar}
            disabled={!link.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.botaoEnviarTexto}>Salvar link</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaAssembleiaSindico() {
  const referenciaInicial = useRef(new Date()).current;
  const diasDisponiveis = useMemo(
    () => Array.from({ length: 30 }, (_, i) => addDias(referenciaInicial, i)),
    [referenciaInicial]
  );

  const [agora, setAgora] = useState(new Date());
  const [abaAtiva, setAbaAtiva] = useState<Aba>('nova');
  const [assembleias, setAssembleias] = useState<Assembleia[]>(() => gerarAssembleiasMock(referenciaInicial));

  // Campos do formulário
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoAssembleia>('ordinaria');
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  const [duracaoSelecionada, setDuracaoSelecionada] = useState<number>(60);
  const [link, setLink] = useState('');

  const [assembleiaEditandoLink, setAssembleiaEditandoLink] = useState<Assembleia | null>(null);

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  const assembleiasOrdenadas = useMemo(
    () => [...assembleias].sort((a, b) => new Date(a.dataISO).getTime() - new Date(b.dataISO).getTime()),
    [assembleias]
  );

  const podePublicar =
    titulo.trim().length > 0 && dataSelecionada !== null && horarioSelecionado !== null && link.trim().length > 0;

  function limparFormulario() {
    setTitulo('');
    setTipo('ordinaria');
    setDataSelecionada(null);
    setHorarioSelecionado(null);
    setDuracaoSelecionada(60);
    setLink('');
  }

  function handlePublicar() {
    if (!podePublicar || !dataSelecionada || !horarioSelecionado) return;

    const novaAssembleia: Assembleia = {
      id: String(Date.now()),
      titulo: titulo.trim(),
      tipo,
      dataISO: combinarDataHora(dataSelecionada, horarioSelecionado),
      duracaoMinutos: duracaoSelecionada,
      linkReuniao: link.trim(),
      status: 'agendada',
    };

    setAssembleias((atual) => [novaAssembleia, ...atual]);
    limparFormulario();
    setAbaAtiva('publicadas');
  }

  function handleSalvarLink(id: string, novoLink: string) {
    setAssembleias((atual) => atual.map((a) => (a.id === id ? { ...a, linkReuniao: novoLink } : a)));
    setAssembleiaEditandoLink(null);
  }

  function handleCancelarAssembleia(id: string) {
    setAssembleias((atual) => atual.map((a) => (a.id === id ? { ...a, status: 'cancelada' } : a)));
  }

  function handleEncerrarAgora(id: string) {
    setAssembleias((atual) => atual.map((a) => (a.id === id ? { ...a, encerradaManualmente: true } : a)));
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Assembleias Online</Text>
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'nova' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('nova')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'nova' && styles.abaTextoAtivo]}>
            Nova assembleia
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'publicadas' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('publicadas')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'publicadas' && styles.abaTextoAtivo]}>
            Publicadas
          </Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'nova' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.conteudoScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.campoLabel}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Assembleia Geral Ordinária"
              placeholderTextColor="#A8A199"
              value={titulo}
              onChangeText={setTitulo}
              maxLength={80}
            />

            <Text style={styles.campoLabel}>Tipo</Text>
            <View style={styles.segmentado}>
              <TouchableOpacity
                style={[styles.segmentoBotao, tipo === 'ordinaria' && styles.segmentoBotaoAtivo]}
                onPress={() => setTipo('ordinaria')}
              >
                <Text style={[styles.segmentoTexto, tipo === 'ordinaria' && styles.segmentoTextoAtivo]}>
                  Ordinária
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentoBotao, tipo === 'extraordinaria' && styles.segmentoBotaoAtivo]}
                onPress={() => setTipo('extraordinaria')}
              >
                <Text
                  style={[styles.segmentoTexto, tipo === 'extraordinaria' && styles.segmentoTextoAtivo]}
                >
                  Extraordinária
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.campoLabel}>Data</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listaDatas}
            >
              {diasDisponiveis.map((data) => (
                <ItemData
                  key={formatarDataISO(data)}
                  data={data}
                  selecionada={dataSelecionada !== null && mesmoDia(data, dataSelecionada)}
                  onPress={() => setDataSelecionada(data)}
                />
              ))}
            </ScrollView>

            <Text style={styles.campoLabel}>Horário</Text>
            <View style={styles.chipsLinha}>
              {HORARIOS_COMUNS.map((horario) => {
                const ativo = horario === horarioSelecionado;
                return (
                  <TouchableOpacity
                    key={horario}
                    style={[styles.chip, ativo && styles.chipAtivo]}
                    onPress={() => setHorarioSelecionado(horario)}
                  >
                    <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{horario}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.campoLabel}>Duração prevista</Text>
            <View style={styles.chipsLinha}>
              {DURACOES.map((duracao) => {
                const ativo = duracao.valor === duracaoSelecionada;
                return (
                  <TouchableOpacity
                    key={duracao.valor}
                    style={[styles.chip, ativo && styles.chipAtivo]}
                    onPress={() => setDuracaoSelecionada(duracao.valor)}
                  >
                    <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{duracao.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.campoLabel}>Link da reunião</Text>
            <TextInput
              style={styles.input}
              placeholder="Cole aqui o link do Google Meet, Zoom, Teams..."
              placeholderTextColor="#A8A199"
              value={link}
              onChangeText={setLink}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.campoAjuda}>
              O botão de entrada libera automaticamente para os moradores 15 minutos antes do horário
              marcado.
            </Text>

            <TouchableOpacity
              style={[styles.botaoEnviar, !podePublicar && styles.botaoEnviarDesabilitado]}
              onPress={handlePublicar}
              disabled={!podePublicar}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Publicar assembleia</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={assembleiasOrdenadas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CartaoAssembleia
              assembleia={item}
              agora={agora}
              onEditarLink={setAssembleiaEditandoLink}
              onCancelar={handleCancelarAssembleia}
              onEncerrarAgora={handleEncerrarAgora}
            />
          )}
          contentContainerStyle={
            assembleiasOrdenadas.length === 0 ? styles.listaVaziaContainer : styles.conteudoScroll
          }
          ListEmptyComponent={<EstadoVazio />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ModalEditarLink
        assembleia={assembleiaEditandoLink}
        onFechar={() => setAssembleiaEditandoLink(null)}
        onSalvar={handleSalvarLink}
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
  conteudoScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 16,
  },
  campoAjuda: {
    fontSize: 11,
    color: '#A8A199',
    marginTop: 8,
    lineHeight: 15,
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
  segmentado: {
    flexDirection: 'row',
    backgroundColor: '#F0ECE5',
    borderRadius: 12,
    padding: 4,
  },
  segmentoBotao: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentoBotaoAtivo: {
    backgroundColor: '#2B2823',
  },
  segmentoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6459',
  },
  segmentoTextoAtivo: {
    color: '#FFFFFF',
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
  chipsLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F0ECE5',
    marginRight: 8,
    marginBottom: 8,
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
  cartao: {
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
  cartaoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 4,
    lineHeight: 20,
  },
  cartaoData: {
    fontSize: 12,
    color: '#8A8377',
    textTransform: 'capitalize',
    marginBottom: 12,
  },
  cartaoLinkLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5F1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  cartaoLinkLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6459',
    marginRight: 6,
  },
  cartaoLinkTexto: {
    flex: 1,
    fontSize: 12,
    color: '#3D6FB4',
  },
  cartaoAcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cartaoAcaoBotao: {
    paddingVertical: 2,
  },
  cartaoAcaoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D6FB4',
  },
  cartaoAcaoTextoCancelar: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C0392B',
  },
  seloTipo: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  seloTipoTexto: {
    fontSize: 11,
    fontWeight: '700',
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
    marginBottom: 6,
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
  modalSubtitulo: {
    fontSize: 13,
    color: '#8A8377',
    marginBottom: 8,
  },
});