import nodemailer from 'nodemailer'
import logger from './logger.service.js'

const gmailUser = (process.env.GMAIL_USER || 'app.bistromapa@gmail.com').trim()
const gmailPass = (process.env.GMAIL_PASS || '').trim()


const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: gmailUser,
		pass: gmailPass,
	},
})

/**
 * Wysyła jednorazowy kod weryfikacyjny na podany adres e-mail.
 */
export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
	try {
		const mailOptions = {
			from: `"Bistromapa" <${gmailUser}>`,
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
		}

		await transporter.sendMail(mailOptions)
		await logger.info(`Wysłano kod weryfikacyjny do użytkownika ${email}`)
		return true
	} catch (error: any) {
		await logger.error(`Błąd podczas wysyłania maila do ${email}`, error.message || error)
		return false
	}
}
