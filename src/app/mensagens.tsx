import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

interface Conversa {
  moradorId: string;
  nome: string;
  apto: string | null;
  bloco: string | null;
  ultimaMensagem: string;
}

export default function Mensagens() {
  const [carregando, setCarregando] = useState(true);
  const [role, setRole] = useState<'morador' | 'sindico' | 'porteiro' | null>(null);
  const [conversas, setConversas] = useState<Conversa[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCarregando(false);
      return;
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!perfil) {
      setCarregando(false);
      return;
    }
    setRole(perfil.role);

    if (perfil.role === 'morador') {
      setCarregando(false);
      return;
    }

    const destino = perfil.role === 'sindico' ? 'sindico' : 'portaria';

    const { data: mensagens } = await supabase
      .from('mensagens_diretas')
      .select('morador_id, texto, criado_em')
      .eq('destino', destino)
      .order('criado_em', { ascending: false });

    const moradorIds = [...new Set((mensagens ?? []).map((m) => m.morador_id))];

    if (moradorIds.length === 0) {
      setConversas([]);
      setCarregando(false);
      return;
    }

    const { data: perfis } = await supabase
      .from('profiles')
      .select('id, nome, apto, bloco')
      .in('id', moradorIds);

    const perfilPorId = new Map((perfis ?? []).map((p) => [p.id, p]));

    const conversasMontadas: Conversa[] = moradorIds.map((id) => {
      const ultima = (mensagens ?? []).find((m) => m.morador_id === id)!;
      const perfilMorador = perfilPorId.get(id);
      return {
        moradorId: id,
        nome: perfilMorador?.nome ?? 'Morador',
        apto: perfilMorador?.apto ?? null,
        bloco: perfilMorador?.bloco ?? null,
        ultimaMensagem: ultima.texto,
      };
    });

    setConversas(conversasMontadas);
    setCarregando(false);
  }

  if (carregando) {
    return (
      <View style={[styles.container, styles.centralizado]}>
        <ActivityIndicator size="large" color="#e49c15" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.voltar}>Voltar</Text>
        </Pressable>
        <Text style={styles.titulo}>Mensagens</Text>
      </View>

      {role === 'morador' && (
        <View style={styles.opcoesContainer}>
          <Pressable
            style={styles.opcaoCard}
            onPress={() => router.push({ pathname: './mensagensThread', params: { destino: 'sindico' } })}
          >
            <Text style={styles.opcaoTitulo}>Síndico</Text>
            <Text style={styles.opcaoSubtitulo}>Fale diretamente com a síndica ou síndico</Text>
          </Pressable>
          <Pressable
            style={styles.opcaoCard}
            onPress={() => router.push({ pathname: './mensagensThread', params: { destino: 'portaria' } })}
          >
            <Text style={styles.opcaoTitulo}>Portaria</Text>
            <Text style={styles.opcaoSubtitulo}>Fale diretamente com a portaria</Text>
          </Pressable>
        </View>
      )}

      {role !== 'morador' && (
        <ScrollView contentContainerStyle={styles.listaConversas}>
          {conversas.length === 0 && (
            <Text style={styles.vazioTexto}>Nenhuma mensagem recebida ainda.</Text>
          )}
          {conversas.map((c) => (
            <Pressable
              key={c.moradorId}
              style={styles.conversaCard}
              onPress={() =>
                router.push({
                  pathname: './mensagensThread',
                  params: { destino: role === 'sindico' ? 'sindico' : 'portaria', moradorId: c.moradorId },
                })
              }
            >
              <Text style={styles.conversaNome}>{c.nome}</Text>
              <Text style={styles.conversaApto}>
                {c.apto ? `Apto ${c.apto} ` : ''}{c.bloco ?? ''}
              </Text>
              <Text style={styles.conversaUltima} numberOfLines={1}>{c.ultimaMensagem}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
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
    paddingBottom: 16,
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
  opcoesContainer: {
    padding: 20,
    gap: 12,
  },
  opcaoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  opcaoTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  opcaoSubtitulo: {
    fontSize: 13,
    color: '#666666',
  },
  listaConversas: {
    padding: 20,
    gap: 10,
  },
  vazioTexto: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 40,
  },
  conversaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conversaNome: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  conversaApto: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 2,
    marginBottom: 4,
  },
  conversaUltima: {
    fontSize: 13,
    color: '#666666',
  },
});
