/**
 * Servicio de autenticación
 * Centraliza todas las llamadas al backend relacionadas con auth.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Guarda la sesión en localStorage */
const saveSession = ({ token, user }) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

/** Elimina la sesión de localStorage */
const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/** Devuelve el token guardado */
const getToken = () => localStorage.getItem('token');

/** Devuelve el usuario guardado (objeto) */
const getUser = () => {
  const raw = localStorage.getItem('user');
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) return null;

    const technicalRoles = new Set(['authenticated', 'anon', 'service_role']);
    const roleCandidates = [
      parsed.role,
      parsed.rol,
      parsed.user_metadata?.role,
      parsed.raw_user_meta_data?.role,
      'miembro',
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    const role = roleCandidates.find((candidate) => !technicalRoles.has(candidate)) || 'miembro';

    const organizationId = (
      parsed.organizationId
      || parsed.organizacionId
      || parsed.organization_id
      || parsed.organizacion_id
      || parsed.profile?.organizationId
      || parsed.profile?.organizacionId
      || parsed.profile?.organization_id
      || parsed.profile?.organizacion_id
      || parsed.user_metadata?.organizationId
      || parsed.user_metadata?.organization_id
      || parsed.user_metadata?.organizacionId
      || parsed.user_metadata?.organizacion_id
      || null
    );

    return {
      ...parsed,
      role: String(role).toLowerCase(),
      organizationId,
    };
  } catch {
    return null;
  }
};

/** Retorna true si hay una sesión activa */
const isAuthenticated = () => !!getToken();

// ─── Llamadas al backend ─────────────────────────────────────────────────────

/**
 * Iniciar sesión
 * @param {string} email
 * @param {string} password
 * @returns {{ token, user }} datos de sesión
 */
const login = async (email, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  // ✅ Manejar errores ANTES de hacer response.json()
  if (!response.ok) {
    let errorData = {};
    let errorMessage = 'Error al iniciar sesión';
    let userMessage = 'Credenciales inválidas';
    
    try {
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        errorData = await response.json();
        // Extraer mensajes del backend
        errorMessage = errorData?.error?.message || errorData?.message || errorMessage;
        userMessage = errorData?.error?.userMessage || errorData?.userMessage || errorMessage;
      } else {
        const textBody = await response.text();
        if (textBody?.trim()) {
          errorMessage = textBody;
          userMessage = response.status >= 500
            ? 'Error interno del servidor'
            : userMessage;
        }
      }
    } catch (parseError) {
      console.warn('Error parsing response:', parseError);
    }

    // ✅ Usar userMessage si existe (mensaje amigable)
    const displayMessage = userMessage || errorMessage;
    
    console.error('❌ Error de login:', {
      status: response.status,
      code: errorData?.error?.code,
      message: errorMessage,
      userMessage: displayMessage,
    });

    // Lanzar error con toda la información
    throw {
      status: response.status,
      code: errorData?.error?.code || 'UNKNOWN_ERROR',
      message: errorMessage,
      userMessage: displayMessage,
    };
  }

  const data = await response.json();

  // Guardar sesión
  saveSession({
    token: data.data?.token,
    user: data.data?.user,
  });

  return data.data;
};

/**
 * Cerrar sesión
 * Llama al backend y limpia la sesión local.
 */
const logout = async () => {
  const token = getToken();
  try {
    await fetch(`${API_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } finally {
    clearSession();
  }
};

/**
 * Verificar si la sesión sigue activa consultando /me
 * @returns {Object|null} usuario o null si la sesión expiró
 */
const checkSession = async () => {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const data = await response.json();
    return data.data.user;
  } catch {
    return null;
  }
};

/**
 * Helper: obtiene headers de autenticación para otras peticiones
 */
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// ─── Redirección según rol ───────────────────────────────────────────────────

/**
 * Devuelve la ruta de inicio según el rol del usuario.
 * Ajusta según los roles definidos en User.js del backend.
 */
const getHomeByRole = (role) => {
  switch (role) {
    case 'super_admin':
      return '/admin';
    case 'admin':
      return '/';
    case 'lider_organizacion':
    case 'lider_comite':
      return '/';
    case 'miembro':
    default:
      return '/';
  }
};

const authService = {
  login,
  logout,
  checkSession,
  saveSession,
  clearSession,
  getToken,
  getUser,
  isAuthenticated,
  authHeaders,
  getHomeByRole,
};

export default authService;
