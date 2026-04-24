export type CustomerType   = 'COMPANY' | 'INDIVIDUAL' | 'ASSOCIATION' | 'PUBLIC';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'ARCHIVED';

export type ProspectStatus =
  | 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT'
  | 'NEGOTIATION' | 'WON' | 'LOST' | 'ON_HOLD';
export type ProspectSource =
  | 'WEBSITE' | 'REFERRAL' | 'COLD_CALL' | 'EMAIL_CAMPAIGN'
  | 'SOCIAL_MEDIA' | 'TRADE_SHOW' | 'PARTNER' | 'OTHER';

export type InteractionType =
  | 'CALL' | 'EMAIL' | 'MEETING' | 'VISIT' | 'NOTE'
  | 'PROPOSAL' | 'COMPLAINT' | 'OTHER';

export interface Customer {
  id:               string;
  code:             string;
  type:             CustomerType;
  status:           CustomerStatus;
  name:             string;
  legalName?:       string;
  firstName?:       string;
  lastName?:        string;
  email?:           string;
  phone?:           string;
  addressLine1?:    string;
  addressLine2?:    string;
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
  name:            string;
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
