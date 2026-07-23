'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { Scale, User, Mail, Lock, Phone, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password.length < 8) {
      setError('Lösenordet måste vara minst 8 tecken');
      return;
    }
    setIsLoading(true);
    try {
      await register(formData);
      toast.success('Registrering lyckades!');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registrering misslyckades');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Scale size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Skapa konto</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Bli medlem i Rättighetsplattformen</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Förnamn</label>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="input-field" placeholder="Anna" required />
              </div>
              <div>
                <label className="label">Efternamn</label>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="input-field" placeholder="Andersson" required />
              </div>
            </div>

            <div>
              <label className="label">E-post</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input-field pl-10" placeholder="anna@exempel.se" required />
              </div>
            </div>

            <div>
              <label className="label">Telefon (valfritt)</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input-field pl-10" placeholder="070-123 45 67" />
              </div>
            </div>

            <div>
              <label className="label">Lösenord</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input-field pl-10" placeholder="Minst 8 tecken" required />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? 'Skapar konto...' : 'Skapa konto'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Har du redan ett konto?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">Logga in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}