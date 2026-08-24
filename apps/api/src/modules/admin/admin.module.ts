import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { AdminPromotionsController } from './admin-promotions.controller';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { UsersModule } from '../users/users.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AdminReviewsController } from './admin-reviews.controller';

@Module({
  imports: [
    ProductsModule,
    CategoriesModule,
    UsersModule,
    InventoryModule,
    OrdersModule,
    PromotionsModule,
    ReviewsModule,
  ],
  controllers: [
    AdminDashboardController,
    AdminProductsController,
    AdminOrdersController,
    AdminUsersController,
    AdminCategoriesController,
    AdminInventoryController,
    AdminPromotionsController,
    AdminReviewsController,
  ],
  providers: [AdminService],
})
export class AdminModule {}
