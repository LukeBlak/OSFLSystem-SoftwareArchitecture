import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, ChevronDown, Home, Building2, Calendar } from 'lucide-react';
import logo from '../assets/logo.png';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEstructuraMenu, setShowEstructuraMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert('Sesión cerrada');
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav className="navbar fixed w-full top-0 z-50 shadow-lg">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          
          
          <div className="flex items-center gap-4">
            {/* Logo y Título 
            <img 
              src={logo} 
              alt="SIGEVOL Logo" 
              className="h-12 w-auto"
            />*/}
            
            <div 
              className="flex flex-col cursor-pointer"
              onClick={() => navigate('/')}
            >
              <h1 className="font-poppins font-bold text-2xl text-text-light">
                SIGEVOL - Actividades
              </h1>
              <p className="font-inter text-sm text-text-subtitle">
                Operaciones, Horas Sociales y Finanzas
              </p>
            </div>
          </div>

          {/* Navegación Central */}
          <div className="hidden md:flex items-center space-x-2">
            
            {/* Inicio */}
            <button
              onClick={() => navigate('/')}
              className={`nav-link flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/' ? 'bg-white/10' : 'hover:bg-white/10'
              }`}
            >
              <Home size={18} />
              Inicio
            </button>

            {/* Estructura (Dropdown) - RUTAS CORRECTAS DEL SEGUNDO APP */}
            <div className="relative">
              <button
                onClick={() => setShowEstructuraMenu(!showEstructuraMenu)}
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/estructura') ? 'bg-white/10' : 'hover:bg-white/10'
                }`}
              >
                <Building2 size={18} />
                Estructura
                <ChevronDown
                  size={16}
                  className={`transition-transform ${showEstructuraMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown Menu - Estructura */}
              {showEstructuraMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-border py-2 z-50">
                  
                  {/* Organizaciones */}
                  <div className="px-4 py-2 text-xs font-inter font-semibold text-text-secondary border-b border-border mb-1">
                    ORGANIZACIONES
                  </div>
                  <button
                    onClick={() => {
                      navigate('/estructura/organizaciones');
                      setShowEstructuraMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-text-primary font-inter hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Building2 size={16} className="text-[#8B5CF6]" />
                    <span className="font-semibold text-sm">Consultar</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/estructura/organizaciones/nueva');
                      setShowEstructuraMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-text-primary font-inter hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Building2 size={16} className="text-[#8B5CF6]" />
                    <span className="font-semibold text-sm">Registrar Nueva</span>
                  </button>

                  <hr className="my-2 border-border" />

                  {/* Miembros */}
                  <div className="px-4 py-2 text-xs font-inter font-semibold text-text-secondary border-b border-border mb-1">
                    MIEMBROS
                  </div>
                  <button
                    onClick={() => {
                      navigate('/estructura/miembros');
                      setShowEstructuraMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-text-primary font-inter hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <User size={16} className="text-[#2dd4bf]" />
                    <span className="font-semibold text-sm">Listado</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/estructura/miembros/nuevo');
                      setShowEstructuraMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-text-primary font-inter hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <User size={16} className="text-[#2dd4bf]" />
                    <span className="font-semibold text-sm">Registrar Nuevo</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/estructura/miembros/baja/1');
                      setShowEstructuraMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-text-primary font-inter hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <User size={16} className="text-[#2dd4bf]" />
                    <span className="font-semibold text-sm">Dar de Baja</span>
                  </button>

                  <hr className="my-2 border-border" />

                  {/* Comités */}
                  <div className="px-4 py-2 text-xs font-inter font-semibold text-text-secondary border-b border-border mb-1">
                    COMITÉS
                  </div>
                  <button
                    onClick={() => {
                      navigate('/estructura/comites');
                      setShowEstructuraMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-text-primary font-inter hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Building2 size={16} className="text-[#0d9488]" />
                    <span className="font-semibold text-sm">Consultar</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/estructura/comites/nuevo');
                      setShowEstructuraMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-text-primary font-inter hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Building2 size={16} className="text-[#0d9488]" />
                    <span className="font-semibold text-sm">Crear Comité</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/estructura/comites/1/gestion');
                      setShowEstructuraMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-text-primary font-inter hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Building2 size={16} className="text-[#0d9488]" />
                    <span className="font-semibold text-sm">Gestionar</span>
                  </button>
                </div>
              )}
            </div>

            {/* Actividades */}
            <button 
              onClick={() => navigate('/')}
              className={`nav-link flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isActive('/actividades') ? 'bg-white/10' : 'hover:bg-white/10'
              }`}
            >
              <Calendar size={18} />
              Actividades
            </button>
          </div>

          {/* Perfil Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 text-text-light hover:text-white transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <ChevronDown 
                size={16} 
                className={`transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-border py-2 z-50">
                <button
                  onClick={() => {
                    navigate('/perfil');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-text-primary font-inter hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <User size={16} />
                  Ver Perfil
                </button>
                <hr className="my-2 border-border" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 font-inter hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;