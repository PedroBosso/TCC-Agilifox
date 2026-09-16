import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

interface Mensagem {
  id: string;
  texto: string;
  criado_em: string;
  autor_id: string;
  autor_nome: string;
}

export default function ChatPredio() {
  const [userId, setUserId] = useState<string | null>(null);
  const [meuBloco, setMeuBloco] = useState<string | null>(null);
  const [ehSindico, setEhSindico] = useState(false);
  const [blocosDisponiveis, setBlocosDisponiveis] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<FlatList>(null);

  useEffect(() => {
    iniciar();
  }, []);

  useEffect(() => {
    if (!meuBloco) return;

    const canal = supabase
      .channel(`mensagens_predio_${meuBloco}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_predio', filter: `bloco=eq.${meuBloco}` },
        (payload) => {
          adicionarMensagem(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [meuBloco]);

  async function iniciar() {
    setCarregando(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCarregando(false);
      return;
    }
    setUserId(user.id);

    const { data: perfil } = await supabase
      .from('profiles')
      .select('bloco, role')
      .eq('id', user.id)
      .maybeSingle();

    if (perfil?.role === 'sindico') {
      setEhSindico(true);

      const { data: perfis } = await supabase
        .from('profiles')
        .select('bloco')
        .not('bloco', 'is', null);

      const blocos = Array.from(new Set((perfis ?? []).map((p: any) => p.bloco))).sort();
      setBlocosDisponiveis(blocos);
      setCarregando(false);
      return;
    }

    if (!perfil?.bloco) {
      setCarregando(false);
      return;
    }

    await abrirBloco(perfil.bloco);
  }

  async function abrirBloco(bloco: string) {
    setCarregando(true);
    setMeuBloco(bloco);

    const { data, error } = await supabase
      .from('mensagens_predio')
      .select('id, texto, criado_em, autor_id, profiles(nome)')
      .eq('bloco', bloco)
      .order('criado_em', { ascending: true });

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar as mensagens.');
      setCarregando(false);
      return;
    }

    setMensagens(
      (data ?? []).map((linha: any) => ({
        id: linha.id,
        texto: linha.texto,
        criado_em: linha.criado_em,
        autor_id: linha.autor_id,
        autor_nome: linha.profiles?.nome ?? 'Morador',
      }))
    );
    setCarregando(false);
  }

  async function adicionarMensagem(linha: { id: string; texto: string; criado_em: string; autor_id: string }) {
    setMensagens((atual) => {
      if (atual.some((m) => m.id === linha.id)) return atual;

      const nomeConhecido = atual.find((m) => m.autor_id === linha.autor_id)?.autor_nome;
      return [
        ...atual,
        {
          id: linha.id,
          texto: linha.texto,
          criado_em: linha.criado_em,
          autor_id: linha.autor_id,
          autor_nome: nomeConhecido ?? (linha.autor_id === userId ? 'Você' : 'Morador'),
        },
      ];
    });

    setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function enviarMensagem() {
    const texto_limpo = texto.trim();
    if (!texto_limpo || !meuBloco || !userId) return;

    setEnviando(true);
    const { error } = await supabase.from('mensagens_predio').insert({
      bloco: meuBloco,
      autor_id: userId,
      texto: texto_limpo,
    });
    setEnviando(false);

    if (error) {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
      return;
    }
    setTexto('');
  }

  if (carregando) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <Text style={styles.semAcessoTexto}>Carregando...</Text>
      </View>
    );
  }

  if (!meuBloco && ehSindico) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.voltar}>Voltar</Text>
          </Pressable>
          <Text style={styles.titulo}>Chat do prédio</Text>
          <Text style={styles.subtitulo}>Escolha o bloco que deseja acompanhar</Text>
        </View>

        <ScrollView contentContainerStyle={styles.listaBlocos}>
          {blocosDisponiveis.length === 0 ? (
            <Text style={styles.semAcessoTexto}>
              Nenhum bloco cadastrado ainda. Cadastre moradores com prédio/bloco para liberar os chats.
            </Text>
          ) : (
            blocosDisponiveis.map((bloco) => (
              <Pressable key={bloco} style={styles.blocoCard} onPress={() => abrirBloco(bloco)}>
                <Text style={styles.blocoNome}>{bloco}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  if (!meuBloco) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <Text style={styles.semAcessoTexto}>
          Você ainda não tem um prédio/bloco atribuído. Fale com o síndico para liberar o chat.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.botaoVoltarSimples}>
          <Text style={styles.botaoVoltarSimplesTexto}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => (ehSindico ? setMeuBloco(null) : router.back())}>
            <Text style={styles.voltar}>{ehSindico ? 'Trocar bloco' : 'Voltar'}</Text>
          </Pressable>
          <Text style={styles.titulo}>Chat do prédio</Text>
          <Text style={styles.subtitulo}>{meuBloco}</Text>
        </View>

        <FlatList
          ref={listaRef}
          data={mensagens}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listaConteudo}
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const minha = item.autor_id === userId;
            return (
              <View style={[styles.bolha, minha ? styles.bolhaMinha : styles.bolhaOutro]}>
                {!minha && <Text style={styles.nomeAutor}>{item.autor_nome}</Text>}
                <Text style={[styles.textoMensagem, minha && styles.textoMensagemMinha]}>{item.texto}</Text>
              </View>
            );
          }}
        />

        <View style={styles.entradaContainer}>
          <TextInput
            style={styles.entradaInput}
            value={texto}
            onChangeText={setTexto}
            placeholder="Escreva uma mensagem"
            placeholderTextColor="#999999"
            multiline
          />
          <Pressable
            style={({ pressed }) => [styles.botaoEnviar, pressed && styles.botaoEnviarPressionado]}
            onPress={enviarMensagem}
            disabled={enviando || !texto.trim()}
          >
            <Text style={styles.botaoEnviarTexto}>Enviar</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3e9d7',
  },
  centralizado: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(228, 156, 21, 0.2)',
  },
  voltar: {
    fontSize: 14,
    color: '#e49c15',
    fontWeight: '700',
    marginBottom: 10,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  subtitulo: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  listaConteudo: {
    padding: 16,
    gap: 8,
  },
  listaBlocos: {
    padding: 20,
    gap: 12,
  },
  blocoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  blocoNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  bolha: {
    maxWidth: '78%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  bolhaMinha: {
    backgroundColor: '#e49c15',
    alignSelf: 'flex-end',
  },
  bolhaOutro: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  nomeAutor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e49c15',
    marginBottom: 2,
  },
  textoMensagem: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  textoMensagemMinha: {
    color: '#ffffff',
  },
  entradaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(228, 156, 21, 0.2)',
    backgroundColor: '#f3e9d7',
    gap: 8,
  },
  entradaInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1a1a1a',
  },
  botaoEnviar: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#e49c15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoEnviarPressionado: {
    backgroundColor: '#c67e0a',
  },
  botaoEnviarTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  semAcessoTexto: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  botaoVoltarSimples: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#e49c15',
    borderRadius: 10,
  },
  botaoVoltarSimplesTexto: {
    color: '#fff',
    fontWeight: '700',
  },
});
