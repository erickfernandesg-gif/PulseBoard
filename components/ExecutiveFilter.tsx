"use client";

import { Calendar, Filter } from "lucide-react";

interface ExecutiveFilterProps {
  fromMonth: string;
  toMonth: string;
}

export function ExecutiveFilter({ fromMonth, toMonth }: ExecutiveFilterProps) {
  return (
    <form className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
        <Calendar size={14} className="text-muted-foreground" />
        <input 
          type="month" 
          name="from" 
          defaultValue={fromMonth}
          onClick={(e) => (e.target as any).showPicker?.()}
          className="bg-transparent text-xs font-bold text-slate-900 outline-none w-[130px] cursor-pointer"
        />
        <span className="text-muted-foreground font-bold mx-1">→</span>
        <input 
          type="month" 
          name="to" 
          defaultValue={toMonth}
          onClick={(e) => (e.target as any).showPicker?.()}
          className="bg-transparent text-xs font-bold text-slate-900 outline-none w-[130px] cursor-pointer"
        />
      </div>
      <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-all shadow-md">
        <Filter size={16} />
      </button>
    </form>
  );
}