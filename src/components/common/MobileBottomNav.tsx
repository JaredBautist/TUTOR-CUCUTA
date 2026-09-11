import React from 'react';
import { ScreenId, Role } from '../../types';
import { Search, Users, Inbox, UserPen, LogOut } from 'lucide-react';

interface MobileBottomNavProps {
  currentScreen: ScreenId;
  currentRole: Role;
  onNavigate: (screen: ScreenId) => void;
  onRoleToggle?: () => void;
  onLogout?: () => void;
  resultsCount?: number;
  requestsCount?: number;
  studentAvatarUrl?: string;
  teacherAvatarUrl?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentScreen,
  currentRole,
  onNavigate,
  onLogout,
  resultsCount = 0,
  requestsCount = 0,
  studentAvatarUrl,
  teacherAvatarUrl,
}) => {
  // Ocultar barra inferior en landing o en pantallas con botones de acción completa
  const screensWithDedicatedStickyBar: ScreenId[] = [
    'landing',
    'tutor-profile',
    'teacher-request-detail',
    'teacher-profile-edit',
  ];

  if (screensWithDedicatedStickyBar.includes(currentScreen)) {
    return null;
  }

  const isStudent = currentRole === 'student';

  return (
    <nav
      aria-label="Navegación principal en teléfonos"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-1.5 shadow-lg safe-bottom"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {isStudent ? (
          <>
            {/* 1. Buscar */}
            <button
              type="button"
              onClick={() => onNavigate('student-search')}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                currentScreen === 'student-search'
                  ? 'text-teal-800 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${currentScreen === 'student-search' ? 'bg-teal-50 text-teal-700' : ''}`}>
                <Search className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight tracking-tight">Buscar</span>
            </button>

            {/* 2. Resultados */}
            <button
              type="button"
              onClick={() => onNavigate('student-results')}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer min-h-[44px] relative ${
                currentScreen === 'student-results'
                  ? 'text-teal-800 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg relative ${currentScreen === 'student-results' ? 'bg-teal-50 text-teal-700' : ''}`}>
                <Users className="w-4 h-4" />
                {resultsCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-3.5 bg-teal-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {resultsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight">Tutores</span>
            </button>

            {/* 3. Solicitudes */}
            <button
              type="button"
              onClick={() => onNavigate('student-requests')}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer min-h-[44px] relative ${
                currentScreen === 'student-requests'
                  ? 'text-teal-800 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg relative ${currentScreen === 'student-requests' ? 'bg-teal-50 text-teal-700' : ''}`}>
                <Inbox className="w-4 h-4" />
                {requestsCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-3.5 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {requestsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight">Solicitudes</span>
            </button>

            {/* 4. Mi Perfil */}
            <button
              type="button"
              onClick={() => onNavigate('student-profile-edit')}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                currentScreen === 'student-profile-edit'
                  ? 'text-teal-800 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className={`p-0.5 rounded-full ${currentScreen === 'student-profile-edit' ? 'ring-2 ring-teal-600' : ''}`}>
                {studentAvatarUrl ? (
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
                    <img
                      src={studentAvatarUrl}
                      alt="Perfil"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className={`p-1 rounded-lg ${currentScreen === 'student-profile-edit' ? 'bg-teal-50 text-teal-700' : ''}`}>
                    <UserPen className="w-4 h-4" />
                  </div>
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight">Mi Perfil</span>
            </button>
          </>
        ) : (
          <>
            {/* 1. Panel Docente */}
            <button
              type="button"
              onClick={() => onNavigate('teacher-dashboard')}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer min-h-[44px] relative ${
                currentScreen === 'teacher-dashboard'
                  ? 'text-teal-800 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg relative ${currentScreen === 'teacher-dashboard' ? 'bg-teal-50 text-teal-700' : ''}`}>
                <Inbox className="w-4 h-4" />
                {requestsCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-3.5 bg-teal-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {requestsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight">Solicitudes</span>
            </button>

            {/* 2. Mi Perfil Docente */}
            <button
              type="button"
              onClick={() => onNavigate('teacher-profile-edit')}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                currentScreen === 'teacher-profile-edit'
                  ? 'text-teal-800 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className={`p-0.5 rounded-full ${currentScreen === 'teacher-profile-edit' ? 'ring-2 ring-teal-600' : ''}`}>
                {teacherAvatarUrl ? (
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
                    <img
                      src={teacherAvatarUrl}
                      alt="Perfil Docente"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className={`p-1 rounded-lg ${currentScreen === 'teacher-profile-edit' ? 'bg-teal-50 text-teal-700' : ''}`}>
                    <UserPen className="w-4 h-4" />
                  </div>
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight">Mi Perfil</span>
            </button>

            {/* 3. Salir */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl text-slate-500 hover:text-rose-600 font-medium transition-all cursor-pointer min-h-[44px]"
              >
                <div className="p-1 rounded-lg">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-[10px] leading-tight tracking-tight">Salir</span>
              </button>
            )}
          </>
        )}
      </div>
    </nav>
  );
};
