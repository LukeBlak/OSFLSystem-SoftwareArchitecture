import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import {
  Building2,
  Plus,
  Users,
  TrendingUp,
  Settings,
  ArrowRight,
  Loader
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalMembers: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await fetch(`${API_URL}/organizations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const organizations = data.data?.organizations || [];
        
        setStats({
          totalOrganizations: organizations.length,
          activeOrganizations: organizations.filter(org => org.estado !== 'inactiva').length,
          totalMembers: organizations.reduce((sum, org) => sum + (org.miembros || 0), 0),
          loading: false,
          error: null
        });
      } else {
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Error al cargar estadísticas'
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const adminModules = [
    {
      title: 'Gestionar Organizaciones',
      description: 'Ver, editar y administrar todas las organizaciones del sistema',
      icon: Building2,
      iconBg: 'bg-[#3b82f6]',
      link: '/admin/organizaciones',
      actions: [
        { label: 'Ver Todas', path: '/admin/organizaciones' },
        { label: 'Nueva Organización', path: '/admin/organizaciones/nueva' }
      ]
    },
    {
      title: 'Gestionar Usuarios',
      description: 'Visualizar usuarios registrados y su rol dentro del sistema',
      icon: Users,
      iconBg: 'bg-[#0d9488]',
      link: '/admin/usuarios',
      actions: [
        { label: 'Ver Usuarios', path: '/admin/usuarios' }
      ]
    },
    {
      title: 'Configuración del Sistema',
      description: 'Ajustar parámetros generales y políticas de la plataforma',
      icon: Settings,
      iconBg: 'bg-[#8b5cf6]',
      link: '/admin',
      actions: [
        { label: 'Configuración General (Próximamente)', path: '/admin' }
      ]
    }
  ];

  const statCards = [
    {
      title: 'Organizaciones Totales',
      value: stats.totalOrganizations,
      color: 'bg-[#dbeafe]',
      icon: Building2,
      iconColor: 'text-[#3b82f6]'
    },
    {
      title: 'Organizaciones Activas',
      value: stats.activeOrganizations,
      color: 'bg-[#dcfce7]',
      icon: TrendingUp,
      iconColor: 'text-[#16a34a]'
    },
    {
      title: 'Miembros Totales',
      value: stats.totalMembers,
      color: 'bg-[#fce7f3]',
      icon: Users,
      iconColor: 'text-[#ec4899]'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />

      <main className="container mx-auto px-6 pt-28 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-text-primary mb-2">
            Panel Administrativo
          </h1>
          <p className="font-inter text-text-secondary">
            Gestiona las organizaciones y configuración del sistema
          </p>
        </div>

        {/* Stats Cards */}
        {!stats.loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statCards.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-inter text-text-secondary text-sm font-semibold">
                      {stat.title}
                    </h3>
                    <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                      <IconComponent size={24} className={stat.iconColor} />
                    </div>
                  </div>
                  <p className="font-poppins font-bold text-3xl text-text-primary">
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {stats.loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-[#0d9488]" size={32} />
          </div>
        )}

        {stats.error && (
          <div className="card p-4 mb-8 bg-red-50 border border-red-200">
            <p className="text-red-700 font-inter">{stats.error}</p>
          </div>
        )}

        {/* Admin Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminModules.map((module, index) => {
            const IconComponent = module.icon;
            return (
              <div
                key={index}
                className="card p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${module.iconBg} w-14 h-14 rounded-lg flex items-center justify-center`}>
                    <IconComponent size={28} className="text-white" />
                  </div>
                </div>

                <h3 className="font-poppins font-bold text-xl text-text-primary mb-2">
                  {module.title}
                </h3>
                <p className="font-inter text-text-secondary text-sm mb-6">
                  {module.description}
                </p>

                {/* Actions */}
                <div className="space-y-3">
                  {module.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(action.path)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg
                               hover:bg-gray-50 border border-gray-200 transition-colors duration-200
                               font-inter text-text-primary text-sm"
                    >
                      <span>{action.label}</span>
                      <ArrowRight size={16} className="text-text-secondary" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 card p-6">
          <h3 className="font-poppins font-bold text-lg text-text-primary mb-4">
            Acciones Rápidas
          </h3>
          <button
            onClick={() => navigate('/admin/organizaciones/nueva')}
            className="flex items-center gap-2 px-6 py-3 bg-[#0d9488] text-white rounded-lg
                     hover:bg-[#0a7a73] transition-colors duration-200 font-inter font-semibold"
          >
            <Plus size={20} />
            Nueva Organización
          </button>
        </div>
      </main>
    </div>
  );
};

export default DashboardAdmin;
