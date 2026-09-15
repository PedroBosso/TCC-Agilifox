import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

interface Mensagem {
  id: string;
  texto: string;
  criado_em: string;
  autor_id: string;
  autor_nome: string;
}

export default function MensagensThread() {
  const params = useLocalSearchParams<{ destino: string; moradorId?: string }>();
  const destino = params.destino === 'portaria' ? 'portaria' : 'sindico';

  const [userId, setUserId] = useState<string | null>(null);
  const [moradorId, setMoradorId] = useState<string | null>(null);
  const [tituloThread, setTituloThread] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<FlatList>(null);

  useEffect(() => {
    iniciar();
  }, []);

  useEffect(() => {
    if (!moradorId) return;

    const canal = supabase
      .channel(`mensagens_diretas_${destino}_${moradorId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_diretas', filter: `morador_id=eq.${moradorId}` },
        (payload) => {
          const linha = payload.new as any;
          if (linha.destino !== destino) return;
          adicionarMensagem(linha);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [moradorId, destino]);

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
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!perfil) {
      setCarregando(false);
      return;
    }

    const idDaConversa = perfil.role === 'morador' ? user.id : params.moradorId ?? null;
    if (!idDaConversa) {
      setCarregando(false);
      return;
    }
    setMoradorId(idDaConversa);

    if (perfil.role === 'morador') {
      setTituloThread(destino === 'sindico' ? 'Síndico' : 'Portaria');
    } else {
      const { data: perfilMorador } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', idDaConversa)
        .maybeSingle();
      setTituloThread(perfilMorador?.nome ?? 'Morador');
    }

    const { data, error } = await supabase
      .from('mensagens_diretas')
      .select('id, texto, criado_em, autor_id')
      .eq('morador_id', idDaConversa)
      .eq('destino', destino)
      .order('criado_em', { ascending: true });

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar as mensagens.');
      setCarregando(false);
      return;
    }

    const autorIds = [...new Set((data ?? []).map((m) => m.autor_id))];
    const { data: perfisAutores } = await supabase
      .from('profiles')
      .select('id, nome')
      .in('id', autorIds.length > 0 ? autorIds : ['00000000-0000-0000-0000-000000000000']);

    const nomePorId = new Map((perfisAutores ?? []).map((p) => [p.id, p.nome]));

    setMensagens(
      (data ?? []).map((linha) => ({
        id: linha.id,
        texto: linha.texto,
        criado_em: linha.criado_em,
        autor_id: linha.autor_id,
        autor_nome: nomePorId.get(linha.autor_id) ?? 'Usuário',
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
          autor_nome: nomeConhecido ?? (linha.autor_id === userId ? 'Você' : 'Usuário'),
        },
      ];
    });
    setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function enviarMensagem() {
    const texto_limpo = texto.trim();
    if (!texto_limpo || !moradorId || !userId) return;

    setEnviando(true);
    const { error } = await supabase.from('mensagens_diretas').insert({
      morador_id: moradorId,
      destino,
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
        <Text style={styles.vazioTexto}>Carregando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.voltar}>Voltar</Text>
          </Pressable>
          <Text style={styles.titulo}>{tituloThread}</Text>
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
  listaConteudo: {
    padding: 16,
    gap: 8,
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
  vazioTexto: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
  },
});
