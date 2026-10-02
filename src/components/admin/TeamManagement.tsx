import { Check, Copy, Edit2, Eye, EyeOff, Plus, RefreshCw, Save, Shield, Slash, Trash2, UserCheck, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createUser, deleteUser, regeneratePortalToken, revokePortalToken, updateUser, updateUserCredentials } from '../../services/workspaceService';
import { User } from '../../types/workspace';

export const TeamManagement: React.FC = () => {
  const { allUsers, workspaces } = useAuth();
  const teamMembers = allUsers.filter(u => u.role === 'team');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [assignedWsIds, setAssignedWsIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Credentials visibility & edit state
  const [showPasswordIds, setShowPasswordIds] = useState<{ [id: string]: boolean }>({});
  const [editingCredsId, setEditingCredsId] = useState<string | null>(null);
  const [editUsernameInput, setEditUsernameInput] = useState('');
  const [editPasswordInput, setEditPasswordInput] = useState('');

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEditCreds = (member: User) => {
    setEditingCredsId(member.id);
    setEditUsernameInput(member.username || '');
    setEditPasswordInput(member.portalPassword || member.passwordHash || 'team123');
  };

  const handleSaveCreds = async (member: User) => {
    if (!editUsernameInput.trim() || !editPasswordInput.trim()) return;

    try {
      await updateUserCredentials(member.id, editUsernameInput.trim(), editPasswordInput.trim());
      setEditingCredsId(null);
    } catch (err) {
      console.error("Failed to save team credentials:", err);
    }
  };

  const handleToggleWorkspace = (wsId: string) => {
    setAssignedWsIds(prev =>
      prev.includes(wsId) ? prev.filter(id => id !== wsId) : [...prev, wsId]
    );
  };

  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;

    setIsSubmitting(true);
    try {
      const passToUse = portalPassword.trim() || 'team123';
      await createUser({
        name,
        username: username.toLowerCase().trim(),
        passwordHash: passToUse,
        portalPassword: passToUse,
        role: 'team',
        status: 'active',
        assignedWorkspaces: assignedWsIds
      });

      setIsModalOpen(false);
      setName('');
      setUsername('');
      setPortalPassword('');
      setAssignedWsIds([]);
    } catch (err) {
      console.error("Error creating team member:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTeamLink = (member: User) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const teamUrl = `${baseUrl}?portal_token=${member.accessToken}`;
    navigator.clipboard.writeText(teamUrl);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevokeTeamToken = async (member: User) => {
    if (confirm(`Revoke team portal access link for "${member.name}"?`)) {
      await revokePortalToken('', member.id);
    }
  };

  const handleRegenerateTeamToken = async (member: User) => {
    if (confirm(`Generate new portal link for "${member.name}"?`)) {
      await regeneratePortalToken('', member.id, true);
    }
  };

  const handleDeleteTeamMember = async (u: User) => {
    if (confirm(`Remove team member "${u.name}" permanently?`)) {
      await deleteUser(u.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Team Members & Account Credentials</h1>
          <p className="text-xs text-slate-500 mt-1">Manage staff portal accounts, view/edit credentials, and generate portal access links.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Team List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Team Accounts ({teamMembers.length})</h3>
        </div>

        {teamMembers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No team members added yet. Click "Add Team Member" to assign staff.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {teamMembers.map((member) => {
              const isRevoked = member.tokenStatus === 'revoked';
              const isEditingCreds = editingCredsId === member.id;
              const isPassVisible = !!showPasswordIds[member.id];
              const currentPass = member.portalPassword || member.passwordHash || 'team123';

              return (
                <div key={member.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{member.name}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                            isRevoked ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {isRevoked ? 'REVOKED' : 'ACTIVE'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Assigned to {member.assignedWorkspaces?.length || 0} Workspaces
                        </p>
                      </div>
                    </div>

                    {/* Account Credential Row */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2 max-w-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 uppercase text-[10px]">Team Member Credentials</span>
                        {!isEditingCreds ? (
                          <button
                            onClick={() => handleStartEditCreds(member)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Credentials</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSaveCreds(member)}
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
                            <span className="font-mono font-bold">{member.username}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Password: </span>
                            <span className="font-mono font-bold">
                              {isPassVisible ? currentPass : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(member.id)}
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyTeamLink(member)}
                      disabled={isRevoked}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === member.id ? 'Copied!' : 'Copy Team Link'}</span>
                    </button>

                    {isRevoked ? (
                      <button
                        onClick={() => handleRegenerateTeamToken(member)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reactivate</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRevokeTeamToken(member)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 flex items-center gap-1 cursor-pointer"
                        title="Revoke Access Link"
                      >
                        <Slash className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteTeamMember(member)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Member"
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

      {/* CREATE TEAM MEMBER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm tracking-tight">Create Team Member Account</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. sarahj"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Set Account Password
                </label>
                <input
                  type="text"
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                  placeholder="e.g. TeamPass2026!"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Assign Workspace Access
                </label>
                {workspaces.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No workspaces created yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 p-2 rounded-xl bg-slate-50">
                    {workspaces.map((ws) => {
                      const isAssigned = assignedWsIds.includes(ws.id);
                      return (
                        <label
                          key={ws.id}
                          className="flex items-center gap-2 p-2 rounded-lg text-xs bg-white border border-slate-200 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => handleToggleWorkspace(ws.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-medium text-slate-800">{ws.title}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span>Create Member Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
