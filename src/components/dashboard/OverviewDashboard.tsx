import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  HelpCircle,
  ListTodo,
  MessageSquare,
  Plus,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeApprovals,
  subscribeProjects,
  subscribeSupportRequests,
  subscribeTasks
} from '../../services/portalService';
import {
  subscribeActivityLogs,
  subscribeWorkspaceFiles
} from '../../services/workspaceService';
import {
  DeliverableApproval,
  Project,
  SupportRequest,
  Task
} from '../../types/portal';
import { ActivityLog, WorkspaceFile } from '../../types/workspace';

interface OverviewDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenCreateClient?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onNavigate, onOpenCreateClient }) => {
  const { currentUser, activeWorkspace, workspaces, allUsers } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [approvals, setApprovals] = useState<DeliverableApproval[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const wsId = activeWorkspace?.id || null;

    const unsubProjects = subscribeProjects(wsId, currentUser.role, currentUser.id, setProjects);
    const unsubTasks = subscribeTasks(wsId, currentUser.role, currentUser.id, setTasks);
    const unsubSupport = subscribeSupportRequests(wsId, currentUser.role, currentUser.id, setSupportRequests);
    const unsubApprovals = subscribeApprovals(wsId, setApprovals);
    const unsubLogs = subscribeActivityLogs(setLogs);

    let unsubFiles = () => {};
    if (wsId) {
      unsubFiles = subscribeWorkspaceFiles(wsId, setFiles);
    }

    return () => {
      unsubProjects();
      unsubTasks();
      unsubSupport();
      unsubApprovals();
      unsubLogs();
      unsubFiles();
    };
  }, [currentUser, activeWorkspace]);

  if (!currentUser) return null;

  const activeProjects = projects.filter(p => p.status !== 'Completed' && !p.isArchived);
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const openTickets = supportRequests.filter(r => r.status === 'Open' || r.status === 'In Progress' || r.status === 'Waiting for Client');
  const pendingApprovals = approvals.filter(a => a.status === 'Pending Review');

  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
    : 0;

  // Upcoming Deadlines (within next 14 days)
  const upcomingDeadlines = [
    ...projects.map(p => ({ title: p.title, date: p.dueDate, type: 'Project Due', link: 'projects' })),
    ...tasks.map(t => ({ title: t.title, date: t.dueDate, type: 'Task Due', link: 'tasks' }))
  ].filter(d => d.date && new Date(d.date).getTime() >= Date.now() - 86400000)
   .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
   .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-[#68734A] to-[#525C38] text-white rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white/90">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>ZT Workspace Portal</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-xs text-white/80 max-w-xl">
            {currentUser.role === 'admin'
              ? 'Real-time overview of active client workspaces, deliverables, tasks, and system activity.'
              : currentUser.role === 'team'
              ? 'Track your assigned workspace projects, task deliverables, and team communications.'
              : 'Monitor project progress, review deliverables, request support, and access your files.'}
          </p>
        </div>

        {currentUser.role === 'admin' ? (
          <div className="flex items-center gap-2 z-10 shrink-0">
            <button
              onClick={() => onNavigate('projects')}
              className="px-3.5 py-2 bg-white text-[#485132] hover:bg-[#F0F2EC] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
            <button
              onClick={onOpenCreateClient}
              className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              <span>Add Workspace</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 z-10 shrink-0">
            <button
              onClick={() => onNavigate('support')}
              className="px-3.5 py-2 bg-white text-[#485132] hover:bg-[#F0F2EC] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4 text-[#68734A]" />
              <span>Create Request</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('projects')}
          className="p-4 bg-white rounded-2xl border border-[#DCDDD8] shadow-2xs hover:border-[#68734A] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#838781]">
            <span className="text-xs font-bold text-[#626661] uppercase tracking-wider">Active Projects</span>
            <div className="p-2 rounded-xl bg-[#F0F2EC] text-[#68734A] group-hover:bg-[#68734A] group-hover:text-white transition-colors">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#30332F]">{activeProjects.length}</span>
            <span className="text-[11px] font-bold text-[#68734A]">{avgProgress}% avg completion</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('tasks')}
          className="p-4 bg-white rounded-2xl border border-[#DCDDD8] shadow-2xs hover:border-[#68734A] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#838781]">
            <span className="text-xs font-bold text-[#626661] uppercase tracking-wider">Pending Tasks</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <ListTodo className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#30332F]">{pendingTasks.length}</span>
            <span className="text-[11px] text-[#626661] font-semibold">{tasks.filter(t => t.status === 'Completed').length} completed</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('approvals')}
          className="p-4 bg-white rounded-2xl border border-[#DCDDD8] shadow-2xs hover:border-[#68734A] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#838781]">
            <span className="text-xs font-bold text-[#626661] uppercase tracking-wider">Pending Approvals</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#30332F]">{pendingApprovals.length}</span>
            <span className="text-[11px] text-blue-600 font-bold">Review required</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('support')}
          className="p-4 bg-white rounded-2xl border border-[#DCDDD8] shadow-2xs hover:border-[#68734A] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#838781]">
            <span className="text-xs font-bold text-[#626661] uppercase tracking-wider">Support Requests</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#30332F]">{openTickets.length}</span>
            <span className="text-[11px] text-purple-700 font-bold">Open tickets</span>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Projects & Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Projects List */}
          <div className="bg-white rounded-2xl border border-[#DCDDD8] shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#68734A]" />
                <h3 className="text-xs font-bold text-[#30332F] uppercase tracking-wider">
                  Active Projects
                </h3>
              </div>
              <button
                onClick={() => onNavigate('projects')}
                className="text-xs font-bold text-[#68734A] hover:underline cursor-pointer"
              >
                View All ({projects.length})
              </button>
            </div>

            {activeProjects.length === 0 ? (
              <div className="text-center py-8 text-[#838781] text-xs">
                No active projects found.
              </div>
            ) : (
              <div className="space-y-3">
                {activeProjects.slice(0, 4).map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => onNavigate('projects')}
                    className="p-3.5 bg-[#F8F8F6] hover:bg-[#F0F2EC] rounded-xl border border-[#DCDDD8] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#30332F] truncate">{proj.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          proj.priority === 'Urgent' ? 'bg-red-50 text-red-700 border-red-200' :
                          proj.priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-[#E6E9DF] text-[#68734A] border-[#D4D9C8]'
                        }`}>
                          {proj.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#626661] line-clamp-1">{proj.description}</p>
                    </div>

                    <div className="sm:w-44 shrink-0 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#626661]">
                        <span>{proj.status}</span>
                        <span>{proj.progress}%</span>
                      </div>
                      <div className="w-full bg-[#E6E9DF] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#68734A] h-full rounded-full transition-all duration-300"
                          style={{ width: `${proj.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Deliverables / Approvals */}
          <div className="bg-white rounded-2xl border border-[#DCDDD8] shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#68734A]" />
                <h3 className="text-xs font-bold text-[#30332F] uppercase tracking-wider">
                  Deliverable Approvals
                </h3>
              </div>
              <button
                onClick={() => onNavigate('approvals')}
                className="text-xs font-bold text-[#68734A] hover:underline cursor-pointer"
              >
                View Approvals ({approvals.length})
              </button>
            </div>

            {approvals.length === 0 ? (
              <div className="text-center py-6 text-[#838781] text-xs">
                No deliverables currently submitted for review.
              </div>
            ) : (
              <div className="divide-y divide-[#DCDDD8]">
                {approvals.slice(0, 3).map(appr => (
                  <div
                    key={appr.id}
                    onClick={() => onNavigate('approvals')}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-[#F8F8F6] p-2 rounded-xl transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <h4 className="text-xs font-bold text-[#30332F] truncate">{appr.title}</h4>
                      <p className="text-[10px] text-[#838781] truncate">{appr.fileName} • v{appr.version}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                      appr.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      appr.status === 'Changes Requested' ? 'bg-red-50 text-red-800 border-red-200' :
                      'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {appr.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Deadlines & Activity Feed */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-2xl border border-[#DCDDD8] shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-[#30332F] uppercase tracking-wider">
                  Upcoming Deadlines
                </h3>
              </div>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-6 text-[#838781] text-xs">
                No upcoming deadlines in the next 14 days.
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingDeadlines.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => onNavigate(item.link)}
                    className="p-3 bg-[#F8F8F6] rounded-xl border border-[#DCDDD8] flex items-center justify-between cursor-pointer hover:border-[#68734A] transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-[#30332F] truncate">{item.title}</p>
                      <span className="text-[10px] font-semibold text-[#838781]">{item.type}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-[#E6E9DF] text-[#68734A] px-2 py-1 rounded-lg shrink-0">
                      {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Audit Activity */}
          <div className="bg-white rounded-2xl border border-[#DCDDD8] shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
              <h3 className="text-xs font-bold text-[#30332F] uppercase tracking-wider">
                Workspace Activity
              </h3>
              <button
                onClick={() => onNavigate('activity')}
                className="text-xs font-bold text-[#68734A] hover:underline cursor-pointer"
              >
                Log
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-6 text-[#838781] text-xs">
                No activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {logs.slice(0, 5).map(l => (
                  <div key={l.id} className="text-xs space-y-0.5 pb-2.5 border-b border-[#DCDDD8]/60 last:border-none last:pb-0">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#30332F]">{l.userName} ({l.userRole.toUpperCase()})</span>
                      <span className="text-[#838781]">{new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[#626661] text-[11px] leading-snug">{l.action}: {l.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
