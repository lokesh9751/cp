'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  superuserListUsers,
  superuserUpdateUserRole,
  superuserUpdateBan,
  superuserDeleteUser,
} from '@/lib/api';

export default function SuperuserClient() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Ban modal state
  const [banTarget, setBanTarget] = useState(null);
  const [banType, setBanType] = useState('TEMP'); // 'TEMP' | 'PERMANENT'
  const [banHours, setBanHours] = useState('24');
  const [banReason, setBanReason] = useState('');

  const loadUsers = useCallback(
    async (q = '') => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setAccessDenied(false);
      try {
        const list = await superuserListUsers(q, accessToken);
        setUsers(list);
      } catch (err) {
        if (err?.status === 403 || err?.status === 401) {
          setAccessDenied(true);
        } else {
          toast.error(err?.message || 'Failed to load users');
        }
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (authLoading) return;
    loadUsers('');
  }, [authLoading, loadUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers(search);
  };

  const handleToggleAdmin = async (target) => {
    const nextRole = target.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setUpdatingId(target.id);
    try {
      const updated = await superuserUpdateUserRole(target.id, nextRole, accessToken);
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, role: updated.role } : u))
      );
      toast.success(`@${target.username} is now ${updated.role}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUnban = async (target) => {
    setUpdatingId(target.id);
    try {
      const updated = await superuserUpdateBan(
        target.id,
        { action: 'UNBAN' },
        accessToken
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id
            ? {
              ...u,
              isBanned: updated.isBanned,
              bannedUntil: updated.bannedUntil,
              banReason: updated.banReason,
            }
            : u
        )
      );
      toast.success(`@${target.username} has been unbanned`);
    } catch (err) {
      toast.error(err?.message || 'Failed to unban user');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmBan = async (e) => {
    e.preventDefault();
    if (!banTarget) return;
    setUpdatingId(banTarget.id);
    try {
      const payload =
        banType === 'TEMP'
          ? {
            action: 'TEMP',
            durationHours: Number(banHours),
            reason: banReason.trim(),
          }
          : {
            action: 'PERMANENT',
            reason: banReason.trim(),
          };

      const updated = await superuserUpdateBan(banTarget.id, payload, accessToken);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === banTarget.id
            ? {
              ...u,
              isBanned: updated.isBanned,
              bannedUntil: updated.bannedUntil,
              banReason: updated.banReason,
            }
            : u
        )
      );
      toast.success(
        banType === 'TEMP'
          ? `@${banTarget.username} temporarily banned for ${banHours}h`
          : `@${banTarget.username} permanently banned`
      );
      setBanTarget(null);
      setBanReason('');
    } catch (err) {
      toast.error(err?.message || 'Failed to ban user');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (target) => {
    const confirmed = window.confirm(
      `Permanently delete @${target.username}? This removes their account, submissions, and history.`
    );
    if (!confirmed) return;

    setUpdatingId(target.id);
    try {
      await superuserDeleteUser(target.id, accessToken);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      toast.success(`@${target.username} deleted`);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete account');
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading) {
    return <div className="p-8 text-sm text-text-muted">Checking Superuser permissions...</div>;
  }

  if (!user) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-8 text-center max-w-md mx-auto">
        <h1 className="text-lg font-semibold text-text-primary mb-2">Superuser Sign In Required</h1>
        <Link
          href="/login"
          className="inline-block mt-2 px-4 py-2 text-sm font-medium bg-navy text-white rounded-lg"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (accessDenied || user.role !== 'SUPERUSER') {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-8 text-center max-w-md mx-auto">
        <h1 className="text-lg font-semibold text-error mb-2">Superuser Access Only</h1>
        <p className="text-sm text-text-secondary">
          You do not have permission to manage platform admins.
        </p>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const bannedCount = users.filter((u) => u.isBanned).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Superuser Console</h1>
          <p className="text-sm text-text-secondary">
            Manage platform administrators, account bans, and studios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/problems"
            className="px-3.5 py-2 text-xs font-semibold bg-bg-card border border-border rounded-lg hover:bg-bg-section"
          >
            Problem Studio
          </Link>
          <Link
            href="/admin/contests"
            className="px-3.5 py-2 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy-hover"
          >
            Contest Studio
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Total Users</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{users.length}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Active Admins</p>
          <p className="text-2xl font-bold text-info mt-1">{adminCount}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Banned Accounts</p>
          <p className="text-2xl font-bold text-error mt-1">{bannedCount}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Your Role</p>
          <p className="text-2xl font-bold text-gold mt-1">SUPERUSER</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by username or email..."
          className="flex-1 px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded-lg focus:outline-none focus:border-border-focus"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-lg hover:bg-navy-hover"
        >
          Search
        </button>
      </form>

      {/* Users Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-section border-b border-border text-xs text-text-muted uppercase">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role / Status</th>
                <th className="px-4 py-3">Submissions</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const badge =
                    u.role === 'SUPERUSER'
                      ? 'bg-warning-bg text-warning'
                      : u.role === 'ADMIN'
                        ? 'bg-info-bg text-info'
                        : 'bg-bg-section text-text-secondary';
                  const isBusy = updatingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-row-hover">
                      <td className="px-4 py-3">
                        <Link
                          href={`/u/${u.username}`}
                          className="font-medium text-text-primary hover:text-navy no-underline"
                        >
                          @{u.username}
                        </Link>
                        <p className="text-xs text-text-muted">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${badge}`}>
                            {u.role}
                          </span>
                          {u.isBanned && (
                            <span
                              title={u.banReason || 'Banned'}
                              className="px-2 py-0.5 text-xs font-semibold rounded bg-error-bg text-error"
                            >
                              {u.bannedUntil
                                ? `Temp Ban (${new Date(u.bannedUntil).toLocaleDateString()})`
                                : 'Banned'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                        {u.submissionsCount}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.role === 'SUPERUSER' ? (
                          <span className="text-xs text-text-muted">Protected</span>
                        ) : (
                          <div className="inline-flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleAdmin(u)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${u.role === 'ADMIN'
                                  ? 'bg-bg-section text-text-primary border border-border hover:bg-row-hover'
                                  : 'bg-navy text-white hover:bg-navy-hover'
                                }`}
                            >
                              {u.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                            </button>

                            {u.isBanned ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUnban(u)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-success-bg text-success hover:opacity-90"
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setBanTarget(u);
                                  setBanType('TEMP');
                                  setBanHours('24');
                                  setBanReason('');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-warning-bg text-warning hover:opacity-90"
                              >
                                Ban
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteUser(u)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-error-bg text-error hover:opacity-90"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ban / Temp-Ban Modal */}
      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleConfirmBan}
            className="w-full max-w-md bg-bg-card border border-border rounded-lg p-6 space-y-4"
          >
            <div>
              <h2 className="text-section-title text-text-primary">
                Ban @{banTarget.username}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Active sessions will be revoked immediately.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBanType('TEMP')}
                className={`py-2 text-xs font-semibold rounded-md border transition-colors ${banType === 'TEMP'
                    ? 'bg-navy text-white border-navy'
                    : 'bg-bg-section text-text-secondary border-border'
                  }`}
              >
                Temporary Ban
              </button>
              <button
                type="button"
                onClick={() => setBanType('PERMANENT')}
                className={`py-2 text-xs font-semibold rounded-md border transition-colors ${banType === 'PERMANENT'
                    ? 'bg-error text-white border-error'
                    : 'bg-bg-section text-text-secondary border-border'
                  }`}
              >
                Permanent Ban
              </button>
            </div>

            {banType === 'TEMP' && (
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="8760"
                  required
                  value={banHours}
                  onChange={(e) => setBanHours(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded-lg focus:outline-none focus:border-border-focus"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                maxLength={250}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g., Plagiarism in weekly contest"
                className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded-lg focus:outline-none focus:border-border-focus"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBanTarget(null)}
                className="px-4 py-2 text-xs font-medium border border-border text-text-secondary rounded-lg hover:bg-bg-section"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingId === banTarget.id}
                className="px-4 py-2 text-xs font-semibold bg-error text-white rounded-lg hover:opacity-90"
              >
                {updatingId === banTarget.id ? 'Applying...' : 'Confirm Ban'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}