import { Calendar } from "lucide-react";

export function GanttBoard({ tasks }: { tasks: any[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 mb-4">
        <Calendar className="h-8 w-8 text-indigo-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Cronograma / Gráfico de Gantt</h3>
      <p className="text-zinc-400 max-w-md">
        Visualize a linha do tempo do projeto, entenda dependências e evite atrasos.
        (Em desenvolvimento)
      </p>
      
      <div className="mt-8 w-full max-w-4xl border border-zinc-800 rounded-lg overflow-x-auto bg-zinc-900/50">
        <div className="min-w-[600px]">
          <div className="flex border-b border-zinc-800 bg-zinc-800/50 text-xs text-zinc-400">
            <div className="w-1/4 p-3 border-r border-zinc-800">Tarefa</div>
            <div className="w-3/4 flex">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map(day => (
                <div key={day} className="flex-1 p-3 text-center border-r border-zinc-800 last:border-0">{day}</div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-zinc-800">
            {tasks.slice(0, 3).map((task, i) => (
              <div key={task.id} className="flex text-sm text-zinc-300">
                <div className="w-1/4 p-3 border-r border-zinc-800 truncate">{task.title}</div>
                <div className="w-3/4 relative p-2">
                  <div 
                    className="absolute top-2 bottom-2 rounded bg-indigo-500/80 border border-indigo-400"
                    style={{ 
                      left: `${(i * 10) + 5}%`, 
                      width: `${30 + (i * 10)}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="p-8 text-center text-zinc-500">Nenhuma tarefa para exibir no cronograma.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
