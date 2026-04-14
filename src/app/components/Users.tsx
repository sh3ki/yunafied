import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Mail, Pencil, Search, Shield, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { AuthUser, UserRole, UserStatus } from '@/app/types/models';

interface ProfileUploadResult {
  secureUrl: string;
  publicId: string;
}

interface CreateUserInput {
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  password: string;
}

interface UpdateUserInput {
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  password?: string;
}

interface UsersProps {
  users: AuthUser[];
  onAddUser: (input: CreateUserInput) => Promise<void>;
  onEditUser: (id: string, input: UpdateUserInput) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onUploadProfileImage: (file: File) => Promise<ProfileUploadResult>;
}

const PAGE_SIZE = 8;

export function UsersView({ users, onAddUser, onEditUser, onDeleteUser, onUploadProfileImage }: UsersProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [page, setPage] = useState(1);

  const [newUser, setNewUser] = useState<CreateUserInput>({
    fullName: '',
    email: '',
    role: 'student',
    status: 'active',
    profileImageUrl: null,
    profileImagePublicId: null,
    password: 'password',
  });

  const [editUser, setEditUser] = useState<UpdateUserInput>({
    fullName: '',
    email: '',
    role: 'student',
    status: 'active',
    profileImageUrl: null,
    profileImagePublicId: null,
    password: '',
  });

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users],
  );

  const filteredUsers = useMemo(() => {
    return sortedUsers.filter((user) => {
      const keyword = searchTerm.trim().toLowerCase();
      const keywordMatch =
        keyword.length === 0 ||
        user.fullName.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword);

      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      const statusMatch = statusFilter === 'all' || user.status === statusFilter;

      return keywordMatch && roleMatch && statusMatch;
    });
  }, [sortedUsers, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, safePage]);

  const resetCreateForm = () => {
    setNewUser({
      fullName: '',
      email: '',
      role: 'student',
      status: 'active',
      profileImageUrl: null,
      profileImagePublicId: null,
      password: 'password',
    });
  };

  const openEdit = (user: AuthUser) => {
    setSelectedUser(user);
    setEditUser({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      profileImageUrl: user.profileImageUrl,
      profileImagePublicId: user.profileImagePublicId,
      password: '',
    });
    setIsEditOpen(true);
  };

  const handleCreate = async () => {
    if (!newUser.fullName || !newUser.email || !newUser.password) {
      toast.error('Please complete all required fields.');
      return;
    }

    try {
      setSaving(true);
      await onAddUser(newUser);
      toast.success('User created successfully.');
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) {
      return;
    }

    if (!editUser.fullName || !editUser.email) {
      toast.error('Please complete all required fields.');
      return;
    }

    try {
      setSaving(true);
      await onEditUser(selectedUser.id, {
        ...editUser,
        password: editUser.password || undefined,
      });
      toast.success('User updated successfully.');
      setIsEditOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteUser(id);
      toast.success('User deleted successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user.');
    }
  };

  const uploadImage = async (file: File, mode: 'create' | 'edit') => {
    try {
      setUploadingImage(true);
      const uploaded = await onUploadProfileImage(file);
      if (mode === 'create') {
        setNewUser((prev) => ({
          ...prev,
          profileImageUrl: uploaded.secureUrl,
          profileImagePublicId: uploaded.publicId,
        }));
      } else {
        setEditUser((prev) => ({
          ...prev,
          profileImageUrl: uploaded.secureUrl,
          profileImagePublicId: uploaded.publicId,
        }));
      }
      toast.success('Profile image uploaded.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload profile image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const getStatusClass = (status: UserStatus) =>
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-amber-50 text-amber-700 border-amber-100';

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
          <p className="text-gray-500">Administrator Module</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email"
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | UserStatus)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-600">Profile</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Email</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Role</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=e0e7ff&color=3730a3`}
                      alt={user.fullName}
                      className="h-10 w-10 rounded-full object-cover border border-gray-200"
                    />
                    <div className="font-medium text-gray-900">{user.fullName}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${
                      user.role === 'admin'
                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                        : user.role === 'teacher'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : 'bg-green-50 text-green-700 border-green-100'
                    }`}
                  >
                    {user.role === 'admin' && <Shield className="h-3 w-3" />}
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${getStatusClass(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => openEdit(user)}
                    className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-indigo-50 rounded-full"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-gray-400 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}

            {paginatedUsers.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-center text-sm text-gray-500" colSpan={5}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Showing {(safePage - 1) * PAGE_SIZE + (paginatedUsers.length ? 1 : 0)} to {(safePage - 1) * PAGE_SIZE + paginatedUsers.length} of {filteredUsers.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-sm rounded border border-gray-200 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">Page {safePage} / {pageCount}</span>
            <button
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="px-3 py-1.5 text-sm rounded border border-gray-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Add New User</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={newUser.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.fullName || 'User')}&background=e0e7ff&color=3730a3`}
                  alt="New user profile"
                  className="h-14 w-14 rounded-full object-cover border border-gray-200"
                />
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
                  <ImagePlus className="h-4 w-4" />
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void uploadImage(file, 'create');
                      }
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border rounded-lg px-3 py-2"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={newUser.status}
                    onChange={(e) => setNewUser({ ...newUser, status: e.target.value as UserStatus })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button disabled={saving || uploadingImage} onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                Save User
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Edit User</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={editUser.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(editUser.fullName || 'User')}&background=e0e7ff&color=3730a3`}
                  alt="Edit user profile"
                  className="h-14 w-14 rounded-full object-cover border border-gray-200"
                />
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
                  <ImagePlus className="h-4 w-4" />
                  {uploadingImage ? 'Uploading...' : 'Change Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void uploadImage(file, 'edit');
                      }
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={editUser.fullName}
                  onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border rounded-lg px-3 py-2"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  value={editUser.password || ''}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value as UserRole })}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={editUser.status}
                    onChange={(e) => setEditUser({ ...editUser, status: e.target.value as UserStatus })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button disabled={saving || uploadingImage} onClick={handleEdit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
