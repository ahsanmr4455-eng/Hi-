import {
  AlertCircle,
  Clock,
  HelpCircle,
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
  createSupportRequest,
  sendSupportMessage,
  subscribeSupportMessages,
  subscribeSupportRequests,
  updateSupportStatus
} from '../../services/portalService';
import { SupportMessage, SupportRequest, SupportStatus } from '../../types/portal';

export const SupportView: React.FC = () => {
  const { currentUser, activeWorkspace } = useAuth();

  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageText, setMessageText] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportRequest['category']>('General');
  const [priority, setPriority] = useState<SupportRequest['priority']>('Medium');

  useEffect(() => {
    if (!currentUser) return;
    const wsId = activeWorkspace?.id || null;
    const unsub = subscribeSupportRequests(wsId, currentUser.role, currentUser.id, (list) => {
      setRequests(list);
      if (list.length > 0 && !selectedRequest) {
        setSelectedRequest(list[0]);
      }
    });
    return () => unsub();
  }, [currentUser, activeWorkspace]);

  useEffect(() => {
    if (!selectedRequest) return;
    const unsub = subscribeSupportMessages(selectedRequest.id, (msgList) => {
      setMessages(msgList);
    });
    return () => unsub();
  }, [selectedRequest]);

  if (!currentUser || !activeWorkspace) return null;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createSupportRequest(
      activeWorkspace.id,
      title.trim(),
      description.trim(),
      category,
      priority,
      [],
      currentUser.id,
      currentUser.name,
      currentUser.role
    );

    setIsCreateOpen(false);
    setTitle('');
    setDescription('');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !messageText.trim()) return;

    await sendSupportMessage(
      selectedRequest.id,
      currentUser.id,
      currentUser.name,
      currentUser.role,
      messageText.trim()
    );

    setMessageText('');
  };

  const handleStatusChange = async (newStatus: SupportStatus) => {
    if (!selectedRequest) return;
    await updateSupportStatus(
      selectedRequest.id,
      activeWorkspace.id,
      selectedRequest.title,
      newStatus,
      currentUser.name,
      currentUser.role
    );
    setSelectedRequest({ ...selectedRequest, status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DCDDD8] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#30332F] tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#68734A]" />
            <span>Client Support & Dedicated Tickets</span>
          </h2>
          <p className="text-xs text-[#626661] mt-0.5">
            Submit inquiries, bug reports, and assistance requests with isolated thread history.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-[#68734A] hover:bg-[#58623E] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* Main Support Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] bg-white rounded-2xl border border-[#DCDDD8] overflow-hidden shadow-xs">
        {/* Ticket List Column */}
        <div className="border-r border-[#DCDDD8] flex flex-col h-full bg-[#F8F8F6]">
          <div className="p-3 border-b border-[#DCDDD8]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="w-full px-3 py-1.5 bg-white border border-[#DCDDD8] rounded-xl text-xs focus:ring-1 focus:ring-[#68734A] focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#DCDDD8]">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-[#838781] text-xs">
                No support tickets submitted yet.
              </div>
            ) : (
              requests.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-3.5 cursor-pointer transition-colors hover:bg-white ${
                      isSelected ? 'bg-white border-l-4 border-[#68734A]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#68734A] uppercase">{req.category}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.2 rounded-full border ${
                        req.status === 'Completed' || req.status === 'Closed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        req.status === 'In Progress' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#30332F] truncate">{req.title}</h4>
                    <p className="text-[11px] text-[#626661] line-clamp-1 mt-0.5">{req.description}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message Thread Column */}
        <div className="md:col-span-2 flex flex-col h-full bg-white">
          {selectedRequest ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-[#DCDDD8] flex items-center justify-between bg-[#F8F8F6]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-[#30332F]">{selectedRequest.title}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E6E9DF] text-[#68734A]">
                      {selectedRequest.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#838781]">Opened by {selectedRequest.createdByName}</p>
                </div>

                {currentUser.role !== 'client' && (
                  <select
                    value={selectedRequest.status}
                    onChange={(e) => handleStatusChange(e.target.value as SupportStatus)}
                    className="text-xs font-bold px-2.5 py-1 rounded-xl border bg-white cursor-pointer"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for Client">Waiting for Client</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                  </select>
                )}
              </div>

              {/* Messages Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F2F2EF]">
                <div className="p-3 bg-white rounded-2xl border border-[#DCDDD8] text-xs space-y-1">
                  <span className="text-[10px] font-bold text-[#68734A]">Ticket Details</span>
                  <p className="text-[#30332F] leading-relaxed">{selectedRequest.description}</p>
                </div>

                {messages.map((m) => {
                  const isMe = m.senderId === currentUser.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-3 text-xs shadow-2xs space-y-1 ${
                        isMe ? 'bg-[#68734A] text-white rounded-tr-none' : 'bg-white text-[#30332F] border border-[#DCDDD8] rounded-tl-none'
                      }`}>
                        <div className="text-[10px] font-bold opacity-80">
                          {m.senderName} ({m.senderRole.toUpperCase()})
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#DCDDD8] bg-white flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a response..."
                  className="flex-1 px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl text-xs focus:ring-1 focus:ring-[#68734A] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#68734A] text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#838781] text-xs">
              Select a ticket to view conversation history.
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
              <h3 className="text-sm font-bold text-[#30332F]">Submit Support Request</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-[#838781]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#30332F] mb-1">Subject / Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summary of request..."
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl focus:ring-1 focus:ring-[#68734A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#30332F] mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl font-medium"
                  >
                    <option value="General">General</option>
                    <option value="Technical">Technical</option>
                    <option value="Design">Design</option>
                    <option value="Billing">Billing</option>
                    <option value="Bug">Bug Report</option>
                  </select>
                </div>

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
              </div>

              <div>
                <label className="block font-bold text-[#30332F] mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what you need assistance with..."
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl focus:ring-1 focus:ring-[#68734A] focus:outline-none"
                />
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
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
