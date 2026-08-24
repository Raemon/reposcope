const REVOKE_DELAY_MS = 60_000;

export function openImageTab(dataUrl: string) {
  const url = URL.createObjectURL(blobFromDataUrl(dataUrl));
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

function blobFromDataUrl(dataUrl: string): Blob {
  const [header = '', base64 = ''] = dataUrl.split(',', 2);
  const type = header.slice('data:'.length).replace(';base64', '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}
