import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import Screen from '../../components/Screen';
import AdBanner from '../../components/AdBanner';
import { say } from '../../utils/tts';

const ROLES = ['Loup-Garou','Chasseur','Sorcière','Voyante','Citoyen'];

export default function WerewolfScreen() {
  const [players, setPlayers] = useState(['Toi','J2','J3','J4','J5']);
  const [roles, setRoles] = useState([]);
  const [phase, setPhase] = useState('setup');

  const assign = () => {
    const bag = [...ROLES];
    while (bag.length < players.length) bag.push('Citoyen');
    const shuffled = players.map(p=>p).sort(()=>Math.random()-0.5);
    const rr = shuffled.map((_,i)=>bag.sort(()=>Math.random()-0.5)[i]);
    setRoles(rr);
    setPhase('nuit');
    say('Le village s'endort. Les loups-garous se réveillent.');
  };

  const nextPhase = () => {
    if (phase==='nuit') { setPhase('jour'); say('Le village se réveille. Discutez et votez.'); }
    else { setPhase('nuit'); say('La nuit tombe. Le village s'endort.'); }
  };

  return (
    <Screen footer={<AdBanner />}>
      <Text style={styles.h1}>Loup-Garou — Démo narration</Text>
      <Text style={styles.meta}>Joueurs: {players.length} (min 3, max 16)</Text>
      {phase==='setup' ? (
        <Pressable style={styles.btn} onPress={assign}><Text style={styles.btnText}>Distribuer les rôles</Text></Pressable>
      ) : (
        <>
          <Text style={styles.meta}>Phase: {phase}</Text>
          <Pressable style={styles.btn} onPress={nextPhase}><Text style={styles.btnText}>Phase suivante</Text></Pressable>
          <FlatList data={players} keyExtractor={(i,idx)=>idx+''} renderItem={({item, index})=>(
            <Text style={styles.player}>{item}: {roles[index]}</Text>
          )}/>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color:'white', fontSize:20, fontWeight:'800' },
  meta: { color:'#c9c9d6', marginVertical:8 },
  btn: { backgroundColor:'#4f46e5', padding:12, borderRadius:10, alignItems:'center', marginTop:8 },
  btnText: { color:'white', fontWeight:'800' },
  player: { color:'white', paddingVertical:6 }
});
