import React from 'react';
import { Star, ThumbsUp, MessageSquare, CheckCircle } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button } from '../../components/ui';
import { toFaDigits } from '../../utils/formatters';

export const CustomerReviewsPage: React.FC = () => {
  const reviews = [
    {
      id: 'REV-01',
      author: 'آرمین شریفی',
      rating: 5,
      product: 'تیشرت اورسایز ۲۴۰ گرم با کالیگرافی سیمرغ',
      comment: 'کیفیت پارچه واقعاً سنگین و بی‌نظیره. چاپ بعد از ۳ بار شستشو هیچ تغییری نکرده و خطوط نستعلیق کاملاً شارپ و دقیق موندن.',
      date: 'دیروز',
      verified: true,
      approved: true,
    },
    {
      id: 'REV-02',
      author: 'پریسا نامدار',
      rating: 5,
      product: 'هودی جلو بسته سنگین طرح اختصاصی شاه‌نشین',
      comment: 'بسته‌بندی جعبه مشکی همراه با روبان طلاکوب برای هدیه فوق‌العاده شیک بود. از آتلیه بابت تطبیق دقیق رنگ‌ها متشکرم.',
      date: '۳ روز پیش',
      verified: true,
      approved: true,
    },
    {
      id: 'REV-03',
      author: 'کیوان رستمی',
      rating: 4,
      product: 'تیشرت کلاسیک نخ‌پنبه مینیمال',
      comment: 'تن‌خور لباس عالیه ولی ارسال تیپاکس یک روز دیرتر به دستم رسید. به هر حال کیفیت دوخت درجه یکه.',
      date: '۵ روز پیش',
      verified: true,
      approved: true,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="نظرات، دیدگاه‌ها و بازخورد خریداران"
        description="تایید دیدگاه‌های تاییدشده خریداران واقعی، بررسی رضایت از ثبات رنگ در شستشو و جنس پارچه‌های شاه‌پوش."
      />

      <div className="space-y-4">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="p-5 bg-[#131211] border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-xs">{rev.author}</span>
                <span className="text-[10px] text-stone-400 font-fanum">{rev.date}</span>
                {rev.verified && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                    خریدار تاییدشده
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    className={i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-700'}
                  />
                ))}
                <span className="text-xs font-bold font-fanum mr-1">{toFaDigits(rev.rating)} از ۵</span>
              </div>

              <div className="text-xs font-semibold text-[#eed29d]">{rev.product}</div>
              <p className="text-xs text-stone-300 leading-relaxed">{rev.comment}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm">
                پاسخ عمومی کارگاه
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
