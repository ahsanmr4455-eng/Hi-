import {
  FileText,
  FolderKanban,
  HelpCircle,
  ListTodo,
  MessageSquare,
  Search,
  ShieldCheck,
  X
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
  subscribeMessages,
  subscribeWorkspaceFiles
} from '../../services/workspaceService';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { currentUser, activeWorkspace } = useAuth();
  const [query, setQuery] = useState('');

  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !currentUser || !activeWorkspace) return;

    const unsubP = subscribeProjects(activeWorkspace.id, currentUser.role, currentUser.id, setProjects);
    const unsubT = subscribeTasks(activeWorkspace.id, currentUser.role, currentUser.id, setTasks);
    const unsubS = subscribeSupportRequests(activeWorkspace.id, currentUser.role, currentUser.id, setSupportTickets);
    const unsubA = subscribeApprovals(activeWorkspace.id, setApprovals);
    const unsubF = subscribeWorkspaceFiles(activeWorkspace.id, setFiles);

    return () => {
      unsubP();
      unsubT();
      unsubS();
      unsubA();
      unsubF();
    };
  }, [isOpen, currentUser, activeWorkspace]);

  if (!isOpen || !currentUser) return null;

  const cleanQuery = query.trim().toLowerCase();

  const matchedProjects = cleanQuery ? projects.filter(p => p.title.toLowerCase().includes(cleanQuery) || p.description?.toLowerCase().includes(cleanQuery)) : [];
  const matchedTasks = cleanQuery ? tasks.filter(t => t.title.toLowerCase().includes(cleanQuery) || t.description?.toLowerCase().includes(cleanQuery)) : [];
  const matchedSupport = cleanQuery ? supportTickets.filter(s => s.title.toLowerCase().includes(cleanQuery) || s.description?.toLowerCase().includes(cleanQuery)) : [];
  const matchedApprovals = cleanQuery ? approvals.filter(a => a.title.toLowerCase().includes(cleanQuery) || a.fileName?.toLowerCase().includes(cleanQuery)) : [];
  const matchedFiles = cleanQuery ? files.filter(f => f.name.toLowerCase().includes(cleanQuery)) : [];

  const totalMatches = matchedProjects.length + matchedTasks.length + matchedSupport.length + matchedApprovals.length + matchedFiles.length;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center p-4 pt-16 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
          <div className="relative flex-1 mr-3">
            <Search className="w-4 h-4 text-[#68734A] absolute left-3 top-3" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, tasks, deliverables, tickets, files..."
              className="w-full pl-10 pr-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl text-xs text-[#30332F] focus:ring-1 focus:ring-[#68734A] focus:outline-none"
            />
          </div>
          <button onClick={onClose} className="p-1 text-[#838781]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {cleanQuery.length === 0 ? (
          <div className="p-8 text-center text-[#838781] text-xs">
            Start typing to search within authorized workspace data...
          </div>
        ) : totalMatches === 0 ? (
          <div className="p-8 text-center text-[#838781] text-xs">
            No matching items found for "{query}".
          </div>
        ) : (
          <div className="space-y-4">
            {matchedProjects.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#68734A] uppercase tracking-wider">Projects ({matchedProjects.length})</span>
                {matchedProjects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { onNavigate('projects'); onClose(); }}
                    className="p-2.5 bg-[#F8F8F6] hover:bg-[#F0F2EC] rounded-xl border border-[#DCDDD8] text-xs font-bold text-[#30332F] cursor-pointer"
                  >
                    {p.title}
                  </div>
                ))}
              </div>
            )}

            {matchedTasks.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#68734A] uppercase tracking-wider">Tasks ({matchedTasks.length})</span>
                {matchedTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => { onNavigate('tasks'); onClose(); }}
                    className="p-2.5 bg-[#F8F8F6] hover:bg-[#F0F2EC] rounded-xl border border-[#DCDDD8] text-xs font-bold text-[#30332F] cursor-pointer"
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            )}

            {matchedApprovals.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#68734A] uppercase tracking-wider">Deliverables ({matchedApprovals.length})</span>
                {matchedApprovals.map(a => (
                  <div
                    key={a.id}
                    onClick={() => { onNavigate('approvals'); onClose(); }}
                    className="p-2.5 bg-[#F8F8F6] hover:bg-[#F0F2EC] rounded-xl border border-[#DCDDD8] text-xs font-bold text-[#30332F] cursor-pointer"
                  >
                    {a.title} ({a.fileName})
                  </div>
                ))}
              </div>
            )}

            {matchedFiles.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#68734A] uppercase tracking-wider">Files ({matchedFiles.length})</span>
                {matchedFiles.map(f => (
                  <div
                    key={f.id}
                    onClick={() => { onNavigate('files'); onClose(); }}
                    className="p-2.5 bg-[#F8F8F6] hover:bg-[#F0F2EC] rounded-xl border border-[#DCDDD8] text-xs font-bold text-[#30332F] cursor-pointer"
                  >
                    {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
