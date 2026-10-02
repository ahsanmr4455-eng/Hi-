import { KeyRound, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Workspace } from '../../types/workspace';

interface PortalLoginViewProps {
  portalType: 'client' | 'team';
  workspace?: Workspace;
  targetUser?: User;
  portalToken: string;
}

export const PortalLoginView: React.FC<PortalLoginViewProps> = ({
  portalType,
  workspace,
  targetUser,
  portalToken
}) => {
  const { authenticatePortalWithPassword } = useAuth();
  const [portalPassword, setPortalPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const portalTitle = workspace?.title || targetUser?.name || 'ZT Workspace Portal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!portalPassword.trim()) {
      setErrorMessage("Please enter your workspace password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authenticatePortalWithPassword(portalToken, portalPassword.trim());
      if (!res.success) {
        setErrorMessage(res.error || "Invalid workspace password. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Invalid workspace password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2EF] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-[#DCDDD8] rounded-2xl shadow-sm p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#68734A] text-white rounded-2xl shadow-xs mb-1">
            {portalType === 'team' ? <UserCheck className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
          </div>
          <h1 className="text-xl font-bold text-[#30332F] tracking-tight">{portalTitle}</h1>
          <p className="text-[#626661] text-xs font-semibold uppercase tracking-wider">
            {portalType === 'team' ? 'ZT Workspace Team Member Portal' : 'ZT Workspace Client Portal'}
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#30332F] mb-1.5 uppercase tracking-wider">
              Enter Workspace Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#838781]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={portalPassword}
                onChange={(e) => setPortalPassword(e.target.value)}
                placeholder="Enter password provided by Admin"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCDDD8] rounded-xl text-[#30332F] placeholder-[#838781] text-sm focus:outline-none focus:ring-2 focus:ring-[#68734A] focus:border-transparent transition-all font-medium"
                autoFocus
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-[#68734A] hover:bg-[#58623E] active:bg-[#485132] text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span>Unlock Workspace</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#DCDDD8] text-center">
          <p className="text-[11px] text-[#838781] font-medium">
            Contact your Workspace Administrator if you require a password reset.
          </p>
        </div>
      </div>
    </div>
  );
};
