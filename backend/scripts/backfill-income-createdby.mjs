import { supabaseAdmin } from '../src/config/supabase.js';

const run = async () => {
  const { data: ingresos, error: loadError } = await supabaseAdmin
    .from('ingreso')
    .select('id, registradopor, creado_por')
    .is('creado_por', null)
    .not('registradopor', 'is', null)
    .limit(1000);

  if (loadError) {
    console.error('LOAD_ERROR', loadError);
    process.exitCode = 1;
    return;
  }

  const rows = ingresos || [];
  let updatedIngreso = 0;
  let updatedBase = 0;

  for (const row of rows) {
    const userId = row.registradopor;
    if (!userId) continue;

    const ingresoUpdate = await supabaseAdmin
      .from('ingreso')
      .update({ creado_por: userId })
      .eq('id', row.id)
      .is('creado_por', null);

    if (!ingresoUpdate.error) {
      updatedIngreso += 1;
    }

    const baseUpdate = await supabaseAdmin
      .from('transaccion_financiera')
      .update({ creado_por: userId })
      .eq('id', row.id)
      .is('creado_por', null);

    if (!baseUpdate.error) {
      updatedBase += 1;
    }
  }

  console.log('ROWS_FOUND', rows.length);
  console.log('INGRESO_UPDATED', updatedIngreso);
  console.log('BASE_UPDATED', updatedBase);
};

run().catch((error) => {
  console.error('FATAL', error);
  process.exitCode = 1;
});
