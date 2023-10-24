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
    $: console.log("form", form)
</script>
<h1>Welcome to your library project</h1>
<p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
<Form 
    let:names 
    schema={z.object({
        a: z.string(),
        b: z.object({
            c: z.number()
        }),
        c: z.string(),
        file: z.instanceof(File)
    })}
    allErrors={form?.errors ?? []}
    let:validation
    let:formInput
    let:errors
    let:FormError
    let:values
>
    <form enctype="multipart/form-data" use:validation method="post">
        <div>
            a<input type="text" name={names.a[Value]} value={values.a || "a innitial value"}>
            <FormError errors={errors.a} let:errors let:path >
                <h2>Errors</h2>
                <ul>
                    {#each errors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            </FormError>
        </div>
        <div>
            b.c<input type="number" name={names.b.c[Value]} use:formInput value={values.b.c}>
            <FormError errors={errors.b.c} let:errors let:path>
                <h2>Errors</h2>
                <ul>
                    {#each errors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            </FormError>
        </div>
        <div>
            <div><label for="a">a</label><input
                name={names?.c[Value]}
                id="a"
                type="radio"
                value="hello"
                checked={values?.c === "hello"}
            ></div>
            <div><label for="b">b</label><input
                name={names.c[Value]}
                id="b"
                type="radio"
                value="hello bye"
                checked={values?.c === "hello bye"}
            ></div>
            <div><label for="c">c</label><input
                name={names.c[Value]}
                id="c"
                type="radio"
                value="bye"
                checked={values?.c === "bye"}
            ></div>
            <FormError errors={errors.c} let:errors>
                <h2>Errors</h2>
                <ul>
                    {#each errors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            </FormError>
        </div>
        <div>
            file<input name="file" type="file">
        </div>
        <button>submit</button>
    </form>
</Form>
