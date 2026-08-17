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

type TipoLancamento = 'receita' | 'despesa';
type Aba = 'resumo' | 'lancamentos' | 'inadimplencia';
type FiltroTipo = 'todos' | TipoLancamento;

interface CategoriaInfo {
  id: string;
  nome: string;
  cor: string;
  tipo: TipoLancamento;
}

interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  categoriaId: string;
  descricao: string;
  valor: number;
  dataISO: string;
}

interface Inadimplente {
  id: string;
  morador: string;
  apto: string;
  valorDevido: number;
  mesesEmAtraso: number;
  ultimoPagamentoISO?: string;
  notificado: boolean;
}

// ---------- Categorias ----------

const DESPESA_CATEGORIAS: Omit<CategoriaInfo, 'tipo'>[] = [
  { id: 'manutencao', nome: 'Manutenção', cor: '#3D6FB4' },
  { id: 'agua', nome: 'Água', cor: '#2C7873' },
  { id: 'energia', nome: 'Energia', cor: '#B7791F' },
  { id: 'salarios', nome: 'Salários e Encargos', cor: '#7E57A6' },
  { id: 'seguranca', nome: 'Segurança', cor: '#C0392B' },
  { id: 'limpeza', nome: 'Limpeza', cor: '#2F855A' },
  { id: 'administrativo', nome: 'Administrativo', cor: '#8A8377' },
];

const RECEITA_CATEGORIAS: Omit<CategoriaInfo, 'tipo'>[] = [
  { id: 'taxa_condominial', nome: 'Taxa Condominial', cor: '#2F855A' },
  { id: 'aluguel_espacos', nome: 'Aluguel de Espaços', cor: '#3D6FB4' },
  { id: 'multas', nome: 'Multas', cor: '#B7791F' },
  { id: 'outras_receitas', nome: 'Outras Receitas', cor: '#8A8377' },
];

const TODAS_CATEGORIAS: CategoriaInfo[] = [
  ...DESPESA_CATEGORIAS.map((c) => ({ ...c, tipo: 'despesa' as TipoLancamento })),
  ...RECEITA_CATEGORIAS.map((c) => ({ ...c, tipo: 'receita' as TipoLancamento })),
];

const ORCAMENTO_DESPESAS: Record<string, number> = {
  manutencao: 4000,
  agua: 2500,
  energia: 2200,
  salarios: 14000,
  seguranca: 9000,
  limpeza: 4200,
  administrativo: 800,
};

// ---------- Helpers ----------

function getCategoria(id: string): CategoriaInfo {
  return TODAS_CATEGORIAS.find((c) => c.id === id) ?? TODAS_CATEGORIAS[0];
}

function addDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 24 * 60 * 60 * 1000);
}

function addMeses(data: Date, meses: number): Date {
  const nova = new Date(data);
  nova.setMonth(nova.getMonth() + meses);
  return nova;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarMesAno(data: Date): string {
  const texto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarDataCurta(dataISO: string): string {
  return new Date(dataISO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function mesmoMes(dataISO: string, referencia: Date): boolean {
  const d = new Date(dataISO);
  return d.getFullYear() === referencia.getFullYear() && d.getMonth() === referencia.getMonth();
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

// ---------- Dados mockados ----------
// Cobrem o mês atual e os dois meses anteriores, gerados a partir de "hoje"
// para que a navegação entre meses sempre mostre dados coerentes.

function gerarDadosMock(hoje: Date): { lancamentos: Lancamento[]; inadimplentes: Inadimplente[] } {
  const lancamentos: Lancamento[] = [
    // Mês atual
    { id: 'l1', tipo: 'receita', categoriaId: 'taxa_condominial', descricao: 'Taxas condominiais - unidades', valor: 42000, dataISO: addDias(hoje, -5).toISOString() },
    { id: 'l2', tipo: 'receita', categoriaId: 'aluguel_espacos', descricao: 'Aluguel do salão de festas', valor: 800, dataISO: addDias(hoje, -3).toISOString() },
    { id: 'l3', tipo: 'receita', categoriaId: 'multas', descricao: 'Multa - unidade 302', valor: 150, dataISO: addDias(hoje, -8).toISOString() },
    { id: 'l4', tipo: 'despesa', categoriaId: 'manutencao', descricao: 'Manutenção do elevador', valor: 3200, dataISO: addDias(hoje, -6).toISOString() },
    { id: 'l5', tipo: 'despesa', categoriaId: 'agua', descricao: 'Conta de água', valor: 2450, dataISO: addDias(hoje, -10).toISOString() },
    { id: 'l6', tipo: 'despesa', categoriaId: 'energia', descricao: 'Conta de energia - áreas comuns', valor: 1870, dataISO: addDias(hoje, -10).toISOString() },
    { id: 'l7', tipo: 'despesa', categoriaId: 'salarios', descricao: 'Folha de pagamento - equipe', valor: 13500, dataISO: addDias(hoje, -2).toISOString() },
    { id: 'l8', tipo: 'despesa', categoriaId: 'seguranca', descricao: 'Monitoramento e portaria', valor: 8900, dataISO: addDias(hoje, -4).toISOString() },
    { id: 'l9', tipo: 'despesa', categoriaId: 'limpeza', descricao: 'Serviço de limpeza terceirizado', valor: 4100, dataISO: addDias(hoje, -7).toISOString() },
    { id: 'l10', tipo: 'despesa', categoriaId: 'administrativo', descricao: 'Material de escritório e cartório', valor: 340, dataISO: addDias(hoje, -1).toISOString() },
    // Mês anterior
    { id: 'l11', tipo: 'receita', categoriaId: 'taxa_condominial', descricao: 'Taxas condominiais - unidades', valor: 41500, dataISO: addDias(hoje, -35).toISOString() },
    { id: 'l12', tipo: 'receita', categoriaId: 'aluguel_espacos', descricao: 'Aluguel do salão de festas', valor: 800, dataISO: addDias(hoje, -31).toISOString() },
    { id: 'l13', tipo: 'despesa', categoriaId: 'manutencao', descricao: 'Pintura da fachada (parcela 2/3)', valor: 9800, dataISO: addDias(hoje, -32).toISOString() },
    { id: 'l14', tipo: 'despesa', categoriaId: 'salarios', descricao: 'Folha de pagamento - equipe', valor: 13200, dataISO: addDias(hoje, -33).toISOString() },
    { id: 'l15', tipo: 'despesa', categoriaId: 'agua', descricao: 'Conta de água', valor: 2210, dataISO: addDias(hoje, -40).toISOString() },
    { id: 'l16', tipo: 'despesa', categoriaId: 'energia', descricao: 'Conta de energia - áreas comuns', valor: 1790, dataISO: addDias(hoje, -40).toISOString() },
    { id: 'l17', tipo: 'despesa', categoriaId: 'seguranca', descricao: 'Monitoramento e portaria', valor: 8900, dataISO: addDias(hoje, -34).toISOString() },
    { id: 'l18', tipo: 'despesa', categoriaId: 'limpeza', descricao: 'Serviço de limpeza terceirizado', valor: 4050, dataISO: addDias(hoje, -37).toISOString() },
    // Dois meses atrás
    { id: 'l19', tipo: 'receita', categoriaId: 'taxa_condominial', descricao: 'Taxas condominiais - unidades', valor: 41500, dataISO: addDias(hoje, -65).toISOString() },
    { id: 'l20', tipo: 'despesa', categoriaId: 'manutencao', descricao: 'Pintura da fachada (parcela 1/3)', valor: 9800, dataISO: addDias(hoje, -63).toISOString() },
    { id: 'l21', tipo: 'despesa', categoriaId: 'salarios', descricao: 'Folha de pagamento - equipe', valor: 13200, dataISO: addDias(hoje, -64).toISOString() },
    { id: 'l22', tipo: 'despesa', categoriaId: 'seguranca', descricao: 'Monitoramento e portaria', valor: 8900, dataISO: addDias(hoje, -65).toISOString() },
  ];

  const inadimplentes: Inadimplente[] = [
    {
      id: 'i1',
      morador: 'João Ferreira',
      apto: 'Apto 301',
      valorDevido: 1240,
      mesesEmAtraso: 2,
      ultimoPagamentoISO: addDias(hoje, -70).toISOString(),
      notificado: false,
    },
    {
      id: 'i2',
      morador: 'Pedro Alves',
      apto: 'Apto 512',
      valorDevido: 620,
      mesesEmAtraso: 1,
      ultimoPagamentoISO: addDias(hoje, -40).toISOString(),
      notificado: true,
    },
    {
      id: 'i3',
      morador: 'Marcos Silva',
      apto: 'Apto 402',
      valorDevido: 1860,
      mesesEmAtraso: 3,
      ultimoPagamentoISO: addDias(hoje, -95).toISOString(),
      notificado: false,
    },
  ];

  return { lancamentos, inadimplentes };
}

// ---------- Subcomponentes ----------

function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, ativo && styles.chipAtivo]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface CartaoResumoProps {
  label: string;
  valor: number;
  variante: 'receita' | 'despesa' | 'saldo';
}

function CartaoResumo({ label, valor, variante }: CartaoResumoProps) {
  const cores = {
    receita: { fundo: '#E7F4ED', texto: '#2F855A' },
    despesa: { fundo: '#FBEAE8', texto: '#C0392B' },
    saldo: { fundo: '#2B2823', texto: '#FFFFFF' },
  }[variante];

  const sinal = variante === 'receita' ? '+' : variante === 'despesa' ? '−' : '';

  return (
    <View style={[styles.cartaoResumo, { backgroundColor: cores.fundo }]}>
      <Text style={[styles.cartaoResumoLabel, { color: variante === 'saldo' ? '#D8D3C8' : cores.texto }]}>
        {label}
      </Text>
      <Text style={[styles.cartaoResumoValor, { color: cores.texto }]}>
        {sinal} {formatarMoeda(Math.abs(valor))}
      </Text>
    </View>
  );
}

interface BarraOrcamentoProps {
  categoria: CategoriaInfo;
  realizado: number;
  orcado: number | null;
}

function BarraOrcamento({ categoria, realizado, orcado }: BarraOrcamentoProps) {
  const percentual = orcado && orcado > 0 ? realizado / orcado : 0;
  const estourou = orcado !== null && realizado > orcado;

  return (
    <View style={styles.barraLinha}>
      <View style={styles.barraCabecalho}>
        <View style={styles.barraNomeLinha}>
          <View style={[styles.barraPonto, { backgroundColor: categoria.cor }]} />
          <Text style={styles.barraNome}>{categoria.nome}</Text>
        </View>
        <Text style={[styles.barraValor, estourou && styles.barraValorEstourado]}>
          {formatarMoeda(realizado)}
          {orcado !== null && ` / ${formatarMoeda(orcado)}`}
        </Text>
      </View>
      {orcado !== null && (
        <View style={styles.barraFundo}>
          <View
            style={[
              styles.barraPreenchida,
              {
                width: `${Math.min(percentual * 100, 100)}%`,
                backgroundColor: estourou ? '#C0392B' : categoria.cor,
              },
            ]}
          />
        </View>
      )}
      {estourou && <Text style={styles.barraAvisoEstouro}>Orçamento estourado</Text>}
    </View>
  );
}

interface CartaoLancamentoProps {
  lancamento: Lancamento;
  onEditar: () => void;
  onExcluir: () => void;
}

function CartaoLancamento({ lancamento, onEditar, onExcluir }: CartaoLancamentoProps) {
  const categoria = getCategoria(lancamento.categoriaId);
  const ehReceita = lancamento.tipo === 'receita';

  return (
    <View style={styles.cartaoLancamento}>
      <View style={[styles.lancamentoIcone, { backgroundColor: categoria.cor }]}>
        <Text style={styles.lancamentoIconeTexto}>{categoria.nome.charAt(0)}</Text>
      </View>

      <View style={styles.lancamentoConteudo}>
        <Text style={styles.lancamentoDescricao} numberOfLines={1}>
          {lancamento.descricao}
        </Text>
        <Text style={styles.lancamentoMeta}>
          {categoria.nome} · {formatarDataCurta(lancamento.dataISO)}
        </Text>
      </View>

      <View style={styles.lancamentoDireita}>
        <Text style={[styles.lancamentoValor, { color: ehReceita ? '#2F855A' : '#C0392B' }]}>
          {ehReceita ? '+ ' : '− '}
          {formatarMoeda(lancamento.valor)}
        </Text>
        <View style={styles.lancamentoAcoes}>
          <TouchableOpacity onPress={onEditar} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.lancamentoAcaoTexto}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onExcluir} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.lancamentoAcaoTextoExcluir}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

interface CartaoInadimplenteProps {
  inadimplente: Inadimplente;
  onAlternarNotificado: () => void;
}

function CartaoInadimplente({ inadimplente, onAlternarNotificado }: CartaoInadimplenteProps) {
  const grave = inadimplente.mesesEmAtraso >= 3;

  return (
    <View style={[styles.cartaoInadimplente, { borderLeftColor: grave ? '#C0392B' : '#B7791F' }]}>
      <View style={styles.inadimplenteTopo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.inadimplenteNome}>{inadimplente.morador}</Text>
          <Text style={styles.inadimplenteApto}>{inadimplente.apto}</Text>
        </View>
        <View style={[styles.seloAtraso, { backgroundColor: grave ? '#FBEAE8' : '#FBF1DE' }]}>
          <Text style={[styles.seloAtrasoTexto, { color: grave ? '#C0392B' : '#B7791F' }]}>
            {inadimplente.mesesEmAtraso} {inadimplente.mesesEmAtraso === 1 ? 'mês' : 'meses'}
          </Text>
        </View>
      </View>

      <Text style={styles.inadimplenteValor}>{formatarMoeda(inadimplente.valorDevido)} em aberto</Text>
      {inadimplente.ultimoPagamentoISO && (
        <Text style={styles.inadimplenteUltimoPagamento}>
          Último pagamento: {formatarDataCurta(inadimplente.ultimoPagamentoISO)}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.botaoNotificar, inadimplente.notificado && styles.botaoNotificarFeito]}
        onPress={onAlternarNotificado}
        activeOpacity={0.85}
      >
        <Text style={[styles.botaoNotificarTexto, inadimplente.notificado && styles.botaoNotificarTextoFeito]}>
          {inadimplente.notificado ? '✓ Notificado' : 'Marcar como notificado'}
        </Text>
      </TouchableOpacity>
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
      <Text style={[styles.itemDataNumero, selecionada && styles.itemDataTextoSelecionado]}>{data.getDate()}</Text>
    </TouchableOpacity>
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

// ---------- Modal de novo/editar lançamento ----------

interface DadosLancamento {
  tipo: TipoLancamento;
  categoriaId: string;
  descricao: string;
  valor: number;
  dataISO: string;
}

interface ModalLancamentoProps {
  visivel: boolean;
  lancamentoEditando: Lancamento | null;
  onFechar: () => void;
  onSalvar: (dados: DadosLancamento, idEdicao: string | null) => void;
}

function ModalLancamento({ visivel, lancamentoEditando, onFechar, onSalvar }: ModalLancamentoProps) {
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [categoriaId, setCategoriaId] = useState('manutencao');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());

  const diasDisponiveis = useMemo(() => Array.from({ length: 30 }, (_, i) => addDias(new Date(), -i)).reverse(), []);

  React.useEffect(() => {
    if (visivel) {
      setTipo(lancamentoEditando?.tipo ?? 'despesa');
      setCategoriaId(lancamentoEditando?.categoriaId ?? 'manutencao');
      setDescricao(lancamentoEditando?.descricao ?? '');
      setValor(lancamentoEditando ? String(lancamentoEditando.valor) : '');
      setDataSelecionada(lancamentoEditando ? new Date(lancamentoEditando.dataISO) : new Date());
    }
  }, [visivel, lancamentoEditando]);

  function handleAlternarTipo(novoTipo: TipoLancamento) {
    setTipo(novoTipo);
    setCategoriaId(novoTipo === 'despesa' ? DESPESA_CATEGORIAS[0].id : RECEITA_CATEGORIAS[0].id);
  }

  const categoriasDisponiveis = tipo === 'despesa' ? DESPESA_CATEGORIAS : RECEITA_CATEGORIAS;
  const valorNumerico = Number(valor.replace(',', '.'));
  const podeSalvar = descricao.trim().length > 0 && valor.trim().length > 0 && !isNaN(valorNumerico) && valorNumerico > 0;

  function handleSalvar() {
    if (!podeSalvar) return;
    onSalvar(
      {
        tipo,
        categoriaId,
        descricao: descricao.trim(),
        valor: valorNumerico,
        dataISO: dataSelecionada.toISOString(),
      },
      lancamentoEditando?.id ?? null
    );
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>{lancamentoEditando ? 'Editar lançamento' : 'Novo lançamento'}</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.campoLabel}>Tipo</Text>
            <View style={styles.segmentado}>
              <TouchableOpacity
                style={[styles.segmentoBotao, tipo === 'despesa' && styles.segmentoBotaoAtivoDespesa]}
                onPress={() => handleAlternarTipo('despesa')}
              >
                <Text style={[styles.segmentoTexto, tipo === 'despesa' && styles.segmentoTextoAtivo]}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentoBotao, tipo === 'receita' && styles.segmentoBotaoAtivoReceita]}
                onPress={() => handleAlternarTipo('receita')}
              >
                <Text style={[styles.segmentoTexto, tipo === 'receita' && styles.segmentoTextoAtivo]}>Receita</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.campoLabel}>Categoria</Text>
            <View style={styles.chipsLinha}>
              {categoriasDisponiveis.map((cat) => {
                const ativa = cat.id === categoriaId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoriaBotao, { borderColor: cat.cor }, ativa && { backgroundColor: cat.cor }]}
                    onPress={() => setCategoriaId(cat.id)}
                  >
                    <Text style={[styles.categoriaBotaoTexto, { color: ativa ? '#FFF' : cat.cor }]}>{cat.nome}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.campoLabel}>Descrição</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Conta de água, folha de pagamento..."
              placeholderTextColor="#A8A199"
              value={descricao}
              onChangeText={setDescricao}
              maxLength={80}
            />

            <Text style={styles.campoLabel}>Valor (R$)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: 2450"
              placeholderTextColor="#A8A199"
              value={valor}
              onChangeText={setValor}
              keyboardType="numeric"
            />

            <Text style={styles.campoLabel}>Data</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaDatas}>
              {diasDisponiveis.map((data) => (
                <ItemData
                  key={formatarDataISO(data)}
                  data={data}
                  selecionada={mesmoDia(data, dataSelecionada)}
                  onPress={() => setDataSelecionada(data)}
                />
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.botaoEnviar, !podeSalvar && styles.botaoEnviarDesabilitado]}
              onPress={handleSalvar}
              disabled={!podeSalvar}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Salvar lançamento</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Modal de confirmação de exclusão ----------

function ModalConfirmarExclusao({
  lancamento,
  onFechar,
  onConfirmar,
}: {
  lancamento: Lancamento | null;
  onFechar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <Modal visible={!!lancamento} animationType="fade" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundoCentro}>
        <View style={styles.dialogoCartao}>
          <Text style={styles.dialogoTitulo}>Excluir lançamento</Text>
          <Text style={styles.dialogoTexto}>
            Tem certeza que deseja excluir ´´{lancamento?.descricao}´´ ({lancamento ? formatarMoeda(lancamento.valor) : ''})?
            Essa ação não pode ser desfeita.
          </Text>
          <View style={styles.dialogoAcoes}>
            <TouchableOpacity style={styles.dialogoBotaoVoltar} onPress={onFechar} activeOpacity={0.8}>
              <Text style={styles.dialogoBotaoVoltarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dialogoBotaoExcluir} onPress={onConfirmar} activeOpacity={0.85}>
              <Text style={styles.dialogoBotaoConfirmarTexto}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaFinanceiroSindico() {
  const hoje = useMemo(() => new Date(), []);
  const dadosIniciais = useMemo(() => gerarDadosMock(hoje), [hoje]);

  const [abaAtiva, setAbaAtiva] = useState<Aba>('resumo');
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(dadosIniciais.lancamentos);
  const [inadimplentes, setInadimplentes] = useState<Inadimplente[]>(dadosIniciais.inadimplentes);
  const [mesSelecionado, setMesSelecionado] = useState<Date>(hoje);

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [modalLancamentoVisivel, setModalLancamentoVisivel] = useState(false);
  const [lancamentoEditando, setLancamentoEditando] = useState<Lancamento | null>(null);
  const [lancamentoParaExcluir, setLancamentoParaExcluir] = useState<Lancamento | null>(null);

  const lancamentosDoMes = useMemo(
    () => lancamentos.filter((l) => mesmoMes(l.dataISO, mesSelecionado)),
    [lancamentos, mesSelecionado]
  );

  const totalReceitas = lancamentosDoMes.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const totalDespesas = lancamentosDoMes.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  const despesasPorCategoria = useMemo(() => {
    return DESPESA_CATEGORIAS.map((cat) => {
      const realizado = lancamentosDoMes
        .filter((l) => l.tipo === 'despesa' && l.categoriaId === cat.id)
        .reduce((s, l) => s + l.valor, 0);
      return { categoria: getCategoria(cat.id), realizado, orcado: ORCAMENTO_DESPESAS[cat.id] ?? null };
    }).filter((item) => item.realizado > 0 || item.orcado !== null);
  }, [lancamentosDoMes]);

  const receitasPorCategoria = useMemo(() => {
    return RECEITA_CATEGORIAS.map((cat) => {
      const realizado = lancamentosDoMes
        .filter((l) => l.tipo === 'receita' && l.categoriaId === cat.id)
        .reduce((s, l) => s + l.valor, 0);
      return { categoria: getCategoria(cat.id), realizado };
    }).filter((item) => item.realizado > 0);
  }, [lancamentosDoMes]);

  const lancamentosFiltrados = useMemo(() => {
    return [...lancamentosDoMes]
      .filter((l) => filtroTipo === 'todos' || l.tipo === filtroTipo)
      .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime());
  }, [lancamentosDoMes, filtroTipo]);

  const totalEmAtraso = inadimplentes.reduce((s, i) => s + i.valorDevido, 0);

  const podeAvancarMes = !(
    mesSelecionado.getFullYear() === hoje.getFullYear() && mesSelecionado.getMonth() === hoje.getMonth()
  );

  function irParaMesAnterior() {
    setMesSelecionado((atual) => addMeses(atual, -1));
  }

  function irParaProximoMes() {
    if (podeAvancarMes) setMesSelecionado((atual) => addMeses(atual, 1));
  }

  function handleAbrirNovoLancamento() {
    setLancamentoEditando(null);
    setModalLancamentoVisivel(true);
  }

  function handleAbrirEdicaoLancamento(lancamento: Lancamento) {
    setLancamentoEditando(lancamento);
    setModalLancamentoVisivel(true);
  }

  function handleSalvarLancamento(dados: DadosLancamento, idEdicao: string | null) {
    if (idEdicao) {
      setLancamentos((atual) => atual.map((l) => (l.id === idEdicao ? { ...l, ...dados } : l)));
    } else {
      setLancamentos((atual) => [...atual, { ...dados, id: String(Date.now()) }]);
    }
    setModalLancamentoVisivel(false);
  }

  function handleConfirmarExclusao() {
    if (!lancamentoParaExcluir) return;
    setLancamentos((atual) => atual.filter((l) => l.id !== lancamentoParaExcluir.id));
    setLancamentoParaExcluir(null);
  }

  function handleAlternarNotificado(id: string) {
    setInadimplentes((atual) => atual.map((i) => (i.id === id ? { ...i, notificado: !i.notificado } : i)));
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Financeiro</Text>
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'resumo' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('resumo')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'resumo' && styles.abaTextoAtivo]}>Resumo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'lancamentos' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('lancamentos')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'lancamentos' && styles.abaTextoAtivo]}>Lançamentos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'inadimplencia' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('inadimplencia')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'inadimplencia' && styles.abaTextoAtivo]}>Inadimplência</Text>
        </TouchableOpacity>
      </View>

      {(abaAtiva === 'resumo' || abaAtiva === 'lancamentos') && (
        <View style={styles.seletorMes}>
          <TouchableOpacity onPress={irParaMesAnterior} style={styles.seletorMesBotao} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.seletorMesSeta}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.seletorMesTexto}>{formatarMesAno(mesSelecionado)}</Text>
          <TouchableOpacity
            onPress={irParaProximoMes}
            disabled={!podeAvancarMes}
            style={styles.seletorMesBotao}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.seletorMesSeta, !podeAvancarMes && styles.seletorMesSetaDesabilitada]}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {abaAtiva === 'resumo' && (
        <ScrollView contentContainerStyle={styles.conteudoScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.cartoesLinha}>
            <CartaoResumo label="Receitas" valor={totalReceitas} variante="receita" />
            <CartaoResumo label="Despesas" valor={totalDespesas} variante="despesa" />
          </View>
          <CartaoResumo label="Saldo do mês" valor={saldo} variante="saldo" />

          <Text style={styles.secaoTitulo}>Despesas por categoria (realizado x orçado)</Text>
          {despesasPorCategoria.length === 0 ? (
            <Text style={styles.semDadosTexto}>Nenhuma despesa lançada neste mês.</Text>
          ) : (
            despesasPorCategoria.map((item) => (
              <BarraOrcamento
                key={item.categoria.id}
                categoria={item.categoria}
                realizado={item.realizado}
                orcado={item.orcado}
              />
            ))
          )}

          <Text style={styles.secaoTitulo}>Receitas por categoria</Text>
          {receitasPorCategoria.length === 0 ? (
            <Text style={styles.semDadosTexto}>Nenhuma receita lançada neste mês.</Text>
          ) : (
            receitasPorCategoria.map((item) => (
              <BarraOrcamento key={item.categoria.id} categoria={item.categoria} realizado={item.realizado} orcado={null} />
            ))
          )}
        </ScrollView>
      )}

      {abaAtiva === 'lancamentos' && (
        <>
          <View style={styles.filtrosLinha}>
            <Chip label="Todos" ativo={filtroTipo === 'todos'} onPress={() => setFiltroTipo('todos')} />
            <Chip label="Receitas" ativo={filtroTipo === 'receita'} onPress={() => setFiltroTipo('receita')} />
            <Chip label="Despesas" ativo={filtroTipo === 'despesa'} onPress={() => setFiltroTipo('despesa')} />
          </View>

          <FlatList
            data={lancamentosFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CartaoLancamento
                lancamento={item}
                onEditar={() => handleAbrirEdicaoLancamento(item)}
                onExcluir={() => setLancamentoParaExcluir(item)}
              />
            )}
            contentContainerStyle={
              lancamentosFiltrados.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
            }
            ListEmptyComponent={
              <EstadoVazio titulo="Nenhum lançamento neste mês" texto='Toque no botão "+" para adicionar o primeiro.' />
            }
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity style={styles.fab} onPress={handleAbrirNovoLancamento} activeOpacity={0.85}>
            <Text style={styles.fabTexto}>+</Text>
          </TouchableOpacity>
        </>
      )}

      {abaAtiva === 'inadimplencia' && (
        <FlatList
          data={inadimplentes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CartaoInadimplente inadimplente={item} onAlternarNotificado={() => handleAlternarNotificado(item.id)} />
          )}
          ListHeaderComponent={
            inadimplentes.length > 0 ? (
              <View style={styles.resumoInadimplencia}>
                <Text style={styles.resumoInadimplenciaValor}>{formatarMoeda(totalEmAtraso)}</Text>
                <Text style={styles.resumoInadimplenciaLabel}>
                  em aberto · {inadimplentes.length} morador{inadimplentes.length > 1 ? 'es' : ''}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={inadimplentes.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
          ListEmptyComponent={
            <EstadoVazio titulo="Nenhum morador inadimplente" texto="Todos os moradores estão em dia com o condomínio." />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ModalLancamento
        visivel={modalLancamentoVisivel}
        lancamentoEditando={lancamentoEditando}
        onFechar={() => setModalLancamentoVisivel(false)}
        onSalvar={handleSalvarLancamento}
      />

      <ModalConfirmarExclusao
        lancamento={lancamentoParaExcluir}
        onFechar={() => setLancamentoParaExcluir(null)}
        onConfirmar={handleConfirmarExclusao}
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
  seletorMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  seletorMesBotao: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seletorMesSeta: {
    fontSize: 24,
    color: '#2B2823',
    fontWeight: '400',
  },
  seletorMesSetaDesabilitada: {
    color: '#D8D3C8',
  },
  seletorMesTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2823',
    marginHorizontal: 16,
    minWidth: 150,
    textAlign: 'center',
  },
  conteudoScroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  cartoesLinha: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  cartaoResumo: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
  },
  cartaoResumoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  cartaoResumoValor: {
    fontSize: 17,
    fontWeight: '700',
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
    marginTop: 22,
    marginBottom: 12,
  },
  semDadosTexto: {
    fontSize: 12,
    color: '#A8A199',
  },
  barraLinha: {
    marginBottom: 16,
  },
  barraCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barraNomeLinha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barraPonto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  barraNome: {
    fontSize: 13,
    color: '#2B2823',
    fontWeight: '500',
  },
  barraValor: {
    fontSize: 12,
    color: '#6B6459',
    fontWeight: '600',
  },
  barraValorEstourado: {
    color: '#C0392B',
  },
  barraFundo: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EDE9E1',
    overflow: 'hidden',
  },
  barraPreenchida: {
    height: 8,
    borderRadius: 4,
  },
  barraAvisoEstouro: {
    fontSize: 10,
    color: '#C0392B',
    fontWeight: '700',
    marginTop: 3,
  },
  filtrosLinha: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 6,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0ECE5',
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
  cartaoLancamento: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  lancamentoIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lancamentoIconeTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  lancamentoConteudo: {
    flex: 1,
    marginRight: 8,
  },
  lancamentoDescricao: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 2,
  },
  lancamentoMeta: {
    fontSize: 11,
    color: '#A8A199',
  },
  lancamentoDireita: {
    alignItems: 'flex-end',
  },
  lancamentoValor: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  lancamentoAcoes: {
    flexDirection: 'row',
    gap: 10,
  },
  lancamentoAcaoTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D6FB4',
  },
  lancamentoAcaoTextoExcluir: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C0392B',
  },
  resumoInadimplencia: {
    backgroundColor: '#2B2823',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  resumoInadimplenciaValor: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  resumoInadimplenciaLabel: {
    fontSize: 12,
    color: '#D8D3C8',
  },
  cartaoInadimplente: {
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
  inadimplenteTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  inadimplenteNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
  },
  inadimplenteApto: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 1,
  },
  seloAtraso: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  seloAtrasoTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  inadimplenteValor: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 2,
  },
  inadimplenteUltimoPagamento: {
    fontSize: 12,
    color: '#A8A199',
    marginBottom: 12,
  },
  botaoNotificar: {
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  botaoNotificarFeito: {
    backgroundColor: '#E7F4ED',
  },
  botaoNotificarTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B2823',
  },
  botaoNotificarTextoFeito: {
    color: '#2F855A',
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
  segmentoBotaoAtivoDespesa: {
    backgroundColor: '#C0392B',
  },
  segmentoBotaoAtivoReceita: {
    backgroundColor: '#2F855A',
  },
  segmentoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6459',
  },
  segmentoTextoAtivo: {
    color: '#FFFFFF',
  },
  chipsLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoriaBotao: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },
  categoriaBotaoTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
  listaDatas: {
    paddingBottom: 4,
    paddingRight: 4,
  },
  itemData: {
    width: 50,
    height: 60,
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
    fontSize: 10,
    color: '#8A8377',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  itemDataNumero: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2823',
  },
  itemDataTextoSelecionado: {
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
  dialogoBotaoExcluir: {
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