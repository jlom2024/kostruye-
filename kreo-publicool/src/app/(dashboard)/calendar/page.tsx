import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const currentDate = new Date()
const year = currentDate.getFullYear()
const month = currentDate.getMonth()
const firstDay = new Date(year, month, 1).getDay()
const daysInMonth = new Date(year, month + 1, 0).getDate()
const monthName = currentDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

const cells: (number | null)[] = [
  ...Array.from({ length: firstDay }, () => null),
  ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
]

export default function CalendarPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="text-sm text-gray-500 mt-0.5">Programa y visualiza tus publicaciones</p>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
          Programar publicación
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Calendar header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 capitalize">{monthName}</h2>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {days.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-medium text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
          {cells.map((day, i) => (
            <div
              key={i}
              className={`min-h-[100px] p-2 ${
                day === currentDate.getDate()
                  ? 'bg-violet-50'
                  : day ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50/50'
              }`}
            >
              {day && (
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  day === currentDate.getDate()
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-600'
                }`}>
                  {day}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
          Publicado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          Programado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          Borrador
        </span>
      </div>
    </div>
  )
}
