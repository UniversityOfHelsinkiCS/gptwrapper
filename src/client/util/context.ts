import { createContext, RefObject } from 'react'

/**
 * Context to hold the reference to the App component which is the most parent component in the application.
 * This is used to help trigger auto scrolling when chat containers expands.
 */
export const AppContext = createContext<RefObject<HTMLDivElement> | null>(null)
