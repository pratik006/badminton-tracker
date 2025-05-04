import React, { useState, useEffect, useRef } from "react";
import Header from "./Header";
import NavBar from "./NavBar";
import MatchForm from "./MatchForm";
import MatchHistory from "./MatchHistory";
import Leaderboard from "./Leaderboard";
//import * as store from "../utils/storeLocal"; // Using local store here
import { storeFirestore as store } from "../utils/storeFirestore"; // Using firestore
import { Match, MatchType, Player } from "../types/types";

function App() {
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchType, setMatchType] = useState<MatchType>("Doubles");
  const [buchholzEnabled, setBuchholzEnabled] = useState(false);
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const matchHistoryRef = useRef<HTMLDivElement>(null);

  // Load players and matches initially
  useEffect(() => {
    async function loadData() {
      const players: Player[] = await store.fetchPlayersList();
      const matchesFetched: Match[] = await store.fetchMatchHistory();

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

      setPlayersList(recentPlayers);
      setMatches(matchesFetched);
    }
    loadData();
  }, []);

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
      //const yOffset = -10;
      //const y = leaderboardRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
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
      <Header onLeaderboardClick={scrollToLeaderboard} onMatchHistoryClick={scrollToMatchHistory} />
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
          <MatchHistory matches={matches} />
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