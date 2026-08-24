-- Converte colunas de ID/FK de TEXT para UUID nativo (spec #50:
-- "Utilizar UUID para IDs públicos").
--
-- Contexto: a migration inicial criou as chaves como TEXT, enquanto o
-- schema Prisma declara String @default(uuid()). Queries SQL cruas que
-- comparavam essas colunas com casts ::uuid falhavam com
-- "operator does not exist: text = uuid" (checkout, webhooks, admin).
--
-- A conversão é in-place: USING preserva todos os valores existentes
-- (todos gerados como UUIDv4 pelo Prisma). Índices e constraints sobre
-- as colunas alteradas são reconstruídos automaticamente pelo PostgreSQL.

-- 1) Remover foreign keys (tipos das colunas devem coincidir)
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_user_id_fkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_cart_id_fkey";
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_product_id_fkey";
ALTER TABLE "carts" DROP CONSTRAINT "carts_coupon_id_fkey";
ALTER TABLE "carts" DROP CONSTRAINT "carts_user_id_fkey";
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_product_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_order_id_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_product_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";
ALTER TABLE "payments" DROP CONSTRAINT "payments_order_id_fkey";
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_id_fkey";
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";
ALTER TABLE "promotion_usages" DROP CONSTRAINT "promotion_usages_order_id_fkey";
ALTER TABLE "promotion_usages" DROP CONSTRAINT "promotion_usages_promotion_id_fkey";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_order_id_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_product_id_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_user_id_fkey";
ALTER TABLE "shippings" DROP CONSTRAINT "shippings_order_id_fkey";

-- 2) Converter colunas in-place (preserva dados)
ALTER TABLE "users" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
ALTER TABLE "addresses" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
ALTER TABLE "categories" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
ALTER TABLE "products" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "category_id" TYPE uuid USING "category_id"::uuid;
ALTER TABLE "product_images" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "product_id" TYPE uuid USING "product_id"::uuid;
ALTER TABLE "inventory" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "product_id" TYPE uuid USING "product_id"::uuid;
ALTER TABLE "carts" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid,
  ALTER COLUMN "coupon_id" TYPE uuid USING "coupon_id"::uuid;
ALTER TABLE "cart_items" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "cart_id" TYPE uuid USING "cart_id"::uuid,
  ALTER COLUMN "product_id" TYPE uuid USING "product_id"::uuid;
ALTER TABLE "promotions" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
ALTER TABLE "promotion_usages" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "promotion_id" TYPE uuid USING "promotion_id"::uuid,
  ALTER COLUMN "order_id" TYPE uuid USING "order_id"::uuid,
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
ALTER TABLE "orders" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
ALTER TABLE "order_items" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "order_id" TYPE uuid USING "order_id"::uuid,
  ALTER COLUMN "product_id" TYPE uuid USING "product_id"::uuid;
ALTER TABLE "payments" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "order_id" TYPE uuid USING "order_id"::uuid;
ALTER TABLE "shippings" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "order_id" TYPE uuid USING "order_id"::uuid;
ALTER TABLE "reviews" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid,
  ALTER COLUMN "product_id" TYPE uuid USING "product_id"::uuid,
  ALTER COLUMN "order_id" TYPE uuid USING "order_id"::uuid;
ALTER TABLE "notifications" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
ALTER TABLE "audit_logs" ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
ALTER TABLE "webhook_events" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;

-- 3) Recriar foreign keys com definições idênticas às originais
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "promotions"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "shippings" ADD CONSTRAINT "shippings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
