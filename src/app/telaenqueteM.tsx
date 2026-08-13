import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ---------- Tipos ----------

type StatusEnquete = 'ativa' | 'encerrada';
type Aba = 'ativas' | 'encerradas';

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
  jaVotei: boolean;
  minhaOpcaoId?: string;
}

// ---------- Helpers ----------

function addDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 24 * 60 * 60 * 1000);
}

function calcularStatus(enquete: Enquete, agora: Date): StatusEnquete {
  if (enquete.encerradaManualmente) return 'encerrada';
  return new Date(enquete.dataFimISO) < agora ? 'encerrada' : 'ativa';
}

function formatarPrazo(enquete: Enquete, agora: Date): string {
  if (calcularStatus(enquete, agora) === 'encerrada') return 'Votação encerrada';
  const diffMs = new Date(enquete.dataFimISO).getTime() - agora.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias <= 1) return 'Encerra hoje';
  return `Encerra em ${diffDias} dias`;
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
      jaVotei: false,
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
      jaVotei: true,
      minhaOpcaoId: 'o4',
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
      jaVotei: true,
      minhaOpcaoId: 'o6',
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

function BarraResultado({ opcao, total, minhaEscolha }: { opcao: OpcaoEnquete; total: number; minhaEscolha: boolean }) {
  const pct = percentual(opcao, total);
  return (
    <View style={styles.barraLinha}>
      <View style={styles.barraCabecalho}>
        <View style={styles.barraTextoLinha}>
          {minhaEscolha && <Text style={styles.barraCheck}>✓ </Text>}
          <Text style={[styles.barraTexto, minhaEscolha && styles.barraTextoEscolhido]}>{opcao.texto}</Text>
        </View>
        <Text style={styles.barraPercentual}>{Math.round(pct * 100)}%</Text>
      </View>
      <View style={styles.barraFundo}>
        <View
          style={[
            styles.barraPreenchida,
            { width: `${Math.max(pct * 100, 2)}%`, backgroundColor: minhaEscolha ? '#2F855A' : '#B7C4D9' },
          ]}
        />
      </View>
    </View>
  );
}

interface OpcaoVotavelProps {
  opcao: OpcaoEnquete;
  onSelecionar: () => void;
}

function OpcaoVotavel({ opcao, onSelecionar }: OpcaoVotavelProps) {
  return (
    <TouchableOpacity style={styles.opcaoVotavel} onPress={onSelecionar} activeOpacity={0.8}>
      <View style={styles.opcaoVotavelBolinha} />
      <Text style={styles.opcaoVotavelTexto}>{opcao.texto}</Text>
    </TouchableOpacity>
  );
}

interface CartaoEnqueteProps {
  enquete: Enquete;
  agora: Date;
  onEscolherOpcao: (enquete: Enquete, opcao: OpcaoEnquete) => void;
}

function CartaoEnquete({ enquete, agora, onEscolherOpcao }: CartaoEnqueteProps) {
  const status = calcularStatus(enquete, agora);
  const mostrarResultado = enquete.jaVotei || status === 'encerrada';
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

      <Text style={styles.cartaoDescricao}>{enquete.descricao}</Text>
      <Text style={styles.cartaoPrazo}>{formatarPrazo(enquete, agora)}</Text>

      <View style={styles.cartaoConteudo}>
        {mostrarResultado ? (
          <>
            {enquete.opcoes.map((opcao) => (
              <BarraResultado
                key={opcao.id}
                opcao={opcao}
                total={total}
                minhaEscolha={opcao.id === enquete.minhaOpcaoId}
              />
            ))}
            <Text style={styles.totalVotos}>{total} voto{total !== 1 ? 's' : ''} no total</Text>
            {enquete.jaVotei && <Text style={styles.avisoVotado}>Você já votou nesta enquete.</Text>}
          </>
        ) : (
          enquete.opcoes.map((opcao) => (
            <OpcaoVotavel key={opcao.id} opcao={opcao} onSelecionar={() => onEscolherOpcao(enquete, opcao)} />
          ))
        )}
      </View>
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

// ---------- Modal de confirmação de voto ----------

interface ModalConfirmarVotoProps {
  enquete: Enquete | null;
  opcao: OpcaoEnquete | null;
  onFechar: () => void;
  onConfirmar: () => void;
}

function ModalConfirmarVoto({ enquete, opcao, onFechar, onConfirmar }: ModalConfirmarVotoProps) {
  return (
    <Modal visible={!!opcao} animationType="fade" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundoCentro}>
        <View style={styles.dialogoCartao}>
          <Text style={styles.dialogoTitulo}>Confirmar voto</Text>
          <Text style={styles.dialogoTexto}>{enquete?.titulo}</Text>

          <View style={styles.dialogoOpcaoBox}>
            <Text style={styles.dialogoOpcaoTexto}>{opcao?.texto}</Text>
          </View>

          <Text style={styles.dialogoAviso}>
            {enquete?.anonima
              ? 'Seu voto é anônimo e não poderá ser alterado depois de confirmado.'
              : 'Seu voto ficará associado ao seu apartamento e não poderá ser alterado depois de confirmado.'}
          </Text>

          <View style={styles.dialogoAcoes}>
            <TouchableOpacity style={styles.dialogoBotaoVoltar} onPress={onFechar} activeOpacity={0.8}>
              <Text style={styles.dialogoBotaoVoltarTexto}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dialogoBotaoConfirmar} onPress={onConfirmar} activeOpacity={0.85}>
              <Text style={styles.dialogoBotaoConfirmarTexto}>Confirmar voto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaEnquetesMorador() {
  const agora = useMemo(() => new Date(), []);
  const [enquetes, setEnquetes] = useState<Enquete[]>(() => gerarEnquetesMock(agora));
  const [abaAtiva, setAbaAtiva] = useState<Aba>('ativas');
  const [votoPendente, setVotoPendente] = useState<{ enquete: Enquete; opcao: OpcaoEnquete } | null>(null);

  const enquetesAtivas = useMemo(
    () =>
      enquetes
        .filter((e) => calcularStatus(e, agora) === 'ativa')
        .sort((a, b) => new Date(a.dataFimISO).getTime() - new Date(b.dataFimISO).getTime()),
    [enquetes, agora]
  );

  const enquetesEncerradas = useMemo(
    () =>
      enquetes
        .filter((e) => calcularStatus(e, agora) === 'encerrada')
        .sort((a, b) => new Date(b.dataFimISO).getTime() - new Date(a.dataFimISO).getTime()),
    [enquetes, agora]
  );

  function handleConfirmarVoto() {
    if (!votoPendente) return;
    const { enquete, opcao } = votoPendente;

    setEnquetes((atual) =>
      atual.map((e) =>
        e.id === enquete.id
          ? {
              ...e,
              jaVotei: true,
              minhaOpcaoId: opcao.id,
              opcoes: e.opcoes.map((o) => (o.id === opcao.id ? { ...o, votos: o.votos + 1 } : o)),
            }
          : e
      )
    );
    setVotoPendente(null);
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
          style={[styles.abaBotao, abaAtiva === 'ativas' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('ativas')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'ativas' && styles.abaTextoAtivo]}>Ativas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'encerradas' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('encerradas')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'encerradas' && styles.abaTextoAtivo]}>Encerradas</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'ativas' ? (
        <FlatList
          data={enquetesAtivas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CartaoEnquete
              enquete={item}
              agora={agora}
              onEscolherOpcao={(enquete, opcao) => setVotoPendente({ enquete, opcao })}
            />
          )}
          contentContainerStyle={enquetesAtivas.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
          ListEmptyComponent={
            <EstadoVazio titulo="Nenhuma enquete ativa" texto="Quando o síndico publicar uma enquete, ela aparece aqui." />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={enquetesEncerradas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CartaoEnquete
              enquete={item}
              agora={agora}
              onEscolherOpcao={(enquete, opcao) => setVotoPendente({ enquete, opcao })}
            />
          )}
          contentContainerStyle={
            enquetesEncerradas.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo
          }
          ListEmptyComponent={<EstadoVazio titulo="Nenhuma enquete encerrada" texto="O histórico aparece aqui." />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ModalConfirmarVoto
        enquete={votoPendente?.enquete ?? null}
        opcao={votoPendente?.opcao ?? null}
        onFechar={() => setVotoPendente(null)}
        onConfirmar={handleConfirmarVoto}
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
  cartaoDescricao: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 18,
    marginBottom: 6,
  },
  cartaoPrazo: {
    fontSize: 11,
    color: '#A8A199',
    marginBottom: 14,
  },
  cartaoConteudo: {
    marginTop: 2,
  },
  opcaoVotavel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5F1',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE9E1',
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 9,
  },
  opcaoVotavelBolinha: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#B7C4D9',
    marginRight: 12,
  },
  opcaoVotavelTexto: {
    fontSize: 14,
    color: '#2B2823',
    fontWeight: '500',
    flex: 1,
  },
  barraLinha: {
    marginBottom: 14,
  },
  barraCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barraTextoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  barraCheck: {
    color: '#2F855A',
    fontWeight: '700',
    fontSize: 13,
  },
  barraTexto: {
    fontSize: 13,
    color: '#2B2823',
    flexShrink: 1,
  },
  barraTextoEscolhido: {
    fontWeight: '700',
    color: '#2F855A',
  },
  barraPercentual: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B2823',
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
  },
  totalVotos: {
    fontSize: 11,
    color: '#A8A199',
    marginTop: 2,
  },
  avisoVotado: {
    fontSize: 11,
    color: '#2F855A',
    fontWeight: '600',
    marginTop: 8,
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
  modalFundoCentro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43, 40, 35, 0.55)',
    padding: 24,
  },
  dialogoCartao: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  dialogoTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 4,
  },
  dialogoTexto: {
    fontSize: 13,
    color: '#8A8377',
    marginBottom: 14,
  },
  dialogoOpcaoBox: {
    backgroundColor: '#F7F5F1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  dialogoOpcaoTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2823',
  },
  dialogoAviso: {
    fontSize: 11,
    color: '#A8A199',
    lineHeight: 16,
    marginBottom: 6,
  },
  dialogoAcoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  dialogoBotaoVoltar: {
    flex: 1,
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dialogoBotaoVoltarTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
  },
  dialogoBotaoConfirmar: {
    flex: 1,
    backgroundColor: '#2B2823',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dialogoBotaoConfirmarTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});