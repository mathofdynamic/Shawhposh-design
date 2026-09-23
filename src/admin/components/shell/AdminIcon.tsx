import React from 'react';
import * as LucideIcons from 'lucide-react';

export interface AdminIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
  className?: string;
}

export const AdminIcon: React.FC<AdminIconProps> = ({ name, size = 18, className = '', ...props }) => {
  const IconComponent = (LucideIcons as Record<string, any>)[name] || LucideIcons.Folder;
  return <IconComponent size={size} className={className} {...props} />;
};
