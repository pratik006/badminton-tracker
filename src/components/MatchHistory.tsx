import React from "react";
import { Match } from "../types/types";

function formatScores(scores: number[]) {
  return scores.map((s) => String(s).padStart(2, " ")).join("  ");
}

function MatchHistory({ matches }: { matches: Match[] }) {
  if (matches.length === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "16px" }}>
        No matches recorded yet.
      </div>
    );
  }

  return (
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
  );
}

export default MatchHistory;