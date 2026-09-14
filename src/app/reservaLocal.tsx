// Tela de consulta do porteiro: mostra as reservas de ambientes confirmadas para hoje.
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

interface ReservaHoje {
  id: string;
  ambienteNome: string;
  ambienteCor: string | null;
  horario: string;
  morador: string;
  apto: string | null;
}

const LABEL_HORARIO: Record<string, string> = {
  manha: "08:00 – 12:00",
  tarde: "13:00 – 18:00",
  noite: "19:00 – 23:00",
};

const COR_PADRAO = "#7E57A6";

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function ReservasDeHoje() {
  const [reservas, setReservas] = useState<ReservaHoje[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarReservasHoje();
  }, []);

  async function carregarReservasHoje() {
    const hojeISO = formatarDataISO(new Date());

    const { data, error } = await supabase
      .from("reservas_ambiente")
      .select("id, horario, morador_id, ambientes(nome, cor)")
      .eq("data", hojeISO)
      .eq("status", "confirmada");

    if (error) {
      Alert.alert("Erro", "Não foi possível carregar as reservas de hoje.");
      setCarregando(false);
      return;
    }

    const linhas = data ?? [];
    const moradorIds = Array.from(new Set(linhas.map((r: any) => r.morador_id)));
    let moradoresPorId = new Map<string, { nome: string; apto: string | null }>();

    if (moradorIds.length > 0) {
      const { data: perfis } = await supabase
        .from("profiles")
        .select("id, nome, apto")
        .in("id", moradorIds);

      moradoresPorId = new Map((perfis ?? []).map((p) => [p.id, { nome: p.nome, apto: p.apto }]));
    }

    setReservas(
      linhas.map((r: any) => {
        const morador = moradoresPorId.get(r.morador_id);
        return {
          id: r.id,
          ambienteNome: r.ambientes?.nome ?? "Ambiente",
          ambienteCor: r.ambientes?.cor ?? null,
          horario: r.horario,
          morador: morador?.nome ?? "Morador",
          apto: morador?.apto ?? null,
        };
      })
    );
    setCarregando(false);
  }

  if (carregando) {
    return (
      <View style={styles.carregandoContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Reservas de Hoje</Text>
      <Text style={styles.subtitulo}>Espaços com uso confirmado para hoje:</Text>

      {reservas.length === 0 ? (
        <Text style={styles.vazio}>Nenhuma reserva para hoje.</Text>
      ) : (
        reservas.map((reserva) => (
          <View key={reserva.id} style={[styles.card, { borderLeftColor: reserva.ambienteCor ?? COR_PADRAO }]}>
            <Text style={styles.cardAmbiente}>{reserva.ambienteNome}</Text>
            <Text style={styles.cardHorario}>{LABEL_HORARIO[reserva.horario] ?? reserva.horario}</Text>
            <Text style={styles.cardMorador}>
              {reserva.morador}
              {reserva.apto ? ` · ${reserva.apto}` : ""}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },

  carregandoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },

  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 8,
  },

  subtitulo: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },

  vazio: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
    marginTop: 40,
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 18,
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderLeftWidth: 5,
  },

  cardAmbiente: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },

  cardHorario: {
    fontSize: 15,
    color: "#1976D2",
    fontWeight: "600",
    marginBottom: 4,
  },

  cardMorador: {
    fontSize: 14,
    color: "#555",
  },
});
