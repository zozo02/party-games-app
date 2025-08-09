import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Screen from '../../components/Screen';
import AdBanner from '../../components/AdBanner';

export default function RummyScreen() {
  const [info, setInfo] = useState('Démo: distribution et pioche/pose à implémenter');
  return (
    <Screen footer={<AdBanner />}>
      <Text style={styles.h1}>Rami — Prototype</Text>
      <Text style={styles.meta}>{info}</Text>
      <Pressable style={styles.btn} onPress={()=>setInfo('Logique de Rami en cours...')}>
        <Text style={styles.btnText}>Commencer</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color:'white', fontSize:20, fontWeight:'800' },
  meta: { color:'#c9c9d6', marginVertical:8 },
  btn: { backgroundColor:'#4f46e5', padding:12, borderRadius:10, alignItems:'center', marginTop:8 },
  btnText: { color:'white', fontWeight:'800' }
});
