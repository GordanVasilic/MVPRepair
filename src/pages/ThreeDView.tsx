import { useState } from 'react'
import { RotateCcw, ZoomIn, ZoomOut, Move3D, Info } from 'lucide-react'
import Layout from '../components/Layout'

export default function ThreeDView() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'room'>('overview')

  // Mock data za prostorije
  const rooms = [
    { id: 'kitchen', name: 'Kuhinja', issues: 3, color: '#ef4444' },
    { id: 'bathroom', name: 'Kupatilo', issues: 1, color: '#f59e0b' },
    { id: 'living', name: 'Dnevna soba', issues: 0, color: '#10b981' },
    { id: 'bedroom', name: 'Spavaća soba', issues: 2, color: '#f59e0b' }
  ]

  const handleRoomClick = (roomId: string) => {
    setSelectedRoom(roomId)
    setViewMode('room')
  }

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">3D Pregled objekta</h1>
              <p className="text-gray-600">Interaktivni prikaz prostorija i kvarova</p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <ZoomIn className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <ZoomOut className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Move3D className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* 3D Viewer */}
          <div className="flex-1 bg-gray-100 relative">
            {/* Placeholder za 3D viewer */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-64 h-64 bg-white rounded-lg shadow-lg border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                  <div className="text-gray-500">
                    <Move3D className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-lg font-medium">3D Model</p>
                    <p className="text-sm">Ovdje će biti prikazan 3D model objekta</p>
                  </div>
                </div>
                
                {/* Simulacija prostorija */}
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => handleRoomClick(room.id)}
                      className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4"
                      style={{ borderLeftColor: room.color }}
                    >
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900">{room.name}</h3>
                        <p className="text-sm text-gray-600">
                          {room.issues} {room.issues === 1 ? 'kvar' : 'kvarova'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-white border-l">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Informacije</h2>
              </div>

              {selectedRoom ? (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    {rooms.find(r => r.id === selectedRoom)?.name}
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium text-red-800">Curenje vode</span>
                      </div>
                      <p className="text-xs text-red-600">Slavina u kuhinji</p>
                    </div>
                    
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium text-yellow-800">Električni problem</span>
                      </div>
                      <p className="text-xs text-yellow-600">Prekidač ne radi</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Pregled objekta</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Ukupno prostorija</span>
                      <span className="font-medium">{rooms.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Aktivni kvarovi</span>
                      <span className="font-medium text-red-600">
                        {rooms.reduce((sum, room) => sum + room.issues, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className="text-sm text-yellow-600 font-medium">Potrebna pažnja</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Legenda</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Bez kvarova</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">1-2 kvara</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">3+ kvarova</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedRoom && (
                <button
                  onClick={() => {
                    setSelectedRoom(null)
                    setViewMode('overview')
                  }}
                  className="mt-4 w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Nazad na pregled
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}