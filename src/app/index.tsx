// Rota inicial: decide entre continuar a sessão salva ou pedir login.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Index() {
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    let ativo = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!ativo) return;

      if (!session) {
        setVerificando(false);
        router.replace('/login');
        return;
      }

      const { data: perfil } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!ativo) return;
      setVerificando(false);

      if (perfil?.role === 'sindico') {
        router.replace('/inicioSindico');
      } else if (perfil?.role === 'porteiro') {
        router.replace('/inicioPorteiro');
      } else {
        router.replace('/inicio');
      }
    })();

    return () => { ativo = false; };
  }, []);

  return (
    <View style={styles.container}>
      {verificando && <ActivityIndicator size="large" color="#e49c15" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3e9d7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
