import React, { useState } from 'react';
import { ZoomIn, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from './Badge';
import { Dialog } from './Dialog';

export interface PrintFileMetadata {
  format: 'SVG' | 'PNG' | 'PDF' | 'TIFF';
  dimensionsMm: string; // e.g. "300 x 400 mm"
  resolutionDpi: number; // e.g. 300
  colorProfile: 'CMYK' | 'RGB';
  isPrintReady: boolean;
  notes?: string;
}

export interface FilePreviewProps {
  src: string;
  title: string;
  metadata?: PrintFileMetadata;
  aspectRatio?: 'square' | 'portrait';
  className?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  src,
  title,
  metadata,
  aspectRatio = 'square',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const aspectClasses = aspectRatio === 'square' ? 'aspect-square' : 'aspect-[3/4]';

  return (
    <>
      <div className={`group relative bg-[#0c0b0a] border border-white/10 rounded-2xl overflow-hidden ${className}`}>
        <div className={`w-full ${aspectClasses} overflow-hidden flex items-center justify-center p-3 relative`}>
          <img
            src={src}
            alt={title}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="مشاهده تصویر در اندازه بزرگ"
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
          >
            <div className="p-2.5 rounded-full bg-black/70 border border-white/20 text-[#eed29d]">
              <ZoomIn size={18} />
            </div>
          </button>
        </div>

        {/* Technical print specs strip */}
        {metadata && (
          <div className="p-3 border-t border-white/10 bg-[#131211] text-right space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white line-clamp-1">{title}</span>
              <Badge tone={metadata.isPrintReady ? 'success' : 'warning'} size="sm">
                {metadata.isPrintReady ? 'آماده چاپ صنعتی' : 'نیاز به بهینه‌سازی'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-400 font-mono" dir="ltr">
              <div className="flex justify-between bg-white/5 px-2 py-1 rounded">
                <span className="text-gray-500">FORMAT:</span>
                <span className="text-gray-300 font-bold">{metadata.format}</span>
              </div>
              <div className="flex justify-between bg-white/5 px-2 py-1 rounded">
                <span className="text-gray-500">DPI:</span>
                <span className={metadata.resolutionDpi >= 300 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {metadata.resolutionDpi}
                </span>
              </div>
              <div className="flex justify-between bg-white/5 px-2 py-1 rounded">
                <span className="text-gray-500">PROFILE:</span>
                <span className="text-gray-300">{metadata.colorProfile}</span>
              </div>
              <div className="flex justify-between bg-white/5 px-2 py-1 rounded">
                <span className="text-gray-500">SIZE:</span>
                <span className="text-gray-300">{metadata.dimensionsMm}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Resolution Inspection Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`پیش‌نمایش فنی: ${title}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="max-h-[60vh] overflow-auto rounded-xl bg-black flex items-center justify-center p-4 border border-white/10">
            <img src={src} alt={title} className="max-w-full max-h-full object-contain" />
          </div>
          {metadata && (
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-xs space-y-2 text-right">
              <div className="flex items-center gap-2 font-bold text-white">
                <FileText size={15} className="text-[#ba8d3d]" />
                <span>بررسی استانداردهای کارگاه چاپ دیجیتال (DTG):</span>
              </div>
              <p className="text-gray-300 font-sans leading-relaxed">
                {metadata.notes || 'طرح وکتوری استخراج شده از ادیتور وب با قابلیت بزرگنمایی بدون کاهش شارپنس.'}
              </p>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
};
