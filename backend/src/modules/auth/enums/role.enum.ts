/**
 * Rôles applicatifs (RBAC).
 * La hiérarchie est évaluée dans RolesGuard via la constante ROLE_HIERARCHY.
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALES = 'SALES',
  TECHNICIAN = 'TECHNICIAN',
  ACCOUNTANT = 'ACCOUNTANT',
  USER = 'USER',
}

/**
 * Niveau hiérarchique (plus élevé = plus de privilèges).
 * Un rôle N donne implicitement accès aux ressources de tous les rôles de niveau < N.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.ADMIN]: 90,
  [Role.MANAGER]: 70,
  [Role.ACCOUNTANT]: 60,
  [Role.SALES]: 50,
  [Role.TECHNICIAN]: 50,
  [Role.USER]: 10,
};
