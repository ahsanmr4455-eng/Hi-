import {
  Archive,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit2,
  FolderKanban,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  archiveProject,
  createProject,
  subscribeProjects,
  updateProject
} from '../../services/portalService';
import { Project, ProjectMilestone, ProjectStatus } from '../../types/portal';

export const ProjectsView: React.FC = () => {
  const { currentUser, activeWorkspace, workspaces, allUsers } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<Project | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Project['priority']>('Medium');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [assignedTeamMemberIds, setAssignedTeamMemberIds] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([
    { id: 'm1', title: 'Project Kickoff & Scope', status: 'Completed', visibleToClient: true },
    { id: 'm2', title: 'UI/UX Design Drafts', status: 'In Progress', visibleToClient: true },
    { id: 'm3', title: 'Development & Implementation', status: 'Pending', visibleToClient: true },
    { id: 'm4', title: 'Client Review & Approval', status: 'Pending', visibleToClient: true },
    { id: 'm5', title: 'Final Delivery & Launch', status: 'Pending', visibleToClient: true }
  ]);

  const canManage = currentUser?.role === 'admin';

  useEffect(() => {
    if (!currentUser) return;
    const wsId = activeWorkspace?.id || null;
    const unsub = subscribeProjects(wsId, currentUser.role, currentUser.id, (list) => {
      setProjects(list);
    });
    return () => unsub();
  }, [currentUser, activeWorkspace]);

  if (!currentUser) return null;

  const teamMembersList = allUsers.filter(u => u.role === 'team' || u.role === 'admin');

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !activeWorkspace || !currentUser) return;

    await createProject(
      activeWorkspace.id,
      title.trim(),
      description.trim(),
      activeWorkspace.clientId,
      activeWorkspace.clientUsername,
      assignedTeamMemberIds,
      startDate,
      dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      priority,
      milestones,
      currentUser.name,
      currentUser.role
    );

    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdateProgress = async (proj: Project, newProgress: number, newStatus?: ProjectStatus) => {
    await updateProject(
      proj.id,
      {
        progress: newProgress,
        status: newStatus || proj.status,
        workspaceId: proj.workspaceId
      },
      currentUser.name,
      currentUser.role
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setAssignedTeamMemberIds([]);
    setDueDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DCDDD8] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#30332F] tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#68734A]" />
            <span>Projects & Deliverables System</span>
          </h2>
          <p className="text-xs text-[#626661] mt-0.5">
            Manage timelines, progress percentages, team assignments, and client milestones.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-[#68734A] hover:bg-[#58623E] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#838781] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCDDD8] rounded-xl text-xs text-[#30332F] focus:ring-1 focus:ring-[#68734A] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'Planning', 'In Progress', 'Review', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                selectedStatus === st
                  ? 'bg-[#68734A] text-white'
                  : 'bg-white text-[#626661] border border-[#DCDDD8] hover:bg-[#F8F8F6]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#DCDDD8] space-y-3">
          <FolderKanban className="w-10 h-10 text-[#838781] mx-auto opacity-50" />
          <p className="text-xs text-[#626661] font-semibold">No projects found.</p>
          {canManage && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-3.5 py-1.5 bg-[#F0F2EC] text-[#68734A] hover:bg-[#E2E6DA] text-xs font-bold rounded-xl transition-all cursor-pointer inline-block"
            >
              Create first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white rounded-2xl border border-[#DCDDD8] shadow-xs hover:border-[#68734A] transition-all flex flex-col justify-between p-5 space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    proj.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    proj.status === 'Review' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                    proj.status === 'In Progress' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                    'bg-[#F0F2EC] text-[#68734A] border-[#D4D9C8]'
                  }`}>
                    {proj.status}
                  </span>

                  <span className={`text-[10px] font-bold uppercase ${
                    proj.priority === 'Urgent' ? 'text-red-600' :
                    proj.priority === 'High' ? 'text-amber-600' :
                    'text-[#838781]'
                  }`}>
                    {proj.priority} Priority
                  </span>
                </div>

                <div>
                  <h3
                    onClick={() => setSelectedProjectDetail(proj)}
                    className="text-sm font-bold text-[#30332F] group-hover:text-[#68734A] transition-colors cursor-pointer"
                  >
                    {proj.title}
                  </h3>
                  <p className="text-xs text-[#626661] line-clamp-2 mt-1 leading-relaxed">
                    {proj.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#DCDDD8]/60">
                {/* Progress Slider / Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#626661]">
                    <span>Overall Completion</span>
                    <span>{proj.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-[#E6E9DF] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#68734A] h-full rounded-full transition-all duration-300"
                      style={{ width: `${proj.progress || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#838781]">
                  <div className="flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#68734A]" />
                    <span>Due: {proj.dueDate ? new Date(proj.dueDate).toLocaleDateString() : 'N/A'}</span>
                  </div>

                  <button
                    onClick={() => setSelectedProjectDetail(proj)}
                    className="flex items-center gap-1 font-bold text-[#68734A] hover:underline cursor-pointer"
                  >
                    <span>Timeline & Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
              <h3 className="text-sm font-bold text-[#30332F]">Launch New Project</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-[#838781] hover:text-[#30332F]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#30332F] mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Website Redesign & Branding"
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl focus:ring-1 focus:ring-[#68734A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#30332F] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project scope and details..."
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl focus:ring-1 focus:ring-[#68734A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#30332F] mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl font-medium"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#30332F] mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#30332F] mb-1">Assigned Team Members</label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto p-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl">
                  {teamMembersList.map(tm => (
                    <label key={tm.id} className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={assignedTeamMemberIds.includes(tm.id)}
                        onChange={(e) => {
                          if (e.target.checked) setAssignedTeamMemberIds(prev => [...prev, tm.id]);
                          else setAssignedTeamMemberIds(prev => prev.filter(id => id !== tm.id));
                        }}
                        className="rounded accent-[#68734A]"
                      />
                      <span>{tm.name} ({tm.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-[#DCDDD8] text-[#626661] font-bold rounded-xl hover:bg-[#F8F8F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#68734A] hover:bg-[#58623E] text-white font-bold rounded-xl shadow-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail & Timeline Modal */}
      {selectedProjectDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#DCDDD8] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#68734A]">Project Overview</span>
                <h3 className="text-base font-bold text-[#30332F]">{selectedProjectDetail.title}</h3>
              </div>
              <button onClick={() => setSelectedProjectDetail(null)} className="p-1 text-[#838781]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#626661] leading-relaxed">{selectedProjectDetail.description}</p>

            {/* Quick Admin Control slider */}
            {canManage && (
              <div className="p-4 bg-[#F8F8F6] rounded-xl border border-[#DCDDD8] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#30332F]">
                  <span>Adjust Progress %</span>
                  <span>{selectedProjectDetail.progress || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedProjectDetail.progress || 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSelectedProjectDetail({ ...selectedProjectDetail, progress: val });
                    handleUpdateProgress(selectedProjectDetail, val);
                  }}
                  className="w-full accent-[#68734A]"
                />
              </div>
            )}

            {/* Timeline Milestones */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#30332F] uppercase tracking-wider">
                Project Milestone Timeline
              </h4>

              <div className="space-y-2 relative pl-4 border-l-2 border-[#68734A]/30">
                {(selectedProjectDetail.milestones || []).map((m, idx) => (
                  <div key={m.id || idx} className="relative pl-3 space-y-1">
                    <span className={`w-3 h-3 rounded-full absolute -left-[23px] top-1 border-2 border-white ${
                      m.status === 'Completed' ? 'bg-emerald-600' :
                      m.status === 'In Progress' ? 'bg-amber-500' :
                      'bg-slate-300'
                    }`}></span>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#30332F]">{m.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.status === 'Completed' ? 'bg-emerald-50 text-emerald-800' :
                        m.status === 'In Progress' ? 'bg-amber-50 text-amber-800' :
                        'bg-[#F0F2EC] text-[#68734A]'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#DCDDD8] flex justify-end">
              <button
                onClick={() => setSelectedProjectDetail(null)}
                className="px-4 py-2 bg-[#68734A] text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
