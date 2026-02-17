import { useState, useCallback, useRef, useEffect } from 'react'
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

// Check browser support
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    : null

export function useVoiceInput(trackerType: TrackerType, { onParsed }: UseVoiceInputOptions): UseVoiceInputReturn {
  const { language } = useLanguage()
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const onParsedRef = useRef(onParsed)
  onParsedRef.current = onParsed
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptRef = useRef('')
  const stateRef = useRef<VoiceState>('idle')

  // Keep refs in sync
  stateRef.current = state
  transcriptRef.current = transcript

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
        recognitionRef.current = null
      }
    }
  }, [])

  const callParseAPI = useCallback(async (text: string) => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const { data, error: fnError } = await supabase.functions.invoke('parse-voice-input', {
        body: { transcript: text, tracker_type: trackerType, language, timezone },
      })

      if (fnError) {
        console.error('Edge function error:', fnError)
        let errorBody: { error?: string } | null = null
        try {
          if ('context' in fnError && (fnError as { context: { json: () => Promise<unknown> } }).context?.json) {
            errorBody = await (fnError as { context: { json: () => Promise<{ error?: string }> } }).context.json()
          }
        } catch { /* ignore */ }
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
  }, [trackerType, language])

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return

    setError(null)
    setTranscript('')

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language === 'zh' ? 'zh-CN' : 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }
      const combined = (finalTranscript + interimTranscript).trim()
      setTranscript(combined)
      transcriptRef.current = combined
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('mic_permission_denied')
      }
      setState('idle')
      recognitionRef.current = null
    }

    recognition.onend = () => {
      // Only go to idle if we're still in listening state
      // (stopAndParse sets 'parsing' before this fires)
      if (stateRef.current === 'listening') {
        setState('idle')
      }
      recognitionRef.current = null
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      setState('listening')
    } catch {
      setError('mic_permission_denied')
    }
  }, [language])

  const stopAndParse = useCallback(() => {
    const currentTranscript = transcriptRef.current

    // Stop recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
      recognitionRef.current = null
    }

    if (!currentTranscript.trim()) {
      setState('idle')
      return
    }

    // Transition to parsing immediately
    setState('parsing')
    setError(null)
    callParseAPI(currentTranscript)
  }, [callParseAPI])

  return {
    state,
    transcript,
    browserSupported: !!SpeechRecognitionAPI,
    startListening,
    stopAndParse,
    error,
  }
}
