-- Fix existing buildings by creating building_models and floor_plans

-- Create building_models for existing buildings that don't have them
INSERT INTO building_models (building_id, floors_count, model_config)
SELECT 
    b.id as building_id,
    3 as floors_count,
    jsonb_build_object(
        'floors', jsonb_build_array(
            jsonb_build_object('number', 1, 'height', 3.0, 'position', jsonb_build_object('x', 0, 'y', 0, 'z', 0)),
            jsonb_build_object('number', 2, 'height', 3.0, 'position', jsonb_build_object('x', 0, 'y', 3.5, 'z', 0)),
            jsonb_build_object('number', 3, 'height', 3.0, 'position', jsonb_build_object('x', 0, 'y', 7.0, 'z', 0))
        )
    ) as model_config
FROM buildings b
LEFT JOIN building_models bm ON b.id = bm.building_id
WHERE bm.id IS NULL;

-- Create floor_plans for existing buildings that don't have them
INSERT INTO floor_plans (building_id, floor_number, plan_config, rooms)
SELECT 
    b.id as building_id,
    floor_num.floor_number,
    jsonb_build_object(
        'width', 100,
        'height', 100,
        'grid_size', 1
    ) as plan_config,
    '[]'::jsonb as rooms
FROM buildings b
CROSS JOIN (
    SELECT 1 as floor_number
    UNION SELECT 2
    UNION SELECT 3
) floor_num
LEFT JOIN building_models bm ON b.id = bm.building_id
LEFT JOIN floor_plans fp ON b.id = fp.building_id AND floor_num.floor_number = fp.floor_number
WHERE bm.id IS NULL AND fp.id IS NULL;