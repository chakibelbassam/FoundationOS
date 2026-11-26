const pending = new Map<string, string>();

export interface ReturnTarget {
  route: string;
  path: string;
}

export function rememberReturn(route: string, path: string) {
  if (!route) return;
  pending.set(route, path);
}

export function takeReturn(route: string): string | null {
  const path = pending.get(route) ?? null;
  pending.delete(route);
  return path;
}
