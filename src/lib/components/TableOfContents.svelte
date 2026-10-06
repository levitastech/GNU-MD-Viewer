<script lang="ts">
  import type { HeadingEntry } from '../contracts/document';

  interface Props {
    headings: readonly HeadingEntry[];
    onselect: (heading: HeadingEntry) => void;
  }

  let { headings, onselect }: Props = $props();
</script>

{#if headings.length > 0}
  <nav class="table-of-contents" aria-label="Table des matières">
    <p>Sommaire</p>
    <ol>
      {#each headings as heading (heading.id)}
        <li style:--heading-level={heading.level}>
          <button type="button" onclick={() => onselect(heading)}>
            {heading.text || 'Section sans titre'}
          </button>
        </li>
      {/each}
    </ol>
  </nav>
{/if}
