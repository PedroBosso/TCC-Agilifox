/**
 * TelaConfiguracoes.tsx
 *
 * Tela de Configurações do usuário — a mesma para morador, síndico e
 * porteiro (o que muda entre eles é só o dado carregado do perfil, nunca a
 * tela em si). Permite alterar e-mail, telefone e foto de perfil.
 *
 * "Cadastro facial" aqui foi implementado como troca de foto de perfil (a
 * mesma imagem que aparece no ícone de usuário da tela de início) — não como
 * reconhecimento facial de verdade, que envolveria biometria e é um projeto
 * à parte, com implicações de privacidade bem maiores do que uma simples
 * foto de perfil.
 *
 * AJUSTES NECESSÁRIOS:
 *   1. O caminho do import `../../lib/supabase` deve apontar para o cliente
 *      Supabase configurado no seu projeto.
 *   2. Instale o seletor de imagens: npx expo install expo-image-picker
 *   3. Crie um bucket chamado "avatars" no Supabase Storage (veja o SQL de
 *      políticas de acesso na resposta que acompanha este arquivo).
 *   4. A tabela `profiles` precisa das colunas `telefone` e `foto_url`
 *      (também no SQL da resposta).
 *
 * Dependências: @supabase/supabase-js (já usado no projeto) e expo-image-picker.
 */

import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

// ---------- Tipos ----------

type Role = 'morador' | 'sindico' | 'porteiro';

interface Perfil {
  id: string;
  nome: string;
  role: Role;
  apto: string | null;
  email: string;
  telefone: string | null;
  fotoUrl: string | null;
}

interface Mensagem {
  tipo: 'sucesso' | 'erro';
  texto: string;
}

// ---------- Configuração visual ----------

const NOME_ROLE: Record<Role, string> = {
  morador: 'Morador',
  sindico: 'Síndico(a)',
  porteiro: 'Porteiro(a)',
};

// ---------- Tela principal ----------

export default function TelaConfiguracoes() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  useEffect(() => {
    carregarPerfil();
  }, []);

  async function carregarPerfil() {
    setCarregando(true);
    setMensagem(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível identificar o usuário logado.' });
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, role, apto, telefone, foto_url')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar seu perfil.' });
      setCarregando(false);
      return;
    }

    const perfilCarregado: Perfil = {
      id: data.id,
      nome: data.nome,
      role: data.role,
      apto: data.apto,
      telefone: data.telefone,
      fotoUrl: data.foto_url,
      email: user.email ?? '',
    };

    setPerfil(perfilCarregado);
    setEmail(perfilCarregado.email);
    setTelefone(perfilCarregado.telefone ?? '');
    setCarregando(false);
  }

  async function handleAlterarFoto() {
    if (!perfil) return;

    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setMensagem({ tipo: 'erro', texto: 'Precisamos de permissão para acessar suas fotos.' });
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (resultado.canceled) return;

    setEnviandoFoto(true);
    setMensagem(null);

    try {
      const arquivo = resultado.assets[0];
      const resposta = await fetch(arquivo.uri);
      const arrayBuffer = await resposta.arrayBuffer();
      const extensao = arquivo.uri.split('.').pop() ?? 'jpg';
      const caminho = `${perfil.id}/${Date.now()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from('avatars')
        .upload(caminho, arrayBuffer, { contentType: arquivo.mimeType ?? 'image/jpeg', upsert: true });

      if (erroUpload) throw erroUpload;

      const { data: urlPublica } = supabase.storage.from('avatars').getPublicUrl(caminho);

      const { error: erroPerfil } = await supabase
        .from('profiles')
        .update({ foto_url: urlPublica.publicUrl })
        .eq('id', perfil.id);

      if (erroPerfil) throw erroPerfil;

      setPerfil((atual) => (atual ? { ...atual, fotoUrl: urlPublica.publicUrl } : atual));
      setMensagem({ tipo: 'sucesso', texto: 'Foto de perfil atualizada.' });
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível enviar a foto. Tente novamente.' });
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function handleSalvarAlteracoes() {
    if (!perfil) return;
    setSalvando(true);
    setMensagem(null);

    const emailMudou = email.trim() !== perfil.email;

    if (emailMudou) {
      const { error: erroEmail } = await supabase.auth.updateUser({ email: email.trim() });
      if (erroEmail) {
        setMensagem({ tipo: 'erro', texto: `Não foi possível atualizar o e-mail: ${erroEmail.message}` });
        setSalvando(false);
        return;
      }
    }

    const { error: erroTelefone } = await supabase
      .from('profiles')
      .update({ telefone: telefone.trim() || null })
      .eq('id', perfil.id);

    setSalvando(false);

    if (erroTelefone) {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível atualizar o telefone.' });
      return;
    }

    setPerfil((atual) => (atual ? { ...atual, telefone: telefone.trim() || null } : atual));
    setMensagem({
      tipo: 'sucesso',
      texto: emailMudou
        ? 'Telefone atualizado. Enviamos um link de confirmação para o novo e-mail — ele só passa a valer depois que você confirmar.'
        : 'Informações atualizadas com sucesso.',
    });
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.tela}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
        <View style={styles.carregandoContainer}>
          <ActivityIndicator size="large" color="#2B2823" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoTitulo}>Configurações</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSecao}>
            <View style={styles.avatarWrapper}>
              {perfil?.fotoUrl ? (
                <Image source={{ uri: perfil.fotoUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderTexto}>{perfil?.nome.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              {enviandoFoto && (
                <View style={styles.avatarCarregandoOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </View>

            <TouchableOpacity onPress={handleAlterarFoto} disabled={enviandoFoto} activeOpacity={0.8}>
              <Text style={styles.linkAlterarFoto}>Alterar foto de perfil</Text>
            </TouchableOpacity>

            <Text style={styles.nomeTexto}>{perfil?.nome}</Text>
            {perfil && (
              <View style={styles.roleSelo}>
                <Text style={styles.roleSeloTexto}>{NOME_ROLE[perfil.role]}</Text>
              </View>
            )}
            {perfil?.apto && <Text style={styles.aptoTexto}>{perfil.apto}</Text>}
          </View>

          {mensagem && (
            <View style={[styles.mensagemBox, mensagem.tipo === 'erro' ? styles.mensagemErro : styles.mensagemSucesso]}>
              <Text style={[styles.mensagemTexto, mensagem.tipo === 'erro' && styles.mensagemTextoErro]}>
                {mensagem.texto}
              </Text>
            </View>
          )}

          <Text style={styles.secaoTitulo}>Informações de contato</Text>

          <Text style={styles.campoLabel}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="seuemail@exemplo.com"
            placeholderTextColor="#A8A199"
          />

          <Text style={styles.campoLabel}>Telefone</Text>
          <TextInput
            style={styles.input}
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            placeholder="(19) 99999-0000"
            placeholderTextColor="#A8A199"
          />

          <TouchableOpacity
            style={[styles.botaoSalvar, salvando && styles.botaoSalvarDesabilitado]}
            onPress={handleSalvarAlteracoes}
            disabled={salvando}
            activeOpacity={0.85}
          >
            {salvando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.botaoSalvarTexto}>Salvar alterações</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- Estilos ----------

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  carregandoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabecalho: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cabecalhoTitulo: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2B2823',
  },
  conteudo: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  avatarSecao: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    marginBottom: 10,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#B7791F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderTexto: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
  },
  avatarCarregandoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 48,
    backgroundColor: 'rgba(43, 40, 35, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkAlterarFoto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D6FB4',
    marginBottom: 14,
  },
  nomeTexto: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 6,
  },
  roleSelo: {
    backgroundColor: '#F0ECE5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 4,
  },
  roleSeloTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B6459',
  },
  aptoTexto: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 4,
  },
  mensagemBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  mensagemSucesso: {
    backgroundColor: '#E7F4ED',
  },
  mensagemErro: {
    backgroundColor: '#FBEAE8',
  },
  mensagemTexto: {
    fontSize: 12,
    color: '#2F855A',
    lineHeight: 17,
  },
  mensagemTextoErro: {
    color: '#C0392B',
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 14,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 14,
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
  botaoSalvar: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  botaoSalvarDesabilitado: {
    opacity: 0.6,
  },
  botaoSalvarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});