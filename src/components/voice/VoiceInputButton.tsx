import { useEffect } from 'react'
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
  const {
    isListening,
    transcript,
    browserSupported,
    isParsing,
    parsedData,
    confidence,
    startListening,
    stopAndParse,
    clear,
    error,
  } = useVoiceInput(trackerType)

  // Handle parsed data
  useEffect(() => {
    if (parsedData) {
      onParsed(parsedData)

      if (confidence === 'high') {
        toast.success(t('voice.parsed'))
      } else if (confidence === 'medium') {
        toast.warning(t('voice.parsed'))
      } else if (confidence === 'low') {
        toast.warning(t('voice.confidence.low'))
      }

      // Clear after delivering parsed data
      clear()
    }
  }, [parsedData, confidence, onParsed, t, clear])

  // Handle errors
  useEffect(() => {
    if (!error) return

    const errorMessages: Record<string, string> = {
      mic_permission_denied: t('voice.error.noMic'),
      parse_failed: t('voice.error.parseFailed'),
      network_error: t('voice.error.network'),
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

  const hintKey = `voice.hint.${trackerType}` as 'voice.hint.sleep' | 'voice.hint.feeding' | 'voice.hint.diaper'

  const handleClick = () => {
    if (isListening) {
      stopAndParse()
    } else {
      startListening()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant={isListening ? 'destructive' : 'outline'}
          size="icon"
          onClick={handleClick}
          disabled={disabled || isParsing}
          title={isListening ? t('voice.stop') : t('voice.start')}
          className={`shrink-0 ${isListening ? 'animate-pulse ring-2 ring-red-400' : ''}`}
        >
          {isParsing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isListening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        {isListening && (
          <span className="text-sm text-red-500 font-medium animate-pulse">
            {t('voice.listening')}
          </span>
        )}

        {isParsing && (
          <span className="text-sm text-muted-foreground">
            {t('voice.processing')}
          </span>
        )}
      </div>

      {/* Live transcript preview */}
      {(isListening || transcript) && !isParsing && (
        <p className="text-xs text-muted-foreground italic rounded bg-muted/50 px-2 py-1">
          {transcript || t(hintKey)}
        </p>
      )}

      {/* Hint text when idle */}
      {!isListening && !transcript && !isParsing && (
        <p className="text-xs text-muted-foreground">
          {t(hintKey)}
        </p>
      )}
    </div>
  )
}
