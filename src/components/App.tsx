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
  const recognitionRef = useRef<any>(null);
  const [parsedMatch, setParsedMatch] = useState<Match | null>(null);

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

  useEffect(() => {
    // @ts-ignore - webkitSpeechRecognition is available in the browser
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      console.log('Initializing speech recognition...');
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log('Voice command:', transcript);
        const match = parseTranscriptToMatch(transcript, playersList, currentUser?.uid || '');
  
        if (match) {
          console.log('Parsed match:', match);
          setParsedMatch(match);
          // Scroll to the form to show the prefilled data
          setTimeout(() => {
            const formElement = document.getElementById('match-form');
            if (formElement) {
              formElement.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        } 
        // Add your voice command handling logic here
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        // If we're still supposed to be listening, restart
        if (isListening) {
          console.log('Restarting speech recognition');
          recognitionRef.current.start();
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = 'Error with speech recognition';
        switch(event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone was found. Please ensure a microphone is connected.';
            break;
          case 'not-supported':
            errorMessage = 'Speech recognition is not supported in your browser.';
            break;
        }
        
        console.error('Speech recognition error details:', errorMessage);
        alert(errorMessage);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

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

  const toggleVoiceRecognition = async () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Try using Chrome or Edge.');
      return;
    }
  
    if (isListening) {
      console.log('Stopping speech recognition');
      try {
        // Stop any active media streams
        const tracks = window.stream?.getTracks() || [];
        tracks.forEach(track => track.stop());
        
        // Stop the recognition
        recognitionRef.current.stop();
        
        // Reset the stream reference
        window.stream = null;
      } catch (err) {
        console.error('Error stopping speech recognition:', err);
      } finally {
        setIsListening(false);
      }
    } else {
      console.log('Starting speech recognition');
      
      try {
        // First check if we can enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('Available audio input devices:', audioInputs);
        
        if (audioInputs.length === 0) {
          throw new Error('no-devices');
        }
        
        // Request permission and get the media stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Store the stream so we can stop it later
        window.stream = stream;
        
        console.log('Microphone access granted');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        console.error('Microphone access error:', err);
        
        // Stop any media tracks that might have been created
        if (window.stream) {
          window.stream.getTracks().forEach(track => track.stop());
          window.stream = null;
        }
        
        setIsListening(false);
        let errorMessage = 'Error accessing microphone. ';
        
        if (err.message === 'no-devices') {
          errorMessage += 'No microphone was found. Please connect a microphone and try again.';
        } else if (err.name === 'NotAllowedError') {
          errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No microphone was found. Please connect a microphone and try again.';
        } else {
          errorMessage += 'Please check your microphone connection and try again.';
        }
        
        alert(errorMessage);
      }
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

  // Scroll Profile into view on nav button click
  const handleProfileClick = () => {
    
   // show profile page
   if (profileRef.current) {
    profileRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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