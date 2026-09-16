import { IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

import { LEAD_SOURCES } from '../../common/domain.constants'

export class ImportCommitDto {
	/** Identyfikator z /import/preview — serwer ma już sparsowane wiersze. */
	@IsString()
	@IsNotEmpty()
	importId: string

	/** Mapowanie kolumna źródłowa → pole docelowe (może być poprawione przez użytkownika). */
	@IsObject()
	mapping: Record<string, string | null>

	/** Domyślnie pomijamy duplikaty — nigdy nie tworzymy ich po cichu (readme §16). */
	@IsOptional()
	@IsBoolean()
	force?: boolean

	@IsOptional()
	@IsIn(LEAD_SOURCES)
	source?: string
}
