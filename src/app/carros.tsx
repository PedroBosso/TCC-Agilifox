import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

// ---------- Tipos ----------

type TipoVeiculo = 'carro' | 'moto';
type Aba = 'veiculos' | 'minhaVaga' | 'alugarVagas';

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  cor: string;
  tipo: TipoVeiculo;
  vagaId: string | null; // 'propria' | id de uma vaga alugada | null
}

interface Locatario {
  nome: string;
  apto: string;
  veiculo: string;
}

interface MinhaVaga {
  id: string;
  numero: string;
  localizacao: string;
  disponibilizadaParaAluguel: boolean;
  valorMensal: number | null;
  descricao: string;
  locatario: Locatario | null;
}

interface VagaMercado {
  id: string;
  numero: string;
  localizacao: string;
  valorMensal: number;
  descricao: string;
  proprietario: string;
  alugadaPorMim: boolean;
  dataInicioISO?: string;
}

// ---------- Helpers ----------

function addDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 24 * 60 * 60 * 1000);
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataCurta(dataISO: string): string {
  return new Date(dataISO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------- Dados mockados ----------
// O cenário inicial já demonstra os principais estados da tela: a vaga
// própria está alugada para outro morador, e o veículo do usuário está
// estacionado em uma vaga que ele mesmo aluga de terceiros.

function gerarDadosMock(hoje: Date) {
  const minhaVaga: MinhaVaga = {
    id: 'vp1',
    numero: 'Vaga 42',
    localizacao: 'Subsolo 1 - Bloco B',
    disponibilizadaParaAluguel: true,
    valorMensal: 170,
    descricao: 'Vaga coberta, de fácil acesso ao elevador.',
    locatario: { nome: 'Rafael Souza', apto: 'Apto 305', veiculo: 'Fiat Argo - Branco' },
  };

  const vagasMercado: VagaMercado[] = [
    {
      id: 'm1',
      numero: 'Vaga 15',
      localizacao: 'Térreo - Bloco A',
      valorMensal: 180,
      descricao: 'Vaga coberta, próxima ao elevador social.',
      proprietario: 'Apto 204',
      alugadaPorMim: false,
    },
    {
      id: 'm2',
      numero: 'Vaga 63',
      localizacao: 'Subsolo 2 - Bloco C',
      valorMensal: 150,
      descricao: 'Vaga descoberta, ideal para moto ou carro pequeno.',
      proprietario: 'Apto 512',
      alugadaPorMim: false,
    },
    {
      id: 'm3',
      numero: 'Vaga 08',
      localizacao: 'Térreo - Bloco B',
      valorMensal: 200,
      descricao: 'Vaga ampla, próxima ao portão eletrônico.',
      proprietario: 'Apto 108',
      alugadaPorMim: true,
      dataInicioISO: addDias(hoje, -20).toISOString(),
    },
  ];

  const veiculos: Veiculo[] = [{ id: 'v1', placa: 'ABC1D23', modelo: 'Honda Civic', cor: 'Prata', tipo: 'carro', vagaId: 'm3' }];

  return { minhaVaga, vagasMercado, veiculos };
}

// ---------- Subcomponentes ----------

function Selo({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[styles.selo, { backgroundColor: fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: cor }]} />
      <Text style={[styles.seloTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, ativo && styles.chipAtivo]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EstadoVazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>+</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>{titulo}</Text>
      <Text style={styles.estadoVazioTexto}>{texto}</Text>
    </View>
  );
}

interface CartaoVeiculoProps {
  veiculo: Veiculo;
  labelVaga: string;
  onEditar: () => void;
  onRemover: () => void;
}

function CartaoVeiculo({ veiculo, labelVaga, onEditar, onRemover }: CartaoVeiculoProps) {
  const corIcone = veiculo.tipo === 'carro' ? '#3D6FB4' : '#7E57A6';
  return (
    <View style={styles.cartao}>
      <View style={[styles.iconeVeiculo, { backgroundColor: corIcone }]}>
        <Text style={styles.iconeVeiculoTexto}>{veiculo.tipo === 'carro' ? 'C' : 'M'}</Text>
      </View>

      <View style={styles.cartaoConteudo}>
        <Text style={styles.cartaoPlaca}>{veiculo.placa}</Text>
        <Text style={styles.cartaoModelo}>
          {veiculo.modelo} · {veiculo.cor}
        </Text>
        <Text style={styles.cartaoVaga}>{labelVaga}</Text>

        <View style={styles.cartaoAcoes}>
          <TouchableOpacity onPress={onEditar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cartaoAcaoTexto}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemover} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cartaoAcaoTextoRemover}>Remover</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

interface CartaoVagaMercadoProps {
  vaga: VagaMercado;
  onAlugar: (vaga: VagaMercado) => void;
  onEncerrar: (id: string) => void;
}

function CartaoVagaMercado({ vaga, onAlugar, onEncerrar }: CartaoVagaMercadoProps) {
  return (
    <View style={styles.cartaoVaga2}>
      <View style={styles.cartaoVaga2Topo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartaoVaga2Numero}>{vaga.numero}</Text>
          <Text style={styles.cartaoVaga2Local}>{vaga.localizacao}</Text>
        </View>
        <Text style={styles.cartaoVaga2Valor}>{formatarMoeda(vaga.valorMensal)}/mês</Text>
      </View>

      <Text style={styles.cartaoVaga2Descricao}>{vaga.descricao}</Text>
      <Text style={styles.cartaoVaga2Proprietario}>Anunciada por {vaga.proprietario}</Text>

      {vaga.alugadaPorMim ? (
        <>
          {vaga.dataInicioISO && (
            <Text style={styles.cartaoVaga2Desde}>Alugando desde {formatarDataCurta(vaga.dataInicioISO)}</Text>
          )}
          <TouchableOpacity style={styles.botaoSecundario} onPress={() => onEncerrar(vaga.id)} activeOpacity={0.85}>
            <Text style={styles.botaoSecundarioTexto}>Encerrar aluguel</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.botaoPrimario} onPress={() => onAlugar(vaga)} activeOpacity={0.85}>
          <Text style={styles.botaoPrimarioTexto}>Alugar esta vaga</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------- Modal: novo/editar veículo ----------

interface ModalVeiculoProps {
  visivel: boolean;
  veiculoEditando: Veiculo | null;
  opcoesVaga: { id: string | null; label: string }[];
  onFechar: () => void;
  onSalvar: (dados: Omit<Veiculo, 'id'>, idEdicao: string | null) => void;
}

function ModalVeiculo({ visivel, veiculoEditando, opcoesVaga, onFechar, onSalvar }: ModalVeiculoProps) {
  const [placa, setPlaca] = useState(veiculoEditando?.placa ?? '');
  const [modelo, setModelo] = useState(veiculoEditando?.modelo ?? '');
  const [cor, setCor] = useState(veiculoEditando?.cor ?? '');
  const [tipo, setTipo] = useState<TipoVeiculo>(veiculoEditando?.tipo ?? 'carro');
  const [vagaId, setVagaId] = useState<string | null>(veiculoEditando?.vagaId ?? null);

  React.useEffect(() => {
    if (visivel) {
      setPlaca(veiculoEditando?.placa ?? '');
      setModelo(veiculoEditando?.modelo ?? '');
      setCor(veiculoEditando?.cor ?? '');
      setTipo(veiculoEditando?.tipo ?? 'carro');
      setVagaId(veiculoEditando?.vagaId ?? null);
    }
  }, [visivel, veiculoEditando]);

  const podeSalvar = placa.trim().length > 0 && modelo.trim().length > 0;

  function handleSalvar() {
    if (!podeSalvar) return;
    onSalvar(
      { placa: placa.trim().toUpperCase(), modelo: modelo.trim(), cor: cor.trim() || 'Não informada', tipo, vagaId },
      veiculoEditando?.id ?? null
    );
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>{veiculoEditando ? 'Editar veículo' : 'Novo veículo'}</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.campoLabel}>Tipo</Text>
            <View style={styles.segmentado}>
              <TouchableOpacity
                style={[styles.segmentoBotao, tipo === 'carro' && styles.segmentoBotaoAtivo]}
                onPress={() => setTipo('carro')}
              >
                <Text style={[styles.segmentoTexto, tipo === 'carro' && styles.segmentoTextoAtivo]}>Carro</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentoBotao, tipo === 'moto' && styles.segmentoBotaoAtivo]}
                onPress={() => setTipo('moto')}
              >
                <Text style={[styles.segmentoTexto, tipo === 'moto' && styles.segmentoTextoAtivo]}>Moto</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.campoLabel}>Placa</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: ABC1D23"
              placeholderTextColor="#A8A199"
              value={placa}
              onChangeText={setPlaca}
              autoCapitalize="characters"
              maxLength={8}
            />

            <Text style={styles.campoLabel}>Modelo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Honda Civic"
              placeholderTextColor="#A8A199"
              value={modelo}
              onChangeText={setModelo}
              maxLength={40}
            />

            <Text style={styles.campoLabel}>Cor</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Prata"
              placeholderTextColor="#A8A199"
              value={cor}
              onChangeText={setCor}
              maxLength={20}
            />

            <Text style={styles.campoLabel}>Vaga vinculada</Text>
            <View style={styles.chipsLinha}>
              {opcoesVaga.map((opcao) => {
                const ativo = opcao.id === vagaId;
                return (
                  <Chip key={String(opcao.id)} label={opcao.label} ativo={ativo} onPress={() => setVagaId(opcao.id)} />
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.botaoEnviar, !podeSalvar && styles.botaoEnviarDesabilitado]}
              onPress={handleSalvar}
              disabled={!podeSalvar}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Salvar veículo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Modal: disponibilizar / editar anúncio da própria vaga ----------

interface ModalAnuncioVagaProps {
  visivel: boolean;
  vaga: MinhaVaga;
  onFechar: () => void;
  onSalvar: (valorMensal: number, descricao: string) => void;
}

function ModalAnuncioVaga({ visivel, vaga, onFechar, onSalvar }: ModalAnuncioVagaProps) {
  const [valor, setValor] = useState(vaga.valorMensal ? String(vaga.valorMensal) : '');
  const [descricao, setDescricao] = useState(vaga.descricao ?? '');

  React.useEffect(() => {
    if (visivel) {
      setValor(vaga.valorMensal ? String(vaga.valorMensal) : '');
      setDescricao(vaga.descricao ?? '');
    }
  }, [visivel, vaga]);

  const valorNumerico = Number(valor.replace(',', '.'));
  const podeSalvar = valor.trim().length > 0 && !isNaN(valorNumerico) && valorNumerico > 0;

  function handleSalvar() {
    if (!podeSalvar) return;
    onSalvar(valorNumerico, descricao.trim());
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Anunciar vaga para aluguel</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitulo}>
            {vaga.numero} · {vaga.localizacao}
          </Text>

          <Text style={styles.campoLabel}>Valor mensal (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: 170"
            placeholderTextColor="#A8A199"
            value={valor}
            onChangeText={setValor}
            keyboardType="numeric"
          />

          <Text style={styles.campoLabel}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultilinha]}
            placeholder="Ex.: Vaga coberta, fácil acesso ao elevador..."
            placeholderTextColor="#A8A199"
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.botaoEnviar, !podeSalvar && styles.botaoEnviarDesabilitado]}
            onPress={handleSalvar}
            disabled={!podeSalvar}
            activeOpacity={0.85}
          >
            <Text style={styles.botaoEnviarTexto}>Salvar anúncio</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Modal: confirmar aluguel de vaga do mercado ----------

interface ModalConfirmarAluguelProps {
  vaga: VagaMercado | null;
  onFechar: () => void;
  onConfirmar: (id: string) => void;
}

function ModalConfirmarAluguel({ vaga, onFechar, onConfirmar }: ModalConfirmarAluguelProps) {
  return (
    <Modal visible={!!vaga} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Confirmar aluguel</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          {vaga && (
            <>
              <View style={styles.resumoVaga}>
                <Text style={styles.resumoVagaNumero}>{vaga.numero}</Text>
                <Text style={styles.resumoVagaLocal}>{vaga.localizacao}</Text>
                <Text style={styles.resumoVagaValor}>{formatarMoeda(vaga.valorMensal)}/mês</Text>
                <Text style={styles.resumoVagaProprietario}>Anunciada por {vaga.proprietario}</Text>
              </View>

              <TouchableOpacity
                style={styles.botaoEnviar}
                onPress={() => onConfirmar(vaga.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.botaoEnviarTexto}>Confirmar aluguel</Text>
              </TouchableOpacity>

              <Text style={styles.avisoConfirmacao}>
                O valor combinado é acertado diretamente com o morador anunciante.
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaVagasVeiculos() {
  const hoje = useMemo(() => new Date(), []);
  const dadosIniciais = useMemo(() => gerarDadosMock(hoje), [hoje]);

  const [abaAtiva, setAbaAtiva] = useState<Aba>('veiculos');
  const [veiculos, setVeiculos] = useState<Veiculo[]>(dadosIniciais.veiculos);
  const [minhaVaga, setMinhaVaga] = useState<MinhaVaga>(dadosIniciais.minhaVaga);
  const [vagasMercado, setVagasMercado] = useState<VagaMercado[]>(dadosIniciais.vagasMercado);

  const [modalVeiculoVisivel, setModalVeiculoVisivel] = useState(false);
  const [veiculoEditando, setVeiculoEditando] = useState<Veiculo | null>(null);
  const [modalAnuncioVisivel, setModalAnuncioVisivel] = useState(false);
  const [vagaParaAlugar, setVagaParaAlugar] = useState<VagaMercado | null>(null);

  const opcoesVaga = useMemo(() => {
    const opcoes: { id: string | null; label: string }[] = [];
    if (minhaVaga.locatario === null) {
      opcoes.push({ id: 'propria', label: `${minhaVaga.numero} (própria)` });
    }
    vagasMercado
      .filter((v) => v.alugadaPorMim)
      .forEach((v) => opcoes.push({ id: v.id, label: `${v.numero} (alugada)` }));
    opcoes.push({ id: null, label: 'Nenhuma vaga' });
    return opcoes;
  }, [minhaVaga, vagasMercado]);

  function obterLabelVaga(vagaId: string | null): string {
    if (vagaId === null) return 'Sem vaga vinculada';
    if (vagaId === 'propria') return `${minhaVaga.numero} (própria)`;
    const vaga = vagasMercado.find((v) => v.id === vagaId);
    return vaga ? `${vaga.numero} (alugada)` : 'Vaga não encontrada';
  }

  function handleAbrirNovoVeiculo() {
    setVeiculoEditando(null);
    setModalVeiculoVisivel(true);
  }

  function handleAbrirEdicaoVeiculo(veiculo: Veiculo) {
    setVeiculoEditando(veiculo);
    setModalVeiculoVisivel(true);
  }

  function handleSalvarVeiculo(dados: Omit<Veiculo, 'id'>, idEdicao: string | null) {
    if (idEdicao) {
      setVeiculos((atual) => atual.map((v) => (v.id === idEdicao ? { ...v, ...dados } : v)));
    } else {
      setVeiculos((atual) => [...atual, { ...dados, id: String(Date.now()) }]);
    }
    setModalVeiculoVisivel(false);
  }

  function handleRemoverVeiculo(id: string) {
    setVeiculos((atual) => atual.filter((v) => v.id !== id));
  }

  function handleSalvarAnuncio(valorMensal: number, descricao: string) {
    setMinhaVaga((atual) => ({ ...atual, disponibilizadaParaAluguel: true, valorMensal, descricao }));
    setModalAnuncioVisivel(false);
  }

  function handleRemoverAnuncio() {
    setMinhaVaga((atual) => ({ ...atual, disponibilizadaParaAluguel: false, valorMensal: null, descricao: '' }));
  }

  function handleEncerrarAluguelMinhaVaga() {
    setMinhaVaga((atual) => ({ ...atual, locatario: null }));
  }

  function handleAlugarVaga(id: string) {
    setVagasMercado((atual) =>
      atual.map((v) => (v.id === id ? { ...v, alugadaPorMim: true, dataInicioISO: new Date().toISOString() } : v))
    );
    setVagaParaAlugar(null);
  }

  function handleEncerrarAluguelMercado(id: string) {
    setVagasMercado((atual) =>
      atual.map((v) => (v.id === id ? { ...v, alugadaPorMim: false, dataInicioISO: undefined } : v))
    );
    // Se algum veículo estava vinculado a essa vaga, desvincula.
    setVeiculos((atual) => atual.map((v) => (v.vagaId === id ? { ...v, vagaId: null } : v)));
  }

  const vagasDisponiveis = vagasMercado.filter((v) => !v.alugadaPorMim);
  const vagasQueEstouAlugando = vagasMercado.filter((v) => v.alugadaPorMim);

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Vagas e Veículos</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.abasScroll} contentContainerStyle={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'veiculos' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('veiculos')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'veiculos' && styles.abaTextoAtivo]}>Meus veículos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'minhaVaga' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('minhaVaga')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'minhaVaga' && styles.abaTextoAtivo]}>Minha vaga</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'alugarVagas' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('alugarVagas')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'alugarVagas' && styles.abaTextoAtivo]}>Alugar vagas</Text>
        </TouchableOpacity>
      </ScrollView>

      {abaAtiva === 'veiculos' && (
        <>
          <FlatList
            data={veiculos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CartaoVeiculo
                veiculo={item}
                labelVaga={obterLabelVaga(item.vagaId)}
                onEditar={() => handleAbrirEdicaoVeiculo(item)}
                onRemover={() => handleRemoverVeiculo(item.id)}
              />
            )}
            contentContainerStyle={veiculos.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
            ListEmptyComponent={
              <EstadoVazio titulo="Nenhum veículo cadastrado" texto='Toque no botão "+" para adicionar o primeiro.' />
            }
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity style={styles.fab} onPress={handleAbrirNovoVeiculo} activeOpacity={0.85}>
            <Text style={styles.fabTexto}>+</Text>
          </TouchableOpacity>
        </>
      )}

      {abaAtiva === 'minhaVaga' && (
        <ScrollView contentContainerStyle={styles.conteudoScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.cartaoMinhaVaga}>
            <Text style={styles.cartaoMinhaVagaNumero}>{minhaVaga.numero}</Text>
            <Text style={styles.cartaoMinhaVagaLocal}>{minhaVaga.localizacao}</Text>

            {minhaVaga.locatario ? (
              <>
                <Selo texto="Alugada" cor="#2F855A" fundo="#E7F4ED" />
                <View style={styles.locatarioBox}>
                  <Text style={styles.locatarioTitulo}>Locatário atual</Text>
                  <Text style={styles.locatarioTexto}>
                    {minhaVaga.locatario.nome} · {minhaVaga.locatario.apto}
                  </Text>
                  <Text style={styles.locatarioTexto}>{minhaVaga.locatario.veiculo}</Text>
                  <Text style={styles.locatarioValor}>
                    {minhaVaga.valorMensal ? formatarMoeda(minhaVaga.valorMensal) : '—'}/mês
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.botaoSecundario}
                  onPress={handleEncerrarAluguelMinhaVaga}
                  activeOpacity={0.85}
                >
                  <Text style={styles.botaoSecundarioTexto}>Encerrar aluguel</Text>
                </TouchableOpacity>
              </>
            ) : minhaVaga.disponibilizadaParaAluguel ? (
              <>
                <Selo texto="Aguardando interessados" cor="#B7791F" fundo="#FBF1DE" />
                <View style={styles.locatarioBox}>
                  <Text style={styles.locatarioTitulo}>Anúncio ativo</Text>
                  <Text style={styles.locatarioTexto}>{minhaVaga.descricao || 'Sem descrição.'}</Text>
                  <Text style={styles.locatarioValor}>
                    {minhaVaga.valorMensal ? formatarMoeda(minhaVaga.valorMensal) : '—'}/mês
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.botaoSecundario}
                  onPress={() => setModalAnuncioVisivel(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.botaoSecundarioTexto}>Editar anúncio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botaoTexto} onPress={handleRemoverAnuncio} activeOpacity={0.7}>
                  <Text style={styles.botaoTextoRemover}>Remover anúncio</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Selo texto="Uso próprio" cor="#8A8377" fundo="#F0ECE5" />
                <Text style={styles.textoExplicativo}>
                  Sua vaga está marcada para uso próprio. Se não for usá-la por um tempo, você pode disponibilizá-la
                  para aluguel entre os moradores do condomínio.
                </Text>
                <TouchableOpacity
                  style={styles.botaoEnviar}
                  onPress={() => setModalAnuncioVisivel(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.botaoEnviarTexto}>Disponibilizar para aluguel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      )}

      {abaAtiva === 'alugarVagas' && (
        <ScrollView contentContainerStyle={styles.conteudoScroll} showsVerticalScrollIndicator={false}>
          {vagasQueEstouAlugando.length > 0 && (
            <>
              <Text style={styles.secaoTitulo}>Vagas que estou alugando</Text>
              {vagasQueEstouAlugando.map((vaga) => (
                <CartaoVagaMercado
                  key={vaga.id}
                  vaga={vaga}
                  onAlugar={setVagaParaAlugar}
                  onEncerrar={handleEncerrarAluguelMercado}
                />
              ))}
            </>
          )}

          <Text style={styles.secaoTitulo}>Vagas disponíveis</Text>
          {vagasDisponiveis.length === 0 ? (
            <EstadoVazio titulo="Nenhuma vaga disponível" texto="Novos anúncios de moradores vão aparecer aqui." />
          ) : (
            vagasDisponiveis.map((vaga) => (
              <CartaoVagaMercado
                key={vaga.id}
                vaga={vaga}
                onAlugar={setVagaParaAlugar}
                onEncerrar={handleEncerrarAluguelMercado}
              />
            ))
          )}
        </ScrollView>
      )}

      <ModalVeiculo
        visivel={modalVeiculoVisivel}
        veiculoEditando={veiculoEditando}
        opcoesVaga={opcoesVaga}
        onFechar={() => setModalVeiculoVisivel(false)}
        onSalvar={handleSalvarVeiculo}
      />

      <ModalAnuncioVaga
        visivel={modalAnuncioVisivel}
        vaga={minhaVaga}
        onFechar={() => setModalAnuncioVisivel(false)}
        onSalvar={handleSalvarAnuncio}
      />

      <ModalConfirmarAluguel
        vaga={vagaParaAlugar}
        onFechar={() => setVagaParaAlugar(null)}
        onConfirmar={handleAlugarVaga}
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
    fontSize: 26,
    fontWeight: '700',
    color: '#2B2823',
  },
  abasScroll: {
    flexGrow: 0,
    marginTop: 14,
  },
  abas: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  abaBotao: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F0ECE5',
  },
  abaBotaoAtiva: {
    backgroundColor: '#2B2823',
  },
  abaTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6459',
  },
  abaTextoAtivo: {
    color: '#FFFFFF',
  },
  conteudoScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 100,
  },
  listaConteudo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 100,
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 12,
    marginTop: 4,
  },
  cartao: {
    flexDirection: 'row',
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
  iconeVeiculo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconeVeiculoTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cartaoConteudo: {
    flex: 1,
  },
  cartaoPlaca: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2823',
    letterSpacing: 1,
  },
  cartaoModelo: {
    fontSize: 13,
    color: '#6B6459',
    marginTop: 2,
  },
  cartaoVaga: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 4,
  },
  cartaoAcoes: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  cartaoAcaoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D6FB4',
  },
  cartaoAcaoTextoRemover: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C0392B',
  },
  cartaoMinhaVaga: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cartaoMinhaVagaNumero: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 2,
  },
  cartaoMinhaVagaLocal: {
    fontSize: 13,
    color: '#8A8377',
    marginBottom: 14,
  },
  locatarioBox: {
    backgroundColor: '#F7F5F1',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    marginBottom: 14,
  },
  locatarioTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 6,
  },
  locatarioTexto: {
    fontSize: 13,
    color: '#6B6459',
    marginBottom: 2,
  },
  locatarioValor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
    marginTop: 6,
  },
  textoExplicativo: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 19,
    marginTop: 14,
    marginBottom: 16,
  },
  botaoTexto: {
    alignItems: 'center',
    marginTop: 12,
  },
  botaoTextoRemover: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C0392B',
  },
  cartaoVaga2: {
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
  cartaoVaga2Topo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cartaoVaga2Numero: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2823',
  },
  cartaoVaga2Local: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 2,
  },
  cartaoVaga2Valor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2F855A',
  },
  cartaoVaga2Descricao: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 18,
    marginBottom: 6,
  },
  cartaoVaga2Proprietario: {
    fontSize: 12,
    color: '#A8A199',
    marginBottom: 12,
  },
  cartaoVaga2Desde: {
    fontSize: 12,
    color: '#A8A199',
    marginBottom: 10,
  },
  botaoPrimario: {
    backgroundColor: '#2B2823',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoPrimarioTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  botaoSecundario: {
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoSecundarioTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
  },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0ECE5',
    marginRight: 8,
    marginBottom: 8,
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
  chipsLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontSize: 26,
    color: '#A8A199',
    fontWeight: '300',
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2B2823',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabTexto: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
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
    maxHeight: '90%',
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
    fontSize: 19,
    fontWeight: '700',
    color: '#2B2823',
  },
  modalFechar: {
    fontSize: 14,
    color: '#8A8377',
  },
  modalSubtitulo: {
    fontSize: 13,
    color: '#8A8377',
    marginBottom: 16,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 16,
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
  inputMultilinha: {
    minHeight: 80,
    paddingTop: 12,
  },
  segmentado: {
    flexDirection: 'row',
    backgroundColor: '#F0ECE5',
    borderRadius: 12,
    padding: 4,
  },
  segmentoBotao: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentoBotaoAtivo: {
    backgroundColor: '#2B2823',
  },
  segmentoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6459',
  },
  segmentoTextoAtivo: {
    color: '#FFFFFF',
  },
  botaoEnviar: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  botaoEnviarDesabilitado: {
    backgroundColor: '#D8D3C8',
  },
  botaoEnviarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  resumoVaga: {
    backgroundColor: '#F7F5F1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 6,
  },
  resumoVagaNumero: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 2,
  },
  resumoVagaLocal: {
    fontSize: 13,
    color: '#8A8377',
    marginBottom: 10,
  },
  resumoVagaValor: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2F855A',
    marginBottom: 8,
  },
  resumoVagaProprietario: {
    fontSize: 12,
    color: '#A8A199',
  },
  avisoConfirmacao: {
    fontSize: 11,
    color: '#A8A199',
    textAlign: 'center',
    marginTop: 12,
  },
});