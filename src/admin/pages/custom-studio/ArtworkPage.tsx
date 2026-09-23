import React from 'react';
import { Image as ImageIcon, Sparkles, Download, Eye, Plus } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button } from '../../components/ui';

interface ArtworkItem {
  id: string;
  title: string;
  artist: string;
  category: string;
  vectorFormat: string;
  downloads: number;
  previewUrl: string;
}

export const ArtworkPage: React.FC = () => {
  const artworks: ArtworkItem[] = [
    {
      id: 'ART-01',
      title: 'سیمرغ بلورین و خط نستعلیق شکسته',
      artist: 'استاد امین کریمی',
      category: 'اساطیر کهن',
      vectorFormat: 'SVG / PDF Vector (CMYK)',
      downloads: 142,
      previewUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&q=80',
    },
    {
      id: 'ART-02',
      title: 'بیت «هیچ مگو» مولانا',
      artist: 'استودیو خط شاه‌پوش',
      category: 'کالیگرافی صوفیانه',
      vectorFormat: 'SVG Curve',
      downloads: 289,
      previewUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&q=80',
    },
    {
      id: 'ART-03',
      title: 'هندسه مقدس کاشی‌کاری شیخ لطف‌الله',
      artist: 'نگار باقری',
      category: 'نقوش سنتی',
      vectorFormat: 'AI / EPS',
      downloads: 98,
      previewUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&q=80',
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="آرشیو فایل‌های برداری و موکاپ‌ها"
        description="کتابخانه اختصاصی تایپوگرافی‌های نستعلیق، موکاپ‌های نوری و کالیگرافی‌های تاییدشده کارگاه."
        actions={
          <Button variant="brass" size="sm">
            <Plus size={13} className="ml-1" />
            افزودن آرت‌ورک جدید
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {artworks.map((art) => (
          <div
            key={art.id}
            className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between"
          >
            <div className="h-44 bg-stone-900 relative overflow-hidden flex items-center justify-center p-4">
              <img
                src={art.previewUrl}
                alt={art.title}
                className="w-full h-full object-cover rounded-xl border border-white/10"
              />
              <span className="absolute top-6 right-6 text-[10px] bg-black/80 backdrop-blur-sm text-[#eed29d] border border-white/10 px-2 py-0.5 rounded font-mono">
                {art.id}
              </span>
            </div>

            <div className="p-4 space-y-2">
              <div className="text-xs font-bold text-white">{art.title}</div>
              <div className="text-[11px] text-stone-400">طراح: {art.artist}</div>
              <div className="text-[10px] text-stone-500 font-mono">{art.vectorFormat}</div>
            </div>

            <div className="p-4 pt-0 flex items-center gap-2">
              <Button variant="secondary" size="sm" className="flex-1">
                <Download size={13} className="ml-1" />
                دانلود فایل وکتور
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
