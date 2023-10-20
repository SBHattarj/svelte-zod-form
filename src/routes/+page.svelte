<script lang="ts">
    import Form, { Value } from "$lib";
    import z from "zod";
    let error = new z.ZodError([{
        path: ["b"],
        code: "custom",
        message: "custom message"
    }])
    console.log(error.errors)
    export let form = {} as any;
    let errors = form?.errors ?? [];
    $: {
        errors = form?.errors ?? [];
    }
    $: console.log("errors", errors)
    $: console.log(form)
    let clientHeight = 0
</script>
<h1>Welcome to your library project</h1>
<p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
<Form let:names realTime schema={z.object({
    a: z.number(),
    b: z.object({
        c: z.number()
    })
})} errors={form?.errors ?? []}  let:validation let:formSection let:formSectionContainer let:formError let:formInput>
    <form use:validation method="post">
        a<input type="number" name={names.a[Value]}>
        <div use:formSection={{name: names.b[Value]}}>
            <div use:formSectionContainer>
                <div use:formError></div>
                b<input type="number" name={names.b.c[Value]} use:formInput>
            </div>
        </div>
        <button>submit</button>
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
