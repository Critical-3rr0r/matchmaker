import { XAPIKEY, MONGO_DB } from "$env/static/private";
import clientPromise from "$lib/server/mongodb.js";
export async function GET ({ request }) {
    const client = await clientPromise;
    const db = client.db(MONGO_DB);
    const users = db.collection("Users");
}


export async function POST ({ request }){
    const client = await clientPromise;
    const db = client.db(MONGO_DB);
    const users = db.collection("Users");
    const type = await request.headers.get("type")
    console.log(type);
    if(type === "edit"){
        const { players } = await request.json();
        const res = await users.bulkWrite(
            players.map(({ _id, ...rest }) => ({
                updateOne: {
                filter: { uuid: rest.uuid },
                update: { $set: rest }
                }
            }))
            );
        return new Response(JSON.stringify({ updated: res.modifiedCount}), {status: 200});
    }else if(type === "delete"){
        const { player } = await request.json();
        const res = await users.deleteOne({ uuid: player.uuid });
        return new Response(JSON.stringify({ deleted: res.deletedCount }), {status: 200});
    }else if (type === "update"){
        const { player } = await request.json();
        const doc = await users.findOne({ uuid: player.uuid});
        let lastUpdate = new Date(doc.lastUpdate)
        console.log(doc);
        if(doc){
            if(lastUpdate.getTime() > (Date.now() - (24 * 60 * 60 * 1000))){
                const res = await fetch("https://marvelrivalsapi.com/api/v1/player/" + player.uuid, {
                method: "GET",
                headers: {
                    "x-api-key": XAPIKEY
                },
                });
                const data = await res.json()
                if(res.ok && data.player != undefined){
                
                    let newPlayer = {
                        name: data.name,
                        rank: data.player.rank.rank,
                        uuid: player.uuid,
                        primaryRole: player.primaryRole,
                        secondaryRole: player.secondaryRole,
                        lastUpdate: lastUpdate,
                        manual: false
                    }
                    await users.updateOne(
                        {uuid: player.uuid},
                        { $set: newPlayer}
                    );
                    return new Response(JSON.stringify({message: "updated player"}), {status: 200});
                }
                return new Response(JSON.stringify({message: "player not updated"}), {status: 500});
            }else{
                console.log("updating", Date.now(), lastUpdate.getTime());
                const update = await fetch("https://marvelrivalsapi.com/api/v1/player/" + player.uuid + "/update", {
                            method: "GET",
                            headers: {
                            "x-api-key": XAPIKEY
                            },
                    });
                    if(update.ok){
                        lastUpdate = Date.now();
                    }else{
                    }
                let newPlayer = {
                    name: player.name,
                    rank: player.rank,
                    uuid: player.uuid,
                    primaryRole: player.primaryRole,
                    secondaryRole: player.secondaryRole,
                    lastUpdate: lastUpdate,
                    manual: false
                }
                    await users.updateOne(
                        {uuid: player.uuid},
                        { $set: newPlayer}
                    );
                return new Response({message: "player data pulled from API, please update player again in 5 minutes"}, {status: 500})
            }
        }
        return new Response({message: "player not found"}, {status: 404});
    }
}