import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TituloComVoltar } from '../components/BotaoVoltar';
import { supabase } from '../lib/supabase';

// ---------- Tipos ----------

type TipoLancamento = 'receita' | 'despesa';
type Aba = 'resumo' | 'lancamentos' | 'cobrancas';
type SubAbaCobrancas = 'contas' | 'inadimplentes';
type FiltroTipo = 'todos' | TipoLancamento;

interface CategoriaInfo {
  id: string;
  nome: string;
  cor: string;
  tipo: TipoLancamento;
  orcamentoMensal: number | null;
}

interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  categoriaId: string;
  descricao: string;
  valor: number;
  dataISO: string;
}

// Observação: o banco não tem uma coluna de "notificado" para inadimplência
// (essa marcação era só um mock local) — por isso ela não existe mais aqui.
interface Inadimplente {
  moradorId: string;
  morador: string;
  apto: string;
  valorDevido: number;
  faturasEmAtraso: number;
  vencimentoMaisAntigoISO: string;
}

// Uma conta lançada para um morador (tabela faturas).
interface FaturaSindico {
  id: string;
  moradorId: string;
  moradorNome: string;
  unidade: string;
  descricao: string;
  valor: number;
  vencimentoISO: string;
  status: 'pendente' | 'pago';
  dataPagamentoISO: string | null;
}

// Contas com o mesmo assunto e vencimento, lançadas juntas para vários moradores.
interface LoteCobranca {
  chave: string;
  assunto: string;
  vencimentoISO: string;
  faturas: FaturaSindico[];
}

// ---------- Helpers ----------

// Datas sem horário (AAAA-MM-DD) são lidas no fuso do celular, para não aparecerem um dia antes.
function dataLocal(dataISO: string): Date {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO);
  return partes ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : new Date(dataISO);
}

function formatarDataNumerica(dataISO: string): string {
  return dataLocal(dataISO).toLocaleDateString('pt-BR');
}

function formatarDataHora(dataISO: string): string {
  const data = new Date(dataISO);
  return `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function textoUnidade(apto: string | null, bloco: string | null): string {
  const unidade = apto ? `Apto ${apto}` : 'Apartamento não informado';
  return bloco ? `${unidade} · ${bloco}` : unidade;
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
  return dataLocal(dataISO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function mesmoMes(dataISO: string, referencia: Date): boolean {
  const d = dataLocal(dataISO);
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
  categoria: CategoriaInfo;
  onEditar: () => void;
  onExcluir: () => void;
}

function CartaoLancamento({ lancamento, categoria, onEditar, onExcluir }: CartaoLancamentoProps) {
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
}

function CartaoInadimplente({ inadimplente }: CartaoInadimplenteProps) {
  const grave = inadimplente.faturasEmAtraso >= 3;

  return (
    <View style={[styles.cartaoInadimplente, { borderLeftColor: grave ? '#C0392B' : '#B7791F' }]}>
      <View style={styles.inadimplenteTopo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.inadimplenteNome}>{inadimplente.morador}</Text>
          <Text style={styles.inadimplenteApto}>{inadimplente.apto}</Text>
        </View>
        <View style={[styles.seloAtraso, { backgroundColor: grave ? '#FBEAE8' : '#FBF1DE' }]}>
          <Text style={[styles.seloAtrasoTexto, { color: grave ? '#C0392B' : '#B7791F' }]}>
            {inadimplente.faturasEmAtraso} {inadimplente.faturasEmAtraso === 1 ? 'conta' : 'contas'}
          </Text>
        </View>
      </View>

      <Text style={styles.inadimplenteValor}>{formatarMoeda(inadimplente.valorDevido)} em aberto</Text>
      <Text style={styles.inadimplenteUltimoPagamento}>
        Vencida desde {formatarDataCurta(inadimplente.vencimentoMaisAntigoISO)}
      </Text>
    </View>
  );
}

interface LinhaFaturaProps {
  fatura: FaturaSindico;
  hojeISO: string;
  onExcluir: (fatura: FaturaSindico) => void;
  onDesfazerPagamento: (fatura: FaturaSindico) => void;
}

function LinhaFatura({ fatura, hojeISO, onExcluir, onDesfazerPagamento }: LinhaFaturaProps) {
  const paga = fatura.status === 'pago';
  const vencida = !paga && fatura.vencimentoISO < hojeISO;

  let situacao = 'Aguardando pagamento';
  let corSituacao = '#B7791F';
  if (paga) {
    situacao = fatura.dataPagamentoISO
      ? `Pagamento confirmado em ${formatarDataHora(fatura.dataPagamentoISO)}`
      : 'Pagamento confirmado';
    corSituacao = '#2F855A';
  } else if (vencida) {
    situacao = 'Vencida, sem confirmação';
    corSituacao = '#C0392B';
  }

  return (
    <View style={styles.linhaFatura}>
      <View style={styles.linhaFaturaInfo}>
        <Text style={styles.linhaFaturaNome} numberOfLines={1}>
          {fatura.moradorNome}
        </Text>
        <Text style={styles.linhaFaturaUnidade}>{fatura.unidade}</Text>
        <Text style={[styles.linhaFaturaSituacao, { color: corSituacao }]}>{situacao}</Text>
      </View>
      <View style={styles.linhaFaturaDireita}>
        <Text style={styles.linhaFaturaValor}>{formatarMoeda(fatura.valor)}</Text>
        {paga ? (
          <TouchableOpacity onPress={() => onDesfazerPagamento(fatura)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.lancamentoAcaoTextoExcluir}>Não recebido</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => onExcluir(fatura)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.lancamentoAcaoTextoExcluir}>Excluir</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

interface CartaoLoteProps {
  lote: LoteCobranca;
  hojeISO: string;
  aberto: boolean;
  onAlternar: () => void;
  onExcluir: (fatura: FaturaSindico) => void;
  onDesfazerPagamento: (fatura: FaturaSindico) => void;
}

function CartaoLote({ lote, hojeISO, aberto, onAlternar, onExcluir, onDesfazerPagamento }: CartaoLoteProps) {
  const pagas = lote.faturas.filter((f) => f.status === 'pago');
  const total = lote.faturas.reduce((soma, f) => soma + f.valor, 0);
  const recebido = pagas.reduce((soma, f) => soma + f.valor, 0);
  const completa = pagas.length === lote.faturas.length;
  const atrasada = !completa && lote.vencimentoISO < hojeISO;

  const cores = completa
    ? { fundo: '#E7F4ED', texto: '#2F855A' }
    : atrasada
    ? { fundo: '#FBEAE8', texto: '#C0392B' }
    : { fundo: '#FBF1DE', texto: '#B7791F' };

  return (
    <View style={styles.cartaoLote}>
      <TouchableOpacity onPress={onAlternar} activeOpacity={0.8}>
        <View style={styles.loteTopo}>
          <View style={styles.loteTitulos}>
            <Text style={styles.loteAssunto}>{lote.assunto}</Text>
            <Text style={styles.loteVencimento}>Vencimento em {formatarDataNumerica(lote.vencimentoISO)}</Text>
          </View>
          <View style={[styles.seloAtraso, { backgroundColor: cores.fundo }]}>
            <Text style={[styles.seloAtrasoTexto, { color: cores.texto }]}>
              {pagas.length}/{lote.faturas.length} {lote.faturas.length === 1 ? 'paga' : 'pagas'}
            </Text>
          </View>
        </View>
        <Text style={styles.loteValores}>
          {formatarMoeda(recebido)} confirmados de {formatarMoeda(total)}
        </Text>
        <Text style={styles.loteExpandir}>{aberto ? 'Ocultar moradores' : 'Ver moradores'}</Text>
      </TouchableOpacity>

      {aberto &&
        lote.faturas.map((fatura) => (
          <LinhaFatura
            key={fatura.id}
            fatura={fatura}
            hojeISO={hojeISO}
            onExcluir={onExcluir}
            onDesfazerPagamento={onDesfazerPagamento}
          />
        ))}
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
  despesaCategorias: CategoriaInfo[];
  receitaCategorias: CategoriaInfo[];
  onFechar: () => void;
  onSalvar: (dados: DadosLancamento, idEdicao: string | null) => void;
}

function ModalLancamento({
  visivel,
  lancamentoEditando,
  despesaCategorias,
  receitaCategorias,
  onFechar,
  onSalvar,
}: ModalLancamentoProps) {
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [categoriaId, setCategoriaId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());

  const diasDisponiveis = useMemo(() => Array.from({ length: 30 }, (_, i) => addDias(new Date(), -i)).reverse(), []);

  React.useEffect(() => {
    if (visivel) {
      const tipoInicial = lancamentoEditando?.tipo ?? 'despesa';
      setTipo(tipoInicial);
      setCategoriaId(
        lancamentoEditando?.categoriaId ??
          (tipoInicial === 'despesa' ? despesaCategorias[0]?.id : receitaCategorias[0]?.id) ??
          ''
      );
      setDescricao(lancamentoEditando?.descricao ?? '');
      setValor(lancamentoEditando ? String(lancamentoEditando.valor) : '');
      setDataSelecionada(lancamentoEditando ? dataLocal(lancamentoEditando.dataISO) : new Date());
    }
  }, [visivel, lancamentoEditando, despesaCategorias, receitaCategorias]);

  function handleAlternarTipo(novoTipo: TipoLancamento) {
    setTipo(novoTipo);
    setCategoriaId((novoTipo === 'despesa' ? despesaCategorias[0]?.id : receitaCategorias[0]?.id) ?? '');
  }

  const categoriasDisponiveis = tipo === 'despesa' ? despesaCategorias : receitaCategorias;
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
        dataISO: formatarDataISO(dataSelecionada),
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

  const [abaAtiva, setAbaAtiva] = useState<Aba>('resumo');
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [faturas, setFaturas] = useState<FaturaSindico[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<Date>(hoje);

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [modalLancamentoVisivel, setModalLancamentoVisivel] = useState(false);
  const [lancamentoEditando, setLancamentoEditando] = useState<Lancamento | null>(null);
  const [lancamentoParaExcluir, setLancamentoParaExcluir] = useState<Lancamento | null>(null);

  const [subAbaCobrancas, setSubAbaCobrancas] = useState<SubAbaCobrancas>('contas');
  const [lotesAbertos, setLotesAbertos] = useState<string[]>([]);

  useEffect(() => {
    carregarCategorias();
    carregarLancamentos();
  }, []);

  async function carregarCategorias() {
    const { data, error } = await supabase
      .from('categorias_financeiras')
      .select('id, nome, tipo, cor, orcamento_mensal');

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar as categorias financeiras.');
      return;
    }

    setCategorias(
      (data ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
        cor: c.cor ?? '#8A8377',
        tipo: c.tipo,
        orcamentoMensal: c.orcamento_mensal,
      }))
    );
  }

  async function carregarLancamentos() {
    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .select('id, tipo, categoria_id, descricao, valor, data');

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar os lançamentos.');
      return;
    }

    setLancamentos(
      (data ?? []).map((l) => ({
        id: l.id,
        tipo: l.tipo,
        categoriaId: l.categoria_id ?? '',
        descricao: l.descricao,
        valor: Number(l.valor),
        dataISO: l.data,
      }))
    );
  }

  // Carrega todas as contas lançadas para os moradores, com o nome e a unidade de cada um.
  const carregarFaturas = useCallback(async () => {
    const { data, error } = await supabase
      .from('faturas')
      .select('id, morador_id, descricao, valor, vencimento, status, data_pagamento');

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar as cobranças.');
      return;
    }

    const linhas = data ?? [];
    const moradorIds = [...new Set(linhas.map((f) => f.morador_id))];
    let perfis: { id: string; nome: string; apto: string | null; bloco: string | null }[] = [];
    if (moradorIds.length > 0) {
      const { data: perfisEncontrados } = await supabase
        .from('profiles')
        .select('id, nome, apto, bloco')
        .in('id', moradorIds);
      perfis = perfisEncontrados ?? [];
    }
    const perfilPorId = new Map(perfis.map((p) => [p.id, p]));

    setFaturas(
      linhas.map((f) => {
        const perfil = perfilPorId.get(f.morador_id);
        return {
          id: f.id,
          moradorId: f.morador_id,
          moradorNome: perfil?.nome ?? 'Morador não identificado',
          unidade: textoUnidade(perfil?.apto ?? null, perfil?.bloco ?? null),
          descricao: f.descricao ?? 'Conta do condomínio',
          valor: Number(f.valor),
          vencimentoISO: f.vencimento,
          status: f.status,
          dataPagamentoISO: f.data_pagamento,
        };
      })
    );
  }, []);

  // Recarrega ao voltar para a tela, por exemplo depois de lançar uma conta nova.
  useFocusEffect(
    useCallback(() => {
      carregarFaturas();
    }, [carregarFaturas])
  );

  function getCategoria(id: string): CategoriaInfo {
    return categorias.find((c) => c.id === id) ?? { id, nome: 'Outros', cor: '#8A8377', tipo: 'despesa', orcamentoMensal: null };
  }

  const despesaCategorias = useMemo(() => categorias.filter((c) => c.tipo === 'despesa'), [categorias]);
  const receitaCategorias = useMemo(() => categorias.filter((c) => c.tipo === 'receita'), [categorias]);

  const lancamentosDoMes = useMemo(
    () => lancamentos.filter((l) => mesmoMes(l.dataISO, mesSelecionado)),
    [lancamentos, mesSelecionado]
  );

  const totalReceitas = lancamentosDoMes.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const totalDespesas = lancamentosDoMes.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  const despesasPorCategoria = useMemo(() => {
    return despesaCategorias
      .map((cat) => {
        const realizado = lancamentosDoMes
          .filter((l) => l.tipo === 'despesa' && l.categoriaId === cat.id)
          .reduce((s, l) => s + l.valor, 0);
        return { categoria: cat, realizado, orcado: cat.orcamentoMensal };
      })
      .filter((item) => item.realizado > 0 || item.orcado !== null);
  }, [despesaCategorias, lancamentosDoMes]);

  const receitasPorCategoria = useMemo(() => {
    return receitaCategorias
      .map((cat) => {
        const realizado = lancamentosDoMes
          .filter((l) => l.tipo === 'receita' && l.categoriaId === cat.id)
          .reduce((s, l) => s + l.valor, 0);
        return { categoria: cat, realizado };
      })
      .filter((item) => item.realizado > 0);
  }, [receitaCategorias, lancamentosDoMes]);

  const lancamentosFiltrados = useMemo(() => {
    return [...lancamentosDoMes]
      .filter((l) => filtroTipo === 'todos' || l.tipo === filtroTipo)
      .sort((a, b) => b.dataISO.localeCompare(a.dataISO));
  }, [lancamentosDoMes, filtroTipo]);

  const hojeISO = formatarDataISO(hoje);

  const lotes = useMemo(() => {
    const porChave = new Map<string, LoteCobranca>();
    faturas.forEach((fatura) => {
      const chave = `${fatura.descricao}|${fatura.vencimentoISO}`;
      const lote = porChave.get(chave) ?? {
        chave,
        assunto: fatura.descricao,
        vencimentoISO: fatura.vencimentoISO,
        faturas: [],
      };
      lote.faturas.push(fatura);
      porChave.set(chave, lote);
    });

    // Contas mais recentes primeiro; dentro de cada uma, quem ainda não pagou aparece antes.
    return [...porChave.values()]
      .map((lote) => ({
        ...lote,
        faturas: [...lote.faturas].sort((a, b) =>
          a.status === b.status
            ? a.unidade.localeCompare(b.unidade, 'pt-BR', { numeric: true })
            : a.status === 'pendente'
            ? -1
            : 1
        ),
      }))
      .sort((a, b) => b.vencimentoISO.localeCompare(a.vencimentoISO));
  }, [faturas]);

  const inadimplentes = useMemo(() => {
    const porMorador = new Map<string, Inadimplente>();
    faturas
      .filter((f) => f.status === 'pendente' && f.vencimentoISO < hojeISO)
      .forEach((f) => {
        const atual = porMorador.get(f.moradorId) ?? {
          moradorId: f.moradorId,
          morador: f.moradorNome,
          apto: f.unidade,
          valorDevido: 0,
          faturasEmAtraso: 0,
          vencimentoMaisAntigoISO: f.vencimentoISO,
        };
        atual.valorDevido += f.valor;
        atual.faturasEmAtraso += 1;
        if (f.vencimentoISO < atual.vencimentoMaisAntigoISO) atual.vencimentoMaisAntigoISO = f.vencimentoISO;
        porMorador.set(f.moradorId, atual);
      });
    return [...porMorador.values()].sort((a, b) => b.valorDevido - a.valorDevido);
  }, [faturas, hojeISO]);

  const totalEmAtraso = inadimplentes.reduce((s, i) => s + i.valorDevido, 0);

  function alternarLote(chave: string) {
    setLotesAbertos((atuais) => (atuais.includes(chave) ? atuais.filter((c) => c !== chave) : [...atuais, chave]));
  }

  function handleExcluirFatura(fatura: FaturaSindico) {
    Alert.alert(
      'Excluir conta',
      `Excluir "${fatura.descricao}" de ${fatura.moradorNome} (${formatarMoeda(fatura.valor)})? O morador deixa de ver esta conta.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { data, error } = await supabase.from('faturas').delete().eq('id', fatura.id).select('id');
            if (error || !data || data.length === 0) {
              Alert.alert('Erro', 'Não foi possível excluir a conta. Contas com pagamento confirmado não podem ser excluídas.');
              return;
            }
            carregarFaturas();
          },
        },
      ]
    );
  }

  // Usado quando o morador confirmou, mas o dinheiro não chegou: a conta volta a ficar pendente.
  function handleDesfazerPagamento(fatura: FaturaSindico) {
    Alert.alert(
      'Pagamento não recebido',
      `A conta de ${fatura.moradorNome} volta a ficar pendente, e ele poderá confirmar o pagamento de novo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Voltar para pendente',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('faturas')
              .update({ status: 'pendente', data_pagamento: null, forma_pagamento: null })
              .eq('id', fatura.id);
            if (error) {
              Alert.alert('Erro', 'Não foi possível alterar a conta.');
              return;
            }
            carregarFaturas();
          },
        },
      ]
    );
  }

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

  async function handleSalvarLancamento(dados: DadosLancamento, idEdicao: string | null) {
    if (idEdicao) {
      const { error } = await supabase
        .from('lancamentos_financeiros')
        .update({
          tipo: dados.tipo,
          categoria_id: dados.categoriaId,
          descricao: dados.descricao,
          valor: dados.valor,
          data: dados.dataISO,
        })
        .eq('id', idEdicao);

      if (error) {
        Alert.alert('Erro', 'Não foi possível atualizar o lançamento.');
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Erro', 'Não foi possível identificar o usuário logado.');
        return;
      }

      const { error } = await supabase.from('lancamentos_financeiros').insert({
        tipo: dados.tipo,
        categoria_id: dados.categoriaId,
        descricao: dados.descricao,
        valor: dados.valor,
        data: dados.dataISO,
        criado_por: user.id,
      });

      if (error) {
        Alert.alert('Erro', 'Não foi possível criar o lançamento.');
        return;
      }
    }

    setModalLancamentoVisivel(false);
    carregarLancamentos();
  }

  async function handleConfirmarExclusao() {
    if (!lancamentoParaExcluir) return;

    const { error } = await supabase.from('lancamentos_financeiros').delete().eq('id', lancamentoParaExcluir.id);

    if (error) {
      Alert.alert('Erro', 'Não foi possível excluir o lançamento.');
      return;
    }

    setLancamentoParaExcluir(null);
    carregarLancamentos();
  }

  return (
    <SafeAreaView edges={['top']} style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <TituloComVoltar>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Financeiro</Text>
        </TituloComVoltar>
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
          style={[styles.abaBotao, abaAtiva === 'cobrancas' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('cobrancas')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'cobrancas' && styles.abaTextoAtivo]}>Cobranças</Text>
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
                categoria={getCategoria(item.categoriaId)}
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

      {abaAtiva === 'cobrancas' && (
        <>
          <TouchableOpacity
            style={styles.botaoLancarConta}
            onPress={() => router.push('./lancarConta')}
            activeOpacity={0.85}
          >
            <Text style={styles.botaoLancarContaTexto}>Lançar nova conta</Text>
          </TouchableOpacity>

          <View style={styles.filtrosLinha}>
            <Chip
              label="Contas lançadas"
              ativo={subAbaCobrancas === 'contas'}
              onPress={() => setSubAbaCobrancas('contas')}
            />
            <Chip
              label={inadimplentes.length > 0 ? `Inadimplentes (${inadimplentes.length})` : 'Inadimplentes'}
              ativo={subAbaCobrancas === 'inadimplentes'}
              onPress={() => setSubAbaCobrancas('inadimplentes')}
            />
          </View>

          {subAbaCobrancas === 'contas' ? (
            <FlatList
              data={lotes}
              keyExtractor={(item) => item.chave}
              renderItem={({ item }) => (
                <CartaoLote
                  lote={item}
                  hojeISO={hojeISO}
                  aberto={lotesAbertos.includes(item.chave)}
                  onAlternar={() => alternarLote(item.chave)}
                  onExcluir={handleExcluirFatura}
                  onDesfazerPagamento={handleDesfazerPagamento}
                />
              )}
              contentContainerStyle={lotes.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
              ListEmptyComponent={
                <EstadoVazio
                  titulo="Nenhuma conta lançada"
                  texto='Toque em "Lançar nova conta" para cobrar os moradores.'
                />
              }
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={inadimplentes}
              keyExtractor={(item) => item.moradorId}
              renderItem={({ item }) => <CartaoInadimplente inadimplente={item} />}
              ListHeaderComponent={
                inadimplentes.length > 0 ? (
                  <View style={styles.resumoInadimplencia}>
                    <Text style={styles.resumoInadimplenciaValor}>{formatarMoeda(totalEmAtraso)}</Text>
                    <Text style={styles.resumoInadimplenciaLabel}>
                      vencido · {inadimplentes.length} morador{inadimplentes.length > 1 ? 'es' : ''}
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
        </>
      )}

      <ModalLancamento
        visivel={modalLancamentoVisivel}
        lancamentoEditando={lancamentoEditando}
        despesaCategorias={despesaCategorias}
        receitaCategorias={receitaCategorias}
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
  botaoLancarConta: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
  },
  botaoLancarContaTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cartaoLote: {
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
  loteTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  loteTitulos: {
    flex: 1,
  },
  loteAssunto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2823',
  },
  loteVencimento: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 2,
  },
  loteValores: {
    fontSize: 13,
    color: '#6B6459',
  },
  loteExpandir: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3D6FB4',
    marginTop: 8,
  },
  linhaFatura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    paddingTop: 10,
    marginTop: 10,
  },
  linhaFaturaInfo: {
    flex: 1,
  },
  linhaFaturaNome: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
  },
  linhaFaturaUnidade: {
    fontSize: 11,
    color: '#8A8377',
    marginTop: 1,
  },
  linhaFaturaSituacao: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  linhaFaturaDireita: {
    alignItems: 'flex-end',
    gap: 6,
  },
  linhaFaturaValor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B2823',
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