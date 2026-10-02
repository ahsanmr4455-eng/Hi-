import { Check, ChevronDown, Copy, LogOut, Search, ShieldCheck, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { GlobalSearchModal } from '../search/GlobalSearchModal';

interface NavbarProps {
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { currentUser, activeWorkspace, workspaces, logout, setActiveWorkspaceId } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (!currentUser) return null;

  const handleCopyAccessLink = () => {
    if (!activeWorkspace) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const accessUrl = `${baseUrl}?portal_token=${activeWorkspace.accessToken}`;
    navigator.clipboard.writeText(accessUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <>
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-[#E0E2DC] sticky top-0 z-30 px-4 md:px-7 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        {/* Brand & Workspace Switcher */}
        <div className="flex items-center gap-3.5 sm:gap-5">
          <div className="flex items-center gap-2.5 group cursor-default">
            <div className="w-9 h-9 bg-gradient-to-br from-[#68734A] to-[#525C38] text-white rounded-xl flex items-center justify-center font-bold shadow-xs transition-transform group-hover:scale-105">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[#2C302B] tracking-tight text-base sm:text-lg leading-none">
                ZT Workspace
              </span>
              <span className="text-[10px] text-[#838781] font-medium tracking-wide leading-tight hidden sm:block">
                Secure Operations Portal
              </span>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-[#E0E2DC] hidden sm:block"></div>

          {/* Workspace Dropdown / Active Indicator */}
          {activeWorkspace && (
            <div className="relative">
              {currentUser.role === 'admin' && workspaces.length > 1 ? (
                <button
                  onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#F4F5F1] hover:bg-[#EAECFA] text-[#2C302B] rounded-xl text-xs font-semibold border border-[#DCDEC8] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-[#68734A] animate-pulse"></span>
                  <span className="truncate max-w-[140px] sm:max-w-[200px] md:max-w-[240px] font-bold">
                    {activeWorkspace.title}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#626661] transition-transform duration-200 ${wsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F0F2EC] text-[#55603A] rounded-xl text-xs font-bold border border-[#D4D9C8] shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#68734A]"></span>
                  <span className="truncate max-w-[160px] sm:max-w-[220px]">
                    {activeWorkspace.title}
                  </span>
                </div>
              )}

              {wsDropdownOpen && currentUser.role === 'admin' && (
                <div className="absolute left-0 mt-2 w-72 bg-white border border-[#E0E2DC] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-1.5 text-[10px] font-extrabold text-[#838781] uppercase tracking-wider flex items-center justify-between">
                    <span>Workspaces</span>
                    <span className="bg-[#F0F2EC] text-[#68734A] px-2 py-0.5 rounded-full text-[9px]">
                      {workspaces.length} Total
                    </span>
                  </div>
                  <div className="divide-y divide-[#F2F3EF] max-h-64 overflow-y-auto">
                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setActiveWorkspaceId(ws.id);
                          setWsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs font-medium flex items-center justify-between hover:bg-[#F8F8F6] transition-colors cursor-pointer ${
                          ws.id === activeWorkspace.id ? 'bg-[#F0F2EC]/80 text-[#55603A] font-bold' : 'text-[#30332F]'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate font-semibold">{ws.title}</span>
                          <span className="text-[10px] text-[#838781] truncate">Client: {ws.clientUsername || 'Standard'}</span>
                        </div>
                        {ws.id === activeWorkspace.id && (
                          <Check className="w-4 h-4 text-[#68734A] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 text-[#626661] hover:text-[#30332F] hover:bg-[#F0F2EC] rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title="Global Search"
          >
            <Search className="w-4 h-4 text-[#68734A]" />
            <span className="text-xs font-bold text-[#626661] hidden md:inline">Search...</span>
          </button>

          {/* Notification Bell */}
          <NotificationBell onNavigate={onNavigate} />

          {activeWorkspace && (currentUser.role === 'admin' || currentUser.role === 'team') && (
            <button
              onClick={handleCopyAccessLink}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs ${
                copiedLink
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-[#F4F5F1] hover:bg-[#EAECE5] border-[#DCDEC8] text-[#485132]'
              }`}
              title="Copy Secure Workspace Access Link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#68734A]" />
                  <span>Access Link</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-[#E0E2DC]">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E6E9DF] to-[#D5D9CC] text-[#30332F] flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-2xs">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
            </div>

            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-[#2C302B] leading-tight">{currentUser.name}</span>
              <span className="text-[9px] text-[#68734A] uppercase font-extrabold tracking-wider leading-tight bg-[#F0F2EC] px-1.5 py-0.2 rounded w-fit mt-0.5">
                {currentUser.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-[#838781] hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer ml-0.5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
};
