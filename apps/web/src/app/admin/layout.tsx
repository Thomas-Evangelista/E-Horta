import type { Metadata } from 'next';
import { ToastProvider } from '@/components/admin/feedback/toast';

export const metadata: Metadata = {
  title: { default: 'E-Horta Admin', template: '%s · E-Horta Admin' },
  description: 'Painel administrativo E-Horta',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
