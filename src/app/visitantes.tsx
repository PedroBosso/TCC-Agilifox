import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

const colors = {
  background: '#F6F1E5',
  card: '#FFFFFF',
  border: '#EAE3D3',
  navy: '#26344A',
  gray: '#8B8F96',
  amber: '#E2932F',
  amberLight: '#F6D9AE',
  green: '#2FA84F',
};

type VisitStatus = 'ativo' | 'agendado' | 'expirado' | 'cancelado';

interface Visitor {
  id: string;
  nome_visitante: string;
  detalhe: string | null;
  apartamento: string;
  status: VisitStatus;
  data_inicio: string | null;
  data_fim: string | null;
  recorrente: boolean;
  criado_em: string;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(visitor: Visitor): string {
  switch (visitor.status) {
    case 'ativo':
      return 'Autorizado';
    case 'agendado':
      return visitor.data_inicio ? `Agendado para ${formatarData(visitor.data_inicio)}` : 'Agendado';
    case 'cancelado':
      return 'Cancelado';
    default:
      return 'Autorização expirada';
  }
}

function horarioTexto(visitor: Visitor): string {
  if (visitor.data_inicio && visitor.data_fim) {
    return `${formatarHora(visitor.data_inicio)} ${formatarHora(visitor.data_fim)}`;
  }
  if (visitor.data_inicio) {
    return formatarData(visitor.data_inicio);
  }
  return `Cadastrado em ${formatarData(visitor.criado_em)}`;
}

function StatusIcon({ status }: { status: VisitStatus }) {
  const iconName =
    status === 'ativo'
      ? 'checkmark-circle-outline'
      : status === 'agendado'
      ? 'time-outline'
      : 'close-circle-outline';
  const iconColor =
    status === 'ativo' ? colors.green : status === 'agendado' ? colors.amber : colors.gray;

  return <Ionicons name={iconName} size={18} color={iconColor} />;
}

function statusColor(status: VisitStatus) {
  if (status === 'ativo') return colors.green;
  if (status === 'agendado') return colors.amber;
  return colors.gray;
}

export default function VisitantesAutorizados() {
  const [tab, setTab] = useState<'autorizados' | 'historico'>('autorizados');
  const [visitantes, setVisitantes] = useState<Visitor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [apto, setApto] = useState<string | null>(null);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoDetalhe, setNovoDetalhe] = useState('');
  const [novoRecorrente, setNovoRecorrente] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCarregando(false);
      return;
    }

    setUserId(user.id);

    const { data: perfil } = await supabase
      .from('profiles')
      .select('apto')
      .eq('id', user.id)
      .maybeSingle();

    setApto(perfil?.apto ?? null);

    const { data, error } = await supabase
      .from('autorizacoes_visita')
      .select('id, nome_visitante, detalhe, apartamento, status, data_inicio, data_fim, recorrente, criado_em')
      .eq('morador_id', user.id)
      .order('criado_em', { ascending: false });

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar os visitantes.');
    } else {
      setVisitantes(data ?? []);
    }

    setCarregando(false);
  }

  async function handleAutorizarVisitante() {
    if (!novoNome.trim() || !userId) return;

    setSalvando(true);
    const { error } = await supabase.from('autorizacoes_visita').insert({
      nome_visitante: novoNome.trim(),
      morador_id: userId,
      apartamento: apto ?? '',
      status: 'ativo',
      detalhe: novoDetalhe.trim() || null,
      recorrente: novoRecorrente,
    });
    setSalvando(false);

    if (error) {
      Alert.alert('Erro', 'Não foi possível autorizar o visitante.');
      return;
    }

    setModalVisivel(false);
    setNovoNome('');
    setNovoDetalhe('');
    setNovoRecorrente(false);
    carregarDados();
  }

  const visitantesFiltrados = visitantes.filter((v) =>
    tab === 'autorizados' ? v.status === 'ativo' || v.status === 'agendado' : v.status === 'expirado' || v.status === 'cancelado'
  );

  if (carregando) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.amber} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.push('./inicio')}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <Pressable style={styles.iconButton}>
          <Ionicons name="search" size={22} color={colors.navy} />
        </Pressable>
      </View>

      <Text style={styles.unitLabel}>{apto ? `Apto. ${apto}` : 'Meu apartamento'}</Text>
      <Text style={styles.title}>Visitantes</Text>

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('autorizados')} style={styles.tabButton}>
          <Text style={[styles.tabText, tab === 'autorizados' && styles.tabTextActive]}>
            Autorizados
          </Text>
          {tab === 'autorizados' && <View style={styles.tabIndicator} />}
        </Pressable>
        <Pressable onPress={() => setTab('historico')} style={styles.tabButton}>
          <Text style={[styles.tabText, tab === 'historico' && styles.tabTextActive]}>
            Histórico
          </Text>
          {tab === 'historico' && <View style={styles.tabIndicator} />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {visitantesFiltrados.length === 0 && (
          <Text style={{ color: colors.gray, textAlign: 'center', marginTop: 24 }}>
            Nenhum visitante nesta lista.
          </Text>
        )}

        {visitantesFiltrados.map((visitor) => (
          <View
            key={visitor.id}
            style={[styles.card, (visitor.status === 'expirado' || visitor.status === 'cancelado') && styles.cardExpired]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {visitor.nome_visitante
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')}
              </Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.unitText}>APTO {visitor.apartamento}</Text>
              <Text style={styles.nameText}>{visitor.nome_visitante}</Text>
              {!!visitor.detalhe && <Text style={styles.detailText}>{visitor.detalhe}</Text>}

              <View style={styles.statusRow}>
                <StatusIcon status={visitor.status} />
                <Text style={[styles.statusText, { color: statusColor(visitor.status) }]}> {statusLabel(visitor)}</Text>
              </View>
              <Text style={styles.timestampText}>{horarioTexto(visitor)}</Text>
            </View>

            {visitor.recorrente && visitor.status !== 'expirado' && visitor.status !== 'cancelado' && (
              <Pressable style={styles.qrButton}>
                <Ionicons name="qr-code-outline" size={16} color={colors.navy} />
              </Pressable>
            )}
          </View>
        ))}

        <Pressable style={styles.addButton} onPress={() => setModalVisivel(true)}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.addButtonText}>Autorizar novo visitante</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={modalVisivel} animationType="slide" transparent onRequestClose={() => setModalVisivel(false)}>
        <View style={styles.modalFundo}>
          <View style={styles.modalCartao}>
            <Text style={styles.modalTitulo}>Autorizar novo visitante</Text>

            <Text style={styles.modalLabel}>Nome do visitante</Text>
            <TextInput
              style={styles.modalInput}
              value={novoNome}
              onChangeText={setNovoNome}
              placeholder="Ex: João da Silva"
              placeholderTextColor={colors.gray}
            />

            <Text style={styles.modalLabel}>Detalhe (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              value={novoDetalhe}
              onChangeText={setNovoDetalhe}
              placeholder="Ex: Visita única, diarista..."
              placeholderTextColor={colors.gray}
            />

            <Pressable style={styles.modalCheckboxRow} onPress={() => setNovoRecorrente((v) => !v)}>
              <View style={[styles.modalCheckbox, novoRecorrente && styles.modalCheckboxAtivo]}>
                {novoRecorrente && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.modalCheckboxLabel}>Visita recorrente</Text>
            </Pressable>

            <View style={styles.modalBotoes}>
              <Pressable style={styles.modalBotaoCancelar} onPress={() => setModalVisivel(false)}>
                <Text style={styles.modalBotaoCancelarText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBotaoConfirmar, (!novoNome.trim() || salvando) && { opacity: 0.6 }]}
                onPress={handleAutorizarVisitante}
                disabled={!novoNome.trim() || salvando}
              >
                {salvando ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalBotaoConfirmarText}>Autorizar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 45,
    paddingHorizontal: 15,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitLabel: {
    color: colors.gray,
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  tabButton: {
    paddingBottom: 10,
    marginRight: 24,
  },
  tabText: {
    fontSize: 15,
    color: colors.gray,
    fontWeight: '400',
  },
  tabTextActive: {
    color: colors.navy,
    fontWeight: '700',
  },
  tabIndicator: {
    marginTop: 8,
    height: 2,
    width: '100%',
    backgroundColor: colors.amber,
    borderRadius: 1,
  },
  listContainer: {
    paddingBottom: 36,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardExpired: {
    opacity: 0.6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.amber,
    fontSize: 15,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.gray,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 2,
  },
  detailText: {
    fontSize: 13,
    color: colors.gray,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timestampText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.gray,
  },
  qrButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: colors.amber,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalFundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(38, 52, 74, 0.4)',
  },
  modalCartao: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.navy,
  },
  modalCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  modalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modalCheckboxAtivo: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  modalCheckboxLabel: {
    fontSize: 13,
    color: colors.navy,
  },
  modalBotoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  modalBotaoCancelar: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalBotaoCancelarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
  modalBotaoConfirmar: {
    flex: 1,
    backgroundColor: colors.amber,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalBotaoConfirmarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
