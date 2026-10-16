export type InterventionStatus = 'DRAFT' | 'COMPLETED';

export interface InterventionTechnician {
  id:        string;
  firstName: string;
  lastName:  string;
}

export interface InterventionCustomer {
  id:    string;
  name:  string;
  code?: string;
  city?: string;
  phone?: string;
  email?: string;
}

export interface Intervention {
  id:            string;
  number:        string;
  subject?:      string;
  status:        InterventionStatus;
  visitDate:     string;
  anomalies?:    string;
  observations?: string;
  suggestions?:  string;
  customerId:    string;
  customer?:     InterventionCustomer;
  technicianId?: string;
  technician?:   InterventionTechnician;
  createdAt:     string;
  updatedAt:     string;
}

export interface CreateInterventionInput {
  customerId:    string;
  visitDate:     string;
  subject?:      string;
  status?:       InterventionStatus;
  anomalies?:    string;
  observations?: string;
  suggestions?:  string;
}
