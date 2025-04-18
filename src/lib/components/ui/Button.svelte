<script lang="ts">
    export let variant: 'primary' | 'secondary' = 'primary';
    export let type: 'button' | 'submit' | 'reset' = 'button';
    export let disabled = false;
    export let href: string | undefined = undefined;

    const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors";
    const variantClasses = variant === 'primary'
        ? 'bg-blue-600 hover:bg-blue-700 text-white'
        : 'bg-gray-700 hover:bg-gray-600 text-white';
</script>

{#if href}
    <a
        {href}
        class="{baseClasses} {variantClasses} {$$props.class || ''}"
        class:opacity-50={disabled}
        on:click
    >
        <slot />
    </a>
{:else}
    <button
        {type}
        {disabled}
        class="{baseClasses} {variantClasses} {$$props.class || ''}"
        on:click
    >
        <slot />
    </button>
{/if} 