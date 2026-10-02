import {
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  FileCheck,
  Plus,
  Star,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  createDeliverableApproval,
  respondToApproval,
  subscribeApprovals,
  submitClientFeedback
} from '../../services/portalService';
import { DeliverableApproval } from '../../types/portal';

export const ApprovalsView: React.FC = () => {
  const { currentUser, activeWorkspace } = useAuth();

  const [approvals, setApprovals] = useState<DeliverableApproval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<DeliverableApproval | null>(null);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [responseAction, setResponseAction] = useState<'Approved' | 'Changes Requested' | null>(null);
  const [clientCommentInput, setClientCommentInput] = useState('');

  // New Deliverable Form (Admin / Team)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');

  // Rating Form
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const canCreate = currentUser?.role === 'admin' || currentUser?.role === 'team';

  useEffect(() => {
    if (!currentUser) return;
    const wsId = activeWorkspace?.id || null;
    const unsub = subscribeApprovals(wsId, setApprovals);
    return () => unsub();
  }, [currentUser, activeWorkspace]);

  if (!currentUser || !activeWorkspace) return null;

  const handleSubmitNewDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !fileName.trim()) return;

    await createDeliverableApproval(
      activeWorkspace.id,
      undefined,
      title.trim(),
      description.trim(),
      fileUrl.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      fileName.trim(),
      1024 * 1024 * 2,
      currentUser.id,
      currentUser.name,
      currentUser.role
    );

    setIsSubmitModalOpen(false);
    setTitle('');
    setDescription('');
    setFileUrl('');
    setFileName('');
  };

  const handleClientResponse = async (status: 'Approved' | 'Changes Requested') => {
    if (!selectedApproval) return;

    await respondToApproval(
      selectedApproval.id,
      activeWorkspace.id,
      selectedApproval.title,
      status,
      clientCommentInput.trim(),
      currentUser.name,
      currentUser.role
    );

    setSelectedApproval(null);
    setResponseAction(null);
    setClientCommentInput('');
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComment.trim()) return;

    await submitClientFeedback(
      activeWorkspace.id,
      undefined,
      selectedApproval?.id,
      rating,
      feedbackComment.trim(),
      currentUser.name
    );

    setIsFeedbackModalOpen(false);
    setFeedbackComment('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DCDDD8] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#30332F] tracking-tight flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#68734A]" />
            <span>Deliverables & Client Approvals</span>
          </h2>
          <p className="text-xs text-[#626661] mt-0.5">
            Review design drafts, videos, and project deliverables with permanent status verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'client' && (
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="px-3.5 py-2 bg-[#F0F2EC] hover:bg-[#E2E6DA] text-[#68734A] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Leave Feedback</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2 bg-[#68734A] hover:bg-[#58623E] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Deliverable</span>
            </button>
          )}
        </div>
      </div>

      {/* Deliverables Cards Grid */}
      {approvals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#DCDDD8] space-y-2">
          <FileCheck className="w-10 h-10 text-[#838781] mx-auto opacity-50" />
          <p className="text-xs text-[#626661] font-semibold">No deliverables submitted for review yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {approvals.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#DCDDD8] shadow-xs hover:border-[#68734A] transition-all p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#838781] uppercase">Version {item.version || 1}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    item.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    item.status === 'Changes Requested' ? 'bg-red-50 text-red-800 border-red-200' :
                    'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#30332F]">{item.title}</h3>
                  <p className="text-xs text-[#626661] line-clamp-2 mt-1">{item.description}</p>
                </div>

                {item.fileUrl && (
                  <div className="rounded-xl overflow-hidden border border-[#DCDDD8] bg-black/5 h-36 relative">
                    <img src={item.fileUrl} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {item.clientComment && (
                <div className="p-2.5 bg-[#F8F8F6] rounded-xl border border-[#DCDDD8] text-xs space-y-0.5">
                  <span className="text-[10px] font-bold text-[#68734A]">Client Notes:</span>
                  <p className="text-[#30332F] italic">"{item.clientComment}"</p>
                </div>
              )}

              <div className="pt-3 border-t border-[#DCDDD8] flex items-center justify-between">
                <a
                  href={item.fileUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-[#68734A] hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview File</span>
                </a>

                {item.status === 'Pending Review' && currentUser.role === 'client' && (
                  <button
                    onClick={() => setSelectedApproval(item)}
                    className="px-3 py-1.5 bg-[#68734A] text-white font-bold text-xs rounded-xl hover:bg-[#58623E]"
                  >
                    Review Deliverable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal for Client */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
              <h3 className="text-sm font-bold text-[#30332F]">Review "{selectedApproval.title}"</h3>
              <button onClick={() => setSelectedApproval(null)} className="p-1 text-[#838781]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#626661]">{selectedApproval.description}</p>

            <div>
              <label className="block text-xs font-bold text-[#30332F] mb-1">Feedback / Requested Changes Notes</label>
              <textarea
                rows={3}
                value={clientCommentInput}
                onChange={(e) => setClientCommentInput(e.target.value)}
                placeholder="Leave notes or describe revisions required..."
                className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl text-xs focus:ring-1 focus:ring-[#68734A] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => handleClientResponse('Changes Requested')}
                className="px-4 py-2 bg-red-50 text-red-800 hover:bg-red-100 border border-red-200 font-bold text-xs rounded-xl"
              >
                Request Changes
              </button>
              <button
                onClick={() => handleClientResponse('Approved')}
                className="px-4 py-2 bg-[#68734A] hover:bg-[#58623E] text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Approve Deliverable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit New Deliverable Modal (Admin / Team) */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
              <h3 className="text-sm font-bold text-[#30332F]">Submit Deliverable for Review</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="p-1 text-[#838781]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewDeliverable} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#30332F] mb-1">Deliverable Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Website Homepage Mockup v1"
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-[#30332F] mb-1">File Name *</label>
                <input
                  type="text"
                  required
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. homepage-final-v1.png"
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-[#30332F] mb-1">Preview Image / File URL</label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-[#30332F] mb-1">Notes / Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes for client review..."
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 border border-[#DCDDD8] text-[#626661] font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#68734A] text-white font-bold rounded-xl shadow-xs"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCDDD8] pb-3">
              <h3 className="text-sm font-bold text-[#30332F]">Provide Feedback & Rating</h3>
              <button onClick={() => setIsFeedbackModalOpen(false)} className="p-1 text-[#838781]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#30332F] mb-2">Overall Experience Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star className={`w-6 h-6 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#30332F] mb-1">Feedback Comments *</label>
                <textarea
                  rows={4}
                  required
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Tell us what you liked or how we can improve..."
                  className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="px-4 py-2 border border-[#DCDDD8] text-[#626661] font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#68734A] text-white font-bold rounded-xl shadow-xs"
                >
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
