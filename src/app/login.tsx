import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

const Routes = {
  inicio: './inicio',
  inicioSindico: './inicioSindico',
  inicioPorteiro: './inicioPorteiro',
} as const;

export default function Index() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }

    setErro(null);
    setCarregando(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: senha,
    });

    if (error || !data.user) {
      setCarregando(false);
      setErro(
        error?.code === 'email_not_confirmed'
          ? 'Confirme o e-mail antes de entrar. Verifique a caixa de entrada.'
          : 'E-mail ou senha incorretos.'
      );
      return;
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    setCarregando(false);

    if (perfil?.role === 'sindico') {
      router.push(Routes.inicioSindico);
    } else if (perfil?.role === 'porteiro') {
      router.push(Routes.inicioPorteiro);
    } else {
      router.push(Routes.inicio);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollConteudo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* Background decorativo */}
      <View style={styles.decorativeCircle} />

      {/* Logo e título */}
      <View style={styles.headerSection}>
        <Image source={require('../../assets/images/logo.png')} style={styles.illustration} />
        <Text style={styles.title}>Bem vindo</Text>
        <Text style={styles.subtitle}>Faça seu login para continuar</Text>
      </View>

      {/* Formulário */}
      <View style={styles.formSection}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#999999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#999999"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        {erro && <Text style={styles.erroText}>{erro}</Text>}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleLogin}
          disabled={carregando}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footerSection}>
        <Text style={styles.footerText}>
          Seu acesso é criado pelo síndico do condomínio.
        </Text>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f3e9d7',
        flex: 1,
    },
    scrollConteudo: {
        flexGrow: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    decorativeCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(228, 156, 21, 0.08)',
        top: -100,
        right: -100,
    },
    headerSection: {
        alignItems: 'center',
        marginTop: 20,
        zIndex: 1,
    },
    illustration: {
        width: 280,
        height: 280,
        resizeMode: "contain",
        marginBottom: 20,
        transform: [{ scale: 1.5 }],
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        textAlign: "center",
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        fontWeight: '500',
    },
    formSection: {
        flex: 1,
        justifyContent: 'center',
        width: '100%',
    },
    input: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#1a1a1a',
        marginBottom: 14,
    },
    erroText: {
        color: '#c0392b',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    button: {
        marginTop: 14,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#e49c15',
        justifyContent: "center",
        alignItems: "center",
        shadowColor: '#e49c15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonPressed: {
        backgroundColor: '#c67e0a',
        shadowOpacity: 0.15,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    footerSection: {
        alignItems: 'center',
        marginBottom: 10,
    },
    footerText: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        fontWeight: '500',
    },
    linkText: {
        color: '#e49c15',
        fontWeight: '700',
    }
})
