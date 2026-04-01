import { useState, useEffect } from 'react';
import { getNotifications, markAllNotificationsRead } from '../api';

// ============================================================================
// NOTIFICATION BELL
// Replaces: static/notifications.js
// ============================================================================

export default function NotificationBell({ role, userId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const unread = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications(role, userId);
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [role, userId]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(role, userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
