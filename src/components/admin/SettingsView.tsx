import { Check, Lock, Shield, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

export const SettingsView: React.FC = () => {
  const [appName, setAppName] = useState('ZT Workspace');
  const [requireSecurityToken, setRequireSecurityToken] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workspace System Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure global application parameters, security policies, and branding defaults.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Application Branding Name
          </label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Security & Access Policy</h3>

          <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={requireSecurityToken}
              onChange={(e) => setRequireSecurityToken(e.target.checked)}
              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-xs font-bold text-slate-800">Enforce Secure Access Tokens for Direct Links</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                All client share links will require a cryptographically generated access token (`ztw_live_...`).
              </div>
            </div>
          </label>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">ZT Workspace Engine • Version 2.5</span>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Settings Saved</span>
              </>
            ) : (
              <span>Save System Settings</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
