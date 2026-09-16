import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator'

export class SendEmailDto {
	@IsString()
	leadId: string

	@IsString()
	templateKey: string

	@IsOptional()
	@IsEmail({}, { message: 'Podaj poprawny adres email' })
	to?: string

	@IsOptional()
	@IsString()
	@MaxLength(300)
	subject?: string

	@IsOptional()
	@IsString()
	@MaxLength(10000)
	body?: string
}

export class UpdateTemplateDto {
	@IsString()
	@MaxLength(300)
	subject: string

	@IsString()
	@MaxLength(10000)
	body: string
}
