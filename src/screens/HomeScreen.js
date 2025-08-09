import React from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import AdBanner from '../components/AdBanner';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function HomeScreen({ navigation }) {
  return (
    <Screen footer={<AdBanner />}>
      <Text style={styles.h1}>Bienvenue sur PartyGames</Text>
      <Text style={styles.p}>Choisis un jeu et lance une partie publique ou privée.</Text>
      <View style={{ height: 16 }} />
      <Pressable style={styles.btn} onPress={()=>navigation.navigate('GameSelect')}>
        <Text style={styles.btnText}>Choisir un jeu</Text>
      </Pressable>
      <View style={{ flex:1 }} />
      <Pressable style={styles.logout} onPress={()=>signOut(auth)}>
        <Text style={{ color:'#ff8b8b' }}>Se déconnecter</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color:'white', fontSize:24, fontWeight:'800' },
  p: { color:'#c9c9d6', marginTop:8 },
  btn: { backgroundColor:'#22c55e', padding:14, borderRadius:10, alignItems:'center' },
  btnText: { color:'white', fontWeight:'800' },
  logout: { alignItems:'center', padding:8 }
});
