export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return decoded !== null && typeof decoded === 'object' && !Array.isArray(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
