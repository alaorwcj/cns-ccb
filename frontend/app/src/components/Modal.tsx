import * as React from 'react'

export default function Modal({ title, children, onClose }: { title?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow max-w-2xl w-full p-4 max-h-[90vh] overflow-y-auto min-w-0">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold truncate max-w-full">{title}</h3>
          <button onClick={onClose} className="text-gray-500">Fechar</button>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
