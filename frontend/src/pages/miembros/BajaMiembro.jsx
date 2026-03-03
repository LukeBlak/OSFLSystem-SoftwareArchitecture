import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserX, AlertTriangle } from 'lucide-react';

const BajaMiembro = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [miembro, setMiembro] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [otrosMotivos, setOtrosMotivos] = useState('');
  const [loading, setLoading] = useState(false);

  const motivosBaja = [
    'Renuncia voluntaria',
    'Fin de periodo',
    'Sanción disciplinaria',
    'Inactividad prolongada',
    'Otros'
  ];

  useEffect(() => {
    loadMiembroData();
  }, [id]);

  const loadMiembroData = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setMiembro({
        id: parseInt(id),
        nombre: 'Pedro Díaz',
        correo: 'pedro@esperanza.org',
        telefono: '7000-9012',
        estado: 'Activo',
        fechaIngreso: '2024-11-05',
        comites: ['Logística'],
        horasAcumuladas: 24
      });
    } catch (error) {
      alert('Error al cargar datos del miembro');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!motivo) {
      alert('Seleccione un motivo de baja');
      return;
    }
    if (motivo === 'Otros' && !otrosMotivos.trim()) {
      alert('Describa el motivo de baja');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Miembro dado de baja exitosamente. Su historial de horas se ha preservado.');
      navigate('/estructura/miembros');
    } catch (error) {
      alert('Error al dar de baja: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!miembro) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="card p-8 text-center">
          <p className="text-text-secondary">Cargando datos del miembro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-8">
        <h2 className="font-poppins font-bold text-2xl text-text-primary mb-2">
          Dar de Baja a Miembro
        </h2>
        <p className="font-inter text-text-secondary">
          Registre el motivo de salida del voluntario
        </p>
      </div>

      {/* Alerta */}
      <div className="card bg-yellow-50 border border-yellow-300 p-6 mb-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-poppins font-semibold text-yellow-800 mb-2">
              Información Importante
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• El miembro perderá acceso al sistema inmediatamente</li>
              <li>• Su historial de horas sociales se preservará para auditoría</li>
              <li>• Será removido automáticamente de todos los comités y proyectos</li>
              <li>• Esta acción puede ser revertida contactando al administrador</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Información del Miembro */}
      <div className="card p-6 mb-6">
        <h3 className="font-poppins font-bold text-lg text-text-primary mb-4">
          Datos del Miembro
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-text-secondary text-sm">Nombre</p>
            <p className="font-inter text-text-primary">{miembro.nombre}</p>
          </div>
          <div>
            <p className="text-text-secondary text-sm">Correo</p>
            <p className="font-inter text-text-primary">{miembro.correo}</p>
          </div>
          <div>
            <p className="text-text-secondary text-sm">Teléfono</p>
            <p className="font-inter text-text-primary">{miembro.telefono}</p>
          </div>
          <div>
            <p className="text-text-secondary text-sm">Horas Acumuladas</p>
            <p className="font-inter text-text-primary">{miembro.horasAcumuladas} hrs</p>
          </div>
          <div>
            <p className="text-text-secondary text-sm">Comités</p>
            <p className="font-inter text-text-primary">{miembro.comites.join(', ')}</p>
          </div>
          <div>
            <p className="text-text-secondary text-sm">Fecha de Ingreso</p>
            <p className="font-inter text-text-primary">{miembro.fechaIngreso}</p>
          </div>
        </div>
      </div>

      {/* Formulario de Baja */}
      <form onSubmit={handleSubmit} className="card p-8">
        <div className="space-y-6">
          <div>
            <label className="block text-text-primary font-inter font-semibold mb-2">
              Motivo de Baja *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="input-field"
            >
              <option value="">Seleccione un motivo</option>
              {motivosBaja.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {motivo === 'Otros' && (
            <div>
              <label className="block text-text-primary font-inter font-semibold mb-2">
                Especifique el Motivo *
              </label>
              <textarea
                value={otrosMotivos}
                onChange={(e) => setOtrosMotivos(e.target.value)}
                rows="3"
                className="input-field"
                placeholder="Describa el motivo de la baja..."
              />
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/estructura/miembros')}
            className="btn-outline flex-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-red-500 text-white px-6 py-2.5 rounded-lg font-inter font-semibold 
                     hover:bg-red-600 transition-colors disabled:opacity-50 flex-1"
          >
            {loading ? 'Procesando...' : 'Confirmar Baja'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BajaMiembro;