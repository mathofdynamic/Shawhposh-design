import React, { useState } from 'react';
import { HeartPulse, FileText, Database, Shield } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { HealthPage } from './HealthPage';
import { LogsPage } from './LogsPage';
import { DataExplorerPage } from './DataExplorerPage';

export interface AdvancedToolsPageProps {
  defaultTab?: 'health' | 'logs' | 'data';
}

export const AdvancedToolsPage: React.FC<AdvancedToolsPageProps> = ({ defaultTab = 'health' }) => {
  const [activeTab, setActiveTab] = useState<'health' | 'logs' | 'data'>(defaultTab);

  const tabs = [
    { id: 'health' as const, label: 'سلامت سرویس‌ها و پایش', icon: HeartPulse },
    { id: 'logs' as const, label: 'لاگ‌های سیستم و حسابرسی فنی', icon: FileText },
    { id: 'data' as const, label: 'جستجوگر داده‌های خام', icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="ابزارهای پیشرفته سیستم"
        description="پایش سلامت زیرساخت، دفاتر لاگ‌های سیستمی و مشاهده امن ساختار داده‌های کارگاه."
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-px overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-[#ba8d3d] text-[#eed29d] bg-white/[0.03] rounded-t-lg'
                  : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-700'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-[#ba8d3d]' : 'text-stone-500'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div className="pt-2">
        {activeTab === 'health' && <HealthPage />}
        {activeTab === 'logs' && <LogsPage />}
        {activeTab === 'data' && <DataExplorerPage />}
      </div>
    </div>
  );
};
