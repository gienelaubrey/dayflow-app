import { Resend } from 'resend'
import { otpTtlMinutes } from './otp.js'

let resendClient = null

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing from server/.env.')
  }

  if (!resendClient) resendClient = new Resend(apiKey)
  return resendClient
}

function emailShell({ eyebrow, title, intro, code, footer }) {
  const prettyCode = code.split('').join(' ')

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#fff8fb;padding:32px;color:#3f2d37">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #f2dce6;border-radius:18px;padding:32px;box-shadow:0 12px 36px rgba(111,50,78,.08)">
        <div style="font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#bf416f;margin-bottom:12px">${eyebrow}</div>
        <h1 style="font-size:25px;line-height:1.25;margin:0 0 10px;color:#33252e">${title}</h1>
        <p style="margin:0 0 24px;line-height:1.6;color:#7f6b76">${intro}</p>
        <div style="font-size:34px;font-weight:800;letter-spacing:9px;text-align:center;padding:18px 16px;border-radius:14px;background:#fff0f6;color:#b33f69">${prettyCode}</div>
        <p style="margin:22px 0 0;line-height:1.6;color:#8d7b85">${footer}</p>
      </div>
    </div>
  `
}

async function sendCodeEmail({ to, subject, textLines, html }) {
  const from = process.env.EMAIL_FROM || 'DayFlow <onboarding@resend.dev>'

  const { data, error } = await getResend().emails.send({
    from,
    to,
    subject,
    text: textLines.join('\n'),
    html,
  })

  if (error) {
    const failure = new Error(error.message || 'The email could not be sent.')
    failure.cause = error
    throw failure
  }

  return data
}

export async function sendVerificationEmail({ to, code }) {
  const ttl = otpTtlMinutes()

  return sendCodeEmail({
    to,
    code,
    subject: 'Verify your DayFlow account',
    textLines: [
      'Verify your DayFlow account',
      '',
      `Your verification code is ${code}.`,
      `This code expires in ${ttl} minutes.`,
      '',
      "If you didn't create a DayFlow account, you can ignore this email.",
    ],
    html: emailShell({
      eyebrow: 'DayFlow',
      title: 'Verify your email',
      intro: 'Enter this 6-digit code in DayFlow to finish creating your account.',
      code,
      footer: `This code expires in ${ttl} minutes. If you didn't create a DayFlow account, you can ignore this email.`,
    }),
  })
}

export async function sendPasswordResetEmail({ to, code }) {
  const ttl = otpTtlMinutes()

  return sendCodeEmail({
    to,
    code,
    subject: 'Reset your DayFlow password',
    textLines: [
      'Reset your DayFlow password',
      '',
      `Your password reset code is ${code}.`,
      `This code expires in ${ttl} minutes.`,
      '',
      "If you didn't request a password reset, you can ignore this email.",
    ],
    html: emailShell({
      eyebrow: 'DayFlow',
      title: 'Reset your password',
      intro: 'Enter this 6-digit code in DayFlow to choose a new password.',
      code,
      footer: `This code expires in ${ttl} minutes. If you didn't request a password reset, you can ignore this email.`,
    }),
  })
}
