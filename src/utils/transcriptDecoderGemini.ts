import { Match, Player } from "../types/types";
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '../components/firestore/storeFirestore';
import { doc, getDoc, getFirestore } from "firebase/firestore";

interface ParsedMatchData {
  team1: string[];
  team2: string[];
  scores: Array<[number, number]>;
  matchDate?: string;
}

// Cache for the API key
let geminiApiKey: string;

async function getGeminiApiKey(): Promise<string> {
  // Use environment variable in development
  if (process.env.NODE_ENV !== 'production') {
    const envKey = process.env.REACT_APP_FIREBASE_GEMINI_API_KEY;
    if (!envKey) {
      throw new Error('Gemini API key is not configured in environment variables');
    }
    return envKey;
  }

  // Check cache first
  if (geminiApiKey) {
    return geminiApiKey;
  }

  // Fetch from Firebase Realtime Database in production
  try {
    const db = getFirestore(app);
    const docRef = doc(db, 'apiKeys', 'geminiKey');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Gemini API key not found in Firestore');
    }
    
    geminiApiKey = docSnap.data().value; // Assuming the field is named 'key' in the document
    return geminiApiKey;
  } catch (error) {
    console.error('Error fetching Gemini API key:', error);
    throw new Error('Failed to retrieve Gemini API key');
  }
}

export async function transcriptDecoderGemini(
  transcript: string,
  players: Player[],
  currentUser: string = ''
): Promise<Match | null> {
  try {
    // Prepare the prompt for Gemini
    const playerNames = players.map(p => p.name).join(', ');
    const prompt = `Parse the following badminton match transcript into a structured JSON format. 
    Extract the following information:
    - team1: Array of player names (1 or 2 players)
    - team2: Array of player names (1 or 2 players)
    - scores: Array of score tuples [team1Score, team2Score] for each game
    - matchDate: Date in YYYY-MM-DD format if mentioned, otherwise use today's date
    
    Available players: ${playerNames}
    
    Rules for matching player names:
    1. Perform fuzzy matching on player names (e.g., 'John' matches 'John Doe', 'Jon' matches 'John')
    2. Match nicknames to full names (e.g., 'Mike' matches 'Michael')
    3. Be case insensitive
    4. If a name is not found exactly, find the closest match from the available players
    5. If no close match is found, use the name as is
    
    Transcript: "${transcript}"
    
    Return only the JSON object with no additional text or markdown formatting.`;

    // Get the API key (from env in dev, from Firebase in prod)
    const apiKey = await getGeminiApiKey();

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error('No valid response from Gemini API');
    }

    // Clean up the response text if it's wrapped in markdown code blocks
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7, jsonText.lastIndexOf('```'));
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3, jsonText.lastIndexOf('```'));
    }

    const parsedData: ParsedMatchData = JSON.parse(jsonText);
    
    // Validate and process the parsed data
    if (!parsedData.team1 || !parsedData.team2 || !parsedData.scores) {
      throw new Error('Invalid response format from Gemini API');
    }

    // Map player names to Player objects
    const findPlayer = (name: string): Player => {
      const lowerName = name.toLowerCase();
      const player = players.find(p => p.name.toLowerCase() === lowerName);
      return player || { 
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        email: null,
        groups: []
      };
    };

    const team1Players = parsedData.team1.map(findPlayer);
    const team2Players = parsedData.team2.map(findPlayer);

    // Calculate winner (1 for team1, 2 for team2, 0 for draw)
    let winner = 0;
    const team1Total = parsedData.scores.reduce((sum, [t1, t2]) => t1 > t2 ? sum + 1 : sum, 0);
    const team2Total = parsedData.scores.length - team1Total;
    if (team1Total > team2Total) winner = 1;
    else if (team2Total > team1Total) winner = 2;

    return {
      id: -1, // This will be set by the database
      team1: team1Players,
      team2: team2Players,
      team1Scores: parsedData.scores.map(s => s[0]),
      team2Scores: parsedData.scores.map(s => s[1]),
      matchDate: parsedData.matchDate || new Date().toISOString().split('T')[0],
      createdTs: new Date().toISOString(),
      createdBy: currentUser,
      winner
    };
  } catch (error) {
    console.error('Error decoding transcript with Gemini:', error);
    return null;
  }
}