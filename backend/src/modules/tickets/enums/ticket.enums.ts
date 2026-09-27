export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_CLIENT = 'PENDING_CLIENT',   // En attente de retour client
  PENDING_SUPPLIER = 'PENDING_SUPPLIER', // En attente fournisseur / pièce
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketCategory {
  HARDWARE = 'HARDWARE',
  SOFTWARE = 'SOFTWARE',
  NETWORK = 'NETWORK',
  SECURITY = 'SECURITY',
  EMAIL = 'EMAIL',
  PRINT = 'PRINT',
  ACCESS = 'ACCESS',
  INSTALLATION = 'INSTALLATION',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER',
}

export enum TicketSource {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  PORTAL = 'PORTAL',
  ON_SITE = 'ON_SITE',
  INTERNAL = 'INTERNAL',
  AUTO = 'AUTO',
}

/**
 * Délais SLA en minutes selon la priorité.
 * Première réponse / Résolution cible
 */
export const SLA_RESPONSE_MINUTES: Record<TicketPriority, number> = {
  [TicketPriority.CRITICAL]: 30,
  [TicketPriority.HIGH]: 120,
  [TicketPriority.MEDIUM]: 480,
  [TicketPriority.LOW]: 1440,
};

export const SLA_RESOLUTION_MINUTES: Record<TicketPriority, number> = {
  [TicketPriority.CRITICAL]: 240,
  [TicketPriority.HIGH]: 480,
  [TicketPriority.MEDIUM]: 1440,
  [TicketPriority.LOW]: 4320,
};
