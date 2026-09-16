import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CheckDuplicatesDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	name: string

	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	city: string

	@IsOptional()
	@IsString()
	@MaxLength(40)
	phone?: string

	@IsOptional()
	@IsString()
	@MaxLength(200)
	email?: string

	@IsOptional()
	@IsString()
	@MaxLength(300)
	website?: string

	@IsOptional()
	@IsString()
	@MaxLength(20)
	nip?: string
}
