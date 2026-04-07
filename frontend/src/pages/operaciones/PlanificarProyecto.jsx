import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { Calendar, CheckCircle2, ClipboardList, FolderKanban, Leaf, GraduationCap, Heart, Building2, ChevronRight, AlertCircle } from 'lucide-react';
import { createProject } from '../../services/projectService';
import { getCommittees } from '../../services/committeeService';
import authService from '../../services/authService';

const PlanificarProyecto = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    fecha_inicio: today,
    fecha_fin: today,
    cupos: '',
    presupuesto_asignado: '',
    recomendacion_horas: '',
    comiteid: '',
  });
  const [committees, setCommittees] = useState([]);
  const [loadingCommittees, setLoadingCommittees] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const committeeIcons = useMemo(() => ({
    'Medio Ambiente': Leaf,
    Educación: GraduationCap,
    Salud: Heart,
    'Desarrollo Comunitario': Building2,
    default: FolderKanban,
  }), []);

  useEffect(() => {
    loadCommittees();
  }, []);

  const normalizeCommittees = (response) => {
    const items = Array.isArray(response?.data)
      ? response.data
      : response?.data?.committees || response?.data || [];

    return items.map((committee) => ({
      ...committee,
      name: committee.nombre || committee.name,
      description: committee.descripcion || committee.description,
    }));
  };

  const loadCommittees = async () => {
    setLoadingCommittees(true);
    try {
      const currentUser = authService.getUser();
      const organizationId = currentUser?.organizationId
        || currentUser?.organizacionId
        || currentUser?.organization_id
        || currentUser?.organizacion_id
        || null;

      const response = await getCommittees({
        limit: 100,
        organizacionId: organizationId || undefined,
      });
      setCommittees(normalizeCommittees(response));
    } catch (apiError) {
      setError(apiError.userMessage || apiError.message || 'No se pudieron cargar los comités');
    } finally {
      setLoadingCommittees(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));

    if (errors[name]) {
      setErrors((previous) => ({ ...previous, [name]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio';
    if (!formData.descripcion.trim()) nextErrors.descripcion = 'La descripción es obligatoria';

    if (!formData.cupos || Number(formData.cupos) < 1) {
      nextErrors.cupos = 'Los cupos deben ser al menos 1';
    }

    if (!formData.fecha_inicio) {
      nextErrors.fecha_inicio = 'La fecha de inicio es obligatoria';
    }

    if (!formData.fecha_fin) {
      nextErrors.fecha_fin = 'La fecha de fin es obligatoria';
    } else if (formData.fecha_inicio && new Date(formData.fecha_fin) <= new Date(formData.fecha_inicio)) {
      nextErrors.fecha_fin = 'La fecha de fin debe ser posterior a la de inicio';
    }

    if (formData.presupuesto_asignado && Number(formData.presupuesto_asignado) < 0) {
      nextErrors.presupuesto_asignado = 'El presupuesto no puede ser negativo';
    }

    if (formData.recomendacion_horas && Number(formData.recomendacion_horas) < 0) {
      nextErrors.recomendacion_horas = 'La recomendación de horas no puede ser negativa';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        cupos: Number(formData.cupos),
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        presupuesto_asignado: formData.presupuesto_asignado === '' ? 0 : Number(formData.presupuesto_asignado),
        recomendacion_horas: formData.recomendacion_horas === '' ? 0 : Number(formData.recomendacion_horas),
        comiteid: formData.comiteid || undefined,
      };

      const response = await createProject(payload);
      const createdProject = response?.data?.project || response?.data || response;
      const createdProjectId = createdProject?.id || createdProject?.project?.id;

      navigate(createdProjectId ? `/proyectos/vincular/${createdProjectId}` : '/proyectos/vincular');
    } catch (apiError) {
      setError(apiError.userMessage || apiError.message || 'Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  };

  const getCommitteeIcon = (committeeName) => committeeIcons[committeeName] || committeeIcons.default;

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner 
        title="Planificar Nuevo Proyecto"
        subtitle="Crea un nuevo proyecto de voluntariado"
      />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-4xl">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-inter">
            {error}
          </div>
        )}

        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Información del Proyecto</h2>
          <p className="font-inter text-[#64748b]">Completa los campos del proyecto antes de enlazarlo con un comité.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          <div className="space-y-6">
            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Nombre del Proyecto <span className="text-red-500">*</span></label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className={`input-field ${errors.nombre ? 'border-red-500' : ''}`} placeholder="Ej: Campaña de Reforestación 2026" />
              {errors.nombre && <p className="mt-1 text-sm text-red-500 font-inter">{errors.nombre}</p>}
            </div>

            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Descripción <span className="text-red-500">*</span></label>
              <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows="4" className={`input-field ${errors.descripcion ? 'border-red-500' : ''}`} placeholder="Describa los objetivos y alcance del proyecto..." />
              {errors.descripcion && <p className="mt-1 text-sm text-red-500 font-inter">{errors.descripcion}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Fecha de Inicio <span className="text-red-500">*</span></label>
                <input type="date" name="fecha_inicio" value={formData.fecha_inicio} onChange={handleChange} className={`input-field ${errors.fecha_inicio ? 'border-red-500' : ''}`} />
                {errors.fecha_inicio && <p className="mt-1 text-sm text-red-500 font-inter">{errors.fecha_inicio}</p>}
              </div>

              <div>
                <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Fecha de Fin <span className="text-red-500">*</span></label>
                <input type="date" name="fecha_fin" value={formData.fecha_fin} onChange={handleChange} className={`input-field ${errors.fecha_fin ? 'border-red-500' : ''}`} />
                {errors.fecha_fin && <p className="mt-1 text-sm text-red-500 font-inter">{errors.fecha_fin}</p>}
              </div>
            </div>

            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Cupos <span className="text-red-500">*</span></label>
              <input type="number" name="cupos" value={formData.cupos} onChange={handleChange} className={`input-field ${errors.cupos ? 'border-red-500' : ''}`} placeholder="Cantidad máxima de participantes" min="1" step="1" />
              {errors.cupos && <p className="mt-1 text-sm text-red-500 font-inter">{errors.cupos}</p>}
            </div>

            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Presupuesto Asignado</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-[#64748b]">$</span>
                <input type="number" name="presupuesto_asignado" value={formData.presupuesto_asignado} onChange={handleChange} className={`input-field pl-8 ${errors.presupuesto_asignado ? 'border-red-500' : ''}`} placeholder="0.00" min="0" step="0.01" />
              </div>
              {errors.presupuesto_asignado && <p className="mt-1 text-sm text-red-500 font-inter">{errors.presupuesto_asignado}</p>}
              <p className="mt-1 text-xs text-[#64748b] font-inter">Monto opcional para el proyecto</p>
            </div>

            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Recomendación de Horas</label>
              <input type="number" name="recomendacion_horas" value={formData.recomendacion_horas} onChange={handleChange} className={`input-field ${errors.recomendacion_horas ? 'border-red-500' : ''}`} placeholder="Horas sugeridas por participante" min="0" step="0.5" />
              {errors.recomendacion_horas && <p className="mt-1 text-sm text-red-500 font-inter">{errors.recomendacion_horas}</p>}
            </div>

            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Comité Responsable</label>
              <select name="comiteid" value={formData.comiteid} onChange={handleChange} className="input-field" disabled={loadingCommittees}>
                <option value="">Sin comité asignado por ahora</option>
                {committees.map((committee) => (
                  <option key={committee.id} value={committee.id}>
                    {committee.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[#64748b] font-inter">Puedes dejarlo vacío y vincular el comité después.</p>
            </div>

            {committees.length > 0 && (
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8faf9] p-4">
                <div className="flex items-center gap-2 mb-3"><ClipboardList size={18} className="text-[#0d9488]" /><h3 className="font-poppins font-semibold text-[#1f2937]">Comités disponibles</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {committees.slice(0, 4).map((committee, index) => {
                    const IconComponent = getCommitteeIcon(committee.name);
                    const colorClass = ['bg-[#0d9488]', 'bg-[#6d28d9]', 'bg-[#14b8a6]', 'bg-[#2563eb]'][index % 4];

                    return (
                      <div key={committee.id} className="flex items-center gap-3 rounded-lg bg-white p-3 border border-[#e2e8f0]">
                        <div className={`${colorClass} w-10 h-10 rounded-lg flex items-center justify-center`}>
                          <IconComponent size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="font-poppins font-semibold text-[#1f2937]">{committee.name}</p>
                          <p className="font-inter text-xs text-[#64748b]">{committee.description || 'Sin descripción'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#E0F2FE] border border-[#7dd3fc] p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-[#0d9488] mt-0.5 flex-shrink-0" />
              <p className="font-inter text-sm text-[#1f2937]">El proyecto se guardará con los nombres de campo esperados por el backend. Si ya eliges comité aquí, el vínculo queda listo desde la creación.</p>
            </div>
          </div>

          <div className="mt-8 flex gap-4 pt-6 border-t border-[#e2e8f0]">
            <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <span className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />Guardando...</span> : <span className="flex items-center justify-center gap-2">Guardar Proyecto<ChevronRight size={18} /></span>}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PlanificarProyecto;