import { MONGO_DB } from "$env/static/private";
import clientPromise from "$lib/server/mongodb.js";
import bcrypt from "bcryptjs";
export async function POST ({ request }){
    const { username, password, regCode} = await request.json();
    const client = await clientPromise;
    const db = client.db(MONGO_DB);
    const captains = db.collection("Captains")
    console.log(username, password, regCode);
    const regObj = await captains.findOne({ name: "RegCode" });
    console.log(regObj);
    if(await bcrypt.compare(regCode, regObj.regCode)){
        const exists = await captains.findOne({ username: username });
        if(exists){
            return new Response(JSON.stringify({error: "username already exists"}), {status: 409});
        }else{
            const hashedPass = await bcrypt.hash(password, 12);
            const user = {username: username, password: hashedPass}
            await captains.insertOne(user);
            return new Response(JSON.stringify({message: "user registered"}), {status: 200});
        }
    }else{
        return new Response(JSON.stringify({error: "invalid registration code"}), {status: 401});
    }
}