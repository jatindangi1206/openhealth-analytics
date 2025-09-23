import React, { useEffect, useState } from 'react';

export default function Admin({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pwdMap, setPwdMap] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load users');
      const json = await res.json();
      setUsers(json.users || []);
    } catch (e) {
      setError(e.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const resetPassword = async (username) => {
    const newPwd = pwdMap[username];
    if (!newPwd) { alert('Enter a new password first'); return; }
    const res = await fetch('/admin/users/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, new_password: newPwd }),
    });
    if (!res.ok) {
      alert('Failed to reset password');
      return;
    }
    alert('Password updated');
    setPwdMap({ ...pwdMap, [username]: '' });
  };

  const deleteUser = async (username) => {
    if (!confirm(`Delete user ${username}?`)) return;
    const res = await fetch(`/admin/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { alert('Failed to delete user'); return; }
    setUsers(users.filter(u => u.username !== username));
  };

  if (loading) return <div>Loading users…</div>;
  if (error) return <div style={{ color: '#b91c1c' }}>{error}</div>;

  return (
    <div>
      <h2 className="swiss-subtitle">Admin: Users</h2>
      <button className="sidebar-btn" onClick={fetchUsers} style={{ marginBottom: 12 }}>Refresh</button>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '8px' }}>Username</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '8px' }}>Participant</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '8px' }}>Role</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '8px' }}>Created</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{u.username}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{u.participant_id}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{u.role}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{u.created_at}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
                  <input
                    placeholder="New password"
                    value={pwdMap[u.username] || ''}
                    onChange={(e) => setPwdMap({ ...pwdMap, [u.username]: e.target.value })}
                    style={{ marginRight: 8 }}
                  />
                  <button className="sidebar-btn" onClick={() => resetPassword(u.username)} style={{ marginRight: 8 }}>Reset</button>
                  {u.username !== 'admin' && (
                    <button className="sidebar-btn" onClick={() => deleteUser(u.username)} style={{ background: '#b91c1c', color: 'white' }}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}