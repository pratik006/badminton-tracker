import React, { useState, useEffect } from "react";
import { Match, MatchPlayer, Player, MatchType } from "../types/types";
import { getAuth } from "firebase/auth";
import { timestamp } from "./firestore/storeFirestore";

const MAX_SETS = 3;

function MatchForm({ playersList, onAddMatch, matchType, onMatchTypeChange, initialMatch }: 
      { playersList: Player[]; 
        onAddMatch: (match: Match) => Promise<void>; 
        matchType: MatchType; 
        onMatchTypeChange: (type: MatchType) => void;
        initialMatch?: Match | null;
      }) {
  const [isPrefilled, setIsPrefilled] = useState(false);
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const successBannerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '4px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    zIndex: 1000,
    display: showSuccess ? 'block' : 'none',
    animation: 'fadeIn 0.3s, fadeOut 0.5s 2.5s',
  };

  const globalStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translate(-50%, -20px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translate(-50%, 0); }
      to { opacity: 0; transform: translate(-50%, -20px); }
    }
  `;

  useEffect(() => {
    // If we have an initialMatch, use that to prefill the form
    if (initialMatch) {
      const team1 = initialMatch.team1 || [];
      const team2 = initialMatch.team2 || [];
      
      setMatchPlayers({
        team1p1: team1[0] || null,
        team1p2: team1[1] || null,
        team2p1: team2[0] || null,
        team2p2: team2[1] || null,
      });

      // Set scores if available
      if (initialMatch.team1Scores && initialMatch.team2Scores) {
        const newScores = [];
        for (let i = 0; i < initialMatch.team1Scores.length; i++) {
          newScores.push({
            team1: initialMatch.team1Scores[i]?.toString() || "",
            team2: initialMatch.team2Scores[i]?.toString() || ""
          });
        }
        setScores(newScores.length > 0 ? newScores : [{ team1: "", team2: "" }]);
      }

      // Set date if available
      if (initialMatch.matchDate) {
        setDate(initialMatch.matchDate);
      }

      // Set match type based on team sizes if not already set
      if (team1.length === 1 && team2.length === 1) {
        onMatchTypeChange("Singles");
      } else {
        onMatchTypeChange("Doubles");
      }
      
      setIsPrefilled(true);
    } else {
      // Reset to default empty state
      setIsPrefilled(false);
    }
  }, [matchType, initialMatch, onMatchTypeChange]);

  const handlePlayerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const player = playersList.find((p) => p.name === value);
    setMatchPlayers((prev) => ({ ...prev, [name]: player }));
    setIsPrefilled(false);
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

  const updateOtherScore = (index: number, team: string, value: string) => {
    // Early exit if both fields are already numeric
    const currentSet = scores[index];
    if (
      currentSet &&
      !isNaN(Number(currentSet.team1)) &&
      currentSet.team1 !== "" &&
      !isNaN(Number(currentSet.team2)) &&
      currentSet.team2 !== ""
    ) {
      return;
    }


    if (team === "team2") {
      // User is entering score for team 2
      if (parseInt(value) < 20) {
        // Set team 1's score to 21
        setScores(prev => {
          const copy = [...prev];
          copy[index]["team1"] = "21";
          return copy;
        });
      } else {
        // Set team 1's score to value + 2
        setScores(prev => {
          const copy = [...prev];
          copy[index]["team1"] = String(parseInt(value) + 2);
          return copy;
        });
      }
    } else if (team === "team1") {
      if (parseInt(value) < 20) {
        // Set team 2's score to 21
        setScores(prev => {
          const copy = [...prev];
          copy[index]["team2"] = "21";
          return copy;
        });
      } else {
        // Set team 2's score to value + 2
        setScores(prev => {
          const copy = [...prev];
          copy[index]["team2"] = String(parseInt(value) + 2);
          return copy;
        });
      }
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

    // Format current date as yyyy-MM-ddTHH:mm:ss for match ID
    const now = new Date();
    const formatNum = (num: number) => num.toString().padStart(2, '0');
    const formattedDate = `${now.getFullYear()}-${formatNum(now.getMonth() + 1)}-${formatNum(now.getDate())}T${formatNum(now.getHours())}:${formatNum(now.getMinutes())}:${formatNum(now.getSeconds())}`;
    const matchId = `match-${formattedDate}`;

    // Helper function to safely get player data
    const getPlayerData = (player: Player | null) => {
      if (!player) return null;
      return {
        id: player.id,
        name: player.name,
        email: player.email || null,
        ...(player.avatar && { avatar: player.avatar })
      };
    };

    const team1 = [
      getPlayerData(matchPlayers.team1p1),
      matchType === "Doubles" ? getPlayerData(matchPlayers.team1p2) : null
    ].filter(Boolean);

    const team2 = [
      getPlayerData(matchPlayers.team2p1),
      matchType === "Doubles" ? getPlayerData(matchPlayers.team2p2) : null
    ].filter(Boolean);

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
      id: matchId,
      team1,
      team2,
      team1Scores,
      team2Scores,
      winner,
      matchDate: date, // This should be in YYYY-MM-DD format
      createdTs: timestamp,
      createdBy: getAuth().currentUser?.email || 'unknown'
    };

    try {
      await onAddMatch(newMatch as Match);
      
      // Reset form after successful submission
      setMatchPlayers({
        team1p1: null,
        team1p2: null,
        team2p1: null,
        team2p2: null,
      });
      setScores([{ team1: "", team2: "" }]);
      setDate(new Date().toISOString().slice(0, 10));
      setIsPrefilled(false);
      onMatchTypeChange("Doubles"); // Reset match type to default
      setSuccessMessage(`Match ${newMatch.id} successfully added to history!`);
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Error saving match:', error);
      alert('Failed to save match. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <style>{globalStyles}</style>
      {showSuccess && (
        <div style={successBannerStyle}>
          {successMessage}
        </div>
      )}
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
              value={matchPlayers.team1p1?.name || ""}
              onChange={handlePlayerChange}
              required
              placeholder="Search or type"
              style={isPrefilled ? { color: "var(--color-text-muted)" } : {}}
            />
            <datalist id="team1p1List">
              {playersList.map((p) => (
                <option key={`t1p1-${p.id}`} value={p.name} />
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
                value={matchPlayers.team1p2?.name || ""}
                onChange={handlePlayerChange}
                required
                placeholder="Search or type"
                style={isPrefilled ? { color: "var(--color-text-muted)" } : {}}
              />
              <datalist id="team1p2List">
                {playersList.map((p) => (
                  <option key={`t1p2-${p.id}`} value={p.name} />
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
              value={matchPlayers.team2p1?.name || ""}
              onChange={handlePlayerChange}
              required
              placeholder="Search or type"
              style={isPrefilled ? { color: "var(--color-text-muted)" } : {}}
            />
            <datalist id="team2p1List">
              {playersList.map((p) => (
                <option key={`t2p1-${p.id}`} value={p.name} />
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
                value={matchPlayers.team2p2?.name || ""}
                onChange={handlePlayerChange}
                required
                placeholder="Search or type"
                style={isPrefilled ? { color: "var(--color-text-muted)" } : {}}
                />
              <datalist id="team2p2List">
                {playersList.map((p) => (
                  <option key={`t2p2-${p.id}`} value={p.name} />
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
                  onBlur={(e) => updateOtherScore(i, "team1", e.target.value)}
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
                  onBlur={(e) => updateOtherScore(i, "team2", e.target.value)}
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
    </>
  );
}

export default MatchForm;