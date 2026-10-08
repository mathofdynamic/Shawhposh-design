import React from 'react';
import { useAdminRouter } from '../router';
import { DashboardPage } from './overview/DashboardPage';
import { OrdersPage } from './sales/OrdersPage';
import { OrderDetailPage } from './sales/OrderDetailPage';
import { ProductsPage } from './catalog/ProductsPage';
import { ProductEditor } from './catalog/ProductEditor';
import { VariantsPage } from './catalog/VariantsPage';
import { InventoryPage } from './catalog/InventoryPage';
import { CategoriesPage } from './catalog/CategoriesPage';
import { StockMovementsPage } from './catalog/StockMovementsPage';
import { CustomerDirectoryPage } from './customers/CustomerDirectoryPage';
import { CustomerProfilesPage } from './customers/CustomerProfilesPage';
import { SettingsPage } from './system/SettingsPage';
import { HealthPage } from './system/HealthPage';

export const AdminPageDispatcher: React.FC = () => {
  const { activeRoute, params } = useAdminRouter();

  switch (activeRoute?.id) {
    case 'dashboard': return <DashboardPage />;
    case 'orders': return <OrdersPage />;
    case 'order-detail': return <OrderDetailPage orderIdProp={params.id} />;
    case 'products': return <ProductsPage />;
    case 'product-create': return <ProductEditor productId="new" />;
    case 'product-edit': return <ProductEditor productId={params.id} />;
    case 'variants': return <VariantsPage />;
    case 'inventory': return <InventoryPage />;
    case 'categories': return <CategoriesPage />;
    case 'stock-movements': return <StockMovementsPage />;
    case 'customers': return <CustomerDirectoryPage />;
    case 'customer-detail': return <CustomerProfilesPage customerIdProp={params.id} />;
    case 'settings': return <SettingsPage />;
    case 'health': return <HealthPage />;
    default:
      return <section role="status" className="rounded-2xl border border-white/10 bg-[#131211] p-8 text-center text-sm text-stone-400">این مسیر در پنل فعال نیست.</section>;
  }
};
