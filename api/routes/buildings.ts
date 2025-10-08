import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for user operations (respects RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for admin operations (bypasses RLS)
const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Middleware to check if user is admin
const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      // Use Supabase client to verify the token
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error) {
        console.error('Supabase auth error:', error.message);
        return res.status(401).json({ error: 'Invalid token' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Check if user is admin or company
      const userRole = user.user_metadata?.role;
      if (userRole !== 'admin' && userRole !== 'company') {
        return res.status(403).json({ error: 'Admin or company access required' });
      }

      req.user = {
        id: user.id,
        email: user.email || '',
        user_metadata: user.user_metadata || {},
        app_metadata: user.app_metadata || {}
      };
      next();
    } catch (authError: any) {
      console.error('Authentication error:', authError.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// GET /api/buildings - Get all buildings
router.get('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      // Use Supabase client to verify the token
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error) {
        console.error('Supabase auth error in GET /buildings:', error.message);
        return res.status(401).json({ error: 'Invalid token' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    } catch (authError: any) {
      console.error('Authentication error in GET /buildings:', authError.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Set the user context for RLS
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: buildings, error } = await userSupabase
      .from('buildings')
      .select(`
        *,
        building_models (
          id,
          floors_count,
          model_config
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching buildings:', error);
      return res.status(500).json({ error: 'Failed to fetch buildings' });
    }

    res.json({ buildings });
  } catch (error) {
    console.error('Buildings fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/buildings/:id - Get single building
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Set the user context for RLS
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: building, error } = await userSupabase
      .from('buildings')
      .select(`
        *,
        building_models (
          id,
          floors_count,
          model_config,
          created_at,
          updated_at
        ),
        floor_plans (
          id,
          floor_number,
          plan_config,
          rooms,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching building:', error);
      return res.status(404).json({ error: 'Building not found' });
    }

    res.json({ building });
  } catch (error) {
    console.error('Building fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/buildings - Create new building (Admin only)
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, address, floors_count = 1, description, garage_levels = 0, apartments_per_floor = 2 } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    // Validate apartments_per_floor
    if (apartments_per_floor < 1 || apartments_per_floor > 20) {
      return res.status(400).json({ error: 'Apartments per floor must be between 1 and 20' });
    }

    // Get user from middleware
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Create user-specific Supabase client
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Create building with garage_levels (user_id will be set automatically by trigger)
    const { data: building, error: buildingError } = await userSupabase
      .from('buildings')
      .insert([{
        name,
        address,
        description,
        garage_levels
      }])
      .select()
      .single();

    if (buildingError) {
      console.error('Error creating building:', buildingError);
      return res.status(500).json({ error: 'Failed to create building' });
    }

    // Create building model
    const { data: buildingModel, error: modelError } = await userSupabase
      .from('building_models')
      .insert([{
        building_id: building.id,
        floors_count,
        model_config: {
          floors: Array.from({ length: floors_count }, (_, i) => ({
            number: i + 1,
            height: 3.0,
            position: { x: 0, y: i * 3.5, z: 0 }
          }))
        }
      }])
      .select()
      .single();

    if (modelError) {
      console.error('Error creating building model:', modelError);
      // Don't fail the request, just log the error
    }

    // Create default floor plans
    const floorPlans = Array.from({ length: floors_count }, (_, i) => ({
      building_id: building.id,
      floor_number: i + 1,
      plan_config: {
        width: 100,
        height: 100,
        grid_size: 1
      },
      rooms: []
    }));

    const { error: floorPlansError } = await userSupabase
      .from('floor_plans')
      .insert(floorPlans);

    if (floorPlansError) {
      console.error('Error creating floor plans:', floorPlansError);
      // Don't fail the request, just log the error
    }

    // Generate and create apartments for floors 1, 2, 3... (no basement or ground floor)
    const apartments = [];
    const letters = 'ABCDEFGHIJKLMNOPQRST'; // Up to 20 apartments per floor
    
    for (let floor = 1; floor <= floors_count; floor++) {
      for (let apt = 0; apt < apartments_per_floor; apt++) {
        apartments.push({
          building_id: building.id,
          apartment_number: `${floor}${letters[apt]}`,
          floor: floor,
          rooms_config: {
            rooms: ["living_room", "bedroom", "kitchen", "bathroom"]
          }
        });
      }
    }

    // Insert apartments into database
    if (apartments.length > 0) {
      const { error: apartmentsError } = await userSupabase
        .from('apartments')
        .insert(apartments);

      if (apartmentsError) {
        console.error('Error creating apartments:', apartmentsError);
        // Don't fail the request, just log the error
      } else {
        console.log(`✅ Created ${apartments.length} apartments for building ${building.id}`);
      }
    }

    res.status(201).json({ 
      building: {
        ...building,
        building_models: buildingModel ? [buildingModel] : [],
        apartments_created: apartments.length
      }
    });
  } catch (error) {
    console.error('Building creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/buildings/:id - Update building (Admin only)
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, description, floors_count, garage_levels } = req.body;

    console.log('=== BUILDING UPDATE DEBUG ===');
    console.log('Building ID:', id);
    console.log('Request body:', req.body);
    console.log('floors_count received:', floors_count);
    console.log('floors_count type:', typeof floors_count);
    console.log('floors_count undefined?', floors_count === undefined);
    console.log('garage_levels received:', garage_levels);

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    // Update building
    const updateData: any = {
      name,
      address,
      description
    };
    
    // Include garage_levels if provided
    if (garage_levels !== undefined) {
      updateData.garage_levels = garage_levels;
    }
    
    // Note: floors_count is stored in building_models table, not buildings table
    // The buildings table uses floors_config object instead
    
    const { data: building, error: buildingError } = await serviceSupabase
      .from('buildings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (buildingError) {
      console.error('Error updating building:', buildingError);
      return res.status(500).json({ error: 'Failed to update building' });
    }

    // Handle floors_count update for building_models using service role
    if (floors_count !== undefined) {
      console.log('Processing floors_count update for building_models...');
      console.log('Service role client already available');

      try {
        console.log('Using direct Supabase operations for building_models...');
        
        // Check if building model exists
        const { data: existingModel, error: selectError } = await serviceSupabase
          .from('building_models')
          .select('id, floors_count')
          .eq('building_id', id)
          .maybeSingle();

        console.log('Fallback - Existing model query result:', { existingModel, selectError });

        const modelConfig = {
          floors: Array.from({ length: floors_count }, (_, i) => ({
            number: i + 1,
            height: 3.0,
            position: { x: 0, y: i * 3.5, z: 0 }
          }))
        };

        if (existingModel) {
          // Update existing model
          console.log(`Fallback - Updating existing model from ${existingModel.floors_count} to ${floors_count} floors`);
          const { data: updateResult, error: modelError } = await serviceSupabase
            .from('building_models')
            .update({
              floors_count,
              model_config: modelConfig
            })
            .eq('building_id', id)
            .select();

          console.log('Fallback - Update result:', { updateResult, modelError });
          
          if (modelError) {
            console.error('Fallback - Error updating building model:', modelError);
          } else {
            console.log('✅ Fallback - Building model updated successfully');
          }
        } else {
          // Create new model
          console.log(`Fallback - Creating new model with ${floors_count} floors`);
          const { data: insertResult, error: modelError } = await serviceSupabase
            .from('building_models')
            .insert({
              building_id: id,
              floors_count,
              model_config: modelConfig
            })
            .select();

          console.log('Fallback - Insert result:', { insertResult, modelError });

          if (modelError) {
            console.error('Fallback - Error creating building model:', modelError);
          } else {
            console.log('✅ Fallback - Building model created successfully');
          }
        }
      } catch (modelUpdateError) {
        console.error('Error updating building model:', modelUpdateError);
      }
    }

    res.json({ building });
  } catch (error) {
    console.error('Building update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/buildings/:id - Delete building (Admin only)
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('buildings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting building:', error);
      return res.status(500).json({ error: 'Failed to delete building' });
    }

    res.json({ message: 'Building deleted successfully' });
  } catch (error) {
    console.error('Building deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/buildings/:id/model - Get building 3D model
router.get('/:id/model', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: model, error } = await supabase
      .from('building_models')
      .select('*')
      .eq('building_id', id)
      .single();

    if (error) {
      console.error('Error fetching building model:', error);
      return res.status(404).json({ error: 'Building model not found' });
    }

    res.json({ model });
  } catch (error) {
    console.error('Building model fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/buildings/:id/model - Update building 3D model (Admin only)
router.put('/:id/model', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { floors_count, model_config } = req.body;

    const { data: model, error } = await supabase
      .from('building_models')
      .update({
        floors_count,
        model_config
      })
      .eq('building_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating building model:', error);
      return res.status(500).json({ error: 'Failed to update building model' });
    }

    res.json({ model });
  } catch (error) {
    console.error('Building model update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/buildings/:id/apartments - Get apartments for a building
router.get('/:id/apartments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Set the user context for RLS
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // First verify the user owns this building
    const { data: building, error: buildingError } = await userSupabase
      .from('buildings')
      .select('id')
      .eq('id', id)
      .single();

    if (buildingError || !building) {
      return res.status(404).json({ error: 'Building not found or access denied' });
    }

    // Get apartments for this building
    const { data: apartments, error } = await userSupabase
      .from('apartments')
      .select('id, apartment_number, floor, building_id')
      .eq('building_id', id)
      .order('floor', { ascending: true })
      .order('apartment_number', { ascending: true });

    if (error) {
      console.error('Error fetching apartments:', error);
      return res.status(500).json({ error: 'Failed to fetch apartments' });
    }

    res.json({ apartments: apartments || [] });
  } catch (error) {
    console.error('Apartments fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;