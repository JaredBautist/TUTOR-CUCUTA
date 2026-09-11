import { useState, useEffect, useMemo } from 'react';
import { Role, ScreenId, SearchFilters, Tutor, StudentRequest, StudentProfile } from './types';
import { initialSearchFilters } from './data/searchDefaults';
import { useAccountSession } from './features/accounts/application/useAccountSession';
import { studentView, studentFields, teacherView, teacherFields } from './features/accounts/application/profileMapping';
import type { OwnAccount } from './features/accounts/domain/profile';
import type { SessionController } from './features/accounts/application/sessionController';
import { AccountAccessForm } from './components/common/AccountAccessForm';
import { cleanTutors, cleanRequests } from './utils/demoRecords';
import { storage } from './utils/storage';
import { supabaseService, isSupabaseConfigured } from './utils/supabase';
import { Header } from './components/common/Header';
import { LandingLoginView } from './components/views/LandingLoginView';
import { StudentSearchView } from './components/views/StudentSearchView';
import { StudentResultsView } from './components/views/StudentResultsView';
import { TutorProfileView } from './components/views/TutorProfileView';
import { StudentRequestsView } from './components/views/StudentRequestsView';
import { StudentProfileEditView } from './components/views/StudentProfileEditView';
import { TeacherDashboardView } from './components/views/TeacherDashboardView';
import { TeacherRequestDetailView } from './components/views/TeacherRequestDetailView';
import { TeacherProfileEditView } from './components/views/TeacherProfileEditView';
import { RequestTutorModal } from './components/modals/RequestTutorModal';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import type { SearchArea } from './features/maps/domain/contracts';
import { selectTutorsInArea } from './features/maps/domain/geography';
import { attachPublishedTutorLocations } from './features/maps/application/tutorMapCatalog';
import { useTutorLocations } from './features/maps/application/useTutorLocations';

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
  const [requests, setRequests] = useState<StudentRequest[]>(() => storage.getRequests());
  const [savedTutors, setSavedTutors] = useState<string[]>([]);
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
    !request.targetTutorId || request.targetTutorId === account.id,
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
    supabaseService.getTutors().then((remoteTutors) => {
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

  const handleToggleSaveTutor = (tutorId: string) => {
    setSavedTutors((previous) => {
      const next = previous.includes(tutorId) ? previous.filter((id) => id !== tutorId) : [...previous, tutorId];
      return next;
    });
  };

  const handleSelectTutor = (tutor: Tutor) => {
    setSelectedTutorId(tutor.id);
    navigate('tutor-profile');
  };

  const handleSaveStudentProfile = async (profile: StudentProfile): Promise<string> => {
    const saved = await controller.save(studentFields(profile), profile.avatarUrl || '');
    return saved.displayAvatarUrl;
  };

  const handleCreateRequest = (newRequestData?: Partial<StudentRequest>) => {
    if (!newRequestData || !bookingTutor) return;
    const cleanInitials = (newRequestData.studentName || studentProfile.name || 'Estudiante')
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');

    const newRequest: StudentRequest = {
      id: 'req-' + Date.now(),
      studentId: studentProfile.id || account.id,
      studentName: newRequestData.studentName || studentProfile.name || 'Estudiante',
      age: newRequestData.age ?? studentProfile.age,
      grade: newRequestData.grade || studentProfile.grade || '',
      guardianLinked: newRequestData.guardianLinked ?? studentProfile.guardianAuthorized ?? false,
      guardianName: newRequestData.guardianName || studentProfile.guardianName || undefined,
      guardianPhone: newRequestData.guardianPhone || studentProfile.guardianPhone || undefined,
      avatarInitials: cleanInitials || 'ES',
      studentAvatarUrl: newRequestData.studentAvatarUrl || studentProfile.avatarUrl,
      sector: newRequestData.sector || studentProfile.sector || '',
      subject: newRequestData.subject || filters.subject || 'Tutoría',
      focalTopic: newRequestData.focalTopic || '',
      goal: newRequestData.goal || studentProfile.academicGoal || '',
      studentNote: newRequestData.studentNote || '',
      learningPreferences: studentProfile.learningStyles || [],
      learningStyles: studentProfile.learningStyles || [],
      scheduledTime: newRequestData.scheduledTime || '',
      durationHours: newRequestData.durationHours || 1,
      ratePerHour: newRequestData.ratePerHour || bookingTutor.ratePerHour,
      totalEstimated: newRequestData.totalEstimated || (bookingTutor.ratePerHour * (newRequestData.durationHours || 1)),
      modality: newRequestData.modality || 'presencial',
      status: 'pending',
      targetTutorId: bookingTutor.id,
      targetTutorName: bookingTutor.name,
      createdAt: new Date().toISOString(),
      matchCriteriaChecklist: [],
    };

    const updated = [...requests, newRequest];
    setRequests(updated);
    storage.setRequests(updated);
    setBookingTutorId(undefined);
    setActionMessage('Solicitud enviada al tutor. Los datos de contacto se habilitarán cuando acepte tu solicitud.');
  };

  const handleCancelRequest = (requestId: string) => {
    const updated = requests.filter((r) => r.id !== requestId);
    setRequests(updated);
    storage.setRequests(updated);
    setActionMessage('Solicitud cancelada.');
  };

  const handleUpdateRequestStatus = (requestId: string, newStatus: 'accepted' | 'rejected') => {
    const updated = requests.map((r) => r.id === requestId ? { ...r, status: newStatus } : r);
    setRequests(updated);
    storage.setRequests(updated);
    setActionMessage(newStatus === 'accepted' ? 'Solicitud aceptada. Canales de contacto directo habilitados.' : 'Solicitud no aceptada.');
  };

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
            onToggleSaveTutor={handleToggleSaveTutor} onSelectTutor={handleSelectTutor}
            onRequestTutor={(tutor: Tutor) => setBookingTutorId(tutor.id)}
            onModifySearch={() => navigate('student-search')} />
        )}
        {currentScreen === 'tutor-profile' && (selectedTutor ? (
          <TutorProfileView tutor={selectedTutor} onBack={() => navigate('student-results')}
            onRequestTutor={(tutor: Tutor) => setBookingTutorId(tutor.id)}
            isSaved={savedTutors.includes(selectedTutor.id)} onToggleSave={() => handleToggleSaveTutor(selectedTutor.id)} />
        ) : emptySelection('student-results', 'tutor'))}
        {currentScreen === 'student-requests' && (
          <StudentRequestsView requests={localStudentRequests} actionsEnabled={true}
            onBackToSearch={() => navigate('student-search')} onCancelRequest={handleCancelRequest}
            onEditProfile={() => navigate('student-profile-edit')} />
        )}
        {currentScreen === 'student-profile-edit' && (
          <StudentProfileEditView profile={studentProfile} onBack={() => navigate('student-search')}
            onSaveProfile={handleSaveStudentProfile} onNavigateToSearch={() => navigate('student-search')}
            onNavigateToRequests={() => navigate('student-requests')} />
        )}
        {currentScreen === 'teacher-dashboard' && (
          <TeacherDashboardView requests={teacherRequests} actionsEnabled={true}
            onSelectRequest={(request: StudentRequest) => { setSelectedRequestId(request.id); navigate('teacher-request-detail'); }}
            onAcceptRequest={(id) => handleUpdateRequestStatus(id, 'accepted')} onRejectRequest={(id) => handleUpdateRequestStatus(id, 'rejected')}
            onEditProfile={() => navigate('teacher-profile-edit')} teacherName={String(account.profile.name || '')} />
        )}
        {currentScreen === 'teacher-request-detail' && (selectedRequest ? (
          <TeacherRequestDetailView request={selectedRequest} actionsEnabled={true}
            onBack={() => navigate('teacher-dashboard')} onAccept={(id) => handleUpdateRequestStatus(id, 'accepted')} onReject={(id) => handleUpdateRequestStatus(id, 'rejected')} />
        ) : emptySelection('teacher-dashboard', 'solicitud'))}
        {currentScreen === 'teacher-profile-edit' && (
          <TeacherProfileEditView teacher={teacherView(account)} teacherId={account.id} onSaveProfile={async (profile) => { const saved = await controller.save(teacherFields(profile), profile.avatar); return saved.displayAvatarUrl; }} onBack={() => navigate('teacher-dashboard')} />
        )}
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
