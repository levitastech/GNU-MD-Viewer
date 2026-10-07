import DOMPurify from 'dompurify';

import type { SafeHtml, UnsanitizedHtml } from '../contracts/document';

const URL_ATTRIBUTES = [
  'action',
  'cite',
  'data',
  'formaction',
  'href',
  'poster',
  'src',
  'srcset',
  'xlink:href',
];

const SVG_TAGS = [
  'circle',
  'clipPath',
  'defs',
  'desc',
  'ellipse',
  'g',
  'line',
  'linearGradient',
  'marker',
  'path',
  'polygon',
  'polyline',
  'rect',
  'stop',
  'svg',
  'text',
  'title',
  'tspan',
] as const;

const SVG_ATTRIBUTES = [
  'aria-hidden',
  'aria-label',
  'class',
  'clip-path',
  'cx',
  'cy',
  'd',
  'dominant-baseline',
  'dx',
  'dy',
  'fill',
  'fill-opacity',
  'font-family',
  'font-size',
  'font-weight',
  'height',
  'id',
  'marker-end',
  'marker-mid',
  'marker-start',
  'offset',
  'opacity',
  'orient',
  'points',
  'preserveAspectRatio',
  'r',
  'refX',
  'refY',
  'role',
  'rx',
  'ry',
  'spreadMethod',
  'stop-color',
  'stop-opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-width',
  'text-anchor',
  'transform',
  'viewBox',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
] as const;

export const sanitizeDocumentHtml = (html: UnsanitizedHtml): SafeHtml =>
  DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: [
      'data-mdv-enrichment',
      'data-mdv-heading',
      'data-mdv-anchor',
      'data-mdv-image',
      'data-mdv-link',
      'data-mdv-link-kind',
      'role',
      'tabindex',
    ],
    SANITIZE_DOM: true,
    SANITIZE_NAMED_PROPS: true,
    FORBID_TAGS: [
      'base',
      'button',
      'embed',
      'form',
      'iframe',
      'input',
      'link',
      'meta',
      'object',
      'script',
      'style',
      'template',
      'textarea',
    ],
    FORBID_ATTR: [
      ...URL_ATTRIBUTES,
      'download',
      'form',
      'id',
      'name',
      'style',
      'target',
    ],
  }) as SafeHtml;

export const sanitizeCodeHtml = (html: UnsanitizedHtml): SafeHtml =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
  }) as SafeHtml;

export const sanitizeKatexHtml = (html: UnsanitizedHtml): SafeHtml =>
  DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, mathMl: true },
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      'base',
      'button',
      'embed',
      'form',
      'iframe',
      'input',
      'link',
      'meta',
      'object',
      'script',
      'style',
      'template',
      'textarea',
    ],
    FORBID_ATTR: [...URL_ATTRIBUTES, 'download', 'form', 'target'],
  }) as SafeHtml;

export const sanitizeMermaidSvg = (svg: UnsanitizedHtml): SafeHtml => {
  const clean = DOMPurify.sanitize(svg, {
    ALLOWED_TAGS: [...SVG_TAGS],
    ALLOWED_ATTR: [...SVG_ATTRIBUTES],
    ALLOW_ARIA_ATTR: true,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: false,
  });
  const template = document.createElement('template');
  template.innerHTML = clean;
  const ids = new Set(
    Array.from(template.content.querySelectorAll('[id]'), (el) => el.id),
  );
  for (const el of template.content.querySelectorAll('*')) {
    for (const attr of Array.from(el.attributes)) {
      if (
        /url\s*\(/i.test(attr.value) &&
        !/^url\(#[a-zA-Z0-9_-]+\)$/.test(attr.value)
      )
        el.removeAttribute(attr.name);
      else if (
        attr.value.startsWith('url(#') &&
        !ids.has(attr.value.slice(5, -1))
      )
        el.removeAttribute(attr.name);
    }
  }
  return template.innerHTML as SafeHtml;
};

export const asUnsanitizedHtml = (value: string): UnsanitizedHtml =>
  value as UnsanitizedHtml;

export const appendSafeHtml = (target: Element, html: SafeHtml): void => {
  target.insertAdjacentHTML('beforeend', html);
};

export const replaceWithSafeHtml = (target: Element, html: SafeHtml): void => {
  target.replaceChildren();
  appendSafeHtml(target, html);
};
