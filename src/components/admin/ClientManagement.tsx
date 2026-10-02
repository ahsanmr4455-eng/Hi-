import { Check, CheckCircle2, Copy, Edit2, Eye, EyeOff, KeyRound, Lock, Plus, RefreshCw, Save, Shield, Slash, Trash2, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import { DEFAULT_FOLDER_CATEGORIES, WORKSPACE_SECTION_CATEGORIES } from '../../constants/sections';
import { useAuth } from '../../context/AuthContext';
import {
  createWorkspaceWithStructure,
  createUser,
  deleteWorkspace,
  regeneratePortalToken,
  revokePortalToken,
  updateUser,
  updateUserCredentials,
  updateWorkspace,
  updateWorkspaceCredentials
} from '../../services/workspaceService';
import { Workspace } from '../../types/workspace';

interface ClientManagementProps {
  isOpenCreateModal: boolean;
  onCloseCreateModal: () => void;
}

export const ClientManagement: React.FC<ClientManagementProps> = ({ isOpenCreateModal, onCloseCreateModal }) => {
  const { allUsers, workspaces, currentUser } = useAuth();
  const clients = allUsers.filter(u => u.role === 'client');

  // Wizard state (8 Steps)
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState('');
  const [username, setUsername] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [workspaceTitle, setWorkspaceTitle] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([
    'overview', 'projects', 'files_docs', 'chat_comm'
  ]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([
    'Project Files', 'Final Deliverables', 'Documents', 'Brand Assets'
  ]);

  const [createdWorkspace, setCreatedWorkspace] = useState<Workspace | null>(null);
  const [createdLink, setCreatedLink] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit Workspace & Credentials state
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [showPasswordIds, setShowPasswordIds] = useState<{ [id: string]: boolean }>({});
  const [editingCredsId, setEditingCredsId] = useState<string | null>(null);
  const [editUsernameInput, setEditUsernameInput] = useState('');
  const [editPasswordInput, setEditPasswordInput] = useState('');

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEditCreds = (ws: Workspace, clientUser?: any) => {
    setEditingCredsId(ws.id);
    setEditUsernameInput(ws.clientUsername || clientUser?.username || '');
    setEditPasswordInput(ws.portalPassword || clientUser?.portalPassword || 'client123');
  };

  const handleSaveCreds = async (ws: Workspace, clientUser?: any) => {
    if (!editUsernameInput.trim() || !editPasswordInput.trim()) return;

    try {
      await updateWorkspaceCredentials(ws.id, editUsernameInput.trim(), editPasswordInput.trim());
      if (clientUser) {
        await updateUserCredentials(clientUser.id, editUsernameInput.trim(), editPasswordInput.trim());
      }
      setEditingCredsId(null);
    } catch (err) {
      console.error("Failed to save client credentials:", err);
    }
  };

  const handleToggleSection = (sectionId: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId]
    );
  };

  const handleToggleFolder = (folderCat: string) => {
    setSelectedFolders(prev =>
      prev.includes(folderCat) ? prev.filter(f => f !== folderCat) : [...prev, folderCat]
    );
  };

  const handleResetWizard = () => {
    setStep(1);
    setClientName('');
    setUsername('');
    setPortalPassword('');
    setWorkspaceTitle('');
    setSelectedSections(['overview', 'projects', 'files_docs', 'chat_comm']);
    setSelectedFolders(['Project Files', 'Final Deliverables', 'Documents', 'Brand Assets']);
    setCreatedWorkspace(null);
    setCreatedLink('');
    setIsSubmitting(false);
  };

  const handleCreateClientSubmit = async () => {
    setIsSubmitting(true);
    try {
      const passwordToUse = portalPassword.trim() || 'client123';

      // 1. Create Client User in Firestore
      const newClientUser = await createUser({
        name: clientName,
        username,
        passwordHash: passwordToUse,
        portalPassword: passwordToUse,
        role: 'client',
        status: 'active',
        assignedWorkspaces: []
      });

      // 2. Create Workspace and Auto-Generate Folders
      const newWs = await createWorkspaceWithStructure(
        workspaceTitle || `${clientName} Workspace`,
        newClientUser.id,
        newClientUser.username,
        passwordToUse,
        selectedSections,
        selectedFolders,
        currentUser?.name || 'Admin',
        'admin'
      );

      // 3. Update client user assigned workspaces
      await updateUser(newClientUser.id, {
        assignedWorkspaces: [newWs.id]
      });

      const accessUrl = `${window.location.origin}${window.location.pathname}?portal_token=${newWs.accessToken}`;
      setCreatedWorkspace(newWs);
      setCreatedLink(accessUrl);
      setStep(8);
    } catch (err) {
      console.error("Error creating client:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRevoke = async (ws: Workspace) => {
    if (confirm(`Revoke portal token for "${ws.title}"? Users with this link will immediately be blocked.`)) {
      await revokePortalToken(ws.id, ws.clientId);
    }
  };

  const handleRegenerate = async (ws: Workspace) => {
    if (confirm(`Generate new portal token for "${ws.title}"?`)) {
      await regeneratePortalToken(ws.id, ws.clientId, false);
    }
  };

  const handleDeleteClient = async (ws: Workspace) => {
    if (confirm(`Delete client workspace "${ws.title}" permanently?`)) {
      await deleteWorkspace(ws.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Account & Workspace Management</h1>
          <p className="text-xs text-slate-500 mt-1">Manage client credentials, workspace titles, and unique portal links.</p>
        </div>
        <button
          onClick={() => { handleResetWizard(); onCloseCreateModal(); }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Client Account</span>
        </button>
      </div>

      {/* Active Workspaces & Credentials List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Client Accounts & Credentials ({workspaces.length})</h3>
        </div>

        {workspaces.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No client accounts created yet. Click "New Client Account" to get started.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {workspaces.map((ws) => {
              const matchedClient = clients.find(c => c.id === ws.clientId || c.username === ws.clientUsername);
              const accessUrl = `${window.location.origin}${window.location.pathname}?portal_token=${ws.accessToken}`;
              const isRevoked = ws.tokenStatus === 'revoked';
              const isEditingCreds = editingCredsId === ws.id;
              const isPassVisible = !!showPasswordIds[ws.id];

              const currentPass = ws.portalPassword || matchedClient?.portalPassword || 'client123';
              const currentUsername = ws.clientUsername || matchedClient?.username || 'client';

              return (
                <div key={ws.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{ws.title}</h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        isRevoked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isRevoked ? 'REVOKED' : 'ACTIVE'}
                      </span>
                    </div>

                    {/* Account Credential Row */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2 max-w-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 uppercase text-[10px]">Account Credentials</span>
                        {!isEditingCreds ? (
                          <button
                            onClick={() => handleStartEditCreds(ws, matchedClient)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Credentials</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSaveCreds(ws, matchedClient)}
                            className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save Changes</span>
                          </button>
                        )}
                      </div>

                      {isEditingCreds ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Username</label>
                            <input
                              type="text"
                              value={editUsernameInput}
                              onChange={(e) => setEditUsernameInput(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Password</label>
                            <input
                              type="text"
                              value={editPasswordInput}
                              onChange={(e) => setEditPasswordInput(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-4 text-slate-700">
                          <div>
                            <span className="text-slate-400">Username: </span>
                            <span className="font-mono font-bold">{currentUsername}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Password: </span>
                            <span className="font-mono font-bold">
                              {isPassVisible ? currentPass : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(ws.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              title={isPassVisible ? 'Hide Password' : 'Show Password'}
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(accessUrl)}
                      disabled={isRevoked}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Access Link</span>
                    </button>

                    {isRevoked ? (
                      <button
                        onClick={() => handleRegenerate(ws)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reactivate Token</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRevoke(ws)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 flex items-center gap-1 cursor-pointer"
                        title="Revoke Token"
                      >
                        <Slash className="w-3.5 h-3.5" />
                        <span>Revoke Access</span>
                      </button>
                    )}

                    <button
                      onClick={() => setEditingWorkspace(ws)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Workspace Title"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteClient(ws)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Client Workspace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE CLIENT WIZARD MODAL */}
      {isOpenCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm tracking-tight">Create Client Workspace</h3>
              </div>
              <button
                onClick={() => { handleResetWizard(); onCloseCreateModal(); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Step {step} of 8</span>
              <span className="text-indigo-600 uppercase font-bold">
                {step === 1 && 'Client Name'}
                {step === 2 && 'Username'}
                {step === 3 && 'Set Password'}
                {step === 4 && 'Workspace Title'}
                {step === 5 && 'Select Services'}
                {step === 6 && 'Select Folders'}
                {step === 7 && 'Review & Create'}
                {step === 8 && 'Completed'}
              </span>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {step === 1 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Step 1: Client Name</h4>
                  <p className="text-xs text-slate-500">Enter full client company or contact name.</p>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. ABC Electric Inc."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Step 2: Username</h4>
                  <p className="text-xs text-slate-500">Assign a unique username identifier.</p>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="e.g. abcelectric"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Step 3: Account Password</h4>
                  <p className="text-xs text-slate-500">Set the password for this client account.</p>
                  <input
                    type="text"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                    placeholder="e.g. ClientPass2026!"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Step 4: Workspace Title</h4>
                  <p className="text-xs text-slate-500">Custom title displayed on client's portal header.</p>
                  <input
                    type="text"
                    value={workspaceTitle}
                    onChange={(e) => setWorkspaceTitle(e.target.value)}
                    placeholder="e.g. ABC Electric — Client Workspace"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Step 5: Enabled Services & Sections</h4>
                    <p className="text-xs text-slate-500">Select visible sections. System automatically builds corresponding folder structures!</p>
                  </div>

                  <div className="space-y-4">
                    {WORKSPACE_SECTION_CATEGORIES.map((catGroup) => (
                      <div key={catGroup.category} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                        <h5 className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-2.5">{catGroup.category}</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catGroup.sections.map((sec) => {
                            const isSelected = selectedSections.includes(sec.id);
                            return (
                              <label
                                key={sec.id}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSection(sec.id)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <div className="font-semibold">{sec.label}</div>
                                  <div className="text-[10px] text-slate-400 font-normal leading-tight">{sec.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Step 6: Default Folder Categories</h4>
                    <p className="text-xs text-slate-500">Select initial folder categories for this workspace repository.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DEFAULT_FOLDER_CATEGORIES.map((cat) => {
                      const isSelected = selectedFolders.includes(cat);
                      return (
                        <label
                          key={cat}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleFolder(cat)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{cat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Step 7: Confirm & Create Workspace</h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                    <p><span className="font-bold text-slate-700">Client Name:</span> {clientName}</p>
                    <p><span className="font-bold text-slate-700">Username:</span> {username}</p>
                    <p><span className="font-bold text-slate-700">Password:</span> <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{portalPassword || 'client123'}</span></p>
                    <p><span className="font-bold text-slate-700">Workspace Title:</span> {workspaceTitle || `${clientName} Workspace`}</p>
                  </div>
                </div>
              )}

              {step === 8 && createdWorkspace && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Client Workspace Created Successfully!</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Share the unique access link and account credentials with your client.
                  </p>

                  <div className="p-3 bg-slate-900 rounded-xl text-left font-mono text-xs text-indigo-300 break-all border border-slate-800">
                    {createdLink}
                  </div>

                  <p className="text-xs text-slate-700 font-bold">
                    Username: <span className="font-mono bg-slate-100 px-2 py-1 rounded border border-slate-300 mr-3">{username}</span>
                    Password: <span className="font-mono bg-slate-100 px-2 py-1 rounded border border-slate-300">{portalPassword || 'client123'}</span>
                  </p>

                  <button
                    onClick={() => handleCopyLink(createdLink)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedLink ? 'Access Link Copied!' : 'Copy Access Link'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {step < 8 && step > 1 ? (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  Back
                </button>
              ) : <div></div>}

              {step < 7 && (
                <button
                  onClick={() => {
                    if (step === 1 && !clientName.trim()) return alert("Please enter client name");
                    if (step === 2 && !username.trim()) return alert("Please enter username");
                    if (step === 3 && !portalPassword.trim()) return alert("Please set password");
                    setStep(s => s + 1);
                  }}
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  Next Step
                </button>
              )}

              {step === 7 && (
                <button
                  onClick={handleCreateClientSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span>Create Workspace</span>
                  )}
                </button>
              )}

              {step === 8 && (
                <button
                  onClick={() => { handleResetWizard(); onCloseCreateModal(); }}
                  className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT WORKSPACE MODAL */}
      {editingWorkspace && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit Workspace Title</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Workspace Title
              </label>
              <input
                type="text"
                defaultValue={editingWorkspace.title}
                id="editTitleInput"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingWorkspace(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const titleEl = document.getElementById('editTitleInput') as HTMLInputElement;
                  if (titleEl && titleEl.value.trim()) {
                    await updateWorkspace(editingWorkspace.id, {
                      title: titleEl.value.trim()
                    });
                    setEditingWorkspace(null);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 cursor-pointer"
              >
                Save Title
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
