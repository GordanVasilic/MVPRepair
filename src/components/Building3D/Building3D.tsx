import React, { useState, useMemo } from 'react';
import { Building3DProps, DEFAULT_DIMENSIONS } from '../../types/building3d';
import Floor from './Floor';

const Building3D: React.FC<Building3DProps> = ({ 
  building, 
  issues = [], 
  onFloorClick, 
  onIssueClick 
}) => {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  // Add null checks for building and building_models
  if (!building) {
    return (
      <div className="building-3d-container">
        <div className="building-title mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            3D Prikaz objekta
          </h3>
          <p className="text-sm text-gray-600">
            Učitavanje...
          </p>
        </div>
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <div className="text-gray-500">Učitavanje 3D prikaza...</div>
        </div>
      </div>
    );
  }

  const floorsCount = useMemo(() => {
    return building?.building_models?.[0]?.floors_count || 3;
  }, [building?.building_models]);

  const buildingHeight = floorsCount * DEFAULT_DIMENSIONS.floorHeight;

  const handleFloorClick = (floorNumber: number) => {
    setSelectedFloor(floorNumber === selectedFloor ? null : floorNumber);
    onFloorClick?.(floorNumber);
  };

  const handleIssueClick = (issueId: string) => {
    onIssueClick?.(issueId);
  };

  return (
    <div className="building-3d-container">
      {/* Building Title */}
      <div className="building-title mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          3D Prikaz objekta
        </h3>
        <p className="text-sm text-gray-600">
          Objekat sa {floorsCount} spratova
        </p>
      </div>

      {/* 3D Building Visualization */}
      <div
        className="building-3d-wrapper"
        style={{
          perspective: '1200px',
          perspectiveOrigin: 'center center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: `${buildingHeight + 100}px`,
          padding: '40px',
          background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 50%, #7DD3FC 100%)',
          borderRadius: '12px',
          position: 'relative',
          overflow: 'visible'
        }}
      >
        {/* Ground shadow - improved positioning */}
        <div
          style={{
            position: 'absolute',
            bottom: '15px',
            left: '50%',
            transform: 'translateX(-40%) rotateX(90deg)',
            width: `${DEFAULT_DIMENSIONS.width + 60}px`,
            height: `${DEFAULT_DIMENSIONS.depth + 40}px`,
            backgroundColor: 'rgba(0,0,0,0.15)',
            borderRadius: '50%',
            filter: 'blur(12px)',
            zIndex: -1
          }}
        />

        {/* Building container */}
        <div
          className="building-container"
          style={{
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: 'rotateX(20deg) rotateY(-30deg) scale(1.1)',
            transition: 'transform 0.5s ease',
            zIndex: 1
          }}
        >
          {/* Building base/foundation */}
          <div
            style={{
              position: 'absolute',
              width: `${DEFAULT_DIMENSIONS.width}px`,
              height: '20px',
              backgroundColor: '#4B5563',
              bottom: '-20px',
              left: '0px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #4B5563 0%, #374151 100%)',
              border: '1px solid #374151',
              zIndex: 0
            }}
          />
          
          {/* Foundation side face */}
          <div
            style={{
              position: 'absolute',
              width: `${DEFAULT_DIMENSIONS.depth}px`,
              height: '20px',
              backgroundColor: '#374151',
              bottom: '-20px',
              left: `${DEFAULT_DIMENSIONS.width}px`,
              transform: 'rotateY(-60deg) translateZ(0px)',
              transformOrigin: 'left center',
              background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
              border: '1px solid #1F2937',
              borderLeft: 'none',
              zIndex: 0
            }}
          />

          {/* Floors */}
          {Array.from({ length: floorsCount }, (_, index) => (
            <Floor
              key={index}
              floorNumber={index}
              totalFloors={floorsCount}
              issues={issues}
              isSelected={selectedFloor === index}
              onFloorClick={handleFloorClick}
              onIssueClick={handleIssueClick}
            />
          ))}
        </div>

        {/* Building statistics */}
        <div
          className="building-stats"
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#374151',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <div>Spratova: {floorsCount}</div>
          <div>Kvarova: {issues.length}</div>
          {issues.filter(i => i.priority === 'critical').length > 0 && (
            <div className="text-red-600">
              Kritični: {issues.filter(i => i.priority === 'critical').length}
            </div>
          )}
        </div>
      </div>

      {/* Floor selection info */}
      {selectedFloor !== null && (
        <div className="selected-floor-info mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800">
            {selectedFloor === 0 ? 'Prizemlje' : `${selectedFloor}. sprat`}
          </h4>
          <p className="text-sm text-blue-600 mt-1">
            Kvarova na ovom spratu: {issues.filter(i => i.floor_number === selectedFloor).length}
          </p>
          {issues.filter(i => i.floor_number === selectedFloor).length > 0 && (
            <div className="mt-2">
              {issues
                .filter(i => i.floor_number === selectedFloor)
                .slice(0, 3)
                .map(issue => (
                  <div key={issue.id} className="text-xs text-gray-600 mb-1">
                    • {issue.title} ({issue.priority})
                  </div>
                ))}
              {issues.filter(i => i.floor_number === selectedFloor).length > 3 && (
                <div className="text-xs text-gray-500">
                  ... i još {issues.filter(i => i.floor_number === selectedFloor).length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Building3D;