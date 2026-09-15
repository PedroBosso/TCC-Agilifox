import { createClient } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

function criarClienteTemporario() {
  return createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL as string,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export default function CadastrarMorador() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [apto, setApto] = useState('');
  const [bloco, setBloco] = useState('');
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

    setAutorizado(data?.role === 'sindico');
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
    const blocoLimpo = bloco.trim();

    if (!nomeLimpo || !emailLimpo || !senha || !aptoLimpo || !blocoLimpo) {
      Alert.alert('Atenção', 'Preencha nome, e-mail, senha, apartamento e prédio.');
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
          role: 'morador',
          apto: aptoLimpo,
          bloco: blocoLimpo,
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
      `A conta de ${nomeLimpo} foi criada para o apartamento ${aptoLimpo}, ${blocoLimpo}. Se a confirmação de e-mail estiver ativada no Supabase, ele só conseguirá entrar depois de confirmar o e-mail recebido.`
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
      <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.voltar}>Voltar</Text>
        </Pressable>

        <Text style={styles.titulo}>Cadastrar morador</Text>
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
        <TextInput
          style={styles.input}
          value={bloco}
          onChangeText={setBloco}
          placeholder="Ex: Bloco A"
        />

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
  voltar: {
    fontSize: 14,
    color: '#e49c15',
    fontWeight: '700',
    marginBottom: 16,
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
    opacity: 0.7,
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
