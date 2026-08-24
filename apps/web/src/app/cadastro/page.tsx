import { Suspense } from 'react';
import { CadastroContent } from './cadastro-content';

export const metadata = { title: 'Criar conta' };

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroContent />
    </Suspense>
  );
}
