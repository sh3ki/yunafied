import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, ImagePlus, Mail, Pencil, Search, Shield, Trash2, Upload, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { AuthUser, UserRole, UserStatus } from '@/app/types/models';
import { apiClient } from '@/app/services/apiClient';
import { PrintButton, TableFilter, TablePagination, TableSearch, printTableReport, DEFAULT_TABLE_PAGE_SIZE } from './ui/table-tools';

interface ProfileUploadResult {
  secureUrl: string;
  publicId: string;
}

interface CreateUserInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  password: string;
}

interface UpdateUserInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  password?: string;
  mobileNumber?: string;
  birthdate?: string;
  professionalTitle?: string;
  employmentStatus?: string;
  yearsExperience?: string;
  specializations?: string[];
  education?: string;
  certifications?: string;
  availability?: { dayOfWeek: number; startTime: string; endTime: string }[];
}

interface UsersProps {
  users: AuthUser[];
  onAddUser: (input: CreateUserInput) => Promise<void>;
  onEditUser: (id: string, input: UpdateUserInput) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onUploadProfileImage: (file: File) => Promise<ProfileUploadResult>;
  onChangeUserStatus?: (id: string, input: { status: UserStatus; reason?: string; dropDate?: string; actionTaken?: string; pullOutReason?: string; notes?: string }) => Promise<void>;
}

function getInitials(user: Pick<AuthUser, 'firstName' | 'lastName'>): string {
  return `${user.firstName?.trim().charAt(0) || ''}${user.lastName?.trim().charAt(0) || ''}`.toUpperCase() || '?';
}

function TeacherAvailabilityEditor({ blocks, setBlocks }: { blocks: { dayOfWeek: number; startTime: string; endTime: string }[]; setBlocks: React.Dispatch<React.SetStateAction<{ dayOfWeek: number; startTime: string; endTime: string }[]>> }) {
  return <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3"><div className="flex items-center justify-between"><div><p className="font-semibold text-gray-700">Weekly Availability</p><p className="text-xs text-gray-500">Choose one or more days and time ranges.</p></div><button type="button" onClick={() => setBlocks((items) => [...items, { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }])} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white">Add day/time</button></div><div className="mt-3 space-y-2">{blocks.map((block, index) => <div key={`${block.dayOfWeek}-${index}`} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"><select value={block.dayOfWeek} onChange={(e) => setBlocks((items) => items.map((item, i) => i === index ? { ...item, dayOfWeek: Number(e.target.value) } : item))} className="rounded-lg border px-2 py-2 text-sm">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, value) => <option key={day} value={value}>{day}</option>)}</select><input type="time" value={block.startTime.slice(0, 5)} onChange={(e) => setBlocks((items) => items.map((item, i) => i === index ? { ...item, startTime: e.target.value } : item))} className="rounded-lg border px-2 py-2 text-sm" /><span className="text-gray-400">to</span><div className="flex gap-2"><input type="time" value={block.endTime.slice(0, 5)} onChange={(e) => setBlocks((items) => items.map((item, i) => i === index ? { ...item, endTime: e.target.value } : item))} className="w-full rounded-lg border px-2 py-2 text-sm" /><button type="button" onClick={() => setBlocks((items) => items.filter((_, i) => i !== index))} className="px-1 text-sm text-red-500">Remove</button></div></div>)}</div></div>;
}

export function UsersView({ users, onAddUser, onEditUser, onDeleteUser, onUploadProfileImage, onChangeUserStatus }: UsersProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [statusUser, setStatusUser] = useState<AuthUser | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: 'active' as UserStatus, reason: '', dropDate: new Date().toISOString().slice(0, 10), actionTaken: '', pullOutReason: '', notes: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // CSV import
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCsvImporting(true);
      const result = await apiClient.importUsersFromCsv(file);
      setCsvResult(result);
      toast.success(`Imported ${result.imported} users.`);
    } catch (err: any) {
      toast.error(err.message || 'CSV import failed.');
    } finally {
      setCsvImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const [newUser, setNewUser] = useState<CreateUserInput>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    role: 'student',
    status: 'active',
    profileImageUrl: null,
    profileImagePublicId: null,
    password: 'password',
  });

  const [editUser, setEditUser] = useState<UpdateUserInput>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    role: 'student',
    status: 'active',
    profileImageUrl: null,
    profileImagePublicId: null,
    password: '',
    mobileNumber: '', birthdate: '', professionalTitle: '', employmentStatus: '', yearsExperience: '', specializations: [], education: '', certifications: '', availability: [],
  });

  const sortedUsers = useMemo(
    () => users.filter((user) => user.role !== 'admin').sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [users],
  );

  const filteredUsers = useMemo(() => {
    return sortedUsers.filter((user) => {
      const keyword = searchTerm.trim().toLowerCase();
      const keywordMatch =
        keyword.length === 0 ||
        user.fullName.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword);

      const roleMatch = !roleFilter || user.role === roleFilter;
      const statusMatch = !statusFilter || user.status === statusFilter;
      const createdDate = user.createdAt?.slice(0, 10) || '';
      const dateMatch = (!dateFrom || createdDate >= dateFrom) && (!dateTo || createdDate <= dateTo);

      return keywordMatch && roleMatch && statusMatch && dateMatch;
    });
  }, [sortedUsers, searchTerm, roleFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, statusFilter, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, pageCount);

  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

  const printUsers = () => printTableReport({ title: 'User Management', subtitle: `Filters: ${roleFilter || 'All roles'} · ${statusFilter || 'All statuses'} · ${dateFrom || 'Any date'} to ${dateTo || 'Any date'} · ${searchTerm || 'No search'}`, columns: ['Name', 'Email', 'Role', 'Status', 'Created'], rows: filteredUsers.map((user) => [user.fullName, user.email, user.role, user.status, new Date(user.createdAt).toLocaleString()]) });

  const resetCreateForm = () => {
    setNewUser({
      firstName: '',
      middleName: '',
      lastName: '',
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
      firstName: user.firstName,
      middleName: user.middleName || '',
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      profileImageUrl: user.profileImageUrl,
      profileImagePublicId: user.profileImagePublicId,
      password: '',
      mobileNumber: user.mobileNumber || '', birthdate: user.birthdate || '', professionalTitle: '', employmentStatus: '', yearsExperience: '', specializations: user.specializations || [], education: '', certifications: '', availability: [],
    });
    setIsEditOpen(true);
    if (user.role === 'teacher') void apiClient.listTeacherRecords().then((records) => {
      const record = records.find((item) => item.teacherId === user.id);
      if (record) setEditUser((current) => ({ ...current, mobileNumber: record.mobileNumber || '', professionalTitle: record.professionalTitle || '', employmentStatus: record.employmentStatus || '', yearsExperience: record.yearsExperience == null ? '' : String(record.yearsExperience), specializations: record.specializations || [], education: record.education || '', certifications: record.certifications || '', availability: record.availability.map((item) => ({ dayOfWeek: item.dayOfWeek, startTime: item.startTime.slice(0, 5), endTime: item.endTime.slice(0, 5) })) }));
    }).catch(() => undefined);
  };

  const handleCreate = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
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

    if (!editUser.firstName || !editUser.lastName || !editUser.email) {
      toast.error('Please complete all required fields.');
      return;
    }

    try {
      setSaving(true);
      await onEditUser(selectedUser.id, {
        ...editUser,
        password: editUser.password || undefined,
      });
      if (selectedUser.role === 'teacher') {
        await apiClient.updateTeacherRecord(selectedUser.id, { mobileNumber: editUser.mobileNumber || null, professionalTitle: editUser.professionalTitle || null, employmentStatus: editUser.employmentStatus || null, yearsExperience: editUser.yearsExperience ? Number(editUser.yearsExperience) : null, specializations: editUser.specializations || [], education: editUser.education || null, certifications: editUser.certifications || null });
        await apiClient.replaceTeacherAvailability(selectedUser.id, editUser.availability || []);
      }
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
      toast.success('User archived successfully.');
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
    status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' : status === 'dropped' ? 'bg-red-50 text-red-700 border-red-200' : status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-100';

  const openStatus = (user: AuthUser) => { setStatusUser(user); setStatusForm({ status: user.status, reason: '', dropDate: new Date().toISOString().slice(0, 10), actionTaken: '', pullOutReason: '', notes: '' }); };
  const saveStatus = async () => {
    if (!statusUser || !onChangeUserStatus) return;
    if (statusForm.status === 'dropped' && !statusForm.reason.trim()) { toast.error('A reason is required when marking a student as dropped.'); return; }
    try { setStatusSaving(true); await onChangeUserStatus(statusUser.id, statusForm); toast.success('User status updated.'); setStatusUser(null); } catch (error: any) { toast.error(error.message || 'Failed to update user status.'); } finally { setStatusSaving(false); }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
          <p className="text-gray-500">Administrator Module</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-3 md:items-center">
          <TableSearch value={searchTerm} onChange={(value) => setSearchTerm(value)} placeholder="Search name or email..." />
          <TableFilter label="Roles" value={roleFilter} options={users.filter((user) => user.role !== 'admin').map((user) => user.role)} onChange={(value) => setRoleFilter(value)} />
          <TableFilter label="Statuses" value={statusFilter} options={users.map((user) => user.status)} onChange={(value) => setStatusFilter(value)} />
          <input aria-label="Created from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input aria-label="Created to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <PrintButton onClick={printUsers} />
        </div>

        <div className="user-management-table overflow-x-auto">
        <table className="min-w-[760px] w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-600">Profile</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Email</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Role</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Created</th>
              <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {user.profileImageUrl ? <><img
                      src={user.profileImageUrl}
                      alt={user.fullName}
                      onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                      className="h-10 w-10 rounded-full object-cover border border-gray-200"
                    /><span className="hidden h-10 w-10 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-bold">{getInitials(user)}</span></> : <span className="h-10 w-10 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-bold">{getInitials(user)}</span>}
                    <div className="font-medium text-gray-900">{user.fullName}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
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
                  {onChangeUserStatus && user.role === 'student' && <button onClick={() => openStatus(user)} className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-indigo-50 rounded-full" title="Change student status"><ArrowRightLeft className="h-4 w-4" /></button>}
                  {user.status === 'pending' && (
                    <button
                      onClick={async () => { try { await apiClient.resendVerification(user.id); toast.success('Verification link sent.'); } catch (error: any) { toast.error(error.message || 'Failed to resend verification link.'); } }}
                      className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-indigo-50 rounded-full"
                      title="Resend verification link"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-gray-400 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-full"
                    title="Archive user (soft delete)"
                  >
                      <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}

            {paginatedUsers.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-center text-sm text-gray-500" colSpan={6}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        <TablePagination page={safePage} pageSize={pageSize} total={filteredUsers.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add New User</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={newUser.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((newUser.firstName || '') + ' ' + (newUser.lastName || 'User'))}&background=e0e7ff&color=3730a3`}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name <span className="text-gray-400">(optional)</span></label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={newUser.middleName || ''}
                  onChange={(e) => setNewUser({ ...newUser, middleName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
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
                    <option value="pending">Pending verification</option>
                    <option value="archived">Archived</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Edit User</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {editUser.profileImageUrl ? <img src={editUser.profileImageUrl} alt="Edit user profile" className="h-14 w-14 rounded-full object-cover border border-gray-200" /> : <span className="h-14 w-14 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg font-bold">{`${editUser.firstName.trim().charAt(0)}${editUser.lastName.trim().charAt(0)}`.toUpperCase() || '?'}</span>}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={editUser.firstName}
                  onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name <span className="text-gray-400">(optional)</span></label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={editUser.middleName || ''}
                  onChange={(e) => setEditUser({ ...editUser, middleName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={editUser.lastName}
                  onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
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
                  {selectedUser?.role === 'admin' ? <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-600">Administrator (fixed)</div> : <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value as UserRole })}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>}
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
                    <option value="pending">Pending verification</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              {editUser.role === 'student' && <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-3"><input className="border rounded-lg px-3 py-2" placeholder="Mobile number" value={editUser.mobileNumber || ''} onChange={(e) => setEditUser({ ...editUser, mobileNumber: e.target.value })} /><input type="date" className="border rounded-lg px-3 py-2" value={editUser.birthdate || ''} onChange={(e) => setEditUser({ ...editUser, birthdate: e.target.value })} /></div>}
              {editUser.role === 'teacher' && <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-gray-800">Teacher Personnel Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border rounded-lg px-3 py-2" placeholder="Mobile number" value={editUser.mobileNumber || ''} onChange={(e) => setEditUser({ ...editUser, mobileNumber: e.target.value })} />
                  <input className="border rounded-lg px-3 py-2" placeholder="Professional title / position" value={editUser.professionalTitle || ''} onChange={(e) => setEditUser({ ...editUser, professionalTitle: e.target.value })} />
                  <input className="border rounded-lg px-3 py-2" placeholder="Employment status" value={editUser.employmentStatus || ''} onChange={(e) => setEditUser({ ...editUser, employmentStatus: e.target.value })} />
                  <input type="number" min="0" className="border rounded-lg px-3 py-2" placeholder="Years of experience" value={editUser.yearsExperience || ''} onChange={(e) => setEditUser({ ...editUser, yearsExperience: e.target.value })} />
                  <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Subjects / specializations (comma separated)" value={(editUser.specializations || []).join(', ')} onChange={(e) => setEditUser({ ...editUser, specializations: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
                  <textarea className="border rounded-lg px-3 py-2" placeholder="Education" value={editUser.education || ''} onChange={(e) => setEditUser({ ...editUser, education: e.target.value })} />
                  <textarea className="border rounded-lg px-3 py-2" placeholder="Certifications" value={editUser.certifications || ''} onChange={(e) => setEditUser({ ...editUser, certifications: e.target.value })} />
                </div>
                <TeacherAvailabilityEditor blocks={editUser.availability || []} setBlocks={(value) => setEditUser({ ...editUser, availability: typeof value === 'function' ? value(editUser.availability || []) : value })} />
              </div>}
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

      {statusUser && <StatusChangeModal user={statusUser} form={statusForm} setForm={setStatusForm} saving={statusSaving} onCancel={() => setStatusUser(null)} onSave={saveStatus} />}

      {/* CSV Import Result Modal */}
      {csvResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">CSV Import Result</h3>
            <div className="flex gap-4">
              <div className="bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 flex-1 text-center">
                <div className="text-2xl font-bold">{csvResult.imported}</div>
                <div className="text-sm">Imported</div>
              </div>
              <div className="bg-rose-50 text-rose-700 rounded-xl px-4 py-3 flex-1 text-center">
                <div className="text-2xl font-bold">{csvResult.failed}</div>
                <div className="text-sm">Failed</div>
              </div>
            </div>
            {csvResult.errors.length > 0 && (
              <div className="border border-rose-100 rounded-lg p-3 bg-rose-50 max-h-48 overflow-y-auto text-xs text-rose-700 space-y-1">
                {csvResult.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => setCsvResult(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChangeModal({ user, form, setForm, saving, onCancel, onSave }: { user: AuthUser; form: { status: UserStatus; reason: string; dropDate: string; actionTaken: string; pullOutReason: string; notes: string }; setForm: React.Dispatch<React.SetStateAction<typeof form>>; saving: boolean; onCancel: () => void; onSave: () => void }) {
  const drop = form.status === 'dropped';
  return <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-5"><div className="flex justify-between items-start gap-4 mb-4"><div><h2 className="text-lg font-bold text-gray-800">Change Status: {user.fullName}</h2><p className="text-sm text-gray-500 mt-1">This changes the student’s overall account status.</p></div><button onClick={onCancel} className="text-gray-400 hover:text-gray-700"><X /></button></div><label className="block text-sm font-medium text-gray-700">New status<select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as UserStatus }))} className="mt-1 w-full border rounded-lg px-3 py-2"><option value="active">Active</option><option value="completed">Completed</option><option value="inactive">Inactive</option><option value="pending">Pending verification</option><option value="archived">Archived</option><option value="dropped">Dropped</option></select></label>{drop && <div className="mt-4 space-y-3"><StatusField label="Reason for dropping" required value={form.reason} onChange={(value) => setForm((p) => ({ ...p, reason: value }))} /><label className="block text-sm font-medium text-gray-700">Date of drop *<input type="date" value={form.dropDate} onChange={(e) => setForm((p) => ({ ...p, dropDate: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2" /></label><StatusField label="Action taken" value={form.actionTaken} onChange={(value) => setForm((p) => ({ ...p, actionTaken: value }))} /><StatusField label="Pull-out reason" value={form.pullOutReason} onChange={(value) => setForm((p) => ({ ...p, pullOutReason: value }))} /><StatusField label="Other relevant notes" value={form.notes} onChange={(value) => setForm((p) => ({ ...p, notes: value }))} /></div>}<div className="flex justify-end gap-2 mt-5"><button onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button><button disabled={saving} onClick={onSave} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save Status'}</button></div></div></div>;
}

function StatusField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) { return <label className="block text-sm font-medium text-gray-700">{label}{required && <span className="text-red-500"> *</span>}<textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 resize-none" /></label>; }
