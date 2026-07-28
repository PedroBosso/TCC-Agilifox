import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

// ---------- Tipos ----------

type Especie = 'cachorro' | 'gato' | 'outro';
type Porte = 'pequeno' | 'medio' | 'grande';
type Sexo = 'macho' | 'femea';

interface Pet {
  id: string;
  nome: string;
  especie: Especie;
  raca: string;
  cor: string;
  porte: Porte;
  sexo: Sexo;
  idade: string;
  castrado: boolean;
  vacinacaoEmDia: boolean;
  caracteristicas: string;
}

// ---------- Configuração visual ----------

const CONFIG_ESPECIE: Record<Especie, { nome: string; cor: string }> = {
  cachorro: { nome: 'Cachorro', cor: '#B7791F' },
  gato: { nome: 'Gato', cor: '#7E57A6' },
  outro: { nome: 'Outro', cor: '#3D6FB4' },
};

const CONFIG_PORTE: Record<Porte, string> = {
  pequeno: 'Pequeno porte',
  medio: 'Médio porte',
  grande: 'Grande porte',
};

// ---------- Dados mockados ----------

const MOCK_MEUS_PETS: Pet[] = [
  {
    id: 'p1',
    nome: 'Mel',
    especie: 'cachorro',
    raca: 'SRD (vira-lata)',
    cor: 'Caramelo',
    porte: 'medio',
    sexo: 'femea',
    idade: '3 anos',
    castrado: true,
    vacinacaoEmDia: true,
    caracteristicas: 'Usa coleira azul com plaquinha de identificação. Muito dócil com estranhos.',
  },
  {
    id: 'p2',
    nome: 'Nina',
    especie: 'gato',
    raca: 'Siamês',
    cor: 'Clara com pontas escuras',
    porte: 'pequeno',
    sexo: 'femea',
    idade: '1 ano',
    castrado: true,
    vacinacaoEmDia: true,
    caracteristicas: 'Olhos azuis, pelagem curta. Costuma se esconder quando assustada.',
  },
];

// ---------- Subcomponentes ----------

function Selo({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[styles.selo, { backgroundColor: fundo }]}>
      <View style={[styles.seloPonto, { backgroundColor: cor }]} />
      <Text style={[styles.seloTexto, { color: cor }]}>{texto}</Text>
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

interface CartaoPetProps {
  pet: Pet;
  onEditar: () => void;
  onRemover: () => void;
}

function CartaoPet({ pet, onEditar, onRemover }: CartaoPetProps) {
  const config = CONFIG_ESPECIE[pet.especie];

  return (
    <View style={styles.cartao}>
      <View style={styles.cartaoTopo}>
        <View style={[styles.avatar, { backgroundColor: config.cor }]}>
          <Text style={styles.avatarTexto}>{pet.nome.charAt(0)}</Text>
        </View>

        <View style={styles.cartaoInfo}>
          <Text style={styles.cartaoNome}>{pet.nome}</Text>
          <Text style={styles.cartaoRaca}>
            {config.nome} · {pet.raca}
          </Text>
          <Text style={styles.cartaoDetalhe}>
            {CONFIG_PORTE[pet.porte]} · {pet.cor} · {pet.idade}
          </Text>
        </View>
      </View>

      <Text style={styles.cartaoCaracteristicas} numberOfLines={2}>
        {pet.caracteristicas}
      </Text>

      <View style={styles.selosLinha}>
        <Selo
          texto={pet.vacinacaoEmDia ? 'Vacinação em dia' : 'Vacinação pendente'}
          cor={pet.vacinacaoEmDia ? '#2F855A' : '#B7791F'}
          fundo={pet.vacinacaoEmDia ? '#E7F4ED' : '#FBF1DE'}
        />
        {pet.castrado && <Selo texto="Castrado(a)" cor="#3D6FB4" fundo="#EAF1FB" />}
      </View>

      <View style={styles.cartaoAcoes}>
        <TouchableOpacity onPress={onEditar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.cartaoAcaoTexto}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemover} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.cartaoAcaoTextoRemover}>Remover</Text>
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
      <Text style={styles.estadoVazioTitulo}>Nenhum pet cadastrado</Text>
      <Text style={styles.estadoVazioTexto}>
        Cadastrar seu pet ajuda a portaria a identificá-lo rapidamente caso ele se perca.
      </Text>
    </View>
  );
}

// ---------- Modal de cadastro/edição ----------

interface ModalPetProps {
  visivel: boolean;
  petEditando: Pet | null;
  onFechar: () => void;
  onSalvar: (dados: Omit<Pet, 'id'>, idEdicao: string | null) => void;
}

function ModalPet({ visivel, petEditando, onFechar, onSalvar }: ModalPetProps) {
  const [nome, setNome] = useState('');
  const [especie, setEspecie] = useState<Especie>('cachorro');
  const [raca, setRaca] = useState('');
  const [cor, setCor] = useState('');
  const [porte, setPorte] = useState<Porte>('medio');
  const [sexo, setSexo] = useState<Sexo>('macho');
  const [idade, setIdade] = useState('');
  const [castrado, setCastrado] = useState(false);
  const [vacinacaoEmDia, setVacinacaoEmDia] = useState(false);
  const [caracteristicas, setCaracteristicas] = useState('');

  React.useEffect(() => {
    if (visivel) {
      setNome(petEditando?.nome ?? '');
      setEspecie(petEditando?.especie ?? 'cachorro');
      setRaca(petEditando?.raca ?? '');
      setCor(petEditando?.cor ?? '');
      setPorte(petEditando?.porte ?? 'medio');
      setSexo(petEditando?.sexo ?? 'macho');
      setIdade(petEditando?.idade ?? '');
      setCastrado(petEditando?.castrado ?? false);
      setVacinacaoEmDia(petEditando?.vacinacaoEmDia ?? false);
      setCaracteristicas(petEditando?.caracteristicas ?? '');
    }
  }, [visivel, petEditando]);

  const podeSalvar = nome.trim().length > 0 && cor.trim().length > 0;

  function handleSalvar() {
    if (!podeSalvar) return;
    onSalvar(
      {
        nome: nome.trim(),
        especie,
        raca: raca.trim() || 'SRD',
        cor: cor.trim(),
        porte,
        sexo,
        idade: idade.trim() || 'Não informada',
        castrado,
        vacinacaoEmDia,
        caracteristicas: caracteristicas.trim() || 'Sem características adicionais informadas.',
      },
      petEditando?.id ?? null
    );
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>{petEditando ? 'Editar pet' : 'Novo pet'}</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.avatarPreview}>
              <View style={[styles.avatarGrande, { backgroundColor: CONFIG_ESPECIE[especie].cor }]}>
                <Text style={styles.avatarGrandeTexto}>{nome.charAt(0) || '?'}</Text>
              </View>
            </View>

            <Text style={styles.campoLabel}>Espécie</Text>
            <View style={styles.chipsLinha}>
              {(Object.keys(CONFIG_ESPECIE) as Especie[]).map((id) => (
                <Chip key={id} label={CONFIG_ESPECIE[id].nome} ativo={id === especie} onPress={() => setEspecie(id)} />
              ))}
            </View>

            <Text style={styles.campoLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Mel"
              placeholderTextColor="#A8A199"
              value={nome}
              onChangeText={setNome}
              maxLength={30}
            />

            <Text style={styles.campoLabel}>Raça</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: SRD, Labrador, Siamês..."
              placeholderTextColor="#A8A199"
              value={raca}
              onChangeText={setRaca}
              maxLength={40}
            />

            <Text style={styles.campoLabel}>Cor / pelagem</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Caramelo, preto e branco..."
              placeholderTextColor="#A8A199"
              value={cor}
              onChangeText={setCor}
              maxLength={40}
            />

            <Text style={styles.campoLabel}>Porte</Text>
            <View style={styles.chipsLinha}>
              {(Object.keys(CONFIG_PORTE) as Porte[]).map((id) => (
                <Chip key={id} label={CONFIG_PORTE[id]} ativo={id === porte} onPress={() => setPorte(id)} />
              ))}
            </View>

            <Text style={styles.campoLabel}>Sexo</Text>
            <View style={styles.segmentado}>
              <TouchableOpacity
                style={[styles.segmentoBotao, sexo === 'macho' && styles.segmentoBotaoAtivo]}
                onPress={() => setSexo('macho')}
              >
                <Text style={[styles.segmentoTexto, sexo === 'macho' && styles.segmentoTextoAtivo]}>Macho</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentoBotao, sexo === 'femea' && styles.segmentoBotaoAtivo]}
                onPress={() => setSexo('femea')}
              >
                <Text style={[styles.segmentoTexto, sexo === 'femea' && styles.segmentoTextoAtivo]}>Fêmea</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.campoLabel}>Idade</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: 2 anos, filhote..."
              placeholderTextColor="#A8A199"
              value={idade}
              onChangeText={setIdade}
              maxLength={20}
            />

            <Text style={styles.campoLabel}>Castrado(a)?</Text>
            <View style={styles.segmentado}>
              <TouchableOpacity
                style={[styles.segmentoBotao, castrado && styles.segmentoBotaoAtivo]}
                onPress={() => setCastrado(true)}
              >
                <Text style={[styles.segmentoTexto, castrado && styles.segmentoTextoAtivo]}>Sim</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentoBotao, !castrado && styles.segmentoBotaoAtivo]}
                onPress={() => setCastrado(false)}
              >
                <Text style={[styles.segmentoTexto, !castrado && styles.segmentoTextoAtivo]}>Não</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.campoLabel}>Vacinação em dia?</Text>
            <View style={styles.segmentado}>
              <TouchableOpacity
                style={[styles.segmentoBotao, vacinacaoEmDia && styles.segmentoBotaoAtivo]}
                onPress={() => setVacinacaoEmDia(true)}
              >
                <Text style={[styles.segmentoTexto, vacinacaoEmDia && styles.segmentoTextoAtivo]}>Sim</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentoBotao, !vacinacaoEmDia && styles.segmentoBotaoAtivo]}
                onPress={() => setVacinacaoEmDia(false)}
              >
                <Text style={[styles.segmentoTexto, !vacinacaoEmDia && styles.segmentoTextoAtivo]}>Não</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.campoLabel}>Características (ajudam a identificar em caso de perda)</Text>
            <TextInput
              style={[styles.input, styles.inputMultilinha]}
              placeholder="Ex.: Usa coleira vermelha, tem uma mancha no olho..."
              placeholderTextColor="#A8A199"
              value={caracteristicas}
              onChangeText={setCaracteristicas}
              multiline
              numberOfLines={3}
              maxLength={250}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.botaoEnviar, !podeSalvar && styles.botaoEnviarDesabilitado]}
              onPress={handleSalvar}
              disabled={!podeSalvar}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoEnviarTexto}>Salvar pet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaMeusPets() {
  const [pets, setPets] = useState<Pet[]>(MOCK_MEUS_PETS);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [petEditando, setPetEditando] = useState<Pet | null>(null);

  function handleAbrirNovo() {
    setPetEditando(null);
    setModalVisivel(true);
  }

  function handleAbrirEdicao(pet: Pet) {
    setPetEditando(pet);
    setModalVisivel(true);
  }

  function handleSalvarPet(dados: Omit<Pet, 'id'>, idEdicao: string | null) {
    if (idEdicao) {
      setPets((atual) => atual.map((p) => (p.id === idEdicao ? { ...p, ...dados } : p)));
    } else {
      setPets((atual) => [...atual, { ...dados, id: String(Date.now()) }]);
    }
    setModalVisivel(false);
  }

  function handleRemoverPet(id: string) {
    setPets((atual) => atual.filter((p) => p.id !== id));
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Meus Pets</Text>
      </View>

      <FlatList
        data={pets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CartaoPet pet={item} onEditar={() => handleAbrirEdicao(item)} onRemover={() => handleRemoverPet(item.id)} />
        )}
        contentContainerStyle={pets.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
        ListEmptyComponent={<EstadoVazio />}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={handleAbrirNovo} activeOpacity={0.85}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      <ModalPet
        visivel={modalVisivel}
        petEditando={petEditando}
        onFechar={() => setModalVisivel(false)}
        onSalvar={handleSalvarPet}
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
  listaConteudo: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingBottom: 100,
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
  cartaoTopo: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  cartaoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cartaoNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2823',
  },
  cartaoRaca: {
    fontSize: 13,
    color: '#6B6459',
    marginTop: 2,
  },
  cartaoDetalhe: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 2,
  },
  cartaoCaracteristicas: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 18,
    marginBottom: 10,
  },
  selosLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  cartaoAcoes: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    paddingTop: 10,
  },
  cartaoAcaoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D6FB4',
  },
  cartaoAcaoTextoRemover: {
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
  avatarPreview: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  avatarGrande: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGrandeTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 28,
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
  inputMultilinha: {
    minHeight: 80,
    paddingTop: 12,
  },
  chipsLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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