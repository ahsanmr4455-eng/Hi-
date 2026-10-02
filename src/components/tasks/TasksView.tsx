import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ListTodo,
  MessageSquare,
  Plus,
  Search,
  Send,
  UserCheck,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  addTaskComment,
  createTask,
  subscribeProjects,
  subscribeTasks,
  updateTaskStatus
} from '../../services/portalService';
import { Project, Task, TaskStatus } from '../../types/portal';

export const TasksView: React.FC = () => {
  const { currentUser, activeWorkspace, allUsers } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  // Modals & Detail
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // New Task Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(true);

  const canManage = currentUser?.role === 'admin';
  const canUpdate = currentUser?.role === 'admin' || currentUser?.role === 'team';

  useEffect(() => {
    if (!currentUser) return;
    const wsId = activeWorkspace?.id || null;

    const unsubTasks = subscribeTasks(wsId, currentUser.role, currentUser.id, setTasks);
    const unsubProjects = subscribeProjects(wsId, currentUser.role, currentUser.id, setProjects);

    return () => {
      unsubTasks();
      unsubProjects();
    };
  }, [currentUser, activeWorkspace]);

  if (!currentUser) return null;

  const teamMembersList = allUsers.filter(u => u.role === 'team' || u.role === 'admin');

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatusFilter === 'All' || t.status === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !activeWorkspace) return;

    const assignedUser = teamMembersList.find(u => u.id === assignedToId);

    await createTask(
      activeWorkspace.id,
      projectId,
      title.trim(),
      description.trim(),
      assignedToId,
      assignedUser ? assignedUser.name : 'Unassigned',
      priority,
      dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      visibleToClient,
      currentUser.name,
      currentUser.role
    );

    setIsCreateOpen(false);
    resetForm();
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (!activeWorkspace) return;
    await updateTaskStatus(
      task.id,
      activeWorkspace.id,
      task.title,
      newStatus,
      currentUser.name,
      currentUser.role
    );
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;

    await addTaskComment(
      selectedTask.id,
      currentUser.id,
      currentUser.name,
      currentUser.role,
      newCommentText.trim()
    );

    setNewCommentText('');
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setAssignedToId('');
    setPriority('Medium');
    setDueDate('');
    setVisibleToClient(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DCDDD8] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#30332F] tracking-tight flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-[#68734A]" />
            <span>Task Management Board</span>
          </h2>
          <p className="text-xs text-[#626661] mt-0.5">
            Organize action items, track progress statuses, and collaborate via comments.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-[#68734A] hover:bg-[#58623E] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Task</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#838781] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCDDD8] rounded-xl text-xs text-[#30332F] focus:ring-1 focus:ring-[#68734A] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'To Do', 'In Progress', 'Review', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                selectedStatusFilter === st
                  ? 'bg-[#68734A] text-white'
                  : 'bg-white text-[#626661] border border-[#DCDDD8] hover:bg-[#F8F8F6]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Task Columns / List */}
      <div className="bg-white rounded-2xl border border-[#DCDDD8] shadow-xs overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-[#838781] text-xs space-y-2">
            <ListTodo className="w-8 h-8 text-[#838781] mx-auto opacity-50" />
            <p>No tasks match the current search or filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#DCDDD8]">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                className="p-4 hover:bg-[#F8F8F6] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4
                      onClick={() => setSelectedTask(t)}
                      className="text-xs font-bold text-[#30332F] hover:text-[#68734A] cursor-pointer truncate"
                    >
                      {t.title}
                    </h4>
                    {t.visibleToClient && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#F0F2EC] text-[#68734A] px-2 py-0.5 rounded-full">
                        <Eye className="w-3 h-3" />
                        Client Visible
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#626661] line-clamp-1">{t.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-[10px] font-semibold text-[#838781]">Assigned: {t.assignedToName || 'Team'}</span>

                  {canUpdate ? (
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t, e.target.value as TaskStatus)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl border cursor-pointer ${
                        t.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        t.status === 'In Progress' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        t.status === 'Review' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        'bg-[#F0F2EC] text-[#68734A] border-[#D4D9C8]'
                      }`}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                    </select>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-[#F0F2EC] text-[#68734A] border border-[#D4D9C8]">
                      {t.status}
                    </span>
                  )}

                  <button
                    onClick={() => setSelectedTask(t)}
                    className="p-1.5 text-[#68734A] hover:bg-[#F0F2EC] rounded-lg transition-colors cursor-pointer"
                    title="View Comments & Details"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
              <h3 className="text-sm font-bold text-[#30332F]">Create New Task</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-[#838781]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#30332F] mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design Homepage Wireframe"
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl focus:ring-1 focus:ring-[#68734A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#30332F] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed instructions..."
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl focus:ring-1 focus:ring-[#68734A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#30332F] mb-1">Assignee</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl font-medium"
                  >
                    <option value="">Select Assignee</option>
                    {teamMembersList.map(tm => (
                      <option key={tm.id} value={tm.id}>{tm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#30332F] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="clientVis"
                  checked={visibleToClient}
                  onChange={(e) => setVisibleToClient(e.target.checked)}
                  className="rounded accent-[#68734A]"
                />
                <label htmlFor="clientVis" className="font-bold text-[#30332F] cursor-pointer">
                  Visible to Client in Portal
                </label>
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details & Comments Drawer/Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#DCDDD8] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#68734A]">Task Details</span>
                <h3 className="text-sm font-bold text-[#30332F]">{selectedTask.title}</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 text-[#838781]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#626661] leading-relaxed">{selectedTask.description || 'No description.'}</p>

            {/* Comments Thread */}
            <div className="space-y-3 pt-3 border-t border-[#DCDDD8]">
              <h4 className="text-xs font-bold text-[#30332F] uppercase tracking-wider">Comments & Updates</h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(selectedTask.comments || []).length === 0 ? (
                  <p className="text-[11px] text-[#838781] italic">No comments yet on this task.</p>
                ) : (
                  selectedTask.comments?.map((c) => (
                    <div key={c.id} className="p-2.5 bg-[#F8F8F6] rounded-xl border border-[#DCDDD8] text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#68734A]">
                        <span>{c.userName} ({c.userRole.toUpperCase()})</span>
                        <span className="text-[#838781] font-normal">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[#30332F] font-medium">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-1.5 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl text-xs focus:ring-1 focus:ring-[#68734A] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#68734A] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
