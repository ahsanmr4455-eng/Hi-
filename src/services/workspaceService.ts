import {
  addDoc,
  arrayUnion,
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
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { generateFoldersForWorkspace } from '../constants/sections';
import { db, handleFirestoreError, OperationType, storage } from '../firebase/config';
import { ActivityLog, Conversation, Folder, Message, MessageAttachment, User, UserRole, Workspace, WorkspaceFile } from '../types/workspace';

// Helper for generating secure access tokens
export function generateSecureToken(prefix = 'ztw_live_'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = prefix;
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ---------------- ADMIN SEEDING & USER MANAGEMENT ----------------
export async function seedDefaultAdminIfNeeded(): Promise<User> {
  const path = 'users';
  try {
    const q = query(collection(db, path), where('role', '==', 'admin'));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docData = snap.docs[0].data();
      return { id: snap.docs[0].id, ...docData } as User;
    }

    // Create default Admin account
    const defaultAdmin: Omit<User, 'id'> = {
      username: 'admin',
      passwordHash: 'admin123',
      portalPassword: 'admin123',
      name: 'System Administrator',
      role: 'admin',
      email: 'admin@ztworkspace.com',
      status: 'active',
      assignedWorkspaces: [],
      accessToken: generateSecureToken('admin_live_'),
      tokenStatus: 'active',
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, path), defaultAdmin);
    return { id: docRef.id, ...defaultAdmin };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeUsers(callback: (users: User[]) => void) {
  const path = 'users';
  const q = query(collection(db, path));
  return onSnapshot(q, (snapshot) => {
    const list: User[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'accessToken'>): Promise<User> {
  const path = 'users';
  try {
    const token = generateSecureToken(userData.role === 'team' ? 'ztw_team_' : 'ztw_client_');
    const newUser: Omit<User, 'id'> = {
      ...userData,
      accessToken: token,
      portalToken: token,
      tokenStatus: 'active',
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, path), newUser);
    return { id: docRef.id, ...newUser };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateUserCredentials(userId: string, newUsername: string, newPassword: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, 'users', userId), {
      username: newUsername.trim(),
      passwordHash: newPassword.trim(),
      portalPassword: newPassword.trim(),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ---------------- WORKSPACE & PORTAL LINK RESOLUTION ----------------
export function subscribeWorkspaces(callback: (workspaces: Workspace[]) => void) {
  const path = 'workspaces';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Workspace[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workspace));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function createWorkspaceWithStructure(
  title: string,
  clientId: string,
  clientUsername: string,
  portalPassword: string,
  enabledSections: string[],
  enabledFolderCategories: string[],
  creatorName: string,
  creatorRole: UserRole
): Promise<Workspace> {
  const path = 'workspaces';
  try {
    const token = generateSecureToken('ztw_client_');
    const newWs: Omit<Workspace, 'id'> = {
      title,
      clientId,
      clientUsername,
      portalPassword,
      enabledSections,
      enabledFolderCategories,
      accessToken: token,
      tokenStatus: 'active',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, path), newWs);
    const workspaceId = docRef.id;

    // Automatically generate folders
    const autoFolders = generateFoldersForWorkspace(enabledSections, enabledFolderCategories);
    for (const folderName of autoFolders) {
      await addDoc(collection(db, 'workspaceFolders'), {
        workspaceId,
        parentFolderId: null,
        name: folderName,
        createdAt: new Date().toISOString(),
        createdBy: 'System Auto-Generator'
      });
    }

    // Auto-create initial conversation thread in Firestore
    await addDoc(collection(db, 'conversations'), {
      workspaceId,
      participantIds: [clientId],
      lastMessage: 'Workspace initialized. Start messaging.',
      lastMessageAt: new Date().toISOString(),
      unreadCounts: {},
      typingStatus: {}
    });

    await logActivity(
      workspaceId,
      creatorName,
      creatorRole,
      'Created Client Workspace',
      `Created workspace "${title}" with password protection.`
    );

    return { id: workspaceId, ...newWs };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateWorkspace(workspaceId: string, data: Partial<Workspace>): Promise<void> {
  const path = `workspaces/${workspaceId}`;
  try {
    await updateDoc(doc(db, 'workspaces', workspaceId), {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateWorkspaceCredentials(workspaceId: string, newUsername: string, newPassword: string): Promise<void> {
  const path = `workspaces/${workspaceId}`;
  try {
    await updateDoc(doc(db, 'workspaces', workspaceId), {
      clientUsername: newUsername.trim(),
      portalPassword: newPassword.trim(),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const path = `workspaces/${workspaceId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', workspaceId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function revokePortalToken(workspaceId: string, userId?: string): Promise<void> {
  try {
    if (workspaceId) {
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        tokenStatus: 'revoked',
        updatedAt: new Date().toISOString()
      });
    }
    if (userId) {
      await updateDoc(doc(db, 'users', userId), {
        tokenStatus: 'revoked',
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Revoke token error:", err);
  }
}

export async function regeneratePortalToken(workspaceId: string, userId?: string, isTeam = false): Promise<string> {
  const newToken = generateSecureToken(isTeam ? 'ztw_team_' : 'ztw_client_');
  try {
    if (workspaceId) {
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        accessToken: newToken,
        tokenStatus: 'active',
        updatedAt: new Date().toISOString()
      });
    }
    if (userId) {
      await updateDoc(doc(db, 'users', userId), {
        accessToken: newToken,
        portalToken: newToken,
        tokenStatus: 'active',
        updatedAt: new Date().toISOString()
      });
    }
    return newToken;
  } catch (err) {
    console.error("Regenerate token error:", err);
    return newToken;
  }
}

// Lookup portal by token
export async function getPortalTargetByToken(token: string): Promise<{
  valid: boolean;
  isRevoked?: boolean;
  type?: 'client' | 'team';
  workspace?: Workspace;
  user?: User;
} | null> {
  try {
    // 1. Check workspaces collection
    const wsQuery = query(collection(db, 'workspaces'), where('accessToken', '==', token));
    const wsSnap = await getDocs(wsQuery);

    if (!wsSnap.empty) {
      const ws = { id: wsSnap.docs[0].id, ...wsSnap.docs[0].data() } as Workspace;
      if (ws.tokenStatus === 'revoked' || ws.status === 'disabled') {
        return { valid: false, isRevoked: true };
      }
      return { valid: true, type: 'client', workspace: ws };
    }

    // 2. Check users collection
    const uQuery = query(collection(db, 'users'), where('accessToken', '==', token));
    const uSnap = await getDocs(uQuery);

    if (!uSnap.empty) {
      const u = { id: uSnap.docs[0].id, ...uSnap.docs[0].data() } as User;
      if (u.tokenStatus === 'revoked' || u.status === 'disabled' || u.role === 'admin') {
        return { valid: false, isRevoked: true };
      }
      return { valid: true, type: u.role as 'client' | 'team', user: u };
    }

    return null;
  } catch (err) {
    console.error("Error resolving portal token:", err);
    return null;
  }
}

// ---------------- FOLDER MANAGEMENT ----------------
export function subscribeWorkspaceFolders(workspaceId: string, callback: (folders: Folder[]) => void) {
  const path = 'workspaceFolders';
  const q = query(collection(db, path), where('workspaceId', '==', workspaceId));
  return onSnapshot(q, (snapshot) => {
    const list: Folder[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function createFolder(
  workspaceId: string,
  name: string,
  parentFolderId: string | null = null,
  userName: string,
  userRole: UserRole
): Promise<Folder> {
  const path = 'workspaceFolders';
  try {
    const newFolder: Omit<Folder, 'id'> = {
      workspaceId,
      parentFolderId,
      name,
      createdAt: new Date().toISOString(),
      createdBy: userName
    };

    const docRef = await addDoc(collection(db, path), newFolder);

    await logActivity(
      workspaceId,
      userName,
      userRole,
      'Created Folder',
      `Created folder "${name}"`
    );

    return { id: docRef.id, ...newFolder };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function renameFolder(folderId: string, workspaceId: string, newName: string, userName: string, userRole: UserRole): Promise<void> {
  const path = `workspaceFolders/${folderId}`;
  try {
    await updateDoc(doc(db, 'workspaceFolders', folderId), { name: newName });
    await logActivity(workspaceId, userName, userRole, 'Renamed Folder', `Renamed folder to "${newName}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteFolder(folderId: string, workspaceId: string, folderName: string, userName: string, userRole: UserRole): Promise<void> {
  const path = `workspaceFolders/${folderId}`;
  try {
    await deleteDoc(doc(db, 'workspaceFolders', folderId));
    await logActivity(workspaceId, userName, userRole, 'Deleted Folder', `Deleted folder "${folderName}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ---------------- FILE MANAGEMENT ----------------
export function subscribeWorkspaceFiles(workspaceId: string, callback: (files: WorkspaceFile[]) => void) {
  const path = 'files';
  const q = query(collection(db, path), where('workspaceId', '==', workspaceId));
  return onSnapshot(q, (snapshot) => {
    const list: WorkspaceFile[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkspaceFile));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function addWorkspaceFile(
  workspaceId: string,
  folderId: string | null,
  name: string,
  size: number,
  mimeType: string,
  fileData: string,
  uploadedBy: string,
  uploadedByName: string,
  uploadedByRole: UserRole
): Promise<WorkspaceFile> {
  const path = 'files';
  try {
    const newFile: Omit<WorkspaceFile, 'id'> = {
      workspaceId,
      folderId,
      name,
      size,
      mimeType,
      fileData,
      uploadedBy,
      uploadedByName,
      uploadedByRole,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, path), newFile);

    await logActivity(
      workspaceId,
      uploadedByName,
      uploadedByRole,
      'Uploaded File',
      `Uploaded file "${name}" (${(size / (1024 * 1024)).toFixed(2)} MB)`
    );

    return { id: docRef.id, ...newFile };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function renameWorkspaceFile(fileId: string, workspaceId: string, newName: string, userName: string, userRole: UserRole): Promise<void> {
  const path = `files/${fileId}`;
  try {
    await updateDoc(doc(db, 'files', fileId), { name: newName, updatedAt: new Date().toISOString() });
    await logActivity(workspaceId, userName, userRole, 'Renamed File', `Renamed file to "${newName}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteWorkspaceFile(fileId: string, workspaceId: string, fileName: string, userName: string, userRole: UserRole): Promise<void> {
  const path = `files/${fileId}`;
  try {
    await deleteDoc(doc(db, 'files', fileId));
    await logActivity(workspaceId, userName, userRole, 'Deleted File', `Deleted file "${fileName}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ---------------- CHAT & REALTIME MESSAGING ----------------
export async function ensureWorkspaceConversation(workspaceId: string, currentUserId?: string): Promise<Conversation> {
  const path = 'conversations';
  try {
    const q = query(collection(db, path), where('workspaceId', '==', workspaceId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const existingConv = { id: snap.docs[0].id, ...snap.docs[0].data() } as Conversation;
      if (currentUserId && (!existingConv.participantIds || !existingConv.participantIds.includes(currentUserId))) {
        const updatedParticipants = [...(existingConv.participantIds || []), currentUserId];
        await updateDoc(doc(db, 'conversations', existingConv.id), {
          participantIds: updatedParticipants
        });
        existingConv.participantIds = updatedParticipants;
      }
      return existingConv;
    }

    const newConv: Omit<Conversation, 'id'> = {
      workspaceId,
      participantIds: currentUserId ? [currentUserId] : [],
      lastMessage: 'Workspace chat initialized.',
      lastMessageAt: new Date().toISOString(),
      unreadCounts: {},
      typingStatus: {}
    };

    const docRef = await addDoc(collection(db, path), newConv);
    return { id: docRef.id, ...newConv };
  } catch (err) {
    console.error("Error ensuring workspace conversation:", err);
    throw err;
  }
}

export function subscribeConversations(workspaceId: string, currentUserId: string | undefined, callback: (conversations: Conversation[]) => void) {
  const path = 'conversations';
  const q = query(collection(db, path), where('workspaceId', '==', workspaceId));
  return onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      try {
        const conv = await ensureWorkspaceConversation(workspaceId, currentUserId);
        callback([conv]);
      } catch (e) {
        callback([]);
      }
      return;
    }
    const list: Conversation[] = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Conversation));
    list.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export function subscribeMessages(conversationId: string, currentUserId: string, callback: (messages: Message[]) => void) {
  const subCollectionPath = `conversations/${conversationId}/messages`;
  const subQuery = query(collection(db, subCollectionPath));

  return onSnapshot(subQuery, (subSnapshot) => {
    const list: Message[] = subSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      let calculatedStatus: Message['status'] = 'sent';

      if (data.readAt || (data.readBy && data.readBy.some((uid: string) => uid !== data.senderId))) {
        calculatedStatus = 'read';
      } else if (data.deliveredAt) {
        calculatedStatus = 'delivered';
      } else {
        calculatedStatus = 'sent';
      }

      return {
        id: docSnap.id,
        ...data,
        type: data.type || (data.attachments && data.attachments.length > 0 ? 'file' : 'text'),
        status: calculatedStatus
      } as Message;
    });

    // Auto-mark delivery for incoming messages if recipient's session receives it
    subSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.senderId !== currentUserId && !data.deliveredAt) {
        const nowIso = new Date().toISOString();
        updateDoc(doc(db, subCollectionPath, docSnap.id), {
          deliveredAt: nowIso,
          status: 'delivered'
        }).catch(err => console.warn("Auto-delivery mark error:", err));

        // Sync top-level if present
        updateDoc(doc(db, 'messages', docSnap.id), {
          deliveredAt: nowIso,
          status: 'delivered'
        }).catch(() => {});
      }
    });

    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, subCollectionPath);
  });
}

function sanitizeFirestorePayload(data: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      clean[key] = null;
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export async function sendMessage(
  conversationId: string,
  workspaceId: string,
  senderId: string,
  senderName: string,
  senderRole: UserRole,
  text: string,
  attachments: any[] = [],
  replyToId: string | null = null,
  replyToText?: string | null,
  clientTempId?: string
): Promise<Message> {
  const subCollectionPath = `conversations/${conversationId}/messages`;
  const nowIso = new Date().toISOString();

  const messageType = (attachments && attachments.length > 0) ? 'file' : 'text';

  const msgPayload = sanitizeFirestorePayload({
    conversationId: conversationId || '',
    workspaceId: workspaceId || '',
    senderId: senderId || '',
    senderName: senderName || 'User',
    senderRole: senderRole || 'client',
    type: messageType,
    text: text || '',
    attachments: attachments || [],
    replyToId: replyToId || null,
    replyToText: replyToText || null,
    clientTempId: clientTempId || ('temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    readBy: [senderId],
    createdAt: nowIso,
    deliveredAt: null,
    readAt: null,
    status: 'sent'
  });

  console.log('[CHAT DEBUG] Sending message to Firestore:', msgPayload);

  try {
    // 1. Write message to subcollection conversations/{conversationId}/messages
    const docRef = await addDoc(collection(db, 'conversations', conversationId, 'messages'), msgPayload);

    // 2. Mirror to top-level messages collection for fallback
    try {
      await setDoc(doc(db, 'messages', docRef.id), { ...msgPayload, id: docRef.id });
    } catch (e) {
      console.warn("[CHAT DEBUG] Mirror top-level message warn:", e);
    }

    // 3. Update conversation document's lastMessage, lastMessageAt & unread counts
    try {
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);
      if (convSnap.exists()) {
        const convData = convSnap.data();
        const unreadCounts = { ...(convData.unreadCounts || {}) };
        const participantIds: string[] = convData.participantIds || [];

        participantIds.forEach(pId => {
          if (pId !== senderId) {
            unreadCounts[pId] = (unreadCounts[pId] || 0) + 1;
          }
        });

        await updateDoc(convRef, {
          lastMessage: text || (attachments.length ? `📎 ${attachments[0]?.name || 'Attachment'}` : 'Message'),
          lastMessageAt: nowIso,
          unreadCounts,
          [`typingStatus.${senderId}`]: false
        });
      }
    } catch (e) {
      console.warn("[CHAT DEBUG] Could not update conversation metadata:", e);
    }

    return { id: docRef.id, ...msgPayload, status: 'sent' as const } as Message;
  } catch (err) {
    console.error("[CHAT DEBUG] Firebase sendMessage error:", err);
    throw err;
  }
}

export async function setTypingStatus(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'conversations', conversationId), {
      [`typingStatus.${userId}`]: isTyping
    });
  } catch (err) {
    // Non-critical background status update
  }
}

export async function markConversationRead(conversationId: string, currentUserId: string): Promise<void> {
  try {
    // 1. Clear unread count for current user
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      [`unreadCounts.${currentUserId}`]: 0
    });

    // 2. Mark unread messages in subcollection as read
    const subCollectionPath = `conversations/${conversationId}/messages`;
    const qSub = query(collection(db, subCollectionPath));
    const subSnap = await getDocs(qSub);

    const nowIso = new Date().toISOString();
    for (const msgDoc of subSnap.docs) {
      const data = msgDoc.data();
      if (data.senderId !== currentUserId && !data.readAt) {
        await updateDoc(doc(db, subCollectionPath, msgDoc.id), {
          readAt: nowIso,
          readBy: arrayUnion(currentUserId),
          status: 'read'
        });
        try {
          await updateDoc(doc(db, 'messages', msgDoc.id), {
            readAt: nowIso,
            readBy: arrayUnion(currentUserId),
            status: 'read'
          });
        } catch (e) { /* ignore */ }
      }
    }
  } catch (err) {
    console.warn("markConversationRead error:", err);
  }
}

export async function markMessageRead(conversationId: string, messageId: string, currentUserId: string): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    const subRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(subRef, {
      readAt: nowIso,
      readBy: arrayUnion(currentUserId),
      status: 'read'
    });
    try {
      const topRef = doc(db, 'messages', messageId);
      await updateDoc(topRef, {
        readAt: nowIso,
        readBy: arrayUnion(currentUserId),
        status: 'read'
      });
    } catch (e) { /* ignore */ }
  } catch (err) {
    console.warn("markMessageRead error:", err);
  }
}

export async function uploadChatAttachment(
  workspaceId: string,
  conversationId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<MessageAttachment> {
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `chat_attachments/${workspaceId}/${conversationId}/${Date.now()}_${safeFileName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(progress);
        }
      },
      (error) => {
        console.error("Firebase Storage Upload Error:", error);
        if (file.size < 600000) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve({
              name: file.name,
              size: file.size,
              mimeType: file.type || 'application/octet-stream',
              downloadUrl: dataUrl,
              url: dataUrl,
              fileData: dataUrl
            });
          };
          reader.onerror = () => reject(error);
          reader.readAsDataURL(file);
        } else {
          reject(error);
        }
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (!downloadUrl) {
            throw new Error("Firebase Storage returned an invalid or empty download URL.");
          }
          resolve({
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            downloadUrl,
            url: downloadUrl,
            storagePath
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

export async function softDeleteMessage(
  conversationId: string,
  messageId: string,
  deletedByUserId: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const subRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const deletePayload = {
    isDeleted: true,
    deletedAt: nowIso,
    deletedBy: deletedByUserId,
    text: '',
    attachments: []
  };

  try {
    await updateDoc(subRef, deletePayload);
    try {
      const topRef = doc(db, 'messages', messageId);
      await updateDoc(topRef, deletePayload);
    } catch (e) { /* ignore */ }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'conversations', conversationId, 'messages', messageId));
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (e) { /* ignore */ }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

// ---------------- AUDIT ACTIVITY LOGS ----------------
export async function logActivity(
  workspaceId: string | null,
  userName: string,
  userRole: UserRole,
  action: string,
  details: string
): Promise<void> {
  const path = 'activityLogs';
  try {
    await addDoc(collection(db, path), {
      workspaceId: workspaceId || null,
      userId: userName,
      userName,
      userRole,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Activity log error:", err);
  }
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void) {
  const path = 'activityLogs';
  const q = query(collection(db, path), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: ActivityLog[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}
