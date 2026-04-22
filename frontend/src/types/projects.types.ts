export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ProjectType   = 'INSTALLATION' | 'MAINTENANCE' | 'DEVELOPMENT' | 'CONSULTING' | 'SUPPORT' | 'OTHER';
export type TaskStatus    = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority  = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MemberRole    = 'MANAGER' | 'LEAD' | 'TECHNICIAN' | 'CONSULTANT' | 'OBSERVER';

export interface ProjectMember {
  id:         string;
  userId:     string;
  role:       MemberRole;
  hourlyRate?: number;
  joinedAt:   string;
  user?: { id: string; firstName: string; lastName: string; email: string };
}

export interface ProjectTask {
  id:              string;
  title:           string;
  description?:    string;
  status:          TaskStatus;
  priority:        TaskPriority;
  estimatedHours:  number;
  actualHours:     number;
  startDate?:      string;
  dueDate?:        string;
  completedAt?:    string;
  progressPercent: number;
  sortOrder:       number;
  assigneeId?:     string;
  parentTaskId?:   string;
  projectId:       string;
  assignee?:       { id: string; firstName: string; lastName: string };
  subTasks?:       ProjectTask[];
  createdAt:       string;
}

export interface TimeEntry {
  id:          string;
  projectId:   string;
  taskId?:     string;
  userId:      string;
  hours:       number;
  entryDate:   string;
  description?: string;
  isBillable:  boolean;
  hourlyRate:  number;
  user?:       { id: string; firstName: string; lastName: string };
  task?:       { id: string; title: string };
}

export interface Project {
  id:              string;
  code:            string;
  name:            string;
  description?:    string;
  type:            ProjectType;
  status:          ProjectStatus;
  startDate?:      string;
  endDate?:        string;
  actualStartDate?: string;
  actualEndDate?:  string;
  budget:          number;
  actualCost:      number;
  progressPercent: number;
  notes?:          string;
  tags:            string[];
  customerId?:     string;
  managerId?:      string;
  customer?:       { id: string; companyName: string };
  manager?:        { id: string; firstName: string; lastName: string };
  members?:        ProjectMember[];
  tasks?:          ProjectTask[];
  createdAt:       string;
  updatedAt:       string;
}
