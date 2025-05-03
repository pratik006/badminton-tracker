// Local dummy store providing async data loading/saving simulation

import { Match, Player } from "../types/types";

const localPlayersList = fetch('/test-data/players.json').then(res => res.json() as Promise<Player[]>);
const matchHistory = fetch('/test-data/matches.json').then(res => res.json() as Promise<Match[]>);
  
  export async function fetchPlayersList() {
    return await localPlayersList;
  }
  
  export async function saveMatch(matchRecord: Match) {
    const players: Player[] = await localPlayersList;
    const matches: Match[] = await matchHistory;
    return new Promise((res) => {
      setTimeout(() => {
        const id = "local-" + (matches.length + 1);
        const newMatch = { ...matchRecord, id } as Match;
        matches.unshift(newMatch);
  
        // Add players to list if new
        [...matchRecord.team1, ...matchRecord.team2].forEach((p) => {
          if (!players.includes(p)) players.push(p);
        });
  
        res(newMatch);
      }, 250);
    });
  }
  
  export async function fetchMatchHistory() {
    return await matchHistory;
  }
  
  export async function fetchLeaderboardData() {
    const players: Player[] = await localPlayersList;
    const matches: Match[] = await matchHistory;
    return new Promise((res) => {
      setTimeout(() => res({ players: [...players], matches: [...matches] }), 250);
    });
  }