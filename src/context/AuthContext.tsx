import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getPortalTargetByToken,
  seedDefaultAdminIfNeeded,
  subscribeUsers,
  subscribeWorkspaces
} from '../services/workspaceService';
import { User, UserRole, Workspace } from '../types/workspace';

interface ResolvedPortal {
  valid: boolean;
  isRevoked?: boolean;
  type?: 'client' | 'team';
  workspace?: Workspace;
  user?: User;
  token?: string;
}

interface AuthContextType {
  currentUser: User | null;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  allUsers: User[];
  isLoading: boolean;
  invalidTokenError: string | null;
  resolvedPortalLink: ResolvedPortal | null;
  loginAdmin: (username: string, passwordHash: string) => Promise<{ success: boolean; error?: string }>;
  authenticatePortalWithPassword: (token: string, passwordInput: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invalidTokenError, setInvalidTokenError] = useState<string | null>(null);
  const [resolvedPortalLink, setResolvedPortalLink] = useState<ResolvedPortal | null>(null);

  useEffect(() => {
    let unsubscribeUsers: () => void;
    let unsubscribeWorkspaces: () => void;

    async function init() {
      try {
        await seedDefaultAdminIfNeeded();

        unsubscribeUsers = subscribeUsers((usersList) => {
          setAllUsers(usersList);
        });

        unsubscribeWorkspaces = subscribeWorkspaces((wsList) => {
          setWorkspaces(wsList);
        });

        // Check URL for portal access token
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('portal_token') || urlParams.get('token') || urlParams.get('access_token');

        if (token) {
          const resolved = await getPortalTargetByToken(token);
          if (resolved && resolved.valid) {
            setResolvedPortalLink({ ...resolved, token });

            // Check if user already authenticated for this token session
            const savedPortalSession = localStorage.getItem(`ztw_portal_session_${token}`);
            if (savedPortalSession) {
              try {
                const u = JSON.parse(savedPortalSession);
                setCurrentUser(u);
              } catch (e) {
                localStorage.removeItem(`ztw_portal_session_${token}`);
              }
            }
          } else {
            setInvalidTokenError("This portal access link is invalid, revoked, or has expired.");
          }
        } else {
          // Restore saved admin or portal session
          const savedUserStr = localStorage.getItem('ztw_user_session');
          if (savedUserStr) {
            try {
              const u = JSON.parse(savedUserStr);
              setCurrentUser(u);
            } catch (e) {
              localStorage.removeItem('ztw_user_session');
            }
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    init();

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeWorkspaces) unsubscribeWorkspaces();
    };
  }, []);

  // Sync active workspace when workspaces list or user changes
  useEffect(() => {
    if (!currentUser) {
      setActiveWorkspace(null);
      return;
    }

    if (currentUser.role === 'client') {
      const clientWs = workspaces.find(w => w.clientId === currentUser.id || currentUser.assignedWorkspaces?.includes(w.id));
      if (clientWs) {
        setActiveWorkspace(clientWs);
      }
    } else if (currentUser.role === 'team') {
      const teamWsList = workspaces.filter(w => currentUser.assignedWorkspaces?.includes(w.id));
      if (teamWsList.length > 0 && (!activeWorkspace || !teamWsList.find(w => w.id === activeWorkspace.id))) {
        setActiveWorkspace(teamWsList[0]);
      }
    } else if (currentUser.role === 'admin') {
      if (!activeWorkspace && workspaces.length > 0) {
        setActiveWorkspace(workspaces[0]);
      }
    }
  }, [currentUser, workspaces]);

  // Admin Login
  const loginAdmin = async (usernameInput: string, passwordInput: string) => {
    setInvalidTokenError(null);
    const cleanUsername = usernameInput.trim();

    // Required Admin credentials: Zyqro87 / digital97@-
    if (cleanUsername === 'Zyqro87' && passwordInput === 'digital97@-') {
      const adminUser: User = {
        id: 'admin_zyqro87',
        username: 'Zyqro87',
        name: 'Zyqro CRM Administrator',
        role: 'admin',
        status: 'active',
        assignedWorkspaces: [],
        createdAt: new Date().toISOString()
      };
      setCurrentUser(adminUser);
      localStorage.setItem('ztw_user_session', JSON.stringify(adminUser));
      return { success: true };
    }

    // Secondary Admin check in Firestore
    const foundAdmin = allUsers.find(
      u => u.username.toLowerCase() === cleanUsername.toLowerCase() &&
           u.role === 'admin' &&
           u.status === 'active'
    );

    if (foundAdmin) {
      const expectedPass = foundAdmin.portalPassword || foundAdmin.passwordHash;
      if (expectedPass && expectedPass !== passwordInput) {
        return { success: false, error: "Invalid credentials. Please try again." };
      }
      setCurrentUser(foundAdmin);
      localStorage.setItem('ztw_user_session', JSON.stringify(foundAdmin));
      return { success: true };
    }

    return { success: false, error: "Invalid credentials. Please try again." };
  };

  // Portal Authentication with Token & Password
  const authenticatePortalWithPassword = async (token: string, passwordInput: string) => {
    setIsLoading(true);
    setInvalidTokenError(null);
    try {
      const resolved = await getPortalTargetByToken(token);
      if (!resolved || !resolved.valid) {
        setInvalidTokenError("This portal access link is invalid, revoked, or has expired.");
        return { success: false, error: "Invalid or revoked portal link." };
      }

      if (resolved.type === 'client' && resolved.workspace) {
        const ws = resolved.workspace;
        const expectedPass = ws.portalPassword || 'client123';

        if (passwordInput !== expectedPass) {
          return { success: false, error: "Invalid portal password. Please try again." };
        }

        const portalUser: User = {
          id: ws.clientId || `client_${ws.id}`,
          username: ws.clientUsername || 'client_portal',
          name: ws.title,
          role: 'client',
          status: 'active',
          assignedWorkspaces: [ws.id],
          accessToken: token,
          createdAt: new Date().toISOString()
        };

        setActiveWorkspace(ws);
        setCurrentUser(portalUser);
        localStorage.setItem(`ztw_portal_session_${token}`, JSON.stringify(portalUser));
        return { success: true };
      }

      if (resolved.type === 'team' && resolved.user) {
        const u = resolved.user;
        const expectedPass = u.portalPassword || u.passwordHash || 'team123';

        if (passwordInput !== expectedPass) {
          return { success: false, error: "Invalid portal password. Please try again." };
        }

        setCurrentUser(u);
        localStorage.setItem(`ztw_portal_session_${token}`, JSON.stringify(u));
        return { success: true };
      }

      return { success: false, error: "Invalid portal credentials." };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveWorkspace(null);
    localStorage.removeItem('ztw_user_session');
    if (resolvedPortalLink?.token) {
      localStorage.removeItem(`ztw_portal_session_${resolvedPortalLink.token}`);
    }
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setResolvedPortalLink(null);
  };

  const setActiveWorkspaceId = (workspaceId: string | null) => {
    if (!workspaceId) {
      setActiveWorkspace(null);
      return;
    }
    const found = workspaces.find(w => w.id === workspaceId);
    if (found) {
      setActiveWorkspace(found);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeWorkspace,
        workspaces,
        allUsers,
        isLoading,
        invalidTokenError,
        resolvedPortalLink,
        loginAdmin,
        authenticatePortalWithPassword,
        logout,
        setActiveWorkspaceId
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
