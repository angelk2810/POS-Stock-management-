import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Check, RotateCcw } from 'lucide-react';

export type PresetKey = 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'CUSTOM' | 'ALL';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export const getPresetDateBounds = (
  preset: PresetKey,
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date } | null => {
  const today = new Date();
  let start = new Date();
  let end = new Date();

  switch (preset) {
    case 'TODAY':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'WEEK': {
      // This week: Monday 00:00:00 to Sunday 23:59:59
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start = new Date(today.getFullYear(), today.getMonth(), diff);
      start.setHours(0, 0, 0, 0);
      
      const sunday = new Date(start);
      sunday.setDate(start.getDate() + 6);
      end = sunday;
      end.setHours(23, 59, 59, 999);
      break;
    }

    case 'MONTH':
      // This Month: 1st of month to today/end of month
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'LAST_MONTH':
      // Last Month: 1st to late-day of previous month
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'CUSTOM':
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date();
        end.setHours(23, 59, 59, 999);
      }
      break;

    case 'ALL':
    default:
      return null;
  }
  return { start, end };
};

export const formatDateDisplay = (date: Date | string | null): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

interface DateFilterProps {
  preset: PresetKey;
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string;   // YYYY-MM-DD
  onChange: (preset: PresetKey, start: string, end: string) => void;
  onReset?: () => void;
  className?: string;
  allowAllTime?: boolean;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  preset,
  startDateStr,
  endDateStr,
  onChange,
  onReset,
  className = '',
  allowAllTime = true,
}) => {
  // Temporary bounds for Custom selection
  const [tempStart, setTempStart] = useState(startDateStr || new Date().toISOString().split('T')[0]);
  const [tempEnd, setTempEnd] = useState(endDateStr || new Date().toISOString().split('T')[0]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize temp inputs when external props update
  useEffect(() => {
    if (startDateStr) setTempStart(startDateStr);
    if (endDateStr) setTempEnd(endDateStr);
  }, [startDateStr, endDateStr]);

  const presetsList: { key: PresetKey; label: string }[] = [
    ...(allowAllTime ? [{ key: 'ALL' as PresetKey, label: 'All Time' }] : []),
    { key: 'TODAY', label: 'Today' },
    { key: 'WEEK', label: 'This Week' },
    { key: 'MONTH', label: 'This Month' },
    { key: 'LAST_MONTH', label: 'Last Month' },
    { key: 'CUSTOM', label: 'Custom Range' },
  ];

  const handlePresetSelect = (key: PresetKey) => {
    if (key === 'CUSTOM') {
      onChange('CUSTOM', tempStart, tempEnd);
    } else {
      const bounds = getPresetDateBounds(key);
      const startS = bounds ? bounds.start.toISOString().split('T')[0] : '';
      const endS = bounds ? bounds.end.toISOString().split('T')[0] : '';
      onChange(key, startS, endS);
    }
  };

  const handleApplyCustom = () => {
    onChange('CUSTOM', tempStart, tempEnd);
  };

  const handleClear = () => {
    if (onReset) {
      onReset();
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      onChange('ALL', todayStr, todayStr);
    }
  };

  // Keyboard navigation for shifting focus between presets
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % presetsList.length;
      const el = document.getElementById(`date-preset-btn-${presetsList[nextIndex].key}`);
      el?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + presetsList.length) % presetsList.length;
      const el = document.getElementById(`date-preset-btn-${presetsList[prevIndex].key}`);
      el?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClear();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-3.5 shadow-sm flex flex-col gap-3 font-sans max-w-full ${className}`}
    >
      {/* Horizontal pill choices */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-2 select-none flex items-center gap-1 shrink-0">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Date Frame:</span>
        </span>
        <div className="flex flex-wrap items-center gap-1 bg-[var(--app-bg)] border border-[var(--border-default)] p-1 rounded-xl shadow-sm">
          {presetsList.map((p, idx) => {
            const isSelected = preset === p.key;
            return (
              <button
                id={`date-preset-btn-${p.key}`}
                key={p.key}
                type="button"
                onClick={() => handlePresetSelect(p.key)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-colors select-none outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-[var(--surface)] hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Date Inputs for Custom bounds */}
      {preset === 'CUSTOM' && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--border-subtle)] animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">From Date</span>
            <input
              type="date"
              value={tempStart}
              onChange={e => setTempStart(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyCustom();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleClear();
                }
              }}
              className="bg-[var(--app-bg)] border border-[var(--border-default)] hover:border-slate-300 focus:bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg p-1.5 text-[13px] font-mono font-medium text-slate-800 outline-none w-38 transition-colors shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">To Date</span>
            <input
              type="date"
              value={tempEnd}
              onChange={e => setTempEnd(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyCustom();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleClear();
                }
              }}
              className="bg-[var(--app-bg)] border border-[var(--border-default)] hover:border-slate-300 focus:bg-[var(--surface)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg p-1.5 text-[13px] font-mono font-medium text-slate-800 outline-none w-38 transition-colors shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleApplyCustom}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  handleClear();
                }
              }}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-[13px] rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1 outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <Check className="w-4 h-4" />
              <span>Apply</span>
            </button>
            {onReset && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-1.5 bg-[var(--app-bg)] hover:bg-[var(--surface)] active:bg-slate-200 text-slate-700 font-bold text-[13px] rounded-xl transition-colors flex items-center gap-1 outline-none border border-[var(--border-default)] shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
