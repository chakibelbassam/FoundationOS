export interface NavigationFrom {
  route: string;
  path: string;
}

export function fromState(state: unknown): NavigationFrom | null {
  return (state as { from?: NavigationFrom } | null)?.from ?? null;
}
