/** Copy text to the clipboard; falls back to execCommand on insecure (http) origins. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Native share sheet when available (mobile), otherwise copies the link.
 * Returns "copied" when the fallback was used so the UI can show a confirmation.
 */
export async function shareApp(title: string, text: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const url = `${window.location.origin}/`;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
      // any other error: fall back to copying the link
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed';
}
