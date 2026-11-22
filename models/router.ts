import type { RoleId } from './role';

export type RouteMatch =
  | { name: 'home' }
  | { name: 'role'; roleId: RoleId }
  | { name: 'brief'; roleId: RoleId; levelId?: string }
  | { name: 'assess'; sessionId: string }
  | { name: 'report'; sessionId: string }
  | { name: 'interviewer' }
  | { name: 'not-found'; path: string };
