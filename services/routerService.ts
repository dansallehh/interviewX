import { getRoleById, type RoleId } from '../models/role';
import type { RouteMatch } from '../models/router';

export type RouteListener = (route: RouteMatch) => void;

export function parseHash(rawHash: string): RouteMatch {
  const cleaned = rawHash.replace(/^#/, '').trim();
  if (!cleaned || cleaned === '/') {
    return { name: 'home' };
  }

  const normalized = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  const [pathOnly, queryString] = normalized.split('?');
  const segments = pathOnly.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { name: 'home' };
  }

  const [head, second, third] = segments;

  if (head === 'role' && second && segments.length === 2) {
    const role = getRoleById(second);
    if (role) {
      return { name: 'role', roleId: role.id as RoleId };
    }
    return { name: 'not-found', path: normalized };
  }

  if (head === 'brief' && second && segments.length <= 3) {
    const role = getRoleById(second);
    if (role) {
      const params = new URLSearchParams(queryString ?? '');
      const levelId = third ?? params.get('level') ?? undefined;
      if (levelId && !role.levels.some((l) => l.id === levelId)) {
        return { name: 'not-found', path: normalized };
      }
      return { name: 'brief', roleId: role.id as RoleId, levelId };
    }
    return { name: 'not-found', path: normalized };
  }

  if (head === 'assess' && second && segments.length === 2) {
    return { name: 'assess', sessionId: decodeURIComponent(second) };
  }

  if (head === 'report' && second && segments.length === 2) {
    return { name: 'report', sessionId: decodeURIComponent(second) };
  }

  if (head === 'interviewer' && segments.length === 1) {
    return { name: 'interviewer' };
  }

  return { name: 'not-found', path: normalized };
}

export class RouterService {
  private listeners = new Set<RouteListener>();
  private current: RouteMatch = { name: 'home' };
  private boundOnHashChange: () => void;

  constructor() {
    this.boundOnHashChange = () => this.handleHashChange();
  }

  start(): void {
    window.addEventListener('hashchange', this.boundOnHashChange);
    this.handleHashChange();
  }

  stop(): void {
    window.removeEventListener('hashchange', this.boundOnHashChange);
  }

  subscribe(listener: RouteListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCurrent(): RouteMatch {
    return this.current;
  }

  navigate(hashPath: string): void {
    const target = hashPath.startsWith('#') ? hashPath : `#${hashPath}`;
    if (window.location.hash === target) {
      this.handleHashChange();
      return;
    }
    window.location.hash = target;
  }

  private handleHashChange(): void {
    this.current = parseHash(window.location.hash);
    this.listeners.forEach((listener) => listener(this.current));
  }
}
