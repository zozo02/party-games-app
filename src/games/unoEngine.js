/**
 * Simple UNO engine: supports numbers 0-9 and actions: Skip, Reverse, +2, Wild, Wild+4
 */
const COLORS = ['R','G','B','Y'];
const NUMBERS = Array.from({length:10}, (_,i)=>i.toString());
const ACTIONS = ['S','R','D2']; // Skip, Reverse, Draw2
const WILDS = ['W','W4'];

export function newDeck() {
  const deck = [];
  // numbers: one 0 per color, two of 1-9 per color
  for (const c of COLORS) {
    deck.push({c, v:'0'});
    for (const v of NUMBERS.slice(1)) { deck.push({c,v}); deck.push({c,v}); }
    for (const a of ACTIONS) { deck.push({c, v:a}); deck.push({c, v:a}); }
  }
  for (let i=0;i<4;i++){ deck.push({c:'X', v:'W'}); deck.push({c:'X', v:'W4'}); }
  return shuffle(deck);
}

export function shuffle(a) {
  const arr = a.slice();
  for (let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function canPlay(card, top, pendingDraw) {
  if (pendingDraw>0) {
    // Only draw-stacking card can be played
    if (card.v === 'D2' && (top.v==='D2')) return true;
    if (card.v === 'W4' && (top.v==='W4' || top.v==='D2' || top.c==='*')) return true;
    return false;
  }
  if (card.v==='W' || card.v==='W4' || card.c==='*') return true; // wild colored
  return card.c===top.c || card.v===top.v;
}

export function deal(deck, players=2, handSize=7) {
  const hands = Array.from({length:players}, ()=>[]);
  let idx = 0;
  for (let r=0;r<handSize;r++){
    for (let p=0;p<players;p++){
      hands[p].push(deck[idx++]);
    }
  }
  const discard = [deck[idx++]];
  while (discard[0].v==='W' || discard[0].v==='W4') { // ensure first card isn't wild
    discard.unshift(deck[idx++]);
  }
  const draw = deck.slice(idx);
  return { hands, discard, draw };
}

export function applyPlay(state, playerIndex, card, chosenColor=null) {
  // remove card from player's hand
  const hand = state.hands[playerIndex];
  const ci = hand.findIndex(c=>c===card);
  if (ci<0) throw new Error('Card not in hand');
  hand.splice(ci,1);
  // Set chosen color for wilds
  let placed = { ...card };
  if (card.v==='W' || card.v==='W4') {
    placed = { c:'*', v:card.v, chosenColor: chosenColor || 'R' };
  }
  state.discard.push(placed);
  // Effects
  switch (card.v) {
    case 'S': state.turn = nextPlayer(state, state.turn, 2); break;
    case 'R': state.dir *= -1; state.turn = nextPlayer(state, state.turn, 1); break;
    case 'D2': state.pendingDraw += 2; state.turn = nextPlayer(state, state.turn, 1); break;
    case 'W4': state.pendingDraw += 4; state.turn = nextPlayer(state, state.turn, 1); break;
    default: state.turn = nextPlayer(state, state.turn, 1);
  }
}

export function drawCards(state, count, playerIndex) {
  for (let i=0;i<count;i++){
    if (state.draw.length===0) {
      // reshuffle
      const top = state.discard.pop();
      state.draw = shuffle(state.discard);
      state.discard = [top];
    }
    state.hands[playerIndex].push(state.draw.pop());
  }
}

export function nextPlayer(state, current, step=1) {
  const n = state.hands.length;
  let idx = current;
  for (let i=0;i<step;i++) {
    idx = (idx + state.dir + n) % n;
  }
  return idx;
}

export function initGame(nPlayers=2) {
  const deck = newDeck();
  const dealt = deal(deck, nPlayers, 7);
  return {
    ...dealt,
    turn: 0,
    dir: 1,
    pendingDraw: 0,
    winner: null
  };
}

export function checkWin(state) {
  for (let i=0;i<state.hands.length;i++)
    if (state.hands[i].length===0) { state.winner = i; return i; }
  return null;
}
