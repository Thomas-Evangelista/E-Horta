'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/admin/query-keys';
import { formatDateTime } from '@/lib/format';
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from '@/lib/admin/constants';
import { Card } from '@/components/admin/ui/card';
import { PageHeader } from '@/components/admin/ui/page-header';
import { PageSkeleton } from '@/components/admin/ui/skeleton';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { Badge } from '@/components/admin/ui/badge';
import { Select } from '@/components/admin/ui/select';
import { Pagination } from '@/components/admin/ui/pagination';
import { Button } from '@/components/admin/ui/button';
import { Modal } from '@/components/admin/ui/modal';
import { useToast } from '@/components/admin/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { Settings2, Search } from 'lucide-react';

type User = {
  id: string; name: string; email: string; role: string; status: string;
  createdAt: string; _count?: { orders: number };
};

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

const STATUS_OPTIONS: UserStatus[] = ['ACTIVE', 'INACTIVE', 'BLOCKED'];

const STATUS_VERB: Record<UserStatus, string> = {
  ACTIVE: 'ativar',
  INACTIVE: 'inativar',
  BLOCKED: 'bloquear',
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [target, setTarget] = useState<{ user: User; status?: UserStatus; action?: UserStatus } | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.users({ page, search, role: roleFilter, status: statusFilter }),
    queryFn: async () => {
      const env = await apiRequest<{ users: User[] }>('/admin/users', {
        query: { page, limit: 15, search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined },
      });
      return env;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }) => {
      const env = await apiRequest<{ id: string; name: string; email: string; role: string; status: string; createdAt: string }>(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: { status },
      });
      return env.data;
    },
    onSuccess: (updated) => {
      const label = USER_STATUS_LABELS[updated.status] ?? updated.status;
      toast('success', `Usuário agora está ${label.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.users({}) });
      setTarget(null);
    },
    onError: (err) => {
      toast('error', friendlyMessage(err));
      setTarget(null);
    },
  });

  const canManage = (user: User) => user.role === 'CUSTOMER';

  function confirmStatusChange(status: UserStatus) {
    if (!target) return;
    statusMutation.mutate({ id: target.user.id, status });
  }

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
                  <th className="px-5 py-3 text-right">Ações</th>
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
                    <td className="px-5 py-3 text-right">
                      {canManage(u) ? (
                        <Button variant="outline" size="sm" onClick={() => setTarget({ user: u })}>
                          <Settings2 size={15} aria-hidden />
                          Gerenciar
                        </Button>
                      ) : (
                        <span className="text-xs text-ink-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination page={meta.page ?? 1} totalPages={meta.totalPages ?? 1} onPageChange={setPage} />}
        </Card>
      )}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target ? `Gerenciar status de ${target.user.name}` : ''}
        footer={
          target && (
            <div className="flex flex-wrap justify-end gap-2">
              {STATUS_OPTIONS.filter((s) => s !== target.user.status).length > 0 ? (
                STATUS_OPTIONS.filter((s) => s !== target.user.status).map((status) => (
                  <Button
                    key={status}
                    variant={status === 'BLOCKED' ? 'danger' : status === 'INACTIVE' ? 'outline' : 'secondary'}
                    size="sm"
                    loading={statusMutation.isPending}
                    onClick={() => confirmStatusChange(status)}
                  >
                    {STATUS_VERB[status]}
                  </Button>
                ))
              ) : (
                <span className="text-sm text-ink-400">Nenhuma ação disponível</span>
              )}
            </div>
          )
        }
      >
        {target && (
          <div className="text-sm text-ink-600">
            <p className="font-medium text-ink-800">{target.user.email}</p>
            <p className="mt-2">Escolha o novo status do usuário:</p>
            {target.user.status === 'BLOCKED' && (
              <p className="mt-1 text-xs text-red-600">
                O usuário não poderá mais entrar na conta enquanto estiver bloqueado.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
