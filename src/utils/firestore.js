const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

export { db };

export const storeFirestore = (() => {
    
    //const app = initializeApp(firebaseConfig);
    //const db = firebaseConfig.database();
  
    // Dummy local cache since no real Firestore here
    let playersListCache = [];
    let matchCache = [];
  
    // Simulated fetch for players
    async function fetchPlayersList() {
      


      // TODO: Replace this with real Firestore REST fetch
      if (playersListCache.length) return playersListCache;
  
      // Simulate Firestore like response:
      const players = [
        'Nadith', 'Lahiru', 'Nuwan', 'Darshin',
        'Peter', 'Daniel', 'Michael', 'John',
        'Sarah', 'Anita', 'James', 'Kate',
        'Tina', 'David', 'Chris', 'Emma',
      ];
      playersListCache = players;
      return players;
    }
  
    // Simulated save
    async function saveMatch(matchRecord) {
      // TODO: Replace this with Firestore POST REST
      return new Promise(res => {
        setTimeout(() => {
          const saved = { id: 'fs-' + (matchCache.length + 1), ...matchRecord };
          matchCache.push(saved);
          res(saved);
        }, 300);
      });
    }
  
    // Simulated fetch match history
    async function fetchMatchHistory() {
      // TODO: Replace with Firestore GET REST
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