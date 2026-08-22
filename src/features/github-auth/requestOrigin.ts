export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const protocol = forwarded(request, 'x-forwarded-proto') ?? url.protocol.replace(/:$/, '');
  const host = forwarded(request, 'x-forwarded-host') ?? url.host;
  return `${protocol}://${host}`;
}

function forwarded(request: Request, header: string): string | null {
  const value = request.headers.get(header)?.split(',')[0]?.trim();
  return value ? value : null;
}
