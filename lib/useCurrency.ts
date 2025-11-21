import { useState, useEffect } from 'react'
import { getUserCurrency, formatCurrency as formatCurrencyUtil } from './currency'

/**
 * Hook to get and use user's currency preference
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<'GHS' | 'USD' | 'EUR'>('GHS')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserCurrency().then(userCurrency => {
      setCurrency(userCurrency)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  const formatCurrency = (amount: number) => formatCurrencyUtil(amount, currency)

  return { currency, formatCurrency, loading }
}


