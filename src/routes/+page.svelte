<script>
    import Form from "$lib";
    import z from "zod";
    let error = new z.ZodError([{
        path: ["b"],
        code: "custom",
        message: "custom message"
    }])
    console.log(error.errors)
    let clientHeight = 0
</script>
<h1>Welcome to your library project</h1>
<p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
<Form realTime schema={z.object({
    a: z.number(),
    b: z.object({
        c: z.number()
    })
})} let:validation let:formSection let:formSectionContainer let:formError let:formInput>
    <form use:validation>
        a<input type="number" name="a">
        <div use:formSection={{name: "b"}}>
            <div use:formSectionContainer>
                <div use:formError></div>
                b<input type="number" name="c" use:formInput>
            </div>
        </div>
    </form>
    <div slot="error" let:error>
        <h2>Errors: </h2>
        <ul>

            {#each error.errors as message}
                <li>{message}</li>
            {/each}
        </ul>
    </div>
</Form>