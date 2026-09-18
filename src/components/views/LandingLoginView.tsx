import React from 'react';
import { GraduationCap, ShieldCheck, User, Briefcase, MapPin } from 'lucide-react';
import { Role } from '../../types';

interface LandingLoginViewProps {
  role: Role;
  onRoleChange: (role: Role) => void;
  children: React.ReactNode;
}

export const LandingLoginView: React.FC<LandingLoginViewProps> = ({
  role,
  onRoleChange,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between pb-16 sm:pb-0">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-200/80 py-3.5 sm:py-4 px-4 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600/10 border border-teal-500/20 flex items-center justify-center text-teal-600">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
              Tutor<span className="text-teal-600">Cúcuta</span>
            </div>
            <div className="text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-slate-400">
              {role === 'student' ? 'PORTAL ESTUDIANTE' : 'PORTAL DOCENTE / TUTOR'}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Proyecto para el Área Metropolitana de Cúcuta</span>
        </div>
      </header>

      {/* Main Split Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 lg:p-12 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Form & Role Selector */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200/70 px-2.5 py-1 rounded-full mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                PLATAFORMA DE TUTORÍAS PARTICULARES
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Tutor<span className="text-teal-600">Cúcuta</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Encuentra y ofrece acompañamiento académico en el Área Metropolitana de Cúcuta.
              </p>
            </div>

            {/* Role Switcher Box */}
            <div className="space-y-2">
              <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                SELECCIONA TU ROL DE ACCESO
              </label>
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/90 text-xs sm:text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => onRoleChange('student')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-lg transition-all min-h-[44px] cursor-pointer ${
                    role === 'student'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span>Soy estudiante</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRoleChange('tutor')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-lg transition-all min-h-[44px] cursor-pointer ${
                    role === 'tutor'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Briefcase className="w-4 h-4 shrink-0" />
                  <span>Soy tutor</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 ml-0.5" />
                </button>
              </div>
            </div>

            {/* Dynamic Content based on Role */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {role === 'tutor'
                  ? 'Comparte tus conocimientos como tutor'
                  : 'Encuentra el tutor adecuado para lo que necesitas aprender'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {role === 'tutor'
                  ? 'Crea tu cuenta y completa tu perfil profesional para ofrecer acompañamiento académico.'
                  : 'Configura tus preferencias y consulta el catálogo de tutores.'}
              </p>
            </div>

            {children}

            {/* Student notice for minors */}
            {role === 'student' && (
              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Nota:</strong> Las solicitudes de menores de edad deberán estar asociadas con un acudiente.
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Connection Radar & Benefit Cards */}
          <div className="lg:col-span-6 space-y-4">
            {/* Visual Geospatial Radar Box */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 relative overflow-hidden">
              {/* Header inside card */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-800">
                    ACOMPAÑAMIENTO ACADÉMICO EN EL AMC
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                  Área Metropolitana
                </span>
              </div>

              {/* Radar Graphic SVG */}
              <div className="relative w-full h-[220px] sm:h-[270px] bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 480 320" className="w-full h-full">
                  <defs>
                    <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                    </radialGradient>
                  </defs>

                  {/* Concentric rings */}
                  <circle cx="240" cy="160" r="130" fill="none" stroke="#cbd5e1" strokeDasharray="3 3" />
                  <circle cx="240" cy="160" r="90" fill="none" stroke="#0d9488" strokeDasharray="4 4" strokeOpacity="0.4" />
                  <circle cx="240" cy="160" r="45" fill="none" stroke="#cbd5e1" strokeDasharray="2 2" />

                  {/* Radar sweep slice */}
                  <path
                    d="M 240,160 L 360,110 A 130 130 0 0 0 290,40 Z"
                    fill="url(#radarSweep)"
                  />

                  {/* Connecting dashed lines */}
                  <line x1="240" y1="160" x2="330" y2="105" stroke="#0d9488" strokeWidth="1.5" strokeDasharray="4 3" />
                  <line x1="240" y1="160" x2="160" y2="135" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="240" y1="160" x2="350" y2="230" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="240" y1="160" x2="180" y2="225" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Sector labels */}
                  <circle cx="210" cy="115" r="3" fill="#64748b" />
                  <text x="218" y="118" fill="#475569" fontSize="9" fontWeight="600">La Riviera</text>

                  <circle cx="340" cy="85" r="3" fill="#64748b" />
                  <text x="348" y="88" fill="#475569" fontSize="9" fontWeight="600">Los Caobos</text>

                  <circle cx="170" cy="225" r="3.5" fill="#0284c7" />
                  <text x="130" y="228" fill="#0369a1" fontSize="9" fontWeight="500">Sector UFPS</text>

                  <circle cx="350" cy="230" r="3.5" fill="#0f766e" />
                  <text x="358" y="233" fill="#0f766e" fontSize="9" fontWeight="600">Los Patios</text>

                  <circle cx="380" cy="275" r="3" fill="#64748b" />
                  <text x="388" y="278" fill="#64748b" fontSize="9">Villa del Rosario</text>

                  {/* Conceptual connection diagram, without personal locations. */}
                  <circle cx="240" cy="160" r="12" fill="#0f2942" />
                  <circle cx="240" cy="160" r="6" fill="#38bdf8" />
                  <text x="240" y="186" fill="#0f2942" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                    {role === 'student' ? 'Estudiante' : 'Docente'}
                  </text>
                </svg>

                <div className="absolute top-4 right-4 sm:top-8 sm:right-6 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-lg max-w-[170px] sm:max-w-[210px] space-y-1">
                  <div className="font-bold text-xs text-slate-900">Aprender cerca de ti</div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500">
                    Materias, modalidades y preferencias para orientar tu búsqueda.
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-600 pt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Ilustración del área de cobertura</span>
                  </div>
                </div>
              </div>

              {/* Bottom 3 Benefit Columns */}
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-slate-100">
                <div className="space-y-0.5 sm:space-y-1">
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                    💻 Modalidad
                  </span>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Presencial o virtual según tu ritmo.
                  </p>
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                    📋 Transparencia
                  </span>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Tarifas claras por hora acordadas.
                  </p>
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                    🤝 Perfiles
                  </span>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Revisa la información de cada tutor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-3.5 px-4 sm:px-12 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="text-center sm:text-left">
          <strong>Cobertura:</strong> Área Metropolitana de Cúcuta (San José de Cúcuta, Villa del Rosario, Los Patios, El Zulia)
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Portal académico en desarrollo</span>
        </div>
      </footer>
    </div>
  );
};
