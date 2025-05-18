import { DocumentReference } from "firebase/firestore";

export type Match = {
    id: string | number;
    team1: Player[];
    team2: Player[];
    matchDate?: string | null;
    team1Scores: number[];
    team2Scores: number[];
    createdTs: string;
    createdBy: string;
    winner: number; // 0 = tie/invalid, 1 = team1, 2 = team2
  };

  export type MatchFirestore = {
    id: string | number;
    team1: DocumentReference[];
    team2: DocumentReference[];
    matchDate?: string | null;
    team1Scores: number[];
    team2Scores: number[];
    winner: number; // 0 = tie/invalid, 1 = team1, 2 = team2
    createdTs: number;
    createdBy: string;
  };  
  
export type Matches = Match[];

export type Player = {
    id: string | number;
    name: string;
    email: string | null;
    avatar?: string;
    groups?: Group[];
  };
  
  export type Players = Player[];

export type MatchType = "Doubles" | "Singles";

export type MatchPlayer = {
  team1p1: Player | null;
  team1p2: Player | null;
  team2p1: Player | null;
  team2p2: Player | null;
};

export type PlayerStat = {
    player: Player;
    played: number;
    won: number;
    points: number;
    opponents: Set<Player>;
    opponentPointsSum: number;
};

export type Activity = {
    id: string | number | undefined | null;
    type: ActivityType;
    createdTs: string;
    createdBy: string;
    oldValue: string;
    newValue: string;
};

export type Group = {
    id: string | number;
    name: string;
    registeredPlayers?: Player[];
};

export type Groups = Group[];

export type ActivityType = "SaveMatch" | "PlayerStat" | "LogIn" | "LogOut";

