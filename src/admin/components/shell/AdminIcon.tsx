import React from 'react';
import {
  Activity,
  Boxes,
  Calculator,
  CreditCard,
  Folder,
  FolderTree,
  History,
  Layers,
  LayoutDashboard,
  Package,
  PackagePlus,
  ReceiptText,
  Settings,
  ShoppingBag,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  Activity,
  Boxes,
  Calculator,
  CreditCard,
  FolderTree,
  History,
  Layers,
  LayoutDashboard,
  Package,
  PackagePlus,
  ReceiptText,
  Settings,
  ShoppingBag,
  UserRound,
  Users,
};

export interface AdminIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
  className?: string;
}

export const AdminIcon: React.FC<AdminIconProps> = ({ name, size = 18, className = '', ...props }) => {
  const IconComponent = icons[name] ?? Folder;
  return <IconComponent size={size} className={className} {...props} />;
};
