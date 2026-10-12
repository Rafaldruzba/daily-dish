import { ImageResponse } from 'next/og'

export const alt = 'BistroMapa — restauracje, menu dnia i opinie'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					background: '#0c0c0c',
					padding: '80px',
				}}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '160px',
							height: '160px',
							borderRadius: '36px',
							background: '#1c1917',
							color: '#fbbf24',
							fontSize: '110px',
							fontWeight: 900,
							fontFamily: 'sans-serif',
						}}>
						B
					</div>

					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<div
							style={{
								fontSize: '84px',
								fontWeight: 900,
								color: '#ffffff',
								fontFamily: 'sans-serif',
								letterSpacing: '-0.03em',
							}}>
							BistroMapa
						</div>
						<div
							style={{
								marginTop: '12px',
								fontSize: '34px',
								color: '#d6d3d1',
								fontFamily: 'sans-serif',
							}}>
							Restauracje, menu dnia i opinie w Twojej okolicy
						</div>
					</div>
				</div>

				<div
					style={{
						marginTop: '64px',
						width: '160px',
						height: '10px',
						background: '#f59e0b',
					}}
				/>
			</div>
		),
		size,
	)
}
