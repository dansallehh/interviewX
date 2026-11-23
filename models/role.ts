import baProfile from '../data/roles/ba.json';
import dbaProfile from '../data/roles/dba.json';
import devProfile from '../data/roles/dev.json';
import freshProfile from '../data/roles/fresh.json';
import pmProfile from '../data/roles/pm.json';
import qaProfile from '../data/roles/qa.json';
import saProfile from '../data/roles/sa.json';
import seniorProfile from '../data/roles/senior.json';

export type RoleId = 'fresh' | 'senior' | 'pm' | 'dev' | 'sa' | 'qa' | 'dba' | 'ba';

export interface RoleLevel {
  id: string;
  label: string;
  summary: string;
  durationMinutes: number;
  questionCount: number;
  passMark: number;
}

export interface RoleSectionPreview {
  topic: string;
  weight: number;
}

export interface RoleDefinition {
  id: RoleId;
  code: string;
  name: string;
  shortName: string;
  tagline: string;
  focus: readonly string[];
  motif: string;
  accentHex: string;
  rubricId: string;
  levels: readonly RoleLevel[];
  sections: readonly RoleSectionPreview[];
}

export const ROLES: readonly RoleDefinition[] = [
  freshProfile as RoleDefinition,
  seniorProfile as RoleDefinition,
  pmProfile as RoleDefinition,
  devProfile as RoleDefinition,
  saProfile as RoleDefinition,
  qaProfile as RoleDefinition,
  dbaProfile as RoleDefinition,
  baProfile as RoleDefinition,
] as const;

export function getRoleById(id: string): RoleDefinition | undefined {
  return ROLES.find((role) => role.id === id);
}

export function getRoleLevel(role: RoleDefinition, levelId?: string): RoleLevel {
  if (levelId) {
    const found = role.levels.find((lvl) => lvl.id === levelId);
    if (found) return found;
  }
  return role.levels[0];
}
