import React, { useEffect, useMemo, useState } from 'react';
import {
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

// ---------- Tipos ----------

type TipoVeiculo = 'carro' | 'moto';
type TipoMovimentacao = 'entrada' | 'saida';
type FiltroStatus = 'todos' | 'na_garagem' | 'fora';

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  cor: string;
  tipo: TipoVeiculo;
  morador: string;
  apto: string;
  naGaragem: boolean;
  ultimaMovimentacaoISO: string;
}

interface Movimentacao {
  id: string;
  veiculoId: string;
  tipo: TipoMovimentacao;
  dataISO: string;
}

// ---------- Helpers de data ----------

function addMinutos(data: Date, minutos: number): Date {
  return new Date(data.getTime() + minutos * 60000);
}

function addHoras(data: Date, horas: number): Date {
  return addMinutos(data, horas * 60);
}

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

// ---------- Dados mockados ----------
// Gerados a partir de "agora" para que os horários de última movimentação
// sempre façam sentido, independentemente de quando o app for aberto.

function gerarDadosMock(agora: Date): { veiculos: Veiculo[]; movimentacoes: Movimentacao[] } {
  const veiculos: Veiculo[] = [
    { id: 'v1', placa: 'ABC1D23', modelo: 'Honda Civic', cor: 'Prata', tipo: 'carro', morador: 'Carla Mendes', apto: 'Apto 204', naGaragem: true, ultimaMovimentacaoISO: addHoras(agora, -14).toISOString() },
    { id: 'v2', placa: 'DEF4G56', modelo: 'Fiat Argo', cor: 'Branco', tipo: 'carro', morador: 'Rafael Souza', apto: 'Apto 305', naGaragem: false, ultimaMovimentacaoISO: addMinutos(agora, -35).toISOString() },
    { id: 'v3', placa: 'HIJ7K89', modelo: 'Yamaha Fazer', cor: 'Preta', tipo: 'moto', morador: 'João Ferreira', apto: 'Apto 301', naGaragem: true, ultimaMovimentacaoISO: addHoras(agora, -2).toISOString() },
    { id: 'v4', placa: 'KLM0N12', modelo: 'Toyota Corolla', cor: 'Prata', tipo: 'carro', morador: 'Bruna Lima', apto: 'Apto 108', naGaragem: true, ultimaMovimentacaoISO: addHoras(agora, -20).toISOString() },
    { id: 'v5', placa: 'OPQ3R45', modelo: 'Jeep Renegade', cor: 'Vermelho', tipo: 'carro', morador: 'Marcos Silva', apto: 'Apto 402', naGaragem: false, ultimaMovimentacaoISO: addMinutos(agora, -8).toISOString() },
    { id: 'v6', placa: 'STU6V78', modelo: 'Chevrolet Onix', cor: 'Azul', tipo: 'carro', morador: 'Ana Paula Rocha', apto: 'Apto 604', naGaragem: true, ultimaMovimentacaoISO: addHoras(agora, -30).toISOString() },
    { id: 'v7', placa: 'WXY9Z01', modelo: 'Honda Biz', cor: 'Cinza', tipo: 'moto', morador: 'Pedro Alves', apto: 'Apto 512', naGaragem: false, ultimaMovimentacaoISO: addMinutos(agora, -50).toISOString() },
    { id: 'v8', placa: 'BCD2E34', modelo: 'Volkswagen Gol', cor: 'Branco', tipo: 'carro', morador: 'Juliana Costa', apto: 'Apto 703', naGaragem: true, ultimaMovimentacaoISO: addHoras(agora, -5).toISOString() },
  ];

  const movimentacoes: Movimentacao[] = [
    { id: 'm1', veiculoId: 'v2', tipo: 'saida', dataISO: addMinutos(agora, -35).toISOString() },
    { id: 'm2', veiculoId: 'v2', tipo: 'entrada', dataISO: addHoras(agora, -9).toISOString() },
    { id: 'm3', veiculoId: 'v2', tipo: 'saida', dataISO: addHoras(agora, -11).toISOString() },
    { id: 'm4', veiculoId: 'v5', tipo: 'saida', dataISO: addMinutos(agora, -8).toISOString() },
    { id: 'm5', veiculoId: 'v5', tipo: 'entrada', dataISO: addHoras(agora, -22).toISOString() },
    { id: 'm6', veiculoId: 'v7', tipo: 'saida', dataISO: addMinutos(agora, -50).toISOString() },
    { id: 'm7', veiculoId: 'v1', tipo: 'entrada', dataISO: addHoras(agora, -14).toISOString() },
  ];

  return { veiculos, movimentacoes };
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
            {veiculo.modelo} · {veiculo.cor}
          </Text>
          <Text style={styles.cartaoMorador}>
            {veiculo.morador} · {veiculo.apto}
          </Text>
        </View>

        <Selo
          texto={veiculo.naGaragem ? 'Na garagem' : 'Fora'}
          cor={veiculo.naGaragem ? '#2F855A' : '#B7791F'}
          fundo={veiculo.naGaragem ? '#E7F4ED' : '#FBF1DE'}
        />
      </View>

      <View style={styles.cartaoRodape}>
        <Text style={styles.cartaoUltimaMovimentacao}>
          {veiculo.naGaragem ? 'Entrou' : 'Saiu'} {formatarTempoRelativo(veiculo.ultimaMovimentacaoISO, agora)}
        </Text>

        <TouchableOpacity
          style={[styles.botaoAcao, { backgroundColor: veiculo.naGaragem ? '#B7791F' : '#2F855A' }]}
          onPress={onRegistrarMovimentacao}
          activeOpacity={0.85}
        >
          <Text style={styles.botaoAcaoTexto}>{veiculo.naGaragem ? 'Registrar saída' : 'Registrar entrada'}</Text>
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
  movimentacoes: Movimentacao[];
  onFechar: () => void;
}

function ModalHistorico({ veiculo, movimentacoes, onFechar }: ModalHistoricoProps) {
  const historicoOrdenado = useMemo(
    () =>
      movimentacoes
        .filter((m) => m.veiculoId === veiculo?.id)
        .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime()),
    [movimentacoes, veiculo]
  );

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
                {veiculo.placa} · {veiculo.modelo} · {veiculo.morador} ({veiculo.apto})
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
                {historicoOrdenado.length === 0 ? (
                  <Text style={styles.historicoVazio}>Nenhuma movimentação registrada ainda.</Text>
                ) : (
                  historicoOrdenado.map((mov) => (
                    <View key={mov.id} style={styles.linhaHistorico}>
                      <View
                        style={[
                          styles.linhaHistoricoPonto,
                          { backgroundColor: mov.tipo === 'entrada' ? '#2F855A' : '#B7791F' },
                        ]}
                      />
                      <Text style={styles.linhaHistoricoTexto}>
                        {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'} · {formatarDataHoraExtensa(mov.dataISO)}
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
  const referencia = useMemo(() => new Date(), []);
  const dadosIniciais = useMemo(() => gerarDadosMock(referencia), [referencia]);

  const [veiculos, setVeiculos] = useState<Veiculo[]>(dadosIniciais.veiculos);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>(dadosIniciais.movimentacoes);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [veiculoHistorico, setVeiculoHistorico] = useState<Veiculo | null>(null);
  const [agora, setAgora] = useState(new Date());

  // Mantém "há X min" atualizado sem precisar sair e voltar da tela.
  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  const veiculosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return veiculos
      .filter((v) => {
        if (filtroStatus === 'na_garagem' && !v.naGaragem) return false;
        if (filtroStatus === 'fora' && v.naGaragem) return false;
        if (termo.length === 0) return true;

        const campos = [v.placa, v.modelo, v.morador, v.apto].map((c) => c.toLowerCase());
        return campos.some((c) => c.includes(termo));
      })
      .sort((a, b) => new Date(b.ultimaMovimentacaoISO).getTime() - new Date(a.ultimaMovimentacaoISO).getTime());
  }, [veiculos, busca, filtroStatus]);

  const totalNaGaragem = veiculos.filter((v) => v.naGaragem).length;
  const totalFora = veiculos.length - totalNaGaragem;

  function handleRegistrarMovimentacao(veiculo: Veiculo) {
    const novoStatus = !veiculo.naGaragem;
    const agoraISO = new Date().toISOString();

    setVeiculos((atual) =>
      atual.map((v) => (v.id === veiculo.id ? { ...v, naGaragem: novoStatus, ultimaMovimentacaoISO: agoraISO } : v))
    );

    setMovimentacoes((atual) => [
      ...atual,
      {
        id: String(Date.now()),
        veiculoId: veiculo.id,
        tipo: novoStatus ? 'entrada' : 'saida',
        dataISO: agoraISO,
      },
    ]);
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

      <ModalHistorico
        veiculo={veiculoHistorico}
        movimentacoes={movimentacoes}
        onFechar={() => setVeiculoHistorico(null)}
      />
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