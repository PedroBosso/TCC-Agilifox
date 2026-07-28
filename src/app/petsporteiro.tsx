import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Linking,
} from 'react-native';

// ---------- Tipos ----------

type Especie = 'cachorro' | 'gato' | 'outro';
type Porte = 'pequeno' | 'medio' | 'grande';
type FiltroEspecie = 'todos' | Especie;

interface PetCondominio {
  id: string;
  nome: string;
  especie: Especie;
  raca: string;
  cor: string;
  porte: Porte;
  caracteristicas: string;
  tutor: string;
  apto: string;
  telefone: string;
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

const FILTROS: { id: FiltroEspecie; nome: string }[] = [
  { id: 'todos', nome: 'Todos' },
  { id: 'cachorro', nome: 'Cães' },
  { id: 'gato', nome: 'Gatos' },
  { id: 'outro', nome: 'Outros' },
];

// ---------- Dados mockados ----------
// Em produção, essa lista viria agregada de todos os moradores do condomínio.

const MOCK_PETS_CONDOMINIO: PetCondominio[] = [
  {
    id: 'p1',
    nome: 'Mel',
    especie: 'cachorro',
    raca: 'SRD (vira-lata)',
    cor: 'Caramelo',
    porte: 'medio',
    caracteristicas: 'Usa coleira azul com plaquinha de identificação. Muito dócil com estranhos.',
    tutor: 'Carla Mendes',
    apto: 'Apto 204',
    telefone: '(19) 99999-1001',
  },
  {
    id: 'p2',
    nome: 'Thor',
    especie: 'cachorro',
    raca: 'Labrador',
    cor: 'Dourado',
    porte: 'grande',
    caracteristicas: 'Coleira vermelha, muito agitado, late bastante com estranhos.',
    tutor: 'Rafael Souza',
    apto: 'Apto 512',
    telefone: '(19) 99999-1002',
  },
  {
    id: 'p3',
    nome: 'Nina',
    especie: 'gato',
    raca: 'Siamês',
    cor: 'Clara com pontas escuras',
    porte: 'pequeno',
    caracteristicas: 'Olhos azuis, pelagem curta. Costuma se esconder quando assustada.',
    tutor: 'Bruna Lima',
    apto: 'Apto 108',
    telefone: '(19) 99999-1003',
  },
  {
    id: 'p4',
    nome: 'Bidu',
    especie: 'cachorro',
    raca: 'Poodle',
    cor: 'Branco',
    porte: 'pequeno',
    caracteristicas: 'Pelagem cacheada, usa laço rosa na cabeça, não é castrado.',
    tutor: 'João Ferreira',
    apto: 'Apto 301',
    telefone: '(19) 99999-1004',
  },
  {
    id: 'p5',
    nome: 'Preta',
    especie: 'gato',
    raca: 'SRD (vira-lata)',
    cor: 'Preta',
    porte: 'pequeno',
    caracteristicas: 'Mancha branca no peito, sem coleira, bastante arisca.',
    tutor: 'Ana Paula Rocha',
    apto: 'Apto 604',
    telefone: '(19) 99999-1005',
  },
  {
    id: 'p6',
    nome: 'Rex',
    especie: 'cachorro',
    raca: 'Pastor Alemão',
    cor: 'Preto e caramelo',
    porte: 'grande',
    caracteristicas: 'Coleira de couro marrom, obediente, atende bem pelo nome.',
    tutor: 'Marcos Silva',
    apto: 'Apto 402',
    telefone: '(19) 99999-1006',
  },
];

// ---------- Helpers ----------

function normalizar(texto: string): string {
  return texto.toLowerCase();
}

function handleLigar(telefone: string) {
  const numeroLimpo = telefone.replace(/[^0-9+]/g, '');
  Linking.openURL(`tel:${numeroLimpo}`).catch(() => {
    // Em produção, mostrar um aviso caso o dispositivo não suporte chamadas.
  });
}

// ---------- Subcomponentes ----------

function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, ativo && styles.chipAtivo]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CartaoPet({ pet }: { pet: PetCondominio }) {
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
            {CONFIG_PORTE[pet.porte]} · {pet.cor}
          </Text>
        </View>
      </View>

      <View style={styles.caracteristicasBox}>
        <Text style={styles.caracteristicasLabel}>Características</Text>
        <Text style={styles.caracteristicasTexto}>{pet.caracteristicas}</Text>
      </View>

      <View style={styles.tutorLinha}>
        <View>
          <Text style={styles.tutorNome}>{pet.tutor}</Text>
          <Text style={styles.tutorApto}>{pet.apto}</Text>
        </View>

        <TouchableOpacity style={styles.botaoLigar} onPress={() => handleLigar(pet.telefone)} activeOpacity={0.85}>
          <Text style={styles.botaoLigarTexto}>Ligar para o tutor</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EstadoVazio() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>?</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhum pet encontrado</Text>
      <Text style={styles.estadoVazioTexto}>Tente buscar por outro nome, cor, raça ou apartamento.</Text>
    </View>
  );
}

// ---------- Tela principal ----------

export default function TelaPetsPorteiro() {
  const [pets] = useState<PetCondominio[]>(MOCK_PETS_CONDOMINIO);
  const [busca, setBusca] = useState('');
  const [filtroEspecie, setFiltroEspecie] = useState<FiltroEspecie>('todos');

  const petsFiltrados = useMemo(() => {
    const termo = normalizar(busca.trim());

    return pets.filter((pet) => {
      const combinaEspecie = filtroEspecie === 'todos' || pet.especie === filtroEspecie;
      if (!combinaEspecie) return false;
      if (termo.length === 0) return true;

      const camposBusca = [pet.nome, pet.raca, pet.cor, pet.tutor, pet.apto].map(normalizar);
      return camposBusca.some((campo) => campo.includes(termo));
    });
  }, [pets, busca, filtroEspecie]);

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Pets Cadastrados</Text>
        <Text style={styles.cabecalhoSubtitulo}>Consulta para uso da portaria</Text>
      </View>

      <View style={styles.buscaContainer}>
        <TextInput
          style={styles.buscaInput}
          placeholder="Buscar por nome, cor, raça, tutor ou apto..."
          placeholderTextColor="#A8A199"
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={styles.filtrosConteudo}
      >
        {FILTROS.map((f) => (
          <Chip key={f.id} label={f.nome} ativo={filtroEspecie === f.id} onPress={() => setFiltroEspecie(f.id)} />
        ))}
      </ScrollView>

      <FlatList
        data={petsFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartaoPet pet={item} />}
        contentContainerStyle={petsFiltrados.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
        ListEmptyComponent={<EstadoVazio />}
        showsVerticalScrollIndicator={false}
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
  cabecalhoSubtitulo: {
    fontSize: 12,
    color: '#A8A199',
    marginTop: 2,
  },
  buscaContainer: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  buscaInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2B2823',
    borderWidth: 1,
    borderColor: '#EDE9E1',
  },
  filtrosScroll: {
    flexGrow: 0,
    marginTop: 12,
    marginBottom: 6,
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
    paddingTop: 10,
    paddingBottom: 40,
  },
  listaVaziaContainer: {
    flexGrow: 1,
    paddingTop: 10,
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
  cartaoTopo: {
    flexDirection: 'row',
    marginBottom: 12,
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
  caracteristicasBox: {
    backgroundColor: '#F7F5F1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  caracteristicasLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8377',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  caracteristicasTexto: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 18,
  },
  tutorLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    paddingTop: 12,
  },
  tutorNome: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
  },
  tutorApto: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 1,
  },
  botaoLigar: {
    backgroundColor: '#2B2823',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botaoLigarTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    fontWeight: '700',
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