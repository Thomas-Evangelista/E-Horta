-- AlterTable
ALTER TABLE "carts" ADD COLUMN "coupon_id" TEXT;

-- CreateTable index
CREATE INDEX "carts_coupon_id_idx" ON "carts"("coupon_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
