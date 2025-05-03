import React, { useState, useEffect } from "react";
import { calculateLeaderboard, LEADERBOARD_CONFIG } from "../utils/leaderboardUtils";
import { Match, PlayerStat } from "../types/types";

function Leaderboard({ matches, buchholzEnabled }: { matches: Match[]; buchholzEnabled: boolean }) {
  const [timeframe, setTimeframe] = useState("monthly");
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [sortedPlayers, setSortedPlayers] = useState<PlayerStat[]>([]);

  // Filter matches by timeframe
  useEffect(() => {
    const now = new Date();

    // Helper to get ISO week number
    function getWeekNumber(date: Date) {
      const tempDate = new Date(date.getFullYear(), 0, 1);
      const dayNum = (date.getDay() + 6) % 7;
      tempDate.setDate(tempDate.getDate() + 4 - ((tempDate.getDay() + 6) % 7));
      const weekNum = Math.floor(1 + (date.getTime() - tempDate.getTime()) / (7 * 24 * 3600 * 1000));
      return weekNum;
    }

    const filtered: Match[] = matches.filter((match) => {
      if (!match.matchDate) return false;
      const matchDate = new Date(match.matchDate);
      if (timeframe === "overall") {
        return true;
      }
      if (timeframe === "monthly") {
        return (
          matchDate.getFullYear() === now.getFullYear() &&
          matchDate.getMonth() === now.getMonth()
        );
      }
      if (timeframe === "weekly") {
        return (
          matchDate.getFullYear() === now.getFullYear() &&
          getWeekNumber(matchDate) === getWeekNumber(now)
        );
      }
      return false;
    });
    setFilteredMatches(filtered);
  }, [matches, timeframe]);

  // Calculate leaderboard players sorted on filtered matches
  useEffect(() => {
    const leaderboard: PlayerStat[] = calculateLeaderboard(filteredMatches, LEADERBOARD_CONFIG, buchholzEnabled).map((player) => ({ ...player, id: player.player.id }));
    setSortedPlayers(leaderboard);
  }, [filteredMatches, buchholzEnabled]);

  if (matches.length === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "16px" }}>
        No matches played yet.
      </div>
    );
  }

  return (
    <>
      <div className="leaderboard-header">
        <label htmlFor="timeframeSelect" style={{ color: "var(--color-text-muted)", fontWeight: "600" }}>
          Timeframe:
        </label>
        <select
          id="timeframeSelect"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          aria-label="Select leaderboard timeframe"
          style={{ padding: "5px 12px", borderRadius: 3, backgroundColor: "#616161", color: "#EEE", border: "none" }}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="overall">Overall</option>
        </select>
      </div>

      <table className="leaderboard-table" role="table" aria-describedby="leaderDesc">
        <caption id="leaderDesc" className="sr-only">
          Leaderboard showing player names, points, Buchholz score, matches played, won and win percentage
        </caption>
        <thead>
          <tr key="leaderboard-header">
            <th>Player</th>
            <th title="Adjusted points with Buchholz weighting">Points</th>            
            <th>Matches Played</th>
            <th>Matches Won</th>
            <th>Buchholz</th>
            <th>Win %</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "12px" }}>
                No matches for selected timeframe.
              </td>
            </tr>
          ) : (
            sortedPlayers.map((player) => {
              const winPct =
                player.played === 0 ? 0 : ((player.won / player.played) * 100).toFixed(1);
              return (
                <tr key={player.player.id}>
                  <td>{player.player.name}</td>
                  <td>{player.points.toFixed(1)}</td>                  
                  <td>{player.played}</td>
                  <td>{player.won}</td>
                  <td>{player.opponentPointsSum.toFixed(1)}</td>
                  <td>{winPct}%</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </>
  );
}

export default Leaderboard;