import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, MapPin } from 'lucide-react'

// Kompletna lista gradova iz Bosne i Hercegovine
const CITIES_BIH = [
  'Banja Luka', 'Sarajevo', 'Tuzla', 'Zenica', 'Mostar', 'Bijeljina', 'Brčko', 'Prijedor',
  'Trebinje', 'Cazin', 'Velika Kladuša', 'Visoko', 'Goražde', 'Konjic', 'Gračanica',
  'Gradačac', 'Bosanska Krupa', 'Mrkonjić Grad', 'Foča', 'Zavidovići', 'Žepče', 'Kiseljak',
  'Busovača', 'Čapljina', 'Gradiška', 'Gradiška', 'Derventa', 'Doboj', 'Lukavac', 'Živinice',
  'Kalesija', 'Srebrenik', 'Orašje', 'Odžak', 'Modriča', 'Šamac', 'Domaljevac', 'Maglaj',
  'Tešanj', 'Dobretići', 'Kakanj', 'Vareš', 'Olovo', 'Ilijaš', 'Hadžići', 'Ilidža',
  'Novi Grad Sarajevo', 'Novo Sarajevo', 'Centar Sarajevo', 'Stari Grad Sarajevo',
  'Vogošća', 'Pale', 'Sokolac', 'Rogatica', 'Višegrad', 'Čajniče', 'Goražde', 'Pale-Prača',
  'Novo Goražde', 'Ustikolina', 'Foča-Ustikolina', 'Čelinac', 'Laktaši', 'Srbac',
  'Oštra Luka', 'Krupa na Uni', 'Novi Grad', 'Kostajnica', 'Kozarska Dubica', 'Dubica',
  'Prijedor', 'Ljubija', 'Omarska', 'Lamovita', 'Sanski Most', 'Ključ', 'Petrovac',
  'Drvar', 'Bosansko Grahovo', 'Glamoč', 'Livno', 'Tomislavgrad', 'Kupres', 'Bugojno',
  'Gornji Vakuf-Uskoplje', 'Prozor-Rama', 'Jablanica', 'Konjic', 'Čitluk', 'Ljubuški',
  'Grude', 'Široki Brijeg', 'Posušje', 'Tomislavgrad', 'Livno', 'Kupres', 'Jajce',
  'Donji Vakuf', 'Travnik', 'Vitez', 'Novi Travnik', 'Busovača', 'Fojnica', 'Kreševo',
  'Kiseljak', 'Breza', 'Vareš', 'Kladanj', 'Olovo', 'Žepče', 'Zavidovići', 'Živinice',
  'Kalesija', 'Memić', 'Sapna', 'Teočak', 'Ugljevik', 'Lopare', 'Čelić', 'Srebrenik',
  'Gradačac', 'Gračanica', 'Doboj Istok', 'Doboj Jug', 'Petrovo', 'Vukosavlje', 'Pelagićevo',
  'Donji Žabar', 'Orašje', 'Tolisa', 'Odžak', 'Modriča', 'Šamac', 'Domaljevac-Šamac',
  'Brčko', 'Bijeljina', 'Janja', 'Dvorovi', 'Ugljevik', 'Lopare', 'Čelić', 'Tuzla',
  'Lukavac', 'Banovići', 'Zivinice', 'Kalesija', 'Sapna', 'Teočak', 'Srebrenik',
  'Gradačac', 'Gračanica', 'Doboj', 'Tešanj', 'Maglaj', 'Žepče', 'Zavidovići', 'Olovo',
  'Kladanj', 'Vareš', 'Breza', 'Visoko', 'Ilijaš', 'Vogošća', 'Sarajevo', 'Ilidža',
  'Hadžići', 'Trnovo', 'Pale', 'Sokolac', 'Rogatica', 'Višegrad', 'Čajniče', 'Foča',
  'Gacko', 'Kalinovik', 'Nevesinje', 'Berkovići', 'Stolac', 'Čapljina', 'Neum', 'Ravno',
  'Trebinje', 'Bileća', 'Ljubinje', 'Kotor Varoš', 'Kneževo', 'Ribnik', 'Oštra Luka',
  'Krupa na Uni', 'Novi Grad', 'Kostajnica', 'Kozarska Dubica', 'Gradiška', 'Laktaši',
  'Čelinac', 'Prnjavor', 'Derventa', 'Stanari', 'Doboj', 'Modriča', 'Šamac', 'Pelagićevo',
  'Donji Žabar', 'Orašje', 'Tolisa', 'Odžak', 'Vukosavlje', 'Brčko', 'Bijeljina', 'Janja',
  'Dvorovi', 'Ugljevik', 'Lopare', 'Čelić', 'Srebrenik', 'Gradačac', 'Gračanica',
  'Doboj Istok', 'Doboj Jug', 'Petrovo', 'Tešanj', 'Maglaj', 'Žepče', 'Zavidovići',
  'Kalesija', 'Memić', 'Sapna', 'Teočak', 'Tuzla', 'Lukavac', 'Banovići', 'Živinice'
].sort()

interface CitySelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function CitySelect({ 
  value, 
  onChange, 
  disabled = false, 
  placeholder = "Odaberite grad..." 
}: CitySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Filter cities based on search term
  const filteredCities = CITIES_BIH.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle city selection
  const handleCitySelect = (city: string) => {
    onChange(city)
    setIsOpen(false)
    setSearchTerm('')
    setHighlightedIndex(-1)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true)
        setHighlightedIndex(0)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredCities.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredCities.length) {
          handleCitySelect(filteredCities[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [highlightedIndex])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setHighlightedIndex(-1)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'
          }`}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div 
          className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden"
          style={{
            top: '100%',
            left: 0,
            right: 0
          }}
        >
          {/* Search header */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setHighlightedIndex(0)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Pretražite gradove..."
                className="w-full pl-8 pr-3 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Cities list */}
          <ul ref={listRef} className="overflow-y-auto max-h-48">
            {filteredCities.length > 0 ? (
              filteredCities.map((city, index) => (
                <li key={city}>
                  <button
                    type="button"
                    onClick={() => handleCitySelect(city)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                      index === highlightedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{city}</span>
                    </div>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">
                Nema rezultata za "{searchTerm}"
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}