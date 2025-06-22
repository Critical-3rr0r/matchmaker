import { MongoClient } from "mongodb";
import { MONGOURI } from "$env/static/private"
const uri = MONGOURI;

const options = {};

let client;
let clientPromise;
if(!uri) throw new Error("Please define a MONGOURI");

if(!global._mongoClientPromise){
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default clientPromise;