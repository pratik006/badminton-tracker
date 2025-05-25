import { Activity, ActivityType, Group, Match, MatchFirestore, Player } from '../../types/types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { FilterOption, formatDate, getPredicate } from '../../utils/DateFunctions';

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

// Initialize App Check only in production
let appCheck;
if (process.env.NODE_ENV === 'production') {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LdlUkgrAAAAAABiu9_SrpMgoUZxu6EdOyHU5Ryn'),
    isTokenAutoRefreshEnabled: true
  });
}

const auth = getAuth();
const db = getFirestore(app);

export async function signInUser(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);

  await auditActivity('LogIn');
}

export const timestamp = formatDate(new Date());

async function 
auditActivity(type: ActivityType, newValue: string = '', oldValue: string = '') {
  const user = auth.currentUser;
  if (!user) return;

  const activity: Activity = {
    id: (await storeFirestore.fetchPlayersList()).find((player: Player) => player.email === user.email)?.id,
    type: type,
    createdTs: timestamp,
    createdBy: user.email!,
    oldValue: oldValue,
    newValue: newValue
  };
  return new Promise<Activity>(res => {
    setTimeout(() => {
      const collectionRef = collection(db, "/audits");
      const saved = { ...activity };
      setDoc(doc(collectionRef), saved);  
      
      res(saved);
    }, 300);
  });
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
  const user = auth.currentUser;
  if (user) {
    await auditActivity('LogIn');
  }
}

export const storeFirestore = (() => {
  
    // Dummy local cache since no real Firestore here
    const playersListCache: Player[] = [];
    let matchCache: Match[] = [];
    let groupsCache: Group[] = [];
  
    // Simulated fetch for players
    async function fetchPlayersList() {
      if (playersListCache.length) return playersListCache;

      const querySnapshot = await getDocs(collection(db, '/players'));
      const players: Player[] = querySnapshot.docs.map((doc: any) => ({ id: doc.id, name: doc.get('name'), email: doc.get('email'), avatar: doc.get('avatar') }));
      
      // race condition check
      if (playersListCache.length) return playersListCache;
      
      playersListCache.concat(players);
      return players;
    }

    async function getPlayerInfo(): Promise<Player|undefined> {
      const user = auth.currentUser;
      if (!user) return;

      const players = await fetchPlayersList();
      const player: Player|undefined = players.find((player: Player) => player.email === user.email);
      if (!player) return;

      player.groups = [];
      const groupPlayersRef = collection(db, '/group_registered_players');
      const q = query(groupPlayersRef, where('playerId', '==', Number(player.id)));
      const querySnapshot = await getDocs(q);

      const groups = await getGroups();

      querySnapshot.forEach((doc: any) => {
        const groupId = doc.get('groupId');
        const group = groups.find((g: Group) => g.id === groupId);
        if (group) player.groups!.push(group);
      });

      return player;
    }
  
    async function saveMatch(matchRecord: Match) {
      return new Promise<Match>(res => {
        setTimeout(() => {
          const collectionRef = collection(db, "/matches");
          const docId = 'fs-' + (matchCache.length + 1);
          const saved = { ...matchRecord, id: docId, createdTs: timestamp, createdBy: auth.currentUser?.email! };
          setDoc(doc(collectionRef, docId), saved);  
          
          matchCache.push(saved);
          res(saved);

          auditActivity('SaveMatch', JSON.stringify(saved));
        }, 300);
      });
    }
  
    // Simulated fetch match history
    async function fetchMatchHistory(filter: FilterOption = 'last7days') {
      const playersCache = await fetchPlayersList();
      if (!matchCache.length) {
        const querySnapshot = await getDocs(collection(db, '/matches'));
        const matchList: Match[] = querySnapshot.docs.map((match: any) => ({ id: match.id, ...match.data() }))
            .map((match: any) => ({ ...match, 
            team1: match.team1.map((p: any) => ({ id: p.id, name: playersCache.find((player: Player) => player.id === p.id)?.name })), 
            team2: match.team2.map((p: any) => ({ id: p.id, name: playersCache.find((player: Player) => player.id === p.id)?.name })) 
          }));

        matchCache = matchList;
      }

      const filterPredicate = await getPredicate(filter);

      // Filter matches based on date
      const filteredMatches = matchCache.filter(filterPredicate);

      return new Promise<Match[]>(res => {
        setTimeout(() => {
          res([...filteredMatches].reverse());
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

    async function fetchPlayersByGroup(groupId: number) {
      const queryRef = collection(db, '/groups');
      const groupQuery = query(queryRef, where('id', '==', groupId));
      const groupName = (await getDocs(groupQuery)).docs[0].data()?.name;

      const allPlayers = await fetchPlayersList();
      const groupPlayersRef = collection(db, '/group_registered_players');
      const q = query(groupPlayersRef, where('groupId', '==', groupId));
      const queryRegisteredPlayers: Player[] = (await getDocs(q)).docs.map((doc: any) => {
        const player = allPlayers.find((player: Player) => player.id === doc.get('playerId'));
        return { ...player!, id: doc.get('playerId') };
      });
      const group: Group = {
        id: 1,
        name: groupName,
        registeredPlayers: queryRegisteredPlayers
      };

      return group;
    }

    async function getGroups() {
      if (groupsCache.length) return groupsCache;
      const querySnapshot = await getDocs(collection(db, '/groups'));
      const groups: Group[] = querySnapshot.docs.map((doc: any) => ({ id: Number(doc.get('id')), name: doc.get('name') }));
      groupsCache = groups;
      return groups;
    }
  
    return {
      fetchPlayersList,
      saveMatch,
      fetchMatchHistory,
      fetchLeaderboardData: fetchLeaderboard,
      fetchPlayersByGroup,
      auditActivity,
      getPlayerInfo
    };
  })();