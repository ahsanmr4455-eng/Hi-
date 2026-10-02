import { MessageAttachment, UserRole } from './workspace';

export type ProjectStatus = 'Planning' | 'In Progress' | 'Review' | 'Revision' | 'Completed' | 'On Hold';
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ProjectMilestone {
  id: string;
  title: string;
  description?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate?: string;
  visibleToClient: boolean;
}

export interface Project {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  clientId: string;
  clientUsername?: string;
  assignedTeamMemberIds: string[];
  startDate: string;
  dueDate: string;
  status: ProjectStatus;
  progress: number; // 0 - 100
  priority: PriorityLevel;
  milestones: ProjectMilestone[];
  createdAt: string;
  updatedAt?: string;
  isArchived?: boolean;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Completed';

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  description: string;
  assignedToId: string;
  assignedToName: string;
  priority: PriorityLevel;
  dueDate: string;
  status: TaskStatus;
  visibleToClient: boolean;
  attachments: MessageAttachment[];
  comments?: TaskComment[];
  createdAt: string;
  completedAt?: string | null;
}

export type SupportStatus = 'Open' | 'In Progress' | 'Waiting for Client' | 'Completed' | 'Closed';
export type SupportCategory = 'General' | 'Technical' | 'Billing' | 'Design' | 'Bug';

export interface SupportMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  attachments?: MessageAttachment[];
  createdAt: string;
}

export interface SupportRequest {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  category: SupportCategory;
  priority: PriorityLevel;
  attachments: MessageAttachment[];
  status: SupportStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

export type ApprovalStatus = 'Pending Review' | 'Approved' | 'Changes Requested';

export interface DeliverableApproval {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  description: string;
  fileUrl?: string;
  fileData?: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  version: number;
  status: ApprovalStatus;
  clientComment?: string;
  approvalDate?: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  workspaceId: string;
  versionNumber: number;
  uploadedBy: string;
  uploadedByName: string;
  uploadedByRole: UserRole;
  uploadedAt: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath?: string;
  downloadUrl?: string;
  fileData?: string;
  notes?: string;
}

export type NotificationType = 'message' | 'file' | 'task' | 'support' | 'approval' | 'deadline' | 'project';

export interface InAppNotification {
  id: string;
  recipientId: string; // user ID or 'all_admins' or 'workspace_all'
  workspaceId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkTab?: string;
  read: boolean;
  createdAt: string;
}

export interface ClientFeedback {
  id: string;
  workspaceId: string;
  projectId?: string;
  deliverableId?: string;
  rating: number; // 1 to 5
  comment: string;
  clientName: string;
  feedbackDate: string;
}

export interface CalendarItem {
  id: string;
  title: string;
  type: 'project' | 'task' | 'support' | 'deliverable' | 'milestone';
  date: string;
  status?: string;
  priority?: PriorityLevel;
  linkTab: string;
  refId: string;
  workspaceId: string;
}
