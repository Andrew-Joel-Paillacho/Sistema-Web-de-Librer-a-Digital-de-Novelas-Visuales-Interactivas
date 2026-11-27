import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
   base:'/Sistema-Web-de-Librer-a-Digital-de-Novelas-Visuales-Interactivas/kleeBunko_Front/',
})
