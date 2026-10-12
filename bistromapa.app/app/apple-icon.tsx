import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
					fontSize: 120,
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
