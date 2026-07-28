import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";

export default function Reservas() {
  const [localSelecionado, setLocalSelecionado] = useState("");

  const locais = [
    "Churrasqueira",
    "Piscina",
    "Salão de Festas",
    "Quadra Esportiva",
    "Academia",
    "Brinquedoteca",
    "Sala de Reuniões",
  ];

  function reservar() {
    if (localSelecionado === "") {
      Alert.alert("Aviso", "Escolha um local para reservar.");
      return;
    }

    Alert.alert(
      "Reserva realizada!",
      `Você reservou: ${localSelecionado}`
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Reserva de Áreas Comuns</Text>

      <Text style={styles.subtitulo}>
        Escolha o espaço que deseja reservar:
      </Text>

      {locais.map((local, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.card,
            localSelecionado === local && styles.cardSelecionado,
          ]}
          onPress={() => setLocalSelecionado(local)}
        >
          <Text style={styles.textoCard}>{local}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.botao} onPress={reservar}>
        <Text style={styles.textoBotao}>Reservar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },

  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 20,
  },

  subtitulo: {
    fontSize: 18,
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 18,
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  cardSelecionado: {
    backgroundColor: "#4CAF50",
  },

  textoCard: {
    fontSize: 18,
    color: "#000",
  },

  botao: {
    backgroundColor: "#1976D2",
    padding: 18,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 40,
  },

  textoBotao: {
    color: "#fff",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
  },
});