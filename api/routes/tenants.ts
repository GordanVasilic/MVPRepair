import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const router = Router();

// Initialize Supabase client with service role for admin operations// Initialize Supabase client
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

// Helper function to authenticate user
async function authenticateUser(authHeader: string | undefined) {
  console.log('🔍 authenticateUser called with header:', authHeader ? 'exists' : 'missing');
  
  if (!authHeader) {
    console.log('❌ No authorization header provided');
    throw new Error('No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('🎫 Token extracted, length:', token.length);
  console.log('🎫 Token starts with:', token.substring(0, 20) + '...');
  
  try {
    // Use Supabase client to verify the token
    console.log('🔧 Using Supabase client for token verification');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.log('❌ Supabase auth error:', error.message);
      throw new Error('Invalid token');
    }

    if (!user) {
      console.log('❌ No user found for token');
      throw new Error('Invalid token');
    }

    console.log('✅ JWT verified successfully');
    console.log('👤 User ID from Supabase:', user.id);
    console.log('📧 Email from Supabase:', user.email);
    console.log('🎭 Role from user_metadata:', user.user_metadata?.role);

    // Return user data from Supabase response
    const userData = {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'tenant'
    };

    console.log('✅ User authenticated successfully:', userData.email);
    return userData;
  } catch (error: any) {
    console.log('❌ Exception in authenticateUser:', error.message);
    console.log('❌ Full error details:', error);
    throw new Error('Invalid token');
  }
}

// GET /api/tenants - Get all tenants for company's buildings (using building_tenants table)
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req.headers.authorization);

    // Create user-specific Supabase client with the user's token
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Get all buildings owned by this company
    const { data: buildings, error: buildingsError } = await userSupabase
      .from('buildings')
      .select('id, name, address')
      .eq('user_id', user.id);

    if (buildingsError) {
      return res.status(500).json({ error: 'Failed to fetch buildings' });
    }

    if (!buildings || buildings.length === 0) {
      return res.json({ success: true, tenants: [] });
    }

    const buildingIds = buildings.map(b => b.id);

    // Get tenants from apartment_tenants table with apartment and building details
    const { data: apartmentTenantsData, error: apartmentTenantsError } = await userSupabase
      .from('apartment_tenants_with_details')
      .select(`
        id,
        apartment_id,
        tenant_id,
        status,
        invited_at,
        joined_at,
        created_at,
        tenant_email,
        tenant_name,
        apartment_number,
        floor,
        building_id,
        building_name,
        building_address
      `)
      .in('building_id', buildingIds);

    if (apartmentTenantsError) {
      return res.status(500).json({ error: 'Failed to fetch tenants' });
    }

    if (!apartmentTenantsData || apartmentTenantsData.length === 0) {
      return res.json({ success: true, tenants: [] });
    }

    console.log('Using apartment_tenants table for tenant data');
    
    // Transform data for frontend
    const transformedTenants = apartmentTenantsData.map(apartmentTenant => {
      return {
        id: apartmentTenant.id,
        user: {
          id: apartmentTenant.tenant_id,
          name: apartmentTenant.tenant_name || apartmentTenant.tenant_email?.split('@')[0] || 'Unknown',
          email: apartmentTenant.tenant_email || 'Unknown'
        },
        building: {
          id: apartmentTenant.building_id,
          name: apartmentTenant.building_name || 'Unknown',
          address: apartmentTenant.building_address || 'Unknown'
        },
        apartment: {
          id: apartmentTenant.apartment_id,
          apartment_number: apartmentTenant.apartment_number,
          floor: apartmentTenant.floor
        },
        status: apartmentTenant.status,
        joined_at: apartmentTenant.joined_at,
        invited_at: apartmentTenant.invited_at
      };
    });

    res.json({ success: true, tenants: transformedTenants });

  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(401).json({ error: error instanceof Error ? error.message : 'Authentication failed' });
  }
});

// POST /api/tenants/invite - Invite a new tenant
router.post('/invite', async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    const { email, apartment_id } = req.body;

    // Validate required fields
    if (!email || !apartment_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, apartment_id' 
      });
    }

    // Get apartment details and verify building ownership
    const { data: apartment, error: apartmentError } = await serviceSupabase
      .from('apartments')
      .select(`
        id,
        apartment_number,
        floor,
        building_id,
        buildings!inner(id, name, address, user_id)
      `)
      .eq('id', apartment_id)
      .eq('buildings.user_id', user.id)
      .single();

    if (apartmentError || !apartment) {
      return res.status(403).json({ error: 'Apartment not found or access denied' });
    }

    // Check if apartment is already occupied
    const { data: existingTenant } = await serviceSupabase
      .from('apartment_tenants')
      .select('id')
      .eq('apartment_id', apartment_id)
      .eq('status', 'active')
      .single();

    if (existingTenant) {
      return res.status(400).json({ error: 'Apartment is already occupied' });
    }

    // Check if user already exists
    const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((user: any) => user.email === email);
    
    if (existingUser) {
      // Check if user is already a tenant in this apartment
      const { data: existingApartmentTenant } = await serviceSupabase
        .from('apartment_tenants')
        .select('id')
        .eq('apartment_id', apartment_id)
        .eq('tenant_id', existingUser.id)
        .single();

      if (existingApartmentTenant) {
        return res.status(400).json({ error: 'User is already a tenant in this apartment' });
      }
    }

    // Check if there's already a pending invitation for this apartment
    const { data: existingInvitation } = await serviceSupabase
      .from('tenant_invitations')
      .select('id')
      .eq('email', email)
      .eq('apartment_id', apartment_id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return res.status(400).json({ error: 'Invitation already sent to this email for this apartment' });
    }

    // Generate unique invitation token
    const invite_token = crypto.randomBytes(32).toString('hex');

    // Create invitation record
    const { data: invitation, error: invitationError } = await serviceSupabase
      .from('tenant_invitations')
      .insert({
        email,
        apartment_id,
        invite_token,
        invited_by: user.id
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return res.status(500).json({ error: 'Failed to create invitation', details: invitationError.message });
    }

    // TODO: Send email invitation here
    // For now, we'll just return the invitation data
    console.log(`Invitation created for ${email} to apartment ${apartment.apartment_number} in building ${apartment.buildings?.[0]?.name || 'Unknown'}`);
    console.log(`Registration link: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/register/${invite_token}`);

    res.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        invite_token: invitation.invite_token,
        expires_at: invitation.expires_at,
        apartment: {
          id: apartment.id,
          apartment_number: apartment.apartment_number,
          floor: apartment.floor
        },
        building: {
          name: apartment.buildings?.[0]?.name || 'Unknown',
          address: apartment.buildings?.[0]?.address || 'Unknown'
        },
        apartment_number: invitation.apartment_number,
        floor_number: invitation.floor_number
      }
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(401).json({ error: error instanceof Error ? error.message : 'Authentication failed' });
  }
});

// POST /api/tenants/register/:token - Register via invitation
router.post('/register/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    // Validate required fields
    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    // Find and validate invitation
    const { data: invitation, error: invitationError } = await serviceSupabase
      .from('tenant_invitations')
      .select('*')
      .eq('invite_token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (invitationError || !invitation) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    // Check if user already exists
    const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((user: any) => user.email === invitation.email);
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const { data: newUser, error: userError } = await serviceSupabase.auth.admin.createUser({
      email: invitation.email,
      password: password,
      user_metadata: {
        name: name,
        role: 'tenant'
      },
      email_confirm: true
    });

    if (userError || !newUser.user) {
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    // Create apartment_tenants record
    const { data: tenant, error: tenantError } = await serviceSupabase
      .from('apartment_tenants')
      .insert({
        apartment_id: invitation.apartment_id,
        tenant_id: newUser.user.id,
        status: 'active',
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantError) {
      // If tenant creation fails, we should clean up the user
      await serviceSupabase.auth.admin.deleteUser(newUser.user.id);
      return res.status(500).json({ error: 'Failed to create tenant record' });
    }

    // Mark invitation as used
    await serviceSupabase
      .from('tenant_invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invitation.id);

    // Get building info for response
    const { data: building } = await serviceSupabase
      .from('buildings')
      .select('name, address')
      .eq('id', invitation.building_id)
      .single();

    res.json({
      success: true,
      user: {
        id: newUser.user.id,
        name: name,
        email: invitation.email
      },
      tenant: {
        building_id: invitation.building_id,
        building_name: building?.name,
        building_address: building?.address,
        apartment_number: invitation.apartment_number,
        floor_number: invitation.floor_number
      }
    });

  } catch (error) {
    console.error('Error registering tenant:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// PUT /api/tenants/:id - Update tenant status or details
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    const { id } = req.params;
    const { status } = req.body;

    // Verify that this tenant belongs to an apartment in a building owned by this company
    const { data: tenant, error: tenantError } = await serviceSupabase
      .from('apartment_tenants')
      .select(`
        *,
        apartment:apartments!inner(
          id,
          apartment_number,
          floor,
          building:buildings!inner(user_id)
        )
      `)
      .eq('id', id)
      .single();

    if (tenantError || !tenant || tenant.apartment.building.user_id !== user.id) {
      return res.status(403).json({ error: 'Tenant not found or access denied' });
    }

    // Update tenant record (only status can be updated)
    const updateData: any = {};
    if (status) updateData.status = status;

    const { data: updatedTenant, error: updateError } = await serviceSupabase
      .from('apartment_tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update tenant' });
    }

    res.json({ success: true, tenant: updatedTenant });

  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(401).json({ error: error instanceof Error ? error.message : 'Authentication failed' });
  }
});

// DELETE /api/tenants/:id - Remove tenant from building
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    const { id } = req.params;

    // Verify that this tenant belongs to an apartment in a building owned by this company
    const { data: tenant, error: tenantError } = await serviceSupabase
      .from('apartment_tenants')
      .select(`
        *,
        apartment:apartments!inner(
          id,
          apartment_number,
          floor,
          building:buildings!inner(user_id)
        )
      `)
      .eq('id', id)
      .single();

    if (tenantError || !tenant || tenant.apartment.building.user_id !== user.id) {
      return res.status(403).json({ error: 'Tenant not found or access denied' });
    }

    // Delete tenant record
    const { error: deleteError } = await serviceSupabase
      .from('apartment_tenants')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to remove tenant' });
    }

    res.json({ success: true, message: 'Tenant removed successfully' });

  } catch (error) {
    console.error('Error removing tenant:', error);
    res.status(401).json({ error: error instanceof Error ? error.message : 'Authentication failed' });
  }
});

export default router;