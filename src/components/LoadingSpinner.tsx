import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  console.log('🔄 LoadingSpinner: Renderovan sa text:', text)
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className={`animate-spin text-blue-600 ${sizeClasses[size]}`} />
      {text && (
        <p className="mt-4 text-gray-600 text-sm">{text}</p>
      )}
      <p className="mt-2 text-xs text-gray-400">Učitavanje aplikacije...</p>
    </div>
  )
}