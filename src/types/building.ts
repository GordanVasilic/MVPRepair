export interface Building {
  id: string
  name: string
  address: string
  description?: string
  garage_levels?: number
  created_at: string
  updated_at: string
  building_models?: BuildingModel[]
  floor_plans?: FloorPlan[]
}

export interface BuildingModel {
  id: string
  building_id: string
  floors_count: number
  model_config: {
    floors: Floor[]
  }
  created_at: string
  updated_at: string
}

export interface Floor {
  number: number
  height: number
  position: {
    x: number
    y: number
    z: number
  }
}

export interface FloorPlan {
  id: string
  building_id: string
  floor_number: number
  plan_config: {
    width: number
    height: number
    grid_size: number
  }
  rooms: Room[]
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  name: string
  type: string
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
}

export interface CreateBuildingRequest {
  name: string
  address: string
  description?: string
  floors_count?: number
  garage_levels?: number
  apartments_per_floor?: number
}

export interface UpdateBuildingRequest {
  name?: string
  address?: string
  description?: string
  floors_count?: number
  garage_levels?: number
  apartments_per_floor?: number
}