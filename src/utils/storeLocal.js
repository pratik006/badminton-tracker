// Local dummy store providing async data loading/saving simulation

const localPlayersList = [
    "Nadith", "Lahiru", "Nuwan", "Darshin",
    "Peter", "Daniel", "Michael", "John",
    "Sarah", "Anita", "James", "Kate",
    "Tina", "David", "Chris", "Emma",
  ];
  
  let matchHistory = [
    {
      id: "local-1",
      type: "Doubles",
      team1: ["Nadith", "Lahiru"],
      team2: ["Nuwan", "Darshin"],
      team1Scores: [13, 21, 21],
      team2Scores: [21, 17, 18],
      winner: 1,
      matchDate: "2023-06-01",
    },
    {
      id: "local-2",
      type: "Singles",
      team1: ["Peter"],
      team2: ["Daniel"],
      team1Scores: [15, 21, 21],
      team2Scores: [21, 16, 19],
      winner: 1,
      matchDate: "2023-06-02",
    },
  ];
  
  export async function fetchPlayersList() {
    return new Promise((res) => {
      setTimeout(() => res([...localPlayersList]), 250);
    });
  }
  
  export async function saveMatch(matchRecord) {
    return new Promise((res) => {
      setTimeout(() => {
        const id = "local-" + (matchHistory.length + 1);
        const newMatch = { id, ...matchRecord };
        matchHistory.unshift(newMatch);
  
        // Add players to list if new
        [...matchRecord.team1, ...matchRecord.team2].forEach((p) => {
          if (!localPlayersList.includes(p)) localPlayersList.push(p);
        });
  
        res(newMatch);
      }, 250);
    });
  }
  
  export async function fetchMatchHistory() {
    return new Promise((res) => {
      setTimeout(() => res([...matchHistory]), 250);
    });
  }
  
  export async function fetchLeaderboardData() {
    return new Promise((res) => {
      setTimeout(() => res({ players: [...localPlayersList], matches: [...matchHistory] }), 250);
    });
  }