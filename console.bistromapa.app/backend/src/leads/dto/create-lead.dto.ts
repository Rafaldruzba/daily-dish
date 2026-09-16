import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

import { LEAD_SOURCES, type LeadSource } from '../../common/domain.constants'

export class CreateLeadDto {
	@IsString()
	@IsNotEmpty({ message: 'Nazwa restauracji jest wymagana' })
	@MaxLength(200)
	name: string

	@IsString()
	@IsNotEmpty({ message: 'Miasto jest wymagane' })
	@MaxLength(120)
	city: string

	@IsOptional()
	@IsString()
	@MaxLength(300)
	address?: string

	@IsOptional()
	@IsString()
	@MaxLength(40)
	phone?: string

	@IsOptional()
	@IsEmail({}, { message: 'Podaj poprawny adres email' })
	email?: string

	@IsOptional()
	@IsString()
	@MaxLength(300)
	website?: string

	@IsOptional()
	@IsString()
	@MaxLength(20)
	nip?: string

	@IsOptional()
	@IsString()
	@MaxLength(80)
	category?: string

	@IsOptional()
	@IsString()
	@MaxLength(160)
	contactPerson?: string

	@IsOptional()
	@IsIn(LEAD_SOURCES)
	source?: LeadSource

	@IsOptional()
	@IsString()
	@MaxLength(500)
	sourceUrl?: string

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	notes?: string

	/** Świadome "dodaj mimo wszystko" — pomija blokadę duplikatów (readme §16). */
	@IsOptional()
	@IsBoolean()
	force?: boolean
}
