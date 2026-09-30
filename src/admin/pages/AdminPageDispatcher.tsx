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
import { OrderDetailPage } from './sales/OrderDetailPage';
import { PaymentsPage } from './sales/PaymentsPage';
import { PaymentDetailPage } from './sales/PaymentDetailPage';
import { RefundsPage } from './sales/RefundsPage';
import { ShippingPage } from './sales/ShippingPage';
import { ShipmentDetailPage } from './sales/ShipmentDetailPage';
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
import { DesignReviewPage } from './custom-studio/DesignReviewPage';
import { PrintingRulesPage } from './custom-studio/PrintingRulesPage';
import { JobDetailPage } from './custom-studio/JobDetailPage';

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

// Marketing & CMS (Prompt 16)
import { DiscountsPage } from './marketing/DiscountsPage';
import { CampaignsPage as MarketingCampaignsPage } from './marketing/CampaignsPage';
import { FunnelsPage } from './marketing/FunnelsPage';
import { HomepageCmsPage } from './content/HomepageCmsPage';
import { BannersPage } from './content/BannersPage';
import { PagesCmsPage } from './content/PagesCmsPage';
import { SeoManagementPage } from './content/SeoManagementPage';

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
import { LogsPage } from './system/LogsPage';
import { DataExplorerPage } from './system/DataExplorerPage';
import { SecurityPage } from './system/SecurityPage';
import { NotificationsPage } from './system/NotificationsPage';

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

  // Dynamic order details routes (/admin/sales/orders/:id and /orders/:id)
  if (currentPath.startsWith('/admin/sales/orders/') && currentPath !== '/admin/sales/orders') {
    const oId = currentPath.replace('/admin/sales/orders/', '');
    if (oId === ':id' || !oId) return <OrdersPage />;
    return <OrderDetailPage orderIdProp={oId} />;
  }
  if (currentPath.startsWith('/orders/') && currentPath !== '/orders') {
    const oId = currentPath.replace('/orders/', '');
    if (oId === ':id' || !oId) return <OrdersPage />;
    return <OrderDetailPage orderIdProp={oId} />;
  }

  // Dynamic payment details routes (/admin/sales/payments/:id and /payments/:id)
  if (currentPath.startsWith('/admin/sales/payments/') && currentPath !== '/admin/sales/payments') {
    const pId = currentPath.replace('/admin/sales/payments/', '');
    if (pId === ':id' || !pId) return <PaymentsPage />;
    return <PaymentDetailPage paymentIdProp={pId} />;
  }
  if (currentPath.startsWith('/payments/') && currentPath !== '/payments') {
    const pId = currentPath.replace('/payments/', '');
    if (pId === ':id' || !pId) return <PaymentsPage />;
    return <PaymentDetailPage paymentIdProp={pId} />;
  }

  // Dynamic design review routes (/designs/:id, /admin/studio/designs/:id, /admin/custom-studio/designs/:id)
  if (currentPath.startsWith('/designs/') && currentPath !== '/designs') {
    const dId = currentPath.replace('/designs/', '');
    if (dId === ':id' || !dId) return <ApprovalPage />;
    return <DesignReviewPage designIdProp={dId} />;
  }
  if (currentPath.startsWith('/admin/studio/designs/') && currentPath !== '/admin/studio/designs') {
    const dId = currentPath.replace('/admin/studio/designs/', '');
    if (dId === ':id' || !dId) return <ApprovalPage />;
    return <DesignReviewPage designIdProp={dId} />;
  }
  if (currentPath.startsWith('/admin/custom-studio/designs/') && currentPath !== '/admin/custom-studio/designs') {
    const dId = currentPath.replace('/admin/custom-studio/designs/', '');
    if (dId === ':id' || !dId) return <ApprovalPage />;
    return <DesignReviewPage designIdProp={dId} />;
  }

  // Dynamic job details routes (/jobs/:id, /admin/studio/jobs/:id, /admin/custom-studio/jobs/:id)
  if (currentPath.startsWith('/jobs/') && currentPath !== '/jobs') {
    const jId = currentPath.replace('/jobs/', '');
    if (jId === ':id' || !jId) return <ProductionPage />;
    return <JobDetailPage jobIdProp={jId} />;
  }
  if (currentPath.startsWith('/admin/studio/jobs/') && currentPath !== '/admin/studio/jobs') {
    const jId = currentPath.replace('/admin/studio/jobs/', '');
    if (jId === ':id' || !jId) return <ProductionPage />;
    return <JobDetailPage jobIdProp={jId} />;
  }
  if (currentPath.startsWith('/admin/custom-studio/jobs/') && currentPath !== '/admin/custom-studio/jobs') {
    const jId = currentPath.replace('/admin/custom-studio/jobs/', '');
    if (jId === ':id' || !jId) return <ProductionPage />;
    return <JobDetailPage jobIdProp={jId} />;
  }

  // Dynamic customer profile routes (/customers/:id, /admin/customers/profiles/:id, /admin/customers/:id)
  if (currentPath.startsWith('/customers/') && currentPath !== '/customers') {
    const cId = currentPath.replace('/customers/', '');
    if (cId === ':id' || !cId) return <CustomerDirectoryPage />;
    return <CustomerProfilesPage customerIdProp={cId} />;
  }
  if (currentPath.startsWith('/admin/customers/profiles/') && currentPath !== '/admin/customers/profiles') {
    const cId = currentPath.replace('/admin/customers/profiles/', '');
    if (cId === ':id' || !cId) return <CustomerDirectoryPage />;
    return <CustomerProfilesPage customerIdProp={cId} />;
  }
  if (
    currentPath.startsWith('/admin/customers/') &&
    currentPath !== '/admin/customers/directory' &&
    currentPath !== '/admin/customers/profiles' &&
    currentPath !== '/admin/customers/support' &&
    currentPath !== '/admin/customers/reviews' &&
    currentPath !== '/admin/customers/segments' &&
    currentPath !== '/admin/customers'
  ) {
    const cId = currentPath.replace('/admin/customers/', '');
    if (cId === ':id' || !cId) return <CustomerDirectoryPage />;
    return <CustomerProfilesPage customerIdProp={cId} />;
  }

  // Dynamic shipment routes (/shipments/:id, /shipping/:id, /admin/sales/shipping/:id)
  if (currentPath.startsWith('/shipments/') && currentPath !== '/shipments') {
    const sId = currentPath.replace('/shipments/', '');
    if (sId === ':id' || !sId) return <ShippingPage />;
    return <ShipmentDetailPage shipmentIdProp={sId} />;
  }
  if (currentPath.startsWith('/shipping/') && currentPath !== '/shipping') {
    const sId = currentPath.replace('/shipping/', '');
    if (sId === ':id' || !sId) return <ShippingPage />;
    return <ShipmentDetailPage shipmentIdProp={sId} />;
  }
  if (currentPath.startsWith('/admin/sales/shipping/') && currentPath !== '/admin/sales/shipping') {
    const sId = currentPath.replace('/admin/sales/shipping/', '');
    if (sId === ':id' || !sId) return <ShippingPage />;
    return <ShipmentDetailPage shipmentIdProp={sId} />;
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
    case '/orders':
      return <OrdersPage />;
    case '/admin/sales/payments':
    case '/payments':
      return <PaymentsPage />;
    case '/admin/sales/refunds':
    case '/refunds':
      return <ReturnsPage defaultTab="refunds" />;
    case '/admin/sales/shipping':
    case '/shipping':
    case '/shipments':
      return <ShippingPage />;
    case '/admin/sales/returns':
    case '/returns':
    case '/admin/returns':
      return <ReturnsPage defaultTab="returns" />;
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
      return <CategoriesPage defaultTab="categories" />;
    case '/admin/catalog/collections':
    case '/collections':
      return <CategoriesPage defaultTab="collections" />;
    case '/admin/catalog/media':
    case '/media':
    case '/admin/media':
      return <MediaAssetsPage />;
    case '/admin/catalog/suppliers':
    case '/suppliers':
      return <PurchaseOrdersPage defaultTab="suppliers" />;
    case '/admin/catalog/purchase-orders':
    case '/purchase-orders':
      return <PurchaseOrdersPage defaultTab="purchase_orders" />;

    // 4. Custom Studio
    case '/admin/custom-studio/submissions':
    case '/admin/studio/designs':
    case '/designs':
      return <ApprovalPage defaultTab="submissions" />;
    case '/admin/custom-studio/approval':
    case '/approval':
    case '/admin/studio/approval':
      return <ApprovalPage defaultTab="cockpit" />;
    case '/admin/custom-studio/artwork':
    case '/artwork':
    case '/admin/studio/artwork':
      return <ArtworkPage />;
    case '/admin/custom-studio/printing-rules':
    case '/printing-rules':
    case '/admin/studio/printing-rules':
      return <PrintingRulesPage />;
    case '/admin/custom-studio/production':
    case '/admin/studio/production':
    case '/production':
    case '/admin/studio/rework':
    case '/rework':
      return <ProductionPage />;
    case '/admin/custom-studio/qc':
    case '/quality-control':
    case '/admin/studio/quality-control':
    case '/qc':
      return <QcPage />;

    // 5. Customers
    case '/admin/customers':
    case '/customers':
    case '/admin/customers/directory':
    case '/admin/customers/segments':
      return <CustomerDirectoryPage />;
    case '/admin/customers/profiles':
      return <CustomerDirectoryPage />;
    case '/admin/customers/support':
    case '/support':
    case '/support/tickets':
    case '/admin/support':
    case '/admin/support/tickets':
      return <CustomerSupportPage />;
    case '/admin/customers/reviews':
    case '/reviews':
    case '/admin/reviews':
      return <CustomerReviewsPage />;

    // 6. Analytics & Marketing
    case '/admin/analytics/sales':
      return <SalesAnalyticsPage />;
    case '/admin/analytics/traffic':
      return <TrafficPage />;
    case '/admin/analytics/geography':
      return <GeographyPage />;
    case '/admin/analytics/acquisition':
      return <AcquisitionPage />;
    case '/admin/analytics/conversion':
    case '/admin/marketing/funnels':
    case '/funnels':
    case '/admin/funnels':
      return <ConversionPage />;
    case '/admin/analytics/campaigns':
    case '/admin/marketing/campaigns':
    case '/campaigns':
    case '/admin/campaigns':
      return <MarketingCampaignsPage />;

    // Marketing & Discounts (Prompt 16)
    case '/admin/marketing/discounts':
    case '/discounts':
    case '/admin/discounts':
      return <DiscountsPage />;

    // Storefront CMS, Banners, Pages & SEO (Prompt 16)
    case '/admin/content/homepage':
    case '/content/homepage':
    case '/homepage':
    case '/admin/homepage':
      return <HomepageCmsPage />;
    case '/admin/content/banners':
    case '/banners':
    case '/admin/banners':
      return <BannersPage />;
    case '/admin/content/pages':
    case '/pages':
    case '/admin/pages':
      return <PagesCmsPage />;
    case '/admin/content/seo':
    case '/seo':
    case '/admin/seo':
    case '/admin/marketing/seo':
      return <SeoManagementPage />;

    // 7. Team
    case '/admin/team/tasks':
      return <TasksPage />;
    case '/admin/team/reports':
      return <WorkReportPage />;
    case '/admin/team/administrators':
      return <AdministratorsPage />;
    case '/admin/team/permissions':
      return <PermissionsPage />;
    case '/admin/team/audit':
      return <AuditPage />;

    // 8. System (Prompt 18: health, logs, data, settings, integrations, security)
    case '/admin/system/cms':
      return <HomepageCmsPage />;
    case '/settings':
    case '/admin/settings':
    case '/admin/system/settings':
      return <SettingsPage />;
    case '/integrations':
    case '/admin/integrations':
    case '/admin/system/integrations':
      return <IntegrationsPage />;
    case '/health':
    case '/admin/health':
    case '/admin/system/health':
      return <HealthPage />;
    case '/logs':
    case '/admin/logs':
    case '/admin/system/logs':
      return <LogsPage />;
    case '/data':
    case '/admin/data':
    case '/admin/system/data':
    case '/admin/system/data-explorer':
      return <DataExplorerPage />;
    case '/security':
    case '/admin/security':
    case '/admin/system/security':
      return <SecurityPage />;
    case '/admin/system/notifications':
    case '/notifications':
    case '/admin/notifications':
      return <NotificationsPage />;
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
