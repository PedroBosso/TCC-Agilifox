// Tela do morador com as contas lançadas pelo síndico. O app não movimenta dinheiro:
// o morador paga pelo meio combinado com o síndico e confirma o pagamento aqui.

import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TituloComVoltar } from '../components/BotaoVoltar';
import { supabase } from '../lib/supabase';

// ---------- Tipos ----------

type StatusBaseFatura = 'pendente' | 'pago';
type StatusExibicaoFatura = 'pendente' | 'vencido' | 'pago';
type Aba = 'aberto' | 'pagas';

interface Fatura {
  id: string;
  referencia: string;
  descricao: string;
  valor: number;
  vencimentoISO: string;
  statusBase: StatusBaseFatura;
  dataPagamentoISO: string | null;
}

// ---------- Configuração visual ----------

const CONFIG_STATUS: Record<StatusExibicaoFatura, { nome: string; cor: string; fundo: string }> = {
  pendente: { nome: 'Pendente', cor: '#B7791F', fundo: '#FBF1DE' },
  vencido: { nome: 'Vencida', cor: '#C0392B', fundo: '#FBEAE8' },
  pago: { nome: 'Paga', cor: '#2F855A', fundo: '#E7F4ED' },
};

// ---------- Helpers ----------

// Datas sem horário (AAAA-MM-DD) são lidas no fuso do celular, para não aparecerem um dia antes.
function dataLocal(dataISO: string): Date {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO);
  return partes ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : new Date(dataISO);
}

function inicioDoDia(data: Date): Date {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataExtensa(dataISO: string): string {
  return dataLocal(dataISO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatarDataHora(dataISO: string): string {
  const data = new Date(dataISO);
  return `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function calcularStatusExibicao(fatura: Fatura, hoje: Date): StatusExibicaoFatura {
  if (fatura.statusBase === 'pago') return 'pago';
  return dataLocal(fatura.vencimentoISO) < inicioDoDia(hoje) ? 'vencido' : 'pendente';
}

function calcularDiasParaVencimento(vencimentoISO: string, hoje: Date): number {
  const diffMs = dataLocal(vencimentoISO).getTime() - inicioDoDia(hoje).getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function textoPrazo(fatura: Fatura, hoje: Date): string {
  const dias = calcularDiasParaVencimento(fatura.vencimentoISO, hoje);
  if (dias === 0) return 'Vence hoje';
  if (dias > 0) return `Vence em ${dias} dia${dias > 1 ? 's' : ''}`;
  const diasAtraso = Math.abs(dias);
  return `Vencida há ${diasAtraso} dia${diasAtraso > 1 ? 's' : ''}`;
}

// ---------- Subcomponentes ----------

function Selo({ status }: { status: StatusExibicaoFatura }) {
  const config = CONFIG_STATUS[status];
  return (
    <View style={[styles.selo, { backgroundColor: config.fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: config.cor }]} />
      <Text style={[styles.seloTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

interface CartaoFaturaProps {
  fatura: Fatura;
  hoje: Date;
  onConfirmar: (fatura: Fatura) => void;
}

function CartaoFatura({ fatura, hoje, onConfirmar }: CartaoFaturaProps) {
  const status = calcularStatusExibicao(fatura, hoje);
  const pago = status === 'pago';

  return (
    <View style={[styles.cartao, status === 'vencido' && styles.cartaoVencido]}>
      <View style={styles.cartaoTopo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartaoDescricao} numberOfLines={2}>
            {fatura.descricao}
          </Text>
          <Text style={styles.cartaoReferencia}>{fatura.referencia}</Text>
        </View>
        <Selo status={status} />
      </View>

      <View style={styles.cartaoRodape}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartaoValor}>{formatarMoeda(fatura.valor)}</Text>
          <Text style={styles.cartaoData}>
            {pago
              ? fatura.dataPagamentoISO
                ? `Pagamento confirmado em ${formatarDataHora(fatura.dataPagamentoISO)}`
                : 'Pagamento confirmado'
              : textoPrazo(fatura, hoje)}
          </Text>
        </View>

        {!pago && (
          <TouchableOpacity style={styles.botaoConfirmar} onPress={() => onConfirmar(fatura)} activeOpacity={0.85}>
            <Text style={styles.botaoConfirmarTexto}>Já paguei</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function EstadoEmDia() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>✓</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Você está em dia!</Text>
      <Text style={styles.estadoVazioTexto}>Não há nenhuma conta em aberto no momento.</Text>
    </View>
  );
}

function EstadoVazioHistorico() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>+</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhum pagamento ainda</Text>
      <Text style={styles.estadoVazioTexto}>As contas que você confirmar como pagas vão aparecer aqui.</Text>
    </View>
  );
}

// ---------- Modal de confirmação ----------

interface ModalConfirmarPagamentoProps {
  fatura: Fatura | null;
  confirmando: boolean;
  onFechar: () => void;
  onConfirmar: (id: string) => void;
}

function ModalConfirmarPagamento({ fatura, confirmando, onFechar, onConfirmar }: ModalConfirmarPagamentoProps) {
  return (
    <Modal visible={!!fatura} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Confirmar pagamento</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Fechar</Text>
            </TouchableOpacity>
          </View>

          {fatura && (
            <>
              <View style={styles.resumoFatura}>
                <Text style={styles.resumoFaturaDescricao}>{fatura.descricao}</Text>
                <Text style={styles.resumoFaturaValor}>{formatarMoeda(fatura.valor)}</Text>
                <Text style={styles.resumoFaturaVencimento}>
                  Vencimento: {formatarDataExtensa(fatura.vencimentoISO)}
                </Text>
              </View>

              <Text style={styles.avisoConfirmacao}>
                O Agilifox não faz pagamentos. Pague esta conta da forma combinada com o síndico e, depois de
                pagar, confirme aqui. O síndico vê a sua confirmação com a data e a hora.
              </Text>

              <TouchableOpacity
                style={[styles.botaoEnviar, confirmando && styles.botaoEnviarDesabilitado]}
                onPress={() => onConfirmar(fatura.id)}
                disabled={confirmando}
                activeOpacity={0.85}
              >
                {confirmando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.botaoEnviarTexto}>Confirmo que paguei esta conta</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaPagamentosMorador() {
  const hoje = useMemo(() => new Date(), []);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<Aba>('aberto');
  const [faturaSelecionada, setFaturaSelecionada] = useState<Fatura | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    carregarFaturas();
  }, []);

  async function carregarFaturas() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCarregando(false);
      Alert.alert('Erro', 'Não foi possível identificar o usuário logado.');
      return;
    }

    const { data, error } = await supabase
      .from('faturas')
      .select('id, referencia, descricao, valor, vencimento, status, data_pagamento')
      .eq('morador_id', user.id);

    setCarregando(false);

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar suas contas.');
      return;
    }

    setFaturas(
      (data ?? []).map((f) => ({
        id: f.id,
        referencia: f.referencia,
        descricao: f.descricao ?? 'Conta do condomínio',
        valor: Number(f.valor),
        vencimentoISO: f.vencimento,
        statusBase: f.status,
        dataPagamentoISO: f.data_pagamento,
      }))
    );
  }

  const faturasEmAberto = useMemo(
    () =>
      faturas
        .filter((f) => calcularStatusExibicao(f, hoje) !== 'pago')
        .sort((a, b) => a.vencimentoISO.localeCompare(b.vencimentoISO)),
    [faturas, hoje]
  );

  const faturasPagas = useMemo(
    () =>
      faturas
        .filter((f) => calcularStatusExibicao(f, hoje) === 'pago')
        .sort((a, b) => (b.dataPagamentoISO ?? b.vencimentoISO).localeCompare(a.dataPagamentoISO ?? a.vencimentoISO)),
    [faturas, hoje]
  );

  const totalEmAberto = faturasEmAberto.reduce((soma, f) => soma + f.valor, 0);
  const faturaDestaque = faturasEmAberto[0] ?? null;

  async function handleConfirmarPagamento(id: string) {
    setConfirmando(true);

    // A data enviada é provisória: o banco grava o horário do servidor no lugar dela.
    const { data, error } = await supabase
      .from('faturas')
      .update({ status: 'pago', data_pagamento: new Date().toISOString() })
      .eq('id', id)
      .select('id');

    setConfirmando(false);

    if (error || !data || data.length === 0) {
      Alert.alert('Erro', 'Não foi possível confirmar o pagamento. Tente de novo.');
      return;
    }

    setFaturaSelecionada(null);
    carregarFaturas();
    Alert.alert('Pagamento confirmado', 'O síndico já pode ver a sua confirmação.');
  }

  if (carregando) {
    return (
      <SafeAreaView edges={['top']} style={[styles.tela, styles.centro]}>
        <ActivityIndicator size="large" color="#2B2823" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <TituloComVoltar>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Pagamentos</Text>
        </TituloComVoltar>
      </View>

      {faturaDestaque && (
        <View style={styles.cartaoDestaque}>
          <View style={styles.cartaoDestaqueTopo}>
            <Text style={styles.cartaoDestaqueLabel}>Próxima conta</Text>
            <Selo status={calcularStatusExibicao(faturaDestaque, hoje)} />
          </View>
          <Text style={styles.cartaoDestaqueDescricao}>{faturaDestaque.descricao}</Text>
          <Text style={styles.cartaoDestaqueValor}>{formatarMoeda(faturaDestaque.valor)}</Text>
          <Text style={styles.cartaoDestaquePrazo}>{textoPrazo(faturaDestaque, hoje)}</Text>

          <TouchableOpacity
            style={styles.botaoDestaque}
            onPress={() => setFaturaSelecionada(faturaDestaque)}
            activeOpacity={0.85}
          >
            <Text style={styles.botaoDestaqueTexto}>Confirmar pagamento</Text>
          </TouchableOpacity>

          {faturasEmAberto.length > 1 && (
            <Text style={styles.cartaoDestaqueTotal}>
              Total em aberto: {formatarMoeda(totalEmAberto)} ({faturasEmAberto.length} contas)
            </Text>
          )}
        </View>
      )}

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'aberto' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('aberto')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'aberto' && styles.abaTextoAtivo]}>Em aberto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'pagas' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('pagas')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'pagas' && styles.abaTextoAtivo]}>Histórico</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'aberto' ? (
        <FlatList
          data={faturasEmAberto}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CartaoFatura fatura={item} hoje={hoje} onConfirmar={setFaturaSelecionada} />
          )}
          contentContainerStyle={
            faturasEmAberto.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
          }
          ListEmptyComponent={<EstadoEmDia />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={faturasPagas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CartaoFatura fatura={item} hoje={hoje} onConfirmar={setFaturaSelecionada} />
          )}
          contentContainerStyle={
            faturasPagas.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
          }
          ListEmptyComponent={<EstadoVazioHistorico />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ModalConfirmarPagamento
        fatura={faturaSelecionada}
        confirmando={confirmando}
        onFechar={() => setFaturaSelecionada(null)}
        onConfirmar={handleConfirmarPagamento}
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
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
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
  cartaoDestaque: {
    backgroundColor: '#2B2823',
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 18,
  },
  cartaoDestaqueTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartaoDestaqueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D8D3C8',
  },
  cartaoDestaqueDescricao: {
    fontSize: 14,
    color: '#D8D3C8',
    marginBottom: 4,
  },
  cartaoDestaqueValor: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cartaoDestaquePrazo: {
    fontSize: 13,
    color: '#D8D3C8',
    marginBottom: 16,
  },
  cartaoDestaqueTotal: {
    fontSize: 11,
    color: '#A8A199',
    textAlign: 'center',
    marginTop: 12,
  },
  botaoDestaque: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoDestaqueTexto: {
    color: '#2B2823',
    fontWeight: '700',
    fontSize: 15,
  },
  abas: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 18,
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
    paddingBottom: 40,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingTop: 16,
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
  cartaoVencido: {
    borderLeftWidth: 4,
    borderLeftColor: '#C0392B',
  },
  cartaoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  cartaoDescricao: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 2,
  },
  cartaoReferencia: {
    fontSize: 12,
    color: '#8A8377',
  },
  cartaoRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cartaoValor: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 2,
  },
  cartaoData: {
    fontSize: 12,
    color: '#8A8377',
  },
  botaoConfirmar: {
    backgroundColor: '#2B2823',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoConfirmarTexto: {
    color: '#FFFFFF',
    fontSize: 13,
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
    fontWeight: '600',
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
    marginBottom: 16,
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
  resumoFatura: {
    backgroundColor: '#F7F5F1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resumoFaturaDescricao: {
    fontSize: 13,
    color: '#6B6459',
    marginBottom: 6,
  },
  resumoFaturaValor: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 6,
  },
  resumoFaturaVencimento: {
    fontSize: 12,
    color: '#8A8377',
  },
  avisoConfirmacao: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 19,
  },
  botaoEnviar: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  botaoEnviarDesabilitado: {
    opacity: 0.6,
  },
  botaoEnviarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
