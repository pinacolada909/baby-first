import { useState, useCallback, useRef, useEffect } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import type { TrackerType, ParsedFormData } from '@/types'

interface UseVoiceInputReturn {
  // Speech recognition state
  isListening: boolean
  transcript: string
  browserSupported: boolean

  // Parsing state
  isParsing: boolean
  parsedData: ParsedFormData | null
  confidence: 'high' | 'medium' | 'low' | null

  // Actions
  startListening: () => void
  stopAndParse: () => void
  clear: () => void

  // Errors
  error: string | null
}

export function useVoiceInput(trackerType: TrackerType): UseVoiceInputReturn {
  const { language } = useLanguage()
  const [isParsing, setIsParsing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedFormData | null>(null)
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const parsingRef = useRef(false)

  const {
    transcript,
    listening: isListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  const startListening = useCallback(() => {
    setError(null)
    setParsedData(null)
    setConfidence(null)
    resetTranscript()

    const lang = language === 'zh' ? 'zh-CN' : 'en-US'

    SpeechRecognition.startListening({
      continuous: true,
      language: lang,
    }).catch(() => {
      setError('mic_permission_denied')
    })
  }, [language, resetTranscript])

  const parseTranscript = useCallback(
    async (text: string) => {
      if (!text.trim() || parsingRef.current) return

      parsingRef.current = true
      setIsParsing(true)
      setError(null)

      try {
        const { data, error: fnError } = await supabase.functions.invoke('parse-voice-input', {
          body: { transcript: text, tracker_type: trackerType, language },
        })

        if (fnError) {
          throw fnError
        }

        if (data?.success && data.data) {
          setParsedData(data.data)
          setConfidence(data.confidence || 'medium')
        } else {
          setError('parse_failed')
        }
      } catch (err) {
        console.error('Voice parse error:', err)
        setError('network_error')
      } finally {
        setIsParsing(false)
        parsingRef.current = false
      }
    },
    [trackerType, language],
  )

  const stopAndParse = useCallback(() => {
    SpeechRecognition.stopListening()
    // Parse will be triggered by the effect below when listening stops
  }, [])

  // When listening stops and we have a transcript, parse it
  const prevListening = useRef(false)
  useEffect(() => {
    if (prevListening.current && !isListening && transcript.trim()) {
      parseTranscript(transcript)
    }
    prevListening.current = isListening
  }, [isListening, transcript, parseTranscript])

  const clear = useCallback(() => {
    resetTranscript()
    setParsedData(null)
    setConfidence(null)
    setError(null)
    setIsParsing(false)
  }, [resetTranscript])

  return {
    isListening,
    transcript,
    browserSupported: browserSupportsSpeechRecognition,
    isParsing,
    parsedData,
    confidence,
    startListening,
    stopAndParse,
    clear,
    error,
  }
}
