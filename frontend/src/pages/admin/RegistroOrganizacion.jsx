import React, { useState } from 'react';

const RegisterOrganization = () => {
  // Estado inicial del formulario basado en los campos del controlador
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'ONG', // Valor por defecto según el servicio
    descripcion: '',
    direccion: '',
    telefono: '',
    email: '',
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Ejemplo de recuperación de token
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al registrar la organización');
      }

      setStatus({
        type: 'success',
        message: result.message || 'Organización registrada exitosamente',
      });
      
      // Limpiar formulario tras éxito
      setFormData({
        nombre: '',
        tipo: 'ONG',
        descripcion: '',
        direccion: '',
        telefono: '',
        email: '',
      });

    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1F2937] font-poppins">
            Registrar Organización
          </h1>
          <p className="mt-2 text-[#64748B] font-inter">
            Crear un nuevo perfil institucional en el sistema.
          </p>
        </div>

        {/* Card del Formulario */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Mensajes de Feedback */}
            {status.message && (
              <div className={`p-4 rounded-lg font-inter text-sm ${
                status.type === 'success' 
                ? 'bg-[#DCECE7] text-[#16A34A] border border-[#22C55E]/20' 
                : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {status.message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre - Requerido */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#1F2937] font-poppins mb-1">
                  Nombre de la Organización *
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej. Asociación de Voluntarios"
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none font-inter text-[#1F2937] transition-all"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-[#1F2937] font-poppins mb-1">
                  Tipo
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#38BDF8] focus:border-transparent outline-none font-inter text-[#1F2937] bg-white transition-all"
                >
                  <option value="ONG">ONG</option>
                  <option value="Asociación">Asociación</option>
                  <option value="Fundación">Fundación</option>
                  <option value="Cooperativa">Cooperativa</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[#1F2937] font-poppins mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contacto@organizacion.org"
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#38BDF8] focus:border-transparent outline-none font-inter text-[#1F2937] transition-all"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-[#1F2937] font-poppins mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+503 2222-0000"
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#38BDF8] focus:border-transparent outline-none font-inter text-[#1F2937] transition-all"
                />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-[#1F2937] font-poppins mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Calle Principal #123"
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#38BDF8] focus:border-transparent outline-none font-inter text-[#1F2937] transition-all"
                />
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#1F2937] font-poppins mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  rows="4"
                  value={formData.descripcion}
                  onChange={handleChange}
                  placeholder="Describe la misión y visión de la organización..."
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#38BDF8] focus:border-transparent outline-none font-inter text-[#1F2937] transition-all resize-none"
                ></textarea>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-4 flex items-center justify-end space-x-4">
              <button
                type="button"
                className="px-6 py-2 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-gray-50 font-poppins font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-8 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#FFFFFF] rounded-lg font-poppins font-semibold transition-all shadow-md active:transform active:scale-95 flex items-center ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </>
                ) : (
                  'Registrar Organización'
                )}
              </button>
            </div>
          </form>
        </div>
        
      </div>
    </div>
  );
};

export default RegisterOrganization;