-- Uma avaliação por usuário/produto (spec #33): evita spam e
-- simplifica o cálculo de média. Mantém a avaliação mais recente.
DELETE FROM "reviews" r
USING "reviews" dup
WHERE r."user_id" = dup."user_id"
  AND r."product_id" = dup."product_id"
  AND r."created_at" < dup."created_at";

CREATE UNIQUE INDEX "reviews_user_id_product_id_key" ON "reviews"("user_id", "product_id");

-- Índice composto para listagem pública de avaliações aprovadas.
CREATE INDEX "reviews_product_id_status_idx" ON "reviews"("product_id", "status");
