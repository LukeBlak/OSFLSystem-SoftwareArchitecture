import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { 
  FolderKanban, 
  Clock, 
  Wallet, 
  BarChart3, 
  Users, 
  CheckCircle2, 
  PiggyBank,
  ArrowRight
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Operaciones',
      description: 'Gestión de proyectos y comités',
      icon: FolderKanban,
      iconBg: 'bg-[#6d28d9]',
      stats: '12 proyectos',
      statsColor: 'text-[#0d9488]',
      link: '/operaciones',
      items: [
        { name: 'Planificar Proyecto', path: '/operaciones/planificar' },
        { name: 'Vincular Comité', path: '/operaciones/vincular' },
        { name: 'Aprobar Participantes', path: '/operaciones/aprobar' }
      ]
    },
    {
      title: 'Horas Sociales',
      description: 'Registro y validación de horas',
      icon: Clock,
      iconBg: 'bg-[#0d9488]',
      stats: '48 hrs validadas',
      statsColor: 'text-[#0d9488]',
      link: '/horas',
      items: [
        { name: 'Registro Asistencia', path: '/horas/asistencia' },
        { name: 'Validar Horas', path: '/horas/validar' },
        { name: 'Historial', path: '/horas/historial' }
      ]
    },
    {
      title: 'Finanzas',
      description: 'Control de ingresos y egresos',
      icon: Wallet,
      iconBg: 'bg-[#7dd3fc]',
      stats: '$12,450 saldo',
      statsColor: 'text-[#0d9488]',
      link: '/finanzas',
      items: [
        { name: 'Consultar Caja', path: '/finanzas/caja' },
        { name: 'Reportes', path: '/finanzas/reportes' }
      ]
    }
  ];

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
      value: '$8,0',
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
          {modules.map((module, index) => {
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