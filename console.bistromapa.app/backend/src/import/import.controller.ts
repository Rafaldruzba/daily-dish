import {
	Body,
	Controller,
	Post,
	Req,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'

import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import { Roles } from '../auth/roles.decorator'
import { ImportCommitDto } from './dto/import.dto'
import { ImportService } from './import.service'
import type { ImportCommitInput } from './import.service'

@Controller('import')
export class ImportController {
	constructor(private readonly importService: ImportService) {}

	/** Podgląd: parsowanie, mapowanie kolumn, walidacja, duplikaty. Bez zapisu. */
	@Post('preview')
	@UseInterceptors(FileInterceptor('file'))
	preview(@UploadedFile() file: Express.Multer.File) {
		return this.importService.preview(file)
	}

	@Post('commit')
	@Roles('ADMIN')
	commit(@Body() dto: ImportCommitDto, @CurrentUser() user: AuthUser, @Req() request: Request) {
		return this.importService.commit(dto as ImportCommitInput, user.id, request.ip)
	}
}
