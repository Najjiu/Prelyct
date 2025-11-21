'use client'

import { useState, useCallback } from 'react'

export interface AlertOptions {
  title?: string
  type?: 'info' | 'success' | 'warning' | 'error'
  confirmText?: string
  onConfirm?: () => void
}

export function useAlert() {
  const [alert, setAlert] = useState<{
    open: boolean
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    confirmText: string
    onConfirm?: () => void
  }>({
    open: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
  })

  const showAlert = useCallback((message: string, options?: AlertOptions) => {
    setAlert({
      open: true,
      title: options?.title || 'Alert',
      message,
      type: options?.type || 'info',
      confirmText: options?.confirmText || 'OK',
      onConfirm: options?.onConfirm,
    })
  }, [])

  const closeAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }))
  }, [])

  return {
    alert,
    showAlert,
    closeAlert,
  }
}

export interface ConfirmOptions {
  title?: string
  type?: 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
}

export function useConfirm() {
  const [confirm, setConfirm] = useState<{
    open: boolean
    title: string
    message: string
    type: 'warning' | 'danger'
    confirmText: string
    cancelText: string
    onConfirm: () => void
  }>({
    open: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
  })

  const showConfirm = useCallback((
    message: string,
    onConfirm: () => void,
    options?: ConfirmOptions
  ) => {
    setConfirm({
      open: true,
      title: options?.title || 'Confirm',
      message,
      type: options?.type || 'warning',
      confirmText: options?.confirmText || 'Confirm',
      cancelText: options?.cancelText || 'Cancel',
      onConfirm,
    })
  }, [])

  const closeConfirm = useCallback(() => {
    setConfirm((prev) => ({ ...prev, open: false }))
  }, [])

  return {
    confirm,
    showConfirm,
    closeConfirm,
  }
}

