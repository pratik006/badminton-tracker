import { Match, Player } from "../types/types";
import { getAuth } from "firebase/auth";
import { storeFirestore } from "../components/firestore/storeFirestore";

export type FilterOption = 'last7days' | 'thisWeek' | 'lastMonth' | 'thisMonth' | 'MyMatches';

export async function getPredicate(filter: FilterOption): Promise<(match: Match) => boolean> {
  const now = new Date();
  
  switch (filter) {
    case 'last7days': {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return (match: Match) => Boolean(match.matchDate && new Date(match.matchDate) >= sevenDaysAgo);
    }
      
    case 'thisWeek': {
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay()); // Start of current week (Sunday)
      return (match: Match) => Boolean(match.matchDate && new Date(match.matchDate) >= thisWeek);
    }
      
    case 'lastMonth': {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return (match: Match) => Boolean(match.matchDate && new Date(match.matchDate) >= lastMonth);
    }
      
    case 'thisMonth': {
      const thisMonth = new Date();
      thisMonth.setDate(1); // Start of current month
      return (match: Match) => Boolean(match.matchDate && new Date(match.matchDate) >= thisMonth);
    }

    case 'MyMatches': {
      const currentUserEmail = getAuth().currentUser?.email;
      const playerId = (await storeFirestore.fetchPlayersList()).find((p: Player) => p.email === currentUserEmail)?.id;
      return (match: Match) => Boolean(playerId && (playerId === match.team1[0].id || playerId === match.team2[0].id 
          || playerId === match.team2[1].id || playerId === match.team1[1].id));
    }

    default:
      return () => true;
  }
}

export function formatDate(date: Date): string {
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-');
}

export const sevenDaysAgoStr = (sevenDaysAgo: Date) => formatDate(sevenDaysAgo);