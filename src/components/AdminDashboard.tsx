import { useEffect, useState } from 'react';
import { Shield, Trash2, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://localhost:8000';

export function AdminDashboard() {
    // const { t } = useLanguage();
    const { token } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [newRole, setNewRole] = useState('');
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'danger' } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

    const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
        setConfirmDialog({ title, message, onConfirm });
    };

    const showToast = (message: string, type: 'success' | 'info' | 'danger' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        askConfirmation(
            'Purge User Record',
            'Are you sure you want to permanently delete this user? This action will immediately terminate all access and cannot be undone.',
            async () => {
                try {
                    const res = await fetch(`${API_URL}/api/users/${userId}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (res.ok) {
                        setUsers(users.filter(u => u.id !== userId));
                        showToast('User record purged from system', 'danger');
                    } else {
                        showToast('Failed to purge user record', 'info');
                    }
                } catch (error) {
                    console.error('Error deleting user:', error);
                    showToast('System relay error: Protocol aborted', 'info');
                }
            }
        );
    };

    const handleUpdateRole = async (userId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
                setEditingUser(null);
                showToast(`Privileges updated to ${newRole}`, 'success');
            } else {
                showToast('Failed to reassign privileges', 'info');
            }
        } catch (error) {
            console.error('Error updating role:', error);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-300">System user management</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{users.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-green-500">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Students</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{users.filter(u => u.role === 'student').length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-orange-500">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Teachers</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{users.filter(u => u.role === 'teacher').length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-purple-500">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Doctors</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{users.filter(u => u.role === 'doctor').length}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex gap-4 items-center">
                    <Shield className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Users</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{user.full_name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {editingUser === user.id ? (
                                                <select
                                                    value={newRole}
                                                    onChange={(e) => setNewRole(e.target.value)}
                                                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                >
                                                    <option value="student">Student</option>
                                                    <option value="teacher">Teacher</option>
                                                    <option value="doctor">Doctor</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300' :
                                                        user.role === 'doctor' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' :
                                                            user.role === 'teacher' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300' :
                                                                'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'}`}>
                                                    {user.role}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {editingUser === user.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleUpdateRole(user.id)} className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300">
                                                        <Save className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setEditingUser(null)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(user.id);
                                                            setNewRole(user.role);
                                                        }}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Global Toast Notification */}
            {notification && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-fade-in">
                    <div className={`px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 border backdrop-blur-xl transition-all ${notification.type === 'success' ? 'bg-emerald-600/90 border-emerald-500 text-white' :
                        notification.type === 'danger' ? 'bg-rose-600/90 border-rose-500 text-white' :
                            'bg-blue-600/90 border-blue-500 text-white'
                        }`}>
                        <div className="p-2.5 bg-white/20 rounded-full">
                            {notification.type === 'success' ? <Shield size={20} /> :
                                notification.type === 'danger' ? <Trash2 size={20} /> :
                                    <Edit size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Admin Protocol</p>
                            <p className="font-bold text-sm tracking-wide">{notification.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-3xl w-full max-w-sm p-10 border-4 border-white dark:border-gray-700 animate-scale-in text-center">
                        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600">
                            <Shield size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{confirmDialog.title}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={() => {
                                    confirmDialog.onConfirm();
                                    setConfirmDialog(null);
                                }}
                                className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-200 dark:shadow-none transition-all active:scale-95"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
