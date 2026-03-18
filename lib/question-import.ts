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
	console.log('[normalizeOptions] Input:', {
		rawOptions,
		rawOptionsType: typeof rawOptions,
		isArray: Array.isArray(rawOptions),
		fallbackText,
	})

	if (Array.isArray(rawOptions)) {
		// Handle objects with .text field (like { label: "A", text: "Option text" })
		const asString = rawOptions
			.map((item, idx) => {
				console.log(`[normalizeOptions] Processing item ${idx}:`, item, 'Type:', typeof item)
				
				if (typeof item === 'string') {
					const trimmed = item.trim()
					console.log(`[normalizeOptions] Item ${idx} is string: "${trimmed}"`)
					return trimmed
				}
				
				if (typeof item === 'object' && item !== null && 'text' in item) {
					const itemObj = item as Record<string, unknown>
					const text = String(itemObj.text).trim()
					console.log(`[normalizeOptions] Item ${idx} is object with text: "${text}"`)
					return text
				}
				
				console.log(`[normalizeOptions] Item ${idx} skipped - no match`)
				return null
			})
			.filter((item) => item && item.length > 0) as string[]

		console.log('[normalizeOptions] After extraction:', asString)

		if (asString.length > 1) {
			console.log('[normalizeOptions] Returning extracted strings (length > 1)')
			return asString
		}

		if (asString.length === 1) {
			const split = splitInlineOptions(asString[0])
			if (split.length > 0) {
				console.log('[normalizeOptions] Returning split inline options:', split)
				return split
			}
			console.log('[normalizeOptions] Returning single string (no split)')
			return asString
		}
	}

	if (fallbackText) {
		const splitFromText = splitInlineOptions(fallbackText)
		if (splitFromText.length > 0) {
			console.log('[normalizeOptions] Returning split from fallback text:', splitFromText)
			return splitFromText
		}
	}

	console.log('[normalizeOptions] Returning empty array')
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

	console.log('[normalizeRawQuestion] Processing:', {
		q_id: qId,
		title,
		q_type: raw.q_type,
		hasOptions: !!raw.options,
		optionsType: typeof raw.options,
		isOptionsArray: Array.isArray(raw.options),
	})

	const normalized_options = normalizeOptions(raw.options, text)
	
	console.log('[normalizeRawQuestion] Result:', {
		q_id: qId,
		title,
		q_type: raw.q_type,
		optionsFinal: normalized_options,
		optionCount: normalized_options.length,
	})

	return {
		q_id: qId,
		q_type: normalizeQuestionType(raw.q_type),
		paper: cleanText(raw.paper),
		part: cleanText(raw.part),
		section: cleanText(raw.section),
		title,
		text,
		case_scenario: cleanText(raw.case_scenario),
		options_json: normalized_options,
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
		console.log('[normalizeQuestionPayload] Payload is not array:', typeof payload)
		return { valid: [], invalidCount: 0 }
	}

	console.log('[normalizeQuestionPayload] Starting import of', payload.length, 'items')

	const valid: NormalizedQuestion[] = []
	let invalidCount = 0

	for (let i = 0; i < payload.length; i++) {
		const item = payload[i] as RawQuestion
		console.log(`[normalizeQuestionPayload] Processing item ${i}:`, {
			q_id: item.q_id,
			q_type: item.q_type,
			hasOptions: !!item.options,
		})
		
		const normalized = normalizeRawQuestion(item)
		if (!normalized) {
			console.log(`[normalizeQuestionPayload] Item ${i} invalid - skipped`)
			invalidCount += 1
			continue
		}
		
		console.log(`[normalizeQuestionPayload] Item ${i} valid - options: ${normalized.options_json.length}`)
		valid.push(normalized)
	}

	console.log('[normalizeQuestionPayload] Import complete:', {
		validCount: valid.length,
		invalidCount,
		totalProcessed: payload.length,
	})

	return { valid, invalidCount }
}
