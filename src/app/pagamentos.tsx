import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ---------- Tipos ----------

type StatusBaseFatura = 'pendente' | 'pago';
type StatusExibicaoFatura = 'pendente' | 'vencido' | 'pago';
type FormaPagamento = 'pix' | 'boleto';
type Aba = 'aberto' | 'pagas';

interface Fatura {
  id: string;
  referencia: string;
  descricao: string;
  valor: number;
  vencimentoISO: string;
  statusBase: StatusBaseFatura;
  dataPagamentoISO?: string;
  formaPagamento?: FormaPagamento;
  codigoPix: string;
  linhaDigitavel: string;
}

// ---------- Configuração visual ----------

const CONFIG_STATUS: Record<StatusExibicaoFatura, { nome: string; cor: string; fundo: string }> = {
  pendente: { nome: 'Pendente', cor: '#B7791F', fundo: '#FBF1DE' },
  vencido: { nome: 'Vencida', cor: '#C0392B', fundo: '#FBEAE8' },
  pago: { nome: 'Paga', cor: '#2F855A', fundo: '#E7F4ED' },
};

// ---------- Helpers ----------

function addDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 24 * 60 * 60 * 1000);
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarMesAno(data: Date): string {
  const texto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarDataCurta(dataISO: string): string {
  return new Date(dataISO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatarDataExtensa(dataISO: string): string {
  return new Date(dataISO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calcularStatusExibicao(fatura: Fatura, hoje: Date): StatusExibicaoFatura {
  if (fatura.statusBase === 'pago') return 'pago';
  const vencimento = new Date(fatura.vencimentoISO);
  return vencimento < hoje ? 'vencido' : 'pendente';
}

function calcularDiasParaVencimento(vencimentoISO: string, hoje: Date): number {
  const vencimento = new Date(vencimentoISO);
  const diffMs = vencimento.setHours(0, 0, 0, 0) - new Date(hoje).setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function textoPrazo(fatura: Fatura, hoje: Date): string {
  const dias = calcularDiasParaVencimento(fatura.vencimentoISO, hoje);
  if (dias === 0) return 'Vence hoje';
  if (dias > 0) return `Vence em ${dias} dia${dias > 1 ? 's' : ''}`;
  const diasAtraso = Math.abs(dias);
  return `Vencida há ${diasAtraso} dia${diasAtraso > 1 ? 's' : ''}`;
}

// ---------- Dados mockados ----------
// Gerados a partir de "hoje" para que a tela sempre mostre uma fatura vencida,
// uma pendente e um histórico coerente, independentemente de quando o app abrir.

function gerarFaturasMock(hoje: Date): Fatura[] {
  return [
    {
      id: 'f1',
      referencia: formatarMesAno(hoje),
      descricao: 'Taxa condominial mensal',
      valor: 620,
      vencimentoISO: addDias(hoje, 8).toISOString(),
      statusBase: 'pendente',
      codigoPix: '00020126580014br.gov.bcb.pix0136c4f1a2e0-jardimdasflores52040000530398654046.205802BR',
      linhaDigitavel: '34191.79001 01043.510047 91020.150008 6 87770000062000',
    },
    {
      id: 'f2',
      referencia: formatarMesAno(addDias(hoje, -35)),
      descricao: 'Taxa condominial mensal',
      valor: 600,
      vencimentoISO: addDias(hoje, -5).toISOString(),
      statusBase: 'pendente',
      codigoPix: '00020126580014br.gov.bcb.pix0136a9d8b3f1-jardimdasflores52040000530398654046.005802BR',
      linhaDigitavel: '34191.79001 01043.510047 91020.150008 6 87760000060000',
    },
    {
      id: 'f3',
      referencia: 'Multa',
      descricao: 'Multa - Barulho após 22h',
      valor: 150,
      vencimentoISO: addDias(hoje, 15).toISOString(),
      statusBase: 'pendente',
      codigoPix: '00020126580014br.gov.bcb.pix0136f2c4e5a7-jardimdasflores52040000530398654045802BR',
      linhaDigitavel: '34191.79001 01043.510047 91020.150008 6 87750000015000',
    },
    {
      id: 'f4',
      referencia: formatarMesAno(addDias(hoje, -65)),
      descricao: 'Taxa condominial mensal',
      valor: 600,
      vencimentoISO: addDias(hoje, -70).toISOString(),
      statusBase: 'pago',
      dataPagamentoISO: addDias(hoje, -71).toISOString(),
      formaPagamento: 'pix',
      codigoPix: '',
      linhaDigitavel: '',
    },
    {
      id: 'f5',
      referencia: formatarMesAno(addDias(hoje, -95)),
      descricao: 'Taxa condominial mensal',
      valor: 600,
      vencimentoISO: addDias(hoje, -100).toISOString(),
      statusBase: 'pago',
      dataPagamentoISO: addDias(hoje, -102).toISOString(),
      formaPagamento: 'boleto',
      codigoPix: '',
      linhaDigitavel: '',
    },
    {
      id: 'f6',
      referencia: 'Taxa de ambiente',
      descricao: 'Taxa de uso - Salão de Festas',
      valor: 150,
      vencimentoISO: addDias(hoje, -12).toISOString(),
      statusBase: 'pago',
      dataPagamentoISO: addDias(hoje, -12).toISOString(),
      formaPagamento: 'pix',
      codigoPix: '',
      linhaDigitavel: '',
    },
  ];
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
  onPagar: (fatura: Fatura) => void;
}

function CartaoFatura({ fatura, hoje, onPagar }: CartaoFaturaProps) {
  const status = calcularStatusExibicao(fatura, hoje);
  const pago = status === 'pago';

  return (
    <View style={[styles.cartao, status === 'vencido' && styles.cartaoVencido]}>
      <View style={styles.cartaoTopo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartaoDescricao} numberOfLines={1}>
            {fatura.descricao}
          </Text>
          <Text style={styles.cartaoReferencia}>{fatura.referencia}</Text>
        </View>
        <Selo status={status} />
      </View>

      <View style={styles.cartaoRodape}>
        <View>
          <Text style={styles.cartaoValor}>{formatarMoeda(fatura.valor)}</Text>
          <Text style={styles.cartaoData}>
            {pago
              ? `Paga em ${formatarDataCurta(fatura.dataPagamentoISO ?? fatura.vencimentoISO)} · ${
                  fatura.formaPagamento === 'pix' ? 'PIX' : 'Boleto'
                }`
              : textoPrazo(fatura, hoje)}
          </Text>
        </View>

        {!pago && (
          <TouchableOpacity style={styles.botaoPagar} onPress={() => onPagar(fatura)} activeOpacity={0.85}>
            <Text style={styles.botaoPagarTexto}>Pagar</Text>
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
      <Text style={styles.estadoVazioTexto}>Não há nenhuma fatura em aberto no momento.</Text>
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
      <Text style={styles.estadoVazioTexto}>Suas faturas pagas vão aparecer aqui.</Text>
    </View>
  );
}

// ---------- Modal de pagamento ----------

interface ModalPagamentoProps {
  fatura: Fatura | null;
  onFechar: () => void;
  onConfirmar: (id: string, forma: FormaPagamento) => void;
}

function ModalPagamento({ fatura, onFechar, onConfirmar }: ModalPagamentoProps) {
  const [metodo, setMetodo] = useState<FormaPagamento>('pix');

  function handleFechar() {
    setMetodo('pix');
    onFechar();
  }

  function handleConfirmar() {
    if (!fatura) return;
    onConfirmar(fatura.id, metodo);
    setMetodo('pix');
  }

  return (
    <Modal visible={!!fatura} animationType="slide" transparent onRequestClose={handleFechar}>
      <View style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Pagar fatura</Text>
            <TouchableOpacity onPress={handleFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Fechar</Text>
            </TouchableOpacity>
          </View>

          {fatura && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.resumoFatura}>
                <Text style={styles.resumoFaturaDescricao}>{fatura.descricao}</Text>
                <Text style={styles.resumoFaturaValor}>{formatarMoeda(fatura.valor)}</Text>
                <Text style={styles.resumoFaturaVencimento}>
                  Vencimento: {formatarDataExtensa(fatura.vencimentoISO)}
                </Text>
              </View>

              <View style={styles.segmentado}>
                <TouchableOpacity
                  style={[styles.segmentoBotao, metodo === 'pix' && styles.segmentoBotaoAtivo]}
                  onPress={() => setMetodo('pix')}
                >
                  <Text style={[styles.segmentoTexto, metodo === 'pix' && styles.segmentoTextoAtivo]}>
                    PIX
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentoBotao, metodo === 'boleto' && styles.segmentoBotaoAtivo]}
                  onPress={() => setMetodo('boleto')}
                >
                  <Text style={[styles.segmentoTexto, metodo === 'boleto' && styles.segmentoTextoAtivo]}>
                    Boleto
                  </Text>
                </TouchableOpacity>
              </View>

              {metodo === 'pix' ? (
                <View>
                  <View style={styles.qrPlaceholder}>
                    <Text style={styles.qrPlaceholderTexto}>QR Code PIX</Text>
                    <Text style={styles.qrPlaceholderSubtexto}>(gerado no pagamento real)</Text>
                  </View>

                  <Text style={styles.campoLabel}>PIX Copia e Cola</Text>
                  <View style={styles.codigoBox}>
                    <Text style={styles.codigoTexto} numberOfLines={2}>
                      {fatura.codigoPix}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.botaoSecundario} activeOpacity={0.8}>
                    <Text style={styles.botaoSecundarioTexto}>Copiar código</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.campoLabel}>Linha digitável</Text>
                  <View style={styles.codigoBox}>
                    <Text style={styles.codigoTexto}>{fatura.linhaDigitavel}</Text>
                  </View>
                  <TouchableOpacity style={styles.botaoSecundario} activeOpacity={0.8}>
                    <Text style={styles.botaoSecundarioTexto}>Copiar código</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.botaoSecundario} activeOpacity={0.8}>
                    <Text style={styles.botaoSecundarioTexto}>Baixar boleto em PDF</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.botaoEnviar} onPress={handleConfirmar} activeOpacity={0.85}>
                <Text style={styles.botaoEnviarTexto}>Já efetuei o pagamento</Text>
              </TouchableOpacity>

              <Text style={styles.avisoConfirmacao}>
                Em produção, a confirmação seria automática assim que o banco processasse o pagamento.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaPagamentosMorador() {
  const hoje = useMemo(() => new Date(), []);
  const [faturas, setFaturas] = useState<Fatura[]>(() => gerarFaturasMock(hoje));
  const [abaAtiva, setAbaAtiva] = useState<Aba>('aberto');
  const [faturaSelecionada, setFaturaSelecionada] = useState<Fatura | null>(null);

  const faturasEmAberto = useMemo(
    () =>
      faturas
        .filter((f) => calcularStatusExibicao(f, hoje) !== 'pago')
        .sort((a, b) => new Date(a.vencimentoISO).getTime() - new Date(b.vencimentoISO).getTime()),
    [faturas, hoje]
  );

  const faturasPagas = useMemo(
    () =>
      faturas
        .filter((f) => calcularStatusExibicao(f, hoje) === 'pago')
        .sort(
          (a, b) =>
            new Date(b.dataPagamentoISO ?? b.vencimentoISO).getTime() -
            new Date(a.dataPagamentoISO ?? a.vencimentoISO).getTime()
        ),
    [faturas, hoje]
  );

  const totalEmAberto = faturasEmAberto.reduce((soma, f) => soma + f.valor, 0);
  const faturaDestaque = faturasEmAberto[0] ?? null;

  function handleConfirmarPagamento(id: string, forma: FormaPagamento) {
    setFaturas((atual) =>
      atual.map((f) =>
        f.id === id
          ? { ...f, statusBase: 'pago', dataPagamentoISO: new Date().toISOString(), formaPagamento: forma }
          : f
      )
    );
    setFaturaSelecionada(null);
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Pagamentos</Text>
        </View>
      </View>

      {faturaDestaque && (
        <View style={styles.cartaoDestaque}>
          <View style={styles.cartaoDestaqueTopo}>
            <Text style={styles.cartaoDestaqueLabel}>Próximo pagamento</Text>
            <Selo status={calcularStatusExibicao(faturaDestaque, hoje)} />
          </View>
          <Text style={styles.cartaoDestaqueDescricao}>{faturaDestaque.descricao}</Text>
          <Text style={styles.cartaoDestaqueValor}>{formatarMoeda(faturaDestaque.valor)}</Text>
          <Text style={styles.cartaoDestaquePrazo}>{textoPrazo(faturaDestaque, hoje)}</Text>

          <TouchableOpacity
            style={styles.botaoEnviar}
            onPress={() => setFaturaSelecionada(faturaDestaque)}
            activeOpacity={0.85}
          >
            <Text style={styles.botaoEnviarTexto}>Pagar agora</Text>
          </TouchableOpacity>

          {faturasEmAberto.length > 1 && (
            <Text style={styles.cartaoDestaqueTotal}>
              Total em aberto: {formatarMoeda(totalEmAberto)} ({faturasEmAberto.length} faturas)
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
            <CartaoFatura fatura={item} hoje={hoje} onPagar={setFaturaSelecionada} />
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
            <CartaoFatura fatura={item} hoje={hoje} onPagar={setFaturaSelecionada} />
          )}
          contentContainerStyle={
            faturasPagas.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
          }
          ListEmptyComponent={<EstadoVazioHistorico />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ModalPagamento
        fatura={faturaSelecionada}
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
  botaoPagar: {
    backgroundColor: '#2B2823',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  botaoPagarTexto: {
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
    marginBottom: 18,
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
  segmentado: {
    flexDirection: 'row',
    backgroundColor: '#F0ECE5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
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
  qrPlaceholder: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E0D8',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#F7F5F1',
  },
  qrPlaceholderTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
  },
  qrPlaceholderSubtexto: {
    fontSize: 10,
    color: '#A8A199',
    marginTop: 4,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
  },
  codigoBox: {
    backgroundColor: '#F7F5F1',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE9E1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  codigoTexto: {
    fontSize: 12,
    color: '#6B6459',
  },
  botaoSecundario: {
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  botaoSecundarioTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
  },
  botaoEnviar: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  botaoEnviarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  avisoConfirmacao: {
    fontSize: 11,
    color: '#A8A199',
    textAlign: 'center',
    marginTop: 12,
  },
});