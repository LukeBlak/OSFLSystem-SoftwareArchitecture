import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react' // ← Cambia esto por tu framework (vue, svelte, etc.)

export default defineConfig({
  // plugins: [react()], // ← Descomenta y ajusta según tu framework

  server: {
    port: 5173, // Puerto del frontend (puedes cambiarlo si lo necesitas)
    open: true, // Abre el navegador automáticamente al iniciar
    proxy: {
      // Todas las peticiones que empiecen con /api se redirigen al backend
      '/api': {
        target: 'http://localhost:3000/api', // Dirección de tu backend
        changeOrigin: true,              // Necesario para proxies virtuales
        secure: false,                   // Ignora certificados SSL inválidos (útil en dev)
        // rewrite: (path) => path.replace(/^\/api/, '') // ← Descomenta si tu backend NO usa el prefijo /api
      }
    }
  },
})