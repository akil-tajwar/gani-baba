// hooks/use-cart.tsx
'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import type { GetProductType } from '@/utils/type'

interface CartItem {
  productId: number
  name: string
  price: number
  quantity: number
  url: string
  discount: number
  productCode: string
  brandName: string
}

interface CartContextType {
  cartItems: CartItem[]
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  addToCart: (product: GetProductType, quantity?: number) => void
  updateQuantity: (productId: number, newQuantity: number) => void
  removeFromCart: (productId: number) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
  getCartItemQuantity: (productId: number) => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart')
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart)
          setCartItems(parsedCart)
        } catch (error) {
          console.error('Error parsing cart from localStorage:', error)
          localStorage.removeItem('cart')
        }
      }
      setIsInitialized(true)
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(cartItems))
    }
  }, [cartItems, isInitialized])

  const addToCart = (product: GetProductType, quantity: number = 1) => {
    const productId = product.productId ?? 0
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.productId === productId)

      if (existingItem) {
        return prevItems.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }

      const newItem: CartItem = {
        productId,
        name: product.name,
        price: product.price * (1 - (product.discount ?? 0) / 100),
        quantity,
        url: product.photoUrl || '',
        discount: product.discount ?? 0,
        productCode: product.productCode ?? '',
        brandName: product.brandName ?? '',
      }
      return [...prevItems, newItem]
    })
  }

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const removeFromCart = (productId: number) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.productId !== productId)
    )
  }

  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem('cart')
  }

  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    )
  }

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  const getCartItemQuantity = (productId: number) => {
    const item = cartItems.find((item) => item.productId === productId)
    return item ? item.quantity : 0
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getTotalPrice,
        getTotalItems,
        getCartItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
