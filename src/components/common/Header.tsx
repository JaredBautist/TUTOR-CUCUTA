import React, { useState } from 'react';
import { GraduationCap, LogOut, Menu, X, ChevronRight, User } from 'lucide-react';
import { Role, ScreenId } from '../../types';

interface HeaderProps {
  currentRole: Role;
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onRoleChange?: (role: Role) => void;
  onLogout: () => void;
  savedTutorsCount?: number;
  requestsCount?: number;
  studentAvatarUrl?: string;
  teacherAvatarUrl?: string;
  studentName?: string;
  teacherName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentScreen,
  onNavigate,
  onLogout,
  requestsCount = 0,
  studentAvatarUrl,
  teacherAvatarUrl,
  studentName = '',
  teacherName = '',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isStudent = currentRole === 'student';

  const currentAvatarUrl = isStudent ? studentAvatarUrl : teacherAvatarUrl;
  const currentDisplayName = isStudent ? (studentName || 'Estudiante') : (teacherName || 'Docente');

  const handleNavClick = (screen: ScreenId) => {
    onNavigate(screen);
    setMobileMenuOpen(false);
  };

  const studentScreens: { id: ScreenId; label: string; short: string }[] = [
    { id: 'student-search', label: 'Buscar Tutores', short: 'Buscar' },
    { id: 'student-results', label: 'Resultados', short: 'Tutores' },
    { id: 'student-requests', label: 'Mis Solicitudes', short: 'Solicitudes' },
    { id: 'student-profile-edit', label: 'Mi Perfil', short: 'Perfil' },
  ];

  const teacherScreens: { id: ScreenId; label: string; short: string }[] = [
    { id: 'teacher-dashboard', label: `Solicitudes Recibidas${requestsCount > 0 ? ` (${requestsCount})` : ''}`, short: `Solicitudes${requestsCount > 0 ? ` (${requestsCount})` : ''}` },
    { id: 'teacher-profile-edit', label: 'Mi Perfil Docente', short: 'Mi Perfil' },
  ];

  const activeScreens = isStudent ? studentScreens : teacherScreens;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Portal badge */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate(isStudent ? 'student-search' : 'teacher-dashboard')}
            className="flex items-center gap-2 group text-left cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="truncate">
              <div className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
                Tutor<span className="text-teal-600">Cúcuta</span>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-slate-400 leading-none">
                {isStudent ? 'PORTAL ESTUDIANTE' : 'PORTAL DOCENTE'}
              </div>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-3 border-l border-slate-200">
            {activeScreens.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onNavigate(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  currentScreen === s.id
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="hidden xl:inline">{s.label}</span>
                <span className="xl:hidden">{s.short}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right: User Profile + Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* User info (Desktop) - Clickable to open Profile Edit */}
          <button
            type="button"
            onClick={() => onNavigate(isStudent ? 'student-profile-edit' : 'teacher-profile-edit')}
            className="text-right flex items-center gap-2.5 p-1 sm:p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
            title={isStudent ? 'Ver y editar mi perfil de estudiante' : 'Ver y editar mi perfil docente'}
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                {currentDisplayName}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {isStudent ? 'Estudiante' : 'Docente'}
              </div>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white group-hover:bg-teal-50 text-slate-400 group-hover:text-teal-700 flex items-center justify-center font-bold text-xs border-2 border-teal-600 shadow-xs shrink-0 transition-colors overflow-hidden">
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={currentDisplayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
          </button>

          {/* Logout button */}
          <button
            type="button"
            onClick={onLogout}
            title="Volver al inicio"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Salir</span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown when Hamburger is Opened */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 shadow-xl px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-white text-slate-400 border-2 border-teal-600 font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt={currentDisplayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-5 h-5" aria-hidden="true" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {currentDisplayName}
                </div>
                <div className="text-xs text-slate-500">
                  {isStudent ? 'Estudiante · Cúcuta AMC' : 'Docente · Cúcuta AMC'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
              Menú Principal:
            </div>
            {activeScreens.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleNavClick(s.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                  currentScreen === s.id
                    ? 'bg-teal-50 text-teal-900 border border-teal-200 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span>{s.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
              className="text-rose-600 hover:text-rose-800 flex items-center gap-1.5 py-2 cursor-pointer font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span>Volver al inicio</span>
            </button>

            <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold">
              Área Metropolitana de Cúcuta
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
