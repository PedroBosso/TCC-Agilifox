// Tela de Encomendas retiradas do morador — redundante com a aba "Retiradas" de encomendas.tsx; consulta a mesma tabela encomendas.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

type EncomendaRetirada = {
  id: string;
  lote: string | null;
  tipo: string;
  retirada: string;
  chegada: string;
  imagem: string | null;
};

function formatarDataHora(dataISO: string | null): string {
  if (!dataISO) return 'Não informada';
  return new Date(dataISO).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EncomendasScreen() {
  const [abaSelecionada, setAbaSelecionada] = useState('retiradas');
  const [carregando, setCarregando] = useState(true);
  const [encomendasRetiradas, setEncomendasRetiradas] = useState<EncomendaRetirada[]>([]);

  useEffect(() => {
    carregarRetiradas();
  }, []);

  async function carregarRetiradas() {
    setCarregando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase
      .from('encomendas')
      .select('*')
      .eq('status', 'retirada')
      .eq('morador_id', user.id)
      .order('data_retirada', { ascending: false });

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar as encomendas retiradas.');
      setCarregando(false);
      return;
    }

    setEncomendasRetiradas(
      (data ?? []).map((row) => ({
        id: row.id,
        lote: row.transportadora,
        tipo: row.remetente ?? 'Encomenda',
        retirada: `Retirada ${formatarDataHora(row.data_retirada)}`,
        chegada: `Chegou ${formatarDataHora(row.data_chegada)}`,
        imagem: row.imagem_url,
      }))
    );
    setCarregando(false);
  }

  function renderItem({ item }: { item: EncomendaRetirada }) {
    return (
      <TouchableOpacity style={styles.card}>
        {item.imagem ? (
          <Image
            source={{ uri: item.imagem }}
            style={styles.imagem}
          />
        ) : (
          <View style={[styles.imagem, styles.imagemPlaceholder]}>
            <Ionicons name="cube-outline" size={28} color="#9AA5B1" />
          </View>
        )}

        <View style={styles.conteudo}>
          {item.lote && <Text style={styles.lote}>{item.lote}</Text>}

          <Text style={styles.tipo}>
            {item.tipo}
          </Text>

          <View style={styles.retiradaContainer}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#4CAF50"
            />

            <Text style={styles.retirada}>
              {item.retirada}
            </Text>
          </View>

          <Text style={styles.chegada}>
            {item.chegada}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={30}
          color="#4F5B66"
        />
      </TouchableOpacity>
    );
  }

  if (carregando) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#4F5B66" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back-outline"
            size={28}
            color="#4F5B66"
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.condominio}>
            CONDOMINIO RESIDENCIAL PETRONIO
            PORTELA
          </Text>

          <Text style={styles.titulo}>
            Encomendas
          </Text>
        </View>

        <Ionicons
          name="search-outline"
          size={28}
          color="#4F5B66"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() =>
            setAbaSelecionada('disponiveis')
          }
        >
          <Text
            style={[
              styles.tabText,
              abaSelecionada ===
                'disponiveis' &&
                styles.tabAtiva,
            ]}
          >
            Disponíveis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() =>
            setAbaSelecionada('retiradas')
          }
        >
          <Text
            style={[
              styles.tabText,
              abaSelecionada ===
                'retiradas' &&
                styles.tabAtiva,
            ]}
          >
            Retiradas
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.indicadorContainer}>
        <View
          style={[
            styles.indicador,
            {
              left:
                abaSelecionada ===
                'retiradas'
                  ? '50%'
                  : '0%',
            },
          ]}
        />
      </View>

      {abaSelecionada === 'retiradas' ? (
        <FlatList
          data={encomendasRetiradas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#ddd" />
          <Text style={styles.emptyText}>
            Nenhuma encomenda disponível
          </Text>
          <Text style={styles.emptySubtext}>
            Verifique o separador de encomendas
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E6E6',
  },

  headerText: {
    flex: 1,
    marginHorizontal: 12,
  },

  condominio: {
    fontSize: 11,
    color: '#5F6B78',
    textTransform: 'uppercase',
  },

  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3D4A',
    marginTop: 2,
  },

  tabs: {
    flexDirection: 'row',
    height: 70,
  },

  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabText: {
    fontSize: 18,
    color: '#5F6B78',
  },

  tabAtiva: {
    fontWeight: '700',
    color: '#222',
  },

  indicadorContainer: {
    height: 3,
    position: 'relative',
  },

  indicador: {
    position: 'absolute',
    width: '50%',
    height: 3,
    backgroundColor: '#E83E8C',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },

  imagem: {
    width: 74,
    height: 74,
    borderRadius: 6,
  },

  imagemPlaceholder: {
    backgroundColor: '#F0F2F4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  conteudo: {
    flex: 1,
    marginLeft: 16,
  },

  lote: {
    fontSize: 14,
    color: '#7B8794',
    textTransform: 'uppercase',
  },

  tipo: {
    fontSize: 20,
    color: '#374151',
    marginTop: 4,
  },

  retiradaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  retirada: {
    fontSize: 16,
    color: '#4CAF50',
    marginLeft: 5,
  },

  chegada: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },

  emptyText: {
    fontSize: 16,
    color: '#bbb',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },

  emptySubtext: {
    fontSize: 14,
    color: '#ddd',
    marginTop: 8,
    textAlign: 'center',
  },
});

