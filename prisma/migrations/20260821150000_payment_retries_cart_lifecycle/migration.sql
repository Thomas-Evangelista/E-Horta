-- Um pedido pode ter múltiplas tentativas de pagamento
-- (ex.: Pix expirado/cartão recusado → nova cobrança sobre o mesmo pedido).
-- O init cria order_id como índice único (CREATE UNIQUE INDEX), não como
-- constraint; DROP CONSTRAINT falharia em um banco novo.
DROP INDEX IF EXISTS "payments_order_id_key";
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- Reparo de dados: carrinhos encerrados (CONVERTED/ABANDONED) não podem
-- continuar ocupando o slot único de carts.user_id, senão o usuário nunca
-- consegue criar um novo carrinho após o primeiro pedido.
UPDATE "carts" SET "user_id" = NULL WHERE "status" <> 'ACTIVE';
