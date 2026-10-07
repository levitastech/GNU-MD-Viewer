import type { MarkdownIt } from 'markdown-it';
import type { EnrichmentBlock } from '../contracts/document';

// Single dollars remain ordinary Markdown, including monetary values.
export const installMath = (markdown: MarkdownIt): void => {
  const placeholder = (
    source: string,
    display: boolean,
    environment: unknown,
  ): string => {
    const env = environment as { enrichments: EnrichmentBlock[] };
    const occurrence = env.enrichments.length;
    env.enrichments.push({
      occurrence,
      kind: display ? 'katex-block' : 'katex-inline',
      source,
    });
    const tag = display ? 'div' : 'span';
    return `<${tag} class="mdv-math" data-mdv-enrichment="${occurrence}">${markdown.utils.escapeHtml(source)}</${tag}>`;
  };
  markdown.inline.ruler.before('escape', 'mdv_math_inline', (state, silent) => {
    if (state.src.slice(state.pos, state.pos + 2) !== '\\(') return false;
    const end = state.src.indexOf('\\)', state.pos + 2);
    if (end < 0 || state.src.slice(state.pos + 2, end).includes('\n'))
      return false;
    if (!silent) {
      const token = state.push('mdv_math_inline', 'span', 0);
      token.content = state.src.slice(state.pos + 2, end);
    }
    state.pos = end + 2;
    return true;
  });
  markdown.block.ruler.before(
    'fence',
    'mdv_math_block',
    (state, start, end, silent) => {
      if (state.sCount[start]! - state.blkIndent >= 4) return false;
      const line = state.src
        .slice(state.bMarks[start]! + state.tShift[start]!, state.eMarks[start])
        .trim();
      if (line !== '$$' && line !== '\\[') return false;
      const closing = line === '$$' ? '$$' : '\\]';
      let next = start + 1;
      while (
        next < end &&
        state.src
          .slice(state.bMarks[next]! + state.tShift[next]!, state.eMarks[next])
          .trim() !== closing
      )
        next++;
      if (next === end) return false;
      if (silent) return true;
      const token = state.push('mdv_math_block', 'div', 0);
      token.block = true;
      token.map = [start, next + 1];
      token.content = state.getLines(start + 1, next, state.blkIndent, false);
      state.line = next + 1;
      return true;
    },
  );
  markdown.renderer.rules.mdv_math_inline = (tokens, index, _options, env) =>
    placeholder(tokens[index]!.content, false, env);
  markdown.renderer.rules.mdv_math_block = (tokens, index, _options, env) =>
    placeholder(tokens[index]!.content, true, env) + '\n';
};
