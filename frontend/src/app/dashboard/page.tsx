'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { formatDateShort, getStatusColor } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import {
  FolderOpen, FileText, MessageSquare, FilePen,
  Plus, ArrowRight, AlertCircle, Scale, Users, Vote
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      api.getDashboardStats().then(setStats).catch(console.error).finally(() => setDataLoading(false));
    }
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const quickStats = [
    { label: 'Ärenden', value: user?.stats?.myCases || 0, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', href: '/cases' },
    { label: 'Dokument', value: user?.stats?.documents || 0, icon: FileText, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', href: '/documents' },
    { label: 'AI-konversationer', value: user?.stats?.aiConversations || 0, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', href: '/ai-chat' },
    { label: 'Forum-inlägg', value: user?.stats?.forumTopics || 0, icon: Users, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', href: '/forum' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="page-container">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Välkommen, {user?.firstName}!
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Här är en översikt över dina ärenden och aktiviteter
              </p>
            </div>
            <Link href="/cases/new" className="btn-primary">
              <Plus size={18} className="mr-2" />
              Nytt ärende
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickStats.map((stat) => (
              <Link key={stat.label} href={stat.href} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <stat.icon size={24} className={stat.color} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Cases */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title">Senaste ärenden</h2>
                <Link href="/cases" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  Visa alla <ArrowRight size={14} />
                </Link>
              </div>
              {dataLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
                </div>
              ) : stats?.cases?.cases?.length > 0 ? (
                <div className="space-y-3">
                  {stats.cases.cases.map((c: any) => (
                    <Link key={c.id} href={`/cases/${c.id}`} className="block p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{c.title}</p>
                        <span className={`badge ${getStatusColor(c.status)}`}>{c.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {c.authority && `${c.authority} · `}{formatDateShort(c.createdAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <FolderOpen size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Inga ärenden än</p>
                  <Link href="/cases/new" className="text-primary-600 text-sm mt-2 inline-block">Skapa första ärendet</Link>
                </div>
              )}
            </div>

            {/* Recent Documents */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title">Senaste dokument</h2>
                <Link href="/documents" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  Visa alla <ArrowRight size={14} />
                </Link>
              </div>
              {dataLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
                </div>
              ) : stats?.documents?.documents?.length > 0 ? (
                <div className="space-y-3">
                  {stats.documents.documents.map((d: any) => (
                    <div key={d.id} className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{d.originalFilename}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateShort(d.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <FileText size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Inga dokument än</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="section-title">Snabblänkar</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/ai-chat" className="card p-5 text-center hover:shadow-md transition-shadow">
                <MessageSquare size={28} className="mx-auto mb-2 text-primary-600" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">AI-assistent</p>
                <p className="text-xs text-slate-500 mt-1">Ställ frågor</p>
              </Link>
              <Link href="/appeals" className="card p-5 text-center hover:shadow-md transition-shadow">
                <FilePen size={28} className="mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">Överklaganden</p>
                <p className="text-xs text-slate-500 mt-1">Skapa överklagande</p>
              </Link>
              <Link href="/legal-cases" className="card p-5 text-center hover:shadow-md transition-shadow">
                <Scale size={28} className="mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">Rättspraxis</p>
                <p className="text-xs text-slate-500 mt-1">Sök rättsfall</p>
              </Link>
              <Link href="/forum" className="card p-5 text-center hover:shadow-md transition-shadow">
                <Users size={28} className="mx-auto mb-2 text-orange-600" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">Forum</p>
                <p className="text-xs text-slate-500 mt-1">Fråga jurister</p>
              </Link>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Viktig information</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                AI-genererade svar och överklaganden kan innehålla fel. Slutligt ansvar ligger alltid hos dig som användare.
                Rådgör alltid med en juridisk expert innan du skickar in viktiga handlingar.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}