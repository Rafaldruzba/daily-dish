import { ImageResponse } from 'next/og'

// Ikona aplikacji (favicon + wpis w manifeście). Pełne czarne tło, żeby ten sam
// plik działał też jako ikona maskowalna na Androidzie.
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					background: '#0c0c0c',
					color: '#ffffff',
					fontSize: 340,
					fontWeight: 900,
					fontFamily: 'sans-serif',
					letterSpacing: '-0.04em',
				}}>
				B
			</div>
		),
		size,
	)
}
