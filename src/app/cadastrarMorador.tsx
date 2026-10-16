import { createClient } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { TituloComVoltar } from '../components/BotaoVoltar';
import { supabase } from '../lib/supabase';

function criarClienteTemporario() {
  return createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL as string,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function normalizarNomeBloco(texto: string) {
  return texto.trim().replace(/\s+/g, ' ');
}

export default function CadastrarMorador() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [apto, setApto] = useState('');
  const [bloco, setBloco] = useState('');
  const [blocos, setBlocos] = useState<string[]>([]);
  const [criandoBloco, setCriandoBloco] = useState(false);
  const [novoBloco, setNovoBloco] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    verificarPermissao();
  }, []);

  async function verificarPermissao() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAutorizado(false);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const ehSindico = data?.role === 'sindico';
    setAutorizado(ehSindico);
    if (ehSindico) carregarBlocos();
  }

  async function carregarBlocos() {
    const { data, error } = await supabase.from('blocos').select('nome').order('nome');
    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar a lista de blocos.');
      return;
    }
    setBlocos((data ?? []).map((b) => b.nome));
  }

  function handleCriarBloco() {
    const nomeBloco = normalizarNomeBloco(novoBloco);
    if (!nomeBloco) return;

    const existente = blocos.find((b) => b.toLowerCase() === nomeBloco.toLowerCase());
    if (existente) {
      Alert.alert('Bloco já existe', `Já existe o bloco "${existente}". Ele foi selecionado.`);
      setBloco(existente);
      setCriandoBloco(false);
      setNovoBloco('');
      return;
    }

    Alert.alert(
      'Criar bloco',
      `Criar o bloco "${nomeBloco}"? Confira a grafia: ele vai aparecer como opção em todos os cadastros.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Criar', onPress: () => salvarNovoBloco(nomeBloco) },
      ]
    );
  }

  async function salvarNovoBloco(nomeBloco: string) {
    const { error } = await supabase.from('blocos').insert({ nome: nomeBloco });

    if (error) {
      Alert.alert(
        'Erro',
        error.code === '23505'
          ? 'Já existe um bloco com esse nome.'
          : 'Não foi possível criar o bloco.'
      );
      return;
    }

    await carregarBlocos();
    setBloco(nomeBloco);
    setCriandoBloco(false);
    setNovoBloco('');
  }

  function handleRemoverBloco(nomeBloco: string) {
    Alert.alert(
      'Remover bloco',
      `Remover o bloco "${nomeBloco}" da lista? Isso só é possível se nenhum morador estiver nele.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('blocos').delete().eq('nome', nomeBloco);
            if (error) {
              Alert.alert(
                'Não foi possível remover',
                error.code === '23503'
                  ? 'Esse bloco tem moradores ou mensagens e não pode ser removido.'
                  : 'Tente novamente.'
              );
              return;
            }
            if (bloco === nomeBloco) setBloco('');
            carregarBlocos();
          },
        },
      ]
    );
  }

  function limparFormulario() {
    setNome('');
    setEmail('');
    setSenha('');
    setApto('');
    setBloco('');
  }

  async function handleCadastrar() {
    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();
    const aptoLimpo = apto.trim();

    if (!nomeLimpo || !emailLimpo || !senha || !aptoLimpo || !bloco) {
      Alert.alert('Atenção', 'Preencha nome, e-mail, senha, apartamento e escolha o bloco.');
      return;
    }

    if (senha.length < 6) {
      Alert.alert('Atenção', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setEnviando(true);

    const clienteTemporario = criarClienteTemporario();
    const { error } = await clienteTemporario.auth.signUp({
      email: emailLimpo,
      password: senha,
      options: {
        data: {
          nome: nomeLimpo,
          apto: aptoLimpo,
          bloco,
        },
      },
    });

    setEnviando(false);

    if (error) {
      Alert.alert('Erro ao cadastrar', error.message);
      return;
    }

    Alert.alert(
      'Morador cadastrado',
      `A conta de ${nomeLimpo} foi criada para o apartamento ${aptoLimpo}, ${bloco}.`
    );
    limparFormulario();
  }

  if (autorizado === null) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <ActivityIndicator size="large" color="#e49c15" />
      </View>
    );
  }

  if (!autorizado) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <Text style={styles.semAcessoTexto}>Apenas o síndico pode acessar esta tela.</Text>
        <Pressable onPress={() => router.back()} style={styles.botaoVoltarSimples}>
          <Text style={styles.botaoVoltarSimplesTexto}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <TituloComVoltar>
          <Text style={styles.titulo}>Cadastrar morador</Text>
        </TituloComVoltar>
        <Text style={styles.subtitulo}>Crie o acesso do morador e atribua o apartamento e o prédio dele.</Text>

        <Text style={styles.label}>Nome completo</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Maria Souza"
          autoCapitalize="words"
        />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="morador@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Senha provisória</Text>
        <TextInput
          style={styles.input}
          value={senha}
          onChangeText={setSenha}
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
        />

        <Text style={styles.label}>Apartamento</Text>
        <TextInput
          style={styles.input}
          value={apto}
          onChangeText={setApto}
          placeholder="Ex: 101"
        />

        <Text style={styles.label}>Prédio / Bloco</Text>
        <View style={styles.blocosLinha}>
          {blocos.map((b) => (
            <Pressable
              key={b}
              style={[styles.blocoChip, bloco === b && styles.blocoChipAtivo]}
              onPress={() => setBloco(b)}
              onLongPress={() => handleRemoverBloco(b)}
            >
              <Text style={[styles.blocoChipTexto, bloco === b && styles.blocoChipTextoAtivo]}>{b}</Text>
            </Pressable>
          ))}
          {!criandoBloco && (
            <Pressable style={[styles.blocoChip, styles.blocoChipNovo]} onPress={() => setCriandoBloco(true)}>
              <Text style={styles.blocoChipNovoTexto}>+ Novo bloco</Text>
            </Pressable>
          )}
        </View>

        {blocos.length === 0 && !criandoBloco && (
          <Text style={styles.ajuda}>Nenhum bloco cadastrado ainda. Crie o primeiro em “+ Novo bloco”.</Text>
        )}

        {criandoBloco && (
          <View style={styles.novoBlocoCaixa}>
            <TextInput
              style={[styles.input, styles.novoBlocoInput]}
              value={novoBloco}
              onChangeText={setNovoBloco}
              placeholder="Ex: Bloco C"
              autoFocus
            />
            <View style={styles.novoBlocoAcoes}>
              <Pressable
                onPress={() => {
                  setCriandoBloco(false);
                  setNovoBloco('');
                }}
              >
                <Text style={styles.novoBlocoCancelar}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.novoBlocoBotao, !normalizarNomeBloco(novoBloco) && styles.botaoDesabilitado]}
                onPress={handleCriarBloco}
                disabled={!normalizarNomeBloco(novoBloco)}
              >
                <Text style={styles.novoBlocoBotaoTexto}>Adicionar</Text>
              </Pressable>
            </View>
          </View>
        )}

        {blocos.length > 0 && (
          <Text style={styles.ajuda}>Toque e segure um bloco para removê-lo (só se não tiver moradores).</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.botao, pressed && styles.botaoPressionado, enviando && styles.botaoDesabilitado]}
          onPress={handleCadastrar}
          disabled={enviando}
        >
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Cadastrar morador</Text>}
        </Pressable>
      </ScrollView>
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
  conteudo: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 60,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1a1a1a',
  },
  blocosLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  blocoChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e49c15',
    backgroundColor: '#ffffff',
  },
  blocoChipAtivo: {
    backgroundColor: '#e49c15',
  },
  blocoChipTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c67e0a',
  },
  blocoChipTextoAtivo: {
    color: '#ffffff',
  },
  blocoChipNovo: {
    borderStyle: 'dashed',
    borderColor: '#999999',
    backgroundColor: 'transparent',
  },
  blocoChipNovoTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  novoBlocoCaixa: {
    marginTop: 10,
  },
  novoBlocoInput: {
    marginBottom: 8,
  },
  novoBlocoAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  novoBlocoCancelar: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  novoBlocoBotao: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e49c15',
  },
  novoBlocoBotaoTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  ajuda: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 8,
  },
  botao: {
    marginTop: 28,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#e49c15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoPressionado: {
    backgroundColor: '#c67e0a',
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
