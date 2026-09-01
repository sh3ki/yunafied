import React, { useEffect, useState } from 'react';
import { ImagePlus, Lock, Mail, Save, UserRound, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthUser } from '@/app/types/models';
import { apiClient } from '@/app/services/apiClient';

interface ProfileUploadResult {
  secureUrl: string;
  publicId: string;
}

interface UpdateProfileInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  currentPassword?: string;
  newPassword?: string;
  mobileNumber?: string | null;
  professionalTitle?: string | null;
  employmentStatus?: string | null;
  education?: string | null;
  certifications?: string | null;
  yearsExperience?: number | null;
  specializations?: string[];
  notes?: string | null;
  availability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}

interface ProfileSettingsProps {
  user: AuthUser;
  onUpdateProfile: (payload: UpdateProfileInput) => Promise<AuthUser>;
  onUploadProfileImage: (file: File) => Promise<ProfileUploadResult>;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || '?';
}

export function ProfileSettings({ user, onUpdateProfile, onUploadProfileImage }: ProfileSettingsProps) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [middleName, setMiddleName] = useState(user.middleName || '');
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user.profileImageUrl || null);
  const [profileImagePublicId, setProfileImagePublicId] = useState<string | null>(user.profileImagePublicId || null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mobileNumber, setMobileNumber] = useState(user.mobileNumber || '');
  const [professionalTitle, setProfessionalTitle] = useState(user.professionalTitle || '');
  const [employmentStatus, setEmploymentStatus] = useState(user.employmentStatus || '');
  const [education, setEducation] = useState(user.education || '');
  const [certifications, setCertifications] = useState(user.certifications || '');
  const [yearsExperience, setYearsExperience] = useState(user.yearsExperience == null ? '' : String(user.yearsExperience));
  const [specializations, setSpecializations] = useState((user.specializations || []).join(', '));
  const [notes, setNotes] = useState(user.notes || '');
  const [availability, setAvailability] = useState(user.availability?.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime: startTime.slice(0, 5), endTime: endTime.slice(0, 5) })) || []);

  useEffect(() => {
    setFirstName(user.firstName);
    setMiddleName(user.middleName || '');
    setLastName(user.lastName);
    setEmail(user.email);
    setProfileImageUrl(user.profileImageUrl || null);
    setProfileImagePublicId(user.profileImagePublicId || null);
    setSelectedImageFile(null);
    setPreviewImageUrl(null);
    setMobileNumber(user.mobileNumber || '');
    setProfessionalTitle(user.professionalTitle || ''); setEmploymentStatus(user.employmentStatus || '');
    setEducation(user.education || ''); setCertifications(user.certifications || '');
    setYearsExperience(user.yearsExperience == null ? '' : String(user.yearsExperience));
    setSpecializations((user.specializations || []).join(', ')); setNotes(user.notes || '');
    setAvailability(user.availability?.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime: startTime.slice(0, 5), endTime: endTime.slice(0, 5) })) || []);
  }, [user]);

  useEffect(() => { void apiClient.getProfileDetails().then((details) => {
    setMobileNumber(details.mobileNumber || ''); setProfessionalTitle(details.professionalTitle || ''); setEmploymentStatus(details.employmentStatus || '');
    setEducation(details.education || ''); setCertifications(details.certifications || ''); setYearsExperience(details.yearsExperience == null ? '' : String(details.yearsExperience));
    setSpecializations((details.specializations || []).join(', ')); setNotes(details.notes || '');
    setAvailability(details.availability?.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime: startTime.slice(0, 5), endTime: endTime.slice(0, 5) })) || []);
  }).catch(() => undefined); }, [user.id]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const onFileChange = (file: File | null) => {
    if (!file) {
      return;
    }

    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setPreviewImageUrl(objectUrl);
    toast.success('Photo selected. Click Save Changes to upload and apply.');
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('First name, last name, and email are required.');
      return;
    }

    try {
      setSaving(true);
      let nextProfileImageUrl = profileImageUrl;
      let nextProfileImagePublicId = profileImagePublicId;

      if (selectedImageFile) {
        setUploading(true);
        const uploaded = await onUploadProfileImage(selectedImageFile);
        nextProfileImageUrl = uploaded.secureUrl;
        nextProfileImagePublicId = uploaded.publicId;
      }

      await onUpdateProfile({
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        email: email.trim(),
        profileImageUrl: nextProfileImageUrl,
        profileImagePublicId: nextProfileImagePublicId,
        currentPassword: currentPassword.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
        mobileNumber: mobileNumber.trim() || null,
        ...(user.role === 'teacher' ? {
          professionalTitle: professionalTitle.trim() || null, employmentStatus: employmentStatus.trim() || null,
          education: education.trim() || null, certifications: certifications.trim() || null,
          yearsExperience: yearsExperience === '' ? null : Number(yearsExperience),
          specializations: specializations.split(',').map((item) => item.trim()).filter(Boolean), notes: notes.trim() || null, availability,
        } : {}),
      });

      if (selectedImageFile) {
        setProfileImageUrl(nextProfileImageUrl);
        setProfileImagePublicId(nextProfileImagePublicId);
        setSelectedImageFile(null);
      }

      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
      setPreviewImageUrl(null);

      setCurrentPassword('');
      setNewPassword('');
      toast.success('Profile updated successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile.');
    } finally {
      setUploading(false);
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
          {(previewImageUrl || profileImageUrl) ? <><img src={previewImageUrl || profileImageUrl || ''} alt="Profile" onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.nextElementSibling?.classList.remove('hidden'); }} className="h-20 w-20 rounded-full object-cover border border-violet-100" /><span className="hidden h-20 w-20 rounded-full border border-violet-100 bg-violet-50 text-violet-700 flex items-center justify-center text-xl font-bold">{getInitials(firstName, lastName)}</span></> : <span className="h-20 w-20 rounded-full border border-violet-100 bg-violet-50 text-violet-700 flex items-center justify-center text-xl font-bold">{getInitials(firstName, lastName)}</span>}
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm cursor-pointer transition">
              <ImagePlus className="h-4 w-4" />
              {uploading ? 'Uploading...' : selectedImageFile ? 'Change Selected Photo' : 'Upload Photo'}
              <input
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp"
                disabled={uploading || saving}
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
            </label>
            {selectedImageFile ? <p className="text-xs text-violet-700">Selected: {selectedImageFile.name}</p> : null}
            <p className="text-xs text-gray-500">Accepted formats: JPG, PNG, WEBP (max 5MB)</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">First Name</label>
            <div className="relative">
              <UserRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5"
                placeholder="First name"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Middle Name <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="relative">
              <UserRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5"
                placeholder="Middle name"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Last Name</label>
            <div className="relative">
              <UserRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5"
                placeholder="Last name"
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
          <div className={user.role === 'student' ? 'md:col-span-2' : ''}><label className="text-sm font-medium text-gray-700 mb-2 block">Mobile Number</label><input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5" placeholder="09XX XXX XXXX" /></div>
          {user.role === 'teacher' && <>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Professional Title</label><input value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5" placeholder="e.g. English Teacher" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Employment Status</label><input value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5" placeholder="e.g. Full-time" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Specializations</label><input value={specializations} onChange={(e) => setSpecializations(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5" placeholder="Separate subjects with commas" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Years of Experience</label><input type="number" min="0" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Education</label><textarea value={education} onChange={(e) => setEducation(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5" placeholder="Degrees and institutions" /></div>
            <div><label className="text-sm font-medium text-gray-700 mb-2 block">Certifications</label><textarea value={certifications} onChange={(e) => setCertifications(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5" /></div>
            <div className="md:col-span-2"><label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5" /></div>
            <div className="md:col-span-2"><div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-gray-700">Availability</label><button type="button" onClick={() => setAvailability((items) => [...items, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }])} className="text-sm text-violet-700 inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add time</button></div>{availability.map((item, index) => <div key={`${index}-${item.dayOfWeek}`} className="flex flex-wrap items-center gap-2 mb-2"><select value={item.dayOfWeek} onChange={(e) => setAvailability((items) => items.map((x, i) => i === index ? { ...x, dayOfWeek: Number(e.target.value) } : x))} className="border border-gray-200 rounded-lg px-2 py-2"><option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select><input type="time" value={item.startTime} onChange={(e) => setAvailability((items) => items.map((x, i) => i === index ? { ...x, startTime: e.target.value } : x))} className="border border-gray-200 rounded-lg px-2 py-2" /><span>to</span><input type="time" value={item.endTime} onChange={(e) => setAvailability((items) => items.map((x, i) => i === index ? { ...x, endTime: e.target.value } : x))} className="border border-gray-200 rounded-lg px-2 py-2" /><button type="button" onClick={() => setAvailability((items) => items.filter((_, i) => i !== index))} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>
          </>}
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
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg font-medium transition disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {saving || uploading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
