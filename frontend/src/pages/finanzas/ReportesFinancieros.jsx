import React, { useState } from 'react';

const ReportesFinancieros = () => {
  const [reportType, setReportType] = useState('general');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [format, setFormat] = useState('pdf');
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(false);

  const members = [
    { id: 1, name: 'María González' },
    { id: 2, name: 'Juan Pérez' },
    { id: 3, name: 'Ana López' }
  ];

  const handleGenerateReport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Seleccione un rango de fechas');
      return;
    }

    setLoading(true);
    try {
      // Simulación de generación de reporte
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Reporte ${reportType} generado en formato ${format.toUpperCase()}`);
      // Aquí iría la descarga del archivo
    } catch (error) {
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Generar Reportes Financieros</h1>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-4xl">
        <div className="card p-8">
          <h2 className="text-xl font-bold text-text-primary mb-6">
            Configuración del Reporte
          </h2>

          <div className="space-y-6">
            {/* Tipo de Reporte */}
            <div>
              <label className="block text-text-primary font-semibold mb-3">
                Tipo de Reporte
              </label>
              <div className="space-y-3">
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${reportType === 'general' 
                    ? 'border-secondary bg-blue-50' 
                    : 'border-border hover:border-secondary'
                  }`}>
                  <input
                    type="radio"
                    name="reportType"
                    value="general"
                    checked={reportType === 'general'}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-5 h-5 text-secondary focus:ring-secondary"
                  />
                  <div className="ml-4">
                    <p className="font-semibold text-text-primary">Reporte General</p>
                    <p className="text-sm text-text-secondary">
                      Todos los ingresos y egresos de la organización
                    </p>
                  </div>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${reportType === 'member' 
                    ? 'border-secondary bg-blue-50' 
                    : 'border-border hover:border-secondary'
                  }`}>
                  <input
                    type="radio"
                    name="reportType"
                    value="member"
                    checked={reportType === 'member'}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-5 h-5 text-secondary focus:ring-secondary"
                  />
                  <div className="ml-4">
                    <p className="font-semibold text-text-primary">Reporte por Miembro</p>
                    <p className="text-sm text-text-secondary">
                      Horas sociales y participación de un voluntario específico
                    </p>
                  </div>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${reportType === 'project' 
                    ? 'border-secondary bg-blue-50' 
                    : 'border-border hover:border-secondary'
                  }`}>
                  <input
                    type="radio"
                    name="reportType"
                    value="project"
                    checked={reportType === 'project'}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-5 h-5 text-secondary focus:ring-secondary"
                  />
                  <div className="ml-4">
                    <p className="font-semibold text-text-primary">Reporte por Proyecto</p>
                    <p className="text-sm text-text-secondary">
                      Balance financiero de un proyecto específico
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Miembro (si aplica) */}
            {reportType === 'member' && (
              <div>
                <label className="block text-text-primary font-semibold mb-2">
                  Seleccionar Miembro *
                </label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="input-field"
                >
                  <option value="">Seleccione un miembro</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Rango de Fechas */}
            <div>
              <label className="block text-text-primary font-semibold mb-3">
                Rango de Fechas *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">
                    Fecha Inicial
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ 
                      ...prev, 
                      startDate: e.target.value 
                    }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">
                    Fecha Final
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ 
                      ...prev, 
                      endDate: e.target.value 
                    }))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Formato de Salida */}
            <div>
              <label className="block text-text-primary font-semibold mb-3">
                Formato de Salida
              </label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${format === 'pdf' 
                    ? 'border-secondary bg-blue-50' 
                    : 'border-border hover:border-secondary'
                  }`}>
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={format === 'pdf'}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-5 h-5 text-secondary focus:ring-secondary mr-3"
                  />
                  <span className="font-semibold">📄 PDF</span>
                </label>

                <label className={`flex-1 flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${format === 'excel' 
                    ? 'border-secondary bg-blue-50' 
                    : 'border-border hover:border-secondary'
                  }`}>
                  <input
                    type="radio"
                    name="format"
                    value="excel"
                    checked={format === 'excel'}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-5 h-5 text-secondary focus:ring-secondary mr-3"
                  />
                  <span className="font-semibold">📊 Excel</span>
                </label>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generando...
                  </span>
                ) : (
                  'Generar Reporte'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preview del Reporte */}
        <div className="card p-8 mt-6 bg-gray-50">
          <h3 className="text-lg font-bold text-text-primary mb-4">
            Vista Previa del Contenido
          </h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-text-secondary">
              El reporte incluirá:
            </p>
            <ul className="mt-4 text-left inline-block space-y-2 text-text-secondary">
              <li>✓ Encabezado institucional</li>
              <li>✓ Fecha de generación</li>
              <li>✓ Rango de fechas seleccionado</li>
              <li>✓ Detalle completo de transacciones</li>
              <li>✓ Totales y resumen financiero</li>
              <li>✓ Firma digital autorizada</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportesFinancieros;