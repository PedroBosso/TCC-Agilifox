import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EncomendasScreen() {
  const [abaAtiva, setAbaAtiva] = useState('disponiveis');

  const encomendas = [
    {
      id: '1',
      lote: 'LOTE 202',
      titulo: 'Caixa',
      descricao:
        'Sua encomenda chegou, por favor trazer o código para retirada.',
      data: 'Chegou 25/06/2025 às 17:34',
      imagem:
        'https://picsum.photos/200',
    },
    {
      id: '2',
      lote: 'LOTE 202',
      titulo: 'Caixa',
      descricao: 'Sua encomenda chegou',
      data: 'Chegou 10/06/2025 às 12:40',
      imagem:
        'https://picsum.photos/201',
    },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.imagem }} style={styles.imagem} />

      <View style={styles.info}>
        <Text style={styles.lote}>{item.lote}</Text>

        <Text style={styles.titulo}>{item.titulo}</Text>

        <Text style={styles.descricao}>
          {item.descricao}
        </Text>

        <Text style={styles.data}>{item.data}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={28}
        color="#666"
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={28}
          color="#333"
        />

        <View>
          <Text style={styles.condominio}>
            CONDOMÍNIO RESIDENCIAL PETRONIO PORTELA
          </Text>

          <Text style={styles.tituloPagina}>
            Encomendas
          </Text>
        </View>

        <Ionicons
          name="search"
          size={28}
          color="#333"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setAbaAtiva('disponiveis')}
        >
          <Text
            style={[
              styles.tabTexto,
              abaAtiva === 'disponiveis' && styles.tabAtiva,
            ]}
          >
            Disponíveis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setAbaAtiva('retiradas')}
        >
          <Text
            style={[
              styles.tabTexto,
              abaAtiva === 'retiradas' && styles.tabAtiva,
            ]}
          >
            Retiradas
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.indicador,
          {
            left: abaAtiva === 'disponiveis' ? 0 : '50%',
          },
        ]}
      />

      {/* Lista */}
      <FlatList
        data={encomendas}
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
    backgroundColor: '#FFF',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },

  condominio: {
    fontSize: 12,
    color: '#666',
    width: 220,
  },

  tituloPagina: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#2D3A4A',
  },

  tabs: {
    flexDirection: 'row',
  },

  tab: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 15,
  },

  tabTexto: {
    fontSize: 18,
    color: '#666',
  },

  tabAtiva: {
    fontWeight: 'bold',
    color: '#000',
  },

  indicador: {
    width: '50%',
    height: 3,
    backgroundColor: '#E91E63',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },

  imagem: {
    width: 75,
    height: 75,
    borderRadius: 8,
  },

  info: {
    flex: 1,
    marginLeft: 14,
  },

  lote: {
    fontSize: 14,
    color: '#8A8A8A',
  },

  titulo: {
    fontSize: 22,
    marginTop: 4,
    color: '#333',
  },

  descricao: {
    fontSize: 16,
    color: '#5E6C7A',
    marginTop: 4,
  },

  data: {
    fontSize: 14,
    color: '#7D8790',
    marginTop: 6,
  },
});