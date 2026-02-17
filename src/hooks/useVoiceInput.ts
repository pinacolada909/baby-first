import { useState, useCallback, useRef } from 'react'
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
  const [stopped, setStopped] = useState(false)
  const parsingRef = useRef(false)
  const transcriptRef = useRef('')

  const {
    transcript,
    listening: isListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  // Keep transcript ref in sync
  transcriptRef.current = transcript

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
          console.error('Edge function error:', fnError)
          // fnError from supabase client can be a FunctionsHttpError, FunctionsRelayError, or FunctionsFetchError
          setError('network_error')
          return
        }

        if (data?.success && data.data) {
          setParsedData(data.data)
          setConfidence(data.confidence || 'medium')
        } else {
          console.error('Parse failed, response:', data)
          setError(data?.error?.includes('rate') || data?.error?.includes('429') ? 'rate_limited' : 'parse_failed')
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

  const startListening = useCallback(() => {
    setError(null)
    setParsedData(null)
    setConfidence(null)
    setStopped(false)
    resetTranscript()

    const lang = language === 'zh' ? 'zh-CN' : 'en-US'

    SpeechRecognition.startListening({
      continuous: true,
      language: lang,
    }).catch(() => {
      setError('mic_permission_denied')
    })
  }, [language, resetTranscript])

  const stopAndParse = useCallback(() => {
    SpeechRecognition.abortListening()
    setStopped(true)

    // Grab the transcript directly from the ref and parse it
    const currentTranscript = transcriptRef.current
    if (currentTranscript.trim()) {
      parseTranscript(currentTranscript)
    }
  }, [parseTranscript])

  const clear = useCallback(() => {
    resetTranscript()
    setParsedData(null)
    setConfidence(null)
    setError(null)
    setIsParsing(false)
    setStopped(false)
  }, [resetTranscript])

  return {
    // When stopped, override isListening to false immediately
    isListening: stopped ? false : isListening,
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
