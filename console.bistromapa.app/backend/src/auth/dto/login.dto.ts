import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
	@IsEmail({}, { message: 'Podaj poprawny adres email' })
	email: string

	@IsString()
	@MinLength(8, { message: 'Hasło musi mieć co najmniej 8 znaków' })
	password: string
}
