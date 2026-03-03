import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown, ArrowLeft } from 'lucide-react';

const NavbarInner = ({ title = "Planificar Nuevo Proyecto", subtitle = "Crea un nuevo proyecto de voluntariado" }) => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    alert('Sesión cerrada');
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <nav className="fixed w-full top-0 z-50 shadow-lg bg-[#0f766e]">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Flecha de retorno y Título */}
          <div className="flex items-center gap-4">
            {/* Flecha de retorno */}
            <button
              onClick={handleGoBack}
              className="flex items-center justify-center w-10 h-10 rounded-lg 
                       bg-white/10 hover:bg-white/20 transition-colors duration-200
                       text-white"
              title="Volver"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Logo
            <img 
              src="/logo.png"
              alt="SIGEVOL Logo" 
              className="h-12 w-auto"
            /> */}
            
            {/* Texto */}
            <div className="flex flex-col">
              <h1 className="font-poppins font-bold text-2xl text-white">
                {title}
              </h1>
              <p className="font-inter text-sm text-[#EDE9FE]">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Perfil Dropdown - Simplificado */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 text-white hover:text-white/90 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <ChevronDown 
                size={16} 
                className={`transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Dropdown Menu - Solo Perfil y Cerrar Sesión */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#e2e8f0] py-2">
                <button
                  onClick={() => {
                    navigate('/perfil');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[#1f2937] font-inter 
                           hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <User size={16} />
                  Ver Perfil
                </button>
                <hr className="my-2 border-[#e2e8f0]" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 font-inter 
                           hover:bg-red-50 transition-colors flex items-center gap-2"
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

export default NavbarInner;