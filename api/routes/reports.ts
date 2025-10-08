import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/reports/issues - Izvještaj o kvarovima
router.get('/issues', async (req, res) => {
  try {
    const { startDate, endDate, status, priority, buildingId } = req.query

    let query = supabase
      .from('issues')
      .select(`
        *,
        tenants(name, email),
        buildings(name, address)
      `)

    // Apply filters
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }

    const { data: issues, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Calculate breakdowns
    const statusBreakdown = issues.reduce((acc: any, issue: any) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1
      return acc
    }, {})

    const priorityBreakdown = issues.reduce((acc: any, issue: any) => {
      acc[issue.priority] = (acc[issue.priority] || 0) + 1
      return acc
    }, {})

    res.json({
      issues,
      totalCount: issues.length,
      statusBreakdown,
      priorityBreakdown
    })
  } catch (error) {
    console.error('Error fetching issues report:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/reports/tenants - Izvještaj o stanarima
router.get('/tenants', async (req, res) => {
  try {
    const { buildingId } = req.query

    let query = supabase
      .from('tenants')
      .select(`
        *,
        buildings(name, address),
        issues(id, status, created_at)
      `)

    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }

    const { data: tenants, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Calculate statistics
    const stats = tenants.map((tenant: any) => ({
      ...tenant,
      totalIssues: tenant.issues?.length || 0,
      activeIssues: tenant.issues?.filter((issue: any) => 
        issue.status === 'pending' || issue.status === 'open' || issue.status === 'in_progress'
      ).length || 0,
      resolvedIssues: tenant.issues?.filter((issue: any) => issue.status === 'resolved').length || 0
    }))

    // Building breakdown
    const buildingBreakdown = tenants.reduce((acc: any, tenant: any) => {
      const buildingName = tenant.buildings?.name || 'Unknown'
      if (!acc[buildingName]) {
        acc[buildingName] = { count: 0, totalIssues: 0 }
      }
      acc[buildingName].count += 1
      acc[buildingName].totalIssues += tenant.issues?.length || 0
      return acc
    }, {})

    res.json({
      tenants: stats,
      totalCount: tenants.length,
      buildingBreakdown
    })
  } catch (error) {
    console.error('Error fetching tenants report:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/reports/buildings - Izvještaj o objektima
router.get('/buildings', async (req, res) => {
  try {
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select(`
        *,
        tenants(id),
        issues(id, status, priority, category, created_at, resolved_at)
      `)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Calculate building statistics
    const stats = buildings.map((building: any) => {
      const issues = building.issues || []
      const totalIssues = issues.length
      const activeIssues = issues.filter((issue: any) => 
        issue.status === 'pending' || issue.status === 'open' || issue.status === 'in_progress'
      ).length
      const resolvedIssues = issues.filter((issue: any) => issue.status === 'resolved').length

      // Calculate average resolution time for resolved issues
      const resolvedWithTime = issues.filter((issue: any) => 
        issue.status === 'resolved' && issue.resolved_at
      )
      const avgResolutionHours = resolvedWithTime.length > 0 
        ? resolvedWithTime.reduce((sum: number, issue: any) => {
            const created = new Date(issue.created_at)
            const resolved = new Date(issue.resolved_at)
            return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60)
          }, 0) / resolvedWithTime.length
        : 0

      // Most common categories
      const categoryBreakdown = issues.reduce((acc: any, issue: any) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1
        return acc
      }, {})

      return {
        ...building,
        totalTenants: building.tenants?.length || 0,
        totalIssues,
        activeIssues,
        resolvedIssues,
        avgResolutionHours: Math.round(avgResolutionHours * 100) / 100,
        categoryBreakdown
      }
    })

    res.json({
      buildings: stats,
      totalCount: buildings.length
    })
  } catch (error) {
    console.error('Error fetching buildings report:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/reports/performance - Izvještaj o performansama
router.get('/performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    let query = supabase
      .from('issues')
      .select('*')

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: issues, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Calculate performance metrics
    const totalIssues = issues.length
    const resolvedIssues = issues.filter(issue => issue.status === 'resolved')
    const resolutionRate = totalIssues > 0 ? (resolvedIssues.length / totalIssues) * 100 : 0

    // Average resolution time
    const resolvedWithTime = resolvedIssues.filter(issue => issue.resolved_at)
    const avgResolutionTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, issue) => {
          const created = new Date(issue.created_at)
          const resolved = new Date(issue.resolved_at)
          return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60)
        }, 0) / resolvedWithTime.length
      : 0

    // Issues by month for trend analysis
    const monthlyStats = issues.reduce((acc: any, issue) => {
      const month = new Date(issue.created_at).toISOString().slice(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = { total: 0, resolved: 0 }
      }
      acc[month].total += 1
      if (issue.status === 'resolved') {
        acc[month].resolved += 1
      }
      return acc
    }, {})

    // Priority distribution
    const priorityStats = issues.reduce((acc: any, issue) => {
      acc[issue.priority] = (acc[issue.priority] || 0) + 1
      return acc
    }, {})

    res.json({
      totalIssues,
      resolvedIssues: resolvedIssues.length,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      avgResolutionTime: Math.round(avgResolutionTime * 100) / 100,
      monthlyStats,
      priorityStats
    })
  } catch (error) {
    console.error('Error fetching performance report:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/reports/dashboard - Brze statistike za dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Get basic counts
    const [
      { count: totalIssues },
      { count: totalTenants },
      { count: totalBuildings },
      { data: recentIssues }
    ] = await Promise.all([
      supabase.from('issues').select('*', { count: 'exact', head: true }),
      supabase.from('tenants').select('*', { count: 'exact', head: true }),
      supabase.from('buildings').select('*', { count: 'exact', head: true }),
      supabase.from('issues')
        .select('*, tenants(name), buildings(name)')
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    // Get active issues count
    const { count: activeIssues } = await supabase
      .from('issues')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'open', 'in_progress'])

    res.json({
      totalIssues: totalIssues || 0,
      totalTenants: totalTenants || 0,
      totalBuildings: totalBuildings || 0,
      activeIssues: activeIssues || 0,
      recentIssues: recentIssues || []
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router