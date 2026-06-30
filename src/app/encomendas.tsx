import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Encomenda = {
  id: string;
  lote: string;
  titulo: string;
  descricao: string;
  data: string;
  imagem: string;
  tipo?: 'disponivel' | 'retirada';
  dataRetirada?: string;
};

export default function EncomendasScreen() {
  const [abaAtiva, setAbaAtiva] = useState('disponiveis');

  const encomendasDisponiveis: Encomenda[] = [
    {
      id: '1',
      lote: 'LOTE 202',
      titulo: 'Caixa',
      descricao:
        'Sua encomenda chegou, por favor trazer o código para retirada.',
      data: 'Chegou 25/06/2025 às 17:34',
      imagem: 'https://picsum.photos/200',
      tipo: 'disponivel',
    },
    {
      id: '2',
      lote: 'LOTE 202',
      titulo: 'Caixa',
      descricao: 'Sua encomenda chegou',
      data: 'Chegou 10/06/2025 às 12:40',
      imagem: 'https://picsum.photos/201',
      tipo: 'disponivel',
    },
  ];

  const encomendasRetiradas: Encomenda[] = [
    {
      id: '3',
      lote: 'LOTE 202',
      titulo: 'Caixa',
      descricao: 'Encomenda retirada com sucesso',
      data: 'Chegou 15/05/2025 às 10h19',
      dataRetirada: 'Retirada 15/5/2025 às 10h19',
      imagem: 'https://picsum.photos/200',
      tipo: 'retirada',
    },
    {
      id: '4',
      lote: 'LOTE 202',
      titulo: 'Pacote',
      descricao: 'Encomenda retirada com sucesso',
      data: 'Chegou 05/05/2025 às 11:34',
      dataRetirada: 'Retirada 7/5/2025 às 11h46',
      imagem: 'https://picsum.photos/201',
      tipo: 'retirada',
    },
  ];

  const encomendas = abaAtiva === 'disponiveis' ? encomendasDisponiveis : encomendasRetiradas;

  const renderItem = ({ item }: { item: Encomenda }) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.imagem }} style={styles.imagem} />

      <View style={styles.info}>
        <Text style={styles.lote}>{item.lote}</Text>
        <Text style={styles.titulo}>{item.titulo}</Text>
        <Text style={styles.descricao}>{item.descricao}</Text>
        {item.tipo === 'retirada' ? (
          <>
            <View style={styles.retiradaContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={14}
                color="#4CAF50"
              />
              <Text style={styles.dataRetirada}>{item.dataRetirada}</Text>
            </View>
            <Text style={styles.data}>{item.data}</Text>
          </>
        ) : (
          <Text style={styles.data}>{item.data}</Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={28} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>

        <View>
          <Text style={styles.condominio}>
            CONDOMÍNIO 
          </Text>
          <Text style={styles.tituloPagina}>Encomendas</Text>
        </View>

        <Ionicons name="search" size={28} color="#333" />
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
      {encomendas.length > 0 ? (
        <FlatList
          data={encomendas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="package-outline" size={64} color="#ddd" />
          <Text style={styles.emptyText}>
            Nenhuma encomenda {abaAtiva === 'disponiveis' ? 'disponível' : 'retirada'}
          </Text>
        </View>
      )}
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

  retiradaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  dataRetirada: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 5,
    fontWeight: '500',
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
  },
});

