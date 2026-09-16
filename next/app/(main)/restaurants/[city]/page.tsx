'use client'

export default async function Page({
	params,
}: {
	params: Promise<{
		miasto: string
	}>
}) {
	const { miasto } = await params

	// pobierasz odpowiednie dane z API

	return <p>to do</p>
}
