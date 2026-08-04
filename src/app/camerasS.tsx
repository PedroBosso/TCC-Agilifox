/**
 * TelaCamerasSindico.tsx
 *
 * Tela de câmeras para o síndico. Além de visualizar os feeds, como na
 * portaria em TelaCamerasPorteiro.tsx, o síndico também pode cadastrar,
 * editar, ativar/desativar e remover câmeras do condomínio.
 *
 * Front-end apenas — os dados abaixo são simulados (MOCK_CAMERAS). Como não
 * há um back-end de streaming conectado, cada câmera é representada por um
 * marcador visual (com indicador "AO VIVO" e relógio) no lugar do vídeo real.
 *
 * Para integrar com um streaming real depois, o lugar mais natural é dentro
 * de <CameraFeed>: troque o marcador pelo player de vídeo (ex.: react-native-video
 * ou um WebView apontando para o stream HLS/RTSP salvo em `camera.urlStream`).
 *
 * Para integrar com o back-end depois, basta substituir:
 *   1. O estado inicial de `cameras` por uma chamada à API (useEffect + fetch/axios)
 *   2. `handleSalvarCamera` e `handleRemoverCamera` por chamadas POST/PATCH/DELETE
 *      para o seu endpoint
 *
 * Dependências: apenas React e React Native "puro" — nenhuma lib extra necessária.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
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

type Area = 'entrada' | 'garagem' | 'areas_comuns' | 'seguranca';
type FiltroArea = 'todas' | Area;
type Aba = 'visualizar' | 'gerenciar';

interface Camera {
  id: string;
  nome: string;
  area: Area;
  urlStream: string;
  ativa: boolean;
  online: boolean;
}

// ---------- Configuração visual ----------

const CONFIG_AREA: Record<Area, { nome: string; cor: string }> = {
  entrada: { nome: 'Entrada', cor: '#3D6FB4' },
  garagem: { nome: 'Garagem', cor: '#B7791F' },
  areas_comuns: { nome: 'Áreas comuns', cor: '#2F855A' },
  seguranca: { nome: 'Segurança', cor: '#C0392B' },
};

const FILTROS: { id: FiltroArea; nome: string }[] = [
  { id: 'todas', nome: 'Todas' },
  { id: 'entrada', nome: 'Entrada' },
  { id: 'garagem', nome: 'Garagem' },
  { id: 'areas_comuns', nome: 'Áreas comuns' },
  { id: 'seguranca', nome: 'Segurança' },
];

// ---------- Dados mockados ----------

const MOCK_CAMERAS: Camera[] = [
  { id: 'c1', nome: 'Portaria Principal', area: 'entrada', urlStream: 'rtsp://192.168.0.10/portaria', ativa: true, online: true },
  { id: 'c2', nome: 'Portão de Veículos', area: 'entrada', urlStream: 'rtsp://192.168.0.11/portao-veiculos', ativa: true, online: true },
  { id: 'c3', nome: 'Garagem - Subsolo 1', area: 'garagem', urlStream: 'rtsp://192.168.0.12/garagem-1', ativa: true, online: true },
  { id: 'c4', nome: 'Garagem - Subsolo 2', area: 'garagem', urlStream: 'rtsp://192.168.0.13/garagem-2', ativa: true, online: false },
  { id: 'c5', nome: 'Elevador Social - Bloco A', area: 'areas_comuns', urlStream: 'rtsp://192.168.0.14/elevador-a', ativa: true, online: true },
  { id: 'c6', nome: 'Piscina', area: 'areas_comuns', urlStream: 'rtsp://192.168.0.15/piscina', ativa: true, online: true },
  { id: 'c7', nome: 'Playground', area: 'areas_comuns', urlStream: 'rtsp://192.168.0.16/playground', ativa: true, online: true },
  { id: 'c8', nome: 'Portão dos Fundos', area: 'seguranca', urlStream: 'rtsp://192.168.0.17/fundos', ativa: true, online: false },
];

// ---------- Helpers ----------

function formatarHora(data: Date): string {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ---------- Subcomponentes de visualização ----------

function PontoAoVivo() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return <Animated.View style={[styles.pontoAoVivo, { opacity: pulseAnim }]} />;
}

interface CameraFeedProps {
  camera: Camera;
  altura: number;
  mostrarRelogio?: boolean;
}

function CameraFeed({ camera, altura, mostrarRelogio }: CameraFeedProps) {
  const [agora, setAgora] = useState(new Date());
  const exibirComoOnline = camera.online && camera.ativa;

  useEffect(() => {
    if (!mostrarRelogio) return;
    const intervalo = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, [mostrarRelogio]);

  return (
    <View style={[styles.feed, { height: altura }, !exibirComoOnline && styles.feedOffline]}>
      {exibirComoOnline ? (
        <>
          <View style={styles.feedTopo}>
            <PontoAoVivo />
            <Text style={styles.feedAoVivoTexto}>AO VIVO</Text>
          </View>
          {mostrarRelogio && <Text style={styles.feedRelogio}>{formatarHora(agora)}</Text>}
          <View style={styles.feedLenteContainer}>
            <View style={styles.feedLenteExterna}>
              <View style={styles.feedLenteInterna} />
            </View>
          </View>
        </>
      ) : (
        <View style={styles.feedOfflineConteudo}>
          <Text style={styles.feedOfflineIcone}>—</Text>
          <Text style={styles.feedOfflineTexto}>{!camera.ativa ? 'Câmera desativada' : 'Sem sinal'}</Text>
        </View>
      )}
      <View style={styles.feedRodape}>
        <Text style={styles.feedNome} numberOfLines={1}>
          {camera.nome}
        </Text>
      </View>
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

function Selo({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[styles.selo, { backgroundColor: fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: cor }]} />
      <Text style={[styles.seloTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

interface CartaoCameraGridProps {
  camera: Camera;
  onPress: () => void;
}

function CartaoCameraGrid({ camera, onPress }: CartaoCameraGridProps) {
  const config = CONFIG_AREA[camera.area];
  return (
    <TouchableOpacity style={styles.cartaoGrid} onPress={onPress} activeOpacity={0.85}>
      <CameraFeed camera={camera} altura={100} />
      <View style={styles.cartaoGridInfo}>
        <Text style={[styles.cartaoGridArea, { color: config.cor }]}>{config.nome}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ModalCameraCheia({ camera, onFechar }: { camera: Camera | null; onFechar: () => void }) {
  return (
    <Modal visible={!!camera} animationType="fade" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          {camera && (
            <>
              <CameraFeed camera={camera} altura={220} mostrarRelogio />

              <View style={styles.modalInfo}>
                <Text style={styles.modalNome}>{camera.nome}</Text>
                <Text style={[styles.modalArea, { color: CONFIG_AREA[camera.area].cor }]}>
                  {CONFIG_AREA[camera.area].nome} ·{' '}
                  {!camera.ativa ? 'Desativada' : camera.online ? 'Online' : 'Offline'}
                </Text>
              </View>

              <TouchableOpacity style={styles.botaoFechar} onPress={onFechar} activeOpacity={0.85}>
                <Text style={styles.botaoFecharTexto}>Fechar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------- Subcomponentes de gerenciamento ----------

interface LinhaCameraProps {
  camera: Camera;
  onEditar: () => void;
  onRemover: () => void;
  onAlternarAtiva: () => void;
}

function LinhaCamera({ camera, onEditar, onRemover, onAlternarAtiva }: LinhaCameraProps) {
  const config = CONFIG_AREA[camera.area];
  return (
    <View style={styles.linhaCamera}>
      <View style={styles.linhaCameraTopo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.linhaCameraNome}>{camera.nome}</Text>
          <Text style={[styles.linhaCameraArea, { color: config.cor }]}>{config.nome}</Text>
        </View>
        {camera.ativa ? (
          <Selo
            texto={camera.online ? 'Online' : 'Offline'}
            cor={camera.online ? '#2F855A' : '#C0392B'}
            fundo={camera.online ? '#E7F4ED' : '#FBEAE8'}
          />
        ) : (
          <Selo texto="Desativada" cor="#8A8377" fundo="#F0ECE5" />
        )}
      </View>

      <Text style={styles.linhaCameraUrl} numberOfLines={1}>
        {camera.urlStream}
      </Text>

      <View style={styles.linhaCameraAcoes}>
        <TouchableOpacity onPress={onEditar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.linhaCameraAcaoTexto}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAlternarAtiva} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.linhaCameraAcaoTexto}>{camera.ativa ? 'Desativar' : 'Ativar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemover} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.linhaCameraAcaoTextoRemover}>Remover</Text>
        </TouchableOpacity>
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
      <Text style={styles.estadoVazioTitulo}>Nenhuma câmera cadastrada</Text>
      <Text style={styles.estadoVazioTexto}>Toque no botão “+” para adicionar a primeira câmera.</Text>
    </View>
  );
}

// ---------- Modal de cadastro/edição ----------

interface ModalCameraFormProps {
  visivel: boolean;
  cameraEditando: Camera | null;
  onFechar: () => void;
  onSalvar: (dados: Omit<Camera, 'id' | 'online'>, idEdicao: string | null) => void;
}

function ModalCameraForm({ visivel, cameraEditando, onFechar, onSalvar }: ModalCameraFormProps) {
  const [nome, setNome] = useState('');
  const [area, setArea] = useState<Area>('entrada');
  const [urlStream, setUrlStream] = useState('');
  const [ativa, setAtiva] = useState(true);

  useEffect(() => {
    if (visivel) {
      setNome(cameraEditando?.nome ?? '');
      setArea(cameraEditando?.area ?? 'entrada');
      setUrlStream(cameraEditando?.urlStream ?? '');
      setAtiva(cameraEditando?.ativa ?? true);
    }
  }, [visivel, cameraEditando]);

  const podeSalvar = nome.trim().length > 0 && urlStream.trim().length > 0;

  function handleSalvar() {
    if (!podeSalvar) return;
    onSalvar({ nome: nome.trim(), area, urlStream: urlStream.trim(), ativa }, cameraEditando?.id ?? null);
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundoForm}>
        <View style={styles.modalCartaoForm}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>{cameraEditando ? 'Editar câmera' : 'Nova câmera'}</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFecharTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.campoLabel}>Nome / Local</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Portaria Principal"
              placeholderTextColor="#A8A199"
              value={nome}
              onChangeText={setNome}
              maxLength={40}
            />

            <Text style={styles.campoLabel}>Área</Text>
            <View style={styles.chipsLinha}>
              {(Object.keys(CONFIG_AREA) as Area[]).map((id) => (
                <Chip key={id} label={CONFIG_AREA[id].nome} ativo={id === area} onPress={() => setArea(id)} />
              ))}
            </View>

            <Text style={styles.campoLabel}>URL do fluxo</Text>
            <TextInput
              style={styles.input}
              placeholder="rtsp://... ou https://..."
              placeholderTextColor="#A8A199"
              value={urlStream}
              onChangeText={setUrlStream}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.campoAjuda}>
              Endereço fornecido pelo fabricante da câmera (RTSP) ou link do serviço de streaming.
            </Text>

            <Text style={styles.campoLabel}>Status</Text>
            <View style={styles.segmentado}>
              <TouchableOpacity
                style={[styles.segmentoBotao, ativa && styles.segmentoBotaoAtivo]}
                onPress={() => setAtiva(true)}
              >
                <Text style={[styles.segmentoTexto, ativa && styles.segmentoTextoAtivo]}>Ativa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentoBotao, !ativa && styles.segmentoBotaoAtivo]}
                onPress={() => setAtiva(false)}
              >
                <Text style={[styles.segmentoTexto, !ativa && styles.segmentoTextoAtivo]}>Desativada</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.botaoEnviar, !podeSalvar && styles.botaoEnviarDesabilitado]}
              onPress={handleSalvar}
              disabled={!podeSalvar}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Salvar câmera</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaCamerasSindico() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('visualizar');
  const [cameras, setCameras] = useState<Camera[]>(MOCK_CAMERAS);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroArea>('todas');
  const [cameraAberta, setCameraAberta] = useState<Camera | null>(null);

  const [modalFormVisivel, setModalFormVisivel] = useState(false);
  const [cameraEditando, setCameraEditando] = useState<Camera | null>(null);

  const camerasFiltradas = cameras.filter((c) => filtroAtivo === 'todas' || c.area === filtroAtivo);
  const totalOnline = cameras.filter((c) => c.ativa && c.online).length;
  const totalAtivas = cameras.filter((c) => c.ativa).length;

  function handleAbrirNova() {
    setCameraEditando(null);
    setModalFormVisivel(true);
  }

  function handleAbrirEdicao(camera: Camera) {
    setCameraEditando(camera);
    setModalFormVisivel(true);
  }

  function handleSalvarCamera(dados: Omit<Camera, 'id' | 'online'>, idEdicao: string | null) {
    if (idEdicao) {
      setCameras((atual) => atual.map((c) => (c.id === idEdicao ? { ...c, ...dados } : c)));
    } else {
      setCameras((atual) => [...atual, { ...dados, id: String(Date.now()), online: true }]);
    }
    setModalFormVisivel(false);
  }

  function handleRemoverCamera(id: string) {
    setCameras((atual) => atual.filter((c) => c.id !== id));
  }

  function handleAlternarAtiva(id: string) {
    setCameras((atual) => atual.map((c) => (c.id === id ? { ...c, ativa: !c.ativa } : c)));
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
          <Text style={styles.cabecalhoTitulo}>Câmeras</Text>
        </View>
        <View style={styles.contadorOnline}>
          <View style={styles.contadorPonto} />
          <Text style={styles.contadorTexto}>
            {totalOnline}/{totalAtivas} online
          </Text>
        </View>
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'visualizar' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('visualizar')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'visualizar' && styles.abaTextoAtivo]}>Visualizar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBotao, abaAtiva === 'gerenciar' && styles.abaBotaoAtiva]}
          onPress={() => setAbaAtiva('gerenciar')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'gerenciar' && styles.abaTextoAtivo]}>Gerenciar</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'visualizar' ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtrosScroll}
            contentContainerStyle={styles.filtrosConteudo}
          >
            {FILTROS.map((f) => (
              <Chip key={f.id} label={f.nome} ativo={filtroAtivo === f.id} onPress={() => setFiltroAtivo(f.id)} />
            ))}
          </ScrollView>

          <FlatList
            data={camerasFiltradas}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.colunas}
            contentContainerStyle={styles.listaConteudo}
            renderItem={({ item }) => <CartaoCameraGrid camera={item} onPress={() => setCameraAberta(item)} />}
            showsVerticalScrollIndicator={false}
          />

          <ModalCameraCheia camera={cameraAberta} onFechar={() => setCameraAberta(null)} />
        </>
      ) : (
        <>
          <FlatList
            data={cameras}
            keyExtractor={(item) => item.id}
            contentContainerStyle={cameras.length === 0 ? styles.listaVaziaContainer : styles.listaGerenciarConteudo}
            renderItem={({ item }) => (
              <LinhaCamera
                camera={item}
                onEditar={() => handleAbrirEdicao(item)}
                onRemover={() => handleRemoverCamera(item.id)}
                onAlternarAtiva={() => handleAlternarAtiva(item.id)}
              />
            )}
            ListEmptyComponent={<EstadoVazio />}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity style={styles.fab} onPress={handleAbrirNova} activeOpacity={0.85}>
            <Text style={styles.fabTexto}>+</Text>
          </TouchableOpacity>

          <ModalCameraForm
            visivel={modalFormVisivel}
            cameraEditando={cameraEditando}
            onFechar={() => setModalFormVisivel(false)}
            onSalvar={handleSalvarCamera}
          />
        </>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  contadorOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0ECE5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 4,
  },
  contadorPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2F855A',
    marginRight: 6,
  },
  contadorTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6459',
  },
  abas: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
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
  listaConteudo: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  listaGerenciarConteudo: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 100,
  },
  colunas: {
    justifyContent: 'space-between',
  },
  cartaoGrid: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cartaoGridInfo: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cartaoGridArea: {
    fontSize: 11,
    fontWeight: '700',
  },
  linhaCamera: {
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
  linhaCameraTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  linhaCameraNome: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2823',
  },
  linhaCameraArea: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  linhaCameraUrl: {
    fontSize: 11,
    color: '#A8A199',
    marginBottom: 10,
  },
  linhaCameraAcoes: {
    flexDirection: 'row',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    paddingTop: 10,
  },
  linhaCameraAcaoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D6FB4',
  },
  linhaCameraAcaoTextoRemover: {
    fontSize: 12,
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
  feed: {
    backgroundColor: '#20201D',
    justifyContent: 'flex-end',
    padding: 8,
  },
  feedOffline: {
    backgroundColor: '#2B2A27',
  },
  feedTopo: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pontoAoVivo: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E05B4F',
    marginRight: 5,
  },
  feedAoVivoTexto: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  feedRelogio: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 11,
    color: '#D8D3C8',
    fontVariant: ['tabular-nums'],
  },
  feedLenteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedLenteExterna: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedLenteInterna: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  feedOfflineConteudo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedOfflineIcone: {
    fontSize: 20,
    color: '#6B6459',
    marginBottom: 2,
  },
  feedOfflineTexto: {
    fontSize: 11,
    color: '#8A8377',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  feedRodape: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  feedNome: {
    fontSize: 10,
    color: '#FFFFFF',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43, 40, 35, 0.7)',
    padding: 24,
  },
  modalCartao: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  modalInfo: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  modalNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2823',
    marginBottom: 2,
  },
  modalArea: {
    fontSize: 12,
    fontWeight: '600',
  },
  botaoFechar: {
    margin: 16,
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoFecharTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B2823',
  },
  modalFundoForm: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(43, 40, 35, 0.4)',
  },
  modalCartaoForm: {
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
  modalFecharTexto: {
    fontSize: 14,
    color: '#8A8377',
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 16,
  },
  campoAjuda: {
    fontSize: 11,
    color: '#A8A199',
    marginTop: 8,
    lineHeight: 15,
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
});