import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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

type VisitStatus = 'ativo' | 'agendado' | 'expirado';

interface Visitor {
  id: string;
  name: string;
  detail: string;
  unit: string;
  status: VisitStatus;
  statusLabel: string;
  timestamp: string;
  recurring?: boolean;
}

const sampleVisitors: Visitor[] = [
  {
    id: '1',
    name: 'Rafael Martins',
    detail: 'Visita única com placa ABC1D23',
    unit: 'APTO 808 B',
    status: 'ativo',
    statusLabel: 'Autorizado hoje',
    timestamp: '14h 18h',
  },
  {
    id: '2',
    name: 'Camila Borges',
    detail: 'Diarista',
    unit: 'APTO 808 B',
    status: 'ativo',
    statusLabel: 'Autorizado hoje',
    timestamp: '08h 12h',
    recurring: true,
  },
  {
    id: '3',
    name: 'João Santos',
    detail: 'Entregador de gás',
    unit: 'APTO 808 B',
    status: 'agendado',
    statusLabel: 'terça-feira',
    timestamp: 'Próxima: 15/07',
    recurring: true,
  },
  {
    id: '4',
    name: 'Pedro Ferreira',
    detail: 'Visita única',
    unit: 'APTO 808 B',
    status: 'expirado',
    statusLabel: 'Autorização expirada',
    timestamp: 'Expirou 10/07/2025',
  },
];

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

      <Text style={styles.unitLabel}>Apto. 808 B</Text>
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
        {sampleVisitors.map((visitor) => (
          <View key={visitor.id} style={[styles.card, visitor.status === 'expirado' && styles.cardExpired]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {visitor.name
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')}
              </Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.unitText}>{visitor.unit}</Text>
              <Text style={styles.nameText}>{visitor.name}</Text>
              <Text style={styles.detailText}>{visitor.detail}</Text>

              <View style={styles.statusRow}>
                <StatusIcon status={visitor.status} />
                <Text style={[styles.statusText, { color: statusColor(visitor.status) }]}> {visitor.statusLabel}</Text>
              </View>
              <Text style={styles.timestampText}>{visitor.timestamp}</Text>
            </View>

            {visitor.recurring && visitor.status !== 'expirado' && (
              <Pressable style={styles.qrButton}>
                <Ionicons name="qr-code-outline" size={16} color={colors.navy} />
              </Pressable>
            )}
          </View>
        ))}

        <Pressable style={styles.addButton}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.addButtonText}>Autorizar novo visitante</Text>
        </Pressable>
      </ScrollView>
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
});
