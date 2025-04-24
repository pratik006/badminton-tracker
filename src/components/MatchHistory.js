import React from "react";

function formatScores(scores) {
  return scores.map((s) => String(s).padStart(2, " ")).join("  ");
}

function MatchHistory({ matches }) {
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
            {match.team1.join(" / ")} vs {match.team2.join(" / ")}
          </h3>

          <div style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: "6px" }}>
            Date: {match.matchDate || "N/A"}
          </div>

          <div className="team-scores">
            <div className="team-names">{match.team1.join(" / ")}</div>
            <div className="team-points">{formatScores(match.team1Scores)}</div>
          </div>
          <div className="team-scores">
            <div className="team-names">{match.team2.join(" / ")}</div>
            <div className="team-points">{formatScores(match.team2Scores)}</div>
          </div>

          <div className="match-result">
            {match.winner === 0
              ? "Match ended in a tie or invalid scores"
              : `Match won by ${match.winner === 1 ? match.team1.join(" / ") : match.team2.join(" / ")}`}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MatchHistory;