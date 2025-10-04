import { Router, Request, Response } from 'express'
import { OpenAI } from 'openai'
import dotenv from 'dotenv'

// Load environment variables first
dotenv.config()

const router = Router()

// Initialize OpenAI client
let openai: OpenAI | null = null

console.log('=== OPENAI INITIALIZATION DEBUG ===')
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0)
console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY?.substring(0, 10) || 'undefined')

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    console.log('✅ OpenAI client successfully initialized')
  } else {
    console.log('❌ OPENAI_API_KEY not found in environment variables')
  }
} catch (error) {
  console.error('❌ OpenAI initialization failed:', error)
}

// Available categories and priorities
const CATEGORIES = [
  'Struja/Elektrika',
  'Voda/Vodovod',
  'Klima/Grijanje',
  'Lift/Elevator',
  'Vrata/Prozori',
  'Krov/Fasada',
  'Podovi/Pločice',
  'Sanitarije/Kupatilo',
  'Kuhinja/Aparati',
  'Sigurnost/Brave',
  'Ostalo'
]

const PRIORITIES = ['low', 'medium', 'high', 'urgent']

// Available rooms - synchronized with frontend availableRooms
const ROOMS = [
  'Dnevna soba',
  'Kuhinja',
  'Spavaća soba',
  'Kupatilo',
  'WC',
  'Hodnik',
  'Balkon',
  'Terasa',
  'Ostava',
  'Garaža',
  'Drugo'
]

interface AnalyzeRequest {
  title?: string
  description?: string
  room?: string
  images?: string[] // base64 encoded images
  text?: string // combined text from frontend
  cachedImageDescription?: string // keširan opis slike
}

interface AnalyzeResponse {
  category: string
  priority: string
  confidence: number
  reasoning: string
  estimatedCost?: string
  estimatedTime?: string
  solution?: string
  room?: string
}

// Fallback keyword-based analysis
function fallbackAnalysis(text: string): AnalyzeResponse {
  const lowerText = text.toLowerCase()
  
  // Water-related issues
  if (lowerText.includes('voda') || lowerText.includes('curi') || lowerText.includes('poplava') || 
      lowerText.includes('cijev') || lowerText.includes('slavina') || lowerText.includes('wc')) {
    return {
      category: 'Voda/Vodovod',
      priority: 'urgent',
      confidence: 0.8,
      reasoning: 'Detektovan problem sa vodom na osnovu ključnih riječi',
      estimatedCost: '50-150 KM',
      estimatedTime: '30 minuta - 2 sata',
      solution: 'Popravka vodovodne instalacije',
      room: lowerText.includes('kuhinja') ? 'Kuhinja' : lowerText.includes('kupaonica') || lowerText.includes('wc') ? 'Kupaonica' : 'Ostalo'
    }
  }
  
  // Electrical issues
  if (lowerText.includes('struja') || lowerText.includes('elektrika') || lowerText.includes('prekidač') ||
      lowerText.includes('utičnica') || lowerText.includes('sijalica') || lowerText.includes('kabel')) {
    return {
      category: 'Struja/Elektrika',
      priority: 'high',
      confidence: 0.8,
      reasoning: 'Detektovan električni problem na osnovu ključnih riječi',
      estimatedCost: '20-100 KM',
      estimatedTime: '15 minuta - 1 sat',
      solution: 'Popravka električne instalacije',
      room: 'Ostalo'
    }
  }
  
  // Heating/cooling issues
  if (lowerText.includes('grijanje') || lowerText.includes('radijator') || lowerText.includes('hladno') ||
      lowerText.includes('klima') || lowerText.includes('toplo') || lowerText.includes('temperatura')) {
    return {
      category: 'Klima/Grijanje',
      priority: 'high',
      confidence: 0.7,
      reasoning: 'Detektovan problem sa grijanjem/klimom na osnovu ključnih riječi',
      room: 'Ostalo'
    }
  }
  
  // Door/window issues
  if (lowerText.includes('vrata') || lowerText.includes('prozor') || lowerText.includes('kvaka') ||
      lowerText.includes('ključ') || lowerText.includes('brava')) {
    return {
      category: 'Vrata/Prozori',
      priority: 'medium',
      confidence: 0.7,
      reasoning: 'Detektovan problem sa vratima/prozorima na osnovu ključnih riječi',
      room: 'Ostalo'
    }
  }
  
  // Bathroom/sanitary issues
  if (lowerText.includes('kupatilo') || lowerText.includes('tuš') || lowerText.includes('kada') ||
      lowerText.includes('umivaonik') || lowerText.includes('pločice')) {
    return {
      category: 'Sanitarije/Kupatilo',
      priority: 'medium',
      confidence: 0.7,
      reasoning: 'Detektovan problem sa sanitarijama na osnovu ključnih riječi',
      room: 'Kupaonica'
    }
  }
  
  // Kitchen issues
  if (lowerText.includes('kuhinja') || lowerText.includes('sudopera') || lowerText.includes('šporet') ||
      lowerText.includes('frižider') || lowerText.includes('aparat')) {
    return {
      category: 'Kuhinja/Aparati',
      priority: 'medium',
      confidence: 0.7,
      reasoning: 'Detektovan problem sa kuhinjom/aparatima na osnovu ključnih riječi',
      room: 'Kuhinja'
    }
  }
  
  // Noise issues
  if (lowerText.includes('buka') || lowerText.includes('zvuk') || lowerText.includes('glasno')) {
    return {
      category: 'Ostalo',
      priority: 'low',
      confidence: 0.6,
      reasoning: 'Detektovan problem sa bukom na osnovu ključnih riječi',
      room: 'Ostalo'
    }
  }
  
  // Default fallback
  return {
    category: 'Ostalo',
    priority: 'medium',
    confidence: 0.3,
    reasoning: 'Nije moguće precizno klasifikovati problem',
    estimatedCost: '30-80 KM',
    estimatedTime: '30 minuta - 1 sat',
    solution: 'Potrebna je detaljnija procjena problema',
    room: 'Ostalo'
  }
}

// AI analysis using OpenAI (text only)
async function aiAnalysis(text: string): Promise<AnalyzeResponse> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized')
    }

    const prompt = `
Analiziraj sljedeći opis problema u stanu/kući i klasifikuj ga:

Tekst: "${text}"

Dostupne kategorije:
${CATEGORIES.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

Dostupni prioriteti:
- low: sitni problemi koji mogu čekati
- medium: standardni problemi
- high: ozbiljni problemi koji trebaju brzu intervenciju
- urgent: hitni problemi koji zahtijevaju trenutnu intervenciju

Dostupne prostorije:
${ROOMS.map((room, i) => `${i + 1}. ${room}`).join('\n')}

Za svaki problem, procijeni:
- Troškove popravke (u KM - Konvertibilnim markama)
- Vrijeme potrebno za popravku
- Konkretno rješenje problema
- Prostoriju gdje se problem nalazi

Odgovori u JSON formatu sa sljedećim poljima:
- category: jedna od dostupnih kategorija
- priority: jedan od dostupnih prioriteta
- confidence: broj između 0 i 1 koji predstavlja sigurnost u klasifikaciju
- reasoning: kratko objašnjenje zašto si odabrao ovu kategoriju i prioritet
- estimatedCost: procjena troška u KM (npr. "10-20 KM", "50-100 KM")
- estimatedTime: procjena vremena (npr. "10-15 minuta", "1-2 sata")
- solution: konkretno rješenje problema (npr. "Zamjena poklopca odvoda", "Popravka curenja")
- room: jedna od dostupnih prostorija na osnovu opisa problema

Odgovori samo sa JSON objektom, bez dodatnog teksta.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Ti si ekspert za klasifikaciju problema u domaćinstvu. Odgovaraj precizno i kratko."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON response - handle markdown format
    let jsonString = response.trim()
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    const parsed = JSON.parse(jsonString) as AnalyzeResponse
    
    // Validate response
    if (!CATEGORIES.includes(parsed.category)) {
      parsed.category = 'Ostalo'
    }
    if (!PRIORITIES.includes(parsed.priority)) {
      parsed.priority = 'medium'
    }
    if (!parsed.room || !ROOMS.includes(parsed.room)) {
      parsed.room = 'Ostalo'
    }
    
    return parsed
  } catch (error) {
    console.error('OpenAI analysis failed:', error)
    // Fallback to keyword-based analysis
    return fallbackAnalysis(text)
  }
}

// AI analysis using OpenAI Vision (text + images)
async function aiVisionAnalysis(text: string, images: string[]): Promise<AnalyzeResponse> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized')
    }

    console.log(`\n=== AI VISION ANALYSIS DEBUG ===`)
    console.log(`Analyzing with ${images.length} images and text: "${text}"`)
    console.log(`First image data type: ${typeof images[0]}`)
    console.log(`First image length: ${images[0].length} characters`)
    console.log(`First image preview (first 100 chars): ${images[0].substring(0, 100)}...`)
    console.log(`Image starts with: ${images[0].substring(0, 20)}`)

    // Check if user provided meaningful text
    const hasUserText = text && text.trim().length > 5
    
    // Check if text is specific enough to skip image analysis
    const textIsSpecific = text && (
      text.toLowerCase().includes('poklopac') ||
      text.toLowerCase().includes('slavina') ||
      text.toLowerCase().includes('struja') ||
      text.toLowerCase().includes('sijalica') ||
      text.toLowerCase().includes('prekidač') ||
      text.toLowerCase().includes('utičnica') ||
      text.toLowerCase().includes('vrata') ||
      text.toLowerCase().includes('prozor') ||
      text.toLowerCase().includes('ključ') ||
      text.toLowerCase().includes('brava') ||
      text.toLowerCase().includes('kvaka') ||
      text.trim().length > 15 // Longer descriptions are usually more specific
    )
    
    console.log(`Text analysis: hasUserText=${hasUserText}, textIsSpecific=${textIsSpecific}, text="${text}"`)
    
    // Reduced text-only analysis - only for very specific cases without images needed
    if (hasUserText && textIsSpecific && text.trim().length > 25 && !text.toLowerCase().includes('poklopac')) {
      console.log('🎯 Using TEXT-ONLY analysis because text is very specific and doesn\'t need image')
      return aiAnalysis(text)
    }
    
    const prompt = hasUserText ? `
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
🚨🚨🚨 KRITIČNO VAŽNO: TEKST KORISNIKA MORA BITI PRVI! 🚨🚨🚨
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

TEKST KORISNIKA: "${text}"

🚨🚨🚨 ZABRANJEN FORMAT: "Na osnovu slike i opisa:" 🚨🚨🚨
🚨🚨🚨 NIKAD NE POČINJI SA "Na osnovu slike i opisa:" 🚨🚨🚨

🎯🎯🎯 JEDINI DOZVOLJENI FORMAT ZA REASONING: 🎯🎯🎯
"Na slici se vidi [prostorija] gdje [TAČNO problem korisnika]. [Dodatni problemi sa slike]."

🔥🔥🔥 KONKRETNI PRIMJERI - KOPIRAJ TAČNO OVAJ FORMAT: 🔥🔥🔥

PRIMJER 1 - TAČAN FORMAT:
Korisnik kaže: "nedostaje mi poklopac na podu"
Slika: kupatilo sa WC šoljom i curenjem
REASONING MORA BITI: "Na slici se vidi kupatilo gdje na podu nedostaje poklopac na odvodu. Također se vide tragovi curenja oko baze WC šolje."
❌ POGREŠNO: "Na osnovu slike i opisa: Na slici se vidi WC šolja..."
✅ TAČNO: "Na slici se vidi kupatilo gdje na podu nedostaje poklopac na odvodu..."

PRIMJER 2 - TAČAN FORMAT:
Korisnik kaže: "slavina curi"
Slika: kuhinja sa slavinom
REASONING MORA BITI: "Na slici se vidi kuhinja gdje slavina curi. Dodatno se vidi oštećenje sudopere."
❌ POGREŠNO: "Na osnovu slike i opisa: Na slici se vidi slavina..."
✅ TAČNO: "Na slici se vidi kuhinja gdje slavina curi..."

PRIMJER 3 - TAČAN FORMAT:
Korisnik kaže: "nema struje"
Slika: soba sa prekidačem
REASONING MORA BITI: "Na slici se vidi soba gdje nema struje. Vidi se oštećen prekidač."
❌ POGREŠNO: "Na osnovu slike i opisa: Na slici se vidi prekidač..."
✅ TAČNO: "Na slici se vidi soba gdje nema struje..."

🚨🚨🚨 STRIKTNI ALGORITAM - PRATI TAČNO: 🚨🚨🚨
1. POČNI SA: "Na slici se vidi [prostorija] gdje [TAČNO ono što korisnik kaže]"
2. NIKAD ne počinji sa "Na osnovu slike i opisa:"
3. NIKAD ne stavi problem sa slike PRIJE problema korisnika
4. DODAJ dodatne probleme NAKON problema korisnika

🚨🚨🚨 ALGORITAM ZA SOLUTION: 🚨🚨🚨
1. PRVO: Rješenje za problem korisnika (sa troškovima)
2. DRUGO: Rješenja za dodatne probleme sa slike (ako postoje)

Dostupne kategorije:
${CATEGORIES.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

Dostupni prioriteti:
- low: sitni problemi koji mogu čekati
- medium: standardni problemi
- high: ozbiljni problemi koji trebaju brzu intervenciju
- urgent: hitni problemi koji zahtijevaju trenutnu intervenciju

🚨🚨🚨 KONKRETNI PRIMJER ZA "${text}" - KOPIRAJ TAČNO: 🚨🚨🚨
{
  "category": "Sanitarije/Kupatilo",
  "priority": "low", 
  "confidence": 0.9,
  "reasoning": "Na slici se vidi kupatilo gdje na podu nedostaje poklopac na odvodu. Također se vide tragovi curenja ili vlage oko baze WC šolje.",
  "estimatedCost": "10 KM",
  "estimatedTime": "5 minuta",
  "solution": "Postavljanje poklopca na odvod (10 KM). Dodatno, popravka curenja WC šolje (50-100 KM).",
  "room": "Kupatilo"
}

🚨🚨🚨 ZABRANJEN POČETAK: "Na osnovu slike i opisa:" 🚨🚨🚨
🚨🚨🚨 OBAVEZNI POČETAK: "Na slici se vidi [prostorija] gdje [problem korisnika]" 🚨🚨🚨
🚨🚨🚨 NIKAD NE POČINJI SA BILO ČIM DRUGIM! 🚨🚨🚨

Odgovori u JSON formatu sa sljedećim poljima:
- category: kategorija na osnovu KORISNIKOVOG TEKSTA (ne slike!)
- priority: prioritet na osnovu KORISNIKOVOG OPISA (ne slike!)
- confidence: broj između 0.5 i 1.0
- reasoning: PRVO spomeni problem iz teksta, ZATIM dodatne probleme sa slike
- estimatedCost: procjena troška u KM (npr. "10-20 KM", "50-100 KM")
- estimatedTime: procjena vremena (npr. "10-15 minuta", "1-2 sata")
- solution: PRVO rješenje za korisnikov problem, ZATIM ostalo
- room: predloži prostoriju na osnovu analize

Odgovori samo sa JSON objektom, bez dodatnog teksta.
` : `
Analiziraj sliku i opiši šta vidiš kao problem koji treba popraviti:

NAČIN RADA: Pošto korisnik nije dao tekstualni opis, analiziraj sliku i:
- Opiši ukratko šta vidiš na slici
- Identifikuj glavni problem koji treba popraviti
- Predloži rješenje na osnovu vizuelne analize

Dostupne kategorije:
${CATEGORIES.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

Dostupni prioriteti:
- low: sitni problemi koji mogu čekati
- medium: standardni problemi
- high: ozbiljni problemi koji trebaju brzu intervenciju
- urgent: hitni problemi koji zahtijevaju trenutnu intervenciju

Dostupne prostorije:
${ROOMS.map((room, i) => `${i + 1}. ${room}`).join('\n')}

POSTUPAK:
1. Opiši šta vidiš na slici
2. Identifikuj glavni problem
3. Procijeni kategoriju i prioritet
4. Predloži konkretno rješenje
5. Prepoznaj prostoriju na osnovu slike

Za svaki problem, procijeni:
- Troškove popravke (u KM - Konvertibilnim markama)
- Vrijeme potrebno za popravku
- Konkretno rješenje problema
- Prostoriju gdje se problem nalazi

Odgovori u JSON formatu sa sljedećim poljima:
- category: jedna od dostupnih kategorija (budi precizan na osnovu slike i teksta!)
- priority: jedan od dostupnih prioriteta
- confidence: broj između 0.5 i 1.0 (budi siguran u svoju analizu)
- reasoning: detaljno objašnjenje šta vidiš na slici i koji problem treba riješiti
- estimatedCost: procjena troška u KM (npr. "10-20 KM", "50-100 KM")
- estimatedTime: procjena vremena (npr. "10-15 minuta", "1-2 sata")
- solution: konkretno rješenje problema (npr. "Zamjena poklopca odvoda", "Popravka curenja")
- room: jedna od dostupnih prostorija na osnovu analize slike

Odgovori samo sa JSON objektom, bez dodatnog teksta.
`

    console.log(`Full prompt being sent:\n${prompt}`)

    // Prepare messages with images
    const systemMessage = hasUserText ? 
      "🚨🚨🚨 KRITIČNO VAŽNO: TEKST KORISNIKA MORA BITI PRVI! 🚨🚨🚨 Ti si ekspert za klasifikaciju problema u domaćinstvu. ZABRANJEN FORMAT: 'Na osnovu slike i opisa:' - NIKAD ne počinji sa tim! OBAVEZNI FORMAT: reasoning polje MORA početi sa 'Na slici se vidi [prostorija] gdje [problem iz teksta korisnika]'. PRVO spomeni problem korisnika, ZATIM dodatne probleme sa slike. NIKAD ne stavi problem sa slike prije problema korisnika!" :
      "Ti si ekspert za klasifikaciju problema u domaćinstvu. Analiziraj sliku i opiši problem koji vidiš."
    
    const messages: any[] = [
      {
        role: "system",
        content: systemMessage
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          },
          ...images.map((image, index) => {
            console.log(`Processing image ${index + 1}: ${image.length} chars, starts with: ${image.substring(0, 30)}`)
            return {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image}`,
                detail: "high" // Use high detail for better analysis
              }
            }
          })
        ]
      }
    ]

    console.log(`Sending request to GPT-4o with ${messages[0].content.length} content items...`)
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 300,
      temperature: 0.1  // Reduced temperature for more consistent responses
    })

    const response = completion.choices[0]?.message?.content
    console.log(`\n=== RAW GPT-4o RESPONSE ===`)
    console.log(response)
    console.log(`=== END RAW RESPONSE ===\n`)
    
    if (!response) {
      throw new Error('No response from OpenAI Vision')
    }

    try {
      // Parse JSON response
      const parsed = JSON.parse(response) as AnalyzeResponse
      console.log(`\n=== PARSED AI ANALYSIS ===`)
      console.log(JSON.stringify(parsed, null, 2))
      console.log(`=== END PARSED ANALYSIS ===\n`)
      
      // Validate response
      if (!CATEGORIES.includes(parsed.category)) {
        parsed.category = 'Ostalo'
      }
      if (!PRIORITIES.includes(parsed.priority)) {
        parsed.priority = 'medium'
      }
      // Map AI suggested room to valid frontend room
      if (!parsed.room || !ROOMS.includes(parsed.room)) {
        // Room mapping for common mismatches
        const roomMapping: { [key: string]: string } = {
          'Kupaonica': 'Kupatilo',
          'kupaonica': 'Kupatilo',
          'kupatilo': 'Kupatilo',
          'Balkon/Terasa': 'Balkon',
          'balkon/terasa': 'Balkon',
          'terasa': 'Terasa',
          'balkon': 'Balkon',
          'wc': 'WC',
          'WC': 'WC',
          'kuhinja': 'Kuhinja',
          'dnevna soba': 'Dnevna soba',
          'spavaća soba': 'Spavaća soba',
          'hodnik': 'Hodnik',
          'ostava': 'Ostava',
          'garaža': 'Garaža',
          'drugo': 'Drugo'
        }
        
        const mappedRoom = roomMapping[parsed.room?.toLowerCase() || '']
        parsed.room = mappedRoom || 'Ostalo'
      }
      
      // Boost confidence when we have both text and images
      parsed.confidence = Math.min(parsed.confidence + 0.1, 1.0)
      
      return parsed
    } catch (parseError) {
      console.error(`\n=== JSON PARSE ERROR ===`)
      console.error('Parse error:', parseError)
      console.error('Raw response was:', response)
      console.error(`=== END PARSE ERROR ===\n`)
      
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        console.log('Trying to parse extracted JSON:', jsonMatch[0])
        try {
          const parsed = JSON.parse(jsonMatch[0]) as AnalyzeResponse
          console.log('Successfully parsed extracted JSON:', parsed)
          
          // Validate response
          if (!CATEGORIES.includes(parsed.category)) {
            parsed.category = 'Ostalo'
          }
          if (!PRIORITIES.includes(parsed.priority)) {
            parsed.priority = 'medium'
          }
          // Map AI suggested room to valid frontend room
          if (!parsed.room || !ROOMS.includes(parsed.room)) {
            // Room mapping for common mismatches
            const roomMapping: { [key: string]: string } = {
              'Kupaonica': 'Kupatilo',
              'kupaonica': 'Kupatilo',
              'kupatilo': 'Kupatilo',
              'Balkon/Terasa': 'Balkon',
              'balkon/terasa': 'Balkon',
              'terasa': 'Terasa',
              'balkon': 'Balkon',
              'wc': 'WC',
              'WC': 'WC',
              'kuhinja': 'Kuhinja',
              'dnevna soba': 'Dnevna soba',
              'spavaća soba': 'Spavaća soba',
              'hodnik': 'Hodnik',
              'ostava': 'Ostava',
              'garaža': 'Garaža',
              'drugo': 'Drugo'
            }
            
            const mappedRoom = roomMapping[parsed.room?.toLowerCase() || '']
            parsed.room = mappedRoom || 'Ostalo'
          }
          
          // Boost confidence when we have both text and images
          parsed.confidence = Math.min(parsed.confidence + 0.1, 1.0)
          
          return parsed
        } catch (secondParseError) {
          console.error('Second parse attempt failed:', secondParseError)
        }
      }
      
      throw new Error('Greška pri parsiranju AI odgovora')
    }
  } catch (error) {
    console.error(`\n=== API ERROR ===`)
    console.error('OpenAI Vision analysis failed:', error)
    console.error(`=== END API ERROR ===\n`)
    // Fallback to text-only analysis
    return aiAnalysis(text)
  }
}

// Test endpoint to see what ChatGPT sees in the image
router.post('/test-vision', async (req: Request, res: Response) => {
  try {
    const { images }: { images: string[] } = req.body

    if (!images || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Potrebna je slika za testiranje'
      })
    }

    if (!openai) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI nije konfigurisan'
      })
    }

    console.log(`Testing vision with ${images.length} images`)
    console.log(`First image data (first 100 chars): ${images[0].substring(0, 100)}...`)

    const messages: any[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Opiši detaljno šta vidiš na ovoj slici. Budi vrlo precizan i opiši sve elemente, boje, objekte, probleme koje uočavaš."
          },
          ...images.map(image => ({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${image}`,
              detail: "high"
            }
          }))
        ]
      }
    ]

    console.log('Sending test request to GPT-4o...')
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 500,
      temperature: 0.3
    })

    const response = completion.choices[0]?.message?.content
    console.log('GPT-4o test response:', response)

    res.json({
      success: true,
      description: response || 'Nema odgovora od AI-ja',
      imageCount: images.length,
      imagePreview: images[0].substring(0, 100) + '...'
    })

  } catch (error) {
    console.error('=== TEST-VISION ERROR ===')
    console.error('Full error:', error)
    console.error('Error message:', (error as Error).message)
    console.error('Error stack:', (error as Error).stack)
    console.error('=== END TEST-VISION ERROR ===')
    
    res.status(500).json({
      success: false,
      error: 'Greška pri testiranju vizije: ' + (error as Error).message,
      details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    })
  }
})

// POST /api/ai/analyze-issue - Optimizovana verzija sa keširanje slike
router.post('/analyze-issue', async (req: Request, res: Response) => {
  try {
    console.log('=== ANALYZE-ISSUE REQUEST ===')
    console.log('Request body:', JSON.stringify(req.body, null, 2))
    
    const { title, description, room, images, text, cachedImageDescription }: AnalyzeRequest = req.body

    // Koristimo text ako je proslijeđen, inače kombinujemo title i description
    const combinedText = text || [title, description, room].filter(Boolean).join(' ')

    console.log('Parsed data:', {
      title,
      description,
      room,
      combinedText,
      imageCount: images?.length || 0,
      hasCachedDescription: !!cachedImageDescription,
      cachedImageDescription: cachedImageDescription?.substring(0, 100) + '...'
    })

    if (!combinedText && (!images || images.length === 0) && !cachedImageDescription) {
      console.log('ERROR: No valid input provided')
      return res.status(400).json({
        success: false,
        error: 'Potreban je tekst, slika ili keširan opis slike'
      })
    }

    let imageDescription = ''
    let shouldAnalyzeImages = false

    // Provjeri da li trebamo analizirati slike ili koristiti keš
    if (images && images.length > 0) {
      if (cachedImageDescription) {
        console.log('Koristim keširan opis slike')
        imageDescription = cachedImageDescription
      } else {
        console.log('Analiziram nove slike')
        shouldAnalyzeImages = true
      }
    }

    // Ako trebamo analizirati slike
    if (shouldAnalyzeImages) {
      console.log(`Analyzing with ${images.length} images and text: "${combinedText}"`)
      const analysis = await aiVisionAnalysis(combinedText, images)
      
      // Izvuci opis slike iz reasoning-a za keširanje
      const reasoningParts = analysis.reasoning.split('.')
      const imageDescriptionPart = reasoningParts[0] // Prvi dio je obično opis slike
      
      res.json({
        success: true,
        data: analysis,
        imageDescription: imageDescriptionPart // Vraćamo opis slike za keširanje
      })
      return
    }

    // Ako imamo keširan opis slike, kombinuj ga sa tekstom
    if (imageDescription) {
      console.log(`Analyzing with cached image description: "${imageDescription}"`)
      console.log(`Combined text: "${combinedText}"`)
      
      const analysisText = combinedText ? 
        `${imageDescription}. Korisnik kaže: "${combinedText}"` : 
        imageDescription
      
      const analysis = await aiAnalysis(analysisText)
      
      res.json({
        success: true,
        data: {
          ...analysis,
          reasoning: `${imageDescription}. ${analysis.reasoning}`
        }
      })
      return
    }

    // Samo tekst analiza
    if (combinedText.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Tekst je prekratak za analizu'
      })
    }

    console.log(`Analyzing text only: "${combinedText}"`)
    const analysis = await aiAnalysis(combinedText)

    res.json({
      success: true,
      data: analysis
    })

  } catch (error) {
    console.error('=== ANALYZE-ISSUE ERROR ===')
    console.error('Full error:', error)
    console.error('Error message:', (error as Error).message)
    console.error('Error stack:', (error as Error).stack)
    console.error('Request body:', req.body)
    console.error('=== END ANALYZE-ISSUE ERROR ===')
    
    res.status(500).json({
      success: false,
      error: 'Greška pri analizi problema: ' + (error as Error).message,
      details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    })
  }
})

export default router