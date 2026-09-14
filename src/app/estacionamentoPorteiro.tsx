import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

type TipoVeiculo = 'carro' | 'moto';
type TipoMovimentacao = 'entrada' | 'saida';
type FiltroStatus = 'todos' | 'na_garagem' | 'fora';

interface Veiculo {
  id: string;
  placa: string;
  modelo: string | null;
  cor: string | null;
  tipo: TipoVeiculo;
  morador_id: string;
  morador: string;
  apto: string;
  na_garagem: boolean;
  ultima_movimentacao: string | null;
}

interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  registrado_em: string;
}

// ---------- Helpers de data ----------

function formatarTempoRelativo(dataISO: string, agora: Date): string {
  const data = new Date(dataISO);
  const diffMin = Math.floor((agora.getTime() - data.getTime()) / 60000);

  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras}h`;
  const diffDias = Math.floor(diffHoras / 24);
  return `há ${diffDias} dia${diffDias > 1 ? 's' : ''}`;
}

function formatarDataHoraExtensa(dataISO: string): string {
  const data = new Date(dataISO);
  const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dataFormatada} às ${horaFormatada}`;
}

// ---------- Subcomponentes ----------

function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, ativo && styles.chipAtivo]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Selo({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[styles.selo, { backgroundColor: fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: cor }]} />
      <Text style={[styles.seloTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

interface CartaoVeiculoProps {
  veiculo: Veiculo;
  agora: Date;
  onAbrirHistorico: () => void;
  onRegistrarMovimentacao: () => void;
}

function CartaoVeiculo({ veiculo, agora, onAbrirHistorico, onRegistrarMovimentacao }: CartaoVeiculoProps) {
  const corIcone = veiculo.tipo === 'carro' ? '#3D6FB4' : '#7E57A6';

  return (
    <TouchableOpacity style={styles.cartao} onPress={onAbrirHistorico} activeOpacity={0.85}>
      <View style={styles.cartaoTopo}>
        <View style={[styles.icone, { backgroundColor: corIcone }]}>
          <Text style={styles.iconeTexto}>{veiculo.tipo === 'carro' ? 'C' : 'M'}</Text>
        </View>

        <View style={styles.cartaoInfo}>
          <Text style={styles.cartaoPlaca}>{veiculo.placa}</Text>
          <Text style={styles.cartaoModelo}>
            {veiculo.modelo || 'Modelo não informado'} · {veiculo.cor || 'Cor não informada'}
          </Text>
          <Text style={styles.cartaoMorador}>
            {veiculo.morador} · {veiculo.apto}
          </Text>
        </View>

        <Selo
          texto={veiculo.na_garagem ? 'Na garagem' : 'Fora'}
          cor={veiculo.na_garagem ? '#2F855A' : '#B7791F'}
          fundo={veiculo.na_garagem ? '#E7F4ED' : '#FBF1DE'}
        />
      </View>

      <View style={styles.cartaoRodape}>
        <Text style={styles.cartaoUltimaMovimentacao}>
          {veiculo.ultima_movimentacao
            ? `${veiculo.na_garagem ? 'Entrou' : 'Saiu'} ${formatarTempoRelativo(veiculo.ultima_movimentacao, agora)}`
            : 'Sem movimentação registrada'}
        </Text>

        <TouchableOpacity
          style={[styles.botaoAcao, { backgroundColor: veiculo.na_garagem ? '#B7791F' : '#2F855A' }]}
          onPress={onRegistrarMovimentacao}
          activeOpacity={0.85}
        >
          <Text style={styles.botaoAcaoTexto}>{veiculo.na_garagem ? 'Registrar saída' : 'Registrar entrada'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function EstadoVazio() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>?</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhum veículo encontrado</Text>
      <Text style={styles.estadoVazioTexto}>Tente buscar por outra placa, modelo, morador ou apartamento.</Text>
    </View>
  );
}

// ---------- Modal de histórico ----------

interface ModalHistoricoProps {
  veiculo: Veiculo | null;
  onFechar: () => void;
}

function ModalHistorico({ veiculo, onFechar }: ModalHistoricoProps) {
  const [historico, setHistorico] = useState<Movimentacao[]>([]);

  useEffect(() => {
    if (!veiculo) {
      setHistorico([]);
      return;
    }
    carregarHistorico(veiculo.id);
  }, [veiculo]);

  async function carregarHistorico(veiculoId: string) {
    const { data, error } = await supabase
      .from('movimentacoes_veiculo')
      .select('id, tipo, registrado_em')
      .eq('veiculo_id', veiculoId)
      .order('registrado_em', { ascending: false });

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar o histórico.');
      return;
    }
    setHistorico(data ?? []);
  }

  return (
    <Modal visible={!!veiculo} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Histórico de movimentação</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Fechar</Text>
            </TouchableOpacity>
          </View>

          {veiculo && (
            <>
              <Text style={styles.modalSubtitulo}>
                {veiculo.placa} · {veiculo.modelo || 'Modelo não informado'} · {veiculo.morador} ({veiculo.apto})
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
                {historico.length === 0 ? (
                  <Text style={styles.historicoVazio}>Nenhuma movimentação registrada ainda.</Text>
                ) : (
                  historico.map((mov) => (
                    <View key={mov.id} style={styles.linhaHistorico}>
                      <View
                        style={[
                          styles.linhaHistoricoPonto,
                          { backgroundColor: mov.tipo === 'entrada' ? '#2F855A' : '#B7791F' },
                        ]}
                      />
                      <Text style={styles.linhaHistoricoTexto}>
                        {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'} · {formatarDataHoraExtensa(mov.registrado_em)}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaVeiculosPortaria() {
  const [carregando, setCarregando] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [veiculoHistorico, setVeiculoHistorico] = useState<Veiculo | null>(null);
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    carregarUsuarioEVeiculos();
  }, []);

  // Mantém "há X min" atualizado sem precisar sair e voltar da tela.
  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  async function carregarUsuarioEVeiculos() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) setUserId(user.id);
    await carregarVeiculos();
  }

  async function carregarVeiculos() {
    setCarregando(true);

    const { data: veiculosData, error } = await supabase.from('veiculos').select('*');
    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar os veículos.');
      setCarregando(false);
      return;
    }

    const moradorIds = Array.from(new Set((veiculosData ?? []).map((v) => v.morador_id)));
    let mapaMoradores = new Map<string, { nome: string; apto: string | null }>();

    if (moradorIds.length > 0) {
      const { data: perfis } = await supabase.from('profiles').select('id, nome, apto').in('id', moradorIds);
      mapaMoradores = new Map((perfis ?? []).map((p) => [p.id, { nome: p.nome, apto: p.apto }]));
    }

    const veiculosCompletos: Veiculo[] = (veiculosData ?? []).map((v) => ({
      ...v,
      morador: mapaMoradores.get(v.morador_id)?.nome ?? 'Morador desconhecido',
      apto: mapaMoradores.get(v.morador_id)?.apto ?? '—',
    }));

    setVeiculos(veiculosCompletos);
    setCarregando(false);
  }

  const veiculosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return veiculos
      .filter((v) => {
        if (filtroStatus === 'na_garagem' && !v.na_garagem) return false;
        if (filtroStatus === 'fora' && v.na_garagem) return false;
        if (termo.length === 0) return true;

        const campos = [v.placa, v.modelo ?? '', v.morador, v.apto].map((c) => c.toLowerCase());
        return campos.some((c) => c.includes(termo));
      })
      .sort(
        (a, b) => new Date(b.ultima_movimentacao ?? 0).getTime() - new Date(a.ultima_movimentacao ?? 0).getTime()
      );
  }, [veiculos, busca, filtroStatus]);

  const totalNaGaragem = veiculos.filter((v) => v.na_garagem).length;
  const totalFora = veiculos.length - totalNaGaragem;

  async function handleRegistrarMovimentacao(veiculo: Veiculo) {
    if (!userId) return;

    const novoStatus = !veiculo.na_garagem;
    const agoraISO = new Date().toISOString();
    const tipo: TipoMovimentacao = novoStatus ? 'entrada' : 'saida';

    const { error: erroMovimentacao } = await supabase
      .from('movimentacoes_veiculo')
      .insert({ veiculo_id: veiculo.id, tipo, registrado_por: userId });

    if (erroMovimentacao) {
      Alert.alert('Erro', 'Não foi possível registrar a movimentação.');
      return;
    }

    const { error: erroVeiculo } = await supabase
      .from('veiculos')
      .update({ na_garagem: novoStatus, ultima_movimentacao: agoraISO })
      .eq('id', veiculo.id);

    if (erroVeiculo) {
      Alert.alert('Erro', 'Não foi possível atualizar o status do veículo.');
      return;
    }

    carregarVeiculos();
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.tela}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
        <View style={[styles.tela, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#2B2823" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Controle de Veículos</Text>
        <Text style={styles.cabecalhoSubtitulo}>Consulta para uso da portaria</Text>
      </View>

      <View style={styles.resumoLinha}>
        <View style={styles.resumoCartao}>
          <Text style={[styles.resumoValor, { color: '#2F855A' }]}>{totalNaGaragem}</Text>
          <Text style={styles.resumoLabel}>Na garagem</Text>
        </View>
        <View style={styles.resumoCartao}>
          <Text style={[styles.resumoValor, { color: '#B7791F' }]}>{totalFora}</Text>
          <Text style={styles.resumoLabel}>Fora</Text>
        </View>
      </View>

      <View style={styles.buscaContainer}>
        <TextInput
          style={styles.buscaInput}
          placeholder="Buscar por placa, modelo, morador ou apto..."
          placeholderTextColor="#A8A199"
          value={busca}
          onChangeText={setBusca}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.filtrosLinha}>
        <Chip label="Todos" ativo={filtroStatus === 'todos'} onPress={() => setFiltroStatus('todos')} />
        <Chip label="Na garagem" ativo={filtroStatus === 'na_garagem'} onPress={() => setFiltroStatus('na_garagem')} />
        <Chip label="Fora" ativo={filtroStatus === 'fora'} onPress={() => setFiltroStatus('fora')} />
      </View>

      <FlatList
        data={veiculosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CartaoVeiculo
            veiculo={item}
            agora={agora}
            onAbrirHistorico={() => setVeiculoHistorico(item)}
            onRegistrarMovimentacao={() => handleRegistrarMovimentacao(item)}
          />
        )}
        contentContainerStyle={veiculosFiltrados.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
        ListEmptyComponent={<EstadoVazio />}
        showsVerticalScrollIndicator={false}
      />

      <ModalHistorico veiculo={veiculoHistorico} onFechar={() => setVeiculoHistorico(null)} />
    </SafeAreaView>
  );
}

// ---------- Estilos ----------

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  cabecalho: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cabecalhoSaudacao: {
    fontSize: 13,
    color: '#8A8377',
    marginBottom: 2,
  },
  cabecalhoTitulo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2B2823',
  },
  cabecalhoSubtitulo: {
    fontSize: 12,
    color: '#A8A199',
    marginTop: 2,
  },
  resumoLinha: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 12,
  },
  resumoCartao: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  resumoValor: {
    fontSize: 22,
    fontWeight: '700',
  },
  resumoLabel: {
    fontSize: 11,
    color: '#8A8377',
    fontWeight: '600',
    marginTop: 2,
  },
  buscaContainer: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  buscaInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2B2823',
    borderWidth: 1,
    borderColor: '#EDE9E1',
  },
  filtrosLinha: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0ECE5',
  },
  chipAtivo: {
    backgroundColor: '#2B2823',
  },
  chipTexto: {
    fontSize: 13,
    color: '#6B6459',
    fontWeight: '500',
  },
  chipTextoAtivo: {
    color: '#FFFFFF',
  },
  listaConteudo: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 40,
  },
  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cartaoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconeTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cartaoInfo: {
    flex: 1,
  },
  cartaoPlaca: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2823',
    letterSpacing: 1,
  },
  cartaoModelo: {
    fontSize: 12,
    color: '#6B6459',
    marginTop: 1,
  },
  cartaoMorador: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 1,
  },
  cartaoRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    paddingTop: 10,
  },
  cartaoUltimaMovimentacao: {
    fontSize: 11,
    color: '#A8A199',
    flex: 1,
  },
  botaoAcao: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  botaoAcaoTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  seloPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  seloTexto: {
    fontSize: 11,
    fontWeight: '600',
  },
  estadoVazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  estadoVazioCirculo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0ECE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  estadoVazioIcone: {
    fontSize: 22,
    color: '#A8A199',
    fontWeight: '700',
  },
  estadoVazioTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 4,
  },
  estadoVazioTexto: {
    fontSize: 13,
    color: '#8A8377',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalFundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(43, 40, 35, 0.4)',
  },
  modalCartao: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    maxHeight: '75%',
  },
  modalAlcinha: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E0D8',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2823',
  },
  modalFechar: {
    fontSize: 14,
    color: '#8A8377',
  },
  modalSubtitulo: {
    fontSize: 12,
    color: '#8A8377',
  },
  historicoVazio: {
    fontSize: 13,
    color: '#A8A199',
    textAlign: 'center',
    marginTop: 24,
  },
  linhaHistorico: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE5',
  },
  linhaHistoricoPonto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  linhaHistoricoTexto: {
    fontSize: 13,
    color: '#2B2823',
  },
});
