import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderKanban,
  ListTodo
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeApprovals,
  subscribeProjects,
  subscribeTasks
} from '../../services/portalService';
import { CalendarItem, DeliverableApproval, Project, Task } from '../../types/portal';

interface CalendarViewProps {
  onNavigate: (tab: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onNavigate }) => {
  const { currentUser, activeWorkspace } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<DeliverableApproval[]>([]);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!currentUser) return;
    const wsId = activeWorkspace?.id || null;

    const unsubP = subscribeProjects(wsId, currentUser.role, currentUser.id, setProjects);
    const unsubT = subscribeTasks(wsId, currentUser.role, currentUser.id, setTasks);
    const unsubA = subscribeApprovals(wsId, setApprovals);

    return () => {
      unsubP();
      unsubT();
      unsubA();
    };
  }, [currentUser, activeWorkspace]);

  if (!currentUser) return null;

  // Map real data to calendar items
  const calendarItems: CalendarItem[] = [
    ...projects.filter(p => p.dueDate).map(p => ({
      id: `p_${p.id}`,
      title: p.title,
      type: 'project' as const,
      date: p.dueDate,
      status: p.status,
      priority: p.priority,
      linkTab: 'projects',
      refId: p.id,
      workspaceId: p.workspaceId
    })),
    ...tasks.filter(t => t.dueDate).map(t => ({
      id: `t_${t.id}`,
      title: t.title,
      type: 'task' as const,
      date: t.dueDate,
      status: t.status,
      priority: t.priority,
      linkTab: 'tasks',
      refId: t.id,
      workspaceId: t.workspaceId
    })),
    ...approvals.filter(a => a.createdAt).map(a => ({
      id: `a_${a.id}`,
      title: a.title,
      type: 'deliverable' as const,
      date: a.createdAt.split('T')[0],
      status: a.status,
      linkTab: 'approvals',
      refId: a.id,
      workspaceId: a.workspaceId
    }))
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DCDDD8] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#30332F] tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#68734A]" />
            <span>Workspace Schedule & Deadlines Calendar</span>
          </h2>
          <p className="text-xs text-[#626661] mt-0.5">
            Real-time deadline tracking for projects, tasks, and deliverable reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 border border-[#DCDDD8] rounded-xl hover:bg-[#F8F8F6] text-[#30332F] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-[#30332F] min-w-[120px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 border border-[#DCDDD8] rounded-xl hover:bg-[#F8F8F6] text-[#30332F] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-[#DCDDD8] shadow-xs p-5 space-y-3 overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#68734A] pb-2 border-b border-[#DCDDD8]">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div className="grid grid-cols-7 gap-2 min-w-[600px]">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty_${i}`} className="h-24 bg-[#F8F8F6]/50 rounded-xl"></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayItems = calendarItems.filter(item => item.date === dateStr);

            return (
              <div
                key={dayNum}
                className="h-24 p-1.5 border border-[#DCDDD8]/60 rounded-xl bg-white flex flex-col justify-between hover:border-[#68734A] transition-colors"
              >
                <span className="text-[11px] font-bold text-[#30332F]">{dayNum}</span>

                <div className="space-y-1 overflow-y-auto max-h-16">
                  {dayItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => onNavigate(item.linkTab)}
                      className={`text-[9px] font-bold p-1 rounded leading-tight truncate cursor-pointer transition-transform hover:scale-[1.02] ${
                        item.type === 'project' ? 'bg-[#F0F2EC] text-[#68734A] border border-[#D4D9C8]' :
                        item.type === 'task' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
