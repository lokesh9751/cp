'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { superuserListUsers, superuserUpdateUserRole } from '@/lib/api';

export default function SuperuserClient() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = useCallback(async (q = '') => {
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
  }, [accessToken]);

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
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, role: updated.role } : u)));
      toast.success(`@${target.username} is now ${updated.role}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to update role');
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
        <Link href="/login" className="inline-block mt-2 px-4 py-2 text-sm font-medium bg-navy text-white rounded-lg">
          Go to Login
        </Link>
      </div>
    );
  }

  if (accessDenied || user.role !== 'SUPERUSER') {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-8 text-center max-w-md mx-auto">
        <h1 className="text-lg font-semibold text-error mb-2">Superuser Access Only</h1>
        <p className="text-sm text-text-secondary">You do not have permission to manage platform admins.</p>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Superuser Console</h1>
          <p className="text-sm text-text-secondary">
            Manage platform administrators and access all studios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/problems" className="px-3.5 py-2 text-xs font-semibold bg-bg-card border border-border rounded-lg hover:bg-bg-section">
            Problem Studio
          </Link>
          <Link href="/admin/contests" className="px-3.5 py-2 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy-hover">
            Contest Studio
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Total Users</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{users.length}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Active Admins</p>
          <p className="text-2xl font-bold text-info mt-1">{adminCount}</p>
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
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-lg hover:bg-navy-hover">
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
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Submissions</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted">No users found.</td>
                </tr>
              ) : (
                users.map((u) => {
                  const badge =
                    u.role === 'SUPERUSER'
                      ? 'bg-warning-bg text-warning'
                      : u.role === 'ADMIN'
                        ? 'bg-info-bg text-info'
                        : 'bg-bg-section text-text-secondary';
                  return (
                    <tr key={u.id} className="hover:bg-row-hover">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">@{u.username}</p>
                        <p className="text-xs text-text-muted">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${badge}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{u.submissionsCount}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.role === 'SUPERUSER' ? (
                          <span className="text-xs text-text-muted">Protected</span>
                        ) : (
                          <button
                            type="button"
                            disabled={updatingId === u.id}
                            onClick={() => handleToggleAdmin(u)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                              u.role === 'ADMIN'
                                ? 'bg-error-bg text-error hover:opacity-90'
                                : 'bg-navy text-white hover:bg-navy-hover'
                            }`}
                          >
                            {updatingId === u.id
                              ? 'Updating...'
                              : u.role === 'ADMIN'
                                ? 'Remove Admin'
                                : 'Make Admin'}
                          </button>
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
    </div>
  );
}
