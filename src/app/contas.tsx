// Tela de prestação de contas do morador — só leitura, dados vêm do Supabase.

import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

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

// ---------- Helpers ----------

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function agruparPorMes(lancamentos: { id: string; tipo: TipoTransacao; categoria_id: string | null; descricao: string; valor: number; data: string; comprovante_url: string | null }[]): MesFinanceiro[] {
  const mapa = new Map<string, MesFinanceiro>();

  lancamentos.forEach((l) => {
    const chave = l.data.slice(0, 7); // 'AAAA-MM'
    const [anoStr, mesStr] = chave.split('-');
    if (!mapa.has(chave)) {
      mapa.set(chave, { chave, mes: NOMES_MES[Number(mesStr) - 1] ?? mesStr, ano: Number(anoStr), transacoes: [] });
    }
    mapa.get(chave)!.transacoes.push({
      id: l.id,
      descricao: l.descricao,
      valor: Number(l.valor),
      tipo: l.tipo,
      categoriaId: l.categoria_id ?? 'outros',
      data: l.data,
      comComprovante: !!l.comprovante_url,
    });
  });

  return Array.from(mapa.values()).sort((a, b) => (a.chave < b.chave ? 1 : -1));
}

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

function getCategoria(categorias: CategoriaInfo[], id: string): CategoriaInfo {
  return categorias.find((c) => c.id === id) ?? { id: 'outros', nome: 'Outros', cor: '#8A8377' };
}

function calcularResumo(mes: MesFinanceiro, categorias: CategoriaInfo[]): ResumoMes {
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
      categoria: getCategoria(categorias, categoriaId),
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
  categoria: CategoriaInfo;
}

function ItemExtrato({ transacao, categoria }: ItemExtratoProps) {
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
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [meses, setMeses] = useState<MesFinanceiro[]>([]);

  useEffect(() => {
    carregarCategorias();
    carregarLancamentos();
  }, []);

  async function carregarCategorias() {
    const { data, error } = await supabase
      .from('categorias_financeiras')
      .select('id, nome, cor');

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar as categorias financeiras.');
      return;
    }

    setCategorias((data ?? []).map((c) => ({ id: c.id, nome: c.nome, cor: c.cor ?? '#8A8377' })));
  }

  async function carregarLancamentos() {
    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .select('id, tipo, categoria_id, descricao, valor, data, comprovante_url');

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar os lançamentos financeiros.');
      return;
    }

    setMeses(agruparPorMes(data ?? []));
  }

  const mesAtual = meses[indiceMes];
  const resumo = useMemo(() => (mesAtual ? calcularResumo(mesAtual, categorias) : null), [mesAtual, categorias]);

  const extratoOrdenado = useMemo(
    () => (mesAtual ? [...mesAtual.transacoes].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()) : []),
    [mesAtual]
  );

  const temMesAnterior = indiceMes < meses.length - 1;
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

  if (!mesAtual || !resumo) {
    return (
      <SafeAreaView style={styles.tela}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
        <View style={styles.cabecalho}>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Prestação de Contas</Text>
        </View>
        <Text style={{ paddingHorizontal: 20, color: '#8A8377', fontSize: 13 }}>
          Nenhum lançamento financeiro registrado ainda.
        </Text>
      </SafeAreaView>
    );
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
          renderItem={({ item }) => <ItemExtrato transacao={item} categoria={getCategoria(categorias, item.categoriaId)} />}
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