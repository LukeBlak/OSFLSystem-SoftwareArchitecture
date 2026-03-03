import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  FolderKanban, 
  PieChart,
  BarChart3,
  FileSpreadsheet,
  Printer,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Search
} from 'lucide-react';

const ReportesFinancieros = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('general');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [format, setFormat] = useState('pdf');
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeDetails, setIncludeDetails] = useState({
    transactions: true,
    summary: true,
    charts: false,
    signatures: true
  });

  const members = [
    { id: 1, name: 'María González', hours: 48 },
    { id: 2, name: 'Juan Pérez', hours: 35 },
    { id: 3, name: 'Ana López', hours: 52 },
    { id: 4, name: 'Carlos Ruiz', hours: 28 }
  ];

  const projects = [
    { id: 1, name: 'Campaña de Reforestación', budget: 5000 },
    { id: 2, name: 'Alfabetización Digital', budget: 3000 },
    { id: 3, name: 'Jornada de Salud Preventiva', budget: 4500 }
  ];

  const handleGenerateReport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Seleccione un rango de fechas');
      return;
    }

    if (reportType === 'member' && !selectedMember) {
      alert('Seleccione un miembro');
      return;
    }

    if (reportType === 'project' && !selectedProject) {
      alert('Seleccione un proyecto');
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReportIcon = () => {
    switch(reportType) {
      case 'general': return <PieChart size={24} />;
      case 'member': return <Users size={24} />;
      case 'project': return <FolderKanban size={24} />;
      default: return <FileText size={24} />;
    }
  };

  const getReportTitle = () => {
    switch(reportType) {
      case 'general': return 'Reporte Financiero General';
      case 'member': return 'Reporte de Horas por Miembro';
      case 'project': return 'Reporte Financiero por Proyecto';
      default: return 'Reporte';
    }
  };

  const getReportDescription = () => {
    switch(reportType) {
      case 'general': 
        return 'Todos los ingresos y egresos de la organización con balance general';
      case 'member': 
        return 'Detalle de horas sociales y participación de un voluntario específico';
      case 'project': 
        return 'Balance financiero detallado de un proyecto específico';
      default: 
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner 
        title="Generar Reportes"
        subtitle="Crea reportes financieros y de horas sociales con validez institucional"
      />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-6xl">
        {/* Header de la página */}
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">
            Centro de Reportes
          </h2>
          <p className="font-inter text-[#64748b]">
            Genera reportes oficiales en PDF o Excel para presentación institucional
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuración del Reporte */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tipo de Reporte */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileText size={20} className="text-[#0d9488]" />
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                  1. Tipo de Reporte
                </h3>
              </div>

              <div className="space-y-4">
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                  ${reportType === 'general' 
                    ? 'border-[#0d9488] bg-[#ccfbf1]' 
                    : 'border-[#e2e8f0] hover:border-[#0d9488]'
                  }`}>
                  <input
                    type="radio"
                    name="reportType"
                    value="general"
                    checked={reportType === 'general'}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488]"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center gap-2">
                      <PieChart size={20} className="text-[#0d9488]" />
                      <p className="font-poppins font-semibold text-[#1f2937]">Reporte General</p>
                    </div>
                    <p className="font-inter text-sm text-[#64748b] ml-6">
                      Todos los ingresos y egresos de la organización
                    </p>
                  </div>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                  ${reportType === 'member' 
                    ? 'border-[#0d9488] bg-[#ccfbf1]' 
                    : 'border-[#e2e8f0] hover:border-[#0d9488]'
                  }`}>
                  <input
                    type="radio"
                    name="reportType"
                    value="member"
                    checked={reportType === 'member'}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488]"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center gap-2">
                      <Users size={20} className="text-[#0d9488]" />
                      <p className="font-poppins font-semibold text-[#1f2937]">Reporte por Miembro</p>
                    </div>
                    <p className="font-inter text-sm text-[#64748b] ml-6">
                      Horas sociales y participación de un voluntario específico
                    </p>
                  </div>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                  ${reportType === 'project' 
                    ? 'border-[#0d9488] bg-[#ccfbf1]' 
                    : 'border-[#e2e8f0] hover:border-[#0d9488]'
                  }`}>
                  <input
                    type="radio"
                    name="reportType"
                    value="project"
                    checked={reportType === 'project'}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488]"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center gap-2">
                      <FolderKanban size={20} className="text-[#0d9488]" />
                      <p className="font-poppins font-semibold text-[#1f2937]">Reporte por Proyecto</p>
                    </div>
                    <p className="font-inter text-sm text-[#64748b] ml-6">
                      Balance financiero de un proyecto específico
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Filtros Adicionales */}
            {(reportType === 'member' || reportType === 'project') && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Search size={20} className="text-[#0d9488]" />
                  <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                    2. Filtros Adicionales
                  </h3>
                </div>

                {reportType === 'member' && (
                  <div>
                    <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                      Seleccionar Miembro <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedMember}
                      onChange={(e) => setSelectedMember(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Seleccione un miembro</option>
                      {members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.hours} hrs)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {reportType === 'project' && (
                  <div>
                    <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                      Seleccionar Proyecto <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Seleccione un proyecto</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name} ({formatCurrency(project.budget)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Rango de Fechas */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Calendar size={20} className="text-[#0d9488]" />
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                  {reportType === 'general' ? '2' : '3'}. Rango de Fechas <span className="text-red-500">*</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-inter text-sm text-[#64748b] mb-2">
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
                  {dateRange.startDate && (
                    <p className="font-inter text-xs text-[#64748b] mt-1">
                      {formatDate(dateRange.startDate)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-inter text-sm text-[#64748b] mb-2">
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
                  {dateRange.endDate && (
                    <p className="font-inter text-xs text-[#64748b] mt-1">
                      {formatDate(dateRange.endDate)}
                    </p>
                  )}
                </div>
              </div>

              {dateRange.startDate && dateRange.endDate && (
                <div className="mt-4 p-4 bg-[#E0F2FE] border border-[#7dd3fc] rounded-lg">
                  <div className="flex items-center gap-2 text-[#64748b] text-sm">
                    <Clock size={16} />
                    <span className="font-inter">
                      Período: <strong className="text-[#0d9488]">{getDaysBetween(dateRange.startDate, dateRange.endDate)} días</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Formato de Salida */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Download size={20} className="text-[#0d9488]" />
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                  {reportType === 'general' ? '3' : '4'}. Formato de Salida
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`flex items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all
                  ${format === 'pdf' 
                    ? 'border-[#0d9488] bg-[#ccfbf1]' 
                    : 'border-[#e2e8f0] hover:border-[#0d9488]'
                  }`}>
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={format === 'pdf'}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488] mr-3"
                  />
                  <div className="text-center">
                    <FileText size={32} className="mx-auto mb-2 text-red-600" />
                    <span className="font-poppins font-semibold text-[#1f2937]">PDF</span>
                    <p className="font-inter text-xs text-[#64748b] mt-1">
                      Documento imprimible
                    </p>
                  </div>
                </label>

                <label className={`flex items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all
                  ${format === 'excel' 
                    ? 'border-[#0d9488] bg-[#ccfbf1]' 
                    : 'border-[#e2e8f0] hover:border-[#0d9488]'
                  }`}>
                  <input
                    type="radio"
                    name="format"
                    value="excel"
                    checked={format === 'excel'}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488] mr-3"
                  />
                  <div className="text-center">
                    <FileSpreadsheet size={32} className="mx-auto mb-2 text-green-600" />
                    <span className="font-poppins font-semibold text-[#1f2937]">Excel</span>
                    <p className="font-inter text-xs text-[#64748b] mt-1">
                      Hoja de cálculo editable
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Contenido del Reporte */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={20} className="text-[#0d9488]" />
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                  {reportType === 'general' ? '4' : '5'}. Contenido del Reporte
                </h3>
              </div>

              <div className="space-y-3">
                <label className="flex items-center p-3 border border-[#e2e8f0] rounded-lg cursor-pointer hover:bg-[#f8faf9]">
                  <input
                    type="checkbox"
                    checked={includeDetails.transactions}
                    onChange={(e) => setIncludeDetails(prev => ({ ...prev, transactions: e.target.checked }))}
                    className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488] rounded"
                  />
                  <div className="ml-3 flex items-center gap-2 flex-1">
                    <DollarSign size={18} className="text-[#64748b]" />
                    <span className="font-inter text-[#1f2937]">Detalle de transacciones</span>
                  </div>
                  <CheckCircle size={18} className="text-green-600" />
                </label>

                <label className="flex items-center p-3 border border-[#e2e8f0] rounded-lg cursor-pointer hover:bg-[#f8faf9]">
                  <input
                    type="checkbox"
                    checked={includeDetails.summary}
                    onChange={(e) => setIncludeDetails(prev => ({ ...prev, summary: e.target.checked }))}
                    className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488] rounded"
                  />
                  <div className="ml-3 flex items-center gap-2 flex-1">
                    <TrendingUp size={18} className="text-[#64748b]" />
                    <span className="font-inter text-[#1f2937]">Resumen financiero</span>
                  </div>
                  <CheckCircle size={18} className="text-green-600" />
                </label>

                <label className="flex items-center p-3 border border-[#e2e8f0] rounded-lg cursor-pointer hover:bg-[#f8faf9]">
                  <input
                    type="checkbox"
                    checked={includeDetails.charts}
                    onChange={(e) => setIncludeDetails(prev => ({ ...prev, charts: e.target.checked }))}
                    className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488] rounded"
                  />
                  <div className="ml-3 flex items-center gap-2 flex-1">
                    <PieChart size={18} className="text-[#64748b]" />
                    <span className="font-inter text-[#1f2937]">Gráficos y visualizaciones</span>
                  </div>
                  {includeDetails.charts && <CheckCircle size={18} className="text-green-600" />}
                </label>

                <label className="flex items-center p-3 border border-[#e2e8f0] rounded-lg cursor-pointer hover:bg-[#f8faf9]">
                  <input
                    type="checkbox"
                    checked={includeDetails.signatures}
                    onChange={(e) => setIncludeDetails(prev => ({ ...prev, signatures: e.target.checked }))}
                    className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488] rounded"
                  />
                  <div className="ml-3 flex items-center gap-2 flex-1">
                    <FileText size={18} className="text-[#64748b]" />
                    <span className="font-inter text-[#1f2937]">Firmas y validación institucional</span>
                  </div>
                  <CheckCircle size={18} className="text-green-600" />
                </label>
              </div>
            </div>
          </div>

          {/* Panel Lateral - Vista Previa */}
          <div className="space-y-6">
            {/* Resumen de Configuración */}
            <div className="card p-6 bg-gradient-to-br from-[#0d9488] to-[#0f766e] text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                  {getReportIcon()}
                </div>
                <div>
                  <h3 className="font-poppins font-bold text-lg">
                    {getReportTitle()}
                  </h3>
                  <p className="font-inter text-sm text-teal-100">
                    {reportType === 'general' ? '3' : '5'} configuraciones
                  </p>
                </div>
              </div>
              <p className="font-inter text-sm text-teal-100 mb-4">
                {getReportDescription()}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-teal-200" />
                  <span>
                    {dateRange.startDate && dateRange.endDate 
                      ? `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`
                      : 'Seleccione fechas'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-teal-200" />
                  <span>Formato: {format.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-teal-200" />
                  <span>
                    {Object.values(includeDetails).filter(v => v).length} secciones incluidas
                  </span>
                </div>
              </div>
            </div>

            {/* Vista Previa del Contenido */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Printer size={20} className="text-[#0d9488]" />
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                  Vista Previa
                </h3>
              </div>
              
              <div className="border-2 border-dashed border-[#e2e8f0] rounded-lg p-6 text-center bg-[#f8faf9]">
                <div className="w-16 h-16 rounded-full bg-[#E0F2FE] flex items-center justify-center mx-auto mb-4">
                  <FileText size={32} className="text-[#0d9488]" />
                </div>
                <p className="font-inter text-sm text-[#64748b] mb-4">
                  El reporte incluirá:
                </p>
                <ul className="text-left inline-block space-y-2 text-sm text-[#64748b] font-inter">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Encabezado institucional
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Fecha de generación
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Rango de fechas seleccionado
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Detalle completo de transacciones
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Totales y resumen financiero
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Firma digital autorizada
                  </li>
                </ul>
              </div>
            </div>

            {/* Botón de Generar */}
            <button
              onClick={handleGenerateReport}
              disabled={loading || !dateRange.startDate || !dateRange.endDate}
              className="w-full bg-[#0d9488] text-white py-4 rounded-lg 
                       font-poppins font-semibold hover:bg-[#0f766e] transition-colors 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-3 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  Generando Reporte...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Generar Reporte
                </>
              )}
            </button>

            {/* Información Adicional */}
            <div className="card p-4 bg-yellow-50 border border-yellow-300">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-poppins font-semibold text-[#1f2937] text-sm mb-1">
                    Nota Importante
                  </p>
                  <p className="font-inter text-xs text-[#64748b]">
                    Los reportes generados tienen validez institucional y pueden ser utilizados para trámites oficiales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Función auxiliar para calcular días entre fechas
const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Función auxiliar para formatear moneda
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export default ReportesFinancieros;