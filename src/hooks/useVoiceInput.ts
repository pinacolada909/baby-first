import { useState, useCallback, useRef } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import type { TrackerType, ParsedFormData } from '@/types'

interface UseVoiceInputOptions {
  onParsed: (data: ParsedFormData, confidence: 'high' | 'medium' | 'low') => void
}

type VoiceState = 'idle' | 'listening' | 'parsing'

interface UseVoiceInputReturn {
  state: VoiceState
  transcript: string
  browserSupported: boolean
  startListening: () => void
  stopAndParse: () => void
  error: string | null
}

export function useVoiceInput(trackerType: TrackerType, { onParsed }: UseVoiceInputOptions): UseVoiceInputReturn {
  const { language } = useLanguage()
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)
  const transcriptRef = useRef('')
  const onParsedRef = useRef(onParsed)
  onParsedRef.current = onParsed

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  // Keep transcript ref in sync
  transcriptRef.current = transcript

  const startListening = useCallback(() => {
    setError(null)
    resetTranscript()
    setState('listening')

    const lang = language === 'zh' ? 'zh-CN' : 'en-US'

    SpeechRecognition.startListening({
      continuous: true,
      language: lang,
    }).catch(() => {
      setState('idle')
      setError('mic_permission_denied')
    })
  }, [language, resetTranscript])

  const stopAndParse = useCallback(() => {
    // Grab transcript before aborting
    const currentTranscript = transcriptRef.current

    SpeechRecognition.abortListening()

    if (!currentTranscript.trim()) {
      setState('idle')
      return
    }

    // Transition to parsing immediately
    setState('parsing')
    setError(null)

    const doParseAsync = async () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const { data, error: fnError } = await supabase.functions.invoke('parse-voice-input', {
          body: { transcript: currentTranscript, tracker_type: trackerType, language, timezone },
        })

        if (fnError) {
          console.error('Edge function error:', fnError)
          let errorBody: { error?: string } | null = null
          try {
            if ('context' in fnError && (fnError as { context: { json: () => Promise<unknown> } }).context?.json) {
              errorBody = await (fnError as { context: { json: () => Promise<{ error?: string }> } }).context.json()
            }
          } catch {
            // ignore parsing errors
          }
          const errorMsg = errorBody?.error || ''
          setError(errorMsg.includes('rate') || errorMsg.includes('429') ? 'rate_limited' : 'network_error')
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
        setState('idle')
      }
    }
    doParseAsync()
  }, [trackerType, language])

  return {
    state,
    transcript,
    browserSupported: browserSupportsSpeechRecognition,
    startListening,
    stopAndParse,
    error,
  }
}
