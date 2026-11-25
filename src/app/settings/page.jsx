'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
    updateProfile,
    changeEmailApi,
    changePasswordApi,
    deleteAccountApi,
} from '@/lib/api';

export default function SettingsPage() {
    const router = useRouter();
    const { user, accessToken, isLoading, refresh, updateUser, logout } = useAuth();

    // Username state
    const [username, setUsername] = useState(user?.username || '');
    const [nameBusy, setNameBusy] = useState(false);
    const [nameMsg, setNameMsg] = useState('');
    const [nameErr, setNameErr] = useState('');

    // Email state
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [emailBusy, setEmailBusy] = useState(false);
    const [emailMsg, setEmailMsg] = useState('');
    const [emailErr, setEmailErr] = useState('');

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passBusy, setPassBusy] = useState(false);
    const [passMsg, setPassMsg] = useState('');
    const [passErr, setPassErr] = useState('');

    // Delete state
    const [confirmDelete, setConfirmDelete] = useState('');
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteErr, setDeleteErr] = useState('');

    const runAuthed = useCallback(
        async (fn) => {
            try {
                return await fn(accessToken);
            } catch (err) {
                if (err?.status === 401 && refresh) {
                    const newToken = await refresh();
                    if (newToken) return await fn(newToken);
                }
                throw err;
            }
        },
        [accessToken, refresh]
    );

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 animate-pulse space-y-4">
                <div className="h-8 bg-border-strong rounded w-40" />
                <div className="h-44 bg-bg-card border border-border rounded-lg" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-md mx-auto my-12 bg-bg-card border border-border rounded-lg p-8 text-center">
                <h1 className="text-section-title text-text-primary mb-2">Log in to manage settings</h1>
                <Link
                    href="/login"
                    className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-navy text-white rounded-lg hover:bg-navy-hover no-underline mt-4"
                >
                    Log in
                </Link>
            </div>
        );
    }

    const handleUsernameSubmit = async (e) => {
        e.preventDefault();
        setNameBusy(true);
        setNameMsg('');
        setNameErr('');
        try {
            const updated = await runAuthed((token) =>
                updateProfile({ username: username.trim().toLowerCase() }, token)
            );
            updateUser?.({ username: updated.username });
            setUsername(updated.username);
            setNameMsg('Username updated.');
        } catch (err) {
            setNameErr(err?.message || 'Could not update username.');
        } finally {
            setNameBusy(false);
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setEmailBusy(true);
        setEmailMsg('');
        setEmailErr('');
        try {
            const { user: updated } = await runAuthed((token) =>
                changeEmailApi(
                    { newEmail: newEmail.trim().toLowerCase(), currentPassword: emailPassword },
                    token
                )
            );
            updateUser?.({ email: updated.email });
            setNewEmail('');
            setEmailPassword('');
            setEmailMsg('Gmail updated successfully.');
        } catch (err) {
            setEmailErr(err?.message || 'Could not update Gmail.');
        } finally {
            setEmailBusy(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPassMsg('');
        setPassErr('');

        if (newPassword !== confirmPassword) {
            setPassErr('New passwords do not match.');
            return;
        }

        setPassBusy(true);
        try {
            await runAuthed((token) =>
                changePasswordApi({ currentPassword, newPassword }, token)
            );
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPassMsg('Password updated successfully.');
        } catch (err) {
            setPassErr(err?.message || 'Could not update password.');
        } finally {
            setPassBusy(false);
        }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        if (confirmDelete !== 'DELETE') {
            setDeleteErr('Please type DELETE to confirm.');
            return;
        }

        setDeleteBusy(true);
        setDeleteErr('');
        try {
            await runAuthed((token) => deleteAccountApi({ confirmText: 'DELETE' }, token));
            await logout();
            router.push('/signup');
        } catch (err) {
            setDeleteErr(err?.message || 'Could not delete account.');
            setDeleteBusy(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            <div>
                <h1 className="text-page-title text-text-primary">Account Settings</h1>
                <p className="text-small text-text-secondary mt-1">
                    Manage your username, Gmail address, password, and account deletion.
                </p>
            </div>

            {/* 1. Change Username */}
            <form onSubmit={handleUsernameSubmit} className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-section-title text-text-primary">Change Username</h2>
                <div>
                    <label htmlFor="settings-username" className="block text-small font-medium text-text-primary mb-1.5">
                        Username
                    </label>
                    <input
                        id="settings-username"
                        type="text"
                        required
                        minLength={3}
                        maxLength={20}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={user.username}
                        className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy"
                    />
                </div>
                {nameMsg && <p className="text-small text-success">{nameMsg}</p>}
                {nameErr && <p className="text-small text-error">{nameErr}</p>}
                <button
                    type="submit"
                    disabled={nameBusy}
                    className="px-4 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors disabled:opacity-50"
                >
                    {nameBusy ? 'Saving...' : 'Update username'}
                </button>
            </form>

            {/* 2. Change Gmail */}
            <form onSubmit={handleEmailSubmit} className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
                <div>
                    <h2 className="text-section-title text-text-primary">Change Gmail</h2>
                    <p className="text-xs text-text-muted mt-0.5">Current: {user.email}</p>
                </div>
                <div className="space-y-3">
                    <div>
                        <label htmlFor="settings-email" className="block text-small font-medium text-text-primary mb-1.5">
                            New @gmail.com address
                        </label>
                        <input
                            id="settings-email"
                            type="email"
                            required
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="newname@gmail.com"
                            className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy"
                        />
                    </div>
                    <div>
                        <label htmlFor="settings-email-pass" className="block text-small font-medium text-text-primary mb-1.5">
                            Current password
                        </label>
                        <input
                            id="settings-email-pass"
                            type="password"
                            required
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy"
                        />
                    </div>
                </div>
                {emailMsg && <p className="text-small text-success">{emailMsg}</p>}
                {emailErr && <p className="text-small text-error">{emailErr}</p>}
                <button
                    type="submit"
                    disabled={emailBusy}
                    className="px-4 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors disabled:opacity-50"
                >
                    {emailBusy ? 'Updating...' : 'Update Gmail'}
                </button>
            </form>

            {/* 3. Change Password */}
            <form onSubmit={handlePasswordSubmit} className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-section-title text-text-primary">Change Password</h2>
                <div className="space-y-3">
                    <div>
                        <label htmlFor="settings-cur-pass" className="block text-small font-medium text-text-primary mb-1.5">
                            Current password
                        </label>
                        <input
                            id="settings-cur-pass"
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy"
                        />
                    </div>
                    <div>
                        <label htmlFor="settings-new-pass" className="block text-small font-medium text-text-primary mb-1.5">
                            New password (min 8 characters)
                        </label>
                        <input
                            id="settings-new-pass"
                            type="password"
                            required
                            minLength={8}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy"
                        />
                    </div>
                    <div>
                        <label htmlFor="settings-confirm-pass" className="block text-small font-medium text-text-primary mb-1.5">
                            Confirm new password
                        </label>
                        <input
                            id="settings-confirm-pass"
                            type="password"
                            required
                            minLength={8}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy"
                        />
                    </div>
                </div>
                {passMsg && <p className="text-small text-success">{passMsg}</p>}
                {passErr && <p className="text-small text-error">{passErr}</p>}
                <button
                    type="submit"
                    disabled={passBusy}
                    className="px-4 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors disabled:opacity-50"
                >
                    {passBusy ? 'Updating...' : 'Update password'}
                </button>
            </form>

            {/* 4. Danger Zone — Delete Account */}
            <form onSubmit={handleDeleteAccount} className="bg-bg-card border border-error/50 rounded-lg p-6 space-y-4">
                <div>
                    <h2 className="text-section-title text-error">Delete Account</h2>
                    <p className="text-small text-text-secondary mt-1">
                        This permanently deletes your account, submissions, friends, and messages. This cannot be undone.
                    </p>
                </div>
                <div>
                    <label htmlFor="settings-delete" className="block text-small font-medium text-text-primary mb-1.5">
                        Type <span className="font-mono font-semibold text-error">DELETE</span> to confirm
                    </label>
                    <input
                        id="settings-delete"
                        type="text"
                        required
                        value={confirmDelete}
                        onChange={(e) => setConfirmDelete(e.target.value)}
                        placeholder="DELETE"
                        className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-error"
                    />
                </div>
                {deleteErr && <p className="text-small text-error">{deleteErr}</p>}
                <button
                    type="submit"
                    disabled={deleteBusy || confirmDelete !== 'DELETE'}
                    className="px-4 py-2 text-small font-medium bg-error text-white rounded-lg transition-opacity disabled:opacity-40"
                >
                    {deleteBusy ? 'Deleting...' : 'Permanently delete account'}
                </button>
            </form>
        </div>
    );
}