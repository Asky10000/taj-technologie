export type TicketStatus   = 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketCategory = 'HARDWARE' | 'SOFTWARE' | 'NETWORK' | 'SECURITY' | 'TRAINING' | 'OTHER';

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
  code:                 string;
  title:                string;
  description:          string;
  status:               TicketStatus;
  priority:             TicketPriority;
  category:             TicketCategory;
  customerId?:          string;
  customer?:            { id: string; companyName: string; code: string };
  assigneeId?:          string;
  assignee?:            { id: string; firstName: string; lastName: string };
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
