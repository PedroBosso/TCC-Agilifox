// Tela do síndico para lançar uma conta para os moradores, com o valor de cada um.

import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TituloComVoltar } from '../components/BotaoVoltar';
import { supabase } from '../lib/supabase';

interface Morador {
  id: string;
  nome: string;
  apto: string | null;
  bloco: string | null;
}

const DIAS_PARA_ESCOLHER = 60;
const DIAS_ATE_VENCIMENTO_PADRAO = 10;
const LARGURA_DIA = 58;

function addDias(data: Date, dias: number): Date {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarMesAno(data: Date): string {
  const texto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarDataExtensa(data: Date): string {
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarValorCampo(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

// Aceita "450", "450,50", "1.500,00" e "450.50". Devolve null quando o campo está vazio.
function lerValor(texto: string): number | null | 'invalido' {
  const limpo = texto.replace(/\s/g, '').replace('R$', '');
  if (!limpo) return null;
  if (!/^[\d.,]+$/.test(limpo)) return 'invalido';

  let normalizado = limpo;
  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    normalizado = limpo.replace(/\./g, '');
  }

  const valor = Number(normalizado);
  if (!Number.isFinite(valor) || valor <= 0 || valor >= 100000000) return 'invalido';
  return Math.round(valor * 100) / 100;
}

function compararTexto(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b, 'pt-BR', { numeric: true });
}

function ordenarMoradores(lista: Morador[]): Morador[] {
  return [...lista].sort(
    (a, b) => compararTexto(a.bloco, b.bloco) || compararTexto(a.apto, b.apto) || a.nome.localeCompare(b.nome, 'pt-BR')
  );
}

function ItemDia({ data, selecionado, onPress }: { data: Date; selecionado: boolean; onPress: () => void }) {
  const mes = data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const semana = data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return (
    <Pressable style={[styles.itemDia, selecionado && styles.itemDiaSelecionado]} onPress={onPress}>
      <Text style={[styles.itemDiaMes, selecionado && styles.itemDiaTextoSelecionado]}>{mes}</Text>
      <Text style={[styles.itemDiaNumero, selecionado && styles.itemDiaTextoSelecionado]}>{data.getDate()}</Text>
      <Text style={[styles.itemDiaSemana, selecionado && styles.itemDiaTextoSelecionado]}>{semana}</Text>
    </Pressable>
  );
}

export default function LancarConta() {
  const hoje = useMemo(() => {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    return data;
  }, []);
  const dias = useMemo(() => Array.from({ length: DIAS_PARA_ESCOLHER }, (_, i) => addDias(hoje, i)), [hoje]);
  const listaDiasRef = useRef<ScrollView>(null);
  const diasJaRolados = useRef(false);

  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [assunto, setAssunto] = useState('');
  const [vencimento, setVencimento] = useState<Date>(() => addDias(hoje, DIAS_ATE_VENCIMENTO_PADRAO));
  const [valores, setValores] = useState<Record<string, string>>({});
  const [valorTodos, setValorTodos] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (ativo) setAutorizado(false);
        return;
      }

      const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (perfil?.role !== 'sindico') {
        if (ativo) setAutorizado(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, apto, bloco')
        .eq('role', 'morador')
        .eq('status', 'ativo');

      if (!ativo) return;
      if (error) Alert.alert('Erro', 'Não foi possível carregar os moradores.');
      setMoradores(ordenarMoradores(data ?? []));
      setAutorizado(true);
    })();

    return () => {
      ativo = false;
    };
  }, []);

  // Moradores já vêm ordenados por bloco; aqui eles são separados em grupos para a lista.
  const grupos = useMemo(() => {
    const lista: { bloco: string | null; moradores: Morador[] }[] = [];
    moradores.forEach((morador) => {
      const ultimo = lista[lista.length - 1];
      if (ultimo && ultimo.bloco === morador.bloco) {
        ultimo.moradores.push(morador);
      } else {
        lista.push({ bloco: morador.bloco, moradores: [morador] });
      }
    });
    return lista;
  }, [moradores]);

  const leituras = moradores.map((morador) => ({ morador, valor: lerValor(valores[morador.id] ?? '') }));
  const cobrados = leituras.flatMap((item) => (typeof item.valor === 'number' ? [{ morador: item.morador, valor: item.valor }] : []));
  const temValorInvalido = leituras.some((item) => item.valor === 'invalido');
  const total = cobrados.reduce((soma, item) => soma + item.valor, 0);
  const podeLancar = assunto.trim().length >= 3 && cobrados.length > 0 && !temValorInvalido && !salvando;

  function alterarValor(moradorId: string, texto: string) {
    setValores((atuais) => ({ ...atuais, [moradorId]: texto }));
  }

  function aplicarATodos() {
    const valor = lerValor(valorTodos);
    if (typeof valor !== 'number') {
      Alert.alert('Atenção', 'Digite um valor válido, por exemplo 450,00.');
      return;
    }
    const texto = formatarValorCampo(valor);
    setValores(Object.fromEntries(moradores.map((morador) => [morador.id, texto])));
  }

  function limparValores() {
    setValores({});
  }

  function textoMotivoBloqueio(): string | null {
    if (assunto.trim().length < 3) return 'Escreva o assunto da conta.';
    if (temValorInvalido) return 'Corrija os valores marcados em vermelho.';
    if (cobrados.length === 0) return 'Coloque o valor de pelo menos um morador.';
    return null;
  }

  function confirmarLancamento() {
    if (!podeLancar) return;
    const quantidade = cobrados.length === 1 ? '1 morador' : `${cobrados.length} moradores`;

    Alert.alert(
      'Lançar conta',
      `"${assunto.trim()}" para ${quantidade}, total de ${formatarMoeda(total)}, com vencimento em ${vencimento.toLocaleDateString('pt-BR')}.`,
      [
        { text: 'Revisar', style: 'cancel' },
        { text: 'Lançar', onPress: lancar },
      ]
    );
  }

  async function lancar() {
    setSalvando(true);

    const linhas = cobrados.map(({ morador, valor }) => ({
      morador_id: morador.id,
      referencia: formatarMesAno(vencimento),
      descricao: assunto.trim(),
      valor,
      vencimento: formatarDataISO(vencimento),
      status: 'pendente',
    }));

    const { error } = await supabase.from('faturas').insert(linhas);
    setSalvando(false);

    if (error) {
      Alert.alert('Erro', 'Não foi possível lançar a conta. Nenhuma cobrança foi criada.');
      return;
    }

    const aviso =
      cobrados.length === 1
        ? 'O morador já pode ver a conta na tela de Pagamentos.'
        : `Os ${cobrados.length} moradores já podem ver a conta na tela de Pagamentos.`;
    Alert.alert('Conta lançada', aviso, [{ text: 'OK', onPress: () => router.back() }]);
  }

  const cabecalho = (
    <View style={styles.cabecalho}>
      <TituloComVoltar>
        <Text style={styles.cabecalhoSaudacao}>Financeiro</Text>
        <Text style={styles.cabecalhoTitulo}>Lançar conta</Text>
      </TituloComVoltar>
    </View>
  );

  if (autorizado === null) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.tela, styles.centro]}>
        <ActivityIndicator size="large" color="#2B2823" />
      </SafeAreaView>
    );
  }

  if (!autorizado) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.tela}>
        {cabecalho}
        <View style={styles.centro}>
          <Text style={styles.avisoTexto}>Apenas o síndico pode lançar contas.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const motivoBloqueio = textoMotivoBloqueio();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
      {cabecalho}

      <ScrollView
        style={styles.rolagem}
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.campoLabel}>Assunto da conta</Text>
        <TextInput
          style={styles.input}
          value={assunto}
          onChangeText={setAssunto}
          placeholder="Ex.: Taxa condominial de novembro"
          placeholderTextColor="#A8A199"
          maxLength={80}
        />

        <Text style={styles.campoLabel}>Vencimento</Text>
        <Text style={styles.vencimentoEscolhido}>{formatarDataExtensa(vencimento)}</Text>
        <ScrollView
          ref={listaDiasRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listaDias}
          onLayout={() => {
            // Mostra o vencimento padrão já visível, só na primeira vez que a lista aparece.
            if (diasJaRolados.current) return;
            diasJaRolados.current = true;
            listaDiasRef.current?.scrollTo({ x: LARGURA_DIA * (DIAS_ATE_VENCIMENTO_PADRAO - 2), animated: false });
          }}
        >
          {dias.map((data) => (
            <ItemDia
              key={formatarDataISO(data)}
              data={data}
              selecionado={formatarDataISO(data) === formatarDataISO(vencimento)}
              onPress={() => setVencimento(data)}
            />
          ))}
        </ScrollView>

        <Text style={styles.campoLabel}>Valor para cada morador</Text>
        <Text style={styles.ajuda}>Deixe em branco quem não deve receber esta conta.</Text>

        <View style={styles.linhaTodos}>
          <View style={[styles.campoValor, styles.campoValorTodos]}>
            <Text style={styles.prefixo}>R$</Text>
            <TextInput
              style={styles.inputValor}
              value={valorTodos}
              onChangeText={setValorTodos}
              placeholder="Mesmo valor para todos"
              placeholderTextColor="#A8A199"
              keyboardType="decimal-pad"
            />
          </View>
          <Pressable style={styles.botaoAplicar} onPress={aplicarATodos}>
            <Text style={styles.botaoAplicarTexto}>Aplicar</Text>
          </Pressable>
        </View>
        {Object.keys(valores).length > 0 && (
          <Pressable onPress={limparValores} hitSlop={8}>
            <Text style={styles.limparTexto}>Limpar todos os valores</Text>
          </Pressable>
        )}

        {moradores.length === 0 ? (
          <Text style={styles.avisoTexto}>
            Nenhum morador ativo cadastrado. Cadastre os moradores antes de lançar contas.
          </Text>
        ) : (
          grupos.map((grupo) => (
            <View key={grupo.bloco ?? 'sem-bloco'}>
              <Text style={styles.blocoTitulo}>{grupo.bloco ?? 'Sem bloco'}</Text>
              {grupo.moradores.map((morador) => {
                const invalido = lerValor(valores[morador.id] ?? '') === 'invalido';
                return (
                  <View key={morador.id} style={styles.linhaMorador}>
                    <View style={styles.moradorInfo}>
                      <Text style={styles.moradorNome} numberOfLines={1}>
                        {morador.nome}
                      </Text>
                      <Text style={styles.moradorUnidade}>
                        {morador.apto ? `Apto ${morador.apto}` : 'Apartamento não informado'}
                      </Text>
                    </View>
                    <View style={[styles.campoValor, invalido && styles.campoValorInvalido]}>
                      <Text style={styles.prefixo}>R$</Text>
                      <TextInput
                        style={styles.inputValor}
                        value={valores[morador.id] ?? ''}
                        onChangeText={(texto) => alterarValor(morador.id, texto)}
                        placeholder="0,00"
                        placeholderTextColor="#A8A199"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.rodape}>
        <Text style={styles.rodapeResumo}>
          {cobrados.length === 1 ? '1 morador' : `${cobrados.length} moradores`} · Total {formatarMoeda(total)}
        </Text>
        {motivoBloqueio && <Text style={styles.rodapeAviso}>{motivoBloqueio}</Text>}
        <Pressable
          style={[styles.botaoLancar, !podeLancar && styles.botaoLancarDesabilitado]}
          onPress={confirmarLancamento}
          disabled={!podeLancar}
        >
          {salvando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botaoLancarTexto}>Lançar conta</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  rolagem: {
    flex: 1,
  },
  conteudo: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2823',
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2B2823',
    borderWidth: 1,
    borderColor: '#EDE9E1',
  },
  vencimentoEscolhido: {
    fontSize: 14,
    color: '#6B6459',
    marginBottom: 10,
  },
  listaDias: {
    paddingRight: 4,
  },
  itemDia: {
    width: 50,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F0ECE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  itemDiaSelecionado: {
    backgroundColor: '#2B2823',
  },
  itemDiaMes: {
    fontSize: 10,
    color: '#8A8377',
    textTransform: 'uppercase',
  },
  itemDiaNumero: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2B2823',
    marginVertical: 2,
  },
  itemDiaSemana: {
    fontSize: 10,
    color: '#8A8377',
  },
  itemDiaTextoSelecionado: {
    color: '#FFFFFF',
  },
  ajuda: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: -4,
    marginBottom: 10,
  },
  linhaTodos: {
    flexDirection: 'row',
    gap: 10,
  },
  campoValor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE9E1',
    paddingHorizontal: 10,
    width: 130,
  },
  campoValorTodos: {
    flex: 1,
    width: undefined,
  },
  campoValorInvalido: {
    borderColor: '#C0392B',
    backgroundColor: '#FBEAE8',
  },
  prefixo: {
    fontSize: 13,
    color: '#8A8377',
    marginRight: 4,
  },
  inputValor: {
    flex: 1,
    fontSize: 15,
    color: '#2B2823',
    paddingVertical: 10,
  },
  botaoAplicar: {
    backgroundColor: '#2B2823',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  botaoAplicarTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  limparTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C0392B',
    marginTop: 10,
  },
  blocoTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8377',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  linhaMorador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  moradorInfo: {
    flex: 1,
  },
  moradorNome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2823',
  },
  moradorUnidade: {
    fontSize: 12,
    color: '#8A8377',
    marginTop: 1,
  },
  avisoTexto: {
    fontSize: 14,
    color: '#6B6459',
    textAlign: 'center',
    marginTop: 24,
  },
  rodape: {
    borderTopWidth: 1,
    borderTopColor: '#EDE9E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  rodapeResumo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2823',
    textAlign: 'center',
  },
  rodapeAviso: {
    fontSize: 12,
    color: '#8A8377',
    textAlign: 'center',
    marginTop: 4,
  },
  botaoLancar: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoLancarDesabilitado: {
    backgroundColor: '#D8D3C8',
  },
  botaoLancarTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
