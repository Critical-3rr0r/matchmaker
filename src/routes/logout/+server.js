import { redirect } from "@sveltejs/kit";
export async function POST ({ request, cookies }) {

    cookies.delete("jwt", { path: "/"});
    throw redirect(302, "/");
}
