import { router } from 'expo-router';
import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { supabase } from '../lib/supabase';

interface MenuPerfilPopupProps {
  visivel: boolean;
  onFechar: () => void;
  nome: string;
  fotoUrl?: string | null;
  rotaConfiguracoes: string;
}

export default function MenuPerfilPopup({ visivel, onFechar, nome, fotoUrl, rotaConfiguracoes }: MenuPerfilPopupProps) {
  function handleConfiguracoes() {
    onFechar();
    router.push(rotaConfiguracoes as any);
  }

  async function handleSair() {
    onFechar();
    await supabase.auth.signOut();
    router.replace('/login' as any);
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <TouchableWithoutFeedback onPress={onFechar}>
        <View style={styles.fundo}>
          <TouchableWithoutFeedback>
            <View style={styles.menu}>
              <View style={styles.menuCabecalho}>
                {fotoUrl ? (
                  <Image source={{ uri: fotoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderTexto}>{nome.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.nome} numberOfLines={1}>
                  {nome}
                </Text>
              </View>

              <View style={styles.divisor} />

              <TouchableOpacity style={styles.item} onPress={handleConfiguracoes} activeOpacity={0.7}>
                <Text style={styles.itemTexto}>⚙️  Configurações</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={handleSair} activeOpacity={0.7}>
                <Text style={styles.itemTextoSair}>↪  Sair</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 108,
    paddingRight: 15,
  },
  menu: {
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  menuCabecalho: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e49c15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarPlaceholderTexto: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  nome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  divisor: {
    height: 1,
    backgroundColor: '#f0ece5',
    marginBottom: 4,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  itemTextoSair: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c0392b',
  },
});
