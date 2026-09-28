import { Resend } from 'resend'
import logger from './logger.service.js'

const resendApiKey = (process.env.RESEND_API || '').trim()
const resend = new Resend(resendApiKey)

const fromEmail = process.env.EMAIL_FROM || 'Bistromapa <kontakt@bistromapa.app>'
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
				<div style="margin:0; padding:40px 20px; background-color:#f7f5f1; font-family:Arial, Helvetica, sans-serif; color:#292724;">
	<div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e9e4dc; border-radius:14px; overflow:hidden;">

		<!-- Header -->
		<div style="padding:28px 32px 22px; border-bottom:1px solid #eee9e2;">
			<div style="font-size:13px; font-weight:bold; letter-spacing:2px; color:#e87522; text-transform:uppercase;">
				BISTRO MAPA
			</div>
		</div>

		<!-- Content -->
		<div style="padding:36px 32px 32px;">
			<h1 style="margin:0 0 18px; font-size:26px; line-height:1.3; color:#292724; font-weight:700;">
				Potwierdź swój adres e-mail
			</h1>

			<p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#5f5a54;">
				Dziękujemy za rejestrację w <strong style="color:#292724;">BistroMapie</strong>.
				Został już tylko jeden krok, aby aktywować Twoje konto.
			</p>

			<p style="margin:0 0 24px; font-size:15px; line-height:1.7; color:#5f5a54;">
				Wpisz poniższy kod weryfikacyjny w aplikacji:
			</p>

			<!-- Verification code -->
			<div style="margin:26px 0; padding:22px 15px; background:#fff7ef; border:1px solid #f3d4b8; border-radius:10px; text-align:center;">
				<div style="margin-bottom:8px; font-size:11px; font-weight:bold; letter-spacing:2px; color:#a9652e; text-transform:uppercase;">
					KOD WERYFIKACYJNY
				</div>

				<div style="font-size:30px; line-height:1.2; font-weight:700; letter-spacing:7px; color:#e87522;">
					${code}
				</div>
			</div>

			<p style="margin:24px 0 0; font-size:14px; line-height:1.6; color:#716b64;">
				Kod jest ważny przez <strong style="color:#292724;">15 minut</strong>.
				Jeśli nie rejestrowałeś się w BistroMapie, możesz bezpiecznie zignorować tę wiadomość.
			</p>
		</div>

		<!-- Footer -->
		<div style="padding:22px 32px; background:#faf9f7; border-top:1px solid #eee9e2;">
			<p style="margin:0; font-size:12px; line-height:1.6; color:#8a847c; text-align:center;">
				To wiadomość automatyczna — prosimy na nią nie odpowiadać.
				<br>
				© BistroMapa
			</p>
		</div>

	</div>
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
				<div style="margin:0; padding:40px 20px; background-color:#f7f5f1; font-family:Arial, Helvetica, sans-serif; color:#292724;">
					<div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e9e4dc; border-radius:14px; overflow:hidden;">

						<!-- Header -->
						<div style="padding:28px 32px 22px; border-bottom:1px solid #eee9e2;">
							<div style="font-size:13px; font-weight:bold; letter-spacing:2px; color:#e87522; text-transform:uppercase;">
								BISTRO MAPA
							</div>
						</div>

						<!-- Content -->
						<div style="padding:36px 32px 32px;">
							<h1 style="margin:0 0 18px; font-size:26px; line-height:1.3; color:#292724; font-weight:700;">
								Resetowanie hasła
							</h1>

							<p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#5f5a54;">
								Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w
								<strong style="color:#292724;">BistroMapie</strong>.
							</p>

							<p style="margin:0 0 24px; font-size:15px; line-height:1.7; color:#5f5a54;">
								Jeśli to Ty, kliknij poniższy przycisk, aby ustawić nowe hasło:
							</p>

							<!-- CTA -->
							<div style="text-align:center; margin:30px 0 34px;">
								<a
									href="${link}"
									style="display:inline-block; padding:14px 28px; background-color:#e87522; color:#ffffff; text-decoration:none; font-size:13px; font-weight:bold; letter-spacing:1px; border-radius:8px;"
								>
									USTAW NOWE HASŁO
								</a>
							</div>

							<!-- Fallback link -->
							<div style="padding:18px; background:#faf9f7; border:1px solid #eee9e2; border-radius:8px;">
								<p style="margin:0 0 8px; font-size:12px; line-height:1.5; color:#716b64;">
									Przycisk nie działa?
								</p>

								<p style="margin:0; font-size:11px; line-height:1.6; color:#8a847c; word-break:break-all;">
									${link}
								</p>
							</div>

							<!-- Security info -->
							<div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee9e2;">
								<p style="margin:0; font-size:12px; line-height:1.7; color:#8a847c;">
									Jeśli nie prosiłeś o resetowanie hasła, możesz bezpiecznie zignorować tę wiadomość.
									<br>
									Link do zmiany hasła jest ważny przez <strong style="color:#5f5a54;">1 godzinę</strong>.
								</p>
							</div>
						</div>

						<!-- Footer -->
						<div style="padding:22px 32px; background:#faf9f7; border-top:1px solid #eee9e2;">
							<p style="margin:0; font-size:12px; line-height:1.6; color:#8a847c; text-align:center;">
								To wiadomość automatyczna — prosimy na nią nie odpowiadać.
								<br>
								© BistroMapa
							</p>
						</div>

					</div>
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
				<div style="margin:0; padding:40px 20px; background-color:#f7f5f1; font-family:Arial, Helvetica, sans-serif; color:#292724;">
	<div style="max-width:650px; margin:0 auto; background:#ffffff; border:1px solid #e9e4dc; border-radius:14px; overflow:hidden;">

		<!-- Header -->
		<div style="padding:28px 32px 22px; border-bottom:1px solid #eee9e2;">
			<div style="font-size:13px; font-weight:bold; letter-spacing:2px; color:#e87522; text-transform:uppercase;">
				BISTRO MAPA
			</div>
		</div>

		<!-- Alert header -->
		<div style="padding:28px 32px 24px; background:#fff8f6; border-bottom:1px solid #f4d8d2;">
			<div style="font-size:11px; font-weight:bold; letter-spacing:1.5px; color:#b42318; text-transform:uppercase; margin-bottom:10px;">
				ALERT SYSTEMOWY
			</div>

			<h1 style="margin:0; font-size:24px; line-height:1.3; color:#292724; font-weight:700;">
				Alarm Scrapera Facebooka
			</h1>

			<p style="margin:10px 0 0; font-size:14px; line-height:1.6; color:#716b64;">
				Podczas automatycznego cyklu pobierania ofert wystąpiły błędy.
			</p>
		</div>

		<!-- Content -->
		<div style="padding:32px;">
			<p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#5f5a54;">
				Witaj Administratorze,
			</p>

			<p style="margin:0 0 24px; font-size:15px; line-height:1.7; color:#5f5a54;">
				Dzisiejszy cykl scrapowania nie zakończył się poprawnie dla wszystkich lokali.
				Liczba nieudanych pobrań:
				<strong style="color:#b42318;">${failedJobs.length}</strong>.
			</p>

			<!-- Error counter -->
			<div style="margin:0 0 26px; padding:18px 20px; background:#fff8f6; border:1px solid #f4d8d2; border-radius:10px;">
				<div style="font-size:11px; font-weight:bold; letter-spacing:1.5px; color:#8f1d13; text-transform:uppercase;">
					NIEUDANE POBRANIA
				</div>

				<div style="margin-top:5px; font-size:28px; line-height:1.2; font-weight:700; color:#b42318;">
					${failedJobs.length}
				</div>
			</div>

			<p style="margin:0 0 12px; font-size:13px; font-weight:bold; color:#292724;">
				Lokale wymagające uwagi
			</p>

			<!-- Errors table -->
			<div style="border:1px solid #e9e4dc; border-radius:10px; overflow:hidden;">
				<table style="width:100%; border-collapse:collapse; font-size:13px;">
					<thead>
						<tr style="background:#faf9f7;">
							<th style="padding:12px 14px; text-align:left; color:#716b64; font-size:11px; font-weight:bold; letter-spacing:.5px; text-transform:uppercase; border-bottom:1px solid #e9e4dc;">
								Lokal
							</th>
							<th style="padding:12px 14px; text-align:left; color:#716b64; font-size:11px; font-weight:bold; letter-spacing:.5px; text-transform:uppercase; border-bottom:1px solid #e9e4dc;">
								Powód
							</th>
						</tr>
					</thead>

					<tbody>
						${failedJobs
							.map(
								job => `
								<tr>
									<td style="padding:13px 14px; color:#292724; font-weight:bold; border-bottom:1px solid #eee9e2; vertical-align:top;">
										${job.name}
									</td>
									<td style="padding:13px 14px; color:#b42318; font-family:monospace; font-size:11px; line-height:1.5; border-bottom:1px solid #eee9e2; vertical-align:top; word-break:break-word;">
										${job.reason || 'Brak danych / Błąd sieciowy'}
									</td>
								</tr>
							`,
							)
							.join('')}
					</tbody>
				</table>
			</div>

			<!-- Action -->
			<div style="margin-top:28px; padding:20px; background:#fffaf5; border:1px solid #f3dfcc; border-radius:10px;">
				<p style="margin:0 0 14px; font-size:13px; line-height:1.6; color:#5f5a54;">
					Możesz ponownie uruchomić pobieranie ręcznie z poziomu
					<strong style="color:#292724;">Panelu Administratora</strong>.
				</p>

				<div style="font-size:12px; line-height:1.6; color:#8a847c;">
					Zalecamy sprawdzenie powodów błędów przed ponownym uruchomieniem cyklu.
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div style="padding:22px 32px; background:#faf9f7; border-top:1px solid #eee9e2;">
			<p style="margin:0; font-size:12px; line-height:1.6; color:#8a847c; text-align:center;">
				Automatyczne powiadomienie systemowe BistroMapa.
				<br>
				© BistroMapa
			</p>
		</div>

	</div>
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

/**
 * Wysyła link resetujący hasło na podany adres e-mail.
 */
export async function sendSuspendedEmail(email: string, name: string): Promise<boolean> {
	try {
		await resend.emails.send({
			from: fromEmail,
			to: email,
			subject: 'Twój lokal został zawieszony — Bistromapa.pl',
			html: `
				<div style="margin:0; padding:40px 20px; background-color:#f7f5f1; font-family:Arial, Helvetica, sans-serif; color:#292724;">
	<div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e9e4dc; border-radius:14px; overflow:hidden;">

		<!-- Header -->
		<div style="padding:28px 32px 22px; border-bottom:1px solid #eee9e2;">
			<div style="font-size:13px; font-weight:bold; letter-spacing:2px; color:#e87522; text-transform:uppercase;">
				BISTRO MAPA
			</div>
		</div>

		<!-- Status -->
		<div style="padding:28px 32px 24px; background:#fffaf5; border-bottom:1px solid #f3dfcc;">
			<div style="font-size:11px; font-weight:bold; letter-spacing:1.5px; color:#a9652e; text-transform:uppercase; margin-bottom:10px;">
				STATUS LOKALU
			</div>

			<h1 style="margin:0; font-size:24px; line-height:1.3; color:#292724; font-weight:700;">
				Twój lokal został zawieszony
			</h1>

			<p style="margin:10px 0 0; font-size:14px; line-height:1.6; color:#716b64;">
				Profil lokalu został czasowo ukryty w BistroMapie.
			</p>
		</div>

		<!-- Content -->
		<div style="padding:34px 32px 32px;">
			<p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#5f5a54;">
				Witaj,
				<strong style="color:#292724;">${name || 'Właścicielu'}</strong>.
			</p>

			<p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#5f5a54;">
				Informujemy, że lokal
				<strong style="color:#292724;">${name}</strong>
				został zawieszony przez administratora i oznaczony do usunięcia
				<strong style="color:#292724;">(status REMOVAL)</strong>.
			</p>

			<p style="margin:0 0 24px; font-size:15px; line-height:1.7; color:#5f5a54;">
				Profil został natychmiast ukryty i nie będzie obecnie wyświetlany
				na mapie ani na listach wyszukiwania BistroMapy.
			</p>

			<!-- Important information -->
			<div style="padding:20px; background:#fffaf5; border:1px solid #f3dfcc; border-left:4px solid #e87522; border-radius:8px;">
				<div style="margin-bottom:8px; font-size:11px; font-weight:bold; letter-spacing:1.5px; color:#a9652e; text-transform:uppercase;">
					Okres karencji — 90 dni
				</div>

				<p style="margin:0; font-size:13px; line-height:1.7; color:#6b5140;">
					Rozpoczął się 3-miesięczny okres karencji.
					Jeśli uważasz, że decyzja została podjęta niesłusznie i chcesz
					przywrócić lokal, skontaktuj się z nami, odpowiadając na tę wiadomość
					w ciągu najbliższych <strong style="color:#292724;">90 dni</strong>.
				</p>

				<p style="margin:12px 0 0; font-size:13px; line-height:1.7; color:#6b5140;">
					Po upływie tego okresu profil lokalu zostanie
					<strong style="color:#292724;">trwale usunięty</strong>.
				</p>
			</div>

			<p style="margin:26px 0 0; font-size:13px; line-height:1.7; color:#8a847c;">
				Jeśli masz pytania dotyczące zawieszenia lub chcesz wyjaśnić sytuację,
				odpowiedz bezpośrednio na tę wiadomość.
			</p>
		</div>

		<!-- Footer -->
		<div style="padding:22px 32px; background:#faf9f7; border-top:1px solid #eee9e2;">
			<p style="margin:0; font-size:12px; line-height:1.6; color:#8a847c; text-align:center;">
				To wiadomość dotycząca statusu Twojego lokalu w BistroMapie.
				<br>
				© BistroMapa
			</p>
		</div>

	</div>
</div>	
			`,
		})

		await logger.info(`Wysłano e-mail z informacją o zawieszeniu konta do użytkownika ${email} przez Resend`)
		return true
	} catch (error: any) {
		await logger.error(`Błąd podczas wysyłania maila do ${email} przez Resend`, error.message || error)
		return false
	}
}

/**
 * Wysyła wiadomość z formularza kontaktowego do administratora.
 */
export async function sendContactEmail(senderEmail: string, description: string): Promise<boolean> {
	try {
		await resend.emails.send({
			from: fromEmail,
			to: adminEmail,
			subject: `📬 Nowa wiadomość kontaktowa od ${senderEmail} — Bistromapa`,
			html: `
				<div style="margin:0; padding:40px 20px; background-color:#f7f5f1; font-family:Arial, Helvetica, sans-serif; color:#292724;">
	<div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e9e4dc; border-radius:14px; overflow:hidden;">

		<!-- Header -->
		<div style="padding:28px 32px 22px; border-bottom:1px solid #eee9e2;">
			<div style="font-size:13px; font-weight:bold; letter-spacing:2px; color:#e87522; text-transform:uppercase;">
				BISTRO MAPA
			</div>
		</div>

		<!-- Notification -->
		<div style="padding:28px 32px 24px; background:#fffaf5; border-bottom:1px solid #f3dfcc;">
			<div style="font-size:11px; font-weight:bold; letter-spacing:1.5px; color:#a9652e; text-transform:uppercase; margin-bottom:10px;">
				FORMULARZ KONTAKTOWY
			</div>

			<h1 style="margin:0; font-size:24px; line-height:1.3; color:#292724; font-weight:700;">
				Nowa wiadomość kontaktowa
			</h1>

			<p style="margin:10px 0 0; font-size:14px; line-height:1.6; color:#716b64;">
				Na stronie BistroMapy przesłano nową wiadomość.
			</p>
		</div>

		<!-- Content -->
		<div style="padding:32px;">
			<!-- Sender -->
			<div style="margin-bottom:24px;">
				<div style="margin-bottom:8px; font-size:11px; font-weight:bold; letter-spacing:1.5px; color:#8a847c; text-transform:uppercase;">
					Adres nadawcy
				</div>

				<div style="padding:14px 16px; background:#faf9f7; border:1px solid #eee9e2; border-radius:8px;">
					<a
						href="mailto:${senderEmail}"
						style="font-size:14px; color:#e87522; text-decoration:none; font-weight:600;"
					>
						${senderEmail}
					</a>
				</div>
			</div>

			<!-- Message -->
			<div>
				<div style="margin-bottom:8px; font-size:11px; font-weight:bold; letter-spacing:1.5px; color:#8a847c; text-transform:uppercase;">
					Treść wiadomości
				</div>

				<div style="padding:20px; background:#ffffff; border:1px solid #e9e4dc; border-radius:10px;">
					<p style="margin:0; font-size:15px; line-height:1.8; color:#4f4a44; white-space:pre-wrap;">
						${description}
					</p>
				</div>
			</div>

			<!-- Quick action -->
			<div style="margin-top:26px; text-align:center;">
				<a
					href="mailto:${senderEmail}"
					style="display:inline-block; padding:12px 24px; background:#e87522; color:#ffffff; text-decoration:none; font-size:12px; font-weight:bold; letter-spacing:1px; border-radius:8px;"
				>
					ODPOWIEDZ NADAWCY
				</a>
			</div>
		</div>

		<!-- Footer -->
		<div style="padding:22px 32px; background:#faf9f7; border-top:1px solid #eee9e2;">
			<p style="margin:0; font-size:12px; line-height:1.6; color:#8a847c; text-align:center;">
				Automatyczne powiadomienie z formularza kontaktowego BistroMapy.
				<br>
				© BistroMapa
			</p>
		</div>

	</div>
</div>
			`,
		})

		await logger.info(`Wysłano wiadomość kontaktową od użytkownika ${senderEmail} przez Resend`)
		return true
	} catch (error: any) {
		await logger.error(`Błąd podczas wysyłania wiadomości kontaktowej od ${senderEmail}`, error.message || error)
		return false
	}
}