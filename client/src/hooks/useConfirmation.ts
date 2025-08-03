import { useState, useCallback } from 'react'

export interface ConfirmationOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  severity?: 'warning' | 'error' | 'info'
  warnings?: string[]
  details?: string
}

export interface ConfirmationState extends ConfirmationOptions {
  open: boolean
  isLoading: boolean
  onConfirm?: () => void | Promise<void>
}

export const useConfirmation = () => {
  const [state, setState] = useState<ConfirmationState>({
    open: false,
    isLoading: false,
    title: '',
    message: ''
  })

  const showConfirmation = useCallback((
    options: ConfirmationOptions,
    onConfirm: () => void | Promise<void>
  ) => {
    setState({
      ...options,
      open: true,
      isLoading: false,
      onConfirm
    })
  }, [])

  const hideConfirmation = useCallback(() => {
    setState(prev => ({
      ...prev,
      open: false,
      isLoading: false
    }))
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!state.onConfirm) return

    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      await state.onConfirm()
      hideConfirmation()
    } catch (error) {
      // Keep dialog open if there's an error
      setState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }, [state.onConfirm, hideConfirmation])

  return {
    confirmationState: state,
    showConfirmation,
    hideConfirmation,
    handleConfirm
  }
}

export default useConfirmation