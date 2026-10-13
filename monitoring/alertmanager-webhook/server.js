import express from 'express'
import { Resend } from 'resend'

const app = express()
const PORT = process.env.PORT || 9095

// Konfiguracja Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO
const ALERT_EMAIL_FROM = process.env.ALERT_EMAIL_FROM

const resend = new Resend(RESEND_API_KEY)

app.use(express.json())

app.get('/health', (req, res) => {
	res.json({ status: 'ok', service: 'alertmanager-webhook' })
})

// Endpoint dla Alertmanager
app.post('/alert', async (req, res) => {
	try {
		const { alerts } = req.body

		if (!alerts || alerts.length === 0) {
			return res.status(200).json({ message: 'No alerts received' })
		}

		console.log(`[Alertmanager] Received ${alerts.length} alert(s)`)

		// Grupuj alerty według statusu
		const firing = alerts.filter((a) => a.status === 'firing')
		const resolved = alerts.filter((a) => a.status === 'resolved')

		// Wyślij email tylko dla firing alerts (możesz zmienić na both)
		if (firing.length > 0) {
			const subject = `🚨 BistroMapa Alert: ${firing.length} problem(s) detected`
			const html = generateAlertEmail(firing, resolved)

			await resend.emails.send({
				from: ALERT_EMAIL_FROM,
				to: ALERT_EMAIL_TO,
				subject,
				html,
			})

			console.log(`[Alertmanager] Email sent: ${subject}`)
		}

		// Opcjonalnie: wyślij też resolved
		if (resolved.length > 0) {
			const subject = `✅ BistroMapa Alert: ${resolved.length} problem(s) resolved`
			const html = generateAlertEmail([], resolved)

			await resend.emails.send({
				from: ALERT_EMAIL_FROM,
				to: ALERT_EMAIL_TO,
				subject,
				html,
			})

			console.log(`[Alertmanager] Resolved email sent: ${subject}`)
		}

		res.status(200).json({ message: 'Alerts processed' })
	} catch (error) {
		console.error('[Alertmanager] Error processing alerts:', error)
		res.status(500).json({ error: 'Failed to process alerts' })
	}
})

function generateAlertEmail(firing, resolved) {
	let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #fff; border-left: 4px solid #e74c3c; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .alert.resolved { border-left-color: #27ae60; }
        .alert-title { font-weight: 600; font-size: 16px; margin-bottom: 8px; }
        .alert-severity { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin-right: 8px; }
        .severity-critical { background: #e74c3c; color: white; }
        .severity-warning { background: #f39c12; color: white; }
        .alert-description { color: #666; margin: 8px 0; }
        .alert-labels { font-size: 13px; color: #888; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚨 BistroMapa Monitoring Alert</h1>
  `

	if (firing.length > 0) {
		html += `<h2>Firing Alerts (${firing.length})</h2>`
		firing.forEach((alert) => {
			const severity = alert.labels.severity || 'warning'
			const alertname = alert.labels.alertname || 'Unknown'
			const instance = alert.labels.instance || 'N/A'
			const description = alert.annotations.description || alert.annotations.summary || 'No description'

			html += `
        <div class="alert">
          <div class="alert-title">
            <span class="alert-severity severity-${severity}">${severity.toUpperCase()}</span>
            ${alertname}
          </div>
          <div class="alert-description">${description}</div>
          <div class="alert-labels">
            <strong>Instance:</strong> ${instance}<br>
            <strong>Started:</strong> ${new Date(alert.startsAt).toLocaleString('pl-PL')}
          </div>
        </div>
      `
		})
	}

	if (resolved.length > 0) {
		html += `<h2 style="color: #27ae60;">✅ Resolved Alerts (${resolved.length})</h2>`
		resolved.forEach((alert) => {
			const alertname = alert.labels.alertname || 'Unknown'
			const instance = alert.labels.instance || 'N/A'

			html += `
        <div class="alert resolved">
          <div class="alert-title">${alertname}</div>
          <div class="alert-labels">
            <strong>Instance:</strong> ${instance}<br>
            <strong>Resolved:</strong> ${new Date(alert.endsAt).toLocaleString('pl-PL')}
          </div>
        </div>
      `
		})
	}

	html += `
        <div class="footer">
          <p>Ten email został wysłany automatycznie przez system monitoringu BistroMapa.</p>
          <p>Dashboard: <a href="http://localhost:3002">Grafana</a> | <a href="http://localhost:9090">Prometheus</a> | <a href="http://localhost:9093">Alertmanager</a></p>
        </div>
      </div>
    </body>
    </html>
  `

	return html
}

app.listen(PORT, () => {
	console.log(`🚀 Alertmanager Webhook running on http://localhost:${PORT}`)
	console.log(`📧 Alerts will be sent to: ${ALERT_EMAIL_TO}`)
})
