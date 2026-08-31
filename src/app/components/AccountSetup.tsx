import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { SystemLogo } from './SystemLogo';
import { apiClient } from '@/app/services/apiClient';

export function AccountSetup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('Missing verification token.'); setLoading(false); return; }
    apiClient.verifyAccount(token)
      .then((data) => { setEmail(data.email); setForm((prev) => ({ ...prev, firstName: data.firstName, middleName: data.middleName || '', lastName: data.lastName })); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match.'); return; }
    try {
      setSaving(true);
      await apiClient.completeAccountSetup({ token, firstName: form.firstName, middleName: form.middleName || undefined, lastName: form.lastName, password: form.password });
      toast.success('Account activated. You can now sign in.');
      navigate('/login', { replace: true });
    } catch (err: any) { toast.error(err.message || 'Account setup failed.'); }
    finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
      <SystemLogo className="justify-center" textClassName="text-white" imageClassName="shadow-lg shadow-violet-700/40" />
      <h2 className="text-2xl font-bold text-center mt-6">Complete Account Setup</h2>
      {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : error ? <div className="mt-6 text-center"><p className="text-rose-200">{error}</p><button onClick={() => navigate('/login')} className="mt-5 text-cyan-200 hover:underline">Return to login</button></div> : <form onSubmit={submit} className="space-y-4 mt-6">
        <p className="text-sm text-indigo-100/80">Set up the account for <strong>{email}</strong>.</p>
        <div className="grid grid-cols-1 gap-4">
          {(['firstName', 'middleName', 'lastName'] as const).map((field) => <input key={field} required={field !== 'middleName'} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} placeholder={`${field === 'firstName' ? 'First' : field === 'lastName' ? 'Last' : 'Middle'} name${field === 'middleName' ? ' (optional)' : ''}`} className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 outline-none focus:ring-2 focus:ring-violet-400" />)}
        </div>
        <div className="relative"><Lock className="absolute left-3 top-3.5 h-5 w-5 text-indigo-200/70" /><input required minLength={6} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Create password" className="w-full pl-10 px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 outline-none focus:ring-2 focus:ring-violet-400" /></div>
        <div className="relative"><UserRound className="absolute left-3 top-3.5 h-5 w-5 text-indigo-200/70" /><input required type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirm password" className="w-full pl-10 px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 outline-none focus:ring-2 focus:ring-violet-400" /></div>
        <button disabled={saving} className="w-full bg-violet-600 hover:bg-violet-500 py-3.5 rounded-lg font-bold disabled:opacity-50">{saving ? <Loader2 className="mx-auto animate-spin" /> : 'Activate Account'}</button>
      </form>}
    </div>
  </div>;
}
