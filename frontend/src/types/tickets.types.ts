export type TicketStatus   = 'OPEN' | 'IN_PROGRESS' | 'PENDING_CLIENT' | 'PENDING_SUPPLIER' | 'ESCALATED' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketCategory = 'HARDWARE' | 'SOFTWARE' | 'NETWORK' | 'SECURITY' | 'EMAIL' | 'PRINT' | 'ACCESS' | 'INSTALLATION' | 'MAINTENANCE' | 'OTHER';

export interface TicketComment {
  id:               string;
  content:          string;
  isInternal:       boolean;
  isFirstResponse:  boolean;
  timeSpentMinutes: number;
  attachments:      string[];
  createdAt:        string;
  author?: { id: string; firstName: string; lastName: string };
}

export interface Ticket {
  id:                   string;
  number:               string;
  title:                string;
  description:          string;
  status:               TicketStatus;
  priority:             TicketPriority;
  category:             TicketCategory;
  customerId?:          string;
  customer?:            { id: string; companyName: string; code: string };
  assignedToId?:        string;
  assignedTo?:          { id: string; firstName: string; lastName: string };
  slaResponseDueAt?:    string;
  slaResolutionDueAt?:  string;
  slaResponseMet?:      boolean;
  slaResolutionMet?:    boolean;
  firstResponseAt?:     string;
  resolvedAt?:          string;
  satisfactionScore?:   number;
  totalTimeMinutes:     number;
  escalatedTo?:         string;
  tags:                 string[];
  comments?:            TicketComment[];
  createdAt:            string;
  updatedAt:            string;
}
