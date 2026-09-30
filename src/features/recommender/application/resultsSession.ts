/** Ephemeral navigation state owned by the authenticated account container. No storage writes. */
export interface ResultsSession {
  expandedReasons:Record<string,boolean>;
  selectedTutorId:string;
  mobileMode:'list'|'map';
  searchTerm:string;
  sortBy:'name'|'match'|'price-asc'|'distance-asc'|'experience-desc';
  filterTab:'all'|'saved';
  scrollY:number;
}
