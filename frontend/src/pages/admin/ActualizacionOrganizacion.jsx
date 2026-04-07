import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const ActualizacionOrganizacion = () => {
  const { id } = useParams(); // Captura el ID desde la URL
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'ONG',
    descripcion: '',
    direccion: '',
    telefono: '',
    email: '',
  });

  const [loading, setLoading] = useState(true); // Para la carga inicial de datos
  const [updating, setUpdating] = useState(false); // Para el proceso de fetch PUT
  const [status, setStatus] = useState({ type: '', message: '' });

  // 1. Cargar los datos actuales de la organización al montar el componente
  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        const response = await fetch(`/api/organizations/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const result = await response.json();

        if (!response.ok) throw new Error(result.message || 'No se pudo cargar la información');

        // Llenamos el formulario con los datos recibidos (el backend devuelve un objeto organization)
        const org = result.data.organization;
        setFormData({
          nombre: org.nombre || '',
          tipo: org.tipo || 'ONG',
          descripcion: org.descripcion || '',
          direccion: org.direccion || '',
          telefono: org.telefono || '',
          email: org.email || '',
        });
      } catch (error) {
        setStatus({ type: 'error', message: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 2. Lógica de Actualización (PUT)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al actualizar la organización');
      }

      setStatus({
        type: 'success',
        message: 'Organización actualizada correctamente. Redirigiendo...',
      });
      
      // 3. Redirigir a la lista después de un breve delay para mostrar éxito
      setTimeout(() => {
        navigate('/organizations'); // Ajustar esta ruta a la del router
      }, 1500);

    } catch (error) {
      setStatus({ type: 'error', message: error.message });
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9]">
        <Loader2 className="w-10 h-10 text-[#22C55E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Botón Volver */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#64748B] hover:text-[#1F2937] font-inter mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la lista
        </button>

        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1F2937] font-poppins">
            Actualizar Organización
          </h1>
          <p className="mt-2 text-[#64748B] font-inter">
            Modifica la información de la institución seleccionada.
          </p>
        </div>

        {/* Card del Formulario */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
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
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none font-inter text-[#1F2937] transition-all"
                />
              </div>

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

              <div>
                <label className="block text-sm font-medium text-[#1F2937] font-poppins mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
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
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#38BDF8] focus:border-transparent outline-none font-inter text-[#1F2937] transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#1F2937] font-poppins mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  rows="4"
                  value={formData.descripcion}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#38BDF8] focus:border-transparent outline-none font-inter text-[#1F2937] transition-all resize-none"
                ></textarea>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-gray-50 font-poppins font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updating}
                className={`px-8 py-2 bg-[#7C3AED] hover:opacity-90 text-[#FFFFFF] rounded-lg font-poppins font-semibold transition-all shadow-md active:transform active:scale-95 flex items-center gap-2 ${
                  updating ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {updating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {updating ? 'Guardando cambios...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ActualizacionOrganizacion;