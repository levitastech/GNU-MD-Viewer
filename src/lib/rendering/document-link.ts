/** Split before decoding: %23 is part of a filename, # is an anchor delimiter. */
export const splitDocumentLink = (
  target: string,
): { path: string; anchor?: string } => {
  const delimiter = target.indexOf('#');
  const path = delimiter < 0 ? target : target.slice(0, delimiter);
  const fragment = delimiter < 0 ? '' : target.slice(delimiter + 1);
  if (!path || path.includes('?'))
    throw new Error('Lien documentaire invalide.');
  // Reject invalid UTF-8/percent escapes before replacing the active document.
  decodeURIComponent(fragment);
  return { path, anchor: fragment ? `#${fragment}` : undefined };
};
