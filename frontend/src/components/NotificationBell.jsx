import { useState, useEffect, useRef } from 'react';
import { getNotifications, markAllNotificationsRead } from '../api';

// ============================================================================
// NOTIFICATION BELL
// Replaces: static/notifications.js
// ============================================================================

export default function NotificationBell({ role, userId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const previousUnreadRef = useRef(0);
  const initializedRef = useRef(false);

  const unread = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications(role, userId);
      const nextNotifications = data.notifications || [];
      const nextUnread = nextNotifications.filter((notification) => !notification.read).length;
      if (initializedRef.current && nextUnread > previousUnreadRef.current) {
        playNotificationSound();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('careline:notifications-updated', {
          detail: {
            role,
            userId,
            notifications: nextNotifications,
            unread: nextUnread,
          },
        }));
      }
      previousUnreadRef.current = nextUnread;
      initializedRef.current = true;
      setNotifications(nextNotifications);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [role, userId]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(role, userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    previousUnreadRef.current = 0;
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '1.4rem', position: 'relative', padding: '4px 8px'
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: 'red', color: 'white', borderRadius: '50%',
            fontSize: '0.65rem', padding: '2px 5px', fontWeight: 'bold'
          }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '110%', width: 320,
          background: 'white', border: '1px solid #ddd', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 1000,
          maxHeight: 400, overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderBottom: '1px solid #eee'
          }}>
            <strong>Notifications</strong>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ fontSize: '0.75rem', color: '#007bff', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p style={{ padding: 14, color: '#888', margin: 0 }}>No notifications</p>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={{
                padding: '10px 14px', borderBottom: '1px solid #f0f0f0',
                background: n.read ? 'white' : '#f0f7ff'
              }}>
                <div style={{ fontWeight: n.read ? 'normal' : 'bold', fontSize: '0.85rem' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#555', marginTop: 2 }}>
                  {n.message}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function playNotificationSound() {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.18);

  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.22);
  oscillator.onended = () => {
    audioContext.close().catch(() => {});
  };
}
