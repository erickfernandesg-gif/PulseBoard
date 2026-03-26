'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Inicializa o cliente com privilégios de Administrador (Bypassa RLS do Banco)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function createEmployee(formData: any) {
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        full_name: formData.full_name
      }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // CORREÇÃO CRÍTICA: Adicionado o 'email' no payload para não violar o Not-Null Constraint
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: formData.email, // <--- AQUI ESTAVA O SEU ERRO!
      full_name: formData.full_name,
      role: formData.role,
      team_id: formData.team_id || null,
    });

    if (profileError) throw profileError;

    return { success: true };
  } catch (error: any) {
    console.error("Erro na criação do usuário:", error);
    return { success: false, error: error.message };
  }
}

// NOVA FUNÇÃO: Atualizar usuário usando a chave Mestra para não ser bloqueado pela segurança do Supabase
export async function updateEmployee(userId: string, formData: any) {
  try {
    const { error: profileError } = await supabaseAdmin.from("profiles").update({ 
      full_name: formData.full_name,
      role: formData.role, 
      team_id: formData.team_id || null 
    }).eq("id", userId);
    
    if (profileError) throw profileError;

    // Atualiza o Custo por Hora
    if (formData.hourly_rate !== undefined) {
      const numericRate = Number(formData.hourly_rate);
      if (!isNaN(numericRate) && numericRate >= 0) {
        const { error: rateError } = await supabaseAdmin.from("user_rates").upsert({ 
          user_id: userId, 
          hourly_rate: numericRate 
        }, { onConflict: 'user_id' });
        
        if (rateError) throw rateError;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Erro na atualização do usuário:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEmployee(userId: string) {
  try {
    await supabaseAdmin.from('tasks').update({ assigned_to: null }).eq('assigned_to', userId);
    await supabaseAdmin.from('task_collaborators').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_rates').delete().eq('user_id', userId);
    await supabaseAdmin.from('task_comments').delete().eq('user_id', userId);
    await supabaseAdmin.from('time_logs').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir usuário:", error);
    return { success: false, error: error.message };
  }
}