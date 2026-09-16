import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { parse } from 'csv-parse/sync'
import { read, utils } from 'xlsx'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { DedupService } from '../leads/dedup.service'
import {
	detectMapping,
	IMPORT_TARGET_FIELDS,
	type ImportCommitResult,
	type ImportPreview,
	type ImportRow,
	type ImportTargetField,
	type RowIssue,
} from './import.types'

/** Ile wierszy sprawdzamy pod kątem duplikatów w podglądzie (żeby nie zamulić bazy). */
const DUPLICATE_CHECK_LIMIT = 500
const SAMPLE_SIZE = 20

export interface ImportCommitInput {
	importId: string
	mapping: Record<string, string | null>
	/** false = pomiń duplikaty (domyślnie), true = dodaj mimo wszystko. */
	force?: boolean
	source?: string
}

interface StoredImport {
	rows: ImportRow[]
	createdAt: number
}

/** Podgląd trzyma sparsowane wiersze w pamięci, żeby nie puszczać ich przez przeglądarkę. */
const IMPORT_TTL_MS = 30 * 60 * 1000

@Injectable()
export class ImportService {
	private readonly logger = new Logger(ImportService.name)
	private readonly stored = new Map<string, StoredImport>()

	constructor(
		private readonly prisma: PrismaService,
		private readonly dedup: DedupService,
		private readonly audit: AuditService,
	) {}

	/** Krok 1-2 readme §15: odczyt pliku + wykrycie kolumn. Nic nie zapisujemy. */
	async preview(file: Express.Multer.File | undefined): Promise<ImportPreview> {
		if (!file) throw new BadRequestException('Nie przesłano pliku')

		const rows = this.parseFile(file)
		if (rows.length === 0) throw new BadRequestException('Plik nie zawiera danych')

		this.dropExpired()

		const importId = randomUUID()
		this.stored.set(importId, { rows, createdAt: Date.now() })

		const headers = Object.keys(rows[0])
		const mapping = detectMapping(headers)

		const issues: RowIssue[] = []
		let validRows = 0

		rows.forEach((row, index) => {
			const errors = this.validateRow(row, mapping)
			if (errors.length > 0) {
				issues.push({ row: index + 1, errors })
			} else {
				validRows++
			}
		})

		const duplicates = await this.findDuplicates(rows.slice(0, DUPLICATE_CHECK_LIMIT), mapping)

		return {
			importId,
			headers,
			mapping,
			totalRows: rows.length,
			sampleRows: rows.slice(0, SAMPLE_SIZE),
			validRows,
			issues: issues.slice(0, 200),
			duplicates,
			truncated: rows.length > DUPLICATE_CHECK_LIMIT,
		}
	}

	/** Krok 7-8: zapis dopiero po potwierdzeniu użytkownika. */
	async commit(input: ImportCommitInput, adminUserId: string, ip?: string): Promise<ImportCommitResult> {
		this.dropExpired()

		const stored = this.stored.get(input.importId)
		if (!stored) {
			throw new BadRequestException('Sesja importu wygasła — wgraj plik ponownie')
		}

		const mapping = this.normalizeMapping(input.mapping)
		const rows = stored.rows

		await this.audit.log({
			action: 'IMPORT_STARTED',
			adminUserId,
			ip,
			details: { rows: rows.length, force: input.force === true },
		})

		let created = 0
		let skipped = 0
		let failed = 0

		for (const row of rows) {
			const errors = this.validateRow(row, mapping)
			if (errors.length > 0) {
				failed++
				continue
			}

			const data = this.mapRow(row, mapping)

			if (input.force !== true) {
				const duplicates = await this.dedup.findDuplicates({
					name: data.name,
					city: data.city,
					phone: data.phone,
					email: data.email,
					website: data.website,
					nip: data.nip,
				})

				if (duplicates.length > 0) {
					skipped++
					continue
				}
			}

			try {
				await this.prisma.lead.create({
					data: { ...data, source: input.source ?? 'CSV' },
				})
				created++
			} catch (error) {
				this.logger.warn(`Wiersz odrzucony: ${error instanceof Error ? error.message : String(error)}`)
				failed++
			}
		}

		this.stored.delete(input.importId)

		await this.audit.log({
			action: 'IMPORT_FINISHED',
			adminUserId,
			ip,
			details: { created, skipped, failed, rows: rows.length },
		})

		return { created, skipped, failed }
	}

	private dropExpired(): void {
		const now = Date.now()

		for (const [key, value] of this.stored) {
			if (now - value.createdAt > IMPORT_TTL_MS) this.stored.delete(key)
		}
	}

	private parseFile(file: Express.Multer.File): ImportRow[] {
		const name = file.originalname.toLowerCase()

		if (name.endsWith('.csv') || file.mimetype.includes('csv')) {
			return parse(file.buffer, {
				columns: true,
				skip_empty_lines: true,
				trim: true,
				bom: true,
				relax_column_count: true,
			}) as ImportRow[]
		}

		if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
			const workbook = read(file.buffer, { type: 'buffer' })
			const sheet = workbook.Sheets[workbook.SheetNames[0]]
			if (!sheet) throw new BadRequestException('Arkusz jest pusty')

			return utils.sheet_to_json<ImportRow>(sheet, { defval: '', raw: false })
		}

		throw new BadRequestException('Obsługiwane formaty: CSV, XLSX')
	}

	private normalizeMapping(mapping: Record<string, string | null>): Record<ImportTargetField, string | null> {
		const normalized = {} as Record<ImportTargetField, string | null>

		for (const field of IMPORT_TARGET_FIELDS) {
			const column = mapping[field] ?? null
			normalized[field] = column && column.trim() !== '' ? column : null
		}

		return normalized
	}

	private validateRow(row: ImportRow, mapping: Record<ImportTargetField, string | null>): string[] {
		const errors: string[] = []
		const value = (field: ImportTargetField): string => {
			const column = mapping[field]
			return column ? String(row[column] ?? '').trim() : ''
		}

		if (!value('name')) errors.push('brak nazwy')
		if (!value('city')) errors.push('brak miasta')

		const email = value('email')
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('nieprawidłowy email')

		const phone = value('phone')
		if (phone && phone.replace(/\D/g, '').length < 9) errors.push('nieprawidłowy telefon')

		return errors
	}

	private mapRow(row: ImportRow, mapping: Record<ImportTargetField, string | null>) {
		const pick = (field: ImportTargetField): string | null => {
			const column = mapping[field]
			const value = column ? String(row[column] ?? '').trim() : ''

			return value === '' ? null : value
		}

		return {
			name: pick('name') ?? '',
			city: pick('city') ?? '',
			address: pick('address'),
			phone: pick('phone'),
			email: pick('email'),
			website: pick('website'),
			nip: pick('nip'),
			category: pick('category'),
			contactPerson: pick('contactPerson'),
			notes: pick('notes'),
		}
	}

	private async findDuplicates(rows: ImportRow[], mapping: Record<ImportTargetField, string | null>) {
		const duplicates: ImportPreview['duplicates'] = []

		for (const [index, row] of rows.entries()) {
			const data = this.mapRow(row, mapping)
			if (!data.name || !data.city) continue

			const matches = await this.dedup.findDuplicates({
				name: data.name,
				city: data.city,
				phone: data.phone,
				email: data.email,
				website: data.website,
				nip: data.nip,
			})

			for (const match of matches) {
				duplicates.push({
					row: index + 1,
					name: data.name,
					city: data.city,
					duplicateOf: match.name,
					reasons: match.reasons,
				})
			}
		}

		return duplicates.slice(0, 200)
	}
}
