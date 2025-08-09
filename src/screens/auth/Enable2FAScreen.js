// This is a placeholder screen. In production, implement Firebase multi-factor with SMS verification.
// Flow: enroll second factor -> verify -> require on next sign-in.
import React from 'react';
import { Text, View, Pressable, StyleSheet, Alert } from 'react-native';
import Screen from '../../components/Screen';

export default function Enable2FAScreen({ navigation }) {
  return (
    <Screen>
      <Text style={styles.title}>Activer la 2FA (A2F)</Text>
      <Text style={styles.body}>Cette démo affiche un écran d'activation. Implémente ensuite la 2FA via Firebase (SMS) pour une vraie protection.</Text>
      <Pressable onPress={()=>Alert.alert('2FA', 'Démo: à implémenter côté Firebase.') } style={styles.btn}>
        <Text style={styles.btnText}>Activer via SMS</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color:'white', fontSize:24, fontWeight:'700', marginBottom:12 },
  body: { color:'#c9c9d6', marginBottom:16 },
  btn: { backgroundColor:'#4f46e5', padding:12, borderRadius:8, alignItems:'center' },
  btnText: { color:'white', fontWeight:'700' }
});
