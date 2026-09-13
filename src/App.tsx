import { createFavoritesRepository } from './features/favorites/infrastructure/supabaseFavorites';
import { useFavorites } from './features/favorites/application/useFavorites';
import { supabase } from './utils/supabase';
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Role, ScreenId, SearchFilters, Tutor, StudentRequest, StudentProfile } from './types';
import { initialSearchFilters } from './data/searchDefaults';
import { useAccountSession } from './features/accounts/application/useAccountSession';
import { studentView, studentFields, teacherView, teacherFields } from './features/accounts/application/profileMapping';
import type { OwnAccount } from './features/accounts/domain/profile';
import type { SessionController } from './features/accounts/application/sessionController';
import { AccountAccessForm } from './components/common/AccountAccessForm';
import { cleanTutors, cleanRequests } from './utils/demoRecords';
import { marketplace } from './features/marketplace/application/marketplace';
import { useRequests } from './features/marketplace/application/useRequests';
import { isSupabaseConfigured } from './utils/supabase';
import { Header } from './components/common/Header';
import { LandingLoginView } from './components/views/LandingLoginView';
import { StudentRequestsView } from './components/views/StudentRequestsView';
import { TeacherDashboardView } from './components/views/TeacherDashboardView';
import { TeacherRequestDetailView } from './components/views/TeacherRequestDetailView';
import { RequestTutorModal } from './components/modals/RequestTutorModal';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import type { SearchArea } from './features/maps/domain/contracts';
import { selectTutorsInArea } from './features/maps/domain/geography';
import { attachPublishedTutorLocations } from './features/maps/application/tutorMapCatalog';
import { useTutorLocations } from './features/maps/application/useTutorLocations';

const StudentSearchView = lazy(() => import('./components/views/StudentSearchView').then(module => ({ default: module.StudentSearchView })));
const StudentResultsView = lazy(() => import('./components/views/StudentResultsView').then(module => ({ default: module.StudentResultsView })));
const TutorProfileView = lazy(() => import('./components/views/TutorProfileView').then(module => ({ default: module.TutorProfileView })));
const StudentProfileEditView = lazy(() => import('./components/views/StudentProfileEditView').then(module => ({ default: module.StudentProfileEditView })));
const TeacherProfileEditView = lazy(() => import('./components/views/TeacherProfileEditView').then(module => ({ default: module.TeacherProfileEditView })));

const favoritesRepository = createFavoritesRepository(supabase);

export default function App() {
  const { state, controller } = useAccountSession();
  const [role, setRole] = useState<Role>('student');
  const [error, setError] = useState('');
  const logout = async () => { try { await controller.auth.signOut(); setError(''); } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo cerrar sesión.'); } };
  if (state.status === 'loading') return <div role="status" className="min-h-screen bg-slate-50 flex items-center justify-center text-teal-800">Recuperando tu sesión…</div>;
  if (state.status === 'error') return <main className="max-w-xl mx-auto p-8 space-y-4"><p role="alert">{state.error}</p><button onClick={controller.retry} className="rounded-xl bg-teal-700 px-5 py-3 text-white">Reintentar</button><button onClick={() => void logout()} className="ml-4 underline">Cerrar sesión</button>{error && <p role="alert">{error}</p>}</main>;
  if (state.status !== 'ready' || state.recovery || !state.account) return <LandingLoginView role={role} onRoleChange={setRole}><AccountAccessForm role={role} state={state} controller={controller} /></LandingLoginView>;
  return <>{error && <p role="alert" className="bg-red-50 p-3 text-red-800">{error}</p>}<AuthenticatedApp key={state.account.id} account={state.account} controller={controller} onLogout={() => void logout()} /></>;
}

function AuthenticatedApp({ account, controller, onLogout }: { account: OwnAccount; controller: SessionController; onLogout: () => void }) {
  const role = account.role;
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(role === 'student' ? 'student-search' : 'teacher-dashboard');
  const [filters, setFilters] = useState<SearchFilters>(() => structuredClone(initialSearchFilters));
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const requestState = useRequests(marketplace);
  const requests = requestState.requests;
  const favorites = useFavorites(favoritesRepository, role === 'student');
  const savedTutors = favorites.ids;
  const studentProfile = studentView(account);
  const [selectedTutorId, setSelectedTutorId] = useState<string>();
  const [selectedRequestId, setSelectedRequestId] = useState<string>();
  const [bookingTutorId, setBookingTutorId] = useState<string>();
  const [catalogLoading, setCatalogLoading] = useState(isSupabaseConfigured);
  const [catalogError, setCatalogError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [actionMessage, setActionMessage] = useState('');
  const [searchArea, setSearchArea] = useState<SearchArea>();
  const locationFeed = useTutorLocations(['student-search', 'student-results', 'tutor-profile'].includes(currentScreen));
  const publishedSnapshot = locationFeed.status === 'connected' ? locationFeed.locations : undefined;

  // Also sanitize retained state during Vite Fast Refresh, without erasing browser records.
  const visibleTutors = useMemo(() => {
    const catalog = cleanTutors(tutors);
    return isSupabaseConfigured ? attachPublishedTutorLocations(catalog, locationFeed.locations) : catalog;
  }, [tutors, locationFeed.locations]);
  const searchTutors = useMemo(() => selectTutorsInArea(visibleTutors, searchArea, filters.modality),
    [visibleTutors, searchArea, filters.modality]);
  const localStudentRequests = cleanRequests(requests).filter((request) =>
    studentProfile.id ? request.studentId === studentProfile.id : true,
  );
  const teacherRequests = cleanRequests(requests).filter((request) =>
    request.targetTutorId === account.id,
  );
  const selectedTutor = visibleTutors.find((tutor) => tutor.id === selectedTutorId);
  const bookingTutor = visibleTutors.find((tutor) => tutor.id === bookingTutorId);
  const selectedRequest = cleanRequests(requests).find((request) => request.id === selectedRequestId);
  const pendingRequestsCount = role === 'student'
    ? localStudentRequests.filter((request) => request.status === 'pending').length : 0;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    // Refresh catalog metadata after an authoritative publication snapshot so a
    // newly registered tutor can appear without remounting the existing map.
    setCatalogError('');
    marketplace.catalog().then((remoteTutors) => {
      if (active) setTutors(remoteTutors);
    }).catch((error: unknown) => {
      if (!active) return;
      setTutors([]);
      setCatalogError(error instanceof Error ? error.message : 'No se pudieron cargar los tutores.');
    }).finally(() => {
      if (active) setCatalogLoading(false);
    });
    return () => { active = false; };
  }, [reloadCount, publishedSnapshot]);

  useEffect(() => {
    const refresh=()=>{if(document.visibilityState==='visible')setReloadCount(value=>value+1);};
    const timer=window.setInterval(refresh,60000);window.addEventListener('focus',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[]);

  const navigate = (screen: ScreenId) => {
    if (role === 'student' ? screen.startsWith('teacher-') : !screen.startsWith('teacher-')) return;
    setCurrentScreen(screen);
    setActionMessage('');
    setBookingTutorId(undefined);
  };

  const handleUpdateFilters = (updates: Partial<SearchFilters>) => {
    setFilters((previous) => {
      const next = { ...previous, ...updates };
      return next;
    });
  };

  const handleToggleSaveTutor = (tutorId: string) => { void favorites.toggle(tutorId); };

  const handleSelectTutor = (tutor: Tutor) => {
    setSelectedTutorId(tutor.id);
    navigate('tutor-profile');
  };

  const handleSaveStudentProfile = async (profile: StudentProfile): Promise<string> => {
    const saved = await controller.save(studentFields(profile), profile.avatarUrl || '');
    return saved.displayAvatarUrl;
  };

  const handleCreateRequest = async (input?: Partial<StudentRequest>) => {
    if (!input?.id || !input.startsAt || !bookingTutor) throw new Error('Completa la solicitud.');
    await requestState.mutate(()=>marketplace.request({id:input.id!,tutorId:bookingTutor.id,
      subject:input.subject || '',modality:input.modality==='virtual'?'virtual':'presencial',
      startsAt:input.startsAt!,durationHours:input.durationHours || 1,note:input.studentNote || ''}));
    setBookingTutorId(undefined);
    setActionMessage('Solicitud guardada en Supabase y disponible para el tutor.');
  };
  const transitionRequest = async (id:string,status:'accepted'|'rejected'|'cancelled') => {
    setActionMessage('');
    try {await requestState.mutate(()=>marketplace.transition(id,status));setActionMessage('Estado de la solicitud guardado en Supabase.');}
    catch { /* useRequests exposes the acknowledged operation error. */ }
  };
  const handleCancelRequest = (id:string) => {void transitionRequest(id,'cancelled');};
  const handleUpdateRequestStatus = (id:string,status:'accepted'|'rejected') => {void transitionRequest(id,status);};

  const emptySelection = (screen: ScreenId, label: string) => (
    <div className="max-w-3xl mx-auto p-8 text-center">
      <p className="text-slate-600 mb-4">No hay {label} seleccionado.</p>
      <button type="button" onClick={() => navigate(screen)} className="rounded-xl bg-teal-700 px-5 py-3 text-white font-semibold">Volver</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {currentScreen !== 'landing' && (
        <Header
          currentRole={role} currentScreen={currentScreen} onNavigate={navigate}
          onLogout={onLogout}
          savedTutorsCount={visibleTutors.filter((tutor) => savedTutors.includes(tutor.id)).length}
          requestsCount={pendingRequestsCount}
          studentAvatarUrl={studentProfile.avatarUrl} studentName={studentProfile.name}
          teacherAvatarUrl={account.displayAvatarUrl} teacherName={String(account.profile.name || '')}
        />
      )}
      <main className="flex-1 w-full">
        <Suspense fallback={<p role="status" className="p-12 text-center text-slate-600">Cargando vista…</p>}>
        {favorites.error && <div role="alert" className="mx-auto max-w-5xl p-4 text-red-800 bg-red-50">{favorites.error} <button type="button" className="underline" onClick={() => void favorites.refresh()}>Actualizar favoritos</button></div>}
        {favorites.busy && <p role="status" className="sr-only">Guardando favorito…</p>}
        {requestState.error && <div role="alert" className="mx-auto max-w-5xl p-4 text-red-800 bg-red-50">{requestState.error} <button type="button" className="underline" onClick={()=>void requestState.refresh()}>Actualizar solicitudes</button></div>}
        {account.notice && <p role="status" className="mx-auto max-w-5xl p-4 text-amber-900 bg-amber-50">{account.notice}</p>}
        {actionMessage && <p role="status" className="mx-auto max-w-5xl p-4 text-amber-900 bg-amber-50">{actionMessage}</p>}
        {currentScreen === 'student-search' && (
          <StudentSearchView filters={filters} studentProfile={studentProfile}
            initialArea={searchArea} tutors={visibleTutors} locationFeedStatus={locationFeed.status}
            onRetryLocations={locationFeed.retry}
            onUpdateFilters={handleUpdateFilters} onSearch={(area) => { setSearchArea(area); navigate('student-results'); }} />
        )}
        {currentScreen === 'student-results' && (
          catalogLoading ? <p role="status" className="p-12 text-center text-slate-600">Cargando tutores…</p> :
          catalogError ? <div role="alert" className="max-w-3xl mx-auto p-8 text-center">
            <p className="mb-4 text-slate-700">{catalogError}</p>
            <button type="button" onClick={() => { setCatalogLoading(true); setReloadCount((count) => count + 1); }} className="rounded-xl bg-teal-700 px-5 py-3 text-white font-semibold">Reintentar</button>
          </div> :
          <StudentResultsView tutors={searchTutors} filters={filters} savedTutors={savedTutors}
            searchArea={searchArea} locationFeedStatus={locationFeed.status} onRetryLocations={locationFeed.retry}
            favoritesDisabled={favorites.disabled} onToggleSaveTutor={handleToggleSaveTutor} onSelectTutor={handleSelectTutor}
            onRequestTutor={(tutor: Tutor) => setBookingTutorId(tutor.id)}
            onModifySearch={() => navigate('student-search')} />
        )}
        {currentScreen === 'tutor-profile' && (selectedTutor ? (
          <TutorProfileView tutor={selectedTutor} onBack={() => navigate('student-results')}
            onRequestTutor={(tutor: Tutor) => setBookingTutorId(tutor.id)}
            favoritesDisabled={favorites.disabled} isSaved={savedTutors.includes(selectedTutor.id)} onToggleSave={() => handleToggleSaveTutor(selectedTutor.id)} />
        ) : emptySelection('student-results', 'tutor'))}
        {currentScreen === 'student-requests' && (
          <StudentRequestsView requests={localStudentRequests} actionsEnabled={!requestState.busy && !requestState.loading && !requestState.error}
            onBackToSearch={() => navigate('student-search')} onCancelRequest={handleCancelRequest}
            onEditProfile={() => navigate('student-profile-edit')} />
        )}
        {currentScreen === 'student-profile-edit' && (
          <StudentProfileEditView profile={studentProfile} onBack={() => navigate('student-search')}
            onSaveProfile={handleSaveStudentProfile} onNavigateToSearch={() => navigate('student-search')}
            onNavigateToRequests={() => navigate('student-requests')} />
        )}
        {currentScreen === 'teacher-dashboard' && (
          <TeacherDashboardView requests={teacherRequests} actionsEnabled={!requestState.busy && !requestState.loading && !requestState.error}
            onSelectRequest={(request: StudentRequest) => { setSelectedRequestId(request.id); navigate('teacher-request-detail'); }}
            onAcceptRequest={(id) => handleUpdateRequestStatus(id, 'accepted')} onRejectRequest={(id) => handleUpdateRequestStatus(id, 'rejected')}
            onEditProfile={() => navigate('teacher-profile-edit')} teacherName={String(account.profile.name || '')} />
        )}
        {currentScreen === 'teacher-request-detail' && (selectedRequest ? (
          <TeacherRequestDetailView request={selectedRequest} actionsEnabled={!requestState.busy && !requestState.loading && !requestState.error}
            onBack={() => navigate('teacher-dashboard')} onAccept={(id) => handleUpdateRequestStatus(id, 'accepted')} onReject={(id) => handleUpdateRequestStatus(id, 'rejected')} />
        ) : emptySelection('teacher-dashboard', 'solicitud'))}
        {currentScreen === 'teacher-profile-edit' && (
          <TeacherProfileEditView teacher={teacherView(account)} teacherId={account.id} onSaveProfile={async (profile) => { const saved = await controller.save(teacherFields(profile), profile.avatar); return saved.displayAvatarUrl; }} onBack={() => navigate('teacher-dashboard')} />
        )}
        </Suspense>
      </main>
      {bookingTutor && (
        <RequestTutorModal tutor={bookingTutor} isOpen submissionEnabled={Boolean(studentProfile.id && studentProfile.name.trim())}
          onClose={() => setBookingTutorId(undefined)} onConfirm={handleCreateRequest}
          defaultSubject={filters.subject} studentProfile={studentProfile} />
      )}
      {currentScreen !== 'landing' && (
        <MobileBottomNav currentScreen={currentScreen} currentRole={role} onNavigate={navigate}
          onLogout={onLogout} resultsCount={searchTutors.length}
          requestsCount={pendingRequestsCount} studentAvatarUrl={studentProfile.avatarUrl} teacherAvatarUrl={account.displayAvatarUrl} />
      )}
    </div>
  );
}
