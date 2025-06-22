import { verifyToken } from "./lib/server/jwt";

export async function handle({ event, resolve }) {
    const token = event.cookies.get("jwt");

    if(token) {
        const user = verifyToken(token);
        if(user){
            event.locals.user = user;
        }
    }
    return resolve(event);
}