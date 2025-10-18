import React from 'react'

export const CardRow: React.FC<{title: string, values: Array<{label: string, value: React.ReactNode}>}> = ({ title, values }) => {
  return (
    <div className="block sm:hidden bg-white dark:bg-gray-800 rounded shadow p-4 mb-3 min-w-0">
      <div className="font-semibold mb-2">{title}</div>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex justify-between text-sm min-w-0">
            <div className="text-gray-600 dark:text-gray-300 truncate max-w-[60%]">{v.label}</div>
            <div className="text-gray-900 dark:text-white truncate max-w-[40%] text-right">{v.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CardRow
