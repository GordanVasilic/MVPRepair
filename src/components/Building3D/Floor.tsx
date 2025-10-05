import React, { useState } from 'react';
import { FloorProps, BUILDING_COLORS, DEFAULT_DIMENSIONS } from '../../types/building3d';
import IssueMarker from './IssueMarker';
import FloorTooltip from './FloorTooltip';

const Floor: React.FC<FloorProps> = ({ 
  floorNumber, 
  totalFloors, 
  issues, 
  isSelected, 
  onFloorClick, 
  onIssueClick 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const isGroundFloor = floorNumber === 0;
  const isTopFloor = floorNumber === totalFloors - 1;
  
  const floorIssues = issues.filter(issue => issue.floor_number === floorNumber);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
    setShowTooltip(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleClick = () => {
    onFloorClick?.(floorNumber);
  };

  // Windows for the floor
  const renderWindows = () => {
    const windows = [];
    
    // Front windows (3 windows)
    for (let i = 0; i < 3; i++) {
      windows.push(
        <div
          key={`front-${i}`}
          className="window"
          style={{
            position: 'absolute',
            width: '20px',
            height: '16px',
            backgroundColor: BUILDING_COLORS.windows,
            border: `1px solid ${BUILDING_COLORS.frames}`,
            borderRadius: '2px',
            left: `${30 + i * 50}px`,
            top: '20px',
            opacity: 0.8
          }}
        />
      );
    }

    // Side windows are now rendered within the side face div

    return windows;
  };

  // Door for ground floor
  const renderDoor = () => {
    if (!isGroundFloor) return null;
    
    return (
      <div
        className="door"
        style={{
          position: 'absolute',
          width: '24px',
          height: '40px',
          backgroundColor: BUILDING_COLORS.door,
          border: `2px solid ${BUILDING_COLORS.frames}`,
          borderRadius: '4px 4px 0 0',
          left: '88px', // Center position
          bottom: '0px',
          zIndex: 2
        }}
      >
        {/* Door handle */}
        <div
          style={{
            position: 'absolute',
            width: '3px',
            height: '3px',
            backgroundColor: BUILDING_COLORS.frames,
            borderRadius: '50%',
            right: '4px',
            top: '18px'
          }}
        />
      </div>
    );
  };

  return (
    <>
      <div
        className={`floor ${isSelected ? 'selected' : ''}`}
        style={{
          position: 'absolute',
          width: `${DEFAULT_DIMENSIONS.width}px`,
          height: `${DEFAULT_DIMENSIONS.floorHeight}px`,
          bottom: `${floorNumber * DEFAULT_DIMENSIONS.floorHeight}px`,
          left: '0px',
          transformStyle: 'preserve-3d',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
          zIndex: totalFloors - floorNumber
        }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Front face */}
        <div
          className="floor-front"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backgroundColor: BUILDING_COLORS.walls,
            border: `2px solid ${BUILDING_COLORS.frames}`,
            borderRadius: '4px',
            background: `linear-gradient(135deg, ${BUILDING_COLORS.walls} 0%, #D1D5DB 100%)`,
            boxShadow: isSelected 
              ? '0 4px 20px rgba(59, 130, 246, 0.3)' 
              : '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 2
          }}
        >
          {/* Floor number */}
          <div
            style={{
              position: 'absolute',
              top: '4px',
              right: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              color: BUILDING_COLORS.frames,
              textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
              zIndex: 5
            }}
          >
            {floorNumber === 0 ? 'P' : floorNumber}
          </div>

          {/* Windows */}
          {renderWindows()}
          
          {/* Door for ground floor */}
          {renderDoor()}
        </div>

        {/* Side face - Fixed positioning and transformation */}
        <div
          className="floor-side"
          style={{
            position: 'absolute',
            width: `${DEFAULT_DIMENSIONS.depth}px`,
            height: '100%',
            backgroundColor: '#B8BCC8',
            border: `1px solid ${BUILDING_COLORS.frames}`,
            borderLeft: 'none', // Remove left border to connect with front face
            borderRadius: '0 4px 4px 0',
            left: `${DEFAULT_DIMENSIONS.width}px`, // Position at the right edge of front face
            top: '0px',
            transform: 'rotateY(-60deg) translateZ(0px)', // Proper isometric angle
            transformOrigin: 'left center',
            background: 'linear-gradient(135deg, #B8BCC8 0%, #9CA3AF 100%)',
            zIndex: 1
          }}
        >
          {/* Side windows positioned correctly on the side face */}
          {Array.from({ length: 2 }, (_, i) => (
            <div
              key={`side-window-${i}`}
              className="window-side"
              style={{
                position: 'absolute',
                width: '12px',
                height: '16px',
                backgroundColor: BUILDING_COLORS.windows,
                border: `1px solid ${BUILDING_COLORS.frames}`,
                borderRadius: '2px',
                left: `${10 + i * 30}px`,
                top: `${15 + i * 25}px`,
                opacity: 0.7
              }}
            />
          ))}
        </div>

        {/* Top face (roof for top floor) - Fixed positioning */}
        {isTopFloor && (
          <div
            className="floor-roof"
            style={{
              position: 'absolute',
              width: `${DEFAULT_DIMENSIONS.width}px`,
              height: `${DEFAULT_DIMENSIONS.depth}px`,
              backgroundColor: BUILDING_COLORS.roof,
              border: `1px solid ${BUILDING_COLORS.frames}`,
              borderBottom: 'none', // Remove bottom border to connect with front face
              top: '0px',
              left: '0px',
              transform: 'rotateX(60deg) translateZ(0px)', // Proper isometric angle for roof
              transformOrigin: 'bottom center',
              background: `linear-gradient(135deg, ${BUILDING_COLORS.roof} 0%, #1F2937 100%)`,
              zIndex: 3
            }}
          />
        )}

        {/* Issue markers */}
        {floorIssues.map(issue => (
          <IssueMarker
            key={issue.id}
            issue={issue}
            onClick={onIssueClick}
          />
        ))}
      </div>

      {/* Tooltip */}
      <FloorTooltip
        floorNumber={floorNumber}
        issues={floorIssues}
        visible={showTooltip}
        position={mousePosition}
      />
    </>
  );
};

export default Floor;