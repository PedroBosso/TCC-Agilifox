import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EncomendasScreen() {
  const [abaSelecionada, setAbaSelecionada] = useState('retiradas');

  const encomendasRetiradas = [
    {
      id: '1',
      lote: 'LOTE 202',
      tipo: 'Caixa',
      retirada: 'Retirada 15/5/2025 às 10h19',
      chegada: 'Chegou 14/05/2025 às 17:00',
      imagem:
        'https://picsum.photos/200',
    },
    {
      id: '2',
      lote: 'LOTE 202',
      tipo: 'Pacote',
      retirada: 'Retirada 7/5/2025 às 11h46',
      chegada: 'Chegou 05/05/2025 às 11:34',
      imagem:
        'https://picsum.photos/201',
    },
  ];

  function renderItem({ item }) {
    return (
      <TouchableOpacity style={styles.card}>
        <Image
          source={{ uri: item.imagem }}
          style={styles.imagem}
        />

        <View style={styles.conteudo}>
          <Text style={styles.lote}>{item.lote}</Text>

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

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Ionicons
          name="arrow-back-outline"
          size={28}
          color="#4F5B66"
        />

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

      <FlatList
        data={encomendasRetiradas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
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
});