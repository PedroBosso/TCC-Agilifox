// Tela de Gestão de Pets do síndico: fiscalização (conformidade, observações, remoção de cadastro) — dados vêm do Supabase.

import React, { useEffect, useState, useMemo } from 'react';
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
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

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
  moradorId: string;
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
  const ultimaObservacao = pet.observacoes[0];

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
  const [pets, setPets] = useState<PetCondominio[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroEspecie, setFiltroEspecie] = useState<FiltroEspecie>('todos');
  const [petParaObservacao, setPetParaObservacao] = useState<PetCondominio | null>(null);
  const [petParaRemover, setPetParaRemover] = useState<PetCondominio | null>(null);

  useEffect(() => {
    carregarPets();
  }, []);

  async function carregarPets() {
    const { data: petsData, error } = await supabase
      .from('pets')
      .select('id, morador_id, nome, especie, raca, cor, porte, caracteristicas, vacinacao_em_dia');

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar os pets do condomínio.');
      return;
    }

    const linhas = petsData ?? [];
    if (linhas.length === 0) {
      setPets([]);
      return;
    }

    const moradorIds = [...new Set(linhas.map((p) => p.morador_id))];
    const { data: perfis } = await supabase.from('profiles').select('id, nome, apto, telefone').in('id', moradorIds);
    const perfilPorId = new Map((perfis ?? []).map((p) => [p.id, p]));

    const petIds = linhas.map((p) => p.id);
    const { data: observacoesData } = await supabase
      .from('pet_observacoes')
      .select('id, pet_id, texto, criado_em')
      .in('pet_id', petIds)
      .order('criado_em', { ascending: false });

    const observacoesPorPet = new Map<string, Observacao[]>();
    (observacoesData ?? []).forEach((o) => {
      const lista = observacoesPorPet.get(o.pet_id) ?? [];
      lista.push({ id: o.id, texto: o.texto, dataISO: o.criado_em });
      observacoesPorPet.set(o.pet_id, lista);
    });

    setPets(
      linhas.map((p) => {
        const perfil = perfilPorId.get(p.morador_id);
        return {
          id: p.id,
          nome: p.nome,
          especie: p.especie,
          raca: p.raca ?? '',
          cor: p.cor,
          porte: p.porte,
          caracteristicas: p.caracteristicas ?? '',
          moradorId: p.morador_id,
          tutor: perfil?.nome ?? 'Morador não identificado',
          apto: perfil?.apto ?? '-',
          telefone: perfil?.telefone ?? '',
          vacinacaoEmDia: p.vacinacao_em_dia ?? false,
          observacoes: observacoesPorPet.get(p.id) ?? [],
        };
      })
    );
  }

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

  async function handleSalvarObservacao(id: string, texto: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Erro', 'Não foi possível identificar o usuário logado.');
      return;
    }

    const { error } = await supabase.from('pet_observacoes').insert({ pet_id: id, autor_id: user.id, texto });
    if (error) {
      Alert.alert('Erro', 'Não foi possível salvar a observação.');
      return;
    }

    const { data: observacoesAtualizadas } = await supabase
      .from('pet_observacoes')
      .select('id, texto, criado_em')
      .eq('pet_id', id)
      .order('criado_em', { ascending: false });

    setPets((atual) =>
      atual.map((p) =>
        p.id === id
          ? {
              ...p,
              observacoes: (observacoesAtualizadas ?? []).map((o) => ({ id: o.id, texto: o.texto, dataISO: o.criado_em })),
            }
          : p
      )
    );
    setPetParaObservacao(null);
  }

  async function handleConfirmarRemocao(id: string) {
    const { error } = await supabase.from('pets').delete().eq('id', id);
    if (error) {
      Alert.alert('Erro', 'Não foi possível remover o cadastro do pet.');
      return;
    }
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