import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import authService from '../services/authService';
import { canAccessRoute } from '../config/accessControl';
import { 
  FolderKanban, 
  Clock, 
  Wallet, 
  BarChart3, 
  Users, 
  CheckCircle2, 
  PiggyBank,
  ArrowRight,
  Settings
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const role = String(authService.getUser()?.role || '').toLowerCase();

  const canSeeModule = (allowedRoles = []) => {
    if (allowedRoles.length === 0) return true;
    return allowedRoles.includes(role);
  };

  const modules = [
    ...(canSeeModule(['super_admin']) ? [
      {
        title: 'Administración',
        description: 'Gestión de organizaciones y configuración',
        icon: Settings,
        iconBg: 'bg-[#f59e0b]',
        stats: 'Configuración del sistema',
        statsColor: 'text-[#f59e0b]',
        link: '/admin',
        allowedRoles: ['super_admin'],
        items: [
          { name: 'Dashboard Admin', path: '/admin' },
          { name: 'Gestionar Organizaciones', path: '/admin/organizaciones' },
          { name: 'Gestionar Usuarios', path: '/admin/usuarios' },
          { name: 'Nueva Organización', path: '/admin/organizaciones/nueva' }
        ]
      }
    ] : []),
    ...(canSeeModule(['admin', 'lider_organizacion', 'lider_comite', 'miembro']) ? [{
      title: 'Operaciones',
      description: 'Gestión de proyectos y comités',
      icon: FolderKanban,
      iconBg: 'bg-[#6d28d9]',
      stats: 'Proyectos activos',
      statsColor: 'text-[#0d9488]',
      link: '/proyectos/planificar',
      allowedRoles: ['admin', 'lider_organizacion', 'lider_comite', 'miembro'],
      items: [
        { name: 'Planificar Proyecto', path: '/proyectos/planificar' },
        { name: 'Vincular Comité', path: '/proyectos/vincular' },
        { name: 'Inscribirse a Proyecto', path: '/proyectos/inscribirse' },
        { name: 'Aprobar Participantes', path: '/proyectos/aprobar' }
      ]
    }] : []),
    ...(canSeeModule(['admin', 'lider_organizacion', 'lider_comite', 'miembro']) ? [{
      title: 'Horas Sociales',
      description: 'Registro y validación de horas',
      icon: Clock,
      iconBg: 'bg-[#0d9488]',
      stats: 'Horas validadas',
      statsColor: 'text-[#0d9488]',
      link: '/horas/asistencia',
      allowedRoles: ['admin', 'lider_organizacion', 'lider_comite', 'miembro'],
      items: [
        { name: 'Registro Asistencia', path: '/horas/asistencia' },
        { name: 'Validar Horas', path: '/horas/validar' },
        { name: 'Historial Personal', path: '/horas/historial' }
      ]
    }] : []),
    ...(canSeeModule(['admin', 'lider_organizacion']) ? [{
      title: 'Finanzas',
      description: 'Control de ingresos y egresos',
      icon: Wallet,
      iconBg: 'bg-[#7dd3fc]',
      stats: 'Caja y reportes',
      statsColor: 'text-[#0d9488]',
      link: '/finanzas/caja',
      allowedRoles: ['admin', 'lider_organizacion'],
      items: [
        { name: 'Ingresos', path: '/finanzas/ingreso/nuevo' },
        { name: 'Egresos', path: '/finanzas/egreso/nuevo' },
        { name: 'Consulta Caja', path: '/finanzas/caja' },
        { name: 'Reportes', path: '/finanzas/reportes' }
      ]
    }] : [])
  ];

  const visibleModules = modules
    .map((module) => {
      const allowedItems = module.items.filter((item) => canAccessRoute(role, item.path));
      if (allowedItems.length === 0) {
        return null;
      }

      return {
        ...module,
        items: allowedItems,
        link: allowedItems[0].path,
      };
    })
    .filter(Boolean);

  const statsCards = [
    {
      title: 'Proyectos Activos',
      value: '5',
      color: 'bg-[#C4B5FD]',
      icon: BarChart3
    },
    {
      title: 'Voluntarios',
      value: '48',
      color: 'bg-[#2dd4bf]',
      icon: Users
    },
    {
      title: 'Horas Validadas',
      value: '320',
      color: 'bg-[#E0F2FE]',
      icon: CheckCircle2
    },
    {
      title: 'Saldo en Caja',
      value: '$8,300',
      color: 'bg-[#ccfbf1]',
      icon: PiggyBank
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />
      
      {/* Main Content */}
      <main className="container mx-auto px-6 pt-28 pb-12">
        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {visibleModules.map((module, index) => {
            const IconComponent = module.icon;
            return (
              <div
                key={index}
                className="card p-6 cursor-pointer"
                onClick={() => navigate(module.link)}
              >
                <div className={`${module.iconBg} w-14 h-14 rounded-lg flex items-center 
                                justify-center mb-4`}>
                  <IconComponent size={32} className="text-white" />
                </div>
                <h3 className="font-poppins font-bold text-xl text-text-primary mb-2">
                  {module.title}
                </h3>
                <p className="font-inter text-text-secondary mb-4">{module.description}</p>
                <div className={`${module.statsColor} font-poppins font-semibold mb-4`}>
                  {module.stats}
                </div>
                
                <div className="space-y-2">
                  {module.items.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(item.path);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg 
                               hover:bg-gray-50 text-sm font-inter text-text-secondary
                               transition-colors duration-200 flex items-center gap-2"
                    >
                      <ArrowRight size={14} />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-inter text-text-secondary text-sm">{stat.title}</p>
                    <p className="font-poppins font-bold text-2xl text-text-primary mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.color} w-12 h-12 rounded-full flex items-center 
                                  justify-center`}>
                    <IconComponent size={24} className="text-text-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;