import React, { useState, useRef } from 'react'
import { api } from '../services/api'

type ReceiptUploadProps = {
  orderId: number
  currentReceipt?: string | null
  onUploadSuccess: () => void
  isAdmin: boolean
}

export default function ReceiptUpload({ orderId, currentReceipt, onUploadSuccess, isAdmin }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo inválido. Use JPG, PNG ou PDF.')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Tamanho máximo: 10MB.')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      await api.post(`/orders/${orderId}/receipt-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      onUploadSuccess()
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao fazer upload do recibo')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir o recibo assinado?')) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      await api.delete(`/orders/${orderId}/receipt-upload`)
      onUploadSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao excluir recibo')
    } finally {
      setDeleting(false)
    }
  }

  const openReceipt = async () => {
    if (!currentReceipt) return
    
    const newWin = window.open('', '_blank')
    try {
      const response = await api.get(`/orders/receipts/${currentReceipt}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/pdf' 
      })
      const url = window.URL.createObjectURL(blob)
      
      if (newWin) {
        newWin.location.href = url
      } else {
        window.open(url, '_blank')
      }
      
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch (err: any) {
      if (newWin) newWin.close()
      setError(err?.response?.data?.detail || 'Erro ao abrir recibo')
    }
  }

  return (
    <div className="mt-4 p-4 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
      <div className="font-semibold mb-2">📎 Recibo Assinado</div>
      
      {currentReceipt ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-600 dark:text-green-400">✓ Recibo anexado</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={openReceipt}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Ver Recibo
            </button>
            
            {isAdmin && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Nenhum recibo assinado anexado ainda.
          </p>
          
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="text-sm"
            />
            {uploading && <span className="text-sm text-blue-600 ml-2">Fazendo upload...</span>}
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Formatos aceitos: JPG, PNG, PDF (máx. 10MB)
          </p>
        </div>
      )}
      
      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
