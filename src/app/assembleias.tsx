// Tela de Assembleia Online para o morador — dados vêm do Supabase (assembleias, assembleia_pauta, assembleia_documentos).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Linking,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

// ---------- Tipos ----------

type TipoAssembleia = 'ordinaria' | 'extraordinaria';
type StatusAssembleia = 'agendada' | 'ao_vivo' | 'encerrada' | 'cancelada';
type Aba = 'atual' | 'historico';

interface DocumentoAssembleia {
  id: string;
  nome: string;
}

interface Assembleia {
  id: string;
  titulo: string;
  tipo: TipoAssembleia;
  dataISO: string; // horário de início
  duracaoMinutos: number;
  linkReuniao: string;
  pauta: string[];
  documentos: DocumentoAssembleia[];
  status: 'agendada' | 'cancelada'; // status base definido pela síndica
  encerradaManualmente?: boolean;
}

// ---------- Configuração visual ----------

const CONFIG_TIPO: Record<TipoAssembleia, { nome: string; cor: string }> = {
  ordinaria: { nome: 'Ordinária', cor: '#3D6FB4' },
  extraordinaria: { nome: 'Extraordinária', cor: '#7E57A6' },
};

const CONFIG_STATUS: Record<StatusAssembleia, { nome: string; cor: string; fundo: string }> = {
  agendada: { nome: 'Agendada', cor: '#B7791F', fundo: '#FBF1DE' },
  ao_vivo: { nome: 'Ao vivo agora', cor: '#C0392B', fundo: '#FBEAE8' },
  encerrada: { nome: 'Encerrada', cor: '#8A8377', fundo: '#F0ECE5' },
  cancelada: { nome: 'Cancelada', cor: '#8A8377', fundo: '#F0ECE5' },
};

// ---------- Helpers de data ----------

function addMinutos(data: Date, minutos: number): Date {
  return new Date(data.getTime() + minutos * 60000);
}

function formatarDataHoraExtensa(dataISO: string): string {
  const data = new Date(dataISO);
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dataFormatada} às ${horaFormatada}`;
}

function formatarDataCurta(dataISO: string): string {
  return new Date(dataISO).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatarTempoRestante(msRestante: number): string {
  if (msRestante <= 0) return 'a qualquer momento';
  const minutosTotais = Math.floor(msRestante / 60000);
  const dias = Math.floor(minutosTotais / (60 * 24));
  const horas = Math.floor((minutosTotais % (60 * 24)) / 60);
  const minutos = minutosTotais % 60;

  if (dias > 0) return `${dias} dia${dias > 1 ? 's' : ''}`;
  if (horas > 0) return `${horas}h ${minutos}min`;
  return `${minutos} min`;
}

function calcularStatusExibicao(assembleia: Assembleia, agora: Date): StatusAssembleia {
  if (assembleia.status === 'cancelada') return 'cancelada';
  if (assembleia.encerradaManualmente) return 'encerrada';

  const inicio = new Date(assembleia.dataISO);
  const fim = addMinutos(inicio, assembleia.duracaoMinutos);
  const liberaEntradaEm = addMinutos(inicio, -15);

  if (agora < liberaEntradaEm) return 'agendada';
  if (agora <= fim) return 'ao_vivo';
  return 'encerrada';
}

// ---------- Subcomponentes ----------

function SeloTipo({ tipo }: { tipo: TipoAssembleia }) {
  const config = CONFIG_TIPO[tipo];
  return (
    <View style={[styles.seloTipo, { backgroundColor: `${config.cor}1A` }]}>
      <Text style={[styles.seloTipoTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

function SeloStatus({ status, pulseAnim }: { status: StatusAssembleia; pulseAnim: Animated.Value }) {
  const config = CONFIG_STATUS[status];
  return (
    <View style={[styles.selo, { backgroundColor: config.fundo }]}>
      {status === 'ao_vivo' ? (
        <Animated.View style={[styles.seloPonto, { backgroundColor: config.cor, opacity: pulseAnim }]} />
      ) : (
        <View style={[styles.seloPonto, { backgroundColor: config.cor }]} />
      )}
      <Text style={[styles.seloTexto, { color: config.cor }]}>{config.nome}</Text>
    </View>
  );
}

function ItemDocumento({ documento }: { documento: DocumentoAssembleia }) {
  return (
    <View style={styles.itemDocumento}>
      <View style={styles.itemDocumentoIcone}>
        <Text style={styles.itemDocumentoIconeTexto}>PDF</Text>
      </View>
      <Text style={styles.itemDocumentoNome} numberOfLines={1}>
        {documento.nome}
      </Text>
      <Text style={styles.itemDocumentoAcao}>Baixar</Text>
    </View>
  );
}

function CartaoHistorico({ assembleia }: { assembleia: Assembleia }) {
  const ata = assembleia.documentos[0];
  return (
    <View style={styles.cartaoHistorico}>
      <View style={styles.cartaoHistoricoTopo}>
        <SeloTipo tipo={assembleia.tipo} />
        <Text style={styles.cartaoHistoricoData}>{formatarDataCurta(assembleia.dataISO)}</Text>
      </View>
      <Text style={styles.cartaoHistoricoTitulo}>{assembleia.titulo}</Text>
      {ata && (
        <View style={styles.cartaoHistoricoAta}>
          <Text style={styles.cartaoHistoricoAtaTexto}>Ver ata: {ata.nome}</Text>
        </View>
      )}
    </View>
  );
}

function EstadoVazioHistorico() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>+</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhuma assembleia encerrada</Text>
      <Text style={styles.estadoVazioTexto}>O histórico aparece aqui depois da primeira reunião.</Text>
    </View>
  );
}

function EstadoVazioAtual() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>+</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhuma assembleia agendada</Text>
      <Text style={styles.estadoVazioTexto}>Quando a síndica publicar uma nova assembleia, ela aparece aqui.</Text>
    </View>
  );
}

// ---------- Tela principal ----------

export default function TelaAssembleiaMorador() {
  const [carregando, setCarregando] = useState(true);
  const [assembleias, setAssembleias] = useState<Assembleia[]>([]);
  const [agora, setAgora] = useState(new Date());
  const [abaAtiva, setAbaAtiva] = useState<Aba>('atual');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    carregarAssembleias();
  }, []);

  // Atualiza "agora" periodicamente para que a assembleia mude de status
  // (agendada -> ao vivo -> encerrada) sem precisar recarregar a tela.
  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  async function carregarAssembleias() {
    const { data, error } = await supabase
      .from('assembleias')
      .select('id, titulo, tipo, data_hora, duracao_minutos, link_reuniao, status, encerrada_manualmente')
      .order('data_hora');

    if (error || !data) {
      setCarregando(false);
      return;
    }

    const ids = data.map((a) => a.id);
    const documentosPorAssembleia = new Map<string, DocumentoAssembleia[]>();

    if (ids.length > 0) {
      const { data: documentos } = await supabase
        .from('assembleia_documentos')
        .select('id, assembleia_id, nome')
        .in('assembleia_id', ids);

      (documentos ?? []).forEach((d) => {
        const lista = documentosPorAssembleia.get(d.assembleia_id) ?? [];
        lista.push({ id: d.id, nome: d.nome });
        documentosPorAssembleia.set(d.assembleia_id, lista);
      });
    }

    setAssembleias(
      data.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        tipo: a.tipo,
        dataISO: a.data_hora,
        duracaoMinutos: a.duracao_minutos ?? 0,
        linkReuniao: a.link_reuniao ?? '',
        pauta: [],
        documentos: documentosPorAssembleia.get(a.id) ?? [],
        status: a.status,
        encerradaManualmente: a.encerrada_manualmente,
      }))
    );
    setCarregando(false);
  }

  const atual = useMemo(() => {
    const futuras = assembleias
      .filter((a) => {
        const status = calcularStatusExibicao(a, agora);
        return status === 'agendada' || status === 'ao_vivo';
      })
      .sort((a, b) => new Date(a.dataISO).getTime() - new Date(b.dataISO).getTime());
    return futuras[0] ?? null;
  }, [assembleias, agora]);

  const historico = useMemo(
    () =>
      assembleias
        .filter((a) => a.id !== atual?.id)
        .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime()),
    [assembleias, atual]
  );

  // Busca a pauta da assembleia em destaque assim que ela é identificada
  // (evita buscar pauta de todas as assembleias, já que só a atual exibe isso).
  useEffect(() => {
    if (!atual || atual.pauta.length > 0) return;
    carregarPauta(atual.id);
  }, [atual?.id]);

  async function carregarPauta(assembleiaId: string) {
    const { data: pauta } = await supabase
      .from('assembleia_pauta')
      .select('item')
      .eq('assembleia_id', assembleiaId)
      .order('ordem');

    const itens = (pauta ?? []).map((p) => p.item);
    setAssembleias((atualLista) =>
      atualLista.map((a) => (a.id === assembleiaId ? { ...a, pauta: itens } : a))
    );
  }

  const statusAtual = atual ? calcularStatusExibicao(atual, agora) : null;

  useEffect(() => {
    if (statusAtual !== 'ao_vivo') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [statusAtual, pulseAnim]);

  async function handleEntrarNaReuniao() {
    if (!atual || statusAtual !== 'ao_vivo' || !atual.linkReuniao) return;
    try {
      const suportado = await Linking.canOpenURL(atual.linkReuniao);
      if (suportado) await Linking.openURL(atual.linkReuniao);
    } catch {
      // Em produção, mostrar um aviso amigável caso o link não possa ser aberto.
    }
  }

  const textoAjuda = (() => {
    if (!atual) return '';
    if (statusAtual === 'agendada') {
      const liberaEntradaEm = addMinutos(new Date(atual.dataISO), -15);
      return `A entrada libera em ${formatarTempoRestante(liberaEntradaEm.getTime() - agora.getTime())}`;
    }
    if (statusAtual === 'ao_vivo') return 'A reunião está acontecendo agora. Toque para entrar.';
    if (statusAtual === 'encerrada') return 'Essa assembleia já foi encerrada.';
    return 'Essa assembleia foi cancelada pela síndica.';
  })();

  const textoBotao =
    statusAtual === 'ao_vivo'
      ? 'Entrar na reunião'
      : statusAtual === 'agendada'
      ? 'Entrada ainda não liberada'
      : 'Assembleia indisponível';

  if (carregando) {
    return (
      <SafeAreaView style={styles.tela}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
        <View style={styles.listaVaziaContainer}>
          <ActivityIndicator size="large" color="#2B2823" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Assembleia Online</Text>
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'atual' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('atual')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'atual' && styles.abaTextoAtivo]}>
            Assembleia atual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'historico' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('historico')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'historico' && styles.abaTextoAtivo]}>
            Histórico
          </Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'atual' ? (
        atual && statusAtual ? (
          <ScrollView contentContainerStyle={styles.conteudoScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.cartaoDestaque}>
              <View style={styles.cartaoDestaqueTopo}>
                <SeloTipo tipo={atual.tipo} />
                <SeloStatus status={statusAtual} pulseAnim={pulseAnim} />
              </View>

              <Text style={styles.cartaoDestaqueTitulo}>{atual.titulo}</Text>
              <Text style={styles.cartaoDestaqueData}>{formatarDataHoraExtensa(atual.dataISO)}</Text>

              <TouchableOpacity
                style={[styles.botaoEntrar, statusAtual !== 'ao_vivo' && styles.botaoEntrarDesabilitado]}
                onPress={handleEntrarNaReuniao}
                disabled={statusAtual !== 'ao_vivo'}
                activeOpacity={0.85}
              >
                <Text style={styles.botaoEntrarTexto}>{textoBotao}</Text>
              </TouchableOpacity>

              <Text style={styles.cartaoDestaqueAjuda}>{textoAjuda}</Text>
            </View>

            <Text style={styles.secaoTitulo}>Pauta</Text>
            <View style={styles.listaPauta}>
              {atual.pauta.map((itemPauta, indice) => (
                <View key={indice} style={styles.itemPauta}>
                  <View style={styles.itemPautaNumero}>
                    <Text style={styles.itemPautaNumeroTexto}>{indice + 1}</Text>
                  </View>
                  <Text style={styles.itemPautaTexto}>{itemPauta}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.secaoTitulo}>Documentos</Text>
            <View style={styles.listaDocumentos}>
              {atual.documentos.map((documento) => (
                <ItemDocumento key={documento.id} documento={documento} />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.listaVaziaContainer}>
            <EstadoVazioAtual />
          </View>
        )
      ) : (
        <FlatList
          data={historico}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CartaoHistorico assembleia={item} />}
          contentContainerStyle={historico.length === 0 ? styles.listaVaziaContainer : styles.conteudoScroll}
          ListEmptyComponent={<EstadoVazioHistorico />}
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
  listaVaziaContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cartaoDestaque: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cartaoDestaqueTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cartaoDestaqueTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 6,
    lineHeight: 24,
  },
  cartaoDestaqueData: {
    fontSize: 13,
    color: '#6B6459',
    textTransform: 'capitalize',
    marginBottom: 18,
  },
  botaoEntrar: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  botaoEntrarDesabilitado: {
    backgroundColor: '#D8D3C8',
  },
  botaoEntrarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cartaoDestaqueAjuda: {
    fontSize: 12,
    color: '#8A8377',
    textAlign: 'center',
    marginTop: 10,
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 12,
  },
  listaPauta: {
    marginBottom: 26,
  },
  itemPauta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemPautaNumero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F0ECE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  itemPautaNumeroTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B6459',
  },
  itemPautaTexto: {
    flex: 1,
    fontSize: 14,
    color: '#2B2823',
    lineHeight: 20,
  },
  listaDocumentos: {
    marginBottom: 10,
  },
  itemDocumento: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  itemDocumentoIcone: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDocumentoIconeTexto: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  itemDocumentoNome: {
    flex: 1,
    fontSize: 13,
    color: '#2B2823',
    fontWeight: '500',
    marginRight: 8,
  },
  itemDocumentoAcao: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D6FB4',
  },
  cartaoHistorico: {
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
  cartaoHistoricoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartaoHistoricoData: {
    fontSize: 11,
    color: '#A8A199',
  },
  cartaoHistoricoTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 10,
    lineHeight: 19,
  },
  cartaoHistoricoAta: {
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    paddingTop: 10,
  },
  cartaoHistoricoAtaTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D6FB4',
  },
  seloTipo: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  seloTipoTexto: {
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