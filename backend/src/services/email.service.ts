import { Resend } from 'resend'
import logger from './logger.service.js'

const resendApiKey = (process.env.RESEND_API || process.env.RESEND_API_KEY || '').trim()
const resend = new Resend(resendApiKey)

const fromEmail = process.env.EMAIL_FROM || 'Bistromapa <onboarding@resend.dev>'
const adminEmail = process.env.ADMIN_EMAIL || 'app.bistromapa@gmail.com'

/**
 * Wysyła jednorazowy kod weryfikacyjny na podany adres e-mail.
 */
export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
	try {
		await resend.emails.send({
			from: fromEmail,
			to: email,
			subject: 'Kod weryfikacyjny - Bistromapa',
			html: `
				<div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 5px;">
					<h2 style="color: #333; text-align: center;">Kod weryfikacyjny Bistromapa</h2>
					<p>Dziękujemy za rejestrację w aplikacji <strong>Bistromapa</strong>.</p>
					<p>Twój kod weryfikacyjny, aby ukończyć proces zakładania konta, to:</p>
					<div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 4px; border: 1px dashed #ccc;">
						${code}
					</div>
					<p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
						Jeśli nie rejestrowałeś się w naszej aplikacji, zignoruj tę wiadomość.<br>
						Kod jest ważny przez 15 minut.
					</p>
				</div>
			`,
		})

		await logger.info(`Wysłano kod weryfikacyjny do użytkownika ${email} przez Resend`)
		return true
	} catch (error: any) {
		await logger.error(`Błąd podczas wysyłania maila do ${email} przez Resend`, error.message || error)
		return false
	}
}

/**
 * Wysyła link resetujący hasło na podany adres e-mail.
 */
export async function sendPasswordResetEmail(email: string, link: string): Promise<boolean> {
	try {
		await resend.emails.send({
			from: fromEmail,
			to: email,
			subject: 'Resetowanie hasła - Bistromapa',
			html: `
				<div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 5px;">
					<h2 style="color: #333; text-align: center;">Resetowanie hasła Bistromapa</h2>
					<p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w aplikacji <strong>Bistromapa</strong>.</p>
					<p>Kliknij w poniższy link, aby ustawić nowe hasło:</p>
					<div style="text-align: center; margin: 30px 0;">
						<a href="${link}" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; font-size: 14px; font-weight: bold; font-family: monospace; display: inline-block;">USTAW NOWE HASŁO</a>
					</div>
					<p style="color: #666; font-size: 12px;">Jeśli przycisk nie działa, skopiuj i wklej poniższy adres URL do przeglądarki:</p>
					<p style="color: #666; font-size: 11px; word-break: break-all;">${link}</p>
					<p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
						Jeśli nie prosiłeś o resetowanie hasła, zignoruj tę wiadomość.<br>
						Link jest ważny przez 1 godzinę.
					</p>
				</div>
			`,
		})

		await logger.info(`Wysłano e-mail z resetowaniem hasła do użytkownika ${email} przez Resend`)
		return true
	} catch (error: any) {
		await logger.error(`Błąd podczas wysyłania maila do ${email} przez Resend`, error.message || error)
		return false
	}
}

/**
 * Funkcja wysyłająca powiadomienie e-mail do administratora w przypadku błędu pobierania dań
 */
export async function sendAdminScrapingAlert(failedJobs: any[]): Promise<boolean> {
	try {
		await resend.emails.send({
			from: fromEmail,
			to: adminEmail,
			subject: '🚨 ALERT: Nie udało się pobrać dań dnia — Bistromapa.pl',
			html: `
				<div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 5px;">
					<h2 style="color: #c53030; text-align: center;">🚨 Alarm Scrapera Facebooka</h2>
					<p>Witaj Administratorze,</p>
					<p>Informujemy, że podczas dzisiejszego automatycznego cyklu pobierania ofert wystąpiły błędy. <strong>Liczba nieudanych pobrań: ${failedJobs.length}</strong>.</p>
					
					<p>Oto lista lokali, dla których pobieranie zakończyło się błędem:</p>
					<table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
						<thead>
							<tr style="background-color: #f7fafc; border-bottom: 1px solid #edf2f7;">
								<th style="padding: 10px; text-align: left;">Nazwa Restauracji</th>
								<th style="padding: 10px; text-align: left;">Błąd / Powód</th>
							</tr>
						</thead>
						<tbody>
							${failedJobs.map(job => `
								<tr style="border-bottom: 1px solid #edf2f7;">
									<td style="padding: 10px; font-weight: bold; color: #2d3748;">${job.name}</td>
									<td style="padding: 10px; color: #e53e3e; font-family: monospace;">${job.reason || 'Brak danych / Błąd sieciowy'}</td>
								</tr>
							`).join('')}
						</tbody>
					</table>
					
					<p style="margin-top: 25px; font-size: 12px; color: #718096; text-align: center;">
						Możesz spróbować uruchomić pobieranie ponownie w dowolnym momencie, klikając przycisk awaryjny w Panelu Administratora.
					</p>
				</div>
			`,
		})

		await logger.info('Wysłano powiadomienie alertu skrapowania do admina przez Resend')
		return true
	} catch (error: any) {
		await logger.error('Błąd wysyłania powiadomienia alertu skrapowania do admina przez Resend', error.message || error)
		return false
	}
}
