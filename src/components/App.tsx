import React, { useState, useEffect, useRef } from "react";
import Header from "./Header";
import NavBar from "./NavBar";
import MatchForm from "./MatchForm";
import MatchHistory from "./MatchHistory";
import Leaderboard from "./Leaderboard";
//import * as store from "../utils/storeLocal"; // Using local store here
import { storeFirestore as store } from "../components/firestore/storeFirestore"; // Using firestore
import { Match, MatchType, Player } from "../types/types";
import SignIn from "./SignIn";
import { signInUser } from "../components/firestore/storeFirestore";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { FilterOption } from "../utils/DateFunctions";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchType, setMatchType] = useState<MatchType>("Doubles");
  const [buchholzEnabled, setBuchholzEnabled] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<FilterOption>('last7days');
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const matchHistoryRef = useRef<HTMLDivElement>(null);

  // Load players and matches initially
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    async function loadData() {
      const players: Player[] = await store.fetchPlayersList();
      const matchesFetched: Match[] = await store.fetchMatchHistory(historyFilter);
      
      // Build recentPlayers: most recent first, no duplicates
      const recentPlayers: Player[] = [];
      const seen = new Set<string>();
      for (const match of matchesFetched) {
        for (const player of [...match.team1, ...match.team2]) {
          const key = String(player.id ?? player.name);
          if (!seen.has(key)) {
            recentPlayers.push(player);
            seen.add(key);
          }
        }
      }
      
      for (const player of players) {
        const key = String(player.id ?? player.name);
        if (!seen.has(key)) {
          recentPlayers.push(player);
          seen.add(key);
        }
      }

      setPlayersList(recentPlayers);
      setMatches(matchesFetched);
    }
    loadData();
    return () => unsubscribe();
  }, [currentUser, historyFilter]);

  const handleSignIn = async (username: string, password: string) => {
    try {
      await signInUser(username, password); // username is email
    } catch (error: any) {
      alert(error.message || "Failed to sign in");
    }
  };
  const handleSignOut = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      // No need to manually update currentUser; onAuthStateChanged will handle it
    } catch (error: any) {
      alert(error.message || "Failed to sign out");
    }
  };

  if (!currentUser) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  // Handle adding new match
  async function handleAddMatch(match: Match) {
    const savedMatch = await store.saveMatch(match) as Match;
    setMatches((prev) => [savedMatch, ...prev]);

    // Update players list if needed
    savedMatch.team1.concat(savedMatch.team2).forEach((p) => {
      if (!playersList.includes(p)) setPlayersList((pl) => [...pl, p]);
    });
  }

  // Scroll leaderboard into view on nav button click
  const scrollToLeaderboard = () => {
    if (leaderboardRef.current) {
      leaderboardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Scroll Match history into view on nav button click
  const scrollToMatchHistory = () => {    
    if (matchHistoryRef.current) {
      matchHistoryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <Header onLeaderboardClick={scrollToLeaderboard} onMatchHistoryClick={scrollToMatchHistory} onSignOutClick={handleSignOut} />
      {/* <NavBar onLeaderboardClick={scrollToLeaderboard} /> */}

      <main>
        <section>
          <h2>New Match</h2>
          <MatchForm
            playersList={playersList}
            onAddMatch={handleAddMatch}
            matchType={matchType}
            onMatchTypeChange={setMatchType}
            matches={matches}
          />
        </section>

        <section ref={matchHistoryRef}>
          <h2>Match History</h2>
          <MatchHistory 
            matches={matches} 
            onFilterChange={(filter: FilterOption) => setHistoryFilter(filter)}
          />
        </section>

        <section ref={leaderboardRef}>
          <h2>Leaderboard</h2>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={buchholzEnabled}
              onChange={(e) => setBuchholzEnabled(e.target.checked)}
            />
            <span>Enable Buchholz Weighting</span>
          </label>

          <Leaderboard matches={matches} buchholzEnabled={buchholzEnabled} />
        </section>
      </main>
    </>
  );
}

export default App;