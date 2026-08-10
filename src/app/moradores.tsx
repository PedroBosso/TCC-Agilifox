import React, { useMemo, useState } from 'react';
import {
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

type StatusMorador = 'ativo' | 'inativo';
type FiltroStatus = 'todos' | StatusMorador;

interface Morador {
  id: string;
  nome: string;
  dataNascimentoISO: string;
  cpf: string;
  apto: string;
  bloco: string;
  telefone: string;
  email: string;
  status: StatusMorador;
}

interface DadosEditaveis {
  nome: string;
  dataNascimentoISO: string;
  apto: string;
  bloco: string;
  telefone: string;
  email: string;
}

// ---------- Helpers ----------

const PALETA_AVATAR = ['#3D6FB4', '#7E57A6', '#B7791F', '#2F855A', '#C0392B'];

function corAvatar(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return PALETA_AVATAR[Math.abs(hash) % PALETA_AVATAR.length];
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(' ').filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
  return (primeira + ultima).toUpperCase();
}

function calcularIdade(dataNascimentoISO: string): number {
  const hoje = new Date();
  const nascimento = new Date(dataNascimentoISO);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

function formatarDataCurta(dataISO: string): string {
  return new Date(dataISO).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function mascararCpf(cpf: string): string {
  const digitos = cpf.replace(/\D/g, '');
  const ultimosDois = digitos.slice(-2);
  return `***.***.***-${ultimosDois}`;
}

function extrairDadosEditaveis(morador: Morador): DadosEditaveis {
  return {
    nome: morador.nome,
    dataNascimentoISO: morador.dataNascimentoISO,
    apto: morador.apto,
    bloco: morador.bloco,
    telefone: morador.telefone,
    email: morador.email,
  };
}

interface DiferencaCampo {
  label: string;
  de: string;
  para: string;
}

function calcularDiferencas(original: Morador, editado: DadosEditaveis): DiferencaCampo[] {
  const diferencas: DiferencaCampo[] = [];

  if (editado.nome !== original.nome) {
    diferencas.push({ label: 'Nome', de: original.nome, para: editado.nome });
  }
  if (editado.dataNascimentoISO !== original.dataNascimentoISO) {
    diferencas.push({
      label: 'Data de nascimento',
      de: formatarDataCurta(original.dataNascimentoISO),
      para: formatarDataCurta(editado.dataNascimentoISO),
    });
  }
  if (editado.apto !== original.apto) {
    diferencas.push({ label: 'Apartamento', de: original.apto, para: editado.apto });
  }
  if (editado.bloco !== original.bloco) {
    diferencas.push({ label: 'Bloco', de: original.bloco, para: editado.bloco });
  }
  if (editado.telefone !== original.telefone) {
    diferencas.push({ label: 'Telefone', de: original.telefone, para: editado.telefone });
  }
  if (editado.email !== original.email) {
    diferencas.push({ label: 'E-mail', de: original.email, para: editado.email });
  }

  return diferencas;
}

// ---------- Dados mockados ----------

const MOCK_MORADORES: Morador[] = [
  { id: 'r1', nome: 'Carla Mendes', dataNascimentoISO: '1987-04-12', cpf: '123.456.789-01', apto: '204', bloco: 'A', telefone: '(19) 99999-1001', email: 'carla.mendes@email.com', status: 'ativo' },
  { id: 'r2', nome: 'Rafael Souza', dataNascimentoISO: '1993-11-02', cpf: '234.567.890-12', apto: '305', bloco: 'A', telefone: '(19) 99999-1002', email: 'rafael.souza@email.com', status: 'ativo' },
  { id: 'r3', nome: 'Bruna Lima', dataNascimentoISO: '1979-07-25', cpf: '345.678.901-23', apto: '108', bloco: 'B', telefone: '(19) 99999-1003', email: 'bruna.lima@email.com', status: 'ativo' },
  { id: 'r4', nome: 'João Ferreira', dataNascimentoISO: '1965-01-30', cpf: '456.789.012-34', apto: '301', bloco: 'B', telefone: '(19) 99999-1004', email: 'joao.ferreira@email.com', status: 'inativo' },
  { id: 'r5', nome: 'Ana Paula Rocha', dataNascimentoISO: '2001-09-18', cpf: '567.890.123-45', apto: '604', bloco: 'C', telefone: '(19) 99999-1005', email: 'anapaula.rocha@email.com', status: 'ativo' },
  { id: 'r6', nome: 'Marcos Silva', dataNascimentoISO: '1990-05-08', cpf: '678.901.234-56', apto: '402', bloco: 'C', telefone: '(19) 99999-1006', email: 'marcos.silva@email.com', status: 'ativo' },
];

// ---------- Subcomponentes ----------

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

function Avatar({ nome, tamanho = 44 }: { nome: string; tamanho?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: corAvatar(nome) },
      ]}
    >
      <Text style={[styles.avatarTexto, { fontSize: tamanho * 0.38 }]}>{iniciais(nome)}</Text>
    </View>
  );
}

interface CartaoMoradorProps {
  morador: Morador;
  onPress: () => void;
}

function CartaoMorador({ morador, onPress }: CartaoMoradorProps) {
  return (
    <TouchableOpacity style={styles.cartao} onPress={onPress} activeOpacity={0.85}>
      <Avatar nome={morador.nome} />

      <View style={styles.cartaoInfo}>
        <Text style={styles.cartaoNome}>{morador.nome}</Text>
        <Text style={styles.cartaoDetalhe}>
          Apto {morador.apto} - Bloco {morador.bloco} · {calcularIdade(morador.dataNascimentoISO)} anos
        </Text>
        <Text style={styles.cartaoCpf}>CPF {mascararCpf(morador.cpf)}</Text>
      </View>

      <Selo
        texto={morador.status === 'ativo' ? 'Ativo' : 'Inativo'}
        cor={morador.status === 'ativo' ? '#2F855A' : '#8A8377'}
        fundo={morador.status === 'ativo' ? '#E7F4ED' : '#F0ECE5'}
      />
    </TouchableOpacity>
  );
}

function EstadoVazio() {
  return (
    <View style={styles.estadoVazio}>
      <View style={styles.estadoVazioCirculo}>
        <Text style={styles.estadoVazioIcone}>?</Text>
      </View>
      <Text style={styles.estadoVazioTitulo}>Nenhum morador encontrado</Text>
      <Text style={styles.estadoVazioTexto}>Tente buscar por outro nome, apartamento ou CPF.</Text>
    </View>
  );
}

function LinhaInfo({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.linhaInfo}>
      <Text style={styles.linhaInfoLabel}>{label}</Text>
      <Text style={styles.linhaInfoValor}>{valor}</Text>
    </View>
  );
}

// ---------- Modal: detalhe do morador ----------

interface ModalDetalheProps {
  morador: Morador | null;
  onFechar: () => void;
  onEditar: () => void;
  onAlternarStatus: () => void;
  onRemover: () => void;
}

function ModalDetalhe({ morador, onFechar, onEditar, onAlternarStatus, onRemover }: ModalDetalheProps) {
  const [cpfVisivel, setCpfVisivel] = useState(false);

  function fecharEResetar() {
    setCpfVisivel(false);
    onFechar();
  }

  return (
    <Modal visible={!!morador} animationType="slide" transparent onRequestClose={fecharEResetar}>
      <View style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Dados do morador</Text>
            <TouchableOpacity onPress={fecharEResetar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Fechar</Text>
            </TouchableOpacity>
          </View>

          {morador && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detalheTopo}>
                <Avatar nome={morador.nome} tamanho={64} />
                <Text style={styles.detalheNome}>{morador.nome}</Text>
                <Selo
                  texto={morador.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  cor={morador.status === 'ativo' ? '#2F855A' : '#8A8377'}
                  fundo={morador.status === 'ativo' ? '#E7F4ED' : '#F0ECE5'}
                />
              </View>

              <View style={styles.detalheBox}>
                <LinhaInfo label="Idade" valor={`${calcularIdade(morador.dataNascimentoISO)} anos`} />
                <LinhaInfo label="Data de nascimento" valor={formatarDataCurta(morador.dataNascimentoISO)} />
                <LinhaInfo label="Apartamento" valor={`${morador.apto} - Bloco ${morador.bloco}`} />
                <LinhaInfo label="Telefone" valor={morador.telefone} />
                <LinhaInfo label="E-mail" valor={morador.email} />

                <View style={styles.linhaInfo}>
                  <Text style={styles.linhaInfoLabel}>CPF</Text>
                  <View style={styles.cpfLinha}>
                    <Text style={styles.linhaInfoValor}>{cpfVisivel ? morador.cpf : mascararCpf(morador.cpf)}</Text>
                    <TouchableOpacity onPress={() => setCpfVisivel((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.cpfToggle}>{cpfVisivel ? 'Ocultar' : 'Mostrar'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.botaoPrimario} onPress={onEditar} activeOpacity={0.85}>
                <Text style={styles.botaoPrimarioTexto}>Editar informações</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.botaoSecundario} onPress={onAlternarStatus} activeOpacity={0.85}>
                <Text style={styles.botaoSecundarioTexto}>
                  {morador.status === 'ativo' ? 'Desativar acesso' : 'Reativar acesso'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.botaoTexto} onPress={onRemover} activeOpacity={0.7}>
                <Text style={styles.botaoTextoRemover}>Remover cadastro</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------- Modal: editar informações ----------

interface ModalEditarProps {
  morador: Morador | null;
  onFechar: () => void;
  onProsseguir: (dados: DadosEditaveis) => void;
}

function ModalEditar({ morador, onFechar, onProsseguir }: ModalEditarProps) {
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [apto, setApto] = useState('');
  const [bloco, setBloco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  React.useEffect(() => {
    if (morador) {
      setNome(morador.nome);
      setDataNascimento(formatarDataCurta(morador.dataNascimentoISO));
      setApto(morador.apto);
      setBloco(morador.bloco);
      setTelefone(morador.telefone);
      setEmail(morador.email);
    }
  }, [morador]);

  const podeProsseguir = nome.trim().length > 0 && apto.trim().length > 0;

  function converterParaISO(dataBr: string, fallbackISO: string): string {
    const partes = dataBr.split('/');
    if (partes.length !== 3) return fallbackISO;
    const [dia, mes, ano] = partes;
    if (!dia || !mes || !ano) return fallbackISO;
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
    return isNaN(data.getTime()) ? fallbackISO : data.toISOString();
  }

  function handleProsseguir() {
    if (!morador || !podeProsseguir) return;
    onProsseguir({
      nome: nome.trim(),
      dataNascimentoISO: converterParaISO(dataNascimento.trim(), morador.dataNascimentoISO),
      apto: apto.trim(),
      bloco: bloco.trim(),
      telefone: telefone.trim(),
      email: email.trim(),
    });
  }

  return (
    <Modal visible={!!morador} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundo}>
        <View style={styles.modalCartao}>
          <View style={styles.modalAlcinha} />

          <View style={styles.modalCabecalho}>
            <Text style={styles.modalTitulo}>Editar informações</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalFechar}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitulo}>
            O CPF não é editável por aqui — mudanças nesse campo exigem verificação de documento fora do app.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.campoLabel}>Nome completo</Text>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome completo" placeholderTextColor="#A8A199" />

            <Text style={styles.campoLabel}>Data de nascimento</Text>
            <TextInput
              style={styles.input}
              value={dataNascimento}
              onChangeText={setDataNascimento}
              placeholder="dd/mm/aaaa"
              placeholderTextColor="#A8A199"
              keyboardType="numeric"
            />

            <View style={styles.linhaDupla}>
              <View style={styles.campoMetade}>
                <Text style={styles.campoLabel}>Apartamento</Text>
                <TextInput style={styles.input} value={apto} onChangeText={setApto} placeholder="204" placeholderTextColor="#A8A199" />
              </View>
              <View style={styles.campoMetade}>
                <Text style={styles.campoLabel}>Bloco</Text>
                <TextInput style={styles.input} value={bloco} onChangeText={setBloco} placeholder="A" placeholderTextColor="#A8A199" />
              </View>
            </View>

            <Text style={styles.campoLabel}>Telefone</Text>
            <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="(19) 99999-0000" placeholderTextColor="#A8A199" keyboardType="phone-pad" />

            <Text style={styles.campoLabel}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@exemplo.com"
              placeholderTextColor="#A8A199"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TouchableOpacity
              style={[styles.botaoPrimario, !podeProsseguir && styles.botaoDesabilitado]}
              onPress={handleProsseguir}
              disabled={!podeProsseguir}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoPrimarioTexto}>Revisar alterações</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Modal: confirmar alteração (mostra o que vai mudar) ----------

interface ModalConfirmarAlteracaoProps {
  morador: Morador | null;
  dadosEditados: DadosEditaveis | null;
  onVoltar: () => void;
  onConfirmar: () => void;
}

function ModalConfirmarAlteracao({ morador, dadosEditados, onVoltar, onConfirmar }: ModalConfirmarAlteracaoProps) {
  const diferencas = useMemo(
    () => (morador && dadosEditados ? calcularDiferencas(morador, dadosEditados) : []),
    [morador, dadosEditados]
  );

  return (
    <Modal visible={!!dadosEditados} animationType="fade" transparent onRequestClose={onVoltar}>
      <View style={styles.modalFundoCentro}>
        <View style={styles.dialogoCartao}>
          <Text style={styles.dialogoTitulo}>Confirmar alteração</Text>
          <Text style={styles.dialogoTexto}>
            Você está prestes a alterar o cadastro de {morador?.nome}. Revise as mudanças abaixo antes de confirmar.
          </Text>

          <View style={styles.diferencasBox}>
            {diferencas.length === 0 ? (
              <Text style={styles.semAlteracoesTexto}>Nenhum campo foi alterado.</Text>
            ) : (
              diferencas.map((dif) => (
                <View key={dif.label} style={styles.diferencaLinha}>
                  <Text style={styles.diferencaLabel}>{dif.label}</Text>
                  <Text style={styles.diferencaValores}>
                    <Text style={styles.diferencaDe}>{dif.de}</Text>
                    {'  →  '}
                    <Text style={styles.diferencaPara}>{dif.para}</Text>
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.dialogoAcoes}>
            <TouchableOpacity style={styles.dialogoBotaoCancelar} onPress={onVoltar} activeOpacity={0.8}>
              <Text style={styles.dialogoBotaoCancelarTexto}>Voltar e revisar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogoBotaoConfirmar, diferencas.length === 0 && styles.botaoDesabilitado]}
              onPress={onConfirmar}
              disabled={diferencas.length === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.dialogoBotaoConfirmarTexto}>Confirmar alteração</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Modal: confirmar ativar/desativar ----------

interface ModalConfirmarStatusProps {
  morador: Morador | null;
  onCancelar: () => void;
  onConfirmar: () => void;
}

function ModalConfirmarStatus({ morador, onCancelar, onConfirmar }: ModalConfirmarStatusProps) {
  const desativando = morador?.status === 'ativo';

  return (
    <Modal visible={!!morador} animationType="fade" transparent onRequestClose={onCancelar}>
      <View style={styles.modalFundoCentro}>
        <View style={styles.dialogoCartao}>
          <Text style={styles.dialogoTitulo}>{desativando ? 'Desativar acesso' : 'Reativar acesso'}</Text>
          <Text style={styles.dialogoTexto}>
            {desativando
              ? `${morador?.nome} não conseguirá mais fazer login no aplicativo até que o acesso seja reativado. Os dados do cadastro são mantidos.`
              : `${morador?.nome} voltará a ter acesso normal ao aplicativo.`}
          </Text>

          <View style={styles.dialogoAcoes}>
            <TouchableOpacity style={styles.dialogoBotaoCancelar} onPress={onCancelar} activeOpacity={0.8}>
              <Text style={styles.dialogoBotaoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogoBotaoConfirmar, desativando && styles.dialogoBotaoConfirmarAlerta]}
              onPress={onConfirmar}
              activeOpacity={0.85}
            >
              <Text style={styles.dialogoBotaoConfirmarTexto}>{desativando ? 'Desativar' : 'Reativar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Modal: confirmar remoção (exige digitar o apartamento) ----------

interface ModalConfirmarRemocaoProps {
  morador: Morador | null;
  onCancelar: () => void;
  onConfirmar: () => void;
}

function ModalConfirmarRemocao({ morador, onCancelar, onConfirmar }: ModalConfirmarRemocaoProps) {
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('');

  React.useEffect(() => {
    setConfirmacaoTexto('');
  }, [morador]);

  const podeConfirmar = morador !== null && confirmacaoTexto.trim() === morador.apto;

  return (
    <Modal visible={!!morador} animationType="fade" transparent onRequestClose={onCancelar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFundoCentro}>
        <View style={styles.dialogoCartao}>
          <Text style={styles.dialogoTitulo}>Remover cadastro</Text>
          <Text style={styles.dialogoTexto}>
            Essa ação remove permanentemente o cadastro de {morador?.nome}, incluindo histórico de acesso ao
            aplicativo. Não é possível desfazer.
          </Text>

          <Text style={styles.campoLabel}>
            Digite o número do apartamento (<Text style={{ fontWeight: '700' }}>{morador?.apto}</Text>) para confirmar
          </Text>
          <TextInput
            style={styles.input}
            value={confirmacaoTexto}
            onChangeText={setConfirmacaoTexto}
            placeholder={morador?.apto}
            placeholderTextColor="#A8A199"
          />

          <View style={styles.dialogoAcoes}>
            <TouchableOpacity style={styles.dialogoBotaoCancelar} onPress={onCancelar} activeOpacity={0.8}>
              <Text style={styles.dialogoBotaoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogoBotaoConfirmar, styles.dialogoBotaoConfirmarAlerta, !podeConfirmar && styles.botaoDesabilitado]}
              onPress={onConfirmar}
              disabled={!podeConfirmar}
              activeOpacity={0.85}
            >
              <Text style={styles.dialogoBotaoConfirmarTexto}>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Tela principal ----------

export default function TelaMoradoresSindico() {
  const [moradores, setMoradores] = useState<Morador[]>(MOCK_MORADORES);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');

  const [moradorDetalhe, setMoradorDetalhe] = useState<Morador | null>(null);
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null);
  const [dadosParaConfirmar, setDadosParaConfirmar] = useState<DadosEditaveis | null>(null);
  const [moradorStatus, setMoradorStatus] = useState<Morador | null>(null);
  const [moradorRemover, setMoradorRemover] = useState<Morador | null>(null);

  const moradoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return moradores.filter((m) => {
      if (filtroStatus !== 'todos' && m.status !== filtroStatus) return false;
      if (termo.length === 0) return true;
      const campos = [m.nome, m.apto, m.cpf.replace(/\D/g, '')].map((c) => c.toLowerCase());
      return campos.some((c) => c.includes(termo));
    });
  }, [moradores, busca, filtroStatus]);

  function handleAbrirEditar() {
    setMoradorEditando(moradorDetalhe);
    setMoradorDetalhe(null);
  }

  function handleProsseguirEdicao(dados: DadosEditaveis) {
    setDadosParaConfirmar(dados);
  }

  function handleConfirmarEdicao() {
    if (!moradorEditando || !dadosParaConfirmar) return;
    setMoradores((atual) =>
      atual.map((m) => (m.id === moradorEditando.id ? { ...m, ...dadosParaConfirmar } : m))
    );
    setDadosParaConfirmar(null);
    setMoradorEditando(null);
  }

  function handleAbrirConfirmarStatus() {
    setMoradorStatus(moradorDetalhe);
    setMoradorDetalhe(null);
  }

  function handleConfirmarAlternarStatus() {
    if (!moradorStatus) return;
    setMoradores((atual) =>
      atual.map((m) => (m.id === moradorStatus.id ? { ...m, status: m.status === 'ativo' ? 'inativo' : 'ativo' } : m))
    );
    setMoradorStatus(null);
  }

  function handleAbrirConfirmarRemocao() {
    setMoradorRemover(moradorDetalhe);
    setMoradorDetalhe(null);
  }

  function handleConfirmarRemocao() {
    if (!moradorRemover) return;
    setMoradores((atual) => atual.filter((m) => m.id !== moradorRemover.id));
    setMoradorRemover(null);
  }

  return (
    <SafeAreaView style={styles.tela}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.cabecalho}>
        <Text style={styles.cabecalhoSaudacao}>Residencial Jardim das Flores</Text>
        <Text style={styles.cabecalhoTitulo}>Moradores</Text>
      </View>

      <View style={styles.buscaContainer}>
        <TextInput
          style={styles.buscaInput}
          placeholder="Buscar por nome, apto ou CPF..."
          placeholderTextColor="#A8A199"
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <View style={styles.filtrosLinha}>
        <Chip label="Todos" ativo={filtroStatus === 'todos'} onPress={() => setFiltroStatus('todos')} />
        <Chip label="Ativos" ativo={filtroStatus === 'ativo'} onPress={() => setFiltroStatus('ativo')} />
        <Chip label="Inativos" ativo={filtroStatus === 'inativo'} onPress={() => setFiltroStatus('inativo')} />
      </View>

      <FlatList
        data={moradoresFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartaoMorador morador={item} onPress={() => setMoradorDetalhe(item)} />}
        contentContainerStyle={moradoresFiltrados.length === 0 ? styles.listaVaziaContainer : styles.listaConteudo}
        ListEmptyComponent={<EstadoVazio />}
        showsVerticalScrollIndicator={false}
      />

      <ModalDetalhe
        morador={moradorDetalhe}
        onFechar={() => setMoradorDetalhe(null)}
        onEditar={handleAbrirEditar}
        onAlternarStatus={handleAbrirConfirmarStatus}
        onRemover={handleAbrirConfirmarRemocao}
      />

      <ModalEditar
        morador={moradorEditando}
        onFechar={() => setMoradorEditando(null)}
        onProsseguir={handleProsseguirEdicao}
      />

      <ModalConfirmarAlteracao
        morador={moradorEditando}
        dadosEditados={dadosParaConfirmar}
        onVoltar={() => setDadosParaConfirmar(null)}
        onConfirmar={handleConfirmarEdicao}
      />

      <ModalConfirmarStatus
        morador={moradorStatus}
        onCancelar={() => setMoradorStatus(null)}
        onConfirmar={handleConfirmarAlternarStatus}
      />

      <ModalConfirmarRemocao
        morador={moradorRemover}
        onCancelar={() => setMoradorRemover(null)}
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
    fontSize: 26,
    fontWeight: '700',
    color: '#2B2823',
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
  filtrosLinha: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0ECE5',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cartaoInfo: {
    flex: 1,
  },
  cartaoNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2823',
  },
  cartaoDetalhe: {
    fontSize: 12,
    color: '#6B6459',
    marginTop: 1,
  },
  cartaoCpf: {
    fontSize: 11,
    color: '#A8A199',
    marginTop: 2,
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
  modalSubtitulo: {
    fontSize: 12,
    color: '#A8A199',
    marginBottom: 8,
    lineHeight: 16,
  },
  detalheTopo: {
    alignItems: 'center',
    marginBottom: 18,
  },
  detalheNome: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2823',
    marginTop: 10,
    marginBottom: 8,
  },
  detalheBox: {
    backgroundColor: '#F7F5F1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  linhaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9E1',
  },
  linhaInfoLabel: {
    fontSize: 12,
    color: '#8A8377',
  },
  linhaInfoValor: {
    fontSize: 13,
    color: '#2B2823',
    fontWeight: '600',
  },
  cpfLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cpfToggle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D6FB4',
  },
  botaoPrimario: {
    backgroundColor: '#2B2823',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  botaoPrimarioTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  botaoSecundario: {
    backgroundColor: '#F0ECE5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 6,
  },
  botaoSecundarioTexto: {
    color: '#2B2823',
    fontWeight: '600',
    fontSize: 14,
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  botaoTexto: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  botaoTextoRemover: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C0392B',
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
  linhaDupla: {
    flexDirection: 'row',
    gap: 12,
  },
  campoMetade: {
    flex: 1,
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
    marginBottom: 6,
  },
  diferencasBox: {
    backgroundColor: '#F7F5F1',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  semAlteracoesTexto: {
    fontSize: 12,
    color: '#A8A199',
    textAlign: 'center',
  },
  diferencaLinha: {
    marginBottom: 8,
  },
  diferencaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8377',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  diferencaValores: {
    fontSize: 13,
  },
  diferencaDe: {
    color: '#C0392B',
    textDecorationLine: 'line-through',
  },
  diferencaPara: {
    color: '#2F855A',
    fontWeight: '700',
  },
  dialogoAcoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  dialogoBotaoCancelar: {
    flex: 1,
    backgroundColor: '#F0ECE5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dialogoBotaoCancelarTexto: {
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
  dialogoBotaoConfirmarAlerta: {
    backgroundColor: '#C0392B',
  },
  dialogoBotaoConfirmarTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});