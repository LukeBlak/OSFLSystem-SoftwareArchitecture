import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown, Home, Building2, Calendar } from 'lucide-react';
import logo from '../assets/logo.png';

const Navbar = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    alert('Sesión cerrada');
    navigate('/');
  };

  return (
    <nav className="navbar fixed w-full top-0 z-50 shadow-lg">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo y Título */}
          <div className="flex items-center gap-4">
            {/* Logo 
            <img 
                src={logo} 
                alt="SIGEVOL Logo" 
                className="h-48 w-auto"
            />*/}
            
            {/* Texto */}
            <div className="flex flex-col">
              <h1 className="font-poppins font-bold text-2xl text-text-light">
                SIGEVOL - Actividades
              </h1>
              <p className="font-inter text-sm text-text-subtitle">
                Operaciones, Horas Sociales y Finanzas
              </p>
            </div>
          </div>

          {/* Navegación Central */}
          <div className="hidden md:flex items-center space-x-8">
            <button className="nav-link flex items-center gap-2">
              <Home size={18} />
              Inicio
            </button>
            <button className="nav-link flex items-center gap-2">
              <Building2 size={18} />
              Estructura
            </button>
            <button 
              onClick={() => navigate('/')}
              className="nav-link border-b-2 border-white pb-1 flex items-center gap-2"
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
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-border py-2">
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