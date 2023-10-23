<script lang="ts">
    import type { errorsType } from "./Form.svelte"
    import { Errors, HasErrors, Path } from "./Form.svelte";
    type T = $$Generic<ZodObject<ZodRawShape>>

    export let errors: errorsType<T>
</script>

{#if errors[HasErrors]}
    <slot errors={errors[Errors]} path={errors[Path]}>
        {#each errors[Errors] as error (error)}
            <p>{error}</p>
        {/each}
    </slot>
{/if}
