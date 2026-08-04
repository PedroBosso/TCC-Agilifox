import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
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

type Area = 'entrada' | 'garagem' | 'areas_comuns' | 'seguranca';
type FiltroArea = 'todas' | Area;

interface Camera {
  id: string;
  nome: string;
  area: Area;
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
  { id: 'c1', nome: 'Portaria Principal', area: 'entrada', online: true },
  { id: 'c2', nome: 'Portão de Veículos', area: 'entrada', online: true },
  { id: 'c3', nome: 'Garagem - Subsolo 1', area: 'garagem', online: true },
  { id: 'c4', nome: 'Garagem - Subsolo 2', area: 'garagem', online: false },
  { id: 'c5', nome: 'Elevador Social - Bloco A', area: 'areas_comuns', online: true },
  { id: 'c6', nome: 'Piscina', area: 'areas_comuns', online: true },
  { id: 'c7', nome: 'Playground', area: 'areas_comuns', online: true },
  { id: 'c8', nome: 'Portão dos Fundos', area: 'seguranca', online: false },
];

// ---------- Helpers ----------

function formatarHora(data: Date): string {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ---------- Subcomponentes ----------

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

  useEffect(() => {
    if (!mostrarRelogio) return;
    const intervalo = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, [mostrarRelogio]);

  return (
    <View style={[styles.feed, { height: altura }, !camera.online && styles.feedOffline]}>
      {camera.online ? (
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
          <Text style={styles.feedOfflineTexto}>Sem sinal</Text>
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

interface CartaoCameraProps {
  camera: Camera;
  onPress: () => void;
}

function CartaoCamera({ camera, onPress }: CartaoCameraProps) {
  const config = CONFIG_AREA[camera.area];
  return (
    <TouchableOpacity style={styles.cartao} onPress={onPress} activeOpacity={0.85}>
      <CameraFeed camera={camera} altura={100} />
      <View style={styles.cartaoInfo}>
        <Text style={[styles.cartaoArea, { color: config.cor }]}>{config.nome}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------- Modal fullscreen ----------

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
                  {CONFIG_AREA[camera.area].nome} · {camera.online ? 'Online' : 'Offline'}
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

// ---------- Tela principal ----------

export default function TelaCamerasPorteiro() {
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroArea>('todas');
  const [cameraAberta, setCameraAberta] = useState<Camera | null>(null);

  const camerasFiltradas = MOCK_CAMERAS.filter((c) => filtroAtivo === 'todas' || c.area === filtroAtivo);
  const totalOnline = MOCK_CAMERAS.filter((c) => c.online).length;

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
            {totalOnline}/{MOCK_CAMERAS.length} online
          </Text>
        </View>
      </View>

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
        renderItem={({ item }) => <CartaoCamera camera={item} onPress={() => setCameraAberta(item)} />}
        showsVerticalScrollIndicator={false}
      />

      <ModalCameraCheia camera={cameraAberta} onFechar={() => setCameraAberta(null)} />
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
    color: '#FFFFFF',
  },
  listaConteudo: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  colunas: {
    justifyContent: 'space-between',
  },
  cartao: {
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
  cartaoInfo: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cartaoArea: {
    fontSize: 11,
    fontWeight: '700',
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
});