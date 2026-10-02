import { Lock, ShieldCheck, User } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const AdminLoginView: React.FC = () => {
  const { loginAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage("Invalid credentials. Please try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginAdmin(username.trim(), password);
      if (!res.success) {
        setErrorMessage(res.error || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2EF] flex flex-col justify-center items-center p-4">
      {/* Light Professional Executive Login Card */}
      <div className="w-full max-w-md bg-white border border-[#DCDDD8] rounded-2xl shadow-sm p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#68734A] text-white rounded-2xl shadow-xs mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#30332F] tracking-tight">ZT Workspace</h1>
          <p className="text-[#626661] text-xs font-semibold">Admin Panel Authentication</p>
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
              Admin Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#838781]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin Username"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCDDD8] rounded-xl text-[#30332F] placeholder-[#838781] text-sm focus:outline-none focus:ring-2 focus:ring-[#68734A] focus:border-transparent transition-all font-medium"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#30332F] mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#838781]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCDDD8] rounded-xl text-[#30332F] placeholder-[#838781] text-sm focus:outline-none focus:ring-2 focus:ring-[#68734A] focus:border-transparent transition-all font-medium"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-[#68734A] hover:bg-[#58623E] active:bg-[#485132] text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span>Sign In to Admin Panel</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#DCDDD8] text-center">
          <p className="text-[11px] text-[#838781] font-medium">
            Protected ZT Workspace • Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
};
