export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className='min-h-screen flex flex-col items-center justify-center bg-stone-50'>
			<div className='w-full max-w-md px-4'>
				<a href='/' className='flex items-center justify-center gap-2 mb-8 group'>
					<img src='/bistro-logo.png' alt='Bistro Mapa' className='w-10 h-10' />
					<span className='font-mono text-lg font-black tracking-widest text-stone-900 group-hover:text-stone-700 transition-colors'>
						BISTRO MAPA
					</span>
				</a>
				{children}
			</div>
		</div>
	)
}
