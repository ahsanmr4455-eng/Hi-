import React, { useEffect, useState } from 'react';
import { ActivityLogView } from './components/admin/ActivityLogView';
import { ClientManagement } from './components/admin/ClientManagement';
import { SettingsView } from './components/admin/SettingsView';
import { TeamManagement } from './components/admin/TeamManagement';
import { ApprovalsView } from './components/approvals/ApprovalsView';
import { AdminLoginView } from './components/auth/AdminLoginView';
import { PortalLoginView } from './components/auth/PortalLoginView';
import { CalendarView } from './components/calendar/CalendarView';
import { ChatView } from './components/chat/ChatView';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ProjectsView } from './components/projects/ProjectsView';
import { SupportView } from './components/support/SupportView';
import { TasksView } from './components/tasks/TasksView';
import { WorkspaceView } from './components/workspace/WorkspaceView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { subscribeActivityLogs } from './services/workspaceService';
import { ActivityLog } from './types/workspace';

const MainAppContent: React.FC = () => {
  const { currentUser, isLoading, invalidTokenError, resolvedPortalLink } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOpenCreateClientModal, setIsOpenCreateClientModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeActivityLogs((logs) => setActivityLogs(logs));
    return () => unsub();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F2F2EF] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#D4D9C8] border-t-[#68734A] rounded-full animate-spin mx-auto"></div>
          <p className="text-[#626661] text-xs font-semibold tracking-wider uppercase">Loading ZT Workspace...</p>
        </div>
      </div>
    );
  }

  if (invalidTokenError) {
    return (
      <div className="min-h-screen bg-[#F2F2EF] flex items-center justify-center p-4">
        <div className="bg-white border border-[#DCDDD8] rounded-2xl shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-[#30332F]">Access Denied</h2>
          <p className="text-[#626661] text-xs leading-relaxed">{invalidTokenError}</p>
          <a
            href="/"
            className="inline-block w-full py-2.5 bg-[#68734A] hover:bg-[#58623E] text-white font-semibold text-xs rounded-xl transition-all shadow-xs"
          >
            Return to ZT Workspace Login
          </a>
        </div>
      </div>
    );
  }

  if (resolvedPortalLink && resolvedPortalLink.valid && !currentUser) {
    return (
      <PortalLoginView
        portalType={resolvedPortalLink.type || 'client'}
        workspace={resolvedPortalLink.workspace}
        targetUser={resolvedPortalLink.user}
        portalToken={resolvedPortalLink.token || ''}
      />
    );
  }

  if (!currentUser) {
    return <AdminLoginView />;
  }

  return (
    <div className="min-h-screen bg-[#F2F2EF] flex flex-col text-[#30332F] font-sans">
      <Navbar onNavigate={(tab) => setActiveTab(tab)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <OverviewDashboard
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenCreateClient={() => {
                setActiveTab('clients');
                setIsOpenCreateClientModal(true);
              }}
            />
          )}

          {activeTab === 'projects' && <ProjectsView />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'support' && <SupportView />}
          {activeTab === 'approvals' && <ApprovalsView />}
          {activeTab === 'calendar' && <CalendarView onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'files' && <WorkspaceView />}
          {activeTab === 'chat' && <ChatView />}
          {activeTab === 'activity' && <ActivityLogView />}

          {/* Admin Panels */}
          {currentUser.role === 'admin' && activeTab === 'clients' && (
            <ClientManagement
              isOpenCreateModal={isOpenCreateClientModal}
              onCloseCreateModal={() => setIsOpenCreateClientModal(false)}
            />
          )}
          {currentUser.role === 'admin' && activeTab === 'team' && <TeamManagement />}
          {currentUser.role === 'admin' && activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
