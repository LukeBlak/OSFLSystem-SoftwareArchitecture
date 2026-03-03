import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { 
  Users, 
  Leaf, 
  GraduationCap, 
  Heart, 
  Building2,
  Check
} from 'lucide-react';

const VincularComite = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  
  const [projects, setProjects] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCommittee, setSelectedCommittee] = useState('');
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // Colores para los comités (de la paleta definida)
  const committeeColors = [
    'bg-[#6d28d9]',    // Violet oscuro - Operaciones
    'bg-[#0d9488]',    // Teal - Horas Sociales  
    'bg-[#7dd3fc]',    // Azul claro - Finanzas
    'bg-[#8B5CF6]',    // Violet medio
    'bg-[#2dd4bf]',    // Turquesa
    'bg-[#14b8a6]',    // Teal medio
  ];

  // Iconos para diferentes tipos de comités
  const committeeIcons = {
    'Medio Ambiente': Leaf,
    'Educación': GraduationCap,
    'Salud': Heart,
    'Desarrollo Comunitario': Building2,
    'default': Users
  };

  useEffect(() => {
    fetchProjects();
    fetchCommittees();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      const project = projects.find(p => p.id === parseInt(selectedProject));
      setProjectDetails(project || null);
    } else {
      setProjectDetails(null);
    }
  }, [selectedProject, projects]);

  const fetchProjects = async () => {
    // Simulación de datos - En producción sería llamada a API
    setProjects([
      {
        id: 1,
        name: 'Campaña de Reforestación 2026',
        description: 'Proyecto de reforestación en áreas urbanas y rurales para mejorar la calidad del aire y promover la biodiversidad local.',
        startDate: '2026-03-15',
        endDate: '2026-06-30',
        budget: 5000,
        status: 'Planificado'
      },
      {
        id: 2,
        name: 'Alfabetización Digital',
        description: 'Programa de capacitación en herramientas digitales básicas para adultos mayores y personas con acceso limitado a tecnología.',
        startDate: '2026-03-20',
        endDate: '2026-05-15',
        budget: 3000,
        status: 'Planificado'
      },
      {
        id: 3,
        name: 'Jornada de Salud Preventiva',
        description: 'Realización de chequeos médicos gratuitos, vacunación y charlas educativas sobre prevención de enfermedades.',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        budget: 4500,
        status: 'Planificado'
      }
    ]);
  };

  const fetchCommittees = async () => {
    // Simulación de datos - En producción sería llamada a API
    setCommittees([
      { 
        id: 1, 
        name: 'Medio Ambiente', 
        description: 'Proyectos ecológicos y de conservación ambiental', 
        members: 12 
      },
      { 
        id: 2, 
        name: 'Educación', 
        description: 'Alfabetización y capacitación comunitaria', 
        members: 8 
      },
      { 
        id: 3, 
        name: 'Salud', 
        description: 'Promoción de salud preventiva y bienestar', 
        members: 15 
      },
      { 
        id: 4, 
        name: 'Desarrollo Comunitario', 
        description: 'Proyectos de mejora social y comunitaria', 
        members: 10 
      }
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProject) {
      alert('Seleccione un proyecto');
      return;
    }

    if (!selectedCommittee) {
      alert('Seleccione un comité');
      return;
    }

    setLoading(true);
    
    try {
      // API call: vincular proyecto a comité
      const committee = committees.find(c => c.id === parseInt(selectedCommittee));
      const project = projects.find(p => p.id === parseInt(selectedProject));
      
      alert(`Proyecto "${project.name}" vinculado exitosamente al comité "${committee.name}"`);
      navigate('/');
    } catch (error) {
      alert('Error al vincular el comité');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCommitteeIcon = (committeeName) => {
    return committeeIcons[committeeName] || committeeIcons['default'];
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner 
        title="Vincular Comité al Proyecto"
        subtitle="Asigna un comité responsable para la ejecución del proyecto"
      />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-5xl">
        {/* Header de la página */}
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">
            Información del Proyecto y Comité
          </h2>
          <p className="font-inter text-[#64748b]">
            Seleccione un proyecto y asigne el comité que lo ejecutará
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Selección de Proyecto */}
          <div className="card p-8">
            <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-6">
              1. Seleccionar Proyecto
            </h3>

            <div className="mb-6">
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                Proyecto <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="input-field"
              >
                <option value="">Seleccione un proyecto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Detalles del Proyecto Seleccionado */}
            {projectDetails && (
              <div className="bg-[#E0F2FE] border border-[#7dd3fc] rounded-lg p-6 animate-fade-in">
                <h4 className="font-poppins font-bold text-lg text-[#0f766e] mb-4">
                  Detalles del Proyecto
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="font-inter text-sm text-[#64748b] mb-1">Descripción</p>
                    <p className="font-inter text-[#1f2937]">{projectDetails.description}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="font-inter text-sm text-[#64748b] mb-1">Presupuesto</p>
                      <p className="font-poppins font-bold text-[#0d9488] text-lg">
                        {formatCurrency(projectDetails.budget)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-inter text-sm text-[#64748b] mb-1">Fecha de Inicio</p>
                      <p className="font-inter text-[#1f2937]">
                        📅 {formatDate(projectDetails.startDate)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-inter text-sm text-[#64748b] mb-1">Fecha de Fin</p>
                      <p className="font-inter text-[#1f2937]">
                        📅 {formatDate(projectDetails.endDate)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-inter text-sm text-[#64748b] mb-1">Estado</p>
                      <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-[#0d9488] text-white">
                        {projectDetails.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selección de Comité */}
          <div className="card p-8">
            <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-6">
              2. Seleccionar Comité Responsable
            </h3>

            <div className="space-y-4">
              {committees.map((committee, index) => {
                const colorClass = committeeColors[index % committeeColors.length];
                const isSelected = selectedCommittee === committee.id.toString();
                const IconComponent = getCommitteeIcon(committee.name);
                
                return (
                  <label
                    key={committee.id}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'border-[#0d9488] bg-[#ccfbf1]' 
                        : 'border-[#e2e8f0] hover:border-[#0f766e]'
                      }`}
                  >
                    <input
                      type="radio"
                      name="committee"
                      value={committee.id}
                      checked={isSelected}
                      onChange={(e) => setSelectedCommittee(e.target.value)}
                      className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488]"
                    />
                    
                    {/* Icono del comité con color */}
                    <div className={`${colorClass} w-12 h-12 rounded-lg flex items-center justify-center ml-4 mr-4`}>
                      <IconComponent size={24} className="text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-poppins font-semibold text-[#1f2937]">
                        {committee.name}
                      </p>
                      <p className="font-inter text-sm text-[#64748b]">
                        {committee.description}
                      </p>
                      <p className="font-inter text-xs text-[#64748b] mt-1">
                        {committee.members} miembros activos
                      </p>
                    </div>
                    
                    {isSelected && (
                      <div className="text-[#0d9488]">
                        <Check size={24} />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-outline flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedProject || !selectedCommittee}
              className="btn-primary flex-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Vinculando...
                </span>
              ) : (
                'Vincular Comité'
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Animación CSS */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default VincularComite;