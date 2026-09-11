import React, { useState, useMemo } from 'react';
import { Bookmark, CheckCircle2, ChevronDown, ChevronUp, SlidersHorizontal, List, Map, Search, ArrowUpDown, X } from 'lucide-react';
import { Tutor, SearchFilters } from '../../types';
import { UnifiedCucutaMap } from '../common/UnifiedCucutaMap';
import type { LocationFeedStatus, SearchArea } from '../../features/maps/domain/contracts';
import { getOriginPosition } from '../../features/maps/domain/geography';
import { recommendTutors } from '../../features/recommender/domain/recommender';

interface StudentResultsViewProps {
  tutors: Tutor[];
  filters: SearchFilters;
  savedTutors?: string[];
  onToggleSaveTutor?: (id: string) => void;
  onSelectTutor: (tutor: Tutor) => void;
  onRequestTutor: (tutor: Tutor) => void;
  onModifySearch: () => void;
  searchArea?: SearchArea;
  locationFeedStatus?: LocationFeedStatus;
  onRetryLocations?: () => void;
}

export const StudentResultsView: React.FC<StudentResultsViewProps> = ({
  tutors,
  filters,
  savedTutors = [],
  onToggleSaveTutor,
  onSelectTutor,
  onRequestTutor,
  onModifySearch,
  searchArea,
  locationFeedStatus,
  onRetryLocations,
}) => {
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});
  const [selectedTutorId, setSelectedTutorId] = useState<string>(() => tutors[0]?.id || '');
  const [mobileMode, setMobileMode] = useState<'list' | 'map'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'match' | 'price-asc' | 'distance-asc' | 'experience-desc'>('match');
  const [filterTab, setFilterTab] = useState<'all' | 'saved'>('all');

  const origin = useMemo(() => searchArea ? getOriginPosition(searchArea.origin) : undefined, [searchArea]);

  const recommendedBase = useMemo(() => {
    return recommendTutors(tutors, filters, origin);
  }, [tutors, filters, origin]);

  const toggleReasons = (id: string) => {
    setExpandedReasons((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSaveTutor) {
      onToggleSaveTutor(id);
    }
  };

  // Filter and sort tutors dynamically
  const filteredTutors = useMemo(() => {
    return recommendedBase
      .filter((tutor) => {
        if (filterTab === 'saved' && !savedTutors.includes(tutor.id)) {
          return false;
        }

        // Search term filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchesName = tutor.name.toLowerCase().includes(q);
          const matchesTitle = tutor.title.toLowerCase().includes(q);
          const matchesSector = tutor.sector.toLowerCase().includes(q);
          const matchesSubject = tutor.subjects.some((s) => s.toLowerCase().includes(q));
          const matchesInstitution = tutor.institution.toLowerCase().includes(q);
          return matchesName || matchesTitle || matchesSector || matchesSubject || matchesInstitution;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'es');
        if (sortBy === 'match') {
          return (b.matchScore ?? -1) - (a.matchScore ?? -1);
        }
        if (sortBy === 'price-asc') {
          return a.ratePerHour - b.ratePerHour;
        }
        if (sortBy === 'distance-asc') {
          return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
        }
        if (sortBy === 'experience-desc') {
          return b.experienceYears - a.experienceYears;
        }
        return 0;
      });
  }, [recommendedBase, filterTab, savedTutors, searchTerm, sortBy]);

  const selectedTutorObj =
    filteredTutors.find((t) => t.id === selectedTutorId) || filteredTutors[0];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-28 sm:pb-12">
      {/* Title and Summary Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Tutores disponibles
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              <strong>{filteredTutors.length} {filteredTutors.length === 1 ? 'tutor disponible' : 'tutores disponibles'}</strong> en Cúcuta y AMC.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onModifySearch}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs min-h-[40px] cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ajustar criterios</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">{searchArea
          ? 'Modalidad y radio aplicados. Distancias en línea recta; los demás criterios de recomendación aún no se aplican.'
          : 'Aplica una búsqueda para filtrar por modalidad y radio.'}</p>

        {/* Filter Badges Carousel */}
        <div className="flex items-center gap-1.5 pt-1 text-xs overflow-x-auto no-scrollbar pb-1">
          {filters.subject && <span className="bg-slate-900 text-white font-bold px-2.5 py-1 rounded-md shrink-0">
            {filters.subject}
          </span>}
          {filters.educationLevel && <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md shrink-0">
            {filters.educationLevel}
          </span>}
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md capitalize shrink-0">
            {filters.modality}
          </span>
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md shrink-0">
            Hasta ${filters.maxBudget.toLocaleString('es-CO')} / h
          </span>
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md shrink-0">
            Radio {searchArea ? 'de búsqueda' : 'de referencia'} {(searchArea?.radiusKm ?? filters.radiusKm).toFixed(1)} km
          </span>
        </div>

        {/* Search, Filter Tabs & Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1 items-center">
          {/* Quick text filter */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, materia o barrio (ej. UFPS, Álgebra, Caobos)..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Catalog and local favorites */}
          <div className="sm:col-span-3 flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({tutors.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('saved')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'saved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Favoritos ({tutors.filter((tutor) => savedTutors.includes(tutor.id)).length})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="sm:col-span-3 flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Ordenar tutores"
              className="w-full text-xs font-semibold text-slate-700 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="name">Nombre (A–Z)</option>
              {tutors.some((tutor) => tutor.matchScore !== undefined) && <option value="match">Mayor coincidencia (%)</option>}
              <option value="price-asc">Menor tarifa ($ COP)</option>
              {tutors.some((tutor) => tutor.distanceKm !== undefined) && <option value="distance-asc">Más cercanos (km)</option>}
              <option value="experience-desc">Mayor experiencia (años)</option>
            </select>
          </div>
        </div>

        {/* Mobile list and map switcher */}
        <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 mt-2">
          <button
            type="button"
            onClick={() => setMobileMode('list')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4 text-teal-600" />
            <span>Lista de tutores ({filteredTutors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMode('map')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileMode === 'map'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map className="w-4 h-4 text-teal-600" />
            <span>Ver mapa interactivo</span>
          </button>
        </div>
      </div>

      {/* Main Content: Tutor Cards vs Unified Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Tutor Cards Feed */}
        <div className={`lg:col-span-7 space-y-4 sm:space-y-5 ${mobileMode === 'map' ? 'hidden lg:block' : 'block'}`}>
          {filteredTutors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">{tutors.length === 0 ? 'Aún no hay tutores registrados' : filterTab === 'saved' ? 'No hay favoritos con esta búsqueda' : 'No encontramos tutores con esta búsqueda'}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {tutors.length === 0 ? 'Los perfiles aparecerán aquí cuando haya docentes registrados.' : 'Puedes borrar el texto de búsqueda o consultar todos los tutores.'}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {tutors.length > 0 && <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterTab('all');
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Ver todos los tutores
                </button>}
                <button
                  type="button"
                  onClick={onModifySearch}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Ajustar filtros
                </button>
              </div>
            </div>
          ) : (
            filteredTutors.map((tutor) => {
              const isSelected = selectedTutorObj?.id === tutor.id;
              const isSaved = savedTutors.includes(tutor.id);
              const isExpanded = expandedReasons[tutor.id];

              return (
                <div
                  key={tutor.id}
                  onClick={() => setSelectedTutorId(tutor.id)}
                  className={`bg-white rounded-xl border p-4 sm:p-5 transition-all cursor-pointer shadow-xs ${
                    isSelected
                      ? 'border-teal-600 ring-2 ring-teal-500/20 shadow-md'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {/* Top Tutor Info Row */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    {tutor.avatar ? (
                      <img src={tutor.avatar} alt={tutor.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0" />
                    ) : (
                      <span aria-label={`Perfil de ${tutor.name}`} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center shrink-0">
                        {tutor.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || 'T'}
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 truncate">
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                            {tutor.name}
                          </h2>
                          <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                            {[tutor.title, tutor.institution].filter(Boolean).join(' · ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {tutor.matchScore !== undefined && <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-bold flex items-center gap-1">
                            <span>{tutor.matchScore}%</span>
                            <span className="text-[10px] font-medium hidden sm:inline">coincidencia</span>
                          </span>}

                          <button
                            type="button"
                            onClick={(e) => handleToggleSave(tutor.id, e)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isSaved
                                ? 'bg-amber-50 border-amber-300 text-amber-600'
                                : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                            title={isSaved ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                            aria-label={isSaved ? `Quitar a ${tutor.name} de favoritos` : `Guardar a ${tutor.name} en favoritos`}
                            aria-pressed={isSaved}
                          >
                            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Declared and Experience Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] sm:text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          Información declarada
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                          • {tutor.experienceYears} años exp.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics Row (Price, Location, Next Available) */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3.5 p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-semibold">Tarifa</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm font-mono">
                        ${tutor.ratePerHour.toLocaleString('es-CO')}
                      </span>
                      <span className="text-slate-500 text-[9px]"> / h</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-semibold">Sector</span>
                      <span className="font-semibold text-slate-800 truncate block text-[11px] sm:text-xs">
                        {tutor.sector || 'Sin registrar'}
                      </span>
                      {tutor.distanceKm !== undefined && <span className="text-slate-500 text-[9px]">a {tutor.distanceKm.toFixed(1)} km</span>}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-semibold">Disponible</span>
                      <span className="font-semibold text-teal-700 truncate block text-[11px] sm:text-xs">
                        {tutor.nextAvailable || 'Sin horario registrado'}
                      </span>
                      <span className="text-slate-500 text-[9px] truncate block">{tutor.modalities.join(', ')}</span>
                    </div>
                  </div>

                  {/* Subjects Tags */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {tutor.subjects.slice(0, 4).map((subj) => (
                      <span
                        key={subj}
                        className="text-[10px] sm:text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                      >
                        {subj}
                      </span>
                    ))}
                    {tutor.subjects.length > 4 && (
                      <span className="text-[10px] sm:text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        +{tutor.subjects.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Expandable Match Breakdown */}
                  {tutor.matchReasons && tutor.matchReasons.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleReasons(tutor.id);
                        }}
                        className="w-full flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-teal-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ¿Por qué te recomendamos este tutor?
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/80 text-[11px] text-slate-700">
                          {tutor.matchReasons.map((reason, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span className="leading-tight">{reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTutor(tutor);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-center min-h-[42px] cursor-pointer"
                    >
                      Ver perfil completo
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestTutor(tutor);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs hover:shadow transition-all text-center min-h-[42px] cursor-pointer"
                    >
                      Solicitar tutoría
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Unified Geolocation Map View */}
        <div className={`lg:col-span-5 lg:sticky lg:top-20 space-y-4 ${mobileMode === 'list' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Geolocalización en el AMC
              </span>

            </div>

            {/* The Unified Map Component */}
            <div className="w-full">
              <UnifiedCucutaMap
                mode="results"
                tutors={filteredTutors}
                radiusKm={searchArea?.radiusKm ?? filters.radiusKm}
                origin={searchArea?.origin}
                locationFeedStatus={locationFeedStatus}
                onRetryLocations={onRetryLocations}
                selectedTutorId={selectedTutorObj?.id}
                onSelectTutor={(id) => setSelectedTutorId(id)}
                height="h-[300px] sm:h-[380px] lg:h-[420px]"
              />
            </div>

            {/* Selected Tutor Mini Card on Map mode */}
            {selectedTutorObj && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedTutorObj.avatar ? (
                    <img src={selectedTutorObj.avatar} alt={selectedTutorObj.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-teal-50 text-teal-800 font-bold flex items-center justify-center shrink-0">
                      {selectedTutorObj.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || 'T'}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {selectedTutorObj.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {selectedTutorObj.sector} · ${selectedTutorObj.ratePerHour.toLocaleString('es-CO')} / h
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectTutor(selectedTutorObj)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 text-[11px] font-semibold text-slate-800 rounded-lg shadow-2xs cursor-pointer"
                  >
                    Perfil
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestTutor(selectedTutorObj)}
                    className="px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Solicitar
                  </button>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {searchArea ? 'Ubicaciones publicadas; distancias aproximadas en línea recta desde el centro de búsqueda.' : 'Solo se muestran ubicaciones publicadas. Aplica una búsqueda para calcular las distancias.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
