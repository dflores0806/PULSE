import { createContext, useContext } from 'react'
export const ModelContext = createContext(null)
export const useModel = () => useContext(ModelContext)