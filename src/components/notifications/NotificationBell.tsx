import { Bell, CheckCheck, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications
} from '../../services/portalService';
import { InAppNotification } from '../../types/portal';

interface NotificationBellProps {
  onNavigate: (tab: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { currentUser, activeWorkspace } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeNotifications(
      currentUser.id,
      activeWorkspace?.id || null,
      (list) => setNotifications(list)
    );
    return () => unsub();
  }, [currentUser, activeWorkspace]);

  if (!currentUser) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleItemClick = async (notif: InAppNotification) => {
    await markNotificationRead(notif.id);
    setIsOpen(false);
    if (notif.linkTab) {
      onNavigate(notif.linkTab);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(currentUser.id);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[#626661] hover:text-[#30332F] hover:bg-[#F0F2EC] rounded-xl transition-all cursor-pointer relative"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-[#68734A]" />
        {unreadCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center absolute -top-0.5 -right-0.5 border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-[#DCDDD8] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-2 border-b border-[#DCDDD8] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#30332F] uppercase tracking-wider">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold bg-red-50 text-red-700 px-1.5 py-0.2 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-[#68734A] hover:underline cursor-pointer flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark Read</span>
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-[#DCDDD8]/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-[#838781] text-xs">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3 text-xs cursor-pointer hover:bg-[#F8F8F6] transition-colors ${
                    !n.read ? 'bg-[#F0F2EC]/60 font-medium' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-[#68734A]">{n.title}</span>
                    <span className="text-[9px] text-[#838781]">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[#30332F] text-[11px] leading-snug line-clamp-2">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
