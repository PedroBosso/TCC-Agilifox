/**
 * TelaOcorrencias.js
 *
 * Tela de Ocorrências para moradores de condomínio.
 * Front-end apenas — os dados abaixo são mockados (MOCK_OCORRENCIAS).
 *
 * Para integrar com back-end depois, basta substituir:
 *   1. O estado inicial de `ocorrencias` por uma chamada à API (useEffect + fetch/axios)
 *   2. A função `handleNovaOcorrencia` por um POST para o seu endpoint
 *
 * Dependências: apenas React e React Native "puro" — nenhuma lib extra necessária.
 */

import React, { useMemo, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
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

// ---------- Configuração visual ----------

const CATEGORIAS = [
  { id: 'manutencao', nome: 'Manutenção', sigla: 'M', cor: '#3D6FB4' },
  { id: 'seguranca', nome: 'Segurança', sigla: 'S', cor: '#C0392B' },
  { id: 'barulho', nome: 'Barulho', sigla: 'B', cor: '#7E57A6' },
  { id: 'limpeza', nome: 'Limpeza', sigla: 'L', cor: '#2F855A' },
  { id: 'outros', nome: 'Outros', sigla: 'O', cor: '#8A8377' },
];

const STATUS = {
  aberta: { nome: 'Aberta', cor: '#C0392B', fundo: '#FBEAE8' },
  andamento: { nome: 'Em andamento', cor: '#B7791F', fundo: '#FBF1DE' },
  resolvida: { nome: 'Resolvida', cor: '#2F855A', fundo: '#E7F4ED' },
};

const FILTROS = [
  { id: 'todas', nome: 'Todas' },
  { id: 'aberta', nome: 'Abertas' },
  { id: 'andamento', nome: 'Em andamento' },
  { id: 'resolvida', nome: 'Resolvidas' },
];

// ---------- Dados mockados ----------

const MOCK_OCORRENCIAS = [
  {
    id: '1',
    titulo: 'Vazamento no teto da garagem',
    descricao: 'Água escorrendo perto da vaga 14, bloco B, desde ontem à noite.',
    categoria: 'manutencao',
    status: 'aberta',
    local: 'Garagem - Bloco B',
    data: '2026-06-28T09:12:00',
  },
  {
    id: '2',
    titulo: 'Som alto após as 22h',
    descricao: 'Apartamento 302 com música em volume alto durante a semana.',
    categoria: 'barulho',
    status: 'andamento',
    local: 'Apto 302',
    data: '2026-06-27T23:40:00',
  },
  {
    id: '3',
    titulo: 'Portão da garagem não fecha',
    descricao: 'Sensor parece estar com defeito, portão fica meio aberto.',
    categoria: 'seguranca',
    status: 'andamento',
    local: 'Entrada principal',
    data: '2026-06-25T18:05:00',
  },
  {
    id: '4',
    titulo: 'Lâmpada queimada no corredor',
    descricao: 'Corredor do 5º andar está escuro à noite.',
    categoria: 'manutencao',
    status: 'resolvida',
    local: '5º andar - Bloco A',
    data: '2026-06-20T14:30:00',
  },
  {
    id: '5',
    titulo: 'Lixo acumulado na área comum',
    descricao: 'Sacos de lixo deixados ao lado da lixeira, atraindo insetos.',
    categoria: 'limpeza',
    status: 'resolvida',
    local: 'Área comum - Térreo',
    data: '2026-06-18T08:00:00',
  },
];

// ---------- Helpers ----------

function formatarData(isoString) {
  const data = new Date(isoString);
  const agora = new Date();
  const diffDias = Math.floor((agora - data) / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Ontem';
  if (diffDias < 7) return `Há ${diffDias} dias`;

  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getCategoria(id) {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

// ---------- Subcomponentes ----------

function Selo({ status }) {
  const config = STATUS[status as keyof typeof STATUS];
  return (
    <View style={[styles.selo, { backgroundColor: config.fundo }]}> 
      <View style={[styles.seloPonto, { backgroundColor: config.cor }]} />
      <Text style={[styles.seloTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

function CartaoOcorrencia({ ocorrencia, onPress }) {
  const categoria = getCategoria(ocorrencia.categoria);
  const statusConfig = STATUS[ocorrencia.status as keyof typeof STATUS];
  return (
    <TouchableOpacity
      style={[styles.cartao, { borderLeftColor: statusConfig.cor }]}
      onPress={() => onPress(ocorrencia)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconeCategoria, { backgroundColor: categoria.cor }]}>
        <Text style={styles.iconeCategoriaTexto}>{categoria.sigla}</Text>
      </View>

      <View style={styles.cartaoConteudo}>
        <View style={styles.cartaoTopo}>
          <Text style={styles.cartaoTitulo} numberOfLines={1}>
            {ocorrencia.titulo}
          </Text>
          <Text style={styles.cartaoData}>{formatarData(ocorrencia.data)}</Text>
        </View>

        <Text style={styles.cartaoDescricao} numberOfLines={2}>
          {ocorrencia.descricao}
        </Text>

        <View style={styles.cartaoRodape}>
          <Text style={styles.cartaoLocal}>{ocorrencia.local}</Text>
          <Selo status={ocorrencia.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Chip({ label, ativo, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, ativo && styles.chipAtivo]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EstadoVazio() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>+</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhuma ocorrência por aqui</Text>
      <Text style={styles.estadoVazioTexto}>
        Toque no botão abaixo para relatar algo ao síndico.
      </Text>
    </View>
  );
}

// ---------- Modal de nova ocorrência ----------

function ModalNovaOcorrencia({ visivel, onFechar, onEnviar }) {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('manutencao');
  const [titulo, setTitulo] = useState('');
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');

  const podeEnviar = titulo.trim().length > 0 && descricao.trim().length > 0;

  function limparEFechar() {
    setTitulo('');
    setLocal('');
    setDescricao('');
    setCategoriaSelecionada('manutencao');
    onFechar();
  }

  function handleEnviar() {
    if (!podeEnviar) return;
    onEnviar({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      local: local.trim() || 'Não informado',
      categoria: categoriaSelecionada,
    });
    limparEFechar();
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={limparEFechar}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalFundo}
      >
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Nova ocorrência</Text>
            <TouchableOpacity onPress={limparEFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.campoLabel}>Categoria</Text>
            <View style={styles.categoriasLinha}>
              {CATEGORIAS.map((cat) => {
                const ativa = cat.id === categoriaSelecionada;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoriaBotao,
                      { borderColor: cat.cor },
                      ativa && { backgroundColor: cat.cor },
                    ]}
                    onPress={() => setCategoriaSelecionada(cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoriaBotaoTexto,
                        { color: ativa ? '#FFF' : cat.cor },
                      ]}
                    >
                      {cat.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.campoLabel}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Vazamento na garagem"
              placeholderTextColor="#A8A199"
              value={titulo}
              onChangeText={setTitulo}
              maxLength={60}
            />

            <Text style={styles.campoLabel}>Local</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Bloco B, apto 302, área comum..."
              placeholderTextColor="#A8A199"
              value={local}
              onChangeText={setLocal}
              maxLength={60}
            />

            <Text style={styles.campoLabel}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.inputMultilinha]}
              placeholder="Descreva o que está acontecendo..."
              placeholderTextColor="#A8A199"
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.botaoEnviar, !podeEnviar && styles.botaoEnviarDesabilitado]}
              onPress={handleEnviar}
              disabled={!podeEnviar}
            >
              <Text style={styles.botaoEnviarTexto}>Enviar ocorrência</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaOcorrencias() {
  const [ocorrencias, setOcorrencias] = useState(MOCK_OCORRENCIAS);
  const [filtroAtivo, setFiltroAtivo] = useState('todas');
  const [modalVisivel, setModalVisivel] = useState(false);

  const ocorrenciasFiltradas = useMemo(() => {
    const lista =
      filtroAtivo === 'todas' ? ocorrencias : ocorrencias.filter((o) => o.status === filtroAtivo);

    return [...lista].sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [ocorrencias, filtroAtivo]);

  const totalAbertas = ocorrencias.filter((o) => o.status === 'aberta').length;

  function handleNovaOcorrencia(novaOcorrencia) {
    const ocorrenciaCompleta = {
      ...novaOcorrencia,
      id: String(Date.now()),
      status: 'aberta',
      data: new Date().toISOString(),
    };
    setOcorrencias((atual) => [ocorrenciaCompleta, ...atual]);
  }

  function handlePressCard(ocorrencia) {
    // Espaço reservado para navegação futura até uma tela de detalhes, ex:
    // navigation.navigate('DetalheOcorrencia', { id: ocorrencia.id })
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Ocorrências</Text>
        </View>
        {totalAbertas > 0 && (
          <View style={styles.contadorAbertas}>
            <Text style={styles.contadorAbertasTexto}>
              {totalAbertas} aberta{totalAbertas > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={styles.filtrosConteudo}
      >
        {FILTROS.map((f) => (
          <Chip
            key={f.id}
            label={f.nome}
            ativo={filtroAtivo === f.id}
            onPress={() => setFiltroAtivo(f.id)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={ocorrenciasFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartaoOcorrencia ocorrencia={item} onPress={handlePressCard} />}
        contentContainerStyle={
          ocorrenciasFiltradas.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
        }
        ListEmptyComponent={<EstadoVazio />}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisivel(true)} activeOpacity={0.85}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      <ModalNovaOcorrencia
        visivel={modalVisivel}
        onFechar={() => setModalVisivel(false)}
        onEnviar={handleNovaOcorrencia}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  cabecalhoSaudacao: {
    fontSize: 12,
    color: '#8A8377',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cabecalhoTitulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2B2823',
  },
  contadorAbertas: {
    backgroundColor: '#FBEAE8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  contadorAbertasTexto: {
    color: '#C0392B',
    fontSize: 12,
    fontWeight: '600',
  },
  filtrosScroll: {
    flexGrow: 0,
    marginBottom: 14,
  },
  filtrosConteudo: {
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE9E1',
    marginRight: 10,
  },
  chipAtivo: {
    backgroundColor: '#2B2823',
    borderColor: '#2B2823',
  },
  chipTexto: {
    fontSize: 13,
    color: '#6B6459',
    fontWeight: '600',
  },
  chipTextoAtivo: {
    color: '#FFF',
  },
  listaConteudo: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  cartao: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderLeftWidth: 4,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconeCategoria: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconeCategoriaTexto: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  cartaoConteudo: {
    flex: 1,
  },
  cartaoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2823',
    flex: 1,
    marginRight: 10,
  },
  cartaoData: {
    fontSize: 12,
    color: '#A8A199',
  },
  cartaoDescricao: {
    fontSize: 14,
    color: '#6B6459',
    marginTop: 6,
    lineHeight: 20,
  },
  cartaoRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cartaoLocal: {
    fontSize: 12,
    color: '#A8A199',
  },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  seloPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  seloTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  estadoVazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  estadoVazioCirculo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0ECE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  estadoVazioIcone: {
    fontSize: 28,
    color: '#A8A199',
    fontWeight: '300',
  },
  estadoVazioTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 6,
  },
  estadoVazioTexto: {
    fontSize: 14,
    color: '#8A8377',
    textAlign: 'center',
    lineHeight: 20,
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
    color: '#FFF',
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
    maxHeight: '85%',
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
    marginBottom: 18,
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
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 12,
  },
  categoriasLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoriaBotao: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },
  categoriaBotaoTexto: {
    fontSize: 12,
    fontWeight: '600',
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
    minHeight: 100,
    paddingTop: 12,
  },
  botaoEnviar: {
    backgroundColor: '#e49c15',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#e49c15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  botaoEnviarDesabilitado: {
    backgroundColor: '#D8D3C8',
  },
  botaoEnviarTexto: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});