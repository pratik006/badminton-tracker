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
import Profile from "./Profile";
import { parseTranscriptToMatch } from '../utils/transcriptDecoder';
import { createSpeechRecognition, isSpeechRecognitionSupported, requestMicrophonePermission } from '../utils/speechRecognition';
import { transcriptDecoderGemini } from '../utils/transcriptDecoderGemini';

declare global {
  interface Window {
    stream: MediaStream | null;
  }
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchType, setMatchType] = useState<MatchType>("Doubles");
  const [buchholzEnabled, setBuchholzEnabled] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<FilterOption>('last7days');
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const matchHistoryRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [parsedMatch, setParsedMatch] = useState<Match | null>(null);
  const speechRecognitionRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(null);

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

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      console.warn('Speech recognition is not supported in this browser');
      return;
    }

    speechRecognitionRef.current = createSpeechRecognition({
      onResult: async (transcript: string) => {
        console.log('Speech Recognition Result:', transcript);
        const match = await transcriptDecoderGemini(transcript, playersList, currentUser?.uid || '');
        if (match) {
          console.log(match)
          setParsedMatch(match);
          const formElement = document.getElementById('match-form');
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth' });
          }
        }
      },
      onError: (error) => {
        console.error('Speech recognition error:', error);
        setIsListening(false);
      },
      onStart: () => {
        console.log('Speech recognition started');
        setIsListening(true);
      },
      onEnd: () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      },
      continuous: false,
      interimResults: false,
      silenceTimeoutMs: 3000
    });

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    };
  }, [playersList, currentUser]);

  // Toggle voice recognition
  const toggleVoiceRecognition = async () => {
    if (!speechRecognitionRef.current) {
      console.error('Speech recognition not initialized');
      return;
    }

    if (isListening) {
      speechRecognitionRef.current.stop();
    } else {
      try {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          alert('Microphone access is required for voice input');
          return;
        }
        
        setParsedMatch(null);
        speechRecognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        alert('Failed to start voice input. Please try again.');
      }
    }
  };

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

  // Scroll Profile into view on nav button click
  const handleProfileClick = () => {
    
   // show profile page
   if (profileRef.current) {
    profileRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Handle adding new match
  async function handleAddMatch(match: Match) {
    const savedMatch = await store.saveMatch(match) as Match;
    setMatches((prev) => [savedMatch, ...prev]);

    // Update players list if needed
    savedMatch.team1.concat(savedMatch.team2).forEach((p) => {
      if (!playersList.includes(p)) setPlayersList((pl) => [...pl, p]);
    });
  }

  if (!currentUser) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  return (
    <>
      <Header onLeaderboardClick={scrollToLeaderboard} onMatchHistoryClick={scrollToMatchHistory} onSignOutClick={handleSignOut} onProfileClick={handleProfileClick} />
      {/* <NavBar onLeaderboardClick={scrollToLeaderboard} /> */}

      <main>
        <section>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '10px'
          }}>
            <h2 style={{ margin: 0 }}>New Match</h2>
            <button 
              onClick={toggleVoiceRecognition}
              style={{
                background: isListening ? '#ff4444' : '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '4px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '14px',
                color: isListening ? 'white' : '#333',
                transition: 'all 0.3s',
              }}
              title={isListening ? 'Stop Voice Control' : 'Start Voice Control'}
              aria-label={isListening ? 'Stop Voice Control' : 'Start Voice Control'}
            >
              {isListening ? 'Listening...' : 'Voice'}
            </button>
          </div>
          <div id="match-form">
            <MatchForm 
              playersList={playersList}
              onAddMatch={handleAddMatch}
              matchType={matchType}
              onMatchTypeChange={setMatchType}
              matches={matches}
              initialMatch={parsedMatch}
            />
          </div>
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

        <section ref={profileRef}>
          <Profile />
        </section>
      </main>
    </>
  );
}

export default App;