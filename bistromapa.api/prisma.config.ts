/// <reference types="node" />
import 'dotenv/config'

import { defineConfig } from 'prisma/config'

const databaseUrl = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder'

if (!databaseUrl) {
	throw new Error('DATABASE_URL is missing in environment variables')
}

export default defineConfig({
	schema: 'prisma/schema.prisma',

	migrations: {
		path: 'prisma/migrations',
		seed: 'tsx prisma/seed.ts',
	},

	datasource: {
		url: databaseUrl,
	},
})
