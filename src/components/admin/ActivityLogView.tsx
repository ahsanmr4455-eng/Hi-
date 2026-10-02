import { Activity, Clock, FileText, Search, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { subscribeActivityLogs } from '../../services/workspaceService';
import { ActivityLog } from '../../types/workspace';

export const ActivityLogView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    const unsub = subscribeActivityLogs((logList) => {
      setLogs(logList);
    });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter(
    l => l.userName.toLowerCase().includes(filterQuery.toLowerCase()) ||
         l.action.toLowerCase().includes(filterQuery.toLowerCase()) ||
         l.details.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Audit & Activity Logs</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time audit trail recording file uploads, downloads, client creations, and workspace activity.</p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No activity logs match your search.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{log.userName}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full uppercase">
                      {log.userRole}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600">{log.action}</span>
                  </div>
                  <p className="text-xs text-slate-600">{log.details}</p>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
