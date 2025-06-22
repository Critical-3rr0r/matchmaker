// standard function to shuffle an array randomly
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    // Pick a random i from 0 to i
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements at i and j
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
const pushablePlayers = (i, j, difference, set) => {
  let matchedPlayers = [];
  let used = [];
  if (
    j.elo < i.elo + difference &&
    j.elo > i.elo - difference &&
    !set.has(j.name)
  ) {
    matchedPlayers.push(i, j);
    used.push(i.name);
    used.push(j.name);
    return { matchedPlayers, used };
  }
  return null;
};
const getMatchingPlayers = (
  sortedPlayers,
  matchedPlayers,
  difference,
  used,
  role,
  data
) => {
  for (let i = 0; i < sortedPlayers.length; i++) {
    if (used.has(sortedPlayers[i].name)) {
      continue;
    } else if (matchedPlayers.length === data.comp[role] * 2) {
      break;
    }
    let remainingPlayers = sortedPlayers.slice(i + 1, sortedPlayers.length);
    for (let j = 0; j < remainingPlayers.length; j++) {
      const result = pushablePlayers(
        sortedPlayers[i],
        remainingPlayers[j],
        difference,
        used
      );
      if (result) {
        return result;
      }
    }
  }
  return null;
};
const findEqualEloInRole = (role, players, type, number, difference, data) => {
  let sortedPlayers = [];
  let matchedPlayers = [];
  let count = 0;
  const used = new Set();
  let pData = {};
  while (matchedPlayers.length < data.comp[role] * 2) {
    count++;
    switch (type) {
      case "main":
        //pull players of main role
        players.forEach((player) => {
          if (
            player.role === role &&
            !sortedPlayers.some((p) => p.name === player.name)
          ) {
            sortedPlayers.push(player);
          }
        });
        pData = getMatchingPlayers(
          sortedPlayers,
          matchedPlayers,
          difference,
          used,
          role,
          data
        );
        if (pData) {
          used.add(pData.used[0]);
          used.add(pData.used[1]);
          matchedPlayers.push(...pData.matchedPlayers);
        }
        pData = {};
        //If enough matches arent found add off players into player pool
        type = "off";
        break;
      case "off":
        players.forEach((player) => {
          if (
            player.secondaryRole === role &&
            !sortedPlayers.some((p) => p.name === player.name)
          ) {
            sortedPlayers.push(player);
          }
        });
        pData = getMatchingPlayers(
          sortedPlayers,
          matchedPlayers,
          difference,
          used,
          role,
          data
        );
        if (pData) {
          used.add(pData.used[0]);
          used.add(pData.used[1]);
          matchedPlayers.push(...pData.matchedPlayers);
        }
        pData = {};
        //If enough matches arent found add flex players into player pool
        type = "flex";
        break;
      case "flex":
        players.forEach((player) => {
          if (
            (player.secondaryRole === "flex" || player.role === "flex") &&
            !sortedPlayers.some((p) => p.name === player.name)
          ) {
            sortedPlayers.push(player);
          }
        });
        pData = getMatchingPlayers(
          sortedPlayers,
          matchedPlayers,
          difference,
          used,
          role,
          data
        );
        if (pData) {
          used.add(pData.used[0]);
          used.add(pData.used[1]);
          matchedPlayers.push(...pData.matchedPlayers);
        }
        pData = {};
        //if not enough flex players match with the rest, go to no matching roles for fill
        type = "NM";
        break;
      case "NM":
        players.forEach((player) => {
          if (
            player.secondaryRole != role &&
            player.role != role &&
            !sortedPlayers.some((p) => p.name === player.name)
          ) {
            sortedPlayers.push(player);
          }
        });
        pData = getMatchingPlayers(
          sortedPlayers,
          matchedPlayers,
          difference,
          used,
          role,
          data
        );
        if (pData) {
          used.add(pData.used[0]);
          used.add(pData.used[1]);
          matchedPlayers.push(...pData.matchedPlayers);
        }
        pData = {};
        // After running through all non main roles for off roles, loop back to main to ensure all players eventually get looked at if needed
        if (data.comp.mainOrOff === "off") {
          type = "main";
        }
        break;
    }
    if (count > 10) {
      return { matchedPlayers: [], status: "retry" };
    }
  }
  return { matchedPlayers, status: "OK" };
};

//role sort function to sort players by desired primary and secondary roles and fill the remainder where needed even if off role.
const roleSort = (data) => {
  //declare helper variables
  let tanks = [];
  let support = [];
  let dps = [];
  let sortedPlayers = [];
  let matched = false;
  let difference = 200;
  while (matched === false) {
    //get the shuffled players by running the player data through the shuffle function
    let players = shuffleArray(data.players);
    tanks = findEqualEloInRole(
      "tank",
      players,
      data.mainOrOff,
      data.comp.tank,
      difference,
      data
    );

    const tankSet = new Set(
      tanks.matchedPlayers.map((player) => (player = player.name))
    );
    players = players.filter((p) => !tankSet.has(p.name));

    support = findEqualEloInRole(
      "support",
      players,
      data.mainOrOff,
      data.comp.support,
      difference,
      data
    );
    const supportSet = new Set(
      support.matchedPlayers.map((player) => (player = player.name))
    );
    players = players.filter((p) => !supportSet.has(p.name));

    dps = findEqualEloInRole(
      "dps",
      players,
      data.mainOrOff,
      data.comp.dps,
      difference,
      data
    );
    if (
      tanks.status === "OK" &&
      support.status === "OK" &&
      dps.status === "OK"
    ) {
      matched = true;
    } else {
      difference += 100;
    }
  }
  // log the arrays for debugging purposes
  sortedPlayers = {
    tanks: tanks.matchedPlayers.flat(),
    support: support.matchedPlayers.flat(),
    dps: dps.matchedPlayers.flat(),
  };
  return sortedPlayers;
};
// function to assign players to team based on which team has the current lowest elo.
const evenElo = (roleArray, comp, team1Elo, team2Elo) => {
  roleArray.sort((a, b) => b.elo - a.elo);
  let team1 = [];
  let team2 = [];
  for (const player of roleArray) {
    if (team1Elo <= team2Elo && team1.length < comp) {
      team1.push(player);
      team1Elo += player.elo;
    } else if (team2.length < comp) {
      team2.push(player);
      team2Elo += player.elo;
    } else {
      // If one team is full, assign to the other
      if (team1.length < comp) {
        team1.push(player);
        team1Elo += player.elo;
      } else {
        team2.push(player);
        team2Elo += player.elo;
      }
    }
  }
  return { team1, team2, team1Elo, team2Elo };
};
// main function that pulls all logic together.
export const match = (data) => {
  // get the sorted players from the role sort function
  const sortedPlayers = roleSort(data);

  // spread the players out evenly through the evenElo function, using the previous totals to determine who gets the better players first
  const teamTanks = evenElo(sortedPlayers.tanks, data.comp.tank, 0, 0);

  const teamSupports = evenElo(
    sortedPlayers.support,
    data.comp.support,
    teamTanks.team1Elo,
    teamTanks.team2Elo
  );

  const teamDPS = evenElo(
    sortedPlayers.dps,
    data.comp.dps,
    teamSupports.team1Elo,
    teamSupports.team2Elo
  );

  //pull all the roles into their individual teams
  const finalTeams = {
    team1: {
      tanks: [...teamTanks.team1],
      dps: [...teamDPS.team1],
      support: [...teamSupports.team1],
    },
    team2: {
      tanks: [...teamTanks.team2],
      dps: [...teamDPS.team2],
      support: [...teamSupports.team2],
    },
    team1Elo: teamDPS.team1Elo,
    team2Elo: teamDPS.team2Elo,
  };
  //return the sorted and balanced teams
  return finalTeams;
};
