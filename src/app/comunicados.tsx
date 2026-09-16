// Tela de Comunicados — o síndico publica, os demais apenas leem. Dados no Supabase (tabela comunicados).
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  data: string;
}

export default function Comunicados() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ehSindico, setEhSindico] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [publicando, setPublicando] = useState(false);

  useEffect(() => {
    carregarComunicados();
  }, []);

  async function carregarComunicados() {
    setCarregando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    if (user) {
      const { data: perfil } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      setEhSindico(perfil?.role === 'sindico');
    }

    const { data, error } = await supabase
      .from('comunicados')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar os comunicados.');
      setCarregando(false);
      return;
    }

    setComunicados(
      (data ?? []).map((row) => ({
        id: row.id,
        titulo: row.titulo,
        conteudo: row.conteudo,
        data: row.criado_em,
      }))
    );
    setCarregando(false);
  }

  function fecharModal() {
    setTitulo('');
    setConteudo('');
    setModalVisivel(false);
  }

  async function publicarComunicado() {
    const tituloLimpo = titulo.trim();
    const conteudoLimpo = conteudo.trim();

    if (!tituloLimpo || !conteudoLimpo) {
      Alert.alert('Atenção', 'Preencha o título e o conteúdo do comunicado.');
      return;
    }

    setPublicando(true);
    const { error } = await supabase.from('comunicados').insert({
      titulo: tituloLimpo,
      conteudo: conteudoLimpo,
      autor_id: userId,
    });
    setPublicando(false);

    if (error) {
      Alert.alert('Erro', 'Não foi possível publicar o comunicado.');
      return;
    }

    fecharModal();
    carregarComunicados();
  }

  function confirmarExclusao(id: string) {
    Alert.alert('Excluir comunicado', 'Tem certeza que deseja excluir este comunicado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('comunicados').delete().eq('id', id);
          if (error) {
            Alert.alert('Erro', 'Não foi possível excluir o comunicado.');
            return;
          }
          carregarComunicados();
        },
      },
    ]);
  }

  if (carregando) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2B2823" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#2B2823" />
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
              <View style={styles.cardRodape}>
                <Text style={styles.cardData}>
                  {new Date(item.data).toLocaleDateString('pt-BR')}
                </Text>
                {ehSindico && (
                  <Pressable onPress={() => confirmarExclusao(item.id)} hitSlop={8}>
                    <Text style={styles.cardExcluir}>Excluir</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {ehSindico && (
        <Pressable style={styles.fab} onPress={() => setModalVisivel(true)}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>
      )}

      <Modal visible={modalVisivel} animationType="slide" transparent onRequestClose={fecharModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalFundo}
        >
          <View style={styles.modalCartao}>
            <View style={styles.modalCabecalho}>
              <Text style={styles.modalTitulo}>Novo comunicado</Text>
              <Pressable onPress={fecharModal} hitSlop={10}>
                <Text style={styles.modalFechar}>Cancelar</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.campoLabel}>Título</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Manutenção da piscina"
                placeholderTextColor="#A8A199"
                value={titulo}
                onChangeText={setTitulo}
                maxLength={80}
              />

              <Text style={styles.campoLabel}>Conteúdo</Text>
              <TextInput
                style={[styles.input, styles.inputMultilinha]}
                placeholder="Escreva o comunicado para os moradores..."
                placeholderTextColor="#A8A199"
                value={conteudo}
                onChangeText={setConteudo}
                multiline
                numberOfLines={5}
                maxLength={800}
                textAlignVertical="top"
              />

              <Pressable
                style={({ pressed }) => [
                  styles.botaoPublicar,
                  pressed && { opacity: 0.85 },
                  publicando && { opacity: 0.6 },
                ]}
                onPress={publicarComunicado}
                disabled={publicando}
              >
                <Text style={styles.botaoPublicarTexto}>
                  {publicando ? 'Publicando...' : 'Publicar'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
  cardRodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardData: {
    fontSize: 12,
    color: '#999',
  },
  cardExcluir: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c0392b',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e49c15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalFundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(43, 40, 35, 0.4)',
  },
  modalCartao: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '85%',
  },
  modalCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitulo: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2B2823',
  },
  modalFechar: {
    fontSize: 14,
    color: '#8A8377',
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F7F5F1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2B2823',
    borderWidth: 1,
    borderColor: '#EDE9E1',
  },
  inputMultilinha: {
    minHeight: 120,
    paddingTop: 12,
  },
  botaoPublicar: {
    backgroundColor: '#e49c15',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  botaoPublicarTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
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