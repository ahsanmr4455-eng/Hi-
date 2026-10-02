import {
  Activity,
  Calendar,
  CheckSquare,
  FileCheck,
  Folder,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Settings,
  UserCheck,
  Users
} from 'lucide-react';
import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, activeWorkspace } = useAuth();

  if (!currentUser) return null;

  const getNavItems = () => {
    if (currentUser.role === 'admin') {
      return [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'projects', label: 'Projects & Timelines', icon: FolderKanban },
        { id: 'tasks', label: 'Tasks', icon: ListTodo },
        { id: 'approvals', label: 'Deliverables & Review', icon: FileCheck },
        { id: 'support', label: 'Support Tickets', icon: HelpCircle },
        { id: 'calendar', label: 'Calendar & Schedule', icon: Calendar },
        { id: 'files', label: 'Files & Versioning', icon: Folder },
        { id: 'chat', label: 'Chat & Messaging', icon: MessageSquare },
        { id: 'clients', label: 'Clients & Workspaces', icon: Users },
        { id: 'team', label: 'Team Members', icon: UserCheck },
        { id: 'activity', label: 'Activity Audit Log', icon: Activity },
        { id: 'settings', label: 'System Settings', icon: Settings }
      ];
    }

    if (currentUser.role === 'team') {
      return [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'projects', label: 'Assigned Projects', icon: FolderKanban },
        { id: 'tasks', label: 'My Tasks', icon: ListTodo },
        { id: 'approvals', label: 'Deliverable Review', icon: FileCheck },
        { id: 'support', label: 'Client Support Tickets', icon: HelpCircle },
        { id: 'calendar', label: 'Calendar Schedule', icon: Calendar },
        { id: 'files', label: 'Files & Storage', icon: Folder },
        { id: 'chat', label: 'Chat & Communication', icon: MessageSquare },
        { id: 'activity', label: 'Activity Log', icon: Activity }
      ];
    }

    // CLIENT ROLE
    return [
      { id: 'dashboard', label: 'Overview & Home', icon: LayoutDashboard },
      { id: 'projects', label: 'Projects & Milestones', icon: FolderKanban },
      { id: 'approvals', label: 'Deliverables & Review', icon: FileCheck },
      { id: 'support', label: 'Support & Requests', icon: HelpCircle },
      { id: 'tasks', label: 'Project Tasks', icon: ListTodo },
      { id: 'calendar', label: 'Schedule Calendar', icon: Calendar },
      { id: 'files', label: 'Files & Documents', icon: Folder },
      { id: 'chat', label: 'Chat & Team', icon: MessageSquare }
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white border-r border-[#DCDDD8] flex flex-col justify-between shrink-0 hidden md:flex">
      <div className="p-3.5 space-y-1 overflow-y-auto max-h-[calc(100vh-120px)]">
        <div className="px-3 py-1.5 text-[10px] font-extrabold text-[#838781] uppercase tracking-wider">
          {currentUser.role === 'admin' ? 'Admin Navigation' : currentUser.role === 'team' ? 'Team Member Portal' : 'Client Workspace'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#F0F2EC] text-[#68734A] border border-[#D4D9C8] font-bold shadow-2xs'
                  : 'text-[#30332F] hover:text-[#30332F] hover:bg-[#F8F8F6]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#68734A]' : 'text-[#626661]'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3.5 border-t border-[#DCDDD8]">
        <div className="p-2.5 bg-[#F8F8F6] rounded-xl border border-[#DCDDD8] text-left">
          <p className="text-[11px] font-bold text-[#30332F] truncate">ZT Workspace Portal</p>
          <p className="text-[10px] text-[#838781] font-medium truncate mt-0.5">Role: {currentUser.role.toUpperCase()}</p>
        </div>
      </div>
    </aside>
  );
};
