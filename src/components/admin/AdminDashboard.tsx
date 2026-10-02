import { Activity, ArrowRight, Check, Copy, Folder, HardDrive, Plus, ShieldAlert, Sparkles, UserCheck, Users } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ActivityLog, Workspace } from '../../types/workspace';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenCreateClient: () => void;
  activityLogs: ActivityLog[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onOpenCreateClient, activityLogs }) => {
  const { workspaces, allUsers, setActiveWorkspaceId } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const clients = allUsers.filter(u => u.role === 'client');
  const teamMembers = allUsers.filter(u => u.role === 'team');

  const handleCopyLink = (ws: Workspace) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const accessUrl = `${baseUrl}?portal_token=${ws.accessToken}`;
    navigator.clipboard.writeText(accessUrl);
    setCopiedId(ws.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#30332F] via-[#3A3E39] to-[#252824] text-white rounded-3xl p-6 md:p-8 shadow-md border border-[#454A43] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-[#68734A]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#68734A]/30 text-[#D4D9C8] border border-[#68734A]/40 text-[10px] font-bold tracking-wider uppercase mb-1">
            <Sparkles className="w-3 h-3 text-[#A8B28B]" />
            <span>Admin Operations Control</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Admin Overview</h1>
          <p className="text-[#C5C9BE] text-xs sm:text-sm max-w-xl leading-relaxed">
            Manage active client workspaces, isolated portal tokens, team permissions, and real-time security logs.
          </p>
        </div>
        <button
          onClick={onOpenCreateClient}
          className="px-5 py-3 bg-[#68734A] hover:bg-[#58623E] active:bg-[#485132] text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0 border border-[#838781]/30 relative z-10"
        >
          <Plus className="w-4 h-4" />
          <span>New Client Workspace</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#DCDDD8] shadow-2xs hover:shadow-xs transition-all flex items-center gap-4 group">
          <div className="w-12 h-12 bg-[#F0F2EC] text-[#68734A] rounded-2xl flex items-center justify-center font-bold border border-[#D4D9C8] group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#838781] uppercase tracking-wider">Total Clients</p>
            <h3 className="text-2xl font-extrabold text-[#30332F] mt-0.5">{clients.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DCDDD8] shadow-2xs hover:shadow-xs transition-all flex items-center gap-4 group">
          <div className="w-12 h-12 bg-[#F0F2EC] text-[#68734A] rounded-2xl flex items-center justify-center font-bold border border-[#D4D9C8] group-hover:scale-105 transition-transform">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#838781] uppercase tracking-wider">Team Members</p>
            <h3 className="text-2xl font-extrabold text-[#30332F] mt-0.5">{teamMembers.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DCDDD8] shadow-2xs hover:shadow-xs transition-all flex items-center gap-4 group">
          <div className="w-12 h-12 bg-[#F0F2EC] text-[#68734A] rounded-2xl flex items-center justify-center font-bold border border-[#D4D9C8] group-hover:scale-105 transition-transform">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#838781] uppercase tracking-wider">Active Workspaces</p>
            <h3 className="text-2xl font-extrabold text-[#30332F] mt-0.5">{workspaces.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DCDDD8] shadow-2xs hover:shadow-xs transition-all flex items-center gap-4 group">
          <div className="w-12 h-12 bg-[#F0F2EC] text-[#68734A] rounded-2xl flex items-center justify-center font-bold border border-[#D4D9C8] group-hover:scale-105 transition-transform">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#838781] uppercase tracking-wider">Storage Status</p>
            <h3 className="text-2xl font-extrabold text-[#30332F] mt-0.5">Protected</h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Workspaces & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspaces List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DCDDD8] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F2EC]">
            <div>
              <h2 className="text-base font-bold text-[#30332F]">Client Workspaces</h2>
              <p className="text-xs text-[#838781]">Isolated client portals and section configurations</p>
            </div>
            <button
              onClick={() => onNavigate('clients')}
              className="text-xs font-bold text-[#68734A] hover:text-[#58623E] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {workspaces.length === 0 ? (
            <div className="text-center py-12 bg-[#F8F8F6] rounded-2xl border border-dashed border-[#DCDDD8]">
              <Folder className="w-10 h-10 text-[#838781] mx-auto mb-2 opacity-60" />
              <h3 className="text-sm font-bold text-[#30332F]">No Workspaces Created Yet</h3>
              <p className="text-xs text-[#838781] mt-1 max-w-sm mx-auto">
                Create your first client workspace to start provisioning secure portal access links.
              </p>
              <button
                onClick={onOpenCreateClient}
                className="mt-4 px-4 py-2 bg-[#68734A] text-white text-xs font-bold rounded-xl hover:bg-[#58623E] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Workspace</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#F2F3EF]">
              {workspaces.slice(0, 5).map((ws) => (
                <div key={ws.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#68734A] shrink-0"></span>
                      <h4 className="text-sm font-bold text-[#30332F] truncate">{ws.title}</h4>
                    </div>
                    <p className="text-xs text-[#838781] mt-0.5 truncate pl-4">
                      Client: <span className="font-semibold text-[#30332F]">{ws.clientUsername}</span> • {ws.enabledSections?.length || 0} Active Sections
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyLink(ws)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border ${
                        copiedId === ws.id
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-[#F4F5F1] hover:bg-[#EAECE5] text-[#30332F] border-[#DCDEC8]'
                      }`}
                      title="Copy Access Token Link"
                    >
                      {copiedId === ws.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#68734A]" />
                          <span>Token Link</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setActiveWorkspaceId(ws.id);
                        onNavigate('files');
                      }}
                      className="px-3.5 py-1.5 bg-[#68734A] hover:bg-[#58623E] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Log Feed (1 col) */}
        <div className="bg-white rounded-2xl border border-[#DCDDD8] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F2EC]">
            <h2 className="text-base font-bold text-[#30332F]">Audit Log Activity</h2>
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs font-bold text-[#68734A] hover:text-[#58623E] cursor-pointer transition-colors"
            >
              Full Log
            </button>
          </div>

          {activityLogs.length === 0 ? (
            <div className="text-center py-8 text-[#838781] text-xs">
              No recent audit activity logged.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {activityLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="p-3 bg-[#F8F8F6] rounded-xl border border-[#E0E2DC] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[#838781]">
                    <span className="font-bold text-[#30332F]">{log.userName}</span>
                    <span className="text-[10px] text-[#838781] font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-bold text-[#68734A]">{log.action}</p>
                  <p className="text-[#626661] text-[11px] leading-relaxed">{log.details}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
