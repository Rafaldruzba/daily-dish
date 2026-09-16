import { IsString, MinLength } from 'class-validator'

export class ChangePasswordDto {
	@IsString()
	@MinLength(8, { message: 'Obecne hasło musi mieć co najmniej 8 znaków' })
	currentPassword: string

	@IsString()
	@MinLength(12, { message: 'Nowe hasło musi mieć co najmniej 12 znaków' })
	newPassword: string
}
