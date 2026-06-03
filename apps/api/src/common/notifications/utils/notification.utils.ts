export function buildGreetingName(name: string, email?: string): string | null {
  const normalized = name?.trim();
  if (!normalized) return null;

  let lowerName = normalized.toLowerCase();
  const lowerEmail = email?.trim().toLowerCase();
  if (lowerName.includes('@')) {
    lowerName = lowerName.split('@')[0];
    return lowerName.charAt(0).toUpperCase() + lowerName.slice(1);
  }
  if (lowerEmail && lowerName === lowerEmail) return null;
  return normalized;
}
