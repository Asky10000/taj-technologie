export type CustomerType   = 'COMPANY' | 'INDIVIDUAL';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type ProspectStatus =
  | 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT'
  | 'NEGOTIATION' | 'CONVERTED' | 'LOST';
export type ProspectSource =
  | 'WEBSITE' | 'REFERRAL' | 'COLD_CALL' | 'EMAIL'
  | 'SOCIAL_MEDIA' | 'EVENT' | 'OTHER';

export type InteractionType =
  | 'CALL' | 'EMAIL' | 'MEETING' | 'DEMO' | 'QUOTE_SENT'
  | 'CONTRACT_SIGNED' | 'SUPPORT' | 'OTHER';

export interface Customer {
  id:               string;
  code:             string;
  type:             CustomerType;
  status:           CustomerStatus;
  companyName:      string;
  firstName?:       string;
  lastName?:        string;
  email?:           string;
  phone?:           string;
  address?:         string;
  city?:            string;
  postalCode?:      string;
  country?:         string;
  taxId?:           string;
  creditLimit:      number;
  paymentTermsDays: number;
  notes?:           string;
  tags:             string[];
  createdAt:        string;
  updatedAt:        string;
}

export interface Contact {
  id:          string;
  firstName:   string;
  lastName:    string;
  email?:      string;
  phone?:      string;
  jobTitle?:   string;
  isPrimary:   boolean;
  customerId?: string;
  prospectId?: string;
  createdAt:   string;
}

export interface Interaction {
  id:               string;
  type:             InteractionType;
  subject:          string;
  notes?:           string;
  occurredAt:       string;
  durationMinutes?: number;
  customerId?:      string;
  prospectId?:      string;
  createdByUser?:   { id: string; firstName: string; lastName: string };
}

export interface Prospect {
  id:              string;
  companyName:     string;
  firstName?:      string;
  lastName?:       string;
  email?:          string;
  phone?:          string;
  status:          ProspectStatus;
  source:          ProspectSource;
  score:           number;
  estimatedBudget: number;
  notes?:          string;
  tags:            string[];
  createdAt:       string;
  updatedAt:       string;
  contacts?:       Contact[];
  interactions?:   Interaction[];
}
