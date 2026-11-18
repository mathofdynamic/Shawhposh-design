import React, { lazy } from 'react';
import { useAdminRouter } from '../router';

const DashboardPage = lazy(() => import('./overview/DashboardPage').then(module => ({ default: module.DashboardPage })));
const OrdersPage = lazy(() => import('./sales/OrdersPage').then(module => ({ default: module.OrdersPage })));
const OrderDetailPage = lazy(() => import('./sales/OrderDetailPage').then(module => ({ default: module.OrderDetailPage })));
const PaymentsPage = lazy(() => import('./sales/PaymentsPage').then(module => ({ default: module.PaymentsPage })));
const AccountingPage = lazy(() => import('./sales/AccountingPage').then(module => ({ default: module.AccountingPage })));
const PaymentDetailPage = lazy(() => import('./sales/PaymentDetailPage').then(module => ({ default: module.PaymentDetailPage })));
const ProductsPage = lazy(() => import('./catalog/ProductsPage').then(module => ({ default: module.ProductsPage })));
const ProductEditor = lazy(() => import('./catalog/ProductEditor').then(module => ({ default: module.ProductEditor })));
const VariantsPage = lazy(() => import('./catalog/VariantsPage').then(module => ({ default: module.VariantsPage })));
const InventoryPage = lazy(() => import('./catalog/InventoryPage').then(module => ({ default: module.InventoryPage })));
const CategoriesPage = lazy(() => import('./catalog/CategoriesPage').then(module => ({ default: module.CategoriesPage })));
const StockMovementsPage = lazy(() => import('./catalog/StockMovementsPage').then(module => ({ default: module.StockMovementsPage })));
const CustomerDirectoryPage = lazy(() => import('./customers/CustomerDirectoryPage').then(module => ({ default: module.CustomerDirectoryPage })));
const CustomerProfilesPage = lazy(() => import('./customers/CustomerProfilesPage').then(module => ({ default: module.CustomerProfilesPage })));
const SettingsPage = lazy(() => import('./system/SettingsPage').then(module => ({ default: module.SettingsPage })));
const HealthPage = lazy(() => import('./system/HealthPage').then(module => ({ default: module.HealthPage })));

export const AdminPageDispatcher: React.FC = () => {
  const { activeRoute, params } = useAdminRouter();

  switch (activeRoute?.id) {
    case 'dashboard': return <DashboardPage />;
    case 'orders': return <OrdersPage />;
    case 'order-detail': return <OrderDetailPage orderIdProp={params.id} />;
    case 'payments': return <PaymentsPage />;
    case 'accounting': return <AccountingPage />;
    case 'payment-detail': return <PaymentDetailPage paymentId={params.id} />;
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
