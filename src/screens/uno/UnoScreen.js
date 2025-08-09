import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import Screen from '../../components/Screen';
import AdBanner from '../../components/AdBanner';
import { initGame, canPlay, applyPlay, drawCards, checkWin } from '../../games/unoEngine';

const colorName = { R:'Rouge', G:'Vert', B:'Bleu', Y:'Jaune', '*':'Choisi' };
function Card({ c, v, onPress, disabled }) {
  const label = v==='S'?'⏭️': v==='R'?'🔁': v==='D2'?'+2': v==='W'?'WILD': v==='W4'?'+4 WILD': v;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.card, { opacity: disabled?0.4:1 }]}>
      <Text style={styles.cardText}>{label}</Text>
      <Text style={styles.cardSub}>{colorName[c] || ''}</Text>
    </Pressable>
  );
}

export default function UnoScreen() {
  const [state, setState] = useState(()=>initGame(2));
  const current = state.turn;

  const top = state.discard[state.discard.length-1];
  const my = 0; // local vs bot
  const opponent = 1;

  useEffect(()=>{
    // simple bot turn
    if (current===opponent && !state.winner) {
      setTimeout(()=>{
        const hand = state.hands[opponent];
        // try to play first playable
        let played = false;
        for (const card of hand) {
          if (canPlay(card, top, state.pendingDraw)) {
            applyPlay(state, opponent, card, 'R');
            played = true; break;
          }
        }
        if (!played) {
          const drawCount = state.pendingDraw>0 ? state.pendingDraw : 1;
          drawCards(state, drawCount, opponent);
          state.pendingDraw = 0;
          state.turn = (state.turn+1)%state.hands.length;
        }
        checkWin(state);
        setState({...state});
      }, 600);
    }
  }, [current, state]);

  const onPlay = (card) => {
    if (!canPlay(card, top, state.pendingDraw)) return Alert.alert('Coup impossible', 'Cette carte ne peut pas être jouée.');
    applyPlay(state, my, card, 'R');
    checkWin(state);
    setState({ ...state });
  };

  const onDraw = () => {
    const drawCount = state.pendingDraw>0 ? state.pendingDraw : 1;
    drawCards(state, drawCount, my);
    state.pendingDraw = 0;
    state.turn = (state.turn+1)%state.hands.length;
    setState({ ...state });
  };

  const reset = () => setState(initGame(2));

  return (
    <Screen footer={<AdBanner />}>
      <Text style={styles.h1}>UNO — 1v1 (démo locale)</Text>
      <Text style={styles.meta}>Tour du joueur: {current===0?'Toi':'Bot'}</Text>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.meta}>Carte au sommet:</Text>
          <Card {...top} disabled />
        </View>
        <Pressable style={styles.smallBtn} onPress={reset}><Text style={{color:'white'}}>🔄 Rejouer</Text></Pressable>
      </View>

      <Text style={styles.meta}>Ta main</Text>
      <FlatList
        data={state.hands[my]}
        horizontal
        keyExtractor={(_,i)=>'c'+i}
        renderItem={({item})=>(
          <Card {...item} disabled={current!==my} onPress={()=>current===my && onPlay(item)} />
        )}
        contentContainerStyle={{ gap:8 }}
      />
      <Pressable style={[styles.drawBtn, {opacity: current!==my?0.5:1}]} disabled={current!==my} onPress={onDraw}>
        <Text style={styles.drawText}>{state.pendingDraw>0 ? `Piocher ${state.pendingDraw}` : 'Piocher 1'}</Text>
      </Pressable>

      {state.winner!==null && (
        <Text style={styles.win}>{state.winner===0?'🎉 Tu as gagné!':'🤖 Le bot a gagné.'}</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color:'white', fontSize:20, fontWeight:'800', marginBottom:8 },
  meta: { color:'#c9c9d6', marginVertical:6 },
  topRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  card: { backgroundColor:'#1f1f2e', padding:10, borderRadius:10, width:80, height:110, justifyContent:'center', alignItems:'center' },
  cardText: { color:'white', fontWeight:'800', fontSize:18 },
  cardSub: { color:'#8a8aa3', fontSize:12, marginTop:6 },
  drawBtn: { backgroundColor:'#22c55e', padding:12, borderRadius:10, marginTop:12, alignItems:'center' },
  drawText: { color:'white', fontWeight:'800' },
  smallBtn: { backgroundColor:'#4f46e5', padding:10, borderRadius:8 },
  win: { color:'#fff', fontWeight:'800', marginTop:12, fontSize:18 }
});
