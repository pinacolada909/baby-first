import { useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TrackerType, ParsedFormData } from '@/types'

interface VoiceInputButtonProps {
  trackerType: TrackerType
  onParsed: (data: ParsedFormData) => void
  disabled?: boolean
}

export function VoiceInputButton({ trackerType, onParsed, disabled }: VoiceInputButtonProps) {
  const { t } = useLanguage()

  const handleParsed = useCallback(
    (data: ParsedFormData, confidence: 'high' | 'medium' | 'low') => {
      onParsed(data)

      if (confidence === 'high') {
        toast.success(t('voice.parsed'))
      } else if (confidence === 'medium') {
        toast.warning(t('voice.parsed'))
      } else if (confidence === 'low') {
        toast.warning(t('voice.confidence.low'))
      }
    },
    [onParsed, t],
  )

  const {
    state,
    transcript,
    browserSupported,
    startListening,
    stopAndParse,
    error,
  } = useVoiceInput(trackerType, { onParsed: handleParsed })

  // Handle errors
  useEffect(() => {
    if (!error) return

    const errorMessages: Record<string, string> = {
      mic_permission_denied: t('voice.error.noMic'),
      parse_failed: t('voice.error.parseFailed'),
      network_error: t('voice.error.network'),
      rate_limited: t('voice.error.rateLimited'),
    }

    toast.error(errorMessages[error] || t('common.error'))
  }, [error, t])

  if (!browserSupported) {
    return (
      <Button
        variant="outline"
        size="icon"
        disabled
        title={t('voice.error.unsupported')}
        className="shrink-0"
      >
        <MicOff className="h-4 w-4 text-muted-foreground" />
      </Button>
    )
  }

  const hintKey = `voice.hint.${trackerType}` as 'voice.hint.sleep' | 'voice.hint.feeding' | 'voice.hint.diaper' | 'voice.hint.growth' | 'voice.hint.pumping'

  if (state === 'parsing') {
    return (
      <div className="space-y-2">
        <Button variant="outline" disabled className="shrink-0">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          {t('voice.processing')}
        </Button>
      </div>
    )
  }

  if (state === 'listening') {
    return (
      <div className="space-y-2">
        <Button
          variant="destructive"
          onClick={stopAndParse}
          className="shrink-0 animate-pulse"
        >
          <MicOff className="h-4 w-4 mr-2" />
          {t('voice.stop')}
        </Button>

        {/* Live transcript preview */}
        {transcript && (
          <p className="text-xs text-muted-foreground italic rounded bg-muted/50 px-2 py-1">
            {transcript}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="icon"
        onClick={startListening}
        disabled={disabled}
        title={t('voice.start')}
        className="shrink-0"
      >
        <Mic className="h-4 w-4" />
      </Button>
      <p className="text-xs text-muted-foreground">
        {t(hintKey)}
      </p>
    </div>
  )
}
