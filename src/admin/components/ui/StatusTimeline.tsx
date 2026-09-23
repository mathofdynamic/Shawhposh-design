import React from 'react';
import { Badge, BadgeTone } from './Badge';
import { DateTimeDisplay } from './DateTimeDisplay';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string; // ISO
  actor?: string; // e.g. "کاربر خریدار", "اپراتور چاپ", "سیستم مالی"
  badgeTone?: BadgeTone;
  badgeLabel?: string;
  isCompleted?: boolean;
  isCurrent?: boolean;
}

export interface StatusTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ events, className = '' }) => {
  return (
    <div className={`relative border-r-2 border-white/10 pr-6 space-y-6 select-text ${className}`}>
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;

        return (
          <div key={event.id} className="relative group text-right">
            {/* Timeline node icon / bullet */}
            <span
              className={`absolute -right-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                event.isCurrent
                  ? 'bg-[#ba8d3d] border-white ring-4 ring-[#ba8d3d]/20'
                  : event.isCompleted
                  ? 'bg-emerald-400 border-emerald-300'
                  : 'bg-[#181716] border-white/30'
              }`}
              aria-hidden="true"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-bold text-white">{event.title}</span>
                {event.badgeLabel && (
                  <Badge tone={event.badgeTone || 'neutral'} size="sm">
                    {event.badgeLabel}
                  </Badge>
                )}
              </div>
              <DateTimeDisplay iso={event.timestamp} showTime showRelative={false} />
            </div>

            {event.description && (
              <p className="text-xs text-gray-400 font-sans leading-relaxed mt-1">
                {event.description}
              </p>
            )}

            {event.actor && (
              <div className="mt-1.5 text-[10px] text-gray-500 font-sans">
                <span>توسط: </span>
                <span className="text-gray-300 font-medium">{event.actor}</span>
              </div>
            )}

            {!isLast && <div className="h-2" />}
          </div>
        );
      })}
    </div>
  );
};
