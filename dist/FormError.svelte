<script>import { Errors, HasErrors, Path } from "./Form.svelte";
export let errors;
</script>

{#if errors[HasErrors]}
    <slot errors={errors[Errors]} path={errors[Path]}>
        {#each errors[Errors] as error (error)}
            <p>{error}</p>
        {/each}
    </slot>
{/if}
