'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheckIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { COUNTRIES, DEFAULT_COUNTRY, toE164 } from '@/lib/phone/e164'
import { startPhoneVerification, confirmPhoneVerification } from '@/app/account/verifyPhone/actions'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

/**
 * Owner-only phone verification. Two steps: enter phone (with country selector)
 * → enter the 6-digit SMS code. The code is sent + checked by Twilio Verify; we
 * never see or store it. On success the account's phone is marked verified.
 * Email and phone verification are independent — this says nothing about email.
 */
export function PhoneVerification({
  verified,
  currentPhone,
}: {
  verified: boolean
  currentPhone: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone')
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY.iso)
  const [national, setNational] = useState('')
  const [e164, setE164] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (verified || step === 'done') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <BadgeCheckIcon className="size-4 text-emerald-600" aria-hidden />
        <span className="font-medium">Phone verified</span>
        {(e164 || currentPhone) && (
          <span className="text-muted-foreground">· {e164 || currentPhone}</span>
        )}
      </div>
    )
  }

  const country = COUNTRIES.find((c) => c.iso === countryIso) ?? DEFAULT_COUNTRY

  function sendCode(isResend = false) {
    const target = isResend ? e164 : toE164(country.dial, national)
    if (!target) {
      toast.error('Enter a valid phone number for the selected country.')
      return
    }
    startTransition(async () => {
      const res = await startPhoneVerification(target)
      if (res.error) {
        toast.error(res.error)
        return
      }
      setE164(target)
      setStep('code')
      setCooldown(RESEND_COOLDOWN)
      toast.success('Verification code sent.')
    })
  }

  function confirmCode(code: string) {
    startTransition(async () => {
      const res = await confirmPhoneVerification(e164, code)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Phone verified.')
      setStep('done')
      router.refresh()
    })
  }

  const selectClass =
    'rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/30'

  if (step === 'phone') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Verify your mobile number so buyers and sellers can trust your account. We’ll text a
          one-time code.
        </p>
        <div className="space-y-2">
          <Label htmlFor="phone-national">Mobile number</Label>
          <div className="flex gap-2">
            <select
              aria-label="Country"
              value={countryIso}
              onChange={(e) => setCountryIso(e.target.value)}
              disabled={pending}
              className={selectClass}
            >
              {COUNTRIES.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.flag} {c.iso} +{c.dial}
                </option>
              ))}
            </select>
            <Input
              id="phone-national"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="50 123 4567"
              value={national}
              onChange={(e) => setNational(e.target.value)}
              className="flex-1"
              disabled={pending}
            />
          </div>
          <Button onClick={() => sendCode(false)} disabled={pending || national.trim().length < 5}>
            {pending && <Loader2Icon className="mr-1 size-4 animate-spin" aria-hidden />}
            Send code
          </Button>
        </div>
      </div>
    )
  }

  // step === 'code'
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code we sent to <span className="font-medium text-foreground">{e164}</span>.
      </p>
      <OtpInput disabled={pending} onComplete={confirmCode} />
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => sendCode(true)}
          disabled={pending || cooldown > 0}
          className="text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
        <span aria-hidden className="text-border">
          |
        </span>
        <button
          type="button"
          onClick={() => setStep('phone')}
          disabled={pending}
          className="text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
        >
          Change number
        </button>
      </div>
    </div>
  )
}

/** Six single-digit boxes with paste, auto-advance, and backspace navigation. */
function OtpInput({
  disabled,
  onComplete,
}: {
  disabled: boolean
  onComplete: (code: string) => void
}) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function set(index: number, value: string) {
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus()
    const code = next.join('')
    if (code.length === OTP_LENGTH && next.every(Boolean)) onComplete(code)
  }

  function onChange(index: number, raw: string) {
    const v = raw.replace(/\D/g, '')
    if (!v) {
      set(index, '')
      return
    }
    // Support typing/pasting multiple digits into one box.
    if (v.length > 1) {
      const chars = v.slice(0, OTP_LENGTH - index).split('')
      const next = [...digits]
      chars.forEach((ch, i) => (next[index + i] = ch))
      setDigits(next)
      const lastIdx = Math.min(index + chars.length, OTP_LENGTH - 1)
      refs.current[lastIdx]?.focus()
      const code = next.join('')
      if (code.length === OTP_LENGTH && next.every(Boolean)) onComplete(code)
      return
    }
    set(index, v)
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!text) return
    e.preventDefault()
    const next = Array(OTP_LENGTH).fill('')
    text.split('').forEach((ch, i) => (next[i] = ch))
    setDigits(next)
    refs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus()
    if (text.length === OTP_LENGTH) onComplete(text)
  }

  return (
    <div className="flex gap-2" role="group" aria-label="One-time code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          aria-label={`Digit ${i + 1}`}
          className="h-12 w-11 rounded-lg border border-input bg-card text-center text-lg font-medium outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/30 disabled:opacity-60"
        />
      ))}
    </div>
  )
}
