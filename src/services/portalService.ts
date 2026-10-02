import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  ApprovalStatus,
  ClientFeedback,
  DeliverableApproval,
  FileVersion,
  InAppNotification,
  Project,
  ProjectMilestone,
  ProjectStatus,
  SupportMessage,
  SupportRequest,
  SupportStatus,
  Task,
  TaskComment,
  TaskStatus
} from '../types/portal';
import { UserRole } from '../types/workspace';
import { logActivity } from './workspaceService';

// ---------------- NOTIFICATIONS ----------------
export function subscribeNotifications(userId: string, workspaceId: string | null, callback: (notifications: InAppNotification[]) => void) {
  const path = 'notifications';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: InAppNotification[] = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as InAppNotification))
      .filter(n =>
        n.recipientId === userId ||
        n.recipientId === 'all_admins' ||
        (n.recipientId === 'workspace_all' && n.workspaceId === workspaceId)
      );
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function createNotification(
  recipientId: string,
  workspaceId: string,
  title: string,
  message: string,
  type: InAppNotification['type'],
  linkTab?: string
): Promise<void> {
  const path = 'notifications';
  try {
    await addDoc(collection(db, path), {
      recipientId,
      workspaceId,
      title,
      message,
      type,
      linkTab: linkTab || 'dashboard',
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Notification creation failed:", err);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (e) {
    console.warn("Mark notification read failed:", e);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const q = query(collection(db, 'notifications'), where('read', '==', false));
    const snap = await getDocs(q);
    const updates = snap.docs
      .filter(d => {
        const data = d.data();
        return data.recipientId === userId || data.recipientId === 'all_admins' || data.recipientId === 'workspace_all';
      })
      .map(d => updateDoc(doc(db, 'notifications', d.id), { read: true }));
    await Promise.all(updates);
  } catch (e) {
    console.warn("Mark all notifications read error:", e);
  }
}

// ---------------- PROJECTS ----------------
export function subscribeProjects(
  workspaceId: string | null,
  role: UserRole,
  userId: string,
  callback: (projects: Project[]) => void
) {
  const path = 'projects';
  const q = workspaceId
    ? query(collection(db, path), where('workspaceId', '==', workspaceId))
    : query(collection(db, path));

  return onSnapshot(q, (snapshot) => {
    let list: Project[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));

    // Role filtering for security
    if (role === 'team') {
      list = list.filter(p => p.assignedTeamMemberIds?.includes(userId) || p.workspaceId === workspaceId);
    } else if (role === 'client') {
      list = list.filter(p => p.workspaceId === workspaceId && !p.isArchived);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function createProject(
  workspaceId: string,
  title: string,
  description: string,
  clientId: string,
  clientUsername: string,
  assignedTeamMemberIds: string[],
  startDate: string,
  dueDate: string,
  priority: Project['priority'],
  milestones: ProjectMilestone[],
  creatorName: string,
  creatorRole: UserRole
): Promise<Project> {
  const path = 'projects';
  try {
    const newProj: Omit<Project, 'id'> = {
      workspaceId,
      title,
      description,
      clientId,
      clientUsername,
      assignedTeamMemberIds,
      startDate,
      dueDate,
      status: 'Planning',
      progress: 0,
      priority,
      milestones: milestones || [],
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, path), newProj);

    await logActivity(
      workspaceId,
      creatorName,
      creatorRole,
      'Created Project',
      `Created project "${title}" with priority ${priority}`
    );

    await createNotification(
      'workspace_all',
      workspaceId,
      'New Project Created',
      `Project "${title}" has been launched.`,
      'project',
      'projects'
    );

    return { id: docRef.id, ...newProj };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateProject(
  projectId: string,
  data: Partial<Project>,
  updaterName: string,
  updaterRole: UserRole
): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      ...data,
      updatedAt: new Date().toISOString()
    });

    if (data.title) {
      await logActivity(
        data.workspaceId || '',
        updaterName,
        updaterRole,
        'Updated Project',
        `Updated details for project "${data.title}"`
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function archiveProject(projectId: string, workspaceId: string, title: string, userName: string, role: UserRole): Promise<void> {
  try {
    await updateDoc(doc(db, 'projects', projectId), { isArchived: true });
    await logActivity(workspaceId, userName, role, 'Archived Project', `Archived project "${title}"`);
  } catch (e) {
    console.warn("Archive project failed:", e);
  }
}

// ---------------- TASKS ----------------
export function subscribeTasks(
  workspaceId: string | null,
  role: UserRole,
  userId: string,
  callback: (tasks: Task[]) => void
) {
  const path = 'tasks';
  const q = workspaceId
    ? query(collection(db, path), where('workspaceId', '==', workspaceId))
    : query(collection(db, path));

  return onSnapshot(q, (snapshot) => {
    let list: Task[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));

    if (role === 'client') {
      list = list.filter(t => t.visibleToClient === true);
    } else if (role === 'team') {
      // Team members can see assigned or workspace tasks
      list = list.filter(t => t.assignedToId === userId || t.workspaceId === workspaceId);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function createTask(
  workspaceId: string,
  projectId: string,
  title: string,
  description: string,
  assignedToId: string,
  assignedToName: string,
  priority: Task['priority'],
  dueDate: string,
  visibleToClient: boolean,
  creatorName: string,
  creatorRole: UserRole
): Promise<Task> {
  const path = 'tasks';
  try {
    const newTask: Omit<Task, 'id'> = {
      workspaceId,
      projectId: projectId || '',
      title,
      description,
      assignedToId,
      assignedToName,
      priority,
      dueDate,
      status: 'To Do',
      visibleToClient,
      attachments: [],
      comments: [],
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, path), newTask);

    await logActivity(
      workspaceId,
      creatorName,
      creatorRole,
      'Created Task',
      `Assigned task "${title}" to ${assignedToName}`
    );

    if (assignedToId) {
      await createNotification(
        assignedToId,
        workspaceId,
        'New Task Assigned',
        `You were assigned to task "${title}".`,
        'task',
        'tasks'
      );
    }

    return { id: docRef.id, ...newTask };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateTaskStatus(
  taskId: string,
  workspaceId: string,
  taskTitle: string,
  newStatus: TaskStatus,
  updaterName: string,
  updaterRole: UserRole
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    const isCompleted = newStatus === 'Completed';
    await updateDoc(doc(db, 'tasks', taskId), {
      status: newStatus,
      completedAt: isCompleted ? new Date().toISOString() : null
    });

    await logActivity(
      workspaceId,
      updaterName,
      updaterRole,
      'Updated Task Status',
      `Marked task "${taskTitle}" as ${newStatus}`
    );

    await createNotification(
      'all_admins',
      workspaceId,
      'Task Status Updated',
      `${updaterName} updated task "${taskTitle}" to ${newStatus}.`,
      'task',
      'tasks'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function addTaskComment(
  taskId: string,
  userId: string,
  userName: string,
  userRole: UserRole,
  text: string
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    const commentObj: TaskComment = {
      id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      userId,
      userName,
      userRole,
      text,
      createdAt: new Date().toISOString()
    };

    const docRef = doc(db, 'tasks', taskId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const existingComments = snap.data().comments || [];
      await updateDoc(docRef, {
        comments: [...existingComments, commentObj]
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ---------------- SUPPORT REQUESTS ----------------
export function subscribeSupportRequests(
  workspaceId: string | null,
  role: UserRole,
  userId: string,
  callback: (requests: SupportRequest[]) => void
) {
  const path = 'supportRequests';
  const q = workspaceId
    ? query(collection(db, path), where('workspaceId', '==', workspaceId))
    : query(collection(db, path));

  return onSnapshot(q, (snapshot) => {
    let list: SupportRequest[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupportRequest));

    if (role === 'client') {
      list = list.filter(r => r.createdBy === userId || r.workspaceId === workspaceId);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function createSupportRequest(
  workspaceId: string,
  title: string,
  description: string,
  category: SupportRequest['category'],
  priority: SupportRequest['priority'],
  attachments: any[],
  creatorId: string,
  creatorName: string,
  creatorRole: UserRole
): Promise<SupportRequest> {
  const path = 'supportRequests';
  try {
    const newReq: Omit<SupportRequest, 'id'> = {
      workspaceId,
      title,
      description,
      category,
      priority,
      attachments: attachments || [],
      status: 'Open',
      createdBy: creatorId,
      createdByName: creatorName,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, path), newReq);

    await logActivity(
      workspaceId,
      creatorName,
      creatorRole,
      'Created Support Request',
      `Submitted support ticket "${title}"`
    );

    await createNotification(
      'all_admins',
      workspaceId,
      'New Support Request',
      `Client ${creatorName} created ticket "${title}".`,
      'support',
      'support'
    );

    return { id: docRef.id, ...newReq };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateSupportStatus(
  requestId: string,
  workspaceId: string,
  title: string,
  newStatus: SupportStatus,
  updaterName: string,
  updaterRole: UserRole
): Promise<void> {
  const path = `supportRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'supportRequests', requestId), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    await logActivity(
      workspaceId,
      updaterName,
      updaterRole,
      'Updated Support Ticket',
      `Ticket "${title}" status set to ${newStatus}`
    );

    await createNotification(
      'workspace_all',
      workspaceId,
      'Support Ticket Updated',
      `Ticket "${title}" is now ${newStatus}.`,
      'support',
      'support'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeSupportMessages(requestId: string, callback: (messages: SupportMessage[]) => void) {
  const path = `supportRequests/${requestId}/messages`;
  const q = query(collection(db, path), orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const list: SupportMessage[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupportMessage));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function sendSupportMessage(
  requestId: string,
  senderId: string,
  senderName: string,
  senderRole: UserRole,
  text: string,
  attachments: any[] = []
): Promise<void> {
  const path = `supportRequests/${requestId}/messages`;
  try {
    await addDoc(collection(db, 'supportRequests', requestId, 'messages'), {
      requestId,
      senderId,
      senderName,
      senderRole,
      text: text.trim(),
      attachments: attachments || [],
      createdAt: new Date().toISOString()
    });

    await updateDoc(doc(db, 'supportRequests', requestId), {
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// ---------------- DELIVERABLE APPROVALS ----------------
export function subscribeApprovals(workspaceId: string | null, callback: (approvals: DeliverableApproval[]) => void) {
  const path = 'approvals';
  const q = workspaceId
    ? query(collection(db, path), where('workspaceId', '==', workspaceId))
    : query(collection(db, path));

  return onSnapshot(q, (snapshot) => {
    const list: DeliverableApproval[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DeliverableApproval));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function createDeliverableApproval(
  workspaceId: string,
  projectId: string | undefined,
  title: string,
  description: string,
  fileUrl: string,
  fileName: string,
  fileSize: number,
  creatorId: string,
  creatorName: string,
  creatorRole: UserRole
): Promise<DeliverableApproval> {
  const path = 'approvals';
  try {
    const newApproval: Omit<DeliverableApproval, 'id'> = {
      workspaceId,
      projectId: projectId || '',
      title,
      description,
      fileUrl,
      fileName,
      fileSize,
      version: 1,
      status: 'Pending Review',
      createdBy: creatorId,
      createdByName: creatorName,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, path), newApproval);

    await logActivity(
      workspaceId,
      creatorName,
      creatorRole,
      'Submitted Deliverable for Approval',
      `Submitted "${title}" (v1) for client review.`
    );

    await createNotification(
      'workspace_all',
      workspaceId,
      'Approval Requested',
      `New deliverable "${title}" is ready for review.`,
      'approval',
      'approvals'
    );

    return { id: docRef.id, ...newApproval };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function respondToApproval(
  approvalId: string,
  workspaceId: string,
  deliverableTitle: string,
  status: 'Approved' | 'Changes Requested',
  clientComment: string,
  clientName: string,
  clientRole: UserRole
): Promise<void> {
  const path = `approvals/${approvalId}`;
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'approvals', approvalId), {
      status,
      clientComment: clientComment || '',
      approvalDate: status === 'Approved' ? now : null,
      updatedAt: now
    });

    const logMessage = status === 'Approved'
      ? `Client approved deliverable "${deliverableTitle}"`
      : `Client requested changes for "${deliverableTitle}": "${clientComment}"`;

    await logActivity(workspaceId, clientName, clientRole, `Deliverable ${status}`, logMessage);

    await createNotification(
      'all_admins',
      workspaceId,
      `Deliverable ${status}`,
      `${clientName} marked "${deliverableTitle}" as ${status}.`,
      'approval',
      'approvals'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ---------------- FILE VERSIONING ----------------
export function subscribeFileVersions(fileId: string, callback: (versions: FileVersion[]) => void) {
  const path = 'fileVersions';
  const q = query(collection(db, path), where('fileId', '==', fileId));

  return onSnapshot(q, (snapshot) => {
    const list: FileVersion[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FileVersion));
    list.sort((a, b) => b.versionNumber - a.versionNumber);
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function uploadFileVersion(
  fileId: string,
  workspaceId: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  url: string,
  downloadUrl: string,
  uploaderId: string,
  uploaderName: string,
  uploaderRole: UserRole,
  notes?: string
): Promise<void> {
  const versionsPath = 'fileVersions';
  const fileRef = doc(db, 'files', fileId);

  try {
    const fileSnap = await getDoc(fileRef);
    let nextVersionNum = 2;
    if (fileSnap.exists()) {
      const curVer = fileSnap.data().currentVersion || 1;
      nextVersionNum = curVer + 1;
    }

    const versionDoc: Omit<FileVersion, 'id'> = {
      fileId,
      workspaceId,
      versionNumber: nextVersionNum,
      uploadedBy: uploaderId,
      uploadedByName: uploaderName,
      uploadedByRole: uploaderRole,
      uploadedAt: new Date().toISOString(),
      fileName,
      fileSize,
      mimeType,
      downloadUrl,
      notes: notes || `Version ${nextVersionNum} upload`
    };

    await addDoc(collection(db, versionsPath), versionDoc);

    await updateDoc(fileRef, {
      currentVersion: nextVersionNum,
      name: fileName,
      size: fileSize,
      url: downloadUrl || url,
      uploadedBy: uploaderId,
      uploadedByName: uploaderName,
      uploadedByRole: uploaderRole,
      updatedAt: new Date().toISOString()
    });

    await logActivity(
      workspaceId,
      uploaderName,
      uploaderRole,
      'Uploaded New File Version',
      `Uploaded version v${nextVersionNum} for "${fileName}"`
    );

    await createNotification(
      'workspace_all',
      workspaceId,
      'File Version Updated',
      `${uploaderName} uploaded version v${nextVersionNum} of "${fileName}".`,
      'file',
      'files'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, versionsPath);
  }
}

// ---------------- CLIENT FEEDBACK ----------------
export function subscribeClientFeedback(workspaceId: string | null, callback: (feedbacks: ClientFeedback[]) => void) {
  const path = 'feedback';
  const q = workspaceId
    ? query(collection(db, path), where('workspaceId', '==', workspaceId))
    : query(collection(db, path));

  return onSnapshot(q, (snapshot) => {
    const list: ClientFeedback[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClientFeedback));
    list.sort((a, b) => new Date(b.feedbackDate).getTime() - new Date(a.feedbackDate).getTime());
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function submitClientFeedback(
  workspaceId: string,
  projectId: string | undefined,
  deliverableId: string | undefined,
  rating: number,
  comment: string,
  clientName: string
): Promise<void> {
  const path = 'feedback';
  try {
    await addDoc(collection(db, path), {
      workspaceId,
      projectId: projectId || '',
      deliverableId: deliverableId || '',
      rating,
      comment,
      clientName,
      feedbackDate: new Date().toISOString()
    });

    await logActivity(
      workspaceId,
      clientName,
      'client',
      'Submitted Feedback',
      `Rated workspace experience ${rating}/5 stars: "${comment}"`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// ---------------- USER PRESENCE ----------------
export async function setUserPresence(userId: string, isOnline: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isOnline,
      lastSeen: new Date().toISOString()
    });
  } catch (e) {
    // ignore
  }
}
