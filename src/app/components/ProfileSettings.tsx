import React, { useEffect, useState } from 'react';
import { ImagePlus, Lock, Mail, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { AuthUser } from '@/app/types/models';

interface ProfileUploadResult {
  secureUrl: string;
  publicId: string;
}

interface UpdateProfileInput {
  fullName: string;
  email: string;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  currentPassword?: string;
  newPassword?: string;
}

interface ProfileSettingsProps {
  user: AuthUser;
  onUpdateProfile: (payload: UpdateProfileInput) => Promise<AuthUser>;
  onUploadProfileImage: (file: File) => Promise<ProfileUploadResult>;
}

export function ProfileSettings({ user, onUpdateProfile, onUploadProfileImage }: ProfileSettingsProps) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user.profileImageUrl || null);
  const [profileImagePublicId, setProfileImagePublicId] = useState<string | null>(user.profileImagePublicId || null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setFullName(user.fullName);
    setEmail(user.email);
    setProfileImageUrl(user.profileImageUrl || null);
    setProfileImagePublicId(user.profileImagePublicId || null);
  }, [user]);

  const onFileChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      setUploading(true);
      const uploaded = await onUploadProfileImage(file);
      setProfileImageUrl(uploaded.secureUrl);
      setProfileImagePublicId(uploaded.publicId);
      toast.success('Profile image uploaded. Save changes to apply.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload profile image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error('Full name and email are required.');
      return;
    }

    try {
      setSaving(true);
      await onUpdateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        profileImageUrl,
        profileImagePublicId,
        currentPassword: currentPassword.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      });

      setCurrentPassword('');
      setNewPassword('');
      toast.success('Profile updated successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Profile Settings</h1>
        <p className="text-gray-500 mt-1">Update your account details and security settings.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-4">
          <img
            src={profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=ede9fe&color=5b21b6`}
            alt="Profile"
            className="h-20 w-20 rounded-full object-cover border border-violet-100"
          />
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm cursor-pointer transition">
              <ImagePlus className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Photo'}
              <input
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp"
                disabled={uploading}
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
            </label>
            <p className="text-xs text-gray-500">Accepted formats: JPG, PNG, WEBP (max 5MB)</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Full Name</label>
            <div className="relative">
              <UserRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5"
                placeholder="Your full name"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5"
                placeholder="you@email.com"
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Current Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5"
                placeholder="Required if changing password"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">New Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5"
                placeholder="Leave blank to keep current"
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg font-medium transition disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
