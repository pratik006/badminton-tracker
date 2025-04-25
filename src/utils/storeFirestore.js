import { db } from '../utils/firestore';
const { getFirestore, collection, getDocs, setDoc, doc } = require('firebase/firestore');

export const storeFirestore = (() => {
  
    // Dummy local cache since no real Firestore here
    let playersListCache = [];
    let matchCache = [];
  
    // Simulated fetch for players
    async function fetchPlayersList() {
        const querySnapshot = await getDocs(collection(db, '/players'));
        const playersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // TODO: Replace this with real Firestore REST fetch
        if (playersListCache.length) return playersListCache;
    
        // Simulate Firestore like response:
        const players = playersList.map(p => p.name);
        playersListCache = players;
        return players;
    }
  
    async function saveMatch(matchRecord) {
      return new Promise(res => {
        setTimeout(() => {
            const collectionRef = collection(db, "/matches");
            const docId = Math.random().toString(36).substring(2, 10);
            const saved = { id: 'fs-' + (matchCache.length + 1), ...matchRecord };
            setDoc(doc(collectionRef, docId), saved);  
            
            matchCache.push(saved);
            res(saved);
        }, 300);
      });
    }
  
    // Simulated fetch match history
    async function fetchMatchHistory() {
        const querySnapshot = await getDocs(collection(db, '/matches'));
        const matchList = querySnapshot.docs.map(match => ({ id: match.id, ...match.data() }));        
        if(!matchCache || matchCache.length === 0)  
          matchCache = matchCache.concat(matchList);

      return new Promise(res => {
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