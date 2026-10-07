<script lang="ts">
  import type { HeadingEntry } from '../contracts/document';

  interface Props {
    headings: readonly HeadingEntry[];
    onselect: (heading: HeadingEntry) => void;
    active: string | null;
    visible?: boolean;
    onvisible?: (visible: boolean) => void;
  }

  let {
    headings,
    onselect,
    active,
    visible = true,
    onvisible = () => {},
  }: Props = $props();
</script>

{#if headings.length > 0}
  <nav class="table-of-contents" aria-label="Table des matières">
    <button
      type="button"
      aria-expanded={visible}
      onclick={() => {
        onvisible(!visible);
      }}>Sommaire {visible ? '−' : '+'}</button
    >
    {#if visible}
      <ol>
        {#each headings as heading (heading.id)}
          <li style:--heading-level={heading.level}>
            <button
              type="button"
              aria-current={heading.id === active ? 'location' : undefined}
              onclick={() => onselect(heading)}
            >
              {heading.text || 'Section sans titre'}
            </button>
          </li>
        {/each}
      </ol>
    {/if}
  </nav>
{/if}
