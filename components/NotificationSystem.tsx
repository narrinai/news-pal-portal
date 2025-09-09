'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    info: 'bg-brand-50 border-brand-200 text-brand-800'
  }

  const iconStyles = {
    success: 'text-success-400',
    error: 'text-red-400',
    warning: 'text-warning-400',
    info: 'text-brand-400'
  }

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  }

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
        max-w-sm w-full bg-white border-l-4 rounded-lg shadow-lg p-4 pointer-events-auto
        ${typeStyles[notification.type]}
      `}
    >
      <div className="flex">
        <div className={`flex-shrink-0 ${iconStyles[notification.type]}`}>
          {icons[notification.type]}
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium">{notification.title}</p>
          {notification.message && (
            <p className="mt-1 text-sm opacity-90">{notification.message}</p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition ease-in-out duration-150"
            onClick={() => {
              setIsVisible(false)
              setTimeout(() => onRemove(notification.id), 300)
            }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
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
      if (e.key === 'Escape') {
        handleCancel()
      }
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
        ${isVisible ? 'bg-black bg-opacity-50' : 'bg-transparent'}
      `}
    >
      <div
        className={`
          bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto
          transform transition-all duration-300 ease-in-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 font-brand">
            {modal.title}
          </h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-600 mb-4">{modal.message}</p>
          
          {modal.type === 'prompt' && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={modal.promptPlaceholder || 'Voer waarde in...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleConfirm()
                }
              }}
            />
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex space-x-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            {modal.cancelText || 'Annuleren'}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-brand rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
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
      
      {/* Notifications - Centered for landscape */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-3 pointer-events-none w-full max-w-md">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </div>

      {/* Modal */}
      {modal && <Modal modal={modal} onClose={closeModal} />}
    </NotificationContext.Provider>
  )
}