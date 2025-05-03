export type Match = {
    id: string | number;
    team1: Player[];
    team2: Player[];
    matchDate?: string | null;
    team1Scores: number[];
    team2Scores: number[];
    winner: number; // 0 = tie/invalid, 1 = team1, 2 = team2
  };
  
export type Matches = Match[];

export type Player = {
    id: string | number;
    name: string;
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

