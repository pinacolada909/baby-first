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

/* eslint-disable @typescript-eslint/no-explicit-any */
// Web Speech API — not all TS configs include these types
const getSpeechRecognitionClass = (): (new () => any) | null => {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

const SpeechRecognitionClass = getSpeechRecognitionClass()
/* eslint-enable @typescript-eslint/no-explicit-any */

export function useVoiceInput(trackerType: TrackerType, { onParsed }: UseVoiceInputOptions): UseVoiceInputReturn {
  const { language } = useLanguage()
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const onParsedRef = useRef(onParsed)
  onParsedRef.current = onParsed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
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
      // Send browser's local time directly so the server doesn't need to compute it
      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')
      const localTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      const { data, error: fnError } = await supabase.functions.invoke('parse-voice-input', {
        body: { transcript: text, tracker_type: trackerType, language, timezone, local_time: localTime },
      })

      if (fnError) {
        console.error('Edge function error:', fnError)
        const errorStr = String(fnError)
        setError(errorStr.includes('429') || errorStr.includes('rate') ? 'rate_limited' : 'network_error')
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
    if (!SpeechRecognitionClass) return

    setError(null)
    setTranscript('')

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language === 'zh' ? 'zh-CN' : 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
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
    browserSupported: !!SpeechRecognitionClass,
    startListening,
    stopAndParse,
    error,
  }
}
