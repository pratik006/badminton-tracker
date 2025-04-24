// Leaderboard calcs including Buchholz system

export const LEADERBOARD_CONFIG = {
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    buchholzWeight: 0.4,
  };
  
  /**
   * Determine set winner (1,2 or 0 for tie)
   */
  function determineSetWinner(t1, t2) {
    if (t1 > t2) return 1;
    if (t2 > t1) return 2;
    return 0;
  }
  
  /**
   * Calculate leaderboard points with Buchholz option
   * @param {Array} matches Match objects
   * @param {Object} config Weight config
   * @param {boolean} buchholzOn
   * @returns {Array} leaderboard sorted player stats
   */
  export function calculateLeaderboard(matches, config, buchholzOn) {
    const playerStats = {};
  
    for (const match of matches) {
      [...match.team1, ...match.team2].forEach((p) => {
        if (!playerStats[p]) {
          playerStats[p] = {
            name: p,
            played: 0,
            won: 0,
            points: 0,
            opponents: new Set(),
            opponentPointsSum: 0,
          };
        }
      });
    }
  
    for (const match of matches) {
      const winner = match.winner;
      const t1Players = match.team1;
      const t2Players = match.team2;
  
      for (const p1 of t1Players) {
        t2Players.forEach((p2) => playerStats[p1].opponents.add(p2));
      }
      for (const p2 of t2Players) {
        t1Players.forEach((p1) => playerStats[p2].opponents.add(p1));
      }
  
      [...t1Players, ...t2Players].forEach((p) => (playerStats[p].played += 1));
  
      if (winner === 0) {
        [...t1Players, ...t2Players].forEach((p) => {
          playerStats[p].points += config.drawPoints;
        });
      } else if (winner === 1) {
        t1Players.forEach((p) => {
          playerStats[p].points += config.winPoints;
          playerStats[p].won += 1;
        });
        t2Players.forEach((p) => (playerStats[p].points += config.lossPoints));
      } else if (winner === 2) {
        t2Players.forEach((p) => {
          playerStats[p].points += config.winPoints;
          playerStats[p].won += 1;
        });
        t1Players.forEach((p) => (playerStats[p].points += config.lossPoints));
      }
    }
  
    for (const p in playerStats) {
      let sumOppPoints = 0;
      playerStats[p].opponents.forEach((op) => {
        if (playerStats[op]) sumOppPoints += playerStats[op].points;
      });
      playerStats[p].opponentPointsSum = sumOppPoints;
      if (buchholzOn) {
        playerStats[p].points += config.buchholzWeight * sumOppPoints;
      }
    }
  
    return Object.values(playerStats).sort((a, b) => b.points - a.points);
  }