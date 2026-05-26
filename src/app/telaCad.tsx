// app/visitantes/index.tsx
// Tela principal de visitantes: lista os cadastrados e dá acesso
// ao cadastro e ao reconhecimento facial.

import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { faceService, Visitante } from '../../services/faceService';

export default function Visitantes() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarVisitantes = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await faceService.listarVisitantes();
      setVisitantes(lista);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os visitantes.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarVisitantes();
  }, [carregarVisitantes]);

  const confirmarRemocao = (visitante: Visitante) => {
    Alert.alert(
      'Remover visitante',
      `Deseja remover ${visitante.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await faceService.removerVisitante(visitante.id!);
              carregarVisitantes();
            } catch {
              Alert.alert('Erro', 'Não foi possível remover o visitante.');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Visitante }) => (
    <View style={styles.card}>
      {item.fotoBase64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.fotoBase64}` }}
          style={styles.foto}
        />
      ) : (
        <View style={[styles.foto, styles.fotoPlaceholder]}>
          <Text style={styles.fotoPlaceholderText}>?</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardNome}>{item.nome}</Text>
        <Text style={styles.cardApto}>Apto. {item.apartamento}</Text>
        {item.dataRegistro && (
          <Text style={styles.cardData}>
            {new Date(item.dataRegistro).toLocaleDateString('pt-BR')}
          </Text>
        )}
      </View>
      <Pressable
        style={styles.btnRemover}
        onPress={() => confirmarRemocao(item)}
      >
        <Text style={styles.btnRemoverText}>✕</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.voltar}>{'←'}</Text>
        </Pressable>
        <Text style={styles.titulo}>Visitantes</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Botões de ação */}
      <View style={styles.acoes}>
        <Pressable
          style={styles.btnCadastrar}
          onPress={() => router.push('/visitantes/cadastro')}
        >
          <Text style={styles.btnCadastrarText}>+ Cadastrar visitante</Text>
        </Pressable>

        <Pressable
          style={styles.btnReconhecer}
          onPress={() => router.push('/visitantes/reconhecimento')}
        >
          <Text style={styles.btnReconhecerText}>🔍 Reconhecer</Text>
        </Pressable>
      </View>

      {/* Lista */}
      {carregando ? (
        <ActivityIndicator
          size="large"
          color="#e49c15"
          style={{ marginTop: 40 }}
        />
      ) : visitantes.length === 0 ? (
        <View style={styles.vazio}>
          <Text style={styles.vazioText}>Nenhum visitante cadastrado.</Text>
        </View>
      ) : (
        <FlatList
          data={visitantes}
          keyExtractor={(item) => item.id ?? item.nome}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={carregarVisitantes}
          refreshing={carregando}
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
  acoes: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  btnCadastrar: {
    flex: 1,
    backgroundColor: '#e49c15',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  btnCadastrarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnReconhecer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e49c15',
  },
  btnReconhecerText: {
    color: '#e49c15',
    fontWeight: 'bold',
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  foto: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 12,
  },
  fotoPlaceholder: {
    backgroundColor: '#e0d5c5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoPlaceholderText: {
    fontSize: 24,
    color: '#a0905e',
  },
  cardInfo: {
    flex: 1,
  },
  cardNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  cardApto: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  cardData: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 2,
  },
  btnRemover: {
    padding: 8,
  },
  btnRemoverText: {
    fontSize: 18,
    color: '#cc3333',
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