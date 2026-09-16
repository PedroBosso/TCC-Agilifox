// Tela de Ocorrências do síndico — vê todas as ocorrências (moradores e portaria) e altera o status.

import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

type OcorrenciaStatus = 'aberta' | 'andamento' | 'resolvida';

interface Ocorrencia {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  status: OcorrenciaStatus;
  local: string;
  gravidade: string | null;
  origem: string;
  encaminhadaSindico: boolean;
  data: string;
  autorNome: string;
  autorApto: string | null;
}

const CATEGORIAS: Record<string, { nome: string; cor: string }> = {
  manutencao: { nome: 'Manutenção', cor: '#3D6FB4' },
  seguranca: { nome: 'Segurança', cor: '#C0392B' },
  barulho: { nome: 'Barulho', cor: '#7E57A6' },
  limpeza: { nome: 'Limpeza', cor: '#2F855A' },
  visitante: { nome: 'Visitante', cor: '#B7791F' },
  convivencia: { nome: 'Convivência', cor: '#8A5A44' },
  veiculo: { nome: 'Veículo', cor: '#2C7A7B' },
  outros: { nome: 'Outros', cor: '#8A8377' },
};

const STATUS: Record<OcorrenciaStatus, { nome: string; cor: string; fundo: string }> = {
  aberta: { nome: 'Aberta', cor: '#C0392B', fundo: '#FBEAE8' },
  andamento: { nome: 'Em andamento', cor: '#B7791F', fundo: '#FBF1DE' },
  resolvida: { nome: 'Resolvida', cor: '#2F855A', fundo: '#E7F4ED' },
};

const GRAVIDADES: Record<string, string> = {
  normal: 'Normal',
  atencao: 'Atenção',
  urgente: 'Urgente',
};

const FILTROS: { id: string; nome: string }[] = [
  { id: 'todas', nome: 'Todas' },
  { id: 'aberta', nome: 'Abertas' },
  { id: 'andamento', nome: 'Em andamento' },
  { id: 'resolvida', nome: 'Resolvidas' },
];

function categoriaInfo(id: string) {
  return CATEGORIAS[id] ?? { nome: id, cor: '#8A8377' };
}

function formatarData(isoString: string) {
  const data = new Date(isoString);
  const agora = new Date();
  const diffDias = Math.floor((agora.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Ontem';
  if (diffDias < 7) return `Há ${diffDias} dias`;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function OcorrenciasSindico() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('todas');

  useEffect(() => {
    carregarOcorrencias();
  }, []);

  async function carregarOcorrencias() {
    setCarregando(true);

    const { data, error } = await supabase
      .from('ocorrencias')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar as ocorrências.');
      setCarregando(false);
      return;
    }

    const linhas = data ?? [];
    const autorIds = Array.from(new Set(linhas.map((o: any) => o.autor_id).filter(Boolean)));
    let autorPorId = new Map<string, { nome: string; apto: string | null }>();

    if (autorIds.length > 0) {
      const { data: perfis } = await supabase
        .from('profiles')
        .select('id, nome, apto')
        .in('id', autorIds);
      autorPorId = new Map((perfis ?? []).map((p) => [p.id, { nome: p.nome, apto: p.apto }]));
    }

    setOcorrencias(
      linhas.map((o: any) => {
        const autor = autorPorId.get(o.autor_id);
        return {
          id: o.id,
          titulo: o.titulo,
          descricao: o.descricao,
          categoria: o.categoria,
          status: o.status,
          local: o.local ?? 'Não informado',
          gravidade: o.gravidade,
          origem: o.origem,
          encaminhadaSindico: o.encaminhada_sindico,
          data: o.criado_em,
          autorNome: autor?.nome ?? 'Usuário removido',
          autorApto: autor?.apto ?? null,
        };
      })
    );
    setCarregando(false);
  }

  async function alterarStatus(id: string, novoStatus: OcorrenciaStatus) {
    const { error } = await supabase
      .from('ocorrencias')
      .update({ status: novoStatus })
      .eq('id', id);

    if (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
      return;
    }

    setOcorrencias((atual) =>
      atual.map((o) => (o.id === id ? { ...o, status: novoStatus } : o))
    );
  }

  const listaFiltrada = useMemo(() => {
    if (filtro === 'todas') return ocorrencias;
    return ocorrencias.filter((o) => o.status === filtro);
  }, [ocorrencias, filtro]);

  const totalAbertas = ocorrencias.filter((o) => o.status === 'aberta').length;

  if (carregando) {
    return (
      <View style={[styles.tela, styles.centralizado]}>
        <ActivityIndicator size="large" color="#2B2823" />
      </View>
    );
  }

  return (
    <View style={styles.tela}>
      <View style={styles.cabecalho}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.voltar}>Voltar</Text>
        </Pressable>
        <Text style={styles.cabecalhoTitulo}>Ocorrências</Text>
        <Text style={styles.cabecalhoSubtitulo}>
          {totalAbertas > 0
            ? `${totalAbertas} aberta${totalAbertas > 1 ? 's' : ''} aguardando providência`
            : 'Nenhuma ocorrência aberta'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={styles.filtrosConteudo}
      >
        {FILTROS.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.chip, filtro === f.id && styles.chipAtivo]}
            onPress={() => setFiltro(f.id)}
          >
            <Text style={[styles.chipTexto, filtro === f.id && styles.chipTextoAtivo]}>
              {f.nome}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={listaFiltrada}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          listaFiltrada.length === 0 ? styles.listaVazia : styles.listaConteudo
        }
        ListEmptyComponent={
          <Text style={styles.vazioTexto}>Nenhuma ocorrência nesse filtro.</Text>
        }
        renderItem={({ item }) => {
          const categoria = categoriaInfo(item.categoria);
          const statusConfig = STATUS[item.status];

          return (
            <View style={[styles.cartao, { borderLeftColor: statusConfig.cor }]}>
              <View style={styles.cartaoTopo}>
                <View style={[styles.categoriaSelo, { backgroundColor: categoria.cor }]}>
                  <Text style={styles.categoriaSeloTexto}>{categoria.nome}</Text>
                </View>
                <Text style={styles.cartaoData}>{formatarData(item.data)}</Text>
              </View>

              <Text style={styles.cartaoTitulo}>{item.titulo}</Text>
              <Text style={styles.cartaoDescricao}>{item.descricao}</Text>

              <Text style={styles.cartaoMeta}>
                {item.origem === 'porteiro' ? 'Portaria' : 'Morador'} · {item.autorNome}
                {item.autorApto ? ` · Apto ${item.autorApto}` : ''}
              </Text>
              <Text style={styles.cartaoMeta}>Local: {item.local}</Text>

              {item.gravidade && (
                <Text style={styles.cartaoMeta}>
                  Gravidade: {GRAVIDADES[item.gravidade] ?? item.gravidade}
                </Text>
              )}

              <View style={styles.acoes}>
                <View style={[styles.statusAtual, { backgroundColor: statusConfig.fundo }]}>
                  <Text style={[styles.statusAtualTexto, { color: statusConfig.cor }]}>
                    {statusConfig.nome}
                  </Text>
                </View>

                {item.status !== 'andamento' && item.status !== 'resolvida' && (
                  <Pressable
                    style={styles.botaoAcao}
                    onPress={() => alterarStatus(item.id, 'andamento')}
                  >
                    <Text style={styles.botaoAcaoTexto}>Iniciar</Text>
                  </Pressable>
                )}

                {item.status !== 'resolvida' && (
                  <Pressable
                    style={[styles.botaoAcao, styles.botaoResolver]}
                    onPress={() => alterarStatus(item.id, 'resolvida')}
                  >
                    <Text style={styles.botaoAcaoTexto}>Resolver</Text>
                  </Pressable>
                )}

                {item.status === 'resolvida' && (
                  <Pressable
                    style={[styles.botaoAcao, styles.botaoReabrir]}
                    onPress={() => alterarStatus(item.id, 'aberta')}
                  >
                    <Text style={styles.botaoAcaoTexto}>Reabrir</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  centralizado: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabecalho: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
  },
  voltar: {
    fontSize: 14,
    color: '#e49c15',
    fontWeight: '700',
    marginBottom: 12,
  },
  cabecalhoTitulo: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2B2823',
  },
  cabecalhoSubtitulo: {
    fontSize: 13,
    color: '#8A8377',
    marginTop: 2,
  },
  filtrosScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  filtrosConteudo: {
    paddingHorizontal: 20,
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
    paddingBottom: 40,
  },
  listaVazia: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazioTexto: {
    fontSize: 14,
    color: '#8A8377',
  },
  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderLeftWidth: 5,
    padding: 16,
    marginBottom: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cartaoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoriaSelo: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoriaSeloTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cartaoData: {
    fontSize: 11,
    color: '#A8A199',
  },
  cartaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2823',
  },
  cartaoDescricao: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 18,
    marginBottom: 4,
  },
  cartaoMeta: {
    fontSize: 12,
    color: '#8A8377',
  },
  acoes: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statusAtual: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusAtualTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  botaoAcao: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#B7791F',
  },
  botaoResolver: {
    backgroundColor: '#2F855A',
  },
  botaoReabrir: {
    backgroundColor: '#8A8377',
  },
  botaoAcaoTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
