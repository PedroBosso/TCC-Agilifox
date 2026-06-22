import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState, useEffect } from 'react';

interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  data: string;
}

export default function Comunicados() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);

  useEffect(() => {
    // TODO: Integrar com API/serviço para carregar comunicados
    setComunicados([
      {
        id: '1',
        titulo: 'Manutenção predial',
        conteudo: 'Será realizada manutenção no dia 25/06',
        data: '2026-06-22',
      },
    ]);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.voltar}>←</Text>
        </Pressable>
        <Text style={styles.titulo}>Comunicados</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Lista de comunicados */}
      {comunicados.length === 0 ? (
        <View style={styles.vazio}>
          <Text style={styles.vazioText}>Nenhum comunicado</Text>
        </View>
      ) : (
        <FlatList
          data={comunicados}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>{item.titulo}</Text>
              <Text style={styles.cardConteudo}>{item.conteudo}</Text>
              <Text style={styles.cardData}>
                {new Date(item.data).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3e9d7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  voltar: {
    fontSize: 26,
    color: '#000',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  cardConteudo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  cardData: {
    fontSize: 12,
    color: '#999',
  },
  listContent: {
    padding: 16,
  },
  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazioText: {
    fontSize: 16,
    color: '#999',
  },
});