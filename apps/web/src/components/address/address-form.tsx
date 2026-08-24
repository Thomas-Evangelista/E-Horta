'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateAddress } from '@/hooks/use-checkout';
import type { AddressDTO } from '@/types/api';

const addressFormSchema = z.object({
  label: z.string().trim().max(50).optional().or(z.literal('')),
  zipCode: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 números'),
  street: z.string().trim().min(2, 'Informe a rua').max(120),
  number: z.string().trim().min(1, 'Informe o número').max(20),
  complement: z.string().trim().max(80).optional().or(z.literal('')),
  neighborhood: z.string().trim().min(2, 'Informe o bairro').max(80),
  city: z.string().trim().min(2, 'Informe a cidade').max(80),
  state: z
    .string()
    .trim()
    .length(2, 'UF com 2 letras')
    .regex(/^[A-Za-z]{2}$/, 'UF inválida'),
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

export function AddressForm({
  onCreated,
}: {
  onCreated: (address: AddressDTO) => void;
}) {
  const createAddress = useCreateAddress();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormValues>({ resolver: zodResolver(addressFormSchema) });

  async function onSubmit(values: AddressFormValues) {
    const address = await createAddress.mutateAsync({
      zipCode: values.zipCode,
      street: values.street,
      number: values.number,
      complement: values.complement || undefined,
      neighborhood: values.neighborhood,
      city: values.city,
      state: values.state.toUpperCase(),
      label: values.label || undefined,
    });
    onCreated(address);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Input label="Apelido (opcional)" placeholder="Casa, trabalho..." error={errors.label?.message} {...register('label')} />
      </div>
      <Input label="CEP" inputMode="numeric" placeholder="00000000" error={errors.zipCode?.message} {...register('zipCode')} />
      <Input label="Número" inputMode="numeric" error={errors.number?.message} {...register('number')} />
      <div className="col-span-2">
        <Input label="Rua" error={errors.street?.message} {...register('street')} />
      </div>
      <div className="col-span-2">
        <Input label="Complemento (opcional)" error={errors.complement?.message} {...register('complement')} />
      </div>
      <Input label="Bairro" error={errors.neighborhood?.message} {...register('neighborhood')} />
      <Input label="Cidade" error={errors.city?.message} {...register('city')} />
      <Input label="UF" maxLength={2} error={errors.state?.message} {...register('state')} />
      <div className="col-span-2 mt-1">
        <Button type="submit" loading={createAddress.isPending} className="w-full">
          Salvar endereço
        </Button>
      </div>
    </form>
  );
}
