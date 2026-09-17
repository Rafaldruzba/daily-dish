import { IsString, MinLength } from 'class-validator'

export class ActivateAccountDto {
	@IsString()
	@MinLength(12, { message: 'Hasło musi mieć co najmniej 12 znaków' })
	password: string
}
