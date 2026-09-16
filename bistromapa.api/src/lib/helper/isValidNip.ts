export function isValidNip(nip: string): boolean {
	if (!nip) return false

	// Usuń ewentualne myślniki lub spacje, jeśli użytkownik je wpisał
	const cleanNip = nip.replace(/[\s-]/g, '')

	// NIP musi składać się dokładnie z 10 cyfr
	if (!/^[0-9]{10}$/.test(cleanNip)) return false

	// Wagi dla poszczególnych cyfr NIP
	const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
	let sum = 0

	for (let i = 0; i < 9; i++) {
		sum += parseInt(cleanNip[i], 10) * weights[i]
	}

	const controlNum = sum % 11
	const lastDigit = parseInt(cleanNip[9], 10)

	// Jeśli reszta z dzielenia wynosi 10, taki NIP jest niepoprawny (zasada algorytmu NIP)
	return controlNum === 10 ? false : controlNum === lastDigit
}
