import {supabase} from '../../../utils/supabase';
import {createMarketplaceRepository} from '../infrastructure/supabaseMarketplace';
export const marketplace = createMarketplaceRepository(supabase);
