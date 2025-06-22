import { match } from "../../../../lib/matchmaker/matchmaking";
export async function POST ({ request }){
    const { players, comp, mainOrOff } = await request.json();
    const data = {players: players, comp: comp, mainOrOff: mainOrOff};

    const teams = match(data);
    console.log(teams);
    return new Response(JSON.stringify({data: teams}), {status: 200});
}