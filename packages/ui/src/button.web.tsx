import type { ReactNode } from 'react'
import { Button as HeroButton } from '@heroui/react'

export interface ButtonProps {
  children: ReactNode
  onPress?: () => void
  isDisabled?: boolean
}

export function Button({ children, onPress, isDisabled }: ButtonProps) {
  return (
    <HeroButton onPress={onPress} isDisabled={isDisabled}>
      {children}
    </HeroButton>
  )
}
