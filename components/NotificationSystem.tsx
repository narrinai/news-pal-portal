'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface ModalProps {
  id: string
  type: 'confirm' | 'prompt'
  title: string
  message: string
  onConfirm: (value?: string) => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  promptPlaceholder?: string
  promptDefaultValue?: string
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void
  showConfirm: (props: Omit<ModalProps, 'id' | 'type' | 'onConfirm' | 'onCancel'>) => Promise<boolean>
  showPrompt: (props: Omit<ModalProps, 'id' | 'type' | 'onConfirm' | 'onCancel'> & { promptPlaceholder?: string, promptDefaultValue?: string }) => Promise<string | null>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

function NotificationItem({ notification, onRemove }: { notification: Notification, onRemove: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onRemove(notification.id), 300)
    }, notification.duration || 5000)

    return () => clearTimeout(timer)
  }, [notification.id, notification.duration, onRemove])

  const typeStyles = {
    success: 'border-emerald-200 bg-emerald-50',
    error: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50',
    info: 'border-indigo-200 bg-indigo-50'
  }

  const textStyles = {
    success: 'text-emerald-800',
    error: 'text-red-800',
    warning: 'text-amber-800',
    info: 'text-indigo-800'
  }

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-indigo-500" />
  }

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
        max-w-sm w-full bg-white border rounded-lg shadow-sm p-4 pointer-events-auto
        ${typeStyles[notification.type]}
      `}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {icons[notification.type]}
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className={`text-sm font-medium ${textStyles[notification.type]}`}>{notification.title}</p>
          {notification.message && (
            <p className={`mt-1 text-sm opacity-80 ${textStyles[notification.type]}`}>{notification.message}</p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="inline-flex text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
            onClick={() => {
              setIsVisible(false)
              setTimeout(() => onRemove(notification.id), 300)
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Modal({ modal, onClose }: { modal: ModalProps, onClose: () => void }) {
  const [inputValue, setInputValue] = useState(modal.promptDefaultValue || '')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleConfirm = () => {
    setIsVisible(false)
    setTimeout(() => {
      modal.onConfirm(modal.type === 'prompt' ? inputValue : undefined)
      onClose()
    }, 150)
  }

  const handleCancel = () => {
    setIsVisible(false)
    setTimeout(() => {
      modal.onCancel()
      onClose()
    }, 150)
  }

  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-all duration-300 ease-in-out
        ${isVisible ? 'bg-black/50' : 'bg-transparent'}
      `}
    >
      <div
        className={`
          bg-white rounded-xl border border-slate-200 shadow-lg max-w-md w-full mx-auto
          transform transition-all duration-300 ease-in-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{modal.title}</h3>
        </div>

        <div className="px-6 py-4">
          <p className="text-slate-600 text-sm mb-4">{modal.message}</p>
          {modal.type === 'prompt' && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={modal.promptPlaceholder || 'Voer waarde in...'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm() } }}
            />
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 rounded-b-xl flex space-x-3 justify-end border-t border-slate-100">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {modal.cancelText || 'Annuleren'}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {modal.confirmText || 'Bevestigen'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [modal, setModal] = useState<ModalProps | null>(null)

  const showNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { ...notification, id }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const showConfirm = (props: Omit<ModalProps, 'id' | 'type' | 'onConfirm' | 'onCancel'>): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Date.now().toString()
      setModal({
        ...props,
        id,
        type: 'confirm',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })
  }

  const showPrompt = (props: Omit<ModalProps, 'id' | 'type' | 'onConfirm' | 'onCancel'> & { promptPlaceholder?: string, promptDefaultValue?: string }): Promise<string | null> => {
    return new Promise((resolve) => {
      const id = Date.now().toString()
      setModal({
        ...props,
        id,
        type: 'prompt',
        onConfirm: (value) => resolve(value || null),
        onCancel: () => resolve(null)
      })
    })
  }

  const closeModal = () => setModal(null)

  return (
    <NotificationContext.Provider value={{ showNotification, showConfirm, showPrompt }}>
      {children}

      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-3 pointer-events-none w-full max-w-md">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </div>

      {modal && <Modal modal={modal} onClose={closeModal} />}
    </NotificationContext.Provider>
  )
}
