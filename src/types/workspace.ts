export type UserRole = 'admin' | 'team' | 'client';

export interface User {
  id: string;
  username: string;
  passwordHash?: string;
  portalPassword?: string; // Explicit portal password for client or team account
  name: string;
  role: UserRole;
  email?: string;
  status: 'active' | 'disabled';
  assignedWorkspaces: string[]; // Workspace IDs this team member or client can access
  accessToken?: string;
  portalToken?: string;
  tokenStatus?: 'active' | 'revoked';
  createdAt: string;
  updatedAt?: string;
}

export interface Workspace {
  id: string;
  title: string;
  clientId: string;
  clientUsername: string;
  portalPassword?: string; // Plaintext or hashed password set by Admin
  enabledSections: string[];
  enabledFolderCategories: string[];
  accessToken: string;
  tokenStatus?: 'active' | 'revoked';
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt?: string;
}

export interface Folder {
  id: string;
  workspaceId: string;
  parentFolderId: string | null;
  name: string;
  sectionCategory?: string;
  createdAt: string;
  createdBy: string;
}

export interface WorkspaceFile {
  id: string;
  workspaceId: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  fileData?: string;
  currentVersion?: number;
  uploadedBy: string;
  uploadedByName: string;
  uploadedByRole: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export type { FileVersion } from './portal';

export interface Conversation {
  id: string;
  workspaceId: string;
  participantIds: string[];
  participantNames?: { [userId: string]: string };
  participantRoles?: { [userId: string]: UserRole };
  lastMessage: string;
  lastMessageAt: string;
  unreadCounts: { [userId: string]: number };
  typingStatus?: { [userId: string]: boolean };
}

export interface MessageAttachment {
  fileId?: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  downloadUrl?: string;
  fileData?: string;
  storagePath?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  type?: 'text' | 'file';
  text: string;
  attachments?: MessageAttachment[];
  replyToId?: string | null;
  replyToText?: string;
  readBy: string[];
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  status?: 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  clientTempId?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface ActivityLog {
  id: string;
  workspaceId: string | null;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

export interface UploadProgressItem {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedSize: number;
  percentage: number;
  speed: string;
  remainingTime: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface DownloadProgressItem {
  id: string;
  fileName: string;
  fileSize: number;
  downloadedSize: number;
  percentage: number;
  status: 'downloading' | 'completed' | 'failed';
  error?: string;
}
