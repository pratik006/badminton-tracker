import React from "react";

// deprecated, not uised any more
function NavBar({ onLeaderboardClick }) {
  return (
    <nav className="main-nav" aria-label="Primary navigation">
      <button onClick={onLeaderboardClick} type="button">
        Go to Leaderboard
      </button>
    </nav>
  );
}

export default NavBar;