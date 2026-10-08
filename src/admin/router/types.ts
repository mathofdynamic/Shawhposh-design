export type StaffRole = 'owner' | 'store_manager' | 'finance' | 'production' | 'inventory' | 'support';

export type AdminGroupId = 'overview' | 'sales' | 'catalog' | 'customers' | 'system';

export interface AdminRouteDef {
  id: string;
  path: string;
  groupId: AdminGroupId;
  titleFa: string;
  titleEn: string;
  shortTitleFa: string;
  descriptionFa: string;
  iconName: string;
  allowedRoles?: StaffRole[];
  showInNav?: boolean;
  isDetail?: boolean;
  layoutWidth?: 'wide' | 'standard' | 'narrow';
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
