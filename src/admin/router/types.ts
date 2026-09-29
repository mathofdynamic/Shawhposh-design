import { ComponentType } from 'react';
import { StaffRole } from '../domain/types';

export type AdminGroupId =
  | 'overview'
  | 'sales'
  | 'catalog'
  | 'custom_studio'
  | 'customers'
  | 'marketing'
  | 'content'
  | 'analytics'
  | 'team'
  | 'system';

export interface AdminRouteDef {
  id: string;
  path: string; // e.g. '/admin/sales/orders'
  groupId: AdminGroupId;
  titleFa: string;
  titleEn: string;
  shortTitleFa: string;
  descriptionFa: string;
  iconName: string;
  allowedRoles?: StaffRole[]; // Visual permission indicators
  badgeKey?: 'pendingOrders' | 'pendingDesigns' | 'lowStock' | 'openTasks' | 'unverifiedPayments';
  quickAction?: {
    label: string;
    actionKey: string;
  };
}

export interface AdminNavGroupDef {
  id: AdminGroupId;
  titleFa: string;
  titleEn: string;
  iconName: string;
  routes: AdminRouteDef[];
}

export interface RouterState {
  currentPath: string;
  activeGroup: AdminNavGroupDef | null;
  activeRoute: AdminRouteDef | null;
  params: Record<string, string>;
  navigate: (toPath: string, replace?: boolean) => void;
  goBackToStore: () => void;
}
