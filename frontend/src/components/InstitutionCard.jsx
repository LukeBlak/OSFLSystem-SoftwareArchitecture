import React from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Trash2, Building2, Mail, Phone, Wallet } from 'lucide-react';

/**
 * InstitutionCard - Componente de lista larga para administración
 */
const InstitutionCard = ({ organization, onDelete }) => {
  const {
    id,
    nombre,
    tipo,
    descripcion,
    email,
    telefono,
    saldoActual,
  } = organization;

  // Lógica para Desactivar (Delete)
  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas desactivar la organización "${nombre}"?`)) {
      try {
        const response = await fetch(`/api/organizations/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          if (onDelete) onDelete(id);
        } else {
          const error = await response.json();
          alert(`Error: ${error.message || 'No se pudo desactivar'}`);
        }
      } catch (error) {
        console.error('Error al desactivar:', error);
      }
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col md:flex-row items-center gap-6">
      
      {/* Icono/Avatar de la Organización */}
      <div className="bg-[#DCECE7] p-4 rounded-lg flex-shrink-0">
        <Building2 className="text-[#22C55E] w-8 h-8" />
      </div>

      {/* Información Principal */}
      <div className="flex-grow space-y-1 text-center md:text-left">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <Link 
            to={`/organizations/${id}`} // Link a detalles
            className="font-['Poppins'] text-[#1F2937] text-xl font-semibold hover:text-[#22C55E] transition-colors"
          >
            {nombre}
          </Link>
          <span className="inline-block px-3 py-1 bg-[#E0F2FE] text-[#38BDF8] text-xs font-medium rounded-full font-['Inter'] self-center md:self-auto">
            {tipo}
          </span>
        </div>
        <p className="font-['Inter'] text-[#64748B] text-sm line-clamp-1 max-w-md">
          {descripcion || 'Sin descripción disponible'}
        </p>
      </div>

      {/* Contacto y Saldo */}
      <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 border-x-0 md:border-x border-[#E2E8F0] px-0 md:px-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#64748B] font-['Inter'] text-sm">
            <Mail className="w-4 h-4 text-[#38BDF8]" />
            <span>{email}</span>
          </div>
          <div className="flex items-center gap-2 text-[#64748B] font-['Inter'] text-sm">
            <Phone className="w-4 h-4 text-[#38BDF8]" />
            <span>{telefono || 'N/A'}</span>
          </div>
        </div>
        
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[#1F2937] font-['Poppins'] font-bold">
            <Wallet className="w-4 h-4 text-[#22C55E]" />
            <span>${saldoActual?.toLocaleString('es-SV', { minimumFractionDigits: 2 })}</span>
          </div>
          <span className="text-[10px] text-[#64748B] font-['Inter'] uppercase tracking-wider">Saldo Disponible</span>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-2 w-full md:w-auto">
        {/* BOTÓN ACTUALIZAR: redirige a la página de actualización */}
        <Link
          to={`/ActualizacionOrganizacion/${id}`}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#7C3AED] hover:opacity-90 text-[#FFFFFF] px-4 py-2 rounded-lg font-['Inter'] text-sm font-medium transition-all"
        >
          <Edit2 className="w-4 h-4" />
          Actualizar
        </Link>

        {/* BOTÓN ELIMINAR */}
        <button
          onClick={handleDelete}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-transparent border border-[#E2E8F0] hover:bg-red-50 text-red-500 px-4 py-2 rounded-lg font-['Inter'] text-sm font-medium transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default InstitutionCard;