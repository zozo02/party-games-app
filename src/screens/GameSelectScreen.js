import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView } from 'react-native';
import Screen from '../components/Screen';
import AdBanner from '../components/AdBanner';

function Card({ title, image, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: image }} style={styles.img} />
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

export default function GameSelectScreen({ navigation }) {
  return (
    <Screen footer={<AdBanner />}>
      <ScrollView contentContainerStyle={{ gap:12 }}>
        <Card title="UNO (1v1, 2v2, 4v4)" image="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=800" onPress={()=>navigation.navigate('Uno')} />
        <Card title="Loup-Garou (3-16 joueurs)" image="https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=800" onPress={()=>navigation.navigate('Werewolf')} />
        <Card title="Rami (1v1, 2v2)" image="https://images.unsplash.com/photo-1528821154947-1aa3d1b83f4b?q=80&w=800" onPress={()=>navigation.navigate('Rummy')} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor:'#141421', borderRadius:12, overflow:'hidden' },
  img: { height:160, width:'100%' },
  title: { color:'white', fontSize:18, fontWeight:'700', padding:12 }
});
