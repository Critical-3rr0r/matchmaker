<script>
    import {goto} from '$app/navigation';
    let userRegistration = "";
    let regWindow = false;
    let regUser = "";
    let regPass = "";
    let regCode = "";
    let username = "";
    let password = "";
    const loginHandler = async (event) => {
        event.preventDefault();
        const data = {username: username, password: password};
        try{
            const res = await fetch("./login", {
                method: "POST",
                body: JSON.stringify(data)
            })
            if(res.ok){
                goto("/matchmaker");
            }
        }catch(err){
            alert(err);
        }
    }
    const registrationHandler = async (event) => {
        event.preventDefault();
        const regInfo = {username: regUser, password: regPass, regCode: regCode};
        try{
            const res = await fetch("./register", {
                method: "POST",
                body: JSON.stringify(regInfo)
            })
            if(res.ok){
                const data = await res.json();
                alert(data.message);
                regWindow = false;
            }
        }catch(err){
            console.error(err);
        }
    }
</script>

<div class="flex flex-col justify-center items-center h-screen w-300 ml-auto mr-auto">
    <div class="bg-sky-400 w-1/2 h-1/2 flex flex-col items-center ring-2 shadow-lg rounded-md">
        <h1 class="text-4xl font-bold underline shadow-lg mt-5">Please login!</h1>
        <form class="flex flex-col gap-2 mt-10" onsubmit={loginHandler}>
            <label for="username" class="text-center font-bold text-lg">Username </label>
            <input id="username" placeholder="Username" class="rounded-md shadow-sm text-center" required bind:value={username}/>
            <label for="password" class="text-center font-bold text-lg">Password</label>
            <input id="password" type="password" placeholder="Password" class="rounded-md shadow-sm text-center" required bind:value={password} />
            <button type="submit" class="bg-gray-200 rounded-lg shadow-md hover:bg-gray-100 w-20 self-center font-bold">Login</button>
        </form>
        <button class="bg-gray-200 rounded-lg shadow-md hover:bg-gray-100 w-20 self-center font-bold mt-3" onclick={regWindow = !regWindow}>Register</button>
        {#if regWindow}
            <div class="absolute flex flex-col items-center bg-fuchsia-700 w-150 h-100">
                <h1 class="text-4xl font-bold underline mt-5">Register</h1>
                <form class="flex flex-col gap-2 mt-3" onsubmit={registrationHandler}>
                    <label for="registerName" class="text-center text-2xl">Username</label>
                    <input type="text" id="registerName" name="registerName" class="rounded-md shadow-sm text-center" bind:value={regUser}>
                    <label for="registerPass" class="text-center text-2xl">Password</label>
                    <input type="password" id="registerPass" name="registerPass" class="rounded-md shadow-sm text-center" bind:value={regPass}>
                    <label for="registerKey" class="text-center text-2xl">Registration Key</label>
                    <input type="text" id="registerKey" name="registerKey" class="rounded-md shadow-sm text-center" bind:value={regCode}>
                    <div class="flex flex-row gap-5 justify-between">
                        <button class="bg-gray-200 rounded-lg shadow-md hover:bg-gray-100 w-20 self-center font-bold" type="submit">Register</button>
                        <button class="bg-gray-200 rounded-lg shadow-md hover:bg-gray-100 w-20 self-center font-bold" type="button" onclick={() => regWindow = !regWindow}>Cancel</button>
                    </div>
                </form>
            </div>
        {/if}
    </div>
</div>
