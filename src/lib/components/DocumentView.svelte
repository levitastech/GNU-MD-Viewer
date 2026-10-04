<script lang="ts">
  import type { SafeHtml } from '../contracts/document';

  interface Props {
    html: SafeHtml;
    label: string;
    onactivate: (target: HTMLElement) => void;
  }

  let { html, label, onactivate }: Props = $props();

  const candidate = (event: Event): HTMLElement | null => {
    const target = event.target;
    return target instanceof Element
      ? (target.closest('[data-mdv-link]') as HTMLElement | null)
      : null;
  };

  const handleClick = (event: MouseEvent): void => {
    const target = candidate(event);
    if (!target) return;
    event.preventDefault();
    onactivate(target);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = candidate(event);
    if (!target) return;
    event.preventDefault();
    onactivate(target);
  };
</script>

<!-- Event delegation is required because sanitized document links are inserted as inert HTML. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
  class="document"
  aria-label={label}
  tabindex="-1"
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  {@html html}
</article>
