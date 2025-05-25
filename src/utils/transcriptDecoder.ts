import { Match, Player } from "../types/types";

export interface PartialMatch extends Omit<Match, 'id' | 'createdTs' | 'createdBy'> {
  id?: string | number;
  createdTs?: string;
  createdBy?: string;
}

/**
 * Parses a transcript string into a complete Match object with partial matches
 * @param transcript The spoken transcript to parse
 * @param players List of available players for name matching
 * @param currentUser The current user's ID (for createdBy field)
 * @returns A Match object with as much information as could be parsed, or null if nothing could be parsed
 */
export function parseTranscriptToMatch(
  transcript: string, 
  players: Player[],
  currentUser: string = ''
): Match | null {
  try {
    // Normalize the transcript for easier parsing
    const normalized = transcript.toLowerCase().trim();
    
    // Extract match data from the transcript
    const matchData = extractMatchData(normalized, players);
    
    if (!matchData) {
      console.warn('No match data could be extracted from transcript');
      return null;
    }
    
    // Create a complete match object with all required fields
    const match: Match = {
      id: -1,
      team1: matchData.team1 || [],
      team2: matchData.team2 || [],
      team1Scores: matchData.team1Scores || [0],
      team2Scores: matchData.team2Scores || [0],
      winner: matchData.winner || 0,
      matchDate: matchData.matchDate || new Date().toISOString().split('T')[0],
      createdTs: new Date().toISOString(),
      createdBy: currentUser
    };
    
    // Calculate winner if we have scores but no winner
    if (match.team1Scores.length > 0 && match.team2Scores.length > 0 && !matchData.winner) {
      const team1Total = match.team1Scores.reduce((a, b) => a + b, 0);
      const team2Total = match.team2Scores.reduce((a, b) => a + b, 0);
      match.winner = team1Total > team2Total ? 1 : team2Total > team1Total ? 2 : 0;
    }
    
    return match;
  } catch (error) {
    console.error('Error parsing transcript to match:', error);
    return null;
  }
}

// Helper function to parse scores from a string like "21 18" into arrays of numbers
function parseScores(scoreStr: string): { team1Scores: number[], team2Scores: number[] } {
  const team1Scores: number[] = [];
  const team2Scores: number[] = [];
  
  // Split by any non-digit characters to get all numbers
  const numbers = scoreStr.split(/\D+/).filter(Boolean).map(Number);
  
  // If we have at least two numbers at the end, treat them as team1 and team2 scores
  if (numbers.length >= 2) {
    const team1 = Math.min(numbers[numbers.length - 2], 30);
    const team2 = Math.min(numbers[numbers.length - 1], 30);
    
    team1Scores.push(team1);
    team2Scores.push(team2);
    
    // If we have more numbers, process them as additional sets
    for (let i = 0; i < numbers.length - 2; i += 2) {
      const t1 = Math.min(numbers[i], 30);
      const t2 = i + 1 < numbers.length ? Math.min(numbers[i + 1], 30) : 0;
      team1Scores.unshift(t1);
      team2Scores.unshift(t2);
    }
  }
  
  return { team1Scores, team2Scores };
}

// Helper function to extract match data from transcript with partial matching
function extractMatchData(transcript: string, players: Player[]): PartialMatch | null {
  // Initialize with default values
  const result: PartialMatch = {
    team1: [],
    team2: [],
    team1Scores: [],
    team2Scores: [],
    winner: 0,
    matchDate: new Date().toISOString().split('T')[0]
  };

  // Try to extract date (e.g., "today", "yesterday", or specific date)
  const dateMatch = transcript.match(/(today|yesterday|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    const dateStr = dateMatch[0].toLowerCase();
    if (dateStr === 'today') {
      result.matchDate = new Date().toISOString().split('T')[0];
    } else if (dateStr === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      result.matchDate = yesterday.toISOString().split('T')[0];
    } else {
      result.matchDate = dateStr; // Assume it's already in YYYY-MM-DD format
    }
  }

  // Try to extract scores (e.g., "21 18" or "21-18 15-21")
  const scoreMatches = transcript.matchAll(/(\d+)[-\s]+(\d+)/g);
  let scoreString = '';
  
  // Combine all score matches into a single string
  for (const match of scoreMatches) {
    scoreString += match[1] + ' ' + match[2] + ' ';
  }
  
  // If no score matches found, try to find any two numbers at the end of the transcript
  if (!scoreString.trim()) {
    const numberMatches = transcript.match(/\b(\d+)\s+(\d+)\s*$/);
    if (numberMatches) {
      scoreString = numberMatches[1] + ' ' + numberMatches[2];
    }
  }
  
  // Parse the scores if we found any
  if (scoreString.trim()) {
    const { team1Scores, team2Scores } = parseScores(scoreString);
    if (team1Scores.length > 0 && team2Scores.length > 0) {
      result.team1Scores = team1Scores;
      result.team2Scores = team2Scores;
      
      // Determine winner based on the last set
      const lastSet1 = team1Scores[team1Scores.length - 1];
      const lastSet2 = team2Scores[team2Scores.length - 1];
      
      if (lastSet1 > lastSet2) {
        result.winner = 1; // team1 won
      } else if (lastSet2 > lastSet1) {
        result.winner = 2; // team2 won
      } else {
        result.winner = 0; // tie
      }
    }
  }

  // Try to extract player names
  const namePatterns = [
    // "[name1] and [name2] (beat|vs) [name3] and [name4]"
    /(?:^|\s)([a-z]+)(?:\s+and\s+([a-z]+))?\s+(?:beat|vs\.?|versus?)\s+([a-z]+)(?:\s+and\s+([a-z]+))?/i,
    // "[name1] [name2] vs [name3] [name4]"
    /(?:^|\s)([a-z]+)(?:\s+([a-z]+))?\s+vs\.?\s+([a-z]+)(?:\s+([a-z]+))?/i,
  ];

  for (const pattern of namePatterns) {
    const match = transcript.match(pattern);
    if (match) {
      const [_, p1, p2, p3, p4] = match;
      
      // Find players by name
      const team1Players = findPlayers([p1, p2].filter(Boolean) as string[], players);
      const team2Players = findPlayers([p3, p4].filter(Boolean) as string[], players);
      
      if (team1Players.length > 0) result.team1 = team1Players;
      if (team2Players.length > 0) result.team2 = team2Players;
      
      // If we found players, we can break after the first successful match
      if (result.team1.length > 0 || result.team2.length > 0) {
        break;
      }
    }
  }

  // If we have some data, return it even if incomplete
  if (result.team1.length > 0 || result.team2.length > 0 || result.team1Scores.length > 0) {
    return result;
  }

  return null;
}

// Helper function to find players by name with fuzzy matching
function findPlayers(names: string[], players: Player[]): Player[] {
  const foundPlayers: Player[] = [];
  
  for (const name of names) {
    if (!name) continue;
    
    // Skip common words that might be mistaken for names
    const commonWords = ['and', 'vs', 'versus', 'beat', 'won', 'lost', 'to'];
    if (commonWords.includes(name.toLowerCase())) continue;
    
    // Try exact match first (case insensitive)
    let player = players.find(p => p.name.toLowerCase() === name.toLowerCase());
    
    // If no exact match, try partial match on first name
    if (!player) {
      player = players.find(p => 
        p.name.toLowerCase().split(/\s+/).some(part => 
          part.toLowerCase().startsWith(name.toLowerCase())
        )
      );
    }
    
    // If still no match, try any partial match
    if (!player) {
      player = players.find(p => 
        p.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    
    if (player && !foundPlayers.some(p => p.id === player!.id)) {
      foundPlayers.push(player);
    }
  }
  
  return foundPlayers;
}

// Example usage:
/*
const players = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
  { id: '4', name: 'Alice Williams', email: 'alice@example.com' }
];

// Different ways to say the same thing:
const transcripts = [
  "John and Jane beat Bob and Alice 21-18 15-21 21-19",
  "21-18 John Jane vs Bob Alice",
  "John Doe Jane Smith 21 18",
  "John won 21-18",
  "21-18 John",
  "yesterday John and Jane vs Bob and Alice"
];

for (const transcript of transcripts) {
  const match = parseTranscriptToMatch(transcript, players, 'current-user-id');
  console.log(`\n"${transcript}":`, match);
}
*/
