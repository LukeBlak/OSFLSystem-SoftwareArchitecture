import app from './src/app.js';
import { env, isDevelopment } from './src/config/env.js';
import { checkSupabaseConnection } from './src/config/supabase.js';
import { logger } from './src/utils/logger.js';

async function startServer() {
  try {
    // Verificar conexión a Supabase
    logger.info('🔍 Verificando conexión a Supabase...');
    const connectionStatus = await checkSupabaseConnection();
    
    if (!connectionStatus.isConnected) {
      logger.error('❌ No se pudo conectar a Supabase', connectionStatus.error);
      if (!isDevelopment) {
        process.exit(1);
      }
    } else {
      logger.info('✅ Conexión a Supabase establecida');
    }
    
    // Iniciar servidor
    const server = app.listen(env.PORT, () => {
      logger.info('🚀 Servidor iniciado', {
        puerto: env.PORT,
        entorno: env.NODE_ENV,
        url: `http://localhost:${env.PORT}`,
      });
      
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀  OSFLSystem Backend - Servidor Iniciado             ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║   📡 Puerto:        ${env.PORT}
║   🔧 Entorno:       ${env.NODE_ENV}
║   🗄️  Supabase:      ${connectionStatus.isConnected ? '✅ Conectado' : '⚠️  Desconectado'}
║                                                           ║
║   📍 API:           http://localhost:${env.PORT}/api      ║
║   🏥 Health:        http://localhost:${env.PORT}/api/health║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
    
    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`🛑 Señal ${signal} recibida. Cerrando servidor...`);
      server.close(() => {
        logger.info('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

startServer();