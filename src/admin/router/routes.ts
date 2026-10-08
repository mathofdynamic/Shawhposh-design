import type { AdminNavGroupDef, AdminRouteDef } from './types';

const routes: AdminRouteDef[] = [
  { id: 'dashboard', path: '/admin/overview/dashboard', groupId: 'overview', titleFa: 'داشبورد', titleEn: 'Dashboard', shortTitleFa: 'داشبورد', descriptionFa: 'خلاصهٔ اطلاعات ثبت‌شده در سامانه', iconName: 'LayoutDashboard', layoutWidth: 'wide' },
  { id: 'orders', path: '/admin/sales/orders', groupId: 'sales', titleFa: 'سفارش‌ها', titleEn: 'Orders', shortTitleFa: 'سفارش‌ها', descriptionFa: 'سفارش‌های ثبت‌شده در سامانه', iconName: 'ShoppingBag', allowedRoles: ['owner', 'store_manager', 'finance', 'production', 'inventory', 'support'], layoutWidth: 'wide' },
  { id: 'order-detail', path: '/admin/sales/orders/:id', groupId: 'sales', titleFa: 'جزئیات سفارش', titleEn: 'Order details', shortTitleFa: 'جزئیات سفارش', descriptionFa: 'نمایش جزئیات سفارش', iconName: 'ReceiptText', allowedRoles: ['owner', 'store_manager', 'finance', 'production', 'inventory', 'support'], showInNav: false, isDetail: true, layoutWidth: 'wide' },
  { id: 'products', path: '/admin/catalog/products', groupId: 'catalog', titleFa: 'محصولات', titleEn: 'Products', shortTitleFa: 'محصولات', descriptionFa: 'محصولات ثبت‌شده در کاتالوگ', iconName: 'Package', allowedRoles: ['owner', 'store_manager', 'inventory'], layoutWidth: 'wide' },
  { id: 'product-create', path: '/admin/catalog/products/new', groupId: 'catalog', titleFa: 'محصول جدید', titleEn: 'New product', shortTitleFa: 'محصول جدید', descriptionFa: 'افزودن محصول به کاتالوگ', iconName: 'PackagePlus', allowedRoles: ['owner', 'store_manager'], showInNav: false, isDetail: true, layoutWidth: 'wide' },
  { id: 'product-edit', path: '/admin/catalog/products/:id/edit', groupId: 'catalog', titleFa: 'ویرایش محصول', titleEn: 'Edit product', shortTitleFa: 'ویرایش محصول', descriptionFa: 'ویرایش محصول ثبت‌شده', iconName: 'Package', allowedRoles: ['owner', 'store_manager'], showInNav: false, isDetail: true, layoutWidth: 'wide' },
  { id: 'variants', path: '/admin/catalog/variants', groupId: 'catalog', titleFa: 'تنوع و SKU', titleEn: 'Variants and SKUs', shortTitleFa: 'تنوع و SKU', descriptionFa: 'مدیریت تنوع‌های محصول', iconName: 'Layers', allowedRoles: ['owner', 'store_manager', 'inventory'], layoutWidth: 'wide' },
  { id: 'inventory', path: '/admin/catalog/inventory', groupId: 'catalog', titleFa: 'موجودی', titleEn: 'Inventory', shortTitleFa: 'موجودی', descriptionFa: 'موجودی ثبت‌شده برای SKUها', iconName: 'Boxes', allowedRoles: ['owner', 'store_manager', 'inventory'], layoutWidth: 'wide' },
  { id: 'categories', path: '/admin/catalog/categories', groupId: 'catalog', titleFa: 'دسته‌بندی‌ها', titleEn: 'Categories', shortTitleFa: 'دسته‌بندی‌ها', descriptionFa: 'دسته‌بندی‌های واقعی کاتالوگ', iconName: 'FolderTree', allowedRoles: ['owner', 'store_manager'], layoutWidth: 'wide' },
  { id: 'stock-movements', path: '/admin/catalog/stock-movements', groupId: 'catalog', titleFa: 'گردش موجودی', titleEn: 'Stock movements', shortTitleFa: 'گردش موجودی', descriptionFa: 'سوابق ثبت‌شدهٔ تغییر موجودی', iconName: 'History', allowedRoles: ['owner', 'store_manager', 'inventory'], layoutWidth: 'wide' },
  { id: 'customers', path: '/admin/customers/directory', groupId: 'customers', titleFa: 'مشتریان', titleEn: 'Customers', shortTitleFa: 'مشتریان', descriptionFa: 'حساب‌های مشتریان ثبت‌شده', iconName: 'Users', allowedRoles: ['owner', 'store_manager', 'support'], layoutWidth: 'wide' },
  { id: 'customer-detail', path: '/admin/customers/:id', groupId: 'customers', titleFa: 'جزئیات مشتری', titleEn: 'Customer details', shortTitleFa: 'جزئیات مشتری', descriptionFa: 'نمایش اطلاعات واقعی مشتری', iconName: 'UserRound', allowedRoles: ['owner', 'store_manager', 'support'], showInNav: false, isDetail: true, layoutWidth: 'wide' },
  { id: 'settings', path: '/admin/system/settings', groupId: 'system', titleFa: 'تنظیمات ارسال', titleEn: 'Shipping settings', shortTitleFa: 'تنظیمات ارسال', descriptionFa: 'تنظیم روش‌های ارسال فروشگاه', iconName: 'Settings', allowedRoles: ['owner', 'store_manager'], layoutWidth: 'standard' },
  { id: 'health', path: '/admin/system/health', groupId: 'system', titleFa: 'وضعیت سامانه', titleEn: 'System health', shortTitleFa: 'وضعیت سامانه', descriptionFa: 'وضعیت اتصال سرویس و پایگاه داده', iconName: 'Activity', allowedRoles: ['owner', 'store_manager', 'finance', 'production', 'inventory', 'support'], layoutWidth: 'standard' },
];

const groupTitles: Record<AdminRouteDef['groupId'], { titleFa: string; titleEn: string; iconName: string }> = {
  overview: { titleFa: 'نمای کلی', titleEn: 'Overview', iconName: 'LayoutDashboard' },
  sales: { titleFa: 'فروش', titleEn: 'Sales', iconName: 'ShoppingBag' },
  catalog: { titleFa: 'کاتالوگ و انبار', titleEn: 'Catalog and inventory', iconName: 'Package' },
  customers: { titleFa: 'مشتریان', titleEn: 'Customers', iconName: 'Users' },
  system: { titleFa: 'سامانه', titleEn: 'System', iconName: 'Settings' },
};

export const ALL_ADMIN_ROUTES = routes;
export const ADMIN_GROUPS: AdminNavGroupDef[] = (Object.keys(groupTitles) as AdminRouteDef['groupId'][]).map(id => ({
  id,
  ...groupTitles[id],
  routes: routes.filter(route => route.groupId === id),
}));
export const DEFAULT_ADMIN_ROUTE = routes[0];

function normalizedPath(path: string) {
  return path.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
}

export function matchRoute(path: string): { route: AdminRouteDef; params: Record<string, string> } | undefined {
  const target = normalizedPath(path);
  for (const route of routes) {
    const routeParts = route.path.split('/');
    const targetParts = target.split('/');
    if (routeParts.length !== targetParts.length) continue;
    const params: Record<string, string> = {};
    const matches = routeParts.every((part, index) => {
      if (part.startsWith(':')) {
        const value = targetParts[index];
        if (!value) return false;
        params[part.slice(1)] = decodeURIComponent(value);
        return true;
      }
      return part === targetParts[index];
    });
    if (matches) return { route, params };
  }
  return undefined;
}

export function findRouteByPath(path: string) {
  return matchRoute(path)?.route;
}
