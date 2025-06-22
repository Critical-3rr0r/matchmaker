import { XAPIKEY, MONGO_DB } from "$env/static/private";
import clientPromise from "$lib/server/mongodb.js";
export async function GET ({ locals }){
    const captain = locals.user.username;
    try{
        const client = await clientPromise;
        const db = client.db(MONGO_DB);
        const players = await db.collection("Users").find({ addedBy: captain}).toArray();

        return new Response(JSON.stringify({players: players}), {status: 200});
    }catch (err){
        return new Response(JSON.stringify({error: "Failed to fetch players"}), {status: 500});
    }

}

const findAPIUser = async (player) => {
    const client = await clientPromise;
    const db = client.db(MONGO_DB);
    const users = db.collection("Users");
    let failedToFind = 0;
    let failedUsers = [];
    let updatedUsers = [];
    let count = 0;
    const exists = await users.findOne({ uuid: player.uuid });
    //do nothing if the user exists in the database
    if(exists){
        if(exists.addedBy === captain){
        }else{
            try{
                const { uuid, primary, secondary } = player;
                const res = await fetch("https://marvelrivalsapi.com/api/v1/player/" + uuid, {
                    method: "GET",
                    headers: {
                        "x-api-key": XAPIKEY
                    },
                });
                const data = await res.json()
                if(res.ok && data.player != undefined){
                    let lastUpdate = new Date(data.updates.last_update_request);
                    //check to see how old the data is
                    if(lastUpdate.getTime() < (Date.now() - (7 * 24 * 60 * 60 * 1000))){
                        const update = await fetch("https://marvelrivalsapi.com/api/v1/player/" + uuid + "/update", {
                                method: "GET",
                                headers: {
                                "x-api-key": XAPIKEY
                                },
                        });
                        if(update.ok){
                            updatedUsers.push(player.uuid);
                            lastUpdate = Date.now();
                        }else{
                            failedUsers.push(player.uuid);
                        }
                    }
                    player = {
                        name: data.name,
                        rank: data.player.rank.rank,
                        uuid: uuid,
                        primaryRole: primary,
                        secondaryRole: secondary,
                        lastUpdate: lastUpdate,
                        manual: false,
                        addedBy: captain
                    }
                    await users.insertOne(player);
                    count++;
                }else{
                    failedToFind++;
                    failedUsers.push(player.uuid);
                }
            }catch (err){
                failedToFind++;
                failedUsers.push(player.uuid);
            }
        }
    }else{
        try{
            const { uuid, primary, secondary } = player;
            const res = await fetch("https://marvelrivalsapi.com/api/v1/player/" + uuid, {
                method: "GET",
                headers: {
                    "x-api-key": XAPIKEY
                },
            });
            const data = await res.json()
            if(res.ok && data.player != undefined){
                let lastUpdate = new Date(data.updates.last_update_request);
                //check to see how old the data is
                if(lastUpdate.getTime() < (Date.now() - (7 * 24 * 60 * 60 * 1000))){
                    const update = await fetch("https://marvelrivalsapi.com/api/v1/player/" + uuid + "/update", {
                            method: "GET",
                            headers: {
                            "x-api-key": XAPIKEY
                            },
                    });
                    if(update.ok){
                        updatedUsers.push(player.uuid);
                        lastUpdate = Date.now();
                    }else{
                        failedUsers.push(player.uuid);
                    }
                }
                player = {
                    name: data.name,
                    rank: data.player.rank.rank,
                    uuid: uuid,
                    primaryRole: primary,
                    secondaryRole: secondary,
                    lastUpdate: lastUpdate,
                    manual: false,
                    addedBy: captain
                }
                await users.insertOne(player);
                count++;
            }else{
                failedToFind++;
                failedUsers.push(player.uuid);
            }
        }catch (err){
            failedToFind++;
            failedUsers.push(player.uuid);
        }
    }
    return {failedToFind: failedToFind, failedUsers: failedUsers, count: count, updatedUsers: updatedUsers}
}

export async function POST ({ request, locals }) {
    const source = await request.headers.get("x-data-source");
    const multiple = await request.headers.get("x-multiple-entries") === "true";
    const client = await clientPromise;
    const captain = locals.user.username;
    const db = client.db(MONGO_DB);
    const users = db.collection("Users");
    let failedToFind = 0;
    let failedUsers = [];
    let updatedUsers = [];
    console.log(multiple, "should be false")
    if(multiple){
        console.log("is multiple");
        //multiple api users being added
        if(source === "api"){
            console.log("is API");
            const { players } = await request.json();
            let count = 0;
            for (let i = 0; i < players.length; i++ ){
                const data = await findAPIUser(players[i]);
                failedToFind += data.failedToFind;
                failedUsers.push(...data.failedUsers);
                updatedUsers.push(...data.updatedUsers);
                count += data.count;
            }
            return new Response(JSON.stringify({added: count, failed: failedToFind, usersFailed: failedUsers, updatedUsers: updatedUsers}, {status: 200}));
        }else{
            console.log("notAPI");
            const { players } = await request.json();
            let count = 0;
            for(let i = 0; i < players.length; i++){
                const exists = await users.findOne({ name: players[i].name })
                if(exists){
                    if(exists.addedBy === captain){
                        return new Response(JSON.stringify({error: "player already exists"}, {status: 409}));
                    }else{
                        try{
                            await users.insertOne({...players[i], addedBy: captain})
                        }catch (err){
                            return new Response(JSON.stringify({ error: err}), {status: 500});
                        }
                        count++
                    }
                }else{
                    try{
                        await users.insertOne({...players[i], addedBy: captain});
                    }catch (err){
                        return new Response(JSON.stringify({ error: err}), {status: 500});
                    }
                    count++
                }
            }
            return new Response(JSON.stringify({added: count}, {status: 200}));
        }
    }else{
        console.log("not multiple");
        if(source === "api"){
            console.log("not multiple API");
            const player = await request.json();
            let count = 0;
            const data = await findAPIUser(player)
            failedToFind += data.failedToFind;
            failedUsers.push(...data.failedUsers);
            updatedUsers.push(...data.updatedUsers);
            count += data.count;
            return new Response(JSON.stringify({added: count, failed: failedToFind, usersFailed: failedUsers, updatedUsers: updatedUsers}, {status: 200}));
        }else{
            let count = 0;
            const player = await request.json();
            const exists = await users.findOne({ name: player.name })
            if(exists){
                    if(exists.addedBy === captain){
                        return new Response(JSON.stringify({error: "player already exists"}, {status: 409}));
                    }else{
                        try{
                            await users.insertOne({...player, addedBy: captain})
                        }catch (err){
                            return new Response(JSON.stringify({ error: err}), {status: 500});
                        }
                        count++
                        return new Response(JSON.stringify({added: count}, {status: 200}));
                    }
            }else{
                try{
                    await users.insertOne({...player, addedBy: captain});
                }catch (err){
                    return new Response(JSON.stringify({ error: err}), {status: 500});
                }
                count++
                return new Response(JSON.stringify({added: count}, {status: 200}));
            }
        }
    }


}