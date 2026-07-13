

import React, { useMemo, useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ---------- Tipos ----------

type TipoTransacao = 'receita' | 'despesa';

interface CategoriaInfo {
  id: string;
  nome: string;
  cor: string;
}

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: TipoTransacao;
  categoriaId: string;
  data: string; // ISO
  comComprovante: boolean;
}

interface MesFinanceiro {
  chave: string; // ex: '2026-06'
  mes: string;
  ano: number;
  transacoes: Transacao[];
}

type Aba = 'resumo' | 'extrato';

// ---------- Categorias ----------

const CATEGORIAS_DESPESA: CategoriaInfo[] = [
  { id: 'manutencao', nome: 'Manutenção', cor: '#3D6FB4' },
  { id: 'limpeza', nome: 'Limpeza', cor: '#2F855A' },
  { id: 'seguranca', nome: 'Segurança', cor: '#C0392B' },
  { id: 'agua_luz', nome: 'Água e Energia', cor: '#B7791F' },
  { id: 'salarios', nome: 'Salários', cor: '#7E57A6' },
  { id: 'administrativo', nome: 'Administrativo', cor: '#8A8377' },
];

const CATEGORIAS_RECEITA: CategoriaInfo[] = [
  { id: 'taxa_condominial', nome: 'Taxa condominial', cor: '#2F855A' },
  { id: 'multas', nome: 'Multas', cor: '#B7791F' },
  { id: 'aluguel_espacos', nome: 'Aluguel de espaços', cor: '#3D6FB4' },
  { id: 'outras_receitas', nome: 'Outras receitas', cor: '#8A8377' },
];

function getCategoria(id: string): CategoriaInfo {
  const encontrada = [...CATEGORIAS_DESPESA, ...CATEGORIAS_RECEITA].find((c) => c.id === id);
  return encontrada ?? { id: 'outros', nome: 'Outros', cor: '#8A8377' };
}

// ---------- Dados mockados ----------

const MESES_MOCK: MesFinanceiro[] = [
  {
    chave: '2026-06',
    mes: 'Junho',
    ano: 2026,
    transacoes: [
      { id: 't1', descricao: 'Taxa condominial - unidades', valor: 42000, tipo: 'receita', categoriaId: 'taxa_condominial', data: '2026-06-05', comComprovante: false },
      { id: 't2', descricao: 'Aluguel do salão de festas', valor: 800, tipo: 'receita', categoriaId: 'aluguel_espacos', data: '2026-06-08', comComprovante: true },
      { id: 't3', descricao: 'Multa por atraso - unidade 302', valor: 150, tipo: 'receita', categoriaId: 'multas', data: '2026-06-10', comComprovante: false },
      { id: 't4', descricao: 'Manutenção do elevador', valor: 3200, tipo: 'despesa', categoriaId: 'manutencao', data: '2026-06-12', comComprovante: true },
      { id: 't5', descricao: 'Serviço de limpeza terceirizado', valor: 4100, tipo: 'despesa', categoriaId: 'limpeza', data: '2026-06-14', comComprovante: true },
      { id: 't6', descricao: 'Monitoramento e portaria', valor: 8900, tipo: 'despesa', categoriaId: 'seguranca', data: '2026-06-15', comComprovante: true },
      { id: 't7', descricao: 'Conta de água', valor: 2450, tipo: 'despesa', categoriaId: 'agua_luz', data: '2026-06-18', comComprovante: true },
      { id: 't8', descricao: 'Conta de energia - áreas comuns', valor: 1870, tipo: 'despesa', categoriaId: 'agua_luz', data: '2026-06-18', comComprovante: true },
      { id: 't9', descricao: 'Folha de pagamento - equipe', valor: 12500, tipo: 'despesa', categoriaId: 'salarios', data: '2026-06-20', comComprovante: false },
      { id: 't10', descricao: 'Materiais de escritório e cartório', valor: 340, tipo: 'despesa', categoriaId: 'administrativo', data: '2026-06-22', comComprovante: false },
    ],
  },
  {
    chave: '2026-05',
    mes: 'Maio',
    ano: 2026,
    transacoes: [
      { id: 't11', descricao: 'Taxa condominial - unidades', valor: 41500, tipo: 'receita', categoriaId: 'taxa_condominial', data: '2026-05-05', comComprovante: false },
      { id: 't12', descricao: 'Aluguel do salão de festas', valor: 800, tipo: 'receita', categoriaId: 'aluguel_espacos', data: '2026-05-11', comComprovante: true },
      { id: 't13', descricao: 'Pintura da fachada (parcela 2/3)', valor: 9800, tipo: 'despesa', categoriaId: 'manutencao', data: '2026-05-09', comComprovante: true },
      { id: 't14', descricao: 'Serviço de limpeza terceirizado', valor: 4100, tipo: 'despesa', categoriaId: 'limpeza', data: '2026-05-14', comComprovante: true },
      { id: 't15', descricao: 'Monitoramento e portaria', valor: 8900, tipo: 'despesa', categoriaId: 'seguranca', data: '2026-05-15', comComprovante: true },
      { id: 't16', descricao: 'Conta de água', valor: 2210, tipo: 'despesa', categoriaId: 'agua_luz', data: '2026-05-18', comComprovante: true },
      { id: 't17', descricao: 'Folha de pagamento - equipe', valor: 12500, tipo: 'despesa', categoriaId: 'salarios', data: '2026-05-20', comComprovante: false },
    ],
  },
  {
    chave: '2026-04',
    mes: 'Abril',
    ano: 2026,
    transacoes: [
      { id: 't18', descricao: 'Taxa condominial - unidades', valor: 41500, tipo: 'receita', categoriaId: 'taxa_condominial', data: '2026-04-05', comComprovante: false },
      { id: 't19', descricao: 'Multa por atraso - unidade 108', valor: 150, tipo: 'receita', categoriaId: 'multas', data: '2026-04-09', comComprovante: false },
      { id: 't20', descricao: 'Pintura da fachada (parcela 1/3)', valor: 9800, tipo: 'despesa', categoriaId: 'manutencao', data: '2026-04-10', comComprovante: true },
      { id: 't21', descricao: 'Serviço de limpeza terceirizado', valor: 4050, tipo: 'despesa', categoriaId: 'limpeza', data: '2026-04-14', comComprovante: true },
      { id: 't22', descricao: 'Monitoramento e portaria', valor: 8900, tipo: 'despesa', categoriaId: 'seguranca', data: '2026-04-15', comComprovante: true },
      { id: 't23', descricao: 'Folha de pagamento - equipe', valor: 12500, tipo: 'despesa', categoriaId: 'salarios', data: '2026-04-20', comComprovante: false },
    ],
  },
];

// ---------- Helpers ----------

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataCurta(isoString: string): string {
  const data = new Date(isoString);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

interface ResumoMes {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  porCategoriaDespesa: { categoria: CategoriaInfo; total: number; percentual: number }[];
}

function calcularResumo(mes: MesFinanceiro): ResumoMes {
  const totalReceitas = mes.transacoes
    .filter((t) => t.tipo === 'receita')
    .reduce((soma, t) => soma + t.valor, 0);

  const despesas = mes.transacoes.filter((t) => t.tipo === 'despesa');
  const totalDespesas = despesas.reduce((soma, t) => soma + t.valor, 0);

  const totaisPorCategoria = new Map<string, number>();
  despesas.forEach((t) => {
    totaisPorCategoria.set(t.categoriaId, (totaisPorCategoria.get(t.categoriaId) ?? 0) + t.valor);
  });

  const porCategoriaDespesa = Array.from(totaisPorCategoria.entries())
    .map(([categoriaId, total]) => ({
      categoria: getCategoria(categoriaId),
      total,
      percentual: totalDespesas > 0 ? total / totalDespesas : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totalReceitas,
    totalDespesas,
    saldo: totalReceitas - totalDespesas,
    porCategoriaDespesa,
  };
}

// ---------- Subcomponentes ----------

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
        {sinal} {formatarMoeda(valor)}
      </Text>
    </View>
  );
}

interface BarraCategoriaProps {
  nome: string;
  cor: string;
  total: number;
  percentual: number;
}

function BarraCategoria({ nome, cor, total, percentual }: BarraCategoriaProps) {
  return (
    <View style={styles.barraLinha}>
      <View style={styles.barraCabecalho}>
        <View style={styles.barraNomeLinha}>
          <View style={[styles.barraPonto, { backgroundColor: cor }]} />
          <Text style={styles.barraNome}>{nome}</Text>
        </View>
        <Text style={styles.barraValor}>{formatarMoeda(total)}</Text>
      </View>
      <View style={styles.barraFundo}>
        <View style={[styles.barraPreenchida, { width: `${Math.max(percentual * 100, 3)}%`, backgroundColor: cor }]} />
      </View>
    </View>
  );
}

interface ItemExtratoProps {
  transacao: Transacao;
}

function ItemExtrato({ transacao }: ItemExtratoProps) {
  const categoria = getCategoria(transacao.categoriaId);
  const ehReceita = transacao.tipo === 'receita';

  return (
    <View style={styles.itemExtrato}>
      <View style={[styles.itemExtratoIcone, { backgroundColor: categoria.cor }]}>
        <Text style={styles.itemExtratoIconeTexto}>{categoria.nome.charAt(0)}</Text>
      </View>

      <View style={styles.itemExtratoConteudo}>
        <Text style={styles.itemExtratoDescricao} numberOfLines={1}>
          {transacao.descricao}
        </Text>
        <View style={styles.itemExtratoLinhaInferior}>
          <Text style={styles.itemExtratoData}>{formatarDataCurta(transacao.data)}</Text>
          <Text style={styles.itemExtratoPonto}>·</Text>
          <Text style={styles.itemExtratoCategoria}>{categoria.nome}</Text>
          {transacao.comComprovante && (
            <View style={styles.itemExtratoSeloComprovante}>
              <Text style={styles.itemExtratoSeloComprovanteTexto}>comprovante</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.itemExtratoValor, { color: ehReceita ? '#2F855A' : '#C0392B' }]}>
        {ehReceita ? '+ ' : '− '}
        {formatarMoeda(transacao.valor)}
      </Text>
    </View>
  );
}

// ---------- Tela principal ----------

export default function TelaPrestacaoContas() {
  const [indiceMes, setIndiceMes] = useState<number>(0);
  const [abaAtiva, setAbaAtiva] = useState<Aba>('resumo');

  const mesAtual = MESES_MOCK[indiceMes];
  const resumo = useMemo(() => calcularResumo(mesAtual), [mesAtual]);

  const extratoOrdenado = useMemo(
    () => [...mesAtual.transacoes].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [mesAtual]
  );

  const temMesAnterior = indiceMes < MESES_MOCK.length - 1;
  const temMesPosterior = indiceMes > 0;

  function irParaMesAnterior() {
    if (temMesAnterior) setIndiceMes((i) => i + 1);
  }

  function irParaMesPosterior() {
    if (temMesPosterior) setIndiceMes((i) => i - 1);
  }

  function handleBaixarRelatorio() {
    // Espaço reservado para geração/abertura real do PDF, ex:
    // await abrirRelatorioPdf(mesAtual.chave)
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Prestação de Contas</Text>
      </View>

      <View style={styles.seletorMes}>
        <TouchableOpacity
          onPress={irParaMesAnterior}
          disabled={!temMesAnterior}
          style={styles.seletorMesBotao}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.seletorMesSeta, !temMesAnterior && styles.seletorMesSetaDesabilitada]}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.seletorMesTexto}>
          {mesAtual.mes} de {mesAtual.ano}
        </Text>

        <TouchableOpacity
          onPress={irParaMesPosterior}
          disabled={!temMesPosterior}
          style={styles.seletorMesBotao}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.seletorMesSeta, !temMesPosterior && styles.seletorMesSetaDesabilitada]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cartoesLinha}>
        <CartaoResumo label="Receitas" valor={resumo.totalReceitas} variante="receita" />
        <CartaoResumo label="Despesas" valor={resumo.totalDespesas} variante="despesa" />
      </View>
      <CartaoResumo label="Saldo do mês" valor={resumo.saldo} variante="saldo" />

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'resumo' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('resumo')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'resumo' && styles.abaTextoAtivo]}>Resumo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'extrato' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('extrato')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'extrato' && styles.abaTextoAtivo]}>Extrato</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'resumo' ? (
        <ScrollView contentContainerStyle={styles.conteudoScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.secaoTitulo}>Despesas por categoria</Text>
          {resumo.porCategoriaDespesa.map((item) => (
            <BarraCategoria
              key={item.categoria.id}
              nome={item.categoria.nome}
              cor={item.categoria.cor}
              total={item.total}
              percentual={item.percentual}
            />
          ))}

          <TouchableOpacity style={styles.botaoRelatorio} onPress={handleBaixarRelatorio} activeOpacity={0.85}>
            <Text style={styles.botaoRelatorioTexto}>Baixar relatório completo (PDF)</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={extratoOrdenado}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ItemExtrato transacao={item} />}
          contentContainerStyle={styles.conteudoScroll}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  seletorMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
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
    minWidth: 140,
    textAlign: 'center',
  },
  cartoesLinha: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 8,
  },
  cartaoResumo: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 0,
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
  abas: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 18,
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
  secaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 14,
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
    fontSize: 13,
    color: '#6B6459',
    fontWeight: '600',
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
  botaoRelatorio: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  botaoRelatorioTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  itemExtrato: {
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
  itemExtratoIcone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemExtratoIconeTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  itemExtratoConteudo: {
    flex: 1,
    marginRight: 8,
  },
  itemExtratoDescricao: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 3,
  },
  itemExtratoLinhaInferior: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  itemExtratoData: {
    fontSize: 11,
    color: '#A8A199',
  },
  itemExtratoPonto: {
    fontSize: 11,
    color: '#A8A199',
    marginHorizontal: 5,
  },
  itemExtratoCategoria: {
    fontSize: 11,
    color: '#A8A199',
  },
  itemExtratoSeloComprovante: {
    backgroundColor: '#F0ECE5',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  itemExtratoSeloComprovanteTexto: {
    fontSize: 9,
    color: '#6B6459',
    fontWeight: '600',
  },
  itemExtratoValor: {
    fontSize: 13,
    fontWeight: '700',
  },
});