/**
 * Very simple client-driven matchmaking using Firestore.
 * For each game+mode, try to join an existing lobby that isn't full; otherwise create one.
 */
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function joinLobby({ game, mode, uid, maxPlayers }) {
  // Try to find an open lobby
  const q = query(collection(db, 'lobbies'),
    where('game', '==', game),
    where('mode', '==', mode),
    where('status', '==', 'waiting')
  );
  const snap = await getDocs(q);
  let lobbyRef = null;
  for (const d of snap.docs) {
    const data = d.data();
    if ((data.players?.length || 0) < data.maxPlayers) {
      lobbyRef = d.ref;
      const players = data.players || [];
      players.push({ uid, joinedAt: Date.now() });
      await updateDoc(lobbyRef, { players, updatedAt: serverTimestamp() });
      return { id: d.id, ...data, players };
    }
  }
  // Create new lobby
  const docRef = await addDoc(collection(db, 'lobbies'), {
    game, mode, status: 'waiting', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    maxPlayers, players: [{ uid, joinedAt: Date.now() }]
  });
  return { id: docRef.id, game, mode, status:'waiting', maxPlayers, players:[{ uid, joinedAt: Date.now() }] };
}

export function watchLobby(lobbyId, cb) {
  return onSnapshot(doc(db, 'lobbies', lobbyId), (d) => cb({ id: d.id, ...d.data() }));
}

export async function startLobby(lobbyId) {
  await updateDoc(doc(db, 'lobbies', lobbyId), { status: 'active', updatedAt: serverTimestamp() });
}
