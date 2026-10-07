/** The alert plugin emits a visual container; add its reading landmark after sanitization. */
export const markAlertSemantics = (container: HTMLElement): void => {
  for (const alert of container.querySelectorAll<HTMLElement>(
    '.markdown-alert',
  ))
    alert.setAttribute('role', 'note');
};
