import React, { useState, useEffect } from "react";
import { Match, MatchPlayer, Player, MatchType } from "../types/types";

const MAX_SETS = 3;

function MatchForm({ playersList, onAddMatch, matchType, onMatchTypeChange }: 
      { playersList: Player[]; 
        onAddMatch: (match: Match) => Promise<void>; 
        matchType: MatchType; 
        onMatchTypeChange: (type: MatchType) => void 
      }) {
  // Local form states
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer>({
    team1p1: null,
    team1p2: null,
    team2p1: null,
    team2p2: null,
  });
  const [scores, setScores] = useState([{ team1: "", team2: "" }]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    // Reset players & scores on match type change
    if (matchType === "Singles") {
      setMatchPlayers({ team1p1: null, team1p2: null, team2p1: null, team2p2: null });
      setScores([{ team1: "", team2: "" }]);
    } else {
      setMatchPlayers({ team1p1: null, team1p2: null, team2p1: null, team2p2: null });
      setScores([{ team1: "", team2: "" }]);
    }
  }, [matchType]);

  const handlePlayerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const player = playersList.find((p) => p.name === value);
    setMatchPlayers((prev) => ({ ...prev, [name]: player }));
};

  const handleScoreChange = (index: number, team: string, value: string) => {
    // Allow digits only
    if (value === "" || /^\d+$/.test(value)) {
      setScores((prev) => {
        const copy = [...prev];
        copy[index][team as keyof typeof copy[0]] = value;
        return copy;
      });
    }
  };

  const addSet = () => {
    if (scores.length < MAX_SETS) {
      setScores((prev) => [...prev, { team1: "", team2: "" }]);
    }
  };

  const validateForm = () => {
    // Validate player fields filled & unique
    const players: (Player|null)[] =
      matchType === "Singles"
        ? [matchPlayers.team1p1, matchPlayers.team2p1]
        : [matchPlayers.team1p1, matchPlayers.team1p2, matchPlayers.team2p1, matchPlayers.team2p2];

    if (players.some((p) => p === null)) {
      alert("Please enter all player names.");
      return false;
    }

    const lowered = players.map((p) => p!.name.toLowerCase());
    if (new Set(lowered).size !== lowered.length) {
      alert("Player names must be unique.");
      return false;
    }

    // Validate scores - at least one set with valid winner (>=21 no tie)
    const t1Scores = scores.map((s) => parseInt(s.team1) || 0);
    const t2Scores = scores.map((s) => parseInt(s.team2) || 0);

    const validSet = t1Scores.some(
      (t1, i) =>
        (t1 >= 21 || t2Scores[i] >= 21) && t1 !== t2Scores[i]
    );

    if (!validSet) {
      alert("Please enter valid scores for at least one set with no tie and minimum 21 points.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setAdding(true);

    const team1 =
      matchType === "Singles"
        ? [matchPlayers.team1p1]
        : [matchPlayers.team1p1, matchPlayers.team1p2];
    const team2 =
      matchType === "Singles"
        ? [matchPlayers.team2p1]
        : [matchPlayers.team2p1, matchPlayers.team2p2];

    const team1Scores = scores.map((s) => parseInt(s.team1) || 0);
    const team2Scores = scores.map((s) => parseInt(s.team2) || 0);

    // Determine winner
    let t1Wins = 0,
      t2Wins = 0;
    team1Scores.forEach((score, i) => {
      if (score > team2Scores[i]) t1Wins++;
      else if (team2Scores[i] > score) t2Wins++;
    });
    let winner = 0;
    if (t1Wins > t2Wins) winner = 1;
    else if (t2Wins > t1Wins) winner = 2;

    const newMatch = {
      id: -1,
      type: matchType,
      team1,
      team2,
      team1Scores,
      team2Scores,
      winner,
      matchDate: date,
    };

    await onAddMatch(newMatch as Match);

    setAdding(false);
    // Reset after add
    setMatchPlayers({
      team1p1: null,
      team1p2: null,
      team2p1: null,
      team2p2: null,
    });
    setScores([{ team1: "", team2: "" }]);
    setDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="btn-group" role="group" aria-label="Select match type">
        <button
          type="button"
          className={matchType === "Doubles" ? "active" : ""}
          aria-pressed={matchType === "Doubles"}
          onClick={() => onMatchTypeChange("Doubles")}
        >
          Doubles
        </button>
        <button
          type="button"
          className={matchType === "Singles" ? "active" : ""}
          aria-pressed={matchType === "Singles"}
          onClick={() => onMatchTypeChange("Singles")}
        >
          Singles
        </button>        
      </div>

      <div className="player-inputs">
        {/* Render players inputs dynamically */}
        <div className="input-wrapper half">
          <label htmlFor="team1p1">{matchType === "Singles" ? "Team 1 Player" : "Team 1 Player 1"}</label>
          <input
            type="text"
            id="team1p1"
            name="team1p1"
            list="team1p1List"
            autoComplete="off"
            value={matchPlayers.team1p1?.name}
            onChange={handlePlayerChange}
            required
            placeholder="Search or type"
          />
          <datalist id="team1p1List">
            {playersList.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </div>

        {matchType === "Doubles" && (
          <div className="input-wrapper half">
            <label htmlFor="team1p2">Team 1 Player 2</label>
            <input
              type="text"
              id="team1p2"
              name="team1p2"
              list="team1p2List"
              autoComplete="off"
              value={matchPlayers.team1p2?.name}
              onChange={handlePlayerChange}
              required
              placeholder="Search or type"
            />
            <datalist id="team1p2List">
              {playersList.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
        )}

        <div className="input-wrapper half">
          <label htmlFor="team2p1">{matchType === "Singles" ? "Team 2 Player" : "Team 2 Player 1"}</label>
          <input
            type="text"
            id="team2p1"
            name="team2p1"
            list="team2p1List"
            autoComplete="off"
            value={matchPlayers.team2p1?.name}
            onChange={handlePlayerChange}
            required
            placeholder="Search or type"
          />
          <datalist id="team2p1List">
            {playersList.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </div>

        {matchType === "Doubles" && (
          <div className="input-wrapper half">
            <label htmlFor="team2p2">Team 2 Player 2</label>
            <input
              type="text"
              id="team2p2"
              name="team2p2"
              list="team2p2List"
              autoComplete="off"
              value={matchPlayers.team2p2?.name}
              onChange={handlePlayerChange}
              required
              placeholder="Search or type"
            />
            <datalist id="team2p2List">
              {playersList.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
        )}
      </div>

      <div className="input-wrapper half">
        <label htmlFor="matchDate">Match Date</label>
        <input
          type="date"
          id="matchDate"
          name="matchDate"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div>
        {scores.map((setScore, i) => (
          <div className="scores-group" key={`set-${i}`}>
            <div className="input-wrapper half">
              <label htmlFor={`team1Set${i + 1}`}>Set {i + 1} - Team 1 Score</label>
              <input
                id={`team1Set${i + 1}`}
                type="number"
                min="0"
                max="30"
                value={setScore.team1}
                onChange={(e) => handleScoreChange(i, "team1", e.target.value)}
                required
                placeholder="0"
              />
            </div>

            <div className="input-wrapper half">
              <label htmlFor={`team2Set${i + 1}`}>Set {i + 1} - Team 2 Score</label>
              <input
                id={`team2Set${i + 1}`}
                type="number"
                min="0"
                max="30"
                value={setScore.team2}
                onChange={(e) => handleScoreChange(i, "team2", e.target.value)}
                required
                placeholder="0"
              />
            </div>
          </div>
        ))}
      </div>

      {/* <button type="button" id="addSetBtn" onClick={addSet} disabled={scores.length >= MAX_SETS}>
        Add Set
      </button> */}

      <button type="submit" className="submit-btn" disabled={adding}>
        {adding ? "Adding..." : "Add Match to History"}
      </button>
    </form>
  );
}

export default MatchForm;