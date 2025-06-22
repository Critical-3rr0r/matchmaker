import { MONGO_DB } from "$env/static/private";
import clientPromise from "$lib/server/mongodb.js";
import bcrypt from "bcryptjs";
import { createToken } from "../../lib/server/jwt";

export async function POST ({ request, cookies }) {
    const { username, password } = await request.json();
    const client = await clientPromise;
    const db = client.db(MONGO_DB);
    const captains = db.collection("Captains");

    const user = await captains.findOne({ username: username });
    if(user){
        if(await bcrypt.compare(password, user.password)){
            const token = createToken({ id: user.id, username: user.username });

            cookies.set("jwt", token, {
                httpOnly: true,
                path: '/',
                sameSite: "strict",
                secure: true,
                maxAge: 60*60*24*7
            });
            return new Response(JSON.stringify({message: "login!"}), {status: 200});
        }else{
            return new Response(JSON.stringify({error: "Invalid Credentials"}), {status: 401});
        }
    }else{
        return new Response(JSON.stringify({error: "Invalid Credentials"}), {status: 401});
    }
}