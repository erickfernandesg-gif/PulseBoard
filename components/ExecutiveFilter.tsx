"use client";

import { Calendar, Filter } from "lucide-react";

interface ExecutiveFilterProps {
  fromMonth: string;
  toMonth: string;
}

export function ExecutiveFilter({ fromMonth, toMonth }: ExecutiveFilterProps) {
  return (
    <form className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 rounded-lg border border-zinc-800">
        <Calendar size={14} className="text-zinc-500" />
        <input 
          type="month" 
          name="from" 
          defaultValue={fromMonth}
          onClick={(e) => (e.target as any).showPicker?.()}
          className="bg-transparent text-xs font-bold text-zinc-300 outline-none w-[130px] cursor-pointer [color-scheme:dark]"
        />
        <span className="text-zinc-700 font-bold mx-1">→</span>
        <input 
          type="month" 
          name="to" 
          defaultValue={toMonth}
          onClick={(e) => (e.target as any).showPicker?.()}
          className="bg-transparent text-xs font-bold text-zinc-300 outline-none w-[130px] cursor-pointer [color-scheme:dark]"
        />
      </div>
      <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-all shadow-lg shadow-indigo-500/10">
        <Filter size={16} />
      </button>
    </form>
  );
}