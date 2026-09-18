import React, { useMemo, useState } from 'react';
import { MapPin, UserCheck, ArrowRight, RotateCcw, Map, FileText } from 'lucide-react';
import { SearchFilters, StudentProfile, Tutor } from '../../types';
import { UnifiedCucutaMap } from '../common/UnifiedCucutaMap';
import type { LocationFeedStatus, SearchArea, SearchOrigin } from '../../features/maps/domain/contracts';
import { CUCUTA_REFERENCE_ORIGIN, selectTutorsInArea } from '../../features/maps/domain/geography';

interface StudentSearchViewProps {
  filters: SearchFilters;
  studentProfile?: StudentProfile;
  onUpdateFilters: (newFilters: Partial<SearchFilters>) => void;
  onSearch: (area: SearchArea) => void;
  initialArea?: SearchArea;
  tutors?: Tutor[];
  locationFeedStatus?: LocationFeedStatus;
  onRetryLocations?: () => void;
}

export const StudentSearchView: React.FC<StudentSearchViewProps> = ({
  filters,
  studentProfile,
  onUpdateFilters,
  onSearch,
  initialArea,
  tutors = [],
  locationFeedStatus,
  onRetryLocations,
}) => {
  const [subject, setSubject] = useState(filters.subject || '');
  const [topicInput, setTopicInput] = useState(filters.specificTopic || '');
  const [studentNote, setStudentNote] = useState(filters.studentNote || '');
  const [learningStyles, setLearningStyles] = useState<string[]>(filters.learningStyles || []);
  const [educationLevel, setEducationLevel] = useState(filters.educationLevel || '');
  const [modality, setModality] = useState(filters.modality || 'presencial');
  const [availableDays, setAvailableDays] = useState<string[]>(filters.availableDays || []);
  const [timeSlot,setTimeSlot]=useState(filters.timeSlot || '');
  const [budget, setBudget] = useState(filters.maxBudget || 40000);
  const [radius, setRadius] = useState(filters.radiusKm || 5.0);
  const [searchOrigin, setSearchOrigin] = useState<SearchOrigin>(initialArea?.origin || CUCUTA_REFERENCE_ORIGIN);
  const previewTutors = useMemo(() => selectTutorsInArea(tutors, { origin: searchOrigin, radiusKm: radius }, modality),
    [tutors, searchOrigin, radius, modality]);

  // Mobile active tab: 'form' vs 'map'
  const [mobileTab, setMobileTab] = useState<'form' | 'map'>('form');

  const toggleLearningStyle = (style: string) => {
    if (learningStyles.includes(style)) {
      setLearningStyles(learningStyles.filter((s) => s !== style));
    } else {
      setLearningStyles([...learningStyles, style]);
    }
  };

  const toggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter((d) => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const handleReset = () => {
    setSubject('');
    setTopicInput('');
    setStudentNote('');
    setLearningStyles([]);
    setEducationLevel('');
    setModality('presencial');
    setAvailableDays([]);setTimeSlot('');
    setBudget(40000);
    setRadius(5.0);
    setSearchOrigin(CUCUTA_REFERENCE_ORIGIN);
  };

  const handleApplySearch = () => {
    onUpdateFilters({
      subject,
      specificTopic: topicInput,
      studentNote,
      learningStyles,
      educationLevel,
      modality,
      availableDays,
      timeSlot,
      maxBudget: budget,
      radiusKm: radius,
    });
    onSearch({ origin: structuredClone(searchOrigin), radiusKm: radius });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 pb-28 sm:pb-12">
      {/* Hero Welcome Header */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {studentProfile?.name
              ? `¡Hola, ${studentProfile.name.split(' ')[0]}! ¿Qué necesitas reforzar?`
              : '¡Hola! ¿Qué necesitas reforzar?'}
          </h1>
          {studentProfile?.grade && (
            <span className="text-[11px] sm:text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 sm:py-1 rounded-full font-medium">
              {studentProfile.grade} {studentProfile.sector ? `· ${studentProfile.sector}` : ''}
            </span>
          )}
          {studentProfile?.guardianAuthorized && (
            <span className="text-[11px] sm:text-xs bg-teal-100/70 text-teal-800 px-2.5 py-0.5 sm:py-1 rounded-full font-medium flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              Autorización de acudiente indicada
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Indica tus metas de estudio y consulta los tutores registrados en el AMC.
        </p>
      </div>

      {/* Mobile-Only Tab Switcher (Form vs Map) */}
      <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'form'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-teal-600" />
          <span>Formulario de búsqueda</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'map'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Map className="w-4 h-4 text-teal-600" />
          <span>Mapa de cobertura ({radius.toFixed(1)} km)</span>
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Form Fields */}
        <div className={`lg:col-span-7 space-y-5 sm:space-y-6 ${mobileTab === 'map' ? 'hidden lg:block' : 'block'}`}>
          {/* 1. Materia o área académica */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[11px]">
                  1
                </span>
                Materia o área académica
              </span>
              <span className="text-xs font-bold text-teal-700">
                {subject ? 'Seleccionado' : 'Requerido'}
              </span>
            </div>

            {/* Quick Subjects Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'Matemáticas', icon: 'Σ' },
                { name: 'Física', icon: '⚛' },
                { name: 'Química', icon: '⚗' },
                { name: 'Razonamiento Cuantitativo', icon: '%' },
                { name: 'Saber 11', icon: '✍' },
                { name: 'Inglés', icon: 'A' },
                { name: 'Cálculo', icon: '∫' },
                { name: 'Álgebra', icon: 'x' },
              ].map((item) => {
                const isSelected = subject.toLowerCase() === item.name.toLowerCase();
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSubject(item.name)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[40px] ${
                      isSelected
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <span className="font-mono text-teal-500 font-bold">{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Or write custom */}
            <div className="pt-1">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="O escribe otra materia (ej. Biología, Geometría, Estadística...)"
                className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 2. Tema específico a reforzar */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[11px]">
                2
              </span>
              Tema específico a reforzar
            </span>

            <div>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Ej. Razonamiento cuantitativo y preparación Saber 11"
                className="w-full text-xs sm:text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-hidden min-h-[44px]"
              />

              {/* Suggestions chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Sugerencias DBA:</span>
                {['+ Álgebra y funciones', '+ Geometría y medición', '+ Estadística'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTopicInput((prev) => `${prev}, ${tag.replace('+ ', '')}`)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuéntale al tutor qué necesitas */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cuéntale al tutor qué necesitas
              </label>
              <textarea
                rows={3}
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                placeholder="Escribe detalles sobre dificultades, temas de clase o exámenes cercanos..."
                className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:outline-hidden leading-relaxed"
              />
            </div>

            {/* ¿Cómo prefieres aprender? */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                ¿Cómo prefieres aprender?
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  'Explicaciones paso a paso',
                  'Ejercicios prácticos',
                  'Ejemplos cotidianos',
                  'Repaso de conceptos',
                  'Retroalimentación',
                ].map((style) => {
                  const isSelected = learningStyles.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => toggleLearningStyle(style)}
                      className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all cursor-pointer min-h-[38px] ${
                        isSelected
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected ? `✓ ${style}` : style}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Nivel educativo */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[11px]">
                3
              </span>
              Nivel educativo
            </span>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                'Básica primaria',
                'Básica secundaria',
                'Grado 11 - Media',
                'Universidad',
                'Educación de adultos',
              ].map((lvl) => {
                const isActive = educationLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEducationLevel(lvl)}
                    className={`p-3 rounded-lg text-xs font-semibold border text-center transition-all min-h-[44px] flex items-center justify-center ${
                      isActive
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Modalidad preferida */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[11px]">
                4
              </span>
              Modalidad preferida
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setModality('presencial')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  modality === 'presencial'
                    ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-xs text-slate-900">Presencial</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  A domicilio o punto seguro acordado en Cúcuta.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setModality('virtual')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  modality === 'virtual'
                    ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">💻</span>
                  <span className="font-bold text-xs text-slate-900">Virtual</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tutoría sincrónica mediante Meet o Teams.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setModality('any')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  modality === 'any'
                    ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">🔄</span>
                  <span className="font-bold text-xs text-slate-900">Cualquiera</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Flexible según la propuesta del tutor.
                </p>
              </button>
            </div>
          </div>

          {/* 5. Disponibilidad horaria */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[11px]">
                5
              </span>
              Disponibilidad horaria
            </span>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Días:</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {[
                    { key: 'L', label: 'L' },
                    { key: 'M', label: 'M' },
                    { key: 'MIÉ', label: 'M' },
                    { key: 'J', label: 'J' },
                    { key: 'V', label: 'V' },
                    { key: 'S', label: 'S' },
                    { key: 'D', label: 'D' },
                  ].map((d, index) => {
                    const isChecked = availableDays.includes(d.key);
                    return (
                      <button
                        key={`${d.key}-${index}`}
                        type="button"
                        onClick={() => toggleDay(d.key)}
                        className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">Franja seleccionada:</span>
                  <select aria-label="Franja horaria" value={timeSlot} onChange={event=>setTimeSlot(event.target.value)} className="bg-white border border-slate-300 rounded-lg p-2 mt-1 text-xs"><option value="">Cualquier franja</option><option value="Mañana">Mañana · 06:00–12:00</option><option value="Tarde">Tarde · 12:00–18:00</option><option value="Noche">Noche · 18:00–23:00</option></select>
                </div>

              </div>
            </div>
          </div>

          {/* 6. Presupuesto máximo por hora */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[11px]">
                  6
                </span>
                Presupuesto máximo por hora
              </span>
              <span className="text-base font-bold text-teal-800 font-mono">
                ${budget.toLocaleString('es-CO')} COP
              </span>
            </div>

            <input
              type="range"
              min="20000"
              max="60000"
              step="5000"
              value={budget}
              onChange={(e) => setBudget(parseInt(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-400">
              <span>Mínimo: $20.000 COP</span>
              <span className="hidden sm:inline">Por hora académica</span>
              <span>Máximo: $60.000 COP</span>
            </div>
          </div>

          {/* Actions Bottom Bar for Mobile & Desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>

            <button
              type="button"
              onClick={handleApplySearch}
              className="px-6 py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <span>Ver tutores</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Geolocation Map & Spatial Constraints */}
        <div className={`lg:col-span-5 space-y-4 lg:sticky lg:top-20 ${mobileTab === 'form' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[11px]">
                  7
                </span>
                Ubicación de referencia y radio
              </span>

            </div>

            <p className="text-xs text-slate-500">
              Referencia para clases presenciales. Las clases virtuales no dependen de la distancia.
            </p>

            {/* Search Radius Slider */}
            <div className="space-y-1.5 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Radio de búsqueda</span>
                <span className="font-bold text-teal-800 font-mono text-sm">
                  {radius.toFixed(1)} km
                </span>
              </div>
              <input
                type="range"
                aria-label="Radio de búsqueda"
                min="1"
                max="15"
                step="0.5"
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>1 km</span>
                <span>15 km</span>
              </div>
            </div>

            {/* Unified Map Component */}
            <div className="w-full">
              <UnifiedCucutaMap
                mode="search"
                radiusKm={radius}
                origin={searchOrigin}
                onOriginChange={setSearchOrigin}
                tutors={previewTutors}
                locationFeedStatus={locationFeedStatus}
                onRetryLocations={onRetryLocations}
                studentName={studentProfile?.name}
                studentSector={studentProfile?.sector || filters.referenceSector}
                height="h-[280px] sm:h-[340px] lg:h-[380px]"
              />
            </div>

            <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200/80 text-[11px] text-teal-900 space-y-1">
              <span className="font-bold block">
                {searchOrigin.kind === 'device' ? 'Centro de búsqueda: ubicación del dispositivo'
                  : searchOrigin.label}
              </span>
              <p className="text-slate-600 leading-tight">
                Radio de búsqueda: <strong>{radius.toFixed(1)} km</strong>. Puedes elegir un punto en el mapa o activar tu ubicación. Las distancias son en línea recta.
              </p>
            </div>

            {/* Direct Mobile Search Button when in Map View */}
            <button
              type="button"
              onClick={handleApplySearch}
              className="lg:hidden w-full py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <span>Ver tutores</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
