import React from 'react';
import { useAdminRouter } from '../router';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui';

const AdminStyleGalleryLazy = React.lazy(() =>
  import('../components/gallery/AdminStyleGallery').then((m) => ({ default: m.AdminStyleGallery }))
);

// Overview
import { DashboardPage } from './overview/DashboardPage';
import { ActionCenterPage } from './overview/ActionCenterPage';
import { WorkReportPage } from './overview/WorkReportPage';

// Sales
import { OrdersPage } from './sales/OrdersPage';
import { PaymentsPage } from './sales/PaymentsPage';
import { ShippingPage } from './sales/ShippingPage';
import { ReturnsPage } from './sales/ReturnsPage';
import { SalesAnalyticsPage } from './sales/SalesAnalyticsPage';

// Catalog
import { ProductsPage } from './catalog/ProductsPage';
import { ProductEditor } from './catalog/ProductEditor';
import { VariantsPage } from './catalog/VariantsPage';
import { InventoryPage } from './catalog/InventoryPage';
import { CategoriesPage } from './catalog/CategoriesPage';
import { CollectionsPage } from './catalog/CollectionsPage';
import { MediaAssetsPage } from './catalog/MediaAssetsPage';
import { SuppliersPage } from './catalog/SuppliersPage';
import { StockMovementsPage } from './catalog/StockMovementsPage';
import { PurchaseOrdersPage } from './catalog/PurchaseOrdersPage';

// Custom Studio
import { SubmissionsPage } from './custom-studio/SubmissionsPage';
import { ApprovalPage } from './custom-studio/ApprovalPage';
import { ArtworkPage } from './custom-studio/ArtworkPage';
import { ProductionPage } from './custom-studio/ProductionPage';
import { QcPage } from './custom-studio/QcPage';

// Customers
import { CustomerDirectoryPage } from './customers/CustomerDirectoryPage';
import { CustomerProfilesPage } from './customers/CustomerProfilesPage';
import { CustomerSupportPage } from './customers/CustomerSupportPage';
import { CustomerReviewsPage } from './customers/CustomerReviewsPage';

// Analytics
import { TrafficPage } from './analytics/TrafficPage';
import { GeographyPage } from './analytics/GeographyPage';
import { AcquisitionPage } from './analytics/AcquisitionPage';
import { ConversionPage } from './analytics/ConversionPage';
import { CampaignsPage } from './analytics/CampaignsPage';

// Team
import { TasksPage } from './team/TasksPage';
import { ReportsPage } from './team/ReportsPage';
import { AdministratorsPage } from './team/AdministratorsPage';
import { PermissionsPage } from './team/PermissionsPage';
import { AuditPage } from './team/AuditPage';

// System
import { CmsPage } from './system/CmsPage';
import { SettingsPage } from './system/SettingsPage';
import { IntegrationsPage } from './system/IntegrationsPage';
import { HealthPage } from './system/HealthPage';
import { DataExplorerPage } from './system/DataExplorerPage';

export const AdminPageDispatcher: React.FC = () => {
  const { currentPath, navigate } = useAdminRouter();

  // Dynamic catalog product editor routes
  if (currentPath === '/products/new' || currentPath === '/admin/catalog/products/new') {
    return <ProductEditor productId="new" />;
  }
  if (currentPath.startsWith('/admin/catalog/products/') && currentPath !== '/admin/catalog/products') {
    const pId = currentPath.replace('/admin/catalog/products/', '');
    return <ProductEditor productId={pId} />;
  }
  if (currentPath.startsWith('/products/') && currentPath !== '/products') {
    const pId = currentPath.replace('/products/', '');
    return <ProductEditor productId={pId} />;
  }

  switch (currentPath) {
    // 1. Overview
    case '/admin':
    case '/admin/overview':
    case '/admin/overview/dashboard':
      return <DashboardPage />;
    case '/admin/overview/action-center':
      return <ActionCenterPage />;
    case '/admin/overview/work-report':
      return <WorkReportPage />;

    // 2. Sales
    case '/admin/sales/orders':
      return <OrdersPage />;
    case '/admin/sales/payments':
      return <PaymentsPage />;
    case '/admin/sales/shipping':
      return <ShippingPage />;
    case '/admin/sales/returns':
      return <ReturnsPage />;
    case '/admin/sales/analytics':
      return <SalesAnalyticsPage />;

    // 3. Catalog
    case '/admin/catalog/products':
    case '/products':
      return <ProductsPage />;
    case '/admin/catalog/variants':
    case '/variants':
      return <VariantsPage />;
    case '/admin/catalog/inventory':
    case '/inventory':
      return <InventoryPage />;
    case '/admin/catalog/stock-movements':
    case '/stock-movements':
      return <StockMovementsPage />;
    case '/admin/catalog/categories':
    case '/categories':
      return <CategoriesPage />;
    case '/admin/catalog/collections':
    case '/collections':
      return <CollectionsPage />;
    case '/admin/catalog/media':
    case '/media':
      return <MediaAssetsPage />;
    case '/admin/catalog/suppliers':
    case '/suppliers':
      return <SuppliersPage />;
    case '/admin/catalog/purchase-orders':
    case '/purchase-orders':
      return <PurchaseOrdersPage />;

    // 4. Custom Studio
    case '/admin/custom-studio/submissions':
      return <SubmissionsPage />;
    case '/admin/custom-studio/approval':
      return <ApprovalPage />;
    case '/admin/custom-studio/artwork':
      return <ArtworkPage />;
    case '/admin/custom-studio/production':
      return <ProductionPage />;
    case '/admin/custom-studio/qc':
      return <QcPage />;

    // 5. Customers
    case '/admin/customers/directory':
      return <CustomerDirectoryPage />;
    case '/admin/customers/profiles':
      return <CustomerProfilesPage />;
    case '/admin/customers/support':
      return <CustomerSupportPage />;
    case '/admin/customers/reviews':
      return <CustomerReviewsPage />;

    // 6. Analytics
    case '/admin/analytics/sales':
      return <SalesAnalyticsPage />;
    case '/admin/analytics/traffic':
      return <TrafficPage />;
    case '/admin/analytics/geography':
      return <GeographyPage />;
    case '/admin/analytics/acquisition':
      return <AcquisitionPage />;
    case '/admin/analytics/conversion':
      return <ConversionPage />;
    case '/admin/analytics/campaigns':
      return <CampaignsPage />;

    // 7. Team
    case '/admin/team/tasks':
      return <TasksPage />;
    case '/admin/team/reports':
      return <ReportsPage />;
    case '/admin/team/administrators':
      return <AdministratorsPage />;
    case '/admin/team/permissions':
      return <PermissionsPage />;
    case '/admin/team/audit':
      return <AuditPage />;

    // 8. System
    case '/admin/system/cms':
      return <CmsPage />;
    case '/admin/system/settings':
      return <SettingsPage />;
    case '/admin/system/integrations':
      return <IntegrationsPage />;
    case '/admin/system/health':
      return <HealthPage />;
    case '/admin/system/data-explorer':
      return <DataExplorerPage />;
    case '/admin/system/style-gallery':
      return (
        <React.Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">در حال بارگذاری گالری...</div>}>
          <AdminStyleGalleryLazy onBackToStore={() => navigate('/admin/overview/dashboard')} />
        </React.Suspense>
      );

    default:
      return (
        <div className="p-12 bg-[#131211] border border-white/10 rounded-3xl text-center space-y-4 max-w-lg mx-auto mt-12">
          <AlertCircle size={48} className="text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">صفحهٔ مورد نظر در پنل مدیریت یافت نشد</h2>
          <p className="text-xs text-stone-400 leading-relaxed">
            مسیر <span className="font-mono text-[#eed29d]" dir="ltr">{currentPath}</span> تعریف نشده است یا دسترسی به آن محدود می‌باشد.
          </p>
          <Button
            variant="brass"
            size="md"
            onClick={() => navigate('/admin/overview/dashboard')}
            className="mx-auto"
          >
            بازگشت به داشبورد اصلی
          </Button>
        </div>
      );
  }
};
