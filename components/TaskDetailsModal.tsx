"use client";

import { useState } from "react";
import { X, Paperclip, MessageSquare, Clock, User } from "lucide-react";

export function TaskDetailsModal({
  task,
  onClose,
}: {
  task: any;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
      <div className="h-full w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white truncate pr-4">{task.title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-zinc-800 px-6">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "details"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "activity"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Atividade
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "details" ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Descrição</h3>
                <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300 min-h-[100px]">
                  {task.description || "Nenhuma descrição fornecida."}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Status</h3>
                  <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300">
                    {task.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Responsável</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white text-xs">
                      {task.profiles?.full_name?.charAt(0) || <User size={12} />}
                    </div>
                    <span className="text-sm text-zinc-300">
                      {task.profiles?.full_name || "Não atribuído"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                  <Paperclip size={16} /> Anexos
                </h3>
                <div className="rounded-md border border-dashed border-zinc-700 bg-zinc-900/20 p-6 text-center">
                  <p className="text-sm text-zinc-500">Arraste arquivos ou clique para fazer upload</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative pl-4 border-l border-zinc-800 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-zinc-900"></div>
                  <p className="text-sm text-zinc-300">
                    <span className="font-medium text-white">João Silva</span> criou esta tarefa
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">Há 2 horas</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-zinc-700 ring-4 ring-zinc-900"></div>
                  <p className="text-sm text-zinc-300">
                    <span className="font-medium text-white">Maria Almeida</span> alterou o status para <span className="text-indigo-400">Em Progresso</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">Há 30 minutos</p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <MessageSquare size={16} /> Comentários
                </h3>
                <div className="flex gap-3 mb-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white text-sm">
                    JS
                  </div>
                  <div className="flex-1 rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-sm text-zinc-300">
                      <span className="text-indigo-400 font-medium">@Maria</span> pode verificar os anexos?
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 text-sm">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Adicionar um comentário..."
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
