/**
 * TelaEncomendasMorador.tsx
 *
 * Tela de Encomendas para o morador. Ele acompanha os pacotes que chegaram
 * na portaria (ou que ainda estão a caminho) e, quando a transportadora
 * fornece um código de confirmação de entrega, pode inserir esse código no
 * app — ele fica marcado como "visível para a portaria", para que o
 * porteiro confirme com o entregador antes de liberar o pacote (mesma ideia
 * de código de retirada usada por alguns apps de entrega, como proteção
 * contra fraude/extravio).
 *
 * Front-end apenas — os dados abaixo são mockados (gerarEncomendasMock).
 *
 * Para integrar com back-end depois, basta substituir:
 *   1. O estado inicial de `encomendas` por uma chamada à API (useEffect + fetch/axios)
 *   2. `handleSalvarCodigo` e `handleRegistrarEncomenda` por chamadas
 *      POST/PATCH para o seu endpoint — é esse PATCH que faria o código
 *      aparecer para o porteiro na tela dele
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

// ---------- Tipos ----------

type StatusEncomenda = 'aguardando' | 'na_portaria' | 'retirada';
type Aba = 'aberto' | 'retiradas';

interface Encomenda {
  id: string;
  remetente: string;
  previsao?: string;
  status: StatusEncomenda;
  dataChegadaISO?: string;
  dataRetiradaISO?: string;
  codigoEntrega?: string;
}

// ---------- Configuração visual ----------

const CONFIG_STATUS: Record<StatusEncomenda, { nome: string; cor: string; fundo: string }> = {
  aguardando: { nome: 'A caminho', cor: '#3D6FB4', fundo: '#EAF1FB' },
  na_portaria: { nome: 'Na portaria', cor: '#B7791F', fundo: '#FBF1DE' },
  retirada: { nome: 'Retirada', cor: '#2F855A', fundo: '#E7F4ED' },
};

// ---------- Helpers ----------

function addDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 24 * 60 * 60 * 1000);
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

function gerarEncomendasMock(hoje: Date): Encomenda[] {
  return [
    {
      id: 'e1',
      remetente: 'Mercado Livre',
      status: 'na_portaria',
      dataChegadaISO: hoje.toISOString(),
    },
    {
      id: 'e2',
      remetente: 'Amazon',
      status: 'na_portaria',
      dataChegadaISO: addDias(hoje, -1).toISOString(),
      codigoEntrega: 'K7X92P',
    },
    {
      id: 'e3',
      remetente: 'Correios - Carta registrada',
      previsao: 'Até sexta-feira',
      status: 'aguardando',
    },
    {
      id: 'e4',
      remetente: 'Shopee',
      status: 'retirada',
      dataChegadaISO: addDias(hoje, -4).toISOString(),
      dataRetiradaISO: addDias(hoje, -3).toISOString(),
    },
  ];
}

// ---------- Subcomponentes ----------

function Selo({ status }: { status: StatusEncomenda }) {
  const config = CONFIG_STATUS[status];
  return (
    <View style={[styles.selo, { backgroundColor: config.fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: config.cor }]} />
      <Text style={[styles.seloTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

interface CartaoEncomendaProps {
  encomenda: Encomenda;
  onInserirCodigo: () => void;
}

function CartaoEncomenda({ encomenda, onInserirCodigo }: CartaoEncomendaProps) {
  const config = CONFIG_STATUS[encomenda.status];

  const linhaInfo =
    encomenda.status === 'aguardando'
      ? `Previsão: ${encomenda.previsao ?? 'não informada'}`
      : encomenda.status === 'na_portaria'
      ? `Chegou ${formatarDataRelativa(encomenda.dataChegadaISO!)}`
      : `Retirada ${formatarDataRelativa(encomenda.dataRetiradaISO!)}`;

  return (
    <View style={[styles.cartao, { borderLeftColor: config.cor }]}>
      <View style={styles.cartaoTopo}>
        <View style={[styles.iconePacote, { backgroundColor: config.cor }]}>
          <Text style={styles.iconePacoteTexto}>P</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartaoRemetente} numberOfLines={1}>
            {encomenda.remetente}
          </Text>
          <Text style={styles.cartaoInfo}>{linhaInfo}</Text>
        </View>
        <Selo status={encomenda.status} />
      </View>

      {encomenda.status !== 'retirada' && (
        <View style={styles.codigoArea}>
          {encomenda.codigoEntrega ? (
            <>
              <View style={styles.codigoBox}>
                <View>
                  <Text style={styles.codigoLabel}>Código de entrega</Text>
                  <Text style={styles.codigoValor}>{encomenda.codigoEntrega}</Text>
                </View>
                <View style={styles.codigoSeloVisivel}>
                  <Text style={styles.codigoSeloVisivelTexto}>Visível para a portaria</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onInserirCodigo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.linkEditarCodigo}>Editar código</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.botaoInserirCodigo} onPress={onInserirCodigo} activeOpacity={0.85}>
              <Text style={styles.botaoInserirCodigoTexto}>Inserir código de entrega</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
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

// ---------- Modal: inserir/editar código ----------

interface ModalCodigoProps {
  encomenda: Encomenda | null;
  onFechar: () => void;
  onSalvar: (id: string, codigo: string) => void;
  onRemover: (id: string) => void;
}

function ModalCodigo({ encomenda, onFechar, onSalvar, onRemover }: ModalCodigoProps) {
  const [codigo, setCodigo] = useState('');

  React.useEffect(() => {
    setCodigo(encomenda?.codigoEntrega ?? '');
  }, [encomenda]);

  function handleSalvar() {
    if (!encomenda || codigo.trim().length === 0) return;
    onSalvar(encomenda.id, codigo.trim().toUpperCase());
  }

  return (
    <Modal visible={!!encomenda} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Código de entrega</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Fechar</Text>
            </TouchableOpacity>
          </View>

          {encomenda && (
            <>
              <Text style={styles.modalSubtitulo}>{encomenda.remetente}</Text>

              <Text style={styles.textoExplicativo}>
                Se a transportadora enviou um código de confirmação, insira aqui. Ele ficará visível para a
                portaria confirmar com o entregador antes de liberar o pacote.
              </Text>

              <Text style={styles.campoLabel}>Código</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: K7X92P"
                placeholderTextColor="#A8A199"
                value={codigo}
                onChangeText={setCodigo}
                autoCapitalize="characters"
                maxLength={20}
              />

              <TouchableOpacity
                style={[styles.botaoEnviar, codigo.trim().length === 0 && styles.botaoEnviarDesabilitado]}
                onPress={handleSalvar}
                disabled={codigo.trim().length === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.botaoEnviarTexto}>Salvar código</Text>
              </TouchableOpacity>

              {encomenda.codigoEntrega && (
                <TouchableOpacity
                  style={styles.botaoTexto}
                  onPress={() => onRemover(encomenda.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.botaoTextoRemover}>Remover código</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Modal: nova encomenda esperada ----------

interface NovaEncomendaPayload {
  remetente: string;
  previsao: string;
  codigoEntrega?: string;
}

interface ModalNovaEncomendaProps {
  visivel: boolean;
  onFechar: () => void;
  onRegistrar: (payload: NovaEncomendaPayload) => void;
}

function ModalNovaEncomenda({ visivel, onFechar, onRegistrar }: ModalNovaEncomendaProps) {
  const [remetente, setRemetente] = useState('');
  const [previsao, setPrevisao] = useState('');
  const [codigo, setCodigo] = useState('');

  const podeRegistrar = remetente.trim().length > 0;

  function limparEFechar() {
    setRemetente('');
    setPrevisao('');
    setCodigo('');
    onFechar();
  }

  function handleRegistrar() {
    if (!podeRegistrar) return;
    onRegistrar({
      remetente: remetente.trim(),
      previsao: previsao.trim() || 'Não informada',
      codigoEntrega: codigo.trim() ? codigo.trim().toUpperCase() : undefined,
    });
    limparEFechar();
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={limparEFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Encomenda a caminho</Text>
            <TouchableOpacity onPress={limparEFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.campoLabel}>Loja / remetente</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Mercado Livre, Amazon, Correios..."
              placeholderTextColor="#A8A199"
              value={remetente}
              onChangeText={setRemetente}
              maxLength={50}
            />

            <Text style={styles.campoLabel}>Previsão de chegada (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Hoje à tarde, até sexta-feira..."
              placeholderTextColor="#A8A199"
              value={previsao}
              onChangeText={setPrevisao}
              maxLength={40}
            />

            <Text style={styles.campoLabel}>Código de entrega (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Se já tiver o código, insira aqui"
              placeholderTextColor="#A8A199"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
              maxLength={20}
            />

            <TouchableOpacity
              style={[styles.botaoEnviar, !podeRegistrar && styles.botaoEnviarDesabilitado]}
              onPress={handleRegistrar}
              disabled={!podeRegistrar}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Salvar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaEncomendasMorador() {
  const hoje = useMemo(() => new Date(), []);
  const [encomendas, setEncomendas] = useState<Encomenda[]>(() => gerarEncomendasMock(hoje));
  const [abaAtiva, setAbaAtiva] = useState<Aba>('aberto');
  const [encomendaCodigo, setEncomendaCodigo] = useState<Encomenda | null>(null);
  const [modalNovaVisivel, setModalNovaVisivel] = useState(false);

  const encomendasAbertas = useMemo(
    () => encomendas.filter((e) => e.status !== 'retirada'),
    [encomendas]
  );
  const encomendasRetiradas = useMemo(
    () =>
      [...encomendas]
        .filter((e) => e.status === 'retirada')
        .sort((a, b) => new Date(b.dataRetiradaISO!).getTime() - new Date(a.dataRetiradaISO!).getTime()),
    [encomendas]
  );

  const totalNaPortaria = encomendas.filter((e) => e.status === 'na_portaria').length;

  function handleSalvarCodigo(id: string, codigo: string) {
    setEncomendas((atual) => atual.map((e) => (e.id === id ? { ...e, codigoEntrega: codigo } : e)));
    setEncomendaCodigo(null);
  }

  function handleRemoverCodigo(id: string) {
    setEncomendas((atual) => atual.map((e) => (e.id === id ? { ...e, codigoEntrega: undefined } : e)));
    setEncomendaCodigo(null);
  }

  function handleRegistrarEncomenda(payload: NovaEncomendaPayload) {
    const novaEncomenda: Encomenda = {
      id: String(Date.now()),
      remetente: payload.remetente,
      previsao: payload.previsao,
      status: 'aguardando',
      codigoEntrega: payload.codigoEntrega,
    };
    setEncomendas((atual) => [novaEncomenda, ...atual]);
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Minhas Encomendas</Text>
        </View>
        {totalNaPortaria > 0 && (
          <View style={styles.contador}>
            <Text style={styles.contadorTexto}>
              {totalNaPortaria} na portaria
            </Text>
          </View>
        )}
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'aberto' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('aberto')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'aberto' && styles.abaTextoAtivo]}>Em aberto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'retiradas' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('retiradas')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'retiradas' && styles.abaTextoAtivo]}>Retiradas</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'aberto' ? (
        <FlatList
          data={encomendasAbertas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CartaoEncomenda encomenda={item} onInserirCodigo={() => setEncomendaCodigo(item)} />
          )}
          contentContainerStyle={
            encomendasAbertas.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
          }
          ListEmptyComponent={
            <EstadoVazio titulo="Nenhuma encomenda em aberto" texto="Suas encomendas a caminho ou na portaria vão aparecer aqui." />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={encomendasRetiradas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CartaoEncomenda encomenda={item} onInserirCodigo={() => setEncomendaCodigo(item)} />
          )}
          contentContainerStyle={
            encomendasRetiradas.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
          }
          ListEmptyComponent={
            <EstadoVazio titulo="Nenhuma retirada ainda" texto="O histórico de encomendas já retiradas vai aparecer aqui." />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalNovaVisivel(true)} activeOpacity={0.85}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      <ModalCodigo
        encomenda={encomendaCodigo}
        onFechar={() => setEncomendaCodigo(null)}
        onSalvar={handleSalvarCodigo}
        onRemover={handleRemoverCodigo}
      />

      <ModalNovaEncomenda
        visivel={modalNovaVisivel}
        onFechar={() => setModalNovaVisivel(false)}
        onRegistrar={handleRegistrarEncomenda}
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
  contador: {
    backgroundColor: '#FBF1DE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  contadorTexto: {
    color: '#B7791F',
    fontSize: 12,
    fontWeight: '600',
  },
  abas: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 4,
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
  cartao: {
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
  cartaoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconePacote: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconePacoteTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cartaoRemetente: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2823',
  },
  cartaoInfo: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 2,
  },
  codigoArea: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
  },
  codigoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F5F1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  codigoLabel: {
    fontSize: 10,
    color: '#8A8377',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  codigoValor: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2823',
    letterSpacing: 1,
  },
  codigoSeloVisivel: {
    backgroundColor: '#E7F4ED',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  codigoSeloVisivelTexto: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2F855A',
  },
  linkEditarCodigo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D6FB4',
  },
  botaoInserirCodigo: {
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  botaoInserirCodigoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 10,
  },
  textoExplicativo: {
    fontSize: 12,
    color: '#8A8377',
    lineHeight: 17,
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
  botaoTexto: {
    alignItems: 'center',
    marginTop: 14,
  },
  botaoTextoRemover: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C0392B',
  },
});