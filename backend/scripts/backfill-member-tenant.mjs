import { supabaseAdmin } from '../src/config/supabase.js';

const resolveOrgIdForMember = async (member) => {
  const membershipsRes = await supabaseAdmin
    .from('miembro_comite')
    .select('comite:comiteid(organizacionid)')
    .eq('miembroid', member.id)
    .limit(1000);

  if (!membershipsRes.error && membershipsRes.data) {
    for (const row of membershipsRes.data) {
      if (row?.comite?.organizacionid) {
        return row.comite.organizacionid;
      }
    }
  }

  if (member.creado_por) {
    const leaderRes = await supabaseAdmin
      .from('lider_organizacion')
      .select('organizacionid')
      .eq('id', member.creado_por)
      .limit(1)
      .maybeSingle();

    if (!leaderRes.error && leaderRes.data?.organizacionid) {
      return leaderRes.data.organizacionid;
    }
  }

  return null;
};

const main = async () => {
  const membersRes = await supabaseAdmin
    .from('miembro')
    .select('id,creado_por')
    .limit(5000);

  if (membersRes.error) {
    console.error('members error', membersRes.error);
    process.exit(1);
  }

  let updated = 0;
  let unresolved = 0;

  for (const member of membersRes.data || []) {
    const orgId = await resolveOrgIdForMember(member);

    const authRes = await supabaseAdmin.auth.admin.getUserById(member.id);
    if (authRes.error || !authRes.data?.user) {
      continue;
    }

    const currentMeta = authRes.data.user.user_metadata || {};
    const newMeta = {
      ...currentMeta,
      role: 'miembro',
      organization_id: orgId,
    };

    const updRes = await supabaseAdmin.auth.admin.updateUserById(member.id, {
      user_metadata: newMeta,
    });

    if (updRes.error) {
      console.error('auth update error', member.id, updRes.error.message);
      continue;
    }

    if (!orgId) {
      unresolved += 1;
    }

    updated += 1;
  }

  console.log('metadata repaired, updated:', updated, 'unresolved:', unresolved);
};

main();
