import { useState, useCallback, useRef } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import type { TrackerType, ParsedFormData } from '@/types'

interface UseVoiceInputOptions {
  onParsed: (data: ParsedFormData, confidence: 'high' | 'medium' | 'low') => void
}

interface UseVoiceInputReturn {
  // Speech recognition state
  isListening: boolean
  transcript: string
  browserSupported: boolean

  // Parsing state
  isParsing: boolean

  // Actions
  startListening: () => void
  stopAndParse: () => void

  // Errors
  error: string | null
}

export function useVoiceInput(trackerType: TrackerType, { onParsed }: UseVoiceInputOptions): UseVoiceInputReturn {
  const { language } = useLanguage()
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stopped, setStopped] = useState(false)
  const parsingRef = useRef(false)
  const transcriptRef = useRef('')
  const onParsedRef = useRef(onParsed)
  onParsedRef.current = onParsed

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
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const { data, error: fnError } = await supabase.functions.invoke('parse-voice-input', {
          body: { transcript: text, tracker_type: trackerType, language, timezone },
        })

        if (fnError) {
          console.error('Edge function error:', fnError)
          // Try to extract the JSON body from FunctionsHttpError
          let errorBody: { error?: string } | null = null
          try {
            if ('context' in fnError && (fnError as { context: { json: () => Promise<unknown> } }).context?.json) {
              errorBody = await (fnError as { context: { json: () => Promise<{ error?: string }> } }).context.json()
            }
          } catch {
            // ignore parsing errors
          }
          const errorMsg = errorBody?.error || ''
          if (errorMsg.includes('rate') || errorMsg.includes('429')) {
            setError('rate_limited')
          } else {
            setError('network_error')
          }
          return
        }

        if (data?.success && data.data) {
          onParsedRef.current(data.data, data.confidence || 'medium')
        } else {
          console.error('Parse failed, response:', data)
          const errorMsg = data?.error || ''
          setError(errorMsg.includes('rate') || errorMsg.includes('429') ? 'rate_limited' : 'parse_failed')
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

  return {
    // When stopped, override isListening to false immediately
    isListening: stopped ? false : isListening,
    transcript,
    browserSupported: browserSupportsSpeechRecognition,
    isParsing,
    startListening,
    stopAndParse,
    error,
  }
}
