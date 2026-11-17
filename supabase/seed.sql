-- ============================================================================
-- SEMILLERO DE DATOS MAESTROS SUPABASE: TutorCúcuta
-- Coordenadas reales del Área Metropolitana de Cúcuta (WGS 84 - EPSG:4326)
-- ============================================================================

-- 1. Sectores del AMC
INSERT INTO public.sectors (id, name, municipality, geom) VALUES
('la-riviera', 'La Riviera', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4935, 7.8920), 4326)),
('los-caobos', 'Los Caobos', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4980, 7.8860), 4326)),
('guaimaral', 'Guaimaral', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4990, 7.9040), 4326)),
('colsag', 'Colsag / La Ceiba', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4960, 7.8960), 4326)),
('prados-del-este', 'Prados del Este', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4820, 7.8890), 4326)),
('san-luis', 'San Luis', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4900, 7.8780), 4326)),
('los-patios', 'Los Patios Centro', 'Los Patios', ST_SetSRID(ST_MakePoint(-72.5080, 7.8480), 4326)),
('villa-rosario', 'Villa del Rosario Centro', 'Villa del Rosario', ST_SetSRID(ST_MakePoint(-72.4750, 7.8340), 4326))
ON CONFLICT (id) DO NOTHING;
