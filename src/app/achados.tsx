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

// ---------- Tipos ----------

type TipoItem = 'perdido' | 'achado';
type StatusItem = 'ativo' | 'resolvido';
type FiltroId = 'todos' | 'perdidos' | 'achados' | 'resolvidos';

interface CategoriaInfo {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
}

interface ItemAchadoPerdido {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoItem;
  categoriaId: string;
  local: string;
  dataISO: string;
  status: StatusItem;
  contato: string;
  meuItem: boolean;
}

// ---------- Dados fixos ----------

const CATEGORIAS: CategoriaInfo[] = [
  { id: 'eletronicos', nome: 'Eletrônicos', sigla: 'E', cor: '#3D6FB4' },
  { id: 'documentos', nome: 'Documentos', sigla: 'D', cor: '#7E57A6' },
  { id: 'chaves', nome: 'Chaves', sigla: 'C', cor: '#B7791F' },
  { id: 'animais', nome: 'Animais de estimação', sigla: 'A', cor: '#C0392B' },
  { id: 'roupas_acessorios', nome: 'Roupas e acessórios', sigla: 'R', cor: '#2F855A' },
  { id: 'outros', nome: 'Outros', sigla: 'O', cor: '#8A8377' },
];

const FILTROS: { id: FiltroId; nome: string }[] = [
  { id: 'todos', nome: 'Todos' },
  { id: 'perdidos', nome: 'Perdidos' },
  { id: 'achados', nome: 'Achados' },
  { id: 'resolvidos', nome: 'Resolvidos' },
];

const CONFIG_TIPO: Record<TipoItem, { nome: string; cor: string; fundo: string }> = {
  perdido: { nome: 'Perdido', cor: '#C0392B', fundo: '#FBEAE8' },
  achado: { nome: 'Achado', cor: '#2F855A', fundo: '#E7F4ED' },
};

// ---------- Helpers ----------

function getCategoria(id: string): CategoriaInfo {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

function addDias(data: Date, dias: number): Date {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

function formatarDataISO(data: Date): string {
  return data.toISOString();
}

function formatarDataRelativa(dataISO: string): string {
  const data = new Date(dataISO);
  const agora = new Date();
  const diffDias = Math.floor((agora.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias <= 0) return 'Hoje';
  if (diffDias === 1) return 'Ontem';
  if (diffDias < 7) return `Há ${diffDias} dias`;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ---------- Dados mockados ----------
// Gerados a partir de "hoje" para que a tela sempre mostre exemplos relevantes,
// independentemente da data em que o app for aberto.

function gerarItensMock(): ItemAchadoPerdido[] {
  const hoje = new Date();
  return [
    {
      id: '1',
      titulo: 'Chaveiro com 3 chaves',
      descricao: 'Encontrado próximo à portaria, chaveiro azul com pingente de bola de futebol.',
      tipo: 'achado',
      categoriaId: 'chaves',
      local: 'Portaria principal',
      dataISO: formatarDataISO(addDias(hoje, -1)),
      status: 'ativo',
      contato: 'Portaria - (19) 99999-0001',
      meuItem: false,
    },
    {
      id: '2',
      titulo: 'Perdi meu gato - Mingau',
      descricao: 'Gato laranja, castrado, muito dócil. Sumiu do apartamento há dois dias.',
      tipo: 'perdido',
      categoriaId: 'animais',
      local: 'Bloco C',
      dataISO: formatarDataISO(addDias(hoje, -2)),
      status: 'ativo',
      contato: 'Apto 604 - (19) 99999-0002',
      meuItem: true,
    },
    {
      id: '3',
      titulo: 'Fone de ouvido bluetooth',
      descricao: 'Fone branco encontrado na academia, dentro do estojo de silicone.',
      tipo: 'achado',
      categoriaId: 'eletronicos',
      local: 'Academia',
      dataISO: formatarDataISO(addDias(hoje, -3)),
      status: 'ativo',
      contato: 'Zeladoria - (19) 99999-0003',
      meuItem: false,
    },
    {
      id: '4',
      titulo: 'Carteira com documentos',
      descricao: 'RG e CPF encontrados no elevador do bloco A, dentro de uma carteira preta.',
      tipo: 'achado',
      categoriaId: 'documentos',
      local: 'Elevador - Bloco A',
      dataISO: formatarDataISO(addDias(hoje, -4)),
      status: 'resolvido',
      contato: 'Portaria - (19) 99999-0001',
      meuItem: false,
    },
    {
      id: '5',
      titulo: 'Perdi um casaco jeans',
      descricao: 'Esqueci no salão de festas depois do aniversário do fim de semana.',
      tipo: 'perdido',
      categoriaId: 'roupas_acessorios',
      local: 'Salão de festas',
      dataISO: formatarDataISO(addDias(hoje, -5)),
      status: 'ativo',
      contato: 'Apto 302 - (19) 99999-0004',
      meuItem: true,
    },
    {
      id: '6',
      titulo: 'Óculos de sol encontrado',
      descricao: 'Óculos escuros modelo aviador, achado na área da piscina.',
      tipo: 'achado',
      categoriaId: 'outros',
      local: 'Piscina',
      dataISO: formatarDataISO(addDias(hoje, -6)),
      status: 'resolvido',
      contato: 'Portaria - (19) 99999-0001',
      meuItem: false,
    },
  ];
}

function ordenarItens(itens: ItemAchadoPerdido[]): ItemAchadoPerdido[] {
  return [...itens].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'ativo' ? -1 : 1;
    return new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime();
  });
}

// ---------- Subcomponentes ----------

function SeloTipo({ tipo }: { tipo: TipoItem }) {
  const config = CONFIG_TIPO[tipo];
  return (
    <View style={[styles.selo, { backgroundColor: config.fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: config.cor }]} />
      <Text style={[styles.seloTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
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

interface CartaoItemProps {
  item: ItemAchadoPerdido;
  onMarcarResolvido: (id: string) => void;
}

function CartaoItem({ item, onMarcarResolvido }: CartaoItemProps) {
  const categoria = getCategoria(item.categoriaId);
  const resolvido = item.status === 'resolvido';

  return (
    <View style={[styles.cartao, resolvido && styles.cartaoResolvido]}>
      <View style={[styles.iconeCategoria, { backgroundColor: categoria.cor }]}>
        <Text style={styles.iconeCategoriaTexto}>{categoria.sigla}</Text>
      </View>

      <View style={styles.cartaoConteudo}>
        <View style={styles.cartaoTopo}>
          <SeloTipo tipo={item.tipo} />
          <Text style={styles.cartaoData}>{formatarDataRelativa(item.dataISO)}</Text>
        </View>

        <Text style={[styles.cartaoTitulo, resolvido && styles.textoResolvido]} numberOfLines={1}>
          {item.titulo}
        </Text>

        <Text style={[styles.cartaoDescricao, resolvido && styles.textoResolvido]} numberOfLines={2}>
          {item.descricao}
        </Text>

        <Text style={styles.cartaoLocal}>{item.local}</Text>
        <Text style={styles.cartaoContato}>{item.contato}</Text>

        {item.meuItem && (
          <View style={styles.cartaoRodape}>
            {resolvido ? (
              <Text style={styles.cartaoResolvidoTexto}>Marcado como resolvido por você</Text>
            ) : (
              <TouchableOpacity
                onPress={() => onMarcarResolvido(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.cartaoMarcarResolvido}>Marcar como resolvido</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
      <Text style={styles.estadoVazioTitulo}>Nada por aqui ainda</Text>
      <Text style={styles.estadoVazioTexto}>
        Toque no botão abaixo para publicar um item perdido ou encontrado.
      </Text>
    </View>
  );
}

// ---------- Modal de novo item ----------

interface NovoItemPayload {
  titulo: string;
  descricao: string;
  tipo: TipoItem;
  categoriaId: string;
  local: string;
  contato: string;
}

interface ModalNovoItemProps {
  visivel: boolean;
  onFechar: () => void;
  onEnviar: (payload: NovoItemPayload) => void;
}

function ModalNovoItem({ visivel, onFechar, onEnviar }: ModalNovoItemProps) {
  const [tipo, setTipo] = useState<TipoItem>('perdido');
  const [categoriaId, setCategoriaId] = useState('outros');
  const [titulo, setTitulo] = useState('');
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');
  const [contato, setContato] = useState('');

  const podeEnviar = titulo.trim().length > 0 && descricao.trim().length > 0 && contato.trim().length > 0;

  function limparEFechar() {
    setTipo('perdido');
    setCategoriaId('outros');
    setTitulo('');
    setLocal('');
    setDescricao('');
    setContato('');
    onFechar();
  }

  function handleEnviar() {
    if (!podeEnviar) return;
    onEnviar({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      tipo,
      categoriaId,
      local: local.trim() || 'Não informado',
      contato: contato.trim(),
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
            <Text style={styles.modalTitulo}>Novo registro</Text>
            <TouchableOpacity onPress={limparEFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.segmentado}>
              <TouchableOpacity
                style={[styles.segmentoBotao, tipo === 'perdido' && styles.segmentoBotaoAtivoPerdido]}
                onPress={() => setTipo('perdido')}
              >
                <Text style={[styles.segmentoTexto, tipo === 'perdido' && styles.segmentoTextoAtivo]}>
                  Perdi algo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentoBotao, tipo === 'achado' && styles.segmentoBotaoAtivoAchado]}
                onPress={() => setTipo('achado')}
              >
                <Text style={[styles.segmentoTexto, tipo === 'achado' && styles.segmentoTextoAtivo]}>
                  Encontrei algo
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.campoLabel}>Categoria</Text>
            <View style={styles.categoriasLinha}>
              {CATEGORIAS.map((cat) => {
                const ativa = cat.id === categoriaId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoriaBotao,
                      { borderColor: cat.cor },
                      ativa && { backgroundColor: cat.cor },
                    ]}
                    onPress={() => setCategoriaId(cat.id)}
                  >
                    <Text style={[styles.categoriaBotaoTexto, { color: ativa ? '#FFF' : cat.cor }]}>
                      {cat.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.campoLabel}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder={tipo === 'perdido' ? 'Ex.: Perdi um chaveiro' : 'Ex.: Encontrei um chaveiro'}
              placeholderTextColor="#A8A199"
              value={titulo}
              onChangeText={setTitulo}
              maxLength={60}
            />

            <Text style={styles.campoLabel}>Local</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Portaria, academia, salão de festas..."
              placeholderTextColor="#A8A199"
              value={local}
              onChangeText={setLocal}
              maxLength={60}
            />

            <Text style={styles.campoLabel}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.inputMultilinha]}
              placeholder="Descreva o item com detalhes que ajudem a identificá-lo..."
              placeholderTextColor="#A8A199"
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={4}
              maxLength={400}
              textAlignVertical="top"
            />

            <Text style={styles.campoLabel}>Contato</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Apto 302 ou (19) 99999-0000"
              placeholderTextColor="#A8A199"
              value={contato}
              onChangeText={setContato}
              maxLength={60}
            />

            <TouchableOpacity
              style={[styles.botaoEnviar, !podeEnviar && styles.botaoEnviarDesabilitado]}
              onPress={handleEnviar}
              disabled={!podeEnviar}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Publicar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaAchadosPerdidos() {
  const [itens, setItens] = useState<ItemAchadoPerdido[]>(gerarItensMock);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroId>('todos');
  const [modalVisivel, setModalVisivel] = useState(false);

  const itensFiltrados = useMemo(() => {
    let lista = itens;
    if (filtroAtivo === 'perdidos') lista = itens.filter((i) => i.tipo === 'perdido');
    else if (filtroAtivo === 'achados') lista = itens.filter((i) => i.tipo === 'achado');
    else if (filtroAtivo === 'resolvidos') lista = itens.filter((i) => i.status === 'resolvido');

    return ordenarItens(lista);
  }, [itens, filtroAtivo]);

  const totalAtivos = itens.filter((i) => i.status === 'ativo').length;

  function handleNovoItem(payload: NovoItemPayload) {
    const novoItem: ItemAchadoPerdido = {
      ...payload,
      id: String(Date.now()),
      status: 'ativo',
      dataISO: new Date().toISOString(),
      meuItem: true,
    };
    setItens((atual) => [novoItem, ...atual]);
  }

  function handleMarcarResolvido(id: string) {
    setItens((atual) => atual.map((item) => (item.id === id ? { ...item, status: 'resolvido' } : item)));
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Achados e Perdidos</Text>
        </View>
        {totalAtivos > 0 && (
          <View style={styles.contadorAtivos}>
            <Text style={styles.contadorAtivosTexto}>
              {totalAtivos} ativo{totalAtivos > 1 ? 's' : ''}
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
        data={itensFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CartaoItem item={item} onMarcarResolvido={handleMarcarResolvido} />
        )}
        contentContainerStyle={
          itensFiltrados.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
        }
        ListEmptyComponent={<EstadoVazio />}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisivel(true)} activeOpacity={0.85}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      <ModalNovoItem
        visivel={modalVisivel}
        onFechar={() => setModalVisivel(false)}
        onEnviar={handleNovoItem}
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
    fontSize: 26,
    fontWeight: '700',
    color: '#2B2823',
  },
  contadorAtivos: {
    backgroundColor: '#F0ECE5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  contadorAtivosTexto: {
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
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cartaoResolvido: {
    opacity: 0.7,
  },
  iconeCategoria: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    marginBottom: 8,
  },
  textoResolvido: {
    color: '#A8A199',
  },
  cartaoLocal: {
    fontSize: 12,
    color: '#8A8377',
    marginBottom: 2,
  },
  cartaoContato: {
    fontSize: 12,
    color: '#8A8377',
  },
  cartaoRodape: {
    marginTop: 10,
  },
  cartaoMarcarResolvido: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F855A',
  },
  cartaoResolvidoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A8A199',
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
    maxHeight: '88%',
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
  segmentado: {
    flexDirection: 'row',
    backgroundColor: '#F0ECE5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  segmentoBotao: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentoBotaoAtivoPerdido: {
    backgroundColor: '#C0392B',
  },
  segmentoBotaoAtivoAchado: {
    backgroundColor: '#2F855A',
  },
  segmentoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6459',
  },
  segmentoTextoAtivo: {
    color: '#FFFFFF',
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 16,
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