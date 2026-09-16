import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/** Endpoint dostępny bez sesji (tylko logowanie). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
