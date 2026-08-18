/**
 * TelaPetsSindico.tsx
 *
 * Tela de Gestão de Pets para o síndico. Diferente da consulta da portaria
 * (TelaPetsPorteiro.tsx, que é só leitura), aqui o síndico tem uma visão de
 * conformidade — quantos pets há no total, quantos com vacinação pendente e
 * quais apartamentos ultrapassam o limite de pets previsto no regimento —
 * além de poder registrar observações administrativas e remover um cadastro
 * (ex.: morador que já se mudou).
 *
 * O síndico NÃO edita os dados do pet em si (nome, raça, características) —
 * essa informação pertence ao morador e é mantida em TelaMeusPets.tsx. O
 * papel do síndico aqui é de fiscalização, não de edição de cadastro.
 *
 * Front-end apenas — os dados abaixo são mockados (MOCK_PETS_CONDOMINIO).
 *
 * Para integrar com back-end depois, basta substituir:
 *   1. O estado inicial de `pets` por uma chamada à API que traga todos os
 *      pets cadastrados no condomínio (useEffect + fetch/axios)
 *   2. `handleSalvarObservacao` e `handleConfirmarRemocao` por chamadas
 *      POST/DELETE para o seu endpoint
 *   3. `LIMITE_PETS_POR_APTO` por um valor configurável vindo do regimento
 *      interno cadastrado no backend, em vez de uma constante fixa
 *
 * Dependências: apenas React e React Native "puro" — nenhuma lib extra necessária.
 */

import React, { useState, useMemo } from 'react';
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
type FiltroEspecie = 'todos' | Especie;

interface Observacao {
  id: string;
  texto: string;
  dataISO: string;
}

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
  vacinacaoEmDia: boolean;
  observacoes: Observacao[];
}

// ---------- Configuração ----------

const LIMITE_PETS_POR_APTO = 2;

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
// O Apto 301 propositalmente tem 3 pets (acima do limite) e 2 pets estão com
// vacinação pendente, para já demonstrar os alertas de conformidade na tela.

const MOCK_PETS_CONDOMINIO: PetCondominio[] = [
  {
    id: 'p1',
    nome: 'Mel',
    especie: 'cachorro',
    raca: 'SRD (vira-lata)',
    cor: 'Caramelo',
    porte: 'medio',
    caracteristicas: 'Usa coleira azul com plaquinha de identificação.',
    tutor: 'Carla Mendes',
    apto: 'Apto 204',
    telefone: '(19) 99999-1001',
    vacinacaoEmDia: true,
    observacoes: [],
  },
  {
    id: 'p2',
    nome: 'Thor',
    especie: 'cachorro',
    raca: 'Labrador',
    cor: 'Dourado',
    porte: 'grande',
    caracteristicas: 'Coleira vermelha, muito agitado, late com estranhos.',
    tutor: 'Rafael Souza',
    apto: 'Apto 512',
    telefone: '(19) 99999-1002',
    vacinacaoEmDia: true,
    observacoes: [],
  },
  {
    id: 'p3',
    nome: 'Nina',
    especie: 'gato',
    raca: 'Siamês',
    cor: 'Clara com pontas escuras',
    porte: 'pequeno',
    caracteristicas: 'Olhos azuis, pelagem curta.',
    tutor: 'Bruna Lima',
    apto: 'Apto 108',
    telefone: '(19) 99999-1003',
    vacinacaoEmDia: true,
    observacoes: [],
  },
  {
    id: 'p4',
    nome: 'Bidu',
    especie: 'cachorro',
    raca: 'Poodle',
    cor: 'Branco',
    porte: 'pequeno',
    caracteristicas: 'Pelagem cacheada, não é castrado.',
    tutor: 'João Ferreira',
    apto: 'Apto 301',
    telefone: '(19) 99999-1004',
    vacinacaoEmDia: false,
    observacoes: [{ id: 'o1', texto: 'Morador notificado sobre regularização da carteira de vacinação.', dataISO: '2026-07-02T14:00:00.000Z' }],
  },
  {
    id: 'p5',
    nome: 'Duque',
    especie: 'cachorro',
    raca: 'SRD (vira-lata)',
    cor: 'Preto',
    porte: 'medio',
    caracteristicas: 'Bastante dócil, anda sempre com o Bidu.',
    tutor: 'João Ferreira',
    apto: 'Apto 301',
    telefone: '(19) 99999-1004',
    vacinacaoEmDia: true,
    observacoes: [],
  },
  {
    id: 'p6',
    nome: 'Mimi',
    especie: 'gato',
    raca: 'SRD (vira-lata)',
    cor: 'Cinza',
    porte: 'pequeno',
    caracteristicas: 'Terceiro animal do apartamento — acima do limite do regimento.',
    tutor: 'João Ferreira',
    apto: 'Apto 301',
    telefone: '(19) 99999-1004',
    vacinacaoEmDia: false,
    observacoes: [],
  },
  {
    id: 'p7',
    nome: 'Preta',
    especie: 'gato',
    raca: 'SRD (vira-lata)',
    cor: 'Preta',
    porte: 'pequeno',
    caracteristicas: 'Mancha branca no peito, bastante arisca.',
    tutor: 'Ana Paula Rocha',
    apto: 'Apto 604',
    telefone: '(19) 99999-1005',
    vacinacaoEmDia: true,
    observacoes: [],
  },
  {
    id: 'p8',
    nome: 'Rex',
    especie: 'cachorro',
    raca: 'Pastor Alemão',
    cor: 'Preto e caramelo',
    porte: 'grande',
    caracteristicas: 'Coleira de couro marrom, obediente.',
    tutor: 'Marcos Silva',
    apto: 'Apto 402',
    telefone: '(19) 99999-1006',
    vacinacaoEmDia: true,
    observacoes: [],
  },
];

// ---------- Helpers ----------

function normalizar(texto: string): string {
  return texto.toLowerCase();
}

function formatarDataHoraExtensa(dataISO: string): string {
  const data = new Date(dataISO);
  const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dataFormatada} às ${horaFormatada}`;
}

// ---------- Subcomponentes ----------

function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, ativo && styles.chipAtivo]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CartaoResumo({ valor, label, cor }: { valor: number; label: string; cor: string }) {
  return (
    <View style={styles.cartaoResumo}>
      <Text style={[styles.cartaoResumoValor, { color: cor }]}>{valor}</Text>
      <Text style={styles.cartaoResumoLabel}>{label}</Text>
    </View>
  );
}

interface CartaoPetProps {
  pet: PetCondominio;
  aptoExcedeLimite: boolean;
  onAdicionarObservacao: () => void;
  onRemover: () => void;
}

function CartaoPet({ pet, aptoExcedeLimite, onAdicionarObservacao, onRemover }: CartaoPetProps) {
  const config = CONFIG_ESPECIE[pet.especie];
  const ultimaObservacao = pet.observacoes[pet.observacoes.length - 1];

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

      <View style={styles.selosLinha}>
        {!pet.vacinacaoEmDia && (
          <View style={[styles.selo, { backgroundColor: '#FBF1DE' }]}>
            <View style={[styles.seloPonto, { backgroundColor: '#B7791F' }]} />
            <Text style={[styles.seloTexto, { color: '#B7791F' }]}>Vacinação pendente</Text>
          </View>
        )}
        {aptoExcedeLimite && (
          <View style={[styles.selo, { backgroundColor: '#FBEAE8' }]}>
            <View style={[styles.seloPonto, { backgroundColor: '#C0392B' }]} />
            <Text style={[styles.seloTexto, { color: '#C0392B' }]}>Apto acima do limite</Text>
          </View>
        )}
      </View>

      <View style={styles.caracteristicasBox}>
        <Text style={styles.caracteristicasTexto}>{pet.caracteristicas}</Text>
      </View>

      <View style={styles.tutorLinha}>
        <Text style={styles.tutorNome}>{pet.tutor}</Text>
        <Text style={styles.tutorApto}>{pet.apto}</Text>
      </View>

      {ultimaObservacao && (
        <View style={styles.observacaoBox}>
          <Text style={styles.observacaoLabel}>Última observação</Text>
          <Text style={styles.observacaoTexto}>{ultimaObservacao.texto}</Text>
          <Text style={styles.observacaoData}>{formatarDataHoraExtensa(ultimaObservacao.dataISO)}</Text>
        </View>
      )}

      <View style={styles.cartaoAcoes}>
        <TouchableOpacity onPress={onAdicionarObservacao} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.acaoTexto}>Adicionar observação</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemover} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.acaoTextoRemover}>Remover cadastro</Text>
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
      <Text style={styles.estadoVazioTexto}>Tente buscar por outro nome, raça, tutor ou apartamento.</Text>
    </View>
  );
}

// ---------- Modal de observação administrativa ----------

interface ModalObservacaoProps {
  pet: PetCondominio | null;
  onFechar: () => void;
  onSalvar: (id: string, texto: string) => void;
}

function ModalObservacao({ pet, onFechar, onSalvar }: ModalObservacaoProps) {
  const [texto, setTexto] = useState('');

  React.useEffect(() => {
    if (pet) setTexto('');
  }, [pet]);

  const podeSalvar = texto.trim().length > 0;

  return (
    <Modal visible={!!pet} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Adicionar observação</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitulo}>
            {pet?.nome} · {pet?.tutor} ({pet?.apto})
          </Text>

          <Text style={styles.campoLabel}>Observação</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Morador notificado sobre regularização da vacinação..."
            placeholderTextColor="#A8A199"
            value={texto}
            onChangeText={setTexto}
            multiline
            numberOfLines={3}
            maxLength={250}
          />

          <TouchableOpacity
            style={[styles.botaoEnviar, !podeSalvar && styles.botaoEnviarDesabilitado]}
            onPress={() => pet && onSalvar(pet.id, texto.trim())}
            disabled={!podeSalvar}
            activeOpacity={0.85}
          >
            <Text style={styles.botaoEnviarTexto}>Salvar observação</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Modal de confirmação de remoção ----------

function ModalConfirmarRemocao({
  pet,
  onFechar,
  onConfirmar,
}: {
  pet: PetCondominio | null;
  onFechar: () => void;
  onConfirmar: (id: string) => void;
}) {
  return (
    <Modal visible={!!pet} animationType="fade" transparent onRequestClose={onFechar}>
      <View style={styles.modalFundoCentro}>
        <View style={styles.dialogoCartao}>
          <Text style={styles.dialogoTitulo}>Remover cadastro</Text>
          <Text style={styles.dialogoTexto}>
            Remover {pet?.nome} ({pet?.tutor}, {pet?.apto}) da lista de pets do condomínio. Use isso apenas quando o
            animal ou o morador não fizerem mais parte do condomínio — o cadastro correto continua sendo feito pelo
            próprio morador.
          </Text>
          <View style={styles.dialogoAcoes}>
            <TouchableOpacity style={styles.dialogoBotaoVoltar} onPress={onFechar} activeOpacity={0.8}>
              <Text style={styles.dialogoBotaoVoltarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dialogoBotaoExcluir}
              onPress={() => pet && onConfirmar(pet.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.dialogoBotaoConfirmarTexto}>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaPetsSindico() {
  const [pets, setPets] = useState<PetCondominio[]>(MOCK_PETS_CONDOMINIO);
  const [busca, setBusca] = useState('');
  const [filtroEspecie, setFiltroEspecie] = useState<FiltroEspecie>('todos');
  const [petParaObservacao, setPetParaObservacao] = useState<PetCondominio | null>(null);
  const [petParaRemover, setPetParaRemover] = useState<PetCondominio | null>(null);

  const contagemPorApto = useMemo(() => {
    const contagem: Record<string, number> = {};
    pets.forEach((p) => {
      contagem[p.apto] = (contagem[p.apto] ?? 0) + 1;
    });
    return contagem;
  }, [pets]);

  const totalVacinacaoPendente = pets.filter((p) => !p.vacinacaoEmDia).length;
  const totalAptosAcimaLimite = Object.values(contagemPorApto).filter((qtd) => qtd > LIMITE_PETS_POR_APTO).length;

  const petsFiltrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return pets.filter((pet) => {
      const combinaEspecie = filtroEspecie === 'todos' || pet.especie === filtroEspecie;
      if (!combinaEspecie) return false;
      if (termo.length === 0) return true;
      const campos = [pet.nome, pet.raca, pet.cor, pet.tutor, pet.apto].map(normalizar);
      return campos.some((campo) => campo.includes(termo));
    });
  }, [pets, busca, filtroEspecie]);

  function handleSalvarObservacao(id: string, texto: string) {
    setPets((atual) =>
      atual.map((p) =>
        p.id === id
          ? { ...p, observacoes: [...p.observacoes, { id: String(Date.now()), texto, dataISO: new Date().toISOString() }] }
          : p
      )
    );
    setPetParaObservacao(null);
  }

  function handleConfirmarRemocao(id: string) {
    setPets((atual) => atual.filter((p) => p.id !== id));
    setPetParaRemover(null);
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Pets do Condomínio</Text>
      </View>

      <View style={styles.resumoLinha}>
        <CartaoResumo valor={pets.length} label="Pets cadastrados" cor="#2B2823" />
        <CartaoResumo valor={totalVacinacaoPendente} label="Vacinação pendente" cor="#B7791F" />
        <CartaoResumo valor={totalAptosAcimaLimite} label="Aptos acima do limite" cor="#C0392B" />
      </View>

      <View style={styles.buscaContainer}>
        <TextInput
          style={styles.buscaInput}
          placeholder="Buscar por nome, raça, tutor ou apto..."
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
        renderItem={({ item }) => (
          <CartaoPet
            pet={item}
            aptoExcedeLimite={(contagemPorApto[item.apto] ?? 0) > LIMITE_PETS_POR_APTO}
            onAdicionarObservacao={() => setPetParaObservacao(item)}
            onRemover={() => setPetParaRemover(item)}
          />
        )}
        contentContainerStyle={petsFiltrados.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
        ListEmptyComponent={<EstadoVazio />}
        showsVerticalScrollIndicator={false}
      />

      <ModalObservacao
        pet={petParaObservacao}
        onFechar={() => setPetParaObservacao(null)}
        onSalvar={handleSalvarObservacao}
      />

      <ModalConfirmarRemocao
        pet={petParaRemover}
        onFechar={() => setPetParaRemover(null)}
        onConfirmar={handleConfirmarRemocao}
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
    fontSize: 24,
    fontWeight: '700',
    color: '#2B2823',
  },
  resumoLinha: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 12,
  },
  cartaoResumo: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cartaoResumoValor: {
    fontSize: 20,
    fontWeight: '700',
  },
  cartaoResumoLabel: {
    fontSize: 10,
    color: '#8A8377',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
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
  selosLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
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
  caracteristicasBox: {
    backgroundColor: '#F7F5F1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  caracteristicasTexto: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 18,
  },
  tutorLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tutorNome: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
  },
  tutorApto: {
    fontSize: 12,
    color: '#8A8377',
  },
  observacaoBox: {
    backgroundColor: '#EAF1FB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  observacaoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3D6FB4',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  observacaoTexto: {
    fontSize: 12,
    color: '#2B2823',
    lineHeight: 17,
    marginBottom: 3,
  },
  observacaoData: {
    fontSize: 10,
    color: '#8A8377',
  },
  cartaoAcoes: {
    flexDirection: 'row',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    paddingTop: 10,
  },
  acaoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D6FB4',
  },
  acaoTextoRemover: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C0392B',
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
    fontSize: 13,
    color: '#8A8377',
    marginBottom: 8,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginBottom: 8,
    marginTop: 8,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  botaoEnviar: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  botaoEnviarDesabilitado: {
    backgroundColor: '#D8D3C8',
  },
  botaoEnviarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
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
    marginBottom: 8,
  },
  dialogoTexto: {
    fontSize: 13,
    color: '#6B6459',
    lineHeight: 19,
  },
  dialogoAcoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
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
  dialogoBotaoExcluir: {
    flex: 1,
    backgroundColor: '#C0392B',
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