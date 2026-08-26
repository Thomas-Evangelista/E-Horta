'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatDateTime } from '@/lib/format';
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { friendlyMessage } from '@/lib/errors';
import { Search } from 'lucide-react';

type User = {
  id: string; name: string; email: string; role: string; status: string;
  createdAt: string; _count?: { orders: number };
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.users({ page, search, role: roleFilter, status: statusFilter }),
    queryFn: async () => {
      const env = await apiRequest<{ users: User[] }>('/admin/users', {
        query: { page, limit: 15, search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined },
      });
      return env;
    },
  });

  const users = data?.data?.users ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Usuários" description={`${meta?.total ?? 0} usuários`} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            className="h-10 w-full rounded-xl border border-cream-300 bg-white pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400"
          />
        </div>
        <Select
          label=""
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          options={[
            { value: 'CUSTOMER', label: 'Cliente' },
            { value: 'OPERATOR', label: 'Operador' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
          placeholder="Todos os papéis"
          className="!h-10 w-auto"
        />
        <Select
          label=""
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={[
            { value: 'ACTIVE', label: 'Ativo' },
            { value: 'INACTIVE', label: 'Inativo' },
            { value: 'BLOCKED', label: 'Bloqueado' },
          ]}
          placeholder="Todos os status"
          className="!h-10 w-auto"
        />
      </div>

      {isLoading && <PageSkeleton rows={8} />}
      {isError && <EmptyState message={friendlyMessage(error)} onRetry={refetch} />}
      {!isLoading && !isError && users.length === 0 && <EmptyState message="Nenhum usuário encontrado" />}

      {!isLoading && !isError && users.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-medium uppercase text-ink-400">
                  <th className="px-5 py-3">Usuário</th>
                  <th className="px-5 py-3">Papel</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Pedidos</th>
                  <th className="px-5 py-3">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-cream-100 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink-800">{u.name}</p>
                      <p className="text-xs text-ink-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={u.role === 'ADMIN' ? 'accent' : u.role === 'OPERATOR' ? 'blue' : 'neutral'}>
                        {USER_ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge tone={u.status === 'ACTIVE' ? 'leaf' : u.status === 'BLOCKED' ? 'red' : 'yellow'}>
                        {USER_STATUS_LABELS[u.status] ?? u.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-center text-ink-500">{u._count?.orders ?? 0}</td>
                    <td className="px-5 py-3 text-xs text-ink-400">{formatDateTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination page={meta.page ?? 1} totalPages={meta.totalPages ?? 1} onPageChange={setPage} />}
        </Card>
      )}
    </div>
  );
}
