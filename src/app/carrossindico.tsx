// Tela de Estacionamento do síndico — consulta todos os veículos e vagas do condomínio.

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
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface Veiculo {
  id: string;
  placa: string;
  modelo: string | null;
  cor: string | null;
  tipo: string;
  naGaragem: boolean;
  vagaNumero: string | null;
  donoNome: string;
  donoApto: string | null;
}

interface Vaga {
  id: string;
  numero: string;
  localizacao: string | null;
  disponivelAluguel: boolean;
  valorMensal: number | null;
  donoNome: string;
  donoApto: string | null;
}

const FILTROS: { id: string; nome: string }[] = [
  { id: 'todos', nome: 'Todos' },
  { id: 'carro', nome: 'Carros' },
  { id: 'moto', nome: 'Motos' },
  { id: 'na_garagem', nome: 'Na garagem' },
];

export default function EstacionamentoSindico() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<'veiculos' | 'vagas'>('veiculos');
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);

    const [resVeiculos, resVagas] = await Promise.all([
      supabase.from('veiculos').select('*'),
      supabase.from('vagas').select('*'),
    ]);

    if (resVeiculos.error || resVagas.error) {
      Alert.alert('Erro', 'Não foi possível carregar os dados do estacionamento.');
      setCarregando(false);
      return;
    }

    const linhasVeiculos = resVeiculos.data ?? [];
    const linhasVagas = resVagas.data ?? [];

    const donoIds = Array.from(
      new Set([
        ...linhasVeiculos.map((v: any) => v.morador_id),
        ...linhasVagas.map((v: any) => v.morador_id),
      ].filter(Boolean))
    );

    let donoPorId = new Map<string, { nome: string; apto: string | null }>();
    if (donoIds.length > 0) {
      const { data: perfis } = await supabase
        .from('profiles')
        .select('id, nome, apto')
        .in('id', donoIds);
      donoPorId = new Map((perfis ?? []).map((p) => [p.id, { nome: p.nome, apto: p.apto }]));
    }

    const vagaPorId = new Map(linhasVagas.map((v: any) => [v.id, v.numero]));

    setVeiculos(
      linhasVeiculos.map((v: any) => {
        const dono = donoPorId.get(v.morador_id);
        return {
          id: v.id,
          placa: v.placa,
          modelo: v.modelo,
          cor: v.cor,
          tipo: v.tipo,
          naGaragem: v.na_garagem,
          vagaNumero: v.vaga_id ? vagaPorId.get(v.vaga_id) ?? null : null,
          donoNome: dono?.nome ?? 'Morador',
          donoApto: dono?.apto ?? null,
        };
      })
    );

    setVagas(
      linhasVagas.map((v: any) => {
        const dono = donoPorId.get(v.morador_id);
        return {
          id: v.id,
          numero: v.numero,
          localizacao: v.localizacao,
          disponivelAluguel: v.disponivel_aluguel,
          valorMensal: v.valor_mensal,
          donoNome: dono?.nome ?? 'Morador',
          donoApto: dono?.apto ?? null,
        };
      })
    );

    setCarregando(false);
  }

  const veiculosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return veiculos.filter((v) => {
      if (filtro === 'carro' && v.tipo !== 'carro') return false;
      if (filtro === 'moto' && v.tipo !== 'moto') return false;
      if (filtro === 'na_garagem' && !v.naGaragem) return false;

      if (!termo) return true;
      return (
        v.placa.toLowerCase().includes(termo) ||
        (v.modelo ?? '').toLowerCase().includes(termo) ||
        v.donoNome.toLowerCase().includes(termo) ||
        (v.donoApto ?? '').toLowerCase().includes(termo)
      );
    });
  }, [veiculos, filtro, busca]);

  const totalNaGaragem = veiculos.filter((v) => v.naGaragem).length;

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
        <Text style={styles.cabecalhoTitulo}>Estacionamento</Text>
        <Text style={styles.cabecalhoSubtitulo}>
          {veiculos.length} veículo{veiculos.length === 1 ? '' : 's'} · {totalNaGaragem} na garagem · {vagas.length} vaga{vagas.length === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.abas}>
        <Pressable
          style={[styles.aba, aba === 'veiculos' && styles.abaAtiva]}
          onPress={() => setAba('veiculos')}
        >
          <Text style={[styles.abaTexto, aba === 'veiculos' && styles.abaTextoAtivo]}>Veículos</Text>
        </Pressable>
        <Pressable
          style={[styles.aba, aba === 'vagas' && styles.abaAtiva]}
          onPress={() => setAba('vagas')}
        >
          <Text style={[styles.abaTexto, aba === 'vagas' && styles.abaTextoAtivo]}>Vagas</Text>
        </Pressable>
      </View>

      {aba === 'veiculos' ? (
        <>
          <TextInput
            style={styles.busca}
            placeholder="Buscar por placa, modelo, morador ou apto"
            placeholderTextColor="#A8A199"
            value={busca}
            onChangeText={setBusca}
          />

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
            data={veiculosFiltrados}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              veiculosFiltrados.length === 0 ? styles.listaVazia : styles.listaConteudo
            }
            ListEmptyComponent={
              <Text style={styles.vazioTexto}>Nenhum veículo encontrado.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.cartao}>
                <View style={styles.cartaoTopo}>
                  <Text style={styles.placa}>{item.placa}</Text>
                  <View
                    style={[
                      styles.selo,
                      item.naGaragem ? styles.seloDentro : styles.seloFora,
                    ]}
                  >
                    <Text style={styles.seloTexto}>
                      {item.naGaragem ? 'Na garagem' : 'Fora'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cartaoLinha}>
                  {[item.modelo, item.cor].filter(Boolean).join(' · ') || 'Sem descrição'}
                </Text>
                <Text style={styles.cartaoMeta}>
                  {item.tipo === 'moto' ? 'Moto' : 'Carro'}
                  {item.vagaNumero ? ` · ${item.vagaNumero}` : ' · Sem vaga vinculada'}
                </Text>
                <Text style={styles.cartaoMeta}>
                  {item.donoNome}
                  {item.donoApto ? ` · Apto ${item.donoApto}` : ''}
                </Text>
              </View>
            )}
          />
        </>
      ) : (
        <FlatList
          data={vagas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={vagas.length === 0 ? styles.listaVazia : styles.listaConteudo}
          ListEmptyComponent={
            <Text style={styles.vazioTexto}>Nenhuma vaga cadastrada.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.cartao}>
              <View style={styles.cartaoTopo}>
                <Text style={styles.placa}>{item.numero}</Text>
                {item.disponivelAluguel && (
                  <View style={[styles.selo, styles.seloAluguel]}>
                    <Text style={styles.seloTexto}>Disponível para aluguel</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cartaoLinha}>{item.localizacao ?? 'Localização não informada'}</Text>
              {item.valorMensal != null && (
                <Text style={styles.cartaoMeta}>
                  R$ {Number(item.valorMensal).toFixed(2).replace('.', ',')} / mês
                </Text>
              )}
              <Text style={styles.cartaoMeta}>
                {item.donoNome}
                {item.donoApto ? ` · Apto ${item.donoApto}` : ''}
              </Text>
            </View>
          )}
        />
      )}
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
  abas: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#F0ECE5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  aba: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  abaAtiva: {
    backgroundColor: '#2B2823',
  },
  abaTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6459',
  },
  abaTextoAtivo: {
    color: '#FFFFFF',
  },
  busca: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE9E1',
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: '#2B2823',
    marginBottom: 10,
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
    padding: 16,
    marginBottom: 12,
    gap: 3,
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
    gap: 8,
    marginBottom: 2,
  },
  placa: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2B2823',
    letterSpacing: 1,
    flex: 1,
  },
  selo: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  seloDentro: {
    backgroundColor: '#E7F4ED',
  },
  seloFora: {
    backgroundColor: '#F0ECE5',
  },
  seloAluguel: {
    backgroundColor: '#FBF1DE',
  },
  seloTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555555',
  },
  cartaoLinha: {
    fontSize: 14,
    color: '#6B6459',
  },
  cartaoMeta: {
    fontSize: 12,
    color: '#8A8377',
  },
});
