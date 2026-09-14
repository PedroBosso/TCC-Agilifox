// Livro de Ocorrências da portaria — registro imutável (sem edição), dados vêm do Supabase (tabela ocorrencias).

import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { supabase } from '../lib/supabase';

// ---------- Tipos ----------

type Gravidade = 'normal' | 'atencao' | 'urgente';
type FiltroCategoria = 'todas' | string;

interface CategoriaInfo {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
}

interface OcorrenciaPortaria {
  id: string;
  titulo: string;
  descricao: string;
  categoriaId: string;
  gravidade: Gravidade;
  local: string;
  dataISO: string;
  encaminhadaSindico: boolean;
}

// ---------- Configuração visual ----------

const CATEGORIAS: CategoriaInfo[] = [
  { id: 'seguranca', nome: 'Segurança', sigla: 'S', cor: '#C0392B' },
  { id: 'visitante', nome: 'Visitante', sigla: 'V', cor: '#3D6FB4' },
  { id: 'manutencao', nome: 'Manutenção', sigla: 'M', cor: '#B7791F' },
  { id: 'convivencia', nome: 'Convivência', sigla: 'C', cor: '#7E57A6' },
  { id: 'veiculo', nome: 'Veículo', sigla: 'E', cor: '#2F855A' },
  { id: 'outros', nome: 'Outros', sigla: 'O', cor: '#8A8377' },
];

const CONFIG_GRAVIDADE: Record<Gravidade, { nome: string; cor: string; fundo: string }> = {
  normal: { nome: 'Normal', cor: '#6B6459', fundo: '#F0ECE5' },
  atencao: { nome: 'Atenção', cor: '#B7791F', fundo: '#FBF1DE' },
  urgente: { nome: 'Urgente', cor: '#C0392B', fundo: '#FBEAE8' },
};

// ---------- Helpers ----------

function getCategoria(id: string): CategoriaInfo {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

function formatarDataHoraExtensa(dataISO: string): string {
  const data = new Date(dataISO);
  const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dataFormatada} às ${horaFormatada}`;
}

function ehHoje(dataISO: string, hoje: Date): boolean {
  const data = new Date(dataISO);
  return (
    data.getFullYear() === hoje.getFullYear() &&
    data.getMonth() === hoje.getMonth() &&
    data.getDate() === hoje.getDate()
  );
}

function ocorrenciaPortariaDoBanco(row: any): OcorrenciaPortaria {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    categoriaId: row.categoria,
    gravidade: (row.gravidade ?? 'normal') as Gravidade,
    local: row.local ?? 'Não informado',
    dataISO: row.criado_em,
    encaminhadaSindico: row.encaminhada_sindico,
  };
}

// ---------- Subcomponentes ----------

function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, ativo && styles.chipAtivo]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SeloGravidade({ gravidade }: { gravidade: Gravidade }) {
  const config = CONFIG_GRAVIDADE[gravidade];
  return (
    <View style={[styles.selo, { backgroundColor: config.fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: config.cor }]} />
      <Text style={[styles.seloTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

function CartaoOcorrencia({ ocorrencia }: { ocorrencia: OcorrenciaPortaria }) {
  const categoria = getCategoria(ocorrencia.categoriaId);

  return (
    <View style={[styles.cartao, { borderLeftColor: categoria.cor }]}>
      <View style={styles.iconeCategoria}>
        <View style={[styles.iconeCategoriaCirculo, { backgroundColor: categoria.cor }]}>
          <Text style={styles.iconeCategoriaTexto}>{categoria.sigla}</Text>
        </View>
      </View>

      <View style={styles.cartaoConteudo}>
        <View style={styles.cartaoTopo}>
          <Text style={styles.cartaoData}>{formatarDataHoraExtensa(ocorrencia.dataISO)}</Text>
          <SeloGravidade gravidade={ocorrencia.gravidade} />
        </View>

        <Text style={styles.cartaoTitulo}>{ocorrencia.titulo}</Text>
        <Text style={styles.cartaoDescricao}>{ocorrencia.descricao}</Text>

        <View style={styles.cartaoRodape}>
          <Text style={styles.cartaoLocal}>{ocorrencia.local}</Text>
          {ocorrencia.encaminhadaSindico && (
            <View style={styles.seloEncaminhada}>
              <Text style={styles.seloEncaminhadaTexto}>Encaminhada ao síndico</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function EstadoVazio() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>+</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhuma ocorrência registrada</Text>
      <Text style={styles.estadoVazioTexto}>Toque no botão abaixo para registrar a primeira do plantão.</Text>
    </View>
  );
}

// ---------- Modal de nova ocorrência ----------

interface NovaOcorrenciaPayload {
  titulo: string;
  descricao: string;
  categoriaId: string;
  gravidade: Gravidade;
  local: string;
  encaminhadaSindico: boolean;
}

interface ModalNovaOcorrenciaProps {
  visivel: boolean;
  onFechar: () => void;
  onRegistrar: (payload: NovaOcorrenciaPayload) => void;
}

function ModalNovaOcorrencia({ visivel, onFechar, onRegistrar }: ModalNovaOcorrenciaProps) {
  const [categoriaId, setCategoriaId] = useState('seguranca');
  const [gravidade, setGravidade] = useState<Gravidade>('normal');
  const [titulo, setTitulo] = useState('');
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');
  const [encaminhadaSindico, setEncaminhadaSindico] = useState(false);

  const podeRegistrar = titulo.trim().length > 0 && descricao.trim().length > 0;

  function limparEFechar() {
    setCategoriaId('seguranca');
    setGravidade('normal');
    setTitulo('');
    setLocal('');
    setDescricao('');
    setEncaminhadaSindico(false);
    onFechar();
  }

  function handleRegistrar() {
    if (!podeRegistrar) return;
    onRegistrar({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      categoriaId,
      gravidade,
      local: local.trim() || 'Não informado',
      encaminhadaSindico,
    });
    limparEFechar();
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={limparEFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Registrar ocorrência</Text>
            <TouchableOpacity onPress={limparEFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitulo}>O registro é feito com a data e hora de agora e não pode ser editado depois.</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.campoLabel}>Categoria</Text>
            <View style={styles.chipsLinha}>
              {CATEGORIAS.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoriaBotao,
                    { borderColor: cat.cor },
                    cat.id === categoriaId && { backgroundColor: cat.cor },
                  ]}
                  onPress={() => setCategoriaId(cat.id)}
                >
                  <Text
                    style={[styles.categoriaBotaoTexto, { color: cat.id === categoriaId ? '#FFF' : cat.cor }]}
                  >
                    {cat.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.campoLabel}>Gravidade</Text>
            <View style={styles.segmentado}>
              {(Object.keys(CONFIG_GRAVIDADE) as Gravidade[]).map((id) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.segmentoBotao, gravidade === id && styles.segmentoBotaoAtivo]}
                  onPress={() => setGravidade(id)}
                >
                  <Text style={[styles.segmentoTexto, gravidade === id && styles.segmentoTextoAtivo]}>
                    {CONFIG_GRAVIDADE[id].nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.campoLabel}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Visitante sem autorização"
              placeholderTextColor="#A8A199"
              value={titulo}
              onChangeText={setTitulo}
              maxLength={70}
            />

            <Text style={styles.campoLabel}>Local</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Portaria, garagem, Bloco A..."
              placeholderTextColor="#A8A199"
              value={local}
              onChangeText={setLocal}
              maxLength={60}
            />

            <Text style={styles.campoLabel}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.inputMultilinha]}
              placeholder="Descreva o que aconteceu com o máximo de detalhes..."
              placeholderTextColor="#A8A199"
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={5}
              maxLength={600}
              textAlignVertical="top"
            />

            <Text style={styles.campoLabel}>Encaminhar ao síndico?</Text>
            <View style={styles.segmentado}>
              <TouchableOpacity
                style={[styles.segmentoBotao, encaminhadaSindico && styles.segmentoBotaoAtivo]}
                onPress={() => setEncaminhadaSindico(true)}
              >
                <Text style={[styles.segmentoTexto, encaminhadaSindico && styles.segmentoTextoAtivo]}>Sim</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentoBotao, !encaminhadaSindico && styles.segmentoBotaoAtivo]}
                onPress={() => setEncaminhadaSindico(false)}
              >
                <Text style={[styles.segmentoTexto, !encaminhadaSindico && styles.segmentoTextoAtivo]}>Não</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.botaoEnviar, !podeRegistrar && styles.botaoEnviarDesabilitado]}
              onPress={handleRegistrar}
              disabled={!podeRegistrar}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Registrar ocorrência</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaOcorrenciasPortaria() {
  const hoje = useMemo(() => new Date(), []);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaPortaria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroCategoria>('todas');
  const [modalVisivel, setModalVisivel] = useState(false);

  useEffect(() => {
    carregarOcorrencias();
  }, []);

  async function carregarOcorrencias() {
    setCarregando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCarregando(false);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from('ocorrencias')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar o livro de ocorrências.');
      setCarregando(false);
      return;
    }

    setOcorrencias((data ?? []).map(ocorrenciaPortariaDoBanco));
    setCarregando(false);
  }

  const ocorrenciasFiltradas = useMemo(() => {
    const lista = filtroAtivo === 'todas' ? ocorrencias : ocorrencias.filter((o) => o.categoriaId === filtroAtivo);
    return [...lista].sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime());
  }, [ocorrencias, filtroAtivo]);

  const totalHoje = ocorrencias.filter((o) => ehHoje(o.dataISO, hoje)).length;

  async function handleRegistrarOcorrencia(payload: NovaOcorrenciaPayload) {
    if (!userId) return;

    const { data, error } = await supabase
      .from('ocorrencias')
      .insert({
        autor_id: userId,
        origem: 'porteiro',
        categoria: payload.categoriaId,
        gravidade: payload.gravidade,
        titulo: payload.titulo,
        local: payload.local,
        descricao: payload.descricao,
        encaminhada_sindico: payload.encaminhadaSindico,
      })
      .select()
      .single();

    if (error || !data) {
      Alert.alert('Erro', 'Não foi possível registrar a ocorrência.');
      return;
    }

    setOcorrencias((atual) => [ocorrenciaPortariaDoBanco(data), ...atual]);
  }

  if (carregando) {
    return (
      <SafeAreaView style={[styles.tela, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2B2823" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Livro de Ocorrências</Text>
        </View>
        <View style={styles.contadorHoje}>
          <Text style={styles.contadorHojeTexto}>{totalHoje} hoje</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={styles.filtrosConteudo}
      >
        <Chip label="Todas" ativo={filtroAtivo === 'todas'} onPress={() => setFiltroAtivo('todas')} />
        {CATEGORIAS.map((cat) => (
          <Chip key={cat.id} label={cat.nome} ativo={filtroAtivo === cat.id} onPress={() => setFiltroAtivo(cat.id)} />
        ))}
      </ScrollView>

      <FlatList
        data={ocorrenciasFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartaoOcorrencia ocorrencia={item} />}
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
        onRegistrar={handleRegistrarOcorrencia}
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
    paddingTop: 16,
    paddingBottom: 12,
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
  contadorHoje: {
    backgroundColor: '#F0ECE5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  contadorHojeTexto: {
    color: '#6B6459',
    fontSize: 12,
    fontWeight: '600',
  },
  filtrosScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  filtrosConteudo: {
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0ECE5',
    marginRight: 8,
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
    color: '#FFF',
  },
  listaConteudo: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  cartao: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconeCategoria: {
    marginRight: 12,
  },
  iconeCategoriaCirculo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeCategoriaTexto: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cartaoConteudo: {
    flex: 1,
  },
  cartaoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cartaoData: {
    fontSize: 11,
    color: '#A8A199',
  },
  cartaoTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 4,
  },
  cartaoDescricao: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 18,
    marginBottom: 10,
  },
  cartaoRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cartaoLocal: {
    fontSize: 12,
    color: '#8A8377',
  },
  seloEncaminhada: {
    backgroundColor: '#EAF1FB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  seloEncaminhadaTexto: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3D6FB4',
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
    marginBottom: 8,
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
    fontSize: 12,
    color: '#A8A199',
    marginBottom: 8,
    lineHeight: 16,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 16,
  },
  chipsLinha: {
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
    minHeight: 110,
    paddingTop: 12,
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
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});