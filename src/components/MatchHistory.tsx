import React, { useState } from "react";
import { Match } from "../types/types";

type FilterOption = 'last7days' | 'thisWeek' | 'lastMonth' | 'thisMonth';

function formatScores(scores: number[]) {
  return scores.map((s) => String(s).padStart(2, " ")).join("  ");
}

function MatchHistoryHeader({ onFilterChange }: { onFilterChange: (filter: FilterOption) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <select 
        onChange={(e) => onFilterChange(e.target.value as FilterOption)}
        style={{ padding: "5px 12px", borderRadius: 3, backgroundColor: "#616161", color: "#EEE", border: "none" }}
      >
        <option value="last7days">Last 7 Days</option>
        <option value="thisWeek">This Week</option>
        <option value="lastMonth">Last Month</option>
        <option value="thisMonth">This Month</option>
        <option value="MyMatches">My Matches</option>
      </select>
    </div>
  );
}

function MatchHistory({ matches, onFilterChange }: { matches: Match[]; onFilterChange: (filter: FilterOption) => void }) {
  const [filter, setFilter] = useState<FilterOption>('last7days');

  if (matches.length === 0) {
    return (
      <>
        <MatchHistoryHeader onFilterChange={onFilterChange} />
        <div style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "16px" }}>
          No matches recorded yet.
        </div>
      </>
    );
  }

  return (
    <>
      <MatchHistoryHeader onFilterChange={onFilterChange} />
      <div className="match-history-list" aria-live="polite">
        {matches.map((match) => (
          <div className="match-card" key={match.id}>
            <h3>
              {match.team1.map((p) => p.name).join(" / ")} vs {match.team2.map((p) => p.name).join(" / ")}
            </h3>

            <div style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: "6px" }}>
              Date: {match.matchDate || "N/A"}
            </div>

            <div className="team-scores">
              <div className="team-names">{match.team1.map((p) => p.name).join(" / ")}</div>
              <div className="team-points">{formatScores(match.team1Scores)}</div>
            </div>
            <div className="team-scores">
              <div className="team-names">{match.team2.map((p) => p.name).join(" / ")}</div>
              <div className="team-points">{formatScores(match.team2Scores)}</div>
            </div>

            <div className="match-result">
              {match.winner === 0
                ? "Match ended in a tie or invalid scores"
                : `Match won by ${match.winner === 1 ? match.team1.map((p) => p.name).join(" / ") : match.team2.map((p) => p.name).join(" / ")}`}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default MatchHistory;