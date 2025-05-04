import { Match, MatchFirestore, Player } from '../types/types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const API_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(API_CONFIG);
const db = getFirestore(app);

export async function signInUser(email: string, password: string): Promise<void> {
  const auth = getAuth();
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<void> {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export const storeFirestore = (() => {
  
    // Dummy local cache since no real Firestore here
    const playersListCache: Player[] = [];
    let matchCache: Match[] = [];
  
    // Simulated fetch for players
    async function fetchPlayersList() {
      if (playersListCache.length) return playersListCache;

      const querySnapshot = await getDocs(collection(db, '/players'));
      const players: Player[] = querySnapshot.docs.map((doc: any) => ({ id: doc.id, name: doc.get('name') }));
      
      // race condition check
      if (playersListCache.length) return playersListCache;
      
      playersListCache.concat(players);
      return players;
    }
  
    async function saveMatch(matchRecord: Match) {
      return new Promise<Match>(res => {
        setTimeout(() => {
          const collectionRef = collection(db, "/matches");
          const docId = Math.random().toString(36).substring(2, 10);
          const saved = { ...matchRecord, id: 'fs-' + (matchCache.length + 1) };
          setDoc(doc(collectionRef, docId), saved);  
          
          matchCache.push(saved);
          res(saved);
        }, 300);
      });
    }
  
    // Simulated fetch match history
    async function fetchMatchHistory() {
      const playersCache = await fetchPlayersList();
      const querySnapshot = await getDocs(collection(db, '/matches'));
      const matchList: Match[] = querySnapshot.docs.map((match: any) => ({ id: match.id, ...match.data() }))
          .map((match: any) => ({ ...match, 
            team1: match.team1.map((p: any) => ({ id: p.id, name: playersCache.find((player: Player) => player.id === p.id)?.name })), 
            team2: match.team2.map((p: any) => ({ id: p.id, name: playersCache.find((player: Player) => player.id === p.id)?.name })) 
          }));
      if(!matchCache || matchCache.length === 0)  
        matchCache = matchCache.concat(matchList);

      return new Promise<Match[]>(res => {
        setTimeout(() => {
          res([...matchCache].reverse());
        }, 300);
      });
    }
  
    // Simulated leaderboard fetch - merges matches & players
    async function fetchLeaderboard() {
      // TODO: Replace with combined Firestore query + calculation ideally on backend
      return new Promise(async (res) => {
        const players = await fetchPlayersList();
        res({ players, matches: matchCache });
      });
    }
  
    return {
      fetchPlayersList,
      saveMatch,
      fetchMatchHistory,
      fetchLeaderboardData: fetchLeaderboard,
    };
  })();