

import React, { useMemo, useState } from 'react';
import {
    FlatList,
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

// ---------- Tipos ----------

type StatusEnquete = 'ativa' | 'encerrada';
type Aba = 'nova' | 'gerenciar';

interface OpcaoEnquete {
  id: string;
  texto: string;
  votos: number;
}

interface Enquete {
  id: string;
  titulo: string;
  descricao: string;
  opcoes: OpcaoEnquete[];
  dataFimISO: string;
  anonima: boolean;
  encerradaManualmente?: boolean;
}

// ---------- Helpers ----------

function addDias(data: Date, dias: number): Date {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function mesmoDia(a: Date, b: Date): boolean {
  return formatarDataISO(a) === formatarDataISO(b);
}

function formatarDiaSemanaAbrev(data: Date): string {
  return data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function formatarDataCurta(dataISO: string): string {
  return new Date(dataISO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function calcularStatus(enquete: Enquete, agora: Date): StatusEnquete {
  if (enquete.encerradaManualmente) return 'encerrada';
  return new Date(enquete.dataFimISO) < agora ? 'encerrada' : 'ativa';
}

function totalVotos(enquete: Enquete): number {
  return enquete.opcoes.reduce((soma, o) => soma + o.votos, 0);
}

function percentual(opcao: OpcaoEnquete, total: number): number {
  return total > 0 ? opcao.votos / total : 0;
}

// ---------- Dados mockados ----------

function gerarEnquetesMock(agora: Date): Enquete[] {
  return [
    {
      id: 'e1',
      titulo: 'Reforma do playground',
      descricao: 'Proposta de reforma completa do playground, incluindo piso emborrachado e novos brinquedos.',
      dataFimISO: addDias(agora, 5).toISOString(),
      anonima: true,
      opcoes: [
        { id: 'o1', texto: 'Aprovo a reforma', votos: 34 },
        { id: 'o2', texto: 'Não aprovo', votos: 9 },
        { id: 'o3', texto: 'Preciso de mais informações', votos: 12 },
      ],
    },
    {
      id: 'e2',
      titulo: 'Troca da empresa de portaria',
      descricao: 'Escolha entre as duas propostas apresentadas na última assembleia.',
      dataFimISO: addDias(agora, 2).toISOString(),
      anonima: false,
      opcoes: [
        { id: 'o4', texto: 'Empresa A - SegurançaTotal', votos: 41 },
        { id: 'o5', texto: 'Empresa B - VigilantePlus', votos: 27 },
      ],
    },
    {
      id: 'e3',
      titulo: 'Horário de silêncio nos finais de semana',
      descricao: 'Definir novo horário de silêncio para sábados e domingos.',
      dataFimISO: addDias(agora, -10).toISOString(),
      anonima: true,
      opcoes: [
        { id: 'o6', texto: 'Manter às 22h', votos: 52 },
        { id: 'o7', texto: 'Alterar para 23h', votos: 38 },
        { id: 'o8', texto: 'Alterar para 21h', votos: 6 },
      ],
    },
  ];
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

interface ItemDataProps {
  data: Date;
  selecionada: boolean;
  onPress: () => void;
}

function ItemData({ data, selecionada, onPress }: ItemDataProps) {
  const hoje = mesmoDia(data, new Date());
  return (
    <TouchableOpacity
      style={[styles.itemData, selecionada && styles.itemDataSelecionada]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.itemDataDiaSemana, selecionada && styles.itemDataTextoSelecionado]}>
        {hoje ? 'Hoje' : formatarDiaSemanaAbrev(data)}
      </Text>
      <Text style={[styles.itemDataNumero, selecionada && styles.itemDataTextoSelecionado]}>{data.getDate()}</Text>
    </TouchableOpacity>
  );
}

function BarraResultado({ opcao, total }: { opcao: OpcaoEnquete; total: number }) {
  const pct = percentual(opcao, total);
  return (
    <View style={styles.barraLinha}>
      <View style={styles.barraCabecalho}>
        <Text style={styles.barraTexto} numberOfLines={1}>
          {opcao.texto}
        </Text>
        <Text style={styles.barraPercentual}>
          {opcao.votos} · {Math.round(pct * 100)}%
        </Text>
      </View>
      <View style={styles.barraFundo}>
        <View style={[styles.barraPreenchida, { width: `${Math.max(pct * 100, 2)}%` }]} />
      </View>
    </View>
  );
}

interface CartaoGerenciarProps {
  enquete: Enquete;
  agora: Date;
  onEncerrarAgora: (id: string) => void;
}

function CartaoGerenciar({ enquete, agora, onEncerrarAgora }: CartaoGerenciarProps) {
  const status = calcularStatus(enquete, agora);
  const total = totalVotos(enquete);

  return (
    <View style={styles.cartao}>
      <View style={styles.cartaoTopo}>
        <Text style={styles.cartaoTitulo}>{enquete.titulo}</Text>
        <Selo
          texto={status === 'ativa' ? 'Ativa' : 'Encerrada'}
          cor={status === 'ativa' ? '#2F855A' : '#8A8377'}
          fundo={status === 'ativa' ? '#E7F4ED' : '#F0ECE5'}
        />
      </View>

      <Text style={styles.cartaoMeta}>
        {enquete.anonima ? 'Voto anônimo' : 'Voto identificado'} · Encerra em {formatarDataCurta(enquete.dataFimISO)}
      </Text>

      <View style={styles.cartaoResultados}>
        {enquete.opcoes.map((opcao) => (
          <BarraResultado key={opcao.id} opcao={opcao} total={total} />
        ))}
        <Text style={styles.totalVotos}>{total} voto{total !== 1 ? 's' : ''} no total</Text>
      </View>

      {status === 'ativa' && (
        <TouchableOpacity style={styles.botaoEncerrar} onPress={() => onEncerrarAgora(enquete.id)} activeOpacity={0.85}>
          <Text style={styles.botaoEncerrarTexto}>Encerrar votação agora</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EstadoVazio() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>+</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhuma enquete publicada</Text>
      <Text style={styles.estadoVazioTexto}>Use a aba ´Nova enquete´ para criar a primeira.</Text>
    </View>
  );
}

// ---------- Tela principal ----------

export default function TelaEnquetesSindico() {
  const referencia = useMemo(() => new Date(), []);
  const diasDisponiveis = useMemo(() => Array.from({ length: 30 }, (_, i) => addDias(referencia, i + 1)), [referencia]);

  const [abaAtiva, setAbaAtiva] = useState<Aba>('nova');
  const [enquetes, setEnquetes] = useState<Enquete[]>(() => gerarEnquetesMock(referencia));

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [novaOpcaoTexto, setNovaOpcaoTexto] = useState('');
  const [dataFimSelecionada, setDataFimSelecionada] = useState<Date | null>(null);
  const [anonima, setAnonima] = useState(true);

  const enquetesOrdenadas = useMemo(
    () => [...enquetes].sort((a, b) => new Date(b.dataFimISO).getTime() - new Date(a.dataFimISO).getTime()),
    [enquetes]
  );

  function adicionarOpcao() {
    const texto = novaOpcaoTexto.trim();
    if (texto.length === 0) return;
    setOpcoes((atual) => [...atual, texto]);
    setNovaOpcaoTexto('');
  }

  function removerOpcao(indice: number) {
    setOpcoes((atual) => atual.filter((_, i) => i !== indice));
  }

  const podePublicar = titulo.trim().length > 0 && opcoes.length >= 2 && dataFimSelecionada !== null;

  function limparFormulario() {
    setTitulo('');
    setDescricao('');
    setOpcoes([]);
    setNovaOpcaoTexto('');
    setDataFimSelecionada(null);
    setAnonima(true);
  }

  function handlePublicar() {
    if (!podePublicar || !dataFimSelecionada) return;

    const novaEnquete: Enquete = {
      id: String(Date.now()),
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      dataFimISO: dataFimSelecionada.toISOString(),
      anonima,
      opcoes: opcoes.map((texto, indice) => ({ id: `nova-${Date.now()}-${indice}`, texto, votos: 0 })),
    };

    setEnquetes((atual) => [novaEnquete, ...atual]);
    limparFormulario();
    setAbaAtiva('gerenciar');
  }

  function handleEncerrarAgora(id: string) {
    setEnquetes((atual) => atual.map((e) => (e.id === id ? { ...e, encerradaManualmente: true } : e)));
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Enquetes</Text>
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'nova' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('nova')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'nova' && styles.abaTextoAtivo]}>Nova enquete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'gerenciar' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('gerenciar')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'gerenciar' && styles.abaTextoAtivo]}>Gerenciar</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'nova' ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.conteudoScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.campoLabel}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Reforma do playground"
              placeholderTextColor="#A8A199"
              value={titulo}
              onChangeText={setTitulo}
              maxLength={80}
            />

            <Text style={styles.campoLabel}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultilinha]}
              placeholder="Explique o contexto da votação..."
              placeholderTextColor="#A8A199"
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={3}
              maxLength={300}
              textAlignVertical="top"
            />

            <Text style={styles.campoLabel}>Opções de voto ({opcoes.length})</Text>
            {opcoes.map((opcao, indice) => (
              <View key={indice} style={styles.opcaoAdicionadaLinha}>
                <Text style={styles.opcaoAdicionadaTexto} numberOfLines={1}>
                  {indice + 1}. {opcao}
                </Text>
                <TouchableOpacity onPress={() => removerOpcao(indice)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.opcaoAdicionadaRemover}>×</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.novaOpcaoLinha}>
              <TextInput
                style={[styles.input, styles.novaOpcaoInput]}
                placeholder="Digite uma opção..."
                placeholderTextColor="#A8A199"
                value={novaOpcaoTexto}
                onChangeText={setNovaOpcaoTexto}
                onSubmitEditing={adicionarOpcao}
                maxLength={80}
              />
              <TouchableOpacity style={styles.botaoAdicionarOpcao} onPress={adicionarOpcao} activeOpacity={0.85}>
                <Text style={styles.botaoAdicionarOpcaoTexto}>Adicionar</Text>
              </TouchableOpacity>
            </View>
            {opcoes.length < 2 && (
              <Text style={styles.campoAjuda}>Adicione pelo menos 2 opções para publicar a enquete.</Text>
            )}

            <Text style={styles.campoLabel}>Encerra em</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaDatas}>
              {diasDisponiveis.map((data) => (
                <ItemData
                  key={formatarDataISO(data)}
                  data={data}
                  selecionada={dataFimSelecionada !== null && mesmoDia(data, dataFimSelecionada)}
                  onPress={() => setDataFimSelecionada(data)}
                />
              ))}
            </ScrollView>

            <Text style={styles.campoLabel}>Tipo de voto</Text>
            <View style={styles.segmentado}>
              <TouchableOpacity
                style={[styles.segmentoBotao, anonima && styles.segmentoBotaoAtivo]}
                onPress={() => setAnonima(true)}
              >
                <Text style={[styles.segmentoTexto, anonima && styles.segmentoTextoAtivo]}>Anônimo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentoBotao, !anonima && styles.segmentoBotaoAtivo]}
                onPress={() => setAnonima(false)}
              >
                <Text style={[styles.segmentoTexto, !anonima && styles.segmentoTextoAtivo]}>Identificado</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.botaoEnviar, !podePublicar && styles.botaoEnviarDesabilitado]}
              onPress={handlePublicar}
              disabled={!podePublicar}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Publicar enquete</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={enquetesOrdenadas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CartaoGerenciar enquete={item} agora={referencia} onEncerrarAgora={handleEncerrarAgora} />
          )}
          contentContainerStyle={
            enquetesOrdenadas.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
          }
          ListEmptyComponent={<EstadoVazio />}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  abas: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#F0ECE5',
    borderRadius: 12,
    padding: 4,
  },
  abaBotao: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  abaBotaoAtiva: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  abaTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8377',
  },
  abaTextoAtivo: {
    color: '#2B2823',
  },
  conteudoScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 18,
  },
  campoAjuda: {
    fontSize: 11,
    color: '#A8A199',
    marginTop: 6,
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
    minHeight: 70,
    paddingTop: 12,
  },
  opcaoAdicionadaLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F5F1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
  },
  opcaoAdicionadaTexto: {
    fontSize: 13,
    color: '#2B2823',
    flex: 1,
    marginRight: 10,
  },
  opcaoAdicionadaRemover: {
    fontSize: 18,
    color: '#C0392B',
    fontWeight: '700',
  },
  novaOpcaoLinha: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  novaOpcaoInput: {
    flex: 1,
  },
  botaoAdicionarOpcao: {
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  botaoAdicionarOpcaoTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B2823',
  },
  listaDatas: {
    paddingBottom: 4,
    paddingRight: 4,
  },
  itemData: {
    width: 52,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F7F5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  itemDataSelecionada: {
    backgroundColor: '#2B2823',
  },
  itemDataDiaSemana: {
    fontSize: 11,
    color: '#8A8377',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  itemDataNumero: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2823',
  },
  itemDataTextoSelecionado: {
    color: '#FFFFFF',
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
    marginTop: 26,
  },
  botaoEnviarDesabilitado: {
    backgroundColor: '#D8D3C8',
  },
  botaoEnviarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  listaConteudo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 40,
  },
  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cartaoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cartaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2823',
    flex: 1,
    marginRight: 8,
  },
  cartaoMeta: {
    fontSize: 11,
    color: '#A8A199',
    marginBottom: 14,
  },
  cartaoResultados: {
    marginBottom: 4,
  },
  barraLinha: {
    marginBottom: 12,
  },
  barraCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barraTexto: {
    fontSize: 13,
    color: '#2B2823',
    flex: 1,
    marginRight: 8,
  },
  barraPercentual: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B6459',
  },
  barraFundo: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EDE9E1',
    overflow: 'hidden',
  },
  barraPreenchida: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3D6FB4',
  },
  totalVotos: {
    fontSize: 11,
    color: '#A8A199',
    marginTop: 2,
  },
  botaoEncerrar: {
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  botaoEncerrarTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C0392B',
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
});