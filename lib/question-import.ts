type RawSubQuestion = {
	label?: unknown
	text?: unknown
	options?: unknown
}

type RawTable = {
	caption?: unknown
	headers?: unknown
	rows?: unknown
}

export type RawQuestion = {
	num?: unknown
	q_id?: unknown
	subject?: unknown
	paper?: unknown
	part?: unknown
	q_type?: unknown
	section?: unknown
	title?: unknown
	text?: unknown
	options?: unknown
	sub_questions?: unknown
	tables?: unknown
	case_scenario?: unknown
}

export type NormalizedQuestion = {
	q_id: string
	q_type: string
	paper: string | null
	part: string | null
	section: string | null
	title: string
	text: string | null
	case_scenario: string | null
	options_json: string[]
	sub_questions_json: Array<{ label: string; text: string; options: string[] }>
	tables_json: Array<{ title: string; headers: string[]; rows: string[][] }>
	source_num: number | null
}

const OPTION_SPLIT_REGEX = /(?:^|\n)\s*(?:-|•)?\s*\(([A-Za-z])\)\s+/g

function cleanText(value: unknown): string | null {
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	return trimmed.length ? trimmed : null
}

function normalizeQuestionType(value: unknown): string {
	if (typeof value !== 'string') return 'descriptive'
	const normalized = value.trim().toLowerCase().replaceAll(' ', '_')
	const mapped: Record<string, string> = {
		independentmcq: 'independent_mcq',
		independent_mcq: 'independent_mcq',
		caseletmcq: 'caselet_mcq',
		caselet_mcq: 'caselet_mcq',
		case_scenario_mcq: 'case_scenario_mcq',
		case_scenario: 'case_scenario',
		descriptive: 'descriptive',
		mcq: 'mcq',
	}

	return mapped[normalized] || 'descriptive'
}

function splitInlineOptions(text: string): string[] {
	const parts = text
		.split(OPTION_SPLIT_REGEX)
		.map((chunk) => chunk.replaceAll(/\s+/g, ' ').trim())
		.filter((chunk) => chunk.length > 0)

	if (parts.length <= 1) return []

	const normalized: string[] = []
	for (let index = 0; index < parts.length; index += 2) {
		const label = parts[index]
		const optionText = parts[index + 1]
		if (!optionText) continue
		normalized.push(`${label.toUpperCase()}. ${optionText}`)
	}

	return normalized
}

function normalizeOptions(rawOptions: unknown, fallbackText: string | null): string[] {
	if (Array.isArray(rawOptions)) {
		const asString = rawOptions
			.filter((item) => typeof item === 'string')
			.map((item) => item.trim())
			.filter((item) => item.length > 0)

		if (asString.length > 1) return asString

		if (asString.length === 1) {
			const split = splitInlineOptions(asString[0])
			if (split.length > 0) return split
			return asString
		}
	}

	if (fallbackText) {
		const splitFromText = splitInlineOptions(fallbackText)
		if (splitFromText.length > 0) return splitFromText
	}

	return []
}

function normalizeSubQuestions(rawSubQuestions: unknown): Array<{ label: string; text: string; options: string[] }> {
	if (!Array.isArray(rawSubQuestions)) return []

	return rawSubQuestions
		.map((item) => {
			const row = item as RawSubQuestion
			return {
				label: cleanText(row.label) || '',
				text: cleanText(row.text) || '',
				options: normalizeOptions(row.options, cleanText(row.text)),
			}
		})
		.filter((item) => item.text.length > 0)
}

function normalizeTables(rawTables: unknown): Array<{ title: string; headers: string[]; rows: string[][] }> {
	if (!Array.isArray(rawTables)) return []

	return rawTables
		.map((item) => {
			const row = item as RawTable
			const headers = Array.isArray(row.headers)
				? row.headers.map((value) => String(value ?? '').trim())
				: []
			const rows = Array.isArray(row.rows)
				? row.rows.map((cells) => (Array.isArray(cells) ? cells.map((cell) => String(cell ?? '').trim()) : []))
				: []

			return {
				title: cleanText(row.caption) || '',
				headers,
				rows,
			}
		})
		.filter((table) => table.headers.length > 0 || table.rows.length > 0)
}

export function normalizeRawQuestion(raw: RawQuestion): NormalizedQuestion | null {
	const qId = cleanText(raw.q_id)
	if (!qId) return null

	const text = cleanText(raw.text)
	const title = cleanText(raw.title) || qId

	return {
		q_id: qId,
		q_type: normalizeQuestionType(raw.q_type),
		paper: cleanText(raw.paper),
		part: cleanText(raw.part),
		section: cleanText(raw.section),
		title,
		text,
		case_scenario: cleanText(raw.case_scenario),
		options_json: normalizeOptions(raw.options, text),
		sub_questions_json: normalizeSubQuestions(raw.sub_questions),
		tables_json: normalizeTables(raw.tables),
		source_num: typeof raw.num === 'number' && Number.isFinite(raw.num) ? raw.num : null,
	}
}

export function normalizeQuestionPayload(payload: unknown): {
	valid: NormalizedQuestion[]
	invalidCount: number
} {
	if (!Array.isArray(payload)) {
		return { valid: [], invalidCount: 0 }
	}

	const valid: NormalizedQuestion[] = []
	let invalidCount = 0

	for (const item of payload) {
		const normalized = normalizeRawQuestion(item as RawQuestion)
		if (!normalized) {
			invalidCount += 1
			continue
		}
		valid.push(normalized)
	}

	return { valid, invalidCount }
}
