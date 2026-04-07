import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import authService from '../services/authService';
import { canAccessRoute } from '../config/accessControl';
import { getProjects } from '../services/projectService';
import { getMembers } from '../services/memberService';
import { getFinancialSummary } from '../services/financeService';
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const resolveOrganizationId = (user) => (
  user?.organizationId
    || user?.organizacionId
    || user?.organization_id
    || user?.organizacion_id
    || user?.profile?.organizationId
    || user?.profile?.organizacionId
    || user?.profile?.organization_id
    || user?.profile?.organizacion_id
    || user?.user_metadata?.organizationId
    || user?.user_metadata?.organizacionId
    || user?.user_metadata?.organization_id
    || user?.user_metadata?.organizacion_id
    || ''
);

const Dashboard = () => {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const role = String(currentUser?.role || '').toLowerCase();
  const [organizationId, setOrganizationId] = useState(resolveOrganizationId(currentUser));
  const [statsValues, setStatsValues] = useState({
    activeProjects: 0,
    volunteers: 0,
    validatedHours: 0,
    cashBalance: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    hydrateOrganizationAndLoadStats();
  }, [organizationId, role]);

  const hydrateOrganizationAndLoadStats = async () => {
    let nextOrganizationId = organizationId;
    if (!nextOrganizationId) {
      const sessionUser = await authService.checkSession();
      nextOrganizationId = resolveOrganizationId(sessionUser);

      if (!nextOrganizationId) {
        const profileResponse = await fetch(`${API_URL}/profile`, {
          method: 'GET',
          headers: authService.authHeaders(),
        });

        if (profileResponse.ok) {
          const profilePayload = await profileResponse.json().catch(() => ({}));
          nextOrganizationId = profilePayload?.data?.profile?.organizationId
            || profilePayload?.data?.profile?.organization_id
            || '';
        }
      }

      if (nextOrganizationId && nextOrganizationId !== organizationId) {
        setOrganizationId(nextOrganizationId);
      }
    }

    await loadAssociationStats(nextOrganizationId);
  };

  const loadAssociationStats = async (resolvedOrganizationId = '') => {
    setLoadingStats(true);

    const canReadMembers = ['admin', 'super_admin', 'lider_organizacion', 'lider_comite'].includes(role);
    const canReadFinance = ['admin', 'super_admin', 'lider_organizacion'].includes(role);
    const needsOrganizationForMembers = ['lider_organizacion', 'lider_comite'].includes(role);
    const canRequestMembers = canReadMembers && (!needsOrganizationForMembers || Boolean(resolvedOrganizationId));

    try {
      const [projectsResult, membersResult, financeResult] = await Promise.allSettled([
        getProjects({ organizacionid: resolvedOrganizationId || undefined, limit: 100 }),
        canRequestMembers ? getMembers({ organizacionId: resolvedOrganizationId || undefined, limit: 100 }) : Promise.resolve(null),
        canReadFinance && resolvedOrganizationId ? getFinancialSummary({ organizacionId: resolvedOrganizationId }) : Promise.resolve(null),
      ]);

      const projectsPayload = projectsResult.status === 'fulfilled'
        ? projectsResult.value
        : null;
      const projectsList = Array.isArray(projectsPayload?.data)
        ? projectsPayload.data
        : Array.isArray(projectsPayload?.data?.projects)
          ? projectsPayload.data.projects
          : [];

      const activeProjects = projectsList.filter((project) => {
        const status = String(project.estado || project.status || '').toLowerCase();
        if (!status) return true;
        return !['finalizado', 'cancelado', 'cerrado', 'inactivo'].includes(status);
      }).length;

      const membersPayload = membersResult.status === 'fulfilled'
        ? membersResult.value
        : null;
      const membersList = Array.isArray(membersPayload?.data)
        ? membersPayload.data
        : Array.isArray(membersPayload?.data?.members)
          ? membersPayload.data.members
          : [];

      const volunteers = membersList.length;
      const validatedHours = membersList.reduce((sum, member) => {
        const memberHours = Number(
          member.horasTotales
          ?? member.horastotales
          ?? member.horas_validadas
          ?? member.horasvalidadas
          ?? 0
        );
        return sum + (Number.isNaN(memberHours) ? 0 : memberHours);
      }, 0);

      const financePayload = financeResult.status === 'fulfilled'
        ? financeResult.value
        : null;
      const summary = financePayload?.data?.summary || financePayload?.data || {};
      const cashBalance = Number(summary.balance ?? summary.saldo ?? 0);

      setStatsValues({
        activeProjects,
        volunteers,
        validatedHours,
        cashBalance: Number.isNaN(cashBalance) ? 0 : cashBalance,
      });
    } catch {
      setStatsValues({
        activeProjects: 0,
        volunteers: 0,
        validatedHours: 0,
        cashBalance: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

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
      value: loadingStats ? '...' : String(statsValues.activeProjects),
      color: 'bg-[#C4B5FD]',
      icon: BarChart3
    },
    {
      title: 'Voluntarios',
      value: loadingStats ? '...' : String(statsValues.volunteers),
      color: 'bg-[#2dd4bf]',
      icon: Users
    },
    {
      title: 'Horas Validadas',
      value: loadingStats ? '...' : String(statsValues.validatedHours),
      color: 'bg-[#E0F2FE]',
      icon: CheckCircle2
    },
    {
      title: 'Saldo en Caja',
      value: loadingStats ? '...' : formatCurrency(statsValues.cashBalance),
      color: 'bg-[#ccfbf1]',
      icon: PiggyBank
    }
  ];

  const visibleStatsCards = role === 'miembro'
    ? statsCards.filter((stat) => stat.title === 'Proyectos Activos')
    : statsCards;

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
        <div className={`grid grid-cols-1 ${role === 'miembro' ? 'md:grid-cols-1' : 'md:grid-cols-4'} gap-4`}>
          {visibleStatsCards.map((stat, index) => {
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