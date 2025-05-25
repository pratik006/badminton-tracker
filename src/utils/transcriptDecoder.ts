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
  
  if (!scoreStr) return { team1Scores, team2Scores };

  // Handle different score formats:
  // - "score is 21 space 18"
  // - "21 18"
  // - "21-18"
  // - "21,18"
  // - "21 space 18"
  const scorePatterns = [
    /score is (\d+)(?:\s+space\s+|\s+|[-,])(\d+)/i,  // "score is 21 space 18" or "score is 21-18"
    /(\d+)(?:\s+space\s+|\s+|[-,])(\d+)/,         // "21 18", "21-18", "21,18", "21 space 18"
    /(\d+)(\d{2})/                                // "2118" (for backward compatibility)
  ];

  for (const pattern of scorePatterns) {
    const match = scoreStr.match(pattern);
    if (match) {
      const score1 = Math.min(parseInt(match[1], 10), 30);
      const score2 = Math.min(parseInt(match[2], 10), 30);
      
      if (!isNaN(score1) && !isNaN(score2)) {
        team1Scores.push(score1);
        team2Scores.push(score2);
        break;
      }
    }
  }

  // If no scores found with patterns, try to extract all numbers
  if (team1Scores.length === 0) {
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

  // Try different patterns to extract player names
  const patterns = [
    // Pattern for "priyanka pratyek versus shyam and hasu"
    /^(.+?)\s+(?:vs|versus)\s+(.+?)(?:\s+\d+\s+\d+)?$/i,
    // Existing patterns...
    /^(\w+)(?:\s+and\s+(\w+))?\s+(?:beat|won)\s+(?:against\s+)?(\w+)(?:\s+and\s+(\w+))?/i,
    /^(\w+)(?:\s+and\s+(\w+))?\s+vs\.?\s+(\w+)(?:\s+and\s+(\w+))?/i,
    /^(\w+)(?:\s*,\s*(\w+))?\s+(?:beat|won)\s+(?:against\s+)?(\w+)(?:\s*,\s*(\w+))?/i,
    /^(\w+)(?:\s*&\s*(\w+))?\s+(?:beat|won)\s+(?:against\s+)?(\w+)(?:\s*&\s*(\w+))?/i,
    /^(\w+)(?:\s+and\s+(\w+))?\s+(\d+)[-\s]+(\d+)/i,
    /^(\w+)\s+(?:beat|won)\s+(?:against\s+)?(\w+)/i,
    /^(\w+)\s+(\d+)[-\s]+(\d+)/i,
    /^(\w+)(?:\s+and\s+(\w+))?/i
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match) {
      console.log('Match found with pattern:', pattern, 'Groups:', match);
      
      // Extract names based on the pattern
      let team1Names: string[] = [];
      let team2Names: string[] = [];
      
      if (pattern.toString().includes('vs|versus')) {
        // Handle the new pattern with spaces between names on the same team
        const [_, team1Part, team2Part] = match;
        team1Names = team1Part.split(/\s+/).filter(name => name && !/^vs|versus$/i.test(name));
        team2Names = team2Part.split(/\s+/).filter(name => name && !/^vs|versus$/i.test(name));
      } else {
        // Handle existing patterns
        const [_, p1, p2, p3, p4] = match;
        if (p1) team1Names.push(p1);
        if (p2) team1Names.push(p2);
        if (p3) team2Names.push(p3);
        if (p4) team2Names.push(p4);
      }
      
      console.log('Extracted names - Team 1:', team1Names, 'Team 2:', team2Names);
      
      // Find players for each team
      const team1Players = findPlayers(team1Names, players);
      const team2Players = findPlayers(team2Names, players);
      
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

// Helper function to calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize the matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Deletion
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

// Helper function to find the best match using fuzzy search
function findBestMatch(input: string, options: string[]): { bestMatch: string | null; distance: number } {
  if (!options.length) return { bestMatch: null, distance: Infinity };
  
  const inputLower = input.toLowerCase();
  const optionsLower = options.map(opt => opt.toLowerCase());
  
  // First try exact match
  const exactMatchIndex = optionsLower.findIndex(opt => opt === inputLower);
  if (exactMatchIndex >= 0) {
    return { bestMatch: options[exactMatchIndex], distance: 0 };
  }
  
  // Try startsWith
  const startsWithMatch = optionsLower.find(opt => opt.startsWith(inputLower) || inputLower.startsWith(opt));
  if (startsWithMatch) {
    return { 
      bestMatch: options[optionsLower.indexOf(startsWithMatch)], 
      distance: Math.abs(inputLower.length - startsWithMatch.length) 
    };
  }
  
  // Try includes
  const includesMatch = optionsLower.find(opt => opt.includes(inputLower) || inputLower.includes(opt));
  if (includesMatch) {
    return { 
      bestMatch: options[optionsLower.indexOf(includesMatch)], 
      distance: Math.abs(inputLower.length - includesMatch.length) 
    };
  }
  
  // Fall back to Levenshtein distance
  let minDistance = Infinity;
  let bestMatch = options[0];
  
  for (const option of options) {
    const distance = levenshteinDistance(inputLower, option.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = option;
    }
  }
  
  // Only return a match if it's reasonably close
  const maxAllowedDistance = Math.min(3, Math.ceil(input.length / 2));
  return {
    bestMatch: minDistance <= maxAllowedDistance ? bestMatch : null,
    distance: minDistance
  };
}

// Helper function to find players by name with fuzzy matching
function findPlayers(names: string[], players: Player[]): Player[] {
  console.log('findPlayers called with:', { names, availablePlayers: players.map(p => p.name) });
  const foundPlayers: Player[] = [];
  if (!names || !players || !Array.isArray(players)) {
    console.log('Invalid input - names or players array is empty or invalid');
    return foundPlayers;
  }

  // Pre-process names to handle common variations
  const normalizeName = (name: string) => name.toLowerCase().trim();
  
  // Get all player names for fuzzy matching
  const playerNames = players.map(p => p.name);
  console.log('Available player names:', playerNames);

  for (const name of names) {
    if (!name) continue;
    
    const normalizedInput = normalizeName(name);
    console.log('Processing name:', { original: name, normalized: normalizedInput });
    
    // Skip common words that might be mistaken for names
    const commonWords = ['and', 'vs', 'versus', 'beat', 'won', 'lost', 'to', 'score', 'scores', 'is', 'are'];
    if (commonWords.includes(normalizedInput)) {
      console.log('Skipping common word:', normalizedInput);
      continue;
    }
    
    // Try to find the best match
    console.log('Looking for best match for:', normalizedInput);
    const { bestMatch, distance } = findBestMatch(normalizedInput, playerNames);
    console.log('Best match result:', { bestMatch, distance });
    
    if (bestMatch) {
      const player = players.find(p => p.name === bestMatch);
      console.log('Found player:', player);
      
      if (player && !foundPlayers.some(p => p.id === player.id)) {
        console.log('Adding player to found players:', player.name);
        foundPlayers.push(player);
      } else {
        console.log('Player not found or already added');
      }
    } else {
      console.log('No good match found for:', normalizedInput);
    }
  }
  
  console.log('Final found players:', foundPlayers.map(p => p.name));
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
