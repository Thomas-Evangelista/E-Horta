'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  KeyRound,
  LogOut,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Star,
  Trash2,
  UserCircle2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter';
import { AddressForm } from '@/components/address/address-form';
import { useToast } from '@/components/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { applyApiFieldErrors } from '@/lib/form-errors';
import { formatDate } from '@/lib/format';
import { logoutRequest, useSessionStore } from '@/stores/session';
import { useAddresses } from '@/hooks/use-checkout';
import { useMyReviews, useDeleteReview } from '@/hooks/use-reviews';
import {
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateProfile,
  useChangePassword,
} from '@/hooks/use-account';

function ProfileSection() {
  const user = useSessionStore((state) => state.user)!;
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const { toast } = useToast();

  async function handleSave() {
    try {
      await updateProfile.mutateAsync({
        name: name.trim() !== user.name ? name.trim() : undefined,
        phone: phone.trim() !== (user.phone ?? '') ? phone.trim().replace(/\D/g, '') : undefined,
      });
      setEditing(false);
      toast('success', 'Perfil atualizado!');
    } catch (error) {
      toast('error', friendlyMessage(error));
    }
  }

  return (
    <section className="rounded-card border border-cream-200 bg-white p-4 shadow-card">
      <header className="flex items-center gap-3">
        <UserCircle2 size={44} aria-hidden className="shrink-0 text-accent-500" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold text-ink-900">{user.name}</h1>
          <p className="truncate text-sm text-ink-500">{user.email}</p>
        </div>
        <button
          type="button"
          aria-label={editing ? 'Cancelar edição' : 'Editar perfil'}
          onClick={() => {
            if (editing) {
              setName(user.name);
              setPhone(user.phone ?? '');
            }
            setEditing((open) => !open);
          }}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            editing ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
          }`}
        >
          {editing ? <X size={17} aria-hidden /> : <Pencil size={15} aria-hidden />}
        </button>
      </header>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-3 border-t border-cream-200 pt-4">
              <Input label="Nome" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
              <Input
                label="Telefone"
                type="tel"
                inputMode="numeric"
                hint="Apenas números com DDD"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
              />
              <Button onClick={() => void handleSave()} loading={updateProfile.isPending} className="w-full">
                Salvar alterações
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!editing && (
        <dl className="mt-3 flex flex-col gap-2 border-t border-cream-200 pt-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Telefone</dt>
            <dd className="text-ink-800">{user.phone ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Tipo de conta</dt>
            <dd className="text-ink-800">{user.role === 'CUSTOMER' ? 'Cliente' : user.role}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function AddressesSection() {
  const addressesQuery = useAddresses();
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  async function handleDelete(addressId: string) {
    try {
      await deleteAddress.mutateAsync(addressId);
      toast('success', 'Endereço removido');
    } catch (error) {
      toast('error', friendlyMessage(error));
    }
  }

  async function handleSetDefault(addressId: string) {
    try {
      await setDefault.mutateAsync(addressId);
      toast('success', 'Endereço padrão atualizado');
    } catch (error) {
      toast('error', friendlyMessage(error));
    }
  }

  return (
    <section className="rounded-card border border-cream-200 bg-white p-4 shadow-card">
      <header className="mb-3 flex items-center gap-2.5">
        <MapPin size={18} aria-hidden className="text-accent-500" />
        <h2 className="text-base font-bold text-ink-900">Meus endereços</h2>
        <button
          type="button"
          aria-expanded={showForm}
          aria-label={showForm ? 'Fechar formulário' : 'Adicionar endereço'}
          onClick={() => setShowForm((open) => !open)}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-white transition-transform hover:bg-accent-600 active:scale-90"
        >
          {showForm ? <X size={15} aria-hidden /> : <Plus size={16} aria-hidden />}
        </button>
      </header>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mb-4 rounded-xl bg-cream-50 p-3">
              <AddressForm
                onCreated={() => {
                  setShowForm(false);
                  toast('success', 'Endereço salvo!');
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {addressesQuery.isLoading && <Skeleton className="h-14 w-full rounded-xl" />}
      {addressesQuery.isError && (
        <p role="alert" className="text-sm text-red-700">
          Não foi possível carregar os endereços.
        </p>
      )}

      {addressesQuery.data && addressesQuery.data.length === 0 && (
        <p className="py-2 text-sm text-ink-400">Nenhum endereço cadastrado ainda.</p>
      )}

      {addressesQuery.data && addressesQuery.data.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {addressesQuery.data.map((address) => (
            <li
              key={address.id}
              className={`rounded-xl border p-3 ${
                address.isDefault ? 'border-accent-300 bg-accent-50' : 'border-cream-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">
                  {address.label && (
                    <span className="mr-1.5 font-bold text-ink-900">{address.label}:</span>
                  )}
                  <span className="text-ink-700">
                    {address.street}, {address.number}
                    {address.complement ? ` — ${address.complement}` : ''}
                  </span>
                  <span className="block text-xs text-ink-500">
                    {address.neighborhood}, {address.city} — {address.state.toUpperCase()} · CEP{' '}
                    {address.zipCode}
                  </span>
                </p>
                <span className="flex shrink-0 items-center gap-1">
                  {!address.isDefault && (
                    <button
                      type="button"
                      aria-label="Definir como padrão"
                      title="Definir como padrão"
                      disabled={setDefault.isPending}
                      onClick={() => void handleSetDefault(address.id)}
                      className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-accent-100 hover:text-accent-600"
                    >
                      <Star size={15} aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Remover endereço ${address.street}`}
                    disabled={deleteAddress.isPending}
                    onClick={() => void handleDelete(address.id)}
                    className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </span>
              </div>
              {address.isDefault && (
                <span className="mt-1 inline-block rounded-pill bg-accent-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-700">
                  Padrão
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PasswordSection() {
  const changePassword = useChangePassword();
  const clearSession = useSessionStore((state) => state.clearSession);
  const [editing, setEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const { toast } = useToast();

  function resetForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setFieldError({});
  }

  async function handleSave() {
    if (!currentPassword) {
      setFieldError({ currentPassword: 'Informe sua senha atual' });
      return;
    }
    if (newPassword.length < 8) {
      setFieldError({ newPassword: 'A nova senha deve ter no mínimo 8 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError({ confirmPassword: 'As senhas não conferem' });
      return;
    }
    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setEditing(false);
      resetForm();
      clearSession();
      toast('success', 'Senha alterada. Faça login novamente.');
    } catch (error) {
      const handled = applyApiFieldErrors(error, (field, fieldError) => {
        const name = field as 'currentPassword' | 'newPassword' | 'confirmPassword';
        setFieldError((prev) => ({ ...prev, [name]: fieldError.message }));
      });
      if (!handled) {
        toast('error', friendlyMessage(error));
      }
    }
  }

  return (
    <section className="rounded-card border border-cream-200 bg-white p-4 shadow-card">
      <header className="mb-3 flex items-center gap-2.5">
        <KeyRound size={18} aria-hidden className="text-accent-500" />
        <h2 className="text-base font-bold text-ink-900">Alterar senha</h2>
        <button
          type="button"
          aria-expanded={editing}
          aria-label={editing ? 'Fechar formulário' : 'Alterar senha'}
          onClick={() => {
            if (editing) resetForm();
            setEditing((open) => !open);
          }}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-cream-100 text-ink-600 transition-transform hover:bg-cream-200 active:scale-90"
        >
          {editing ? <X size={15} aria-hidden /> : <Pencil size={15} aria-hidden />}
        </button>
      </header>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-cream-200 pt-4">
              <Input
                label="Senha atual"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                error={fieldError.currentPassword}
              />
              <Input
                label="Nova senha"
                type="password"
                autoComplete="new-password"
                hint="Mínimo de 8 caracteres"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                error={fieldError.newPassword}
              />
              <PasswordStrengthMeter password={newPassword} />
              <Input
                label="Confirmar nova senha"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                error={fieldError.confirmPassword}
              />
              <Button onClick={() => void handleSave()} loading={changePassword.isPending} className="w-full">
                Alterar senha
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function MyReviewsSection() {
  const { toast } = useToast();
  const { data: reviews, isLoading, isError, error, refetch } = useMyReviews();
  const deleteReview = useDeleteReview();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(reviewId: string) {
    try {
      await deleteReview.mutateAsync(reviewId);
      setConfirmId(null);
      toast('success', 'Avaliação removida.');
    } catch (err) {
      toast('error', friendlyMessage(err));
    }
  }

  return (
    <section className="rounded-card border border-cream-200 bg-white p-4 shadow-card">
      <header className="mb-3 flex items-center gap-2.5">
        <MessageSquare size={18} aria-hidden className="text-accent-500" />
        <h2 className="text-base font-bold text-ink-900">Minhas avaliações</h2>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-start gap-2 text-sm text-red-700">
          <p>{friendlyMessage(error)}</p>
          <button type="button" onClick={() => refetch()} className="font-semibold text-accent-600 hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !isError && (!reviews || reviews.length === 0) && (
        <p className="text-sm text-ink-500">
          Você ainda não avaliou nenhum produto. Após receber um pedido, você pode avaliar os produtos comprados.
        </p>
      )}

      {!isLoading && !isError && reviews && reviews.length > 0 && (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-1.5 rounded-xl border border-cream-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium leading-snug text-ink-800">{review.product.name}</p>
                  <p aria-label={`Nota ${review.rating} de 5`} className="mt-0.5 text-sm text-accent-500">
                    {'★'.repeat(review.rating)}
                    <span className="text-cream-300">{'★'.repeat(5 - review.rating)}</span>
                  </p>
                </div>
                {confirmId === review.id ? (
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="text-ink-500">Remover?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      disabled={deleteReview.isPending}
                      className="font-semibold text-red-600 hover:underline"
                    >
                      Sim
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} className="font-semibold text-ink-500 hover:underline">
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={`Remover avaliação de ${review.product.name}`}
                    onClick={() => setConfirmId(review.id)}
                    className="shrink-0 rounded-full p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                )}
              </div>
              {review.comment && <p className="text-sm text-ink-600">{review.comment}</p>}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-400">
                  {review.status === 'APPROVED' ? 'Publicada' : review.status === 'PENDING' ? 'Aguardando moderação' : 'Não aprovada'}
                </span>
                <time dateTime={review.createdAt} className="text-xs text-ink-400">
                  {formatDate(review.createdAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ContaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [hydrated, setHydrated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login?redirect=%2Fconta');
  }, [hydrated, user, router]);

  async function handleLogout() {
    setLoggingOut(true);
    await logoutRequest();
    clearSession();
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
    toast('success', 'Você saiu da sua conta.');
    router.push('/');
    router.refresh();
  }

  if (!hydrated || !user) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-8" aria-busy="true">
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-28 w-full rounded-card" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-6">
      <ProfileSection />

      <AddressesSection />

      <PasswordSection />

      <MyReviewsSection />

      <details className="group rounded-card border border-cream-200 bg-white shadow-card">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 p-4 text-sm font-semibold text-ink-700 [&::-webkit-details-marker]:hidden">
          <ChevronDown size={16} aria-hidden className="transition-transform group-open:rotate-180" />
          Mais opções
        </summary>
        <div className="flex flex-col gap-2 border-t border-cream-200 p-4 pt-3">
          <Link href="/pedidos" className="text-sm font-medium text-accent-600 hover:underline">
            Ver meus pedidos
          </Link>
          <Button
            variant="outline"
            loading={loggingOut}
            onClick={() => void handleLogout()}
            className="text-red-600 hover:bg-red-50"
          >
            {!loggingOut && <LogOut size={17} aria-hidden />}
            Sair da conta
          </Button>
        </div>
      </details>
    </div>
  );
}
