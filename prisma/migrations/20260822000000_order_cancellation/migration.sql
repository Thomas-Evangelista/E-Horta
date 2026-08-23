-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancellation_reason" TEXT;
