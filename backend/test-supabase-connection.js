import { supabase, checkSupabaseConnection } from './src/config/supabase.js';
import { env } from './src/config/env.js';

console.log('🔍 ========================================');
console.log('🔍 PRUEBA DE CONEXIÓN A SUPABASE');
console.log('🔍 ========================================\n');

// 1. Verificar variables de entorno
console.log('📋 1. VERIFICANDO VARIABLES DE ENTORNO...');
console.log(`   SUPABASE_URL: ${env.SUPABASE_URL ? '✅ Configurada' : '❌ Faltante'}`);
console.log(`   SUPABASE_ANON_KEY: ${env.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Faltante'}`);
console.log('');

// 2. Verificar conexión
console.log('📡 2. VERIFICANDO CONEXIÓN A LA BASE DE DATOS...');
const connectionStatus = await checkSupabaseConnection();

if (connectionStatus.isConnected) {
  console.log('   ✅ CONEXIÓN EXITOSA');
} else {
  console.log('   ❌ CONEXIÓN FALLIDA');
  console.log(`   Error: ${connectionStatus.error?.message}`);
}
console.log('');

// 3. Probar consulta
console.log('📊 3. PROBANDO CONSULTA A TABLA "usuario"...');
try {
  const { data, error } = await supabase
    .from('usuario')
    .select('id, email')
    .limit(1);

  if (error) {
    console.log('   ❌ ERROR EN CONSULTA');
    console.log(`   Código: ${error.code}`);
    console.log(`   Mensaje: ${error.message}`);
  } else {
    console.log('   ✅ CONSULTA EXITOSA');
    console.log(`   Registros encontrados: ${data?.length || 0}`);
  }
} catch (error) {
  console.log('   ❌ EXCEPCIÓN EN CONSULTA');
  console.log(`   Error: ${error.message}`);
}
console.log('');

console.log('🔍 ========================================');
console.log('🔍 PRUEBA COMPLETADA');
console.log('🔍 ========================================\n');

process.exit(connectionStatus.isConnected ? 0 : 1);