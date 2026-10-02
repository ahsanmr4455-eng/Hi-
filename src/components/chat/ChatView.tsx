import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Download,
  File,
  FileArchive,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Paperclip,
  Reply,
  Search,
  Send,
  Trash2,
  X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  deleteMessage,
  ensureWorkspaceConversation,
  markConversationRead,
  markMessageRead,
  sendMessage,
  setTypingStatus,
  softDeleteMessage,
  subscribeConversations,
  subscribeMessages,
  uploadChatAttachment
} from '../../services/workspaceService';
import { Conversation, Message, MessageAttachment } from '../../types/workspace';

function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getAttachmentType(mimeType: string, fileName: string): 'image' | 'pdf' | 'doc' | 'archive' | 'file' {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
    return 'image';
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    mimeType?.includes('word') ||
    mimeType?.includes('excel') ||
    mimeType?.includes('spreadsheet') ||
    ['doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'].includes(ext)
  ) {
    return 'doc';
  }
  if (
    mimeType?.includes('zip') ||
    mimeType?.includes('compressed') ||
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)
  ) {
    return 'archive';
  }
  return 'file';
}

export const ChatView: React.FC = () => {
  const { currentUser, activeWorkspace } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [dbMessages, setDbMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);

  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // File Attachment State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // 1. Subscribe to conversations for active workspace
  useEffect(() => {
    if (!activeWorkspace) return;

    let unsub: () => void;
    async function setupConversations() {
      if (!activeWorkspace) return;
      await ensureWorkspaceConversation(activeWorkspace.id, currentUser?.id);

      unsub = subscribeConversations(activeWorkspace.id, currentUser?.id, (convList) => {
        setConversations(convList);
        if (convList.length > 0 && !activeConversation) {
          setActiveConversation(convList[0]);
        }
      });
    }

    setupConversations();

    return () => {
      if (unsub) unsub();
    };
  }, [activeWorkspace, currentUser]);

  // 2. Subscribe to real-time messages for active conversation
  useEffect(() => {
    if (!activeConversation || !currentUser) return;

    // Reset unread count for current user on this conversation
    markConversationRead(activeConversation.id, currentUser.id);

    const unsub = subscribeMessages(activeConversation.id, currentUser.id, (msgList) => {
      setDbMessages(msgList);

      // Filter out confirmed messages from pending array by clientTempId or id or matching text
      setPendingMessages(prev =>
        prev.filter(p => !msgList.some(m =>
          (m.clientTempId && p.clientTempId && m.clientTempId === p.clientTempId) ||
          m.id === p.id ||
          (m.text && p.text && m.text.trim().length > 0 && m.text === p.text && m.senderId === p.senderId && Math.abs(new Date(m.createdAt).getTime() - new Date(p.createdAt).getTime()) < 10000)
        ))
      );

      // Mark unread messages as read by current user
      msgList.forEach(m => {
        if (m.senderId !== currentUser.id && !m.readBy?.includes(currentUser.id)) {
          markMessageRead(activeConversation.id, m.id, currentUser.id);
        }
      });
    });

    return () => unsub();
  }, [activeConversation, currentUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dbMessages, pendingMessages]);

  if (!currentUser || !activeWorkspace) return null;

  // Combine real-time db messages with local pending messages
  const allDisplayMessages = [...dbMessages];
  pendingMessages.forEach(pending => {
    const isAlreadyInDb = dbMessages.some(m =>
      m.id === pending.id ||
      (m.clientTempId && pending.clientTempId && m.clientTempId === pending.clientTempId) ||
      (m.text && pending.text && m.text.trim().length > 0 && m.text === pending.text && m.senderId === pending.senderId && Math.abs(new Date(m.createdAt).getTime() - new Date(pending.createdAt).getTime()) < 10000)
    );
    if (!isAlreadyInDb) {
      allDisplayMessages.push(pending);
    }
  });

  allDisplayMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Typing Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    if (activeConversation) {
      setTypingStatus(activeConversation.id, currentUser.id, true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(activeConversation.id, currentUser.id, false);
      }, 2000);
    }
  };

  // Execute Write to Firebase
  const executeSend = async (pendingMsg: Message) => {
    if (!activeConversation) return;

    try {
      setPendingMessages(prev => prev.map(p => p.id === pendingMsg.id ? { ...p, status: 'sending' } : p));

      await sendMessage(
        pendingMsg.conversationId,
        pendingMsg.workspaceId,
        pendingMsg.senderId,
        pendingMsg.senderName,
        pendingMsg.senderRole,
        pendingMsg.text,
        pendingMsg.attachments || [],
        pendingMsg.replyToId || null,
        pendingMsg.replyToText,
        pendingMsg.clientTempId
      );

      setPendingMessages(prev => prev.filter(p => p.id !== pendingMsg.id));
    } catch (err) {
      console.error("Failed to send message to Firebase:", err);
      setPendingMessages(prev => prev.map(p => p.id === pendingMsg.id ? { ...p, status: 'failed' } : p));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !selectedFile) || !activeConversation || isUploading) return;

    setUploadError(null);
    let attachmentsToSend: MessageAttachment[] = [];

    // If a file is selected, upload it to Firebase Storage first
    if (selectedFile) {
      setIsUploading(true);
      setUploadProgress(10);
      try {
        const uploadedAtt = await uploadChatAttachment(
          activeWorkspace.id,
          activeConversation.id,
          selectedFile,
          (progress) => setUploadProgress(progress)
        );
        if (!uploadedAtt || (!uploadedAtt.downloadUrl && !uploadedAtt.url && !uploadedAtt.fileData)) {
          throw new Error("Attachment upload returned an invalid download URL.");
        }
        attachmentsToSend = [uploadedAtt];
      } catch (err) {
        console.error("Chat attachment upload failed:", err);
        setUploadError("Failed to upload file. Please try again.");
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }
      setIsUploading(false);
      setUploadProgress(null);
      setSelectedFile(null);
    }

    const textToSend = messageText.trim();
    const replyId = replyingTo ? replyingTo.id : null;
    const replyText = replyingTo ? replyingTo.text : undefined;

    const tempId = 'pending_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const pendingMsg: Message = {
      id: tempId,
      clientTempId: tempId,
      conversationId: activeConversation.id,
      workspaceId: activeWorkspace.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      type: attachmentsToSend.length > 0 ? 'file' : 'text',
      text: textToSend,
      attachments: attachmentsToSend,
      replyToId: replyId,
      replyToText: replyText,
      readBy: [currentUser.id],
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    setPendingMessages(prev => [...prev, pendingMsg]);

    setMessageText('');
    setReplyingTo(null);

    executeSend(pendingMsg);
  };

  const handleAttachmentSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteMsg = async (msg: Message) => {
    if (!activeConversation) return;
    const isMyMsg = msg.senderId === currentUser.id;
    const isAdmin = currentUser.role === 'admin';

    if (!isMyMsg && !isAdmin) {
      alert("You can only delete your own messages.");
      return;
    }

    if (confirm("Delete this message for everyone?")) {
      try {
        await softDeleteMessage(activeConversation.id, msg.id, currentUser.id);
      } catch (err) {
        console.error("Error deleting message:", err);
      }
    }
  };

  // Check if anyone else is typing in active conversation
  const someoneElseIsTyping = activeConversation?.typingStatus &&
    Object.entries(activeConversation.typingStatus).some(([uid, isTyping]) => uid !== currentUser.id && isTyping);

  return (
    <div className="bg-white rounded-2xl border border-[#DCDDD8] shadow-xs h-[calc(100vh-140px)] flex overflow-hidden">
      {/* LEFT: Conversations List */}
      <div className={`w-full md:w-80 border-r border-[#DCDDD8] flex flex-col shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Search Header */}
        <div className="p-3.5 border-b border-[#DCDDD8] bg-[#F8F8F6] space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-[#30332F] uppercase tracking-wider">Conversations</h3>
            <span className="text-[10px] font-bold bg-[#F0F2EC] text-[#68734A] border border-[#D4D9C8] px-2 py-0.5 rounded-full">ZT Chat Live</span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#838781] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#DCDDD8] rounded-xl text-xs text-[#30332F] focus:ring-1 focus:ring-[#68734A] focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#DCDDD8]/60">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-[#838781] text-xs">
              Initializing chat channel...
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeConversation?.id === conv.id;
              const unread = conv.unreadCounts?.[currentUser.id] || 0;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConversation(conv);
                    setShowMobileChat(true);
                  }}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-[#F8F8F6] ${
                    isSelected ? 'bg-[#F0F2EC] border-l-4 border-[#68734A]' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#E6E9DF] font-bold text-[#68734A] flex items-center justify-center text-sm">
                      {activeWorkspace.title.charAt(0)}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#68734A] border-2 border-white absolute bottom-0 right-0"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#30332F] truncate">{activeWorkspace.title}</h4>
                      <span className="text-[10px] text-[#838781] font-mono">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[11px] text-[#626661] truncate max-w-[160px]">{conv.lastMessage || 'No messages yet'}</p>
                      {unread > 0 && (
                        <span className="bg-[#68734A] text-white text-[10px] font-bold rounded-full px-1.5 py-0.2 shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Active Chat Window */}
      <div className={`flex-1 flex flex-col bg-[#F2F2EF] ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-3.5 bg-white border-b border-[#DCDDD8] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="p-1 text-[#626661] hover:text-[#30332F] md:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-[#68734A] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {activeWorkspace.title.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#30332F]">{activeWorkspace.title}</h3>
                  <p className="text-[10px] text-[#68734A] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#68734A] inline-block"></span>
                    <span>{someoneElseIsTyping ? 'typing...' : 'Real-time Connected'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F2F2EF]">
              {allDisplayMessages.length === 0 ? (
                <div className="text-center py-12 text-[#838781] text-xs">
                  No messages yet. Send a message to start communicating.
                </div>
              ) : (
                allDisplayMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  const isSending = msg.status === 'sending';
                  const isFailed = msg.status === 'failed';
                  const isDeleted = msg.isDeleted;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs shadow-xs space-y-1.5 relative group ${
                          isDeleted
                            ? 'bg-[#EAECE5] text-[#626661] border border-[#DCDDD8] italic'
                            : isMe
                            ? 'bg-[#68734A] text-white rounded-tr-none'
                            : 'bg-white text-[#30332F] border border-[#DCDDD8] rounded-tl-none'
                        }`}
                      >
                        {/* Sender info */}
                        {!isMe && !isDeleted && (
                          <div className="text-[10px] font-bold text-[#68734A] mb-0.5">
                            {msg.senderName} ({msg.senderRole.toUpperCase()})
                          </div>
                        )}

                        {/* Deleted Message State */}
                        {isDeleted ? (
                          <div className="flex items-center gap-2 text-xs py-1 text-[#626661]">
                            <Trash2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
                            <span>
                              {msg.attachments && msg.attachments.length > 0
                                ? 'This file was deleted'
                                : 'This message was deleted'}
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Reply reference preview */}
                            {msg.replyToText && (
                              <div
                                className={`p-2 rounded-lg text-[10px] border-l-2 mb-1.5 ${
                                  isMe
                                    ? 'bg-[#58623E] border-white/60 text-[#EAECE5]'
                                    : 'bg-[#F8F8F6] border-[#68734A] text-[#626661]'
                                }`}
                              >
                                <span className="font-bold block">Replying to:</span>
                                <span className="truncate block">{msg.replyToText}</span>
                              </div>
                            )}

                            {/* Message Text */}
                            {msg.text && (
                              <p className="leading-relaxed whitespace-pre-wrap font-medium text-[12px]">
                                {msg.text}
                              </p>
                            )}

                            {/* File Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-2 mt-1">
                                {msg.attachments.map((att, idx) => {
                                  const attUrl = att.downloadUrl || att.url || att.fileData;
                                  const attType = getAttachmentType(att.mimeType, att.name);

                                  if (attType === 'image' && attUrl) {
                                    return (
                                      <div key={idx} className="rounded-xl overflow-hidden border border-black/10 bg-black/5 max-w-xs space-y-1">
                                        <a href={attUrl} target="_blank" rel="noopener noreferrer" className="block cursor-pointer">
                                          <img
                                            src={attUrl}
                                            alt={att.name}
                                            className="w-full max-h-56 object-cover hover:opacity-95 transition-opacity"
                                          />
                                        </a>
                                        <div className={`p-2 flex items-center justify-between text-[11px] font-medium ${isMe ? 'text-[#EAECE5]' : 'text-[#30332F]'}`}>
                                          <span className="truncate max-w-[180px]">{att.name}</span>
                                          <a
                                            href={attUrl}
                                            download={att.name}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 hover:bg-black/10 rounded transition-colors"
                                            title="Download Image"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </a>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={idx}
                                      className={`p-2.5 rounded-xl flex items-center gap-3 border ${
                                        isMe
                                          ? 'bg-[#58623E] border-[#838781]/60 text-white'
                                          : 'bg-[#F8F8F6] border-[#DCDDD8] text-[#30332F]'
                                      }`}
                                    >
                                      <div className={`p-2 rounded-lg shrink-0 ${isMe ? 'bg-[#485132] text-white' : 'bg-[#E6E9DF] text-[#68734A]'}`}>
                                        {attType === 'pdf' ? (
                                          <FileText className="w-4 h-4" />
                                        ) : attType === 'archive' ? (
                                          <FileArchive className="w-4 h-4" />
                                        ) : (
                                          <File className="w-4 h-4" />
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0 text-left">
                                        <p className="truncate text-xs font-semibold">{att.name}</p>
                                        <p className={`text-[10px] ${isMe ? 'text-[#EAECE5]' : 'text-[#838781]'}`}>
                                          {formatFileSize(att.size)}
                                        </p>
                                      </div>

                                      {attUrl && (
                                        <a
                                          href={attUrl}
                                          download={att.name}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                                            isMe
                                              ? 'bg-white/20 hover:bg-white/30 text-white'
                                              : 'bg-[#68734A] text-white hover:bg-[#58623E]'
                                          }`}
                                          title="Download Attachment"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span className="hidden sm:inline">Download</span>
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}

                        {/* Timestamp & Delivery State Indicators */}
                        <div className={`flex items-center justify-end gap-1.5 text-[9px] mt-1 ${isMe && !isDeleted ? 'text-[#EAECE5]' : 'text-[#838781]'}`}>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {isMe && !isDeleted && (
                            <span>
                              {isSending && (
                                <span className="inline-flex items-center gap-1 text-[#EAECE5]">
                                  <Clock className="w-3 h-3 animate-pulse" />
                                  <span>sending...</span>
                                </span>
                              )}
                              {isFailed && (
                                <button
                                  onClick={() => executeSend(msg)}
                                  className="inline-flex items-center gap-1 text-red-100 font-bold bg-red-800/80 px-1.5 py-0.5 rounded hover:bg-red-800 cursor-pointer"
                                >
                                  <AlertCircle className="w-3 h-3 text-red-200" />
                                  <span>Failed. Retry</span>
                                </button>
                              )}
                              {!isSending && !isFailed && (
                                msg.status === 'read' ? (
                                  <span title="Read / Seen"><CheckCheck className="w-3.5 h-3.5 text-emerald-300 font-bold" /></span>
                                ) : msg.status === 'delivered' ? (
                                  <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-[#D4D9C8]" /></span>
                                ) : (
                                  <span title="Sent"><Check className="w-3.5 h-3.5 text-[#EAECE5]" /></span>
                                )
                              )}
                            </span>
                          )}
                        </div>

                        {/* Context Menu (Reply & Delete) */}
                        {!isSending && !isFailed && !isDeleted && (
                          <div
                            className={`absolute top-1 ${
                              isMe ? '-left-14' : '-right-14'
                            } opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10`}
                          >
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="p-1.5 bg-white border border-[#DCDDD8] rounded-full text-[#626661] hover:text-[#68734A] shadow-xs cursor-pointer"
                              title="Reply"
                            >
                              <Reply className="w-3 h-3" />
                            </button>
                            {(isMe || currentUser.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteMsg(msg)}
                                className="p-1.5 bg-white border border-[#DCDDD8] rounded-full text-[#626661] hover:text-red-600 shadow-xs cursor-pointer"
                                title="Delete Message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying To Banner */}
            {replyingTo && (
              <div className="bg-[#F0F2EC] px-4 py-2 border-t border-[#D4D9C8] flex items-center justify-between text-xs text-[#30332F] font-medium">
                <span className="truncate">Replying to: {replyingTo.text || 'Attachment'}</span>
                <button onClick={() => setReplyingTo(null)} className="text-[#68734A] hover:text-[#30332F] font-bold p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Attachment Progress Banner */}
            {isUploading && uploadProgress !== null && (
              <div className="bg-[#F0F2EC] px-4 py-2 border-t border-[#D4D9C8] flex items-center justify-between text-xs text-[#30332F] font-semibold animate-pulse">
                <span>Uploading attachment to Firebase Storage... {uploadProgress}%</span>
              </div>
            )}

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="bg-red-50 text-red-700 px-4 py-2 border-t border-red-200 flex items-center justify-between text-xs font-semibold">
                <span>{uploadError}</span>
                <button onClick={() => setUploadError(null)} className="p-1 hover:text-red-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Attachment Selected Preview Banner */}
            {selectedFile && !isUploading && (
              <div className="bg-[#F8F8F6] px-4 py-2.5 border-t border-[#DCDDD8] flex items-center justify-between text-xs text-[#30332F]">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="w-4 h-4 text-[#68734A] shrink-0" />
                  <span className="font-semibold truncate">{selectedFile.name}</span>
                  <span className="text-[#838781] text-[10px]">({formatFileSize(selectedFile.size)})</span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-[#838781] hover:text-red-600 p-1 font-bold cursor-pointer"
                  title="Remove Attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Composer Footer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#DCDDD8] flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAttachmentSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2.5 text-[#626661] hover:text-[#68734A] hover:bg-[#F0F2EC] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={messageText}
                onChange={handleInputChange}
                disabled={isUploading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder={selectedFile ? "Add a caption (optional)..." : "Type a message..."}
                className="flex-1 px-4 py-2.5 bg-[#F8F8F6] border border-[#DCDDD8] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#68734A] focus:outline-none text-[#30332F] placeholder-[#838781]"
              />

              <button
                type="submit"
                disabled={isUploading || (!messageText.trim() && !selectedFile)}
                className="p-2.5 bg-[#68734A] hover:bg-[#58623E] active:bg-[#485132] text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#838781] text-xs">
            Select a conversation thread to start messaging.
          </div>
        )}
      </div>
    </div>
  );
};
