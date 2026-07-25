import { useEffect, useState } from 'react';
import { Users, Shield, Mail, Crown } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ErrorState, SkeletonCard, EmptyState } from '../components/ui/Feedback';
import { PatternTable } from '../components/charts/HeatmapTable';
import { fetchProfiles, updateProfileRole, fetchReports } from '../services/dataLayer';
import { useAuth } from '../services/authContext';
import { formatDate, errorMessage } from '../services/utils';
import type { Profile, ReportRecord, UserRole } from '../services/types';

export function Admin() {
  const { profile, hasRole } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [p, r] = await Promise.all([fetchProfiles(), fetchReports()]);
        if (!mounted) return;
        setProfiles(p);
        setReports(r);
      } catch (e) {
        setError(errorMessage(e, "Failed to load admin data"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleRole = async (id: string, currentRole: UserRole) => {
    setUpdating(id);
    const newRole: UserRole = currentRole === 'admin' ? 'analyst' : 'admin';
    try {
      await updateProfileRole(id, newRole);
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role: newRole } : p)));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUpdating(null);
    }
  };

  if (!hasRole('admin')) {
    return (
      <EmptyState
        icon={<Shield className="h-6 w-6" />}
        title="Admin access required"
        description="This page is restricted to administrators. Your current role is analyst."
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <SkeletonCard />
      </div>
    );
  }
  if (error) return <ErrorState title="Admin panel unavailable" description={error} />;

  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const analystCount = profiles.length - adminCount;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Admin Panel</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">User management & system overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card dark:border-slate-700/60 dark:bg-slate-900/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-slate-800 dark:text-white">{profiles.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total users</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card dark:border-slate-700/60 dark:bg-slate-900/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-slate-800 dark:text-white">{adminCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Admins</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card dark:border-slate-700/60 dark:bg-slate-900/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-slate-800 dark:text-white">{analystCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Analysts</p>
          </div>
        </div>
      </div>

      <Card hover>
        <CardHeader title="User Management" subtitle="Manage roles & access" icon={<Users className="h-4 w-4" />} />
        <PatternTable
          data={profiles}
          columns={[
            { key: 'full_name', label: 'Name', render: (v: unknown) => <span className="font-medium">{String(v)}</span> },
            { key: 'email', label: 'Email' },
            {
              key: 'role',
              label: 'Role',
              render: (v: unknown) => (
                <Badge variant={v === 'admin' ? 'brand' : 'default'}>
                  {v === 'admin' ? <><Crown className="mr-1 h-3 w-3" /> Admin</> : 'Analyst'}
                </Badge>
              ),
            },
            { key: 'created_at', label: 'Joined', render: (v: unknown) => formatDate(String(v)) },
            {
              key: 'id',
              label: 'Actions',
              render: (id: unknown, row: Profile) => {
                const idStr = String(id);
                return (
                <Button
                  variant="outline"
                  size="sm"
                  loading={updating === idStr}
                  disabled={idStr === profile?.id}
                  onClick={() => toggleRole(idStr, row.role)}
                >
                  {row.role === 'admin' ? 'Demote to analyst' : 'Promote to admin'}
                </Button>
              );
              },
            },
          ]}
        />
      </Card>

      <Card hover>
        <CardHeader title="Recent Reports" subtitle={`${reports.length} generated`} icon={<Mail className="h-4 w-4" />} />
        {reports.length === 0 ? (
          <EmptyState icon={<Mail className="h-6 w-6" />} title="No reports generated yet" />
        ) : (
          <PatternTable
            data={reports.slice(0, 10)}
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'scope', label: 'Scope' },
              { key: 'summary', label: 'Summary', render: (v: unknown) => <span className="text-xs text-slate-500">{String(v)}</span> },
              { key: 'generated_at', label: 'Generated', render: (v: unknown) => formatDate(String(v)) },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
