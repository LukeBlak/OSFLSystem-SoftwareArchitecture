import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, Mail, Phone, MapPin, Wallet, 
  Calendar, Clock, ArrowLeft, BarChart3, Edit 
} from 'lucide-react';

const DetalleOrganizacion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrgDetails = async () => {
      try {
        const response = await fetch(`/api/organizations/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.message || 'No se pudo obtener la información');
        
        setOrganization(result.data.organization);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22C55E]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] p-8 flex flex-col items-center justify-center">
        <p className="text-red-500 font-inter mb-4">{error}</p>
        <button 
          onClick={() => navigate(-1)}
          className="bg-[#22C55E] text-white px-6 py-2 rounded-lg font-poppins"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  const {
    nombre,
    tipo,
    descripcion,
    direccion,
    telefono,
    email,
    saldoActual,
    fechaCreacion,
    fechaEdicion
  } = organization;

  return (
    <div className="min-h-screen bg-[#F8FAF9] p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        
        {/* Navegación y Acciones Rápidas */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#64748B] hover:text-[#1F2937] font-inter transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver a la gestión</span>
          </button>

          <div className="flex gap-3">
            <Link
              to={`/ActualizacionOrganizacion/${id}`}
              className="flex items-center gap-2 bg-white border border-[#E2E8F0] text-[#1F2937] px-4 py-2 rounded-lg font-inter text-sm font-medium hover:bg-gray-50 transition-all"
            >
              <Edit className="w-4 h-4 text-[#7C3AED]" />
              Editar Perfil
            </Link>
            <Link
              to={`/EstadisticasOrganizacion/${id}`}
              className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#FFFFFF] px-4 py-2 rounded-lg font-inter text-sm font-medium transition-all shadow-sm"
            >
              <BarChart3 className="w-4 h-4" />
              Ver estadísticas y detalles
            </Link>
          </div>
        </div>

        {/* Card Principal de Información */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          
          {/* Header de la Card */}
          <div className="bg-[#DCECE7] p-8 flex flex-col md:flex-row items-center gap-6 border-b border-[#E2E8F0]">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <Building2 className="w-12 h-12 text-[#22C55E]" />
            </div>
            <div className="text-center md:text-left">
              <span className="inline-block px-3 py-1 bg-[#E0F2FE] text-[#38BDF8] text-xs font-bold rounded-full font-inter mb-2">
                {tipo}
              </span>
              <h1 className="text-3xl font-bold text-[#1F2937] font-poppins">{nombre}</h1>
              <p className="text-[#64748B] font-inter mt-1 max-w-2xl">{descripcion}</p>
            </div>
          </div>

          {/* Cuerpo de Detalles */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Columna 1: Contacto */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider font-poppins">Contacto Directo</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-[#EDE9FE] p-2 rounded-lg">
                    <Mail className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] font-inter">Correo electrónico</p>
                    <p className="text-[#1F2937] font-medium font-inter">{email || 'No proporcionado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-[#E0F2FE] p-2 rounded-lg">
                    <Phone className="w-5 h-5 text-[#38BDF8]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] font-inter">Teléfono</p>
                    <p className="text-[#1F2937] font-medium font-inter">{telefono || 'No proporcionado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-[#DCECE7] p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-[#22C55E]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] font-inter">Ubicación física</p>
                    <p className="text-[#1F2937] font-medium font-inter leading-tight">{direccion || 'No proporcionada'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 2: Finanzas */}
            <div className="space-y-6 border-x-0 md:border-x border-[#E2E8F0] px-0 md:px-8">
              <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider font-poppins">Resumen Financiero</h3>
              <div className="bg-[#F8FAF9] p-6 rounded-2xl border border-[#DCECE7]">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="w-5 h-5 text-[#22C55E]" />
                  <span className="text-sm text-[#64748B] font-inter">Saldo Actual</span>
                </div>
                <p className="text-4xl font-bold text-[#1F2937] font-poppins">
                  ${saldoActual?.toLocaleString('es-SV', { minimumFractionDigits: 2 })}
                </p>
                <div className="mt-4 pt-4 border-t border-[#DCECE7]">
                  <p className="text-[10px] text-[#64748B] font-inter leading-tight">
                    * Este saldo representa los fondos totales disponibles para proyectos y operaciones.
                  </p>
                </div>
              </div>
            </div>

            {/* Columna 3: Registro */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider font-poppins">Trazabilidad</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#64748B]" />
                  <div>
                    <p className="text-xs text-[#64748B] font-inter">Fecha de creación</p>
                    <p className="text-[#1F2937] font-medium font-inter">
                      {new Date(fechaCreacion).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                {fechaEdicion && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#64748B]" />
                    <div>
                      <p className="text-xs text-[#64748B] font-inter">Última actualización</p>
                      <p className="text-[#1F2937] font-medium font-inter">
                        {new Date(fechaEdicion).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Informativo */}
        <div className="mt-8 text-center">
          <p className="text-[#64748B] font-inter text-sm">
            ID del Sistema: <span className="font-mono text-xs">{id}</span>
          </p>
        </div>

      </div>
    </div>
  );
};

export default DetalleOrganizacion;