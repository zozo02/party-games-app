import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Screen from '../components/Screen';

export default function ProfileScreen({ navigation }) {
  return (
    <Screen>
      <Text style={styles.h1}>Profil</Text>
      <Pressable style={styles.btn} onPress={()=>navigation.navigate('Enable2FA')}>
        <Text style={styles.btnText}>Activer A2F</Text>
      </Pressable>
    </Screen>
  );
}
const styles = StyleSheet.create({
  h1: { color:'white', fontSize:22, fontWeight:'800', marginBottom:16 },
  btn: { backgroundColor:'#4f46e5', padding:12, borderRadius:8, alignItems:'center' },
  btnText: { color:'white', fontWeight:'700' }
});
