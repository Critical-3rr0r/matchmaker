<script>
    import {goto} from "$app/navigation"
    //variable declaration
    const ranks = [
        "Bronze",
        "Silver",
        "Gold",
        "Platinum",
        "Diamond",
        "Grandmaster",
        "Celestial"
    ]
    let addedCount = 0;
    let alertMessage = "";
    let buttonStyles = "bg-gray-400 w-40 h-10 rounded-md shadow-lg hover:bg-gray-200 text-xl font-bold "
    let playerWindowIsDragging = false;
    let playerWindowX = 0;
    let playerWindowY = 0;
    let playerWindowHidden = "hidden";
    let matchmakerWindowIsDragging = false;
    let matchmakerWindowX = 0;
    let matchmakerWindowY = 0;
    let matchmakerWindowHidden = "hidden";
    let playerName = "";
    let playerRank = "";
    let playerUUID = "";
    let playerPrimary = "";
    let playerSecondary = "";
    let submitType = "";
    let showAPISubmit = "hidden";
    let showManualSubmit = "hidden";
    let submitting = false;
    let addMultiple = "false";
    let finalSubmit = false;
    let playersFetched = false;
    let playersArray = [];
    let fetchedPlayers = [];
    let originalPlayers = [];
    let selectedPlayers = [];
    let team1 = [];
    let team2 = [];
    let eloSpread = 0;
    let teamComp = {tank: 0, support: 0, dps: 0};
    let mainOrOff = "";
    const maxPlayers = 12;
    let editRoles = false;
    let deletePlayer = false;
    let matchSelect = "matchPlayers";
    let playersMatched = false;
    const matchPlayers = async () => {
        if((teamComp.tank + teamComp.support + teamComp.dps) != 6){
            alert("invalid comp");
            return;
        }
        if(mainOrOff === ""){
            alert("please select which roles players should try to be matched in");
            return;
        }
        if(selectedPlayers.length === maxPlayers){
            const fixedElo = selectedPlayers.map((player) => {
                const splitRank = player.rank.split(" ");
                const uppercaseRanks = ranks.map(rank => rank.toUpperCase());
                const index = uppercaseRanks.indexOf(splitRank[0].toUpperCase());
                if(index != -1 && index != 0){
                    player.elo = index * 300;
                }else if(index != 0 && index === -1){
                    player.elo = 2200;
                };
                if(player.elo < 2200){
                    switch(splitRank[1]){
                        case "III":
                            player.elo += 100
                            break;
                        case "II":
                            player.elo += 200
                            break;
                        case "I":
                            player.elo += 300
                            break;
                    }
                }
                player.role = player.primaryRole;
                return player;
            })
            try{
                const res = await fetch("./matchmaker/API/matchmaker", {
                    method: "POST",
                    body: JSON.stringify({players: fixedElo, comp: teamComp, mainOrOff: mainOrOff})
                });
                const allData = await res.json();
                const data = allData.data;
                if(res.ok){
                    team1 = data.team1;
                    team2 = data.team2;
                    eloSpread = Math.abs(data.team1Elo - data.team2Elo);
                    console.log(team1, team2, eloSpread);
                    playersMatched = true;
                }
            }catch (err){
                console.error("an error has occured with the script: ", err);
            }
        }else{
            alert("not enough players selected");
            return;
        };

    }
    //toggle active players
    $: toggleActive = (player) => {
        const index = fetchedPlayers.findIndex(p => p.name === player.name);

        if (index === -1) return;

        if (selectedPlayers.length < maxPlayers && !fetchedPlayers[index].active) {
            fetchedPlayers[index].active = true;
            selectedPlayers = [...selectedPlayers, fetchedPlayers[index]];
        } else if (fetchedPlayers[index].active) {
            fetchedPlayers[index].active = false;
            selectedPlayers = selectedPlayers.filter(p => p.name !== fetchedPlayers[index].name);
        }
        fetchedPlayers = [...fetchedPlayers];

        console.log(selectedPlayers);
    }
    //deselect all players
    const deselectAll = () => {
        selectedPlayers = []
        fetchedPlayers = fetchedPlayers.map(player => ({
        ...player,
        active: false
        }));
    }
    //edit players in database
    const editPlayers = async () => {
        submitting = true;
        const editedPlayers = fetchedPlayers.filter((player, index) => ((player.primaryRole != originalPlayers[index].primaryRole) || (player.secondaryRole != originalPlayers[index].secondaryRole) || (player.rank != originalPlayers[index].rank) || (player.name != originalPlayers[index].name)) && (player.manual === true));
        try{
            const res = await fetch("./matchmaker/API/updatePlayers", {
                method: "POST",
                headers: {
                    type: "edit"
                },
                body: JSON.stringify({players: [...editedPlayers]})
            })
            if(res.ok){
                originalPlayers = [...fetchedPlayers];
            }
        }catch(err){
            submitting = false;
            console.error(JSON.stringify({error: err}));
        }
        submitting = false;
    }
    //update player from api and in database
    const updateAPIPlayers = async (player) => {
        submitting = true;
        console.log(player);
        if(player.manual === false){
            try{
                console.log("submitting")
                const res = await fetch("./matchmaker/API/updatePlayers", {
                    method: "POST",
                    headers: {
                        type: "update"
                    },
                    body: JSON.stringify({player: player})
                })
            }catch(err){
                submitting = false;
                console.error(JSON.stringify({error: err}));
            }
        }
        submitting = false;
    }
    //delete player from database
    const deletePlayers = async (player) => {
        submitting = true;
        try{
            const res = await fetch("./matchmaker/API/updatePlayers", {
                method: "POST",
                headers: {
                    type: "delete"
                },
                body: JSON.stringify({player: player})
            });
            if(res.ok){
                fetchedPlayers = fetchedPlayers.filter((p) => p.uuid != player.uuid);
            }
        }catch(err){
            submitting = false;
            console.error(JSON.stringify({error: err}));
        }
        submitting = false;
    }
    //fetch all players from database
    const fetchPlayers = async () => {
        console.log(fetchedPlayers);
        if(playersFetched){

        }else{
            submitting = true;
            try{
                const res = await fetch("./matchmaker/API/players", {
                    method: "GET"
                });
                if(res.ok){
                    const data = await res.json();
                    fetchedPlayers = [];
                    fetchedPlayers.push(...data.players);
                }
                fetchedPlayers.forEach(player => player.active = false);
                originalPlayers = fetchedPlayers.map(player => ({ ...player }));
                playersFetched = true;
            }catch(err){
                console.error(JSON.stringify(err));
            }
            submitting = false;
        }
    }
    //showPlayers and showMatchmaker and their corresponding "hide" functions are used to toggle the display of each window
    const showPlayers = (event) => {
        event.preventDefault();
        if(matchmakerWindowHidden === ""){
            matchmakerWindowHidden = "hidden";
        }
        playerWindowHidden = "";
        playerWindowX = 0;
        playerWindowY = 0;
    }
    const hidePlayers = (event) => {
        event.preventDefault();
        playerWindowHidden = "hidden"
    }
    const showMatchmaker = (event) => {
        event.preventDefault();
        if(playerWindowHidden === ""){
            playerWindowHidden = "hidden";
        }
        matchmakerWindowHidden = "";
        matchmakerWindowX = 0;
        matchmakerWindowY = 0;
    }
    const hideMatchmaker = (event) => {
        event.preventDefault();
        matchmakerWindowHidden = "hidden";
    }
    //playerMouseDown and matchmakerMouseDown are used to allow for interactive dragging of the components they are connected to
    const playerMouseDown = (event) => {
        playerWindowIsDragging = true;
        const startX = event.clientX - playerWindowX;
        const startY = event.clientY - playerWindowY;

        const handleMouseMove = (e) => {
            if(playerWindowIsDragging){
                playerWindowX = e.clientX - startX;
                playerWindowY = e.clientY - startY;
            }
        };

        const handleMouseUp = () => {
            playerWindowIsDragging = false;
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    }
    const matchmakerMouseDown = (event) => {
        matchmakerWindowIsDragging = true;
        const startX = event.clientX - matchmakerWindowX;
        const startY = event.clientY - matchmakerWindowY;

        const handleMouseMove = (e) => {
            if(matchmakerWindowIsDragging){
                matchmakerWindowX = e.clientX - startX;
                matchmakerWindowY = e.clientY - startY;
            }
        };

        const handleMouseUp = () => {
            matchmakerWindowIsDragging = false;
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    }
    //Changes the displayed form depending on user selection
    const playerSubmitSelection = (event) =>{
        event.preventDefault();
        if(submitType === "api"){
            showAPISubmit = "";
            showManualSubmit = "hidden";
        }
        if(submitType === "manual"){
            showManualSubmit = "";
            showAPISubmit = "hidden";
        }
    }
    //submits to marvelrivalsapi to pull player data and insert into database 
    const playerApiSubmit = async (event) => {
        event.preventDefault();
        if(addMultiple === "true"){
            if(finalSubmit){
                submitting = true;
                playersArray.push({
                    uuid: playerUUID,
                    primary: playerPrimary,
                    secondary: playerSecondary
                });
                try{
                const res = await fetch("./matchmaker/API/players", {
                    method: "POST",
                    headers:{
                        "x-data-source": "api",
                        "x-multiple-entries": true
                    },
                    body: JSON.stringify({players: playersArray})
                });
                const data = await res.json();
                if(res.ok){
                    addedCount = data.added;
                    if(data.failed > 0){
                        alertMessage = `${addedCount} players added to the database, ${data.failed} failed to add, failed id's ${data.failedUsers.join(", ")}. These users were updated ${data.updatedUsers.join(", ")}. Please wait 5 minutes and run an update on the players`;
                    }else{
                        alertMessage = `${addedCount} players added to the database, these users were updated ${data.updatedUsers.join(", ")}. Please wait 5 minutes and run an update on the players`;
                    }
                }else{
                    alertMessage = `Error: ${data.error}`;
                }
            }catch (err){
                console.error({error: JSON.stringify(err) || String(err)})
            }
            finalSubmit = false;
            submitting = false;
            }else{
                playersArray.push({
                    uuid: playerUUID,
                    primary: playerPrimary,
                    secondary: playerSecondary
                });
                console.log(playersArray);
            }
        }else{
            try{
                submitting = true;
                const res = await fetch("./matchmaker/API/players", {
                    method: "POST",
                    headers:{
                        "x-data-source": "api",
                        "x-multiple-entries": false
                    },
                    body: JSON.stringify({
                        uuid: playerUUID,
                        primary: playerPrimary,
                        secondary: playerSecondary
                    })
                })
                const data = await res.json();
                if(res.ok){
                    addedCount = data.added;
                    if(data.failed > 0){
                        alertMessage = `${addedCount} players added to the database, ${data.failed} failed to add, failed id's ${data.failedUsers.join(", ")}. These users were updated ${data.updatedUsers.join(", ")}. Please wait 5 minutes and run an update on the players`;
                    }else{
                        alertMessage = `${addedCount} players added to the database, these users were updated ${data.updatedUsers.join(", ")}. Please wait 5 minutes and run an update on the players`;
                    }
                }else{
                    alertMessage = `Error: ${data.error}`;
                }
                submitting = false;
            }catch (err){
                console.error({error: JSON.stringify(err) || String(err)})
            }
        }
        playerUUID = "";
        playerPrimary = "";
        playerSecondary = "";
    }
    //used when data for player is entered manually, inserted into database
    const playerManualSubmit = async (event) => {
        event.preventDefault();
        if(addMultiple === "true"){
            if(finalSubmit){
                submitting = true;
                playersArray.push({
                    name: playerName,
                    rank: playerRank,
                    uuid: playerUUID,
                    primaryRole: playerPrimary,
                    secondaryRole: playerSecondary,
                    manual: true
                });
                try{
                const res = await fetch("./matchmaker/API/players", {
                    method: "POST",
                    headers:{
                        "x-data-source": "manual",
                        "x-multiple-entries": true
                    },
                    body: JSON.stringify({players: playersArray})
                });
                const data = await res.json();
                if(res.ok){
                    addedCount = data.added;
                    alertMessage = `${addedCount} players added to the database`;
                }else{
                    alertMessage = `Error: ${data.error}`;
                }
                }catch (err){
                    console.error({error: JSON.stringify(err) || String(err)})
                }

            }else{
                playersArray.push({
                    name: playerName,
                    rank: playerRank,
                    uuid: playerUUID,
                    primaryRole: playerPrimary,
                    secondaryRole: playerSecondary,
                    manual: true
                });
                console.log(playersArray);
            }
            submitting = false;
        }else{
            try{
                submitting = true;
                const res = await fetch("./matchmaker/API/players", {
                    method: "POST",
                    headers:{
                        "x-data-source": "manual",
                        "x-multiple-entries": false
                    },
                    body: JSON.stringify({
                        name: playerName,
                        rank: playerRank,
                        uuid: playerUUID,
                        primaryRole: playerPrimary,
                        secondaryRole: playerSecondary,
                        manual: true
                    })
                })
                const data = await res.json();
                if(res.ok){
                    addedCount = data.added;
                    alertMessage = `${addedCount} players added to the database`;
                }else{
                    alertMessage = `Error: ${data.error}`;
                }
                submitting = false;
            }catch (err){
                console.error({erorr: JSON.stringify(err) || String(err)})
            }
        }
        playerName = "";
        playerUUID = "";
        playerRank = "";
        playerPrimary = "";
        playerSecondary = "";
    }
    const submitAll = () => {
        finalSubmit = !finalSubmit;
    }
    //will properly logout when login function is added
    const returnFunction = async (event) => {
        event.preventDefault();
        const res = await fetch("./logout", {
            method: "POST"
        })
        goto("/");
    }
</script>
<div class="flex flex-col justify-center items-center h-screen w-200 ml-auto mr-auto">
    {#if submitting}
    <div class="absolute flex flex-col self-center">
        <img src="/gif/loading.gif" alt="Loading gif" class="z-10 w-20 h-20">
        <h2>Submitting</h2>
    </div>  
    {/if}

    <div class="flex flex-col self-center bg-sky-400 h-3/4 w-3/4 ring-2 shadow-xl rounded-sm">
        <h1 class="text-3xl text-center font-bold border-b-2">Matchmaker Panel</h1>
        <div class="flex flex-row gap-30 justify-center h-full items-center">
            <button onclick={showPlayers} class={buttonStyles}>Players</button>
            <button onclick={showMatchmaker} class={buttonStyles}>Matchmaker</button>
        </div>
    </div>
    <!--Player submission window-->
    <div class="flex flex-col items-center w-100 h-150 absolute bg-red-900 rounded-xl ring-2 shadow-xl {playerWindowHidden}" style="transform: translate({playerWindowX}px, {playerWindowY}px);" onmousedown={playerMouseDown} tabindex=0 role="dialog" aria-label="Player Form">
        <button class="text-white absolute right-2 top-2 w-5 h-5 hover:text-sky-400 text-lg" onclick={hidePlayers}>X</button>
        <label for="playerType" class="text-white underline">Please choose a submission method</label>
        <div>
            <select name="playerType" id="playerType" class="w-30 h-9 rounded-sm text-xs" bind:value={submitType} onchange={playerSubmitSelection}>
                <option value="api">API</option>
                <option value="manual">Manual</option>
            </select>
            <select name="number" id="number" class="w-30 h-9 rounded-sm text-xs" bind:value={addMultiple}>
                <option value="false">One</option>
                <option value="true">Multiple</option>
            </select>    
        </div>
        <!--API submission-->
        <div class="flex mt-auto mb-auto text-white text-center {showAPISubmit}">
            <form onsubmit={playerApiSubmit} class="flex flex-col gap-3">

                <label for="uuid">Player UUID</label>
                <input name="uuid" type="text" class="rounded-md text-black" required bind:value={playerUUID}/>
                <label for="primary">Primary Role</label>
                <select name="primary" id="primary" bind:value={playerPrimary} required class="text-black w-40 self-center rounded-md">
                    <option value="tank">Tank</option>
                    <option value="support">Support</option>
                    <option value="dps">DPS</option>
                    <option value="flex">Flex</option>
                </select>
                <label for="secondary">Secondary Role</label>
                <select name="secondary" id="secondary" bind:value={playerSecondary} required class="text-black w-40 self-center rounded-md">
                    <option value="tank">Tank</option>
                    <option value="support">Support</option>
                    <option value="dps">DPS</option>
                    <option value="flex">Flex</option>
                </select>
                <button type="submit" class="bg-gray-950 rounded-xl w-20 self-center hover:bg-gray-700">Submit</button>
                <button type="submit" class="bg-gray-950 rounded-xl w-20 self-center hover:bg-gray-700" onclick={submitAll}>Submit all</button>
            </form>
        </div>
        <!--Manual Submission-->
        <div class="flex mt-auto mb-auto text-white text-center {showManualSubmit}">
            <form onsubmit={playerManualSubmit} class="flex flex-col gap-1">
                <label for="name">Player Name</label>
                <input type="text" name="name" id="name" class="rounded-md text-black" required bind:value={playerName}>
                <label for="uuid">Player UUID</label>
                <input name="uuid" type="text" class="rounded-md text-black" required bind:value={playerUUID}/>
                <label for="rank">Player Rank</label>
                <select name="rank" id="rank" class="rounded-md text-black" bind:value={playerRank}>
                    {#each ranks as rank}
                        <option value="{rank.toUpperCase()} III">{rank} III</option>
                        <option value="{rank.toUpperCase()} II">{rank} II</option>
                        <option value="{rank.toUpperCase()} I">{rank} I</option>
                    {/each}
                        <option value="ETERNITY">Eternity</option>
                </select>
                <label for="primary">Primary Role</label>
                <select name="primary" id="primary" bind:value={playerPrimary} required class="text-black w-40 self-center rounded-md">
                    <option value="tank">Tank</option>
                    <option value="support">Support</option>
                    <option value="dps">DPS</option>
                    <option value="flex">Flex</option>
                </select>
                <label for="secondary">Secondary Role</label>
                <select name="secondary" id="secondary" bind:value={playerSecondary} required class="text-black w-40 self-center rounded-md">
                    <option value="tank">Tank</option>
                    <option value="support">Support</option>
                    <option value="dps">DPS</option>
                    <option value="flex">Flex</option>
                </select>
                <div>
                    <button type="submit" class="bg-gray-950 rounded-xl w-20 self-center hover:bg-gray-700">Submit</button>
                    <button type="submit" class="bg-gray-950 rounded-xl w-20 self-center hover:bg-gray-700" onclick={submitAll}>Submit all</button>
                </div>
            </form>

        </div>
        {#if alertMessage}
            <h2 class="text-white">{alertMessage}</h2>
        {/if}
    </div>
    <!--Matchmaker window-->
    <div class="flex flex-col items-center w-200 h-150 absolute bg-red-900 rounded-xl ring-2 shadow-xl {matchmakerWindowHidden}" style="transform: translate({matchmakerWindowX}px, {matchmakerWindowY}px);" onmousedown={matchmakerMouseDown} tabindex=0 role="dialog" aria-label="Matchmaker Form">
        <button class="text-white absolute right-2 top-2 w-5 h-5 hover:text-sky-400 text-lg" onclick={hideMatchmaker}>X</button>
        <h1 class="text-xl text-white underline">Matchmaker Window</h1>
        <select name="matchSelect" id="matchSelect" onchange={fetchPlayers} bind:value={matchSelect}>
            <option value="updatePlayer">Players</option>
            <option value="matchPlayers">Match</option>
        </select>
        <!--Player Update-->
        <div class="flex flex-col w-full h-full" class:hidden={matchSelect === "matchPlayers"}>
            <h2 class="self-center" class:text-green-500={selectedPlayers.length === maxPlayers} class:text-white={selectedPlayers.length != maxPlayers}>{selectedPlayers.length} Players selected out of {maxPlayers}</h2>
        {#if playersFetched}
            <ol class="flex flex-col bg-white text-black w-3/4 h-3/4 self-center overflow-scroll">
                {#each fetchedPlayers as player}
                    {#if editRoles}
                        {#if player.manual === true}
                            <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b" class:bg-green-500={player.active} class:bg-red-500={!player.active}>
                                <span>{player.name}</span>
                                <select name="newRank" id="newRank" class="rounded-md text-black" bind:value={player.rank}>
                                    {#each ranks as rank}
                                        <option value="{rank.toUpperCase()} III">{rank} III</option>
                                        <option value="{rank.toUpperCase()} II">{rank} II</option>
                                        <option value="{rank.toUpperCase()} I">{rank} I</option>
                                    {/each}
                                        <option value="ETERNITY">Eternity</option>
                                </select>
                                <select name="primaryRole" id="primaryRoleUpdate" bind:value={player.primaryRole}>
                                    <option value="tank">Tank</option>
                                    <option value="support">Support</option>
                                    <option value="dps">Dps</option>
                                    <option value="flex">Flex</option>
                                </select>
                                <select name="secondaryRole" id="secondaryRoleUpdate" bind:value={player.secondaryRole}>
                                    <option value="tank">Tank</option>
                                    <option value="support">Support</option>
                                    <option value="dps">Dps</option>
                                    <option value="flex">Flex</option>
                                </select>
                            </li>
                        {/if}
                        {#if player.manual === false}
                            <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b" class:bg-green-500={player.active} class:bg-red-500={!player.active}>
                                <span>{player.name}</span>
                                <span>{player.rank}</span>
                                <select name="primaryRole" id="primaryRoleUpdate" bind:value={player.primaryRole}>
                                    <option value="tank">Tank</option>
                                    <option value="support">Support</option>
                                    <option value="dps">Dps</option>
                                    <option value="flex">Flex</option>
                                </select>
                                <select name="secondaryRole" id="secondaryRoleUpdate" bind:value={player.secondaryRole}>
                                    <option value="tank">Tank</option>
                                    <option value="support">Support</option>
                                    <option value="dps">Dps</option>
                                    <option value="flex">Flex</option>
                                </select>
                                <button type="button" class="bg-gray-950 text-white rounded-md hover:bg-gray-700" onclick={() => updateAPIPlayers(player)}>Update Player</button>
                            </li>
                        {/if}

                    {/if}
                    {#if !editRoles}
                        {#if deletePlayer}
                            <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b" class:bg-green-500={player.active} class:bg-red-500={!player.active}>
                                <span>{player.name}</span>
                                <span>{player.rank}</span>
                                <span>{player.primaryRole}</span>
                                <span>{player.secondaryRole}</span>
                                <button type="button" class="bg-gray-950 text-white rounded-md" onclick={() => deletePlayers(player)}>Delete Player</button>
                            </li>
                        {/if}
                        {#if !deletePlayer}
                            <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b" class:bg-green-500={player.active} class:bg-red-500={!player.active}>
                                <span>{player.name}</span>
                                <span>{player.rank}</span>
                                <span>{player.primaryRole}</span>
                                <span>{player.secondaryRole}</span>
                                <button type="button" class="bg-gray-950 text-white rounded-md" onclick={() => toggleActive(player)}>Toggle Active</button>
                            </li>
                        {/if}

                    {/if}                  
                {/each}
            </ol>
        {/if}
            <div class="flex flex-row justify-center gap-5 text-white mt-4">
                {#if editRoles}
                    <button class="bg-gray-950 rounded-xl w-30 self-center hover:bg-gray-700" onclick={() => {editRoles = !editRoles; fetchedPlayers = [ ...originalPlayers ]}}>Cancel Edit</button>
                    <button class="bg-gray-950 rounded-xl w-30 self-center hover:bg-gray-700" onclick={editPlayers}>Confirm Edit</button>
                {/if}
                {#if !editRoles}
                    {#if deletePlayer}
                        <button class="bg-gray-950 rounded-xl w-30 self-center hover:bg-gray-700" onclick={() => deletePlayer = !deletePlayer}>Cancel Delete</button>
                    {/if}
                    {#if !deletePlayer}
                        <button class="bg-gray-950 rounded-xl w-30 self-center hover:bg-gray-700" onclick={() => {editRoles = !editRoles; deselectAll()}}>Edit Roles</button>
                        <button class="bg-gray-950 rounded-xl w-30 self-center hover:bg-gray-700" onclick={() => {deletePlayer = !deletePlayer; deselectAll()}}>Delete Player</button>
                        <button class="bg-gray-950 rounded-xl w-30 self-center hover:bg-gray-700" onclick={deselectAll}>Deselect all</button>
                        <button class="bg-gray-950 rounded-xl w-30 self-center hover:bg-gray-700" onclick={() => {playersFetched = false; fetchPlayers(); selectedPlayers = [];}}>Refresh Players</button>
                    {/if}
                {/if}
            </div>
        </div>
        <!--Match Players-->
        <div class="flex flex-col w-full h-full" class:hidden={matchSelect === "updatePlayer"}>
            {#if !playersMatched}
                <h1 class="text-white self-center">Selected Players</h1>
                <ol class="flex flex-col bg-white text-black w-1/4 h-3/4 self-center overflow-scroll ">
                {#each selectedPlayers as player}
                    <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b self-center text-center">{player.name}</li>
                {/each}
                </ol>
                <div class="absolute flex flex-col right-5 bottom-50">
                    <label class="self-center text-white" for="tanks">Tanks</label>
                    <input name="tank" id="tank" type="number" bind:value={teamComp.tank}>
                    <label class="self-center text-white" for="support">Supports</label>
                    <input type="number" name="support" id="support" bind:value={teamComp.support}>
                    <label class="self-center text-white" for="dps">DPS</label>
                    <input type="number" name="dps" id="dps" bind:value={teamComp.dps}>
                    <label class="self-center text-white" for="mainOrOff">Players in Main or Off roles?</label>
                    <select name="mainOrOff" id="mainOrOff" bind:value={mainOrOff}>
                        <option value="main">Main</option>
                        <option value="off">Off</option>
                    </select>
                </div>
                <button class="bg-gray-950 rounded-xl w-30 self-center hover:bg-gray-700 text-white mt-5" onclick={matchPlayers}>Match Players</button>
            {/if}
            {#if playersMatched}
                <div class="flex flex-row justify-between ml-auto mr-auto w-full h-full">
                    <div class="ml-auto mr-auto">
                        <label class="self-center text-white" for="team1">Team 1</label>
                        <ol name="team1" class="flex flex-col bg-white text-black w-full h-3/4 self-center overflow-scroll ">
                            {#each team1.tanks as player }
                                <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b self-center text-center"><span>{player.name}</span><span>Tank</span></li>
                            {/each}
                            {#each team1.dps as player }
                                <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b self-center text-center"><span>{player.name}</span><span>DPS</span></li>
                            {/each}
                            {#each team1.support as player }
                                <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b self-center text-center"><span>{player.name}</span><span>Support</span></li>
                            {/each}
                        </ol>
                    </div>
                    <div class="ml-auto mr-auto">
                        <label class="self-center text-white" for="team2">Team 2</label>
                        <ol name="team2" class="flex flex-col bg-white text-black w-full h-3/4 self-center overflow-scroll ">
                            {#each team2.tanks as player }
                                <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b self-center text-center"><span>{player.name}</span><span>Tank</span></li>
                            {/each}
                            {#each team2.dps as player }
                                <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b self-center text-center"><span>{player.name}</span><span>Dps</span></li>
                            {/each}
                            {#each team2.support as player }
                                <li class="grid grid-cols-4 gap-4 w-full px-4 py-2 border-b self-center text-center"><span>{player.name}</span><span>Support</span></li>
                            {/each}
                        </ol>
                        
                    </div>
                </div>
                <button class="bg-gray-950 rounded-xl w-30 self-center hover:bg-gray-700 text-white" onclick={() => {selectedPlayers = []; playersMatched = false;}}>Reset Teams</button>
                <button class="bg-gray-950 rounded-xl w-30 self-center hover:bg-gray-700 text-white mt-5" onclick={matchPlayers}>Reroll teams</button>
                <h1 class="text-white text-2xl self-center text-center">Elo difference between teams: {eloSpread}</h1>
            {/if}
        </div>
    </div>
</div>





<button onclick={returnFunction} class="fixed bg-red-950 text-white hover:bg-red-800 rounded-sm w-20 bottom-5 right-5">logout</button>