import { Activity, Folder, FolderKanban, Globe, LayoutDashboard, MessageSquare, Palette, Settings, UserCheck, Users, Video } from 'lucide-react';
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
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'clients', label: 'Clients & Workspaces', icon: Users },
        { id: 'team', label: 'Team Members', icon: UserCheck },
        { id: 'files', label: 'Files & Storage', icon: Folder },
        { id: 'chat', label: 'Chat & Messaging', icon: MessageSquare },
        { id: 'activity', label: 'Activity Audit Log', icon: Activity },
        { id: 'settings', label: 'System Settings', icon: Settings },
      ];
    }

    if (currentUser.role === 'team') {
      return [
        { id: 'workspace', label: 'Assigned Workspace', icon: Folder },
        { id: 'chat', label: 'Chat & Communication', icon: MessageSquare },
        { id: 'activity', label: 'Activity Log', icon: Activity },
      ];
    }

    // CLIENT ROLE
    if (currentUser.role === 'client' && activeWorkspace) {
      const items: { id: string; label: string; icon: any }[] = [];
      const enabled = activeWorkspace.enabledSections || [];

      if (enabled.includes('overview')) items.push({ id: 'overview', label: 'Overview', icon: LayoutDashboard });
      if (enabled.includes('projects')) items.push({ id: 'projects', label: 'Projects', icon: FolderKanban });

      if (enabled.includes('files_docs') || items.length === 0) {
        items.push({ id: 'files', label: 'Files & Documents', icon: Folder });
      }

      if (enabled.includes('chat_comm')) {
        items.push({ id: 'chat', label: 'Chat & Team', icon: MessageSquare });
      }

      if (enabled.some(s => s.startsWith('website') || s.startsWith('ecommerce'))) {
        items.push({ id: 'website_section', label: 'Website & Hosting', icon: Globe });
      }
      if (enabled.some(s => s.startsWith('graphic') || s.startsWith('logo') || s.startsWith('brand'))) {
        items.push({ id: 'design_section', label: 'Brand & Graphic Assets', icon: Palette });
      }
      if (enabled.some(s => s.startsWith('video') || s.startsWith('raw') || s.startsWith('thumbnail'))) {
        items.push({ id: 'video_section', label: 'Video Projects', icon: Video });
      }

      return items;
    }

    return [
      { id: 'files', label: 'Files', icon: Folder },
      { id: 'chat', label: 'Chat', icon: MessageSquare },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-md border-r border-[#E0E2DC] flex flex-col justify-between shrink-0 hidden md:flex shadow-[1px_0_3px_rgba(0,0,0,0.02)] select-none">
      <div className="p-4 space-y-2">
        <div className="px-3 py-1.5 bg-[#F4F5F1] rounded-xl border border-[#DCDEC8] flex items-center justify-between mb-3 shadow-2xs">
          <span className="text-[10px] font-extrabold text-[#55603A] uppercase tracking-wider">
            {currentUser.role === 'admin' ? 'Admin Panel' : currentUser.role === 'team' ? 'Team Portal' : 'Client Portal'}
          </span>
          <span className="w-2 h-2 rounded-full bg-[#68734A] animate-pulse"></span>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#F0F2EC] text-[#4A5333] border border-[#D4D9C8] font-extrabold shadow-2xs'
                    : 'text-[#424641] hover:text-[#2C302B] hover:bg-[#F6F7F3]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#68734A]' : 'text-[#727670]'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#68734A]"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[#E0E2DC]">
        <div className="p-3 bg-[#F8F8F6] rounded-2xl border border-[#E0E2DC] space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-[#2C302B]">ZT Workspace</p>
            <span className="text-[9px] font-bold text-[#68734A] bg-[#F0F2EC] px-1.5 py-0.2 rounded border border-[#D4D9C8]">Live</span>
          </div>
          <p className="text-[10px] text-[#838781]">v2.4 Operations Portal</p>
        </div>
      </div>
    </aside>
  );
};
