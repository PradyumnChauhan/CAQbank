'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { loadStudentQuestionsAction } from '@/app/student/actions'

type Question = {
  id: string
  title: string
  text: string | null
  q_type: string
  options_json: (string | { label: string; text: string })[] | null
  case_scenario: string | null
  sub_questions_json: Array<{ label: string; text: string; options: string[] }> | null
}

type Subject = {
  id: string
  name: string
}

function getBookmarkKey(userId: string, questionId: string) {
  return `qbank:bookmarks:${userId}:${questionId}`
}

// Capitalize each word in a string
function capitalizeWords(str: string) {
  return str
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Parse markdown tables
function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null

  const headerLine = lines[0].trim()
  const separatorLine = lines[1].trim()

  // Check if it's a markdown table
  if (!headerLine.startsWith('|') || !separatorLine.startsWith('|')) return null
  if (!/^\|[\s\-:|]+\|$/.test(separatorLine)) return null

  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((h) => h)

  const rows = lines.slice(2).map((line) => {
    if (!line.trim().startsWith('|')) return []
    return line
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell)
  })

  return { headers, rows: rows.filter((r) => r.length > 0) }
}

// Render markdown table with pink styling
function renderMarkdownTable(headers: string[], rows: string[][]) {
  return (
    <div className="overflow-x-auto my-6 rounded-lg border-2 border-pink-200 shadow-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-pink-400 to-pink-500">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-6 py-4 text-left text-white font-bold text-sm uppercase tracking-wide border-2 border-pink-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={`${
                rIdx % 2 === 0 ? 'bg-pink-50' : 'bg-white'
              } hover:bg-pink-100 transition-colors border-b border-pink-200`}
            >
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className="px-6 py-4 text-gray-800 font-medium text-sm border border-pink-200"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Detect and parse balance sheet data
function detectAndParseBalanceSheet(lines: string[]): { title: string; currency: string; sections: Array<{ name: string; rows: Array<{ label: string; amount: string; indent: number }> }> } | null {
  // Look for balance sheet title pattern - can be "Balance Sheet", "Financial summary", or start directly with "EQUITY & LIABILITIES"
  let startIdx = -1
  let titleLine = ''
  let currencyLine = ''
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    
    // Look for actual balance sheet start markers
    if (trimmed === 'EQUITY & LIABILITIES' || trimmed === 'ASSETS') {
      startIdx = i
      
      // Search backwards for title/currency info
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prevTrimmed = lines[j].trim()
        if (prevTrimmed.includes('Balance Sheet') || prevTrimmed.includes('Financial summary') || prevTrimmed.includes('crores')) {
          if (!titleLine) titleLine = prevTrimmed
          if (!currencyLine && prevTrimmed.includes('crores')) {
            currencyLine = prevTrimmed
          }
        }
      }
      
      if (titleLine || currencyLine) {
        break
      }
    }
  }
  
  if (startIdx === -1) return null
  
  // If no explicit title found, extract from earlier lines or use default
  if (!titleLine) {
    for (let j = startIdx - 1; j >= Math.max(0, startIdx - 10); j--) {
      const prevTrimmed = lines[j].trim()
      if (prevTrimmed && prevTrimmed.length > 0 && !prevTrimmed.includes('EQUITY') && !prevTrimmed.includes('ASSETS')) {
        titleLine = prevTrimmed
        break
      }
    }
  }
  if (!currencyLine) currencyLine = '₹ in crores'
  
  const sections: Array<{ name: string; rows: Array<{ label: string; amount: string; indent: number }> }> = []
  let currentSectionName = ''
  let currentSectionRows: Array<{ label: string; amount: string; indent: number }> = []
  
  // Parse from the EQUITY & LIABILITIES line onwards
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    if (!trimmed) continue
    
    // Stop if we hit narrative content (long text without numbers)
    if (trimmed.length > 80 && !trimmed.match(/[\d,\(\)\-]+/) && !trimmed.match(/^[A-Z\s&]+$/)) break
    
    // Check if this is a section header (ALL CAPS, no trailing numbers)
    if (/^[A-Z\s&]+$/.test(trimmed) && trimmed.length > 3) {
      // Save previous section
      if (currentSectionName && currentSectionRows.length > 0) {
        sections.push({ name: currentSectionName, rows: currentSectionRows })
      }
      currentSectionName = trimmed
      currentSectionRows = []
      continue
    }
    
    // Check if it's a data row (contains numbers, may have negative in parentheses)
    const numberMatch = trimmed.match(/[\d,\(\)\-]+\s*$/)
    if (numberMatch && currentSectionName) {
      // Calculate indent based on leading spaces
      const indent = line.search(/\S/) / 2
      
      // Extract label and amount - handle both 1,200 and (1,500) formats
      const parts = trimmed.match(/^(.*?)\s+([\d,\(\)\-]+)\s*$/)
      if (parts) {
        currentSectionRows.push({
          label: parts[1].trim(),
          amount: parts[2].trim(),
          indent: indent
        })
      }
    }
  }
  
  // Save last section
  if (currentSectionName && currentSectionRows.length > 0) {
    sections.push({ name: currentSectionName, rows: currentSectionRows })
  }
  
  if (sections.length > 0) {
    return { title: titleLine || 'Balance Sheet', currency: currencyLine, sections }
  }
  
  return null
}

// Detect and parse simple data list tables (like "Inventory Breakdown", "Financial Data")
function detectAndParseDataList(lines: string[]): { title: string; rows: Array<{ label: string; value: string }> } | null {
  let startIdx = -1
  let titleLine = ''
  
  // Look for patterns like "Inventory Breakdown", "Sales Data", "Financial Data", etc.
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (/^[A-Za-z\s&\-]+\s*\(/.test(trimmed) && (trimmed.includes('crores') || trimmed.includes('₹'))) {
      startIdx = i
      titleLine = trimmed
      break
    }
  }
  
  if (startIdx === -1) return null
  
  const rows: Array<{ label: string; value: string }> = []
  
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    if (!trimmed) break
    
    // Match patterns like "Raw Materials: 400" or "Total sales invoices issued: 15,000"
    const match = trimmed.match(/^([^:]+):\s*(.+?)$/)
    if (match) {
      rows.push({
        label: match[1].trim(),
        value: match[2].trim()
      })
    } else if (/^[A-Z\s&]+$/.test(trimmed)) {
      // Stop at next section header
      break
    }
  }
  
  if (rows.length > 0) {
    return { title: titleLine, rows }
  }
  
  return null
}

// Render balance sheet as a professional table
function renderBalanceSheet(data: { title: string; currency: string; sections: Array<{ name: string; rows: Array<{ label: string; amount: string; indent: number }> }> }) {
  return (
    <div className="space-y-6 my-6">
      {/* Balance Sheet Header */}
      <div className="text-center space-y-1 mb-6">
        <h4 className="text-lg font-bold text-gray-900">{data.title}</h4>
        <p className="text-sm text-gray-600 font-medium">{data.currency}</p>
      </div>
      
      {/* Sections as separate tables */}
      {data.sections.map((section, secIdx) => (
        <div key={secIdx} className="overflow-x-auto rounded-lg border-2 border-blue-200 shadow-lg">
          <table className="w-full border-collapse">
            {/* Section Header */}
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-blue-600">
                <th colSpan={2} className="px-6 py-4 text-left text-white font-bold text-sm uppercase tracking-wide border border-blue-600">
                  {section.name}
                </th>
              </tr>
            </thead>
            
            {/* Section Rows */}
            <tbody>
              {section.rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`${rowIdx % 2 === 0 ? 'bg-blue-50' : 'bg-white'} hover:bg-blue-100 transition-colors border-b border-blue-200`}
                >
                  {/* Label column with indentation */}
                  <td className={`px-6 py-3 text-gray-800 font-medium text-sm border border-blue-200 ${row.indent > 1 ? 'pl-12' : ''}`}>
                    {row.label}
                  </td>
                  
                  {/* Amount column - right aligned */}
                  <td className="px-6 py-3 text-gray-900 font-bold text-sm border border-blue-200 text-right w-32">
                    {row.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// Render simple data list as a professional table
function renderDataList(data: { title: string; rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="space-y-4 my-6">
      {/* Data List Header */}
      <div className="space-y-1 mb-4">
        <h4 className="text-base font-bold text-gray-900">{data.title}</h4>
      </div>
      
      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border-2 border-emerald-200 shadow-lg">
        <table className="w-full border-collapse">
          <tbody>
            {data.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`${rowIdx % 2 === 0 ? 'bg-emerald-50' : 'bg-white'} hover:bg-emerald-100 transition-colors border-b border-emerald-200`}
              >
                {/* Label column */}
                <td className="px-6 py-3 text-gray-800 font-semibold text-sm border border-emerald-200">
                  {row.label}
                </td>
                
                {/* Value column - right aligned if numeric */}
                <td className={`px-6 py-3 text-gray-900 font-bold text-sm border border-emerald-200 ${/^[\d,\%\(\)\-]+$/.test(row.value) ? 'text-right' : ''}`}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Parse markdown-like text and format it properly
function parseQuestionText(text: string) {
  if (!text) return null

  const lines = text.split('\n')
  
  // First, try to detect balance sheet
  const balanceSheetData = detectAndParseBalanceSheet(lines)
  
  // Then try to detect data lists (only if not a balance sheet section)
  const dataListData = !balanceSheetData ? detectAndParseDataList(lines) : null
  
  const sections: Array<{ type: 'narrative' | 'table' | 'balance-sheet' | 'data-list'; content: string[] | { headers: string[]; rows: string[][] } | { title: string; currency: string; sections: Array<{ name: string; rows: Array<{ label: string; amount: string; indent: number }> }> } | { title: string; rows: Array<{ label: string; value: string }> } }> = []

  let currentNarrative: string[] = []
  let inBalanceSheet = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Track if we're in a balance sheet section
    if (balanceSheetData) {
      if (trimmed === 'EQUITY & LIABILITIES' || trimmed === 'ASSETS') {
        inBalanceSheet = true
      }
      
      // Skip balance sheet lines
      if (inBalanceSheet) {
        // Section headers
        if (/^[A-Z\s&]+$/.test(trimmed) && trimmed.length > 3) continue
        
        // Data rows with amounts
        if (/[\d,\(\)\-]+\s*$/.test(trimmed) && trimmed.includes('  ')) continue
        
        // TOTAL rows
        if (/^TOTAL\s+/.test(trimmed)) continue
        
        // Stop tracking balance sheet after we see narrative content
        if (trimmed.length > 80 && !trimmed.match(/[\d,\(\)\-]+/) && !trimmed.match(/^[A-Z\s&]+$/)) {
          inBalanceSheet = false
        } else if (/^[a-z]/.test(trimmed) && trimmed.length > 20) {
          inBalanceSheet = false
        }
      }
    }
    
    // Skip if still in balance sheet
    if (inBalanceSheet) continue
    
    // Skip data list lines if already parsed
    if (dataListData) {
      if (trimmed.includes(dataListData.title) ||
          /^[A-Za-z\s&\-]+\s*\(/.test(trimmed) ||
          trimmed.match(/^([^:]+):\s*(.+?)$/)) {
        continue
      }
    }

    // Check if this line starts a markdown table
    if (trimmed.startsWith('|') && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim()
      if (/^\|[\s\-:|]+\|$/.test(nextLine)) {
        // Found a table start
        if (currentNarrative.length > 0) {
          sections.push({ type: 'narrative', content: currentNarrative })
          currentNarrative = []
        }

        // Collect table lines
        const tableLines = [line, lines[i + 1]]
        i += 2
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i])
          i++
        }
        i-- // Back up one since the loop will increment

        const parsed = parseMarkdownTable(tableLines)
        if (parsed) {
          sections.push({ type: 'table', content: parsed })
        }
        continue
      }
    }

    currentNarrative.push(line)
  }

  if (currentNarrative.length > 0) {
    sections.push({ type: 'narrative', content: currentNarrative })
  }
  
  // Add financial tables first if detected
  if (balanceSheetData) {
    sections.unshift({ type: 'balance-sheet', content: balanceSheetData })
  }
  
  if (dataListData) {
    sections.unshift({ type: 'data-list', content: dataListData })
  }

  return (
    <div className="space-y-6">
      {sections.map((section, sIdx) => {
        if (section.type === 'balance-sheet') {
          const data = section.content as { title: string; currency: string; sections: Array<{ name: string; rows: Array<{ label: string; amount: string; indent: number }> }> }
          return <div key={sIdx}>{renderBalanceSheet(data)}</div>
        }
        
        if (section.type === 'data-list') {
          const data = section.content as { title: string; rows: Array<{ label: string; value: string }> }
          return <div key={sIdx}>{renderDataList(data)}</div>
        }
        
        if (section.type === 'table') {
          const { headers, rows } = section.content as { headers: string[]; rows: string[][] }
          return <div key={sIdx}>{renderMarkdownTable(headers, rows)}</div>
        }

        // Narrative section
        return (
          <div key={sIdx} className="space-y-4">
            {(section.content as string[]).map((text, tIdx) => {
              const trimmed = text.trim()

              // Check for headers
              if (/^#{3,4}\s/.test(trimmed)) {
                const headerText = trimmed.replace(/^#{3,4}\s/, '')
                return (
                  <h3 key={tIdx} className="text-lg font-bold text-gray-900 mt-4 mb-2 pt-3 border-t border-gray-200">
                    {renderInlineMarkdown(headerText)}
                  </h3>
                )
              }

              // Bullet points
              if (/^[-•*]\s/.test(trimmed)) {
                return (
                  <div key={tIdx} className="flex gap-3">
                    <span className="text-primary font-semibold mt-1">•</span>
                    <p className="text-gray-700 leading-relaxed flex-1">{renderInlineMarkdown(trimmed.replace(/^[-•*]\s/, ''))}</p>
                  </div>
                )
              }

              // Numbered list
              if (/^\d+\.\s/.test(trimmed)) {
                return (
                  <div key={tIdx} className="flex gap-3">
                    <span className="text-primary font-semibold min-w-fit">{trimmed.match(/^\d+\./)?.[0]}</span>
                    <p className="text-gray-700 leading-relaxed">{renderInlineMarkdown(trimmed.replace(/^\d+\.\s/, ''))}</p>
                  </div>
                )
              }

              // Regular narrative text
              if (trimmed) {
                return (
                  <p key={tIdx} className="text-gray-700 leading-relaxed text-base font-medium">
                    {renderInlineMarkdown(trimmed)}
                  </p>
                )
              }

              return null
            })}
          </div>
        )
      })}
    </div>
  )
}

// Render inline markdown elements (bold, code, superscript)
function renderInlineMarkdown(text: string): (string | ReactNode)[] {
  const parts: (string | ReactNode)[] = []
  let lastIndex = 0
  
  // Handle **bold** text
  const boldRegex = /\*\*([^*]+)\*\*/g
  let match
  const boldMatches = []
  while ((match = boldRegex.exec(text)) !== null) {
    boldMatches.push({ start: match.index, end: boldRegex.lastIndex, text: match[1] })
  }
  
  // Handle `code` text
  const codeRegex = /`([^`]+)`/g
  const codeMatches = []
  while ((match = codeRegex.exec(text)) !== null) {
    codeMatches.push({ start: match.index, end: codeRegex.lastIndex, text: match[1] })
  }
  
  // Merge and sort matches
  const allMatches = [...boldMatches.map(m => ({ ...m, type: 'bold' })), ...codeMatches.map(m => ({ ...m, type: 'code' }))]
    .sort((a, b) => a.start - b.start)
  
  if (allMatches.length === 0) {
    return [text]
  }
  
  allMatches.forEach((match) => {
    // Add text before this match
    if (lastIndex < match.start) {
      parts.push(text.substring(lastIndex, match.start))
    }
    
    // Add the formatted match
    if (match.type === 'bold') {
      parts.push(
        <strong key={`bold-${match.start}`} className="font-bold text-gray-900">
          {match.text}
        </strong>
      )
    } else if (match.type === 'code') {
      parts.push(
        <code key={`code-${match.start}`} className="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm text-red-600">
          {match.text}
        </code>
      )
    }
    
    lastIndex = match.end
  })
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  
  return parts
}

export default function StudentQuestionTypePage() {
  const params = useParams()
  const subjectId = params.id as string
  const qType = params.qType as string

  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null)
        const result = await loadStudentQuestionsAction(subjectId, qType)

        console.log('[QuizPage] loadData result:', JSON.stringify(result, null, 2))

        if (result.success) {
          console.log('[QuizPage] Questions loaded:', {
            count: result.data.questions.length,
            questions: result.data.questions.map((q) => ({
              id: q.id,
              title: q.title,
              q_type: q.q_type,
              options_json_type: typeof q.options_json,
              options_json_isArray: Array.isArray(q.options_json),
              options_json_length: Array.isArray(q.options_json) ? q.options_json.length : 0,
              options_json_sample: Array.isArray(q.options_json) ? q.options_json.slice(0, 2) : 'N/A',
              sub_questions_json_length: Array.isArray(q.sub_questions_json) ? q.sub_questions_json.length : 0,
            })),
          })
          setSubject(result.data.subject)
          setQuestions(result.data.questions)
        } else {
          setError(result.error)
          console.error('[QuizPage] Error:', result.error)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load questions'
        setError(message)
        console.error('[QuizPage] Exception:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [subjectId, qType])

  const currentQuestion = questions[currentIndex]

  useEffect(() => {
    if (currentQuestion) {
      console.log('[QuizPage] Current question changed:', {
        index: currentIndex,
        id: currentQuestion.id,
        title: currentQuestion.title,
        q_type: currentQuestion.q_type,
        options_json_type: typeof currentQuestion.options_json,
        options_json_isArray: Array.isArray(currentQuestion.options_json),
        options_json_length: Array.isArray(currentQuestion.options_json) ? currentQuestion.options_json.length : 0,
        options_json_value: JSON.stringify(currentQuestion.options_json),
        sub_questions_json_length: Array.isArray(currentQuestion.sub_questions_json) ? currentQuestion.sub_questions_json.length : 0,
      })
    }
  }, [currentIndex, currentQuestion])

  useEffect(() => {
    if (!user || !currentQuestion) {
      setIsBookmarked(false)
      return
    }

    const key = getBookmarkKey(user.id, currentQuestion.id)
    setIsBookmarked(localStorage.getItem(key) === '1')
    setSelectedAnswer(null)
    setStatus('')
  }, [currentQuestion, user])

  const toggleBookmark = () => {
    if (!user || !currentQuestion) return

    const key = getBookmarkKey(user.id, currentQuestion.id)
    if (isBookmarked) {
      localStorage.removeItem(key)
      setIsBookmarked(false)
      return
    }

    localStorage.setItem(key, '1')
    setIsBookmarked(true)
  }

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return
    setStatus('Answer submitted. Continue to next question.')
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="inline-block p-3 bg-primary/10 rounded-lg animate-pulse">
          <div className="h-8 w-8 bg-primary rounded-full"></div>
        </div>
        <p className="text-gray-600 font-bold mt-4">Loading questions...</p>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-sm">
        <p className="text-red-600 font-bold text-lg">{error || 'Subject not found'}</p>
        <Link href="/student/subjects" className="text-primary hover:text-primary-dark underline text-sm mt-4 inline-block font-bold">
          ← Back to Subjects
        </Link>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="space-y-6">
        <Link href={`/student/subject/${subjectId}`} className="text-primary hover:text-primary-dark inline-flex items-center gap-2 text-sm font-bold transition-colors">
          ← Back to {subject.name}
        </Link>
        <div className="bg-white rounded-xi border border-rose-100 p-12 text-center shadow-sm">
          <p className="text-gray-600 text-base font-bold">No questions available for {capitalizeWords(qType)} yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Question Type Badge */}
      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary via-rose-300 to-accent text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest shadow-md hover:shadow-lg transition-shadow">
        <div className="w-2 h-2 bg-white rounded-full" />
        {capitalizeWords(qType)}
      </div>

      {/* Header Navigation */}
      <div className="bg-white rounded-lg border border-rose-200 shadow-md p-6 flex items-center justify-between gap-4 flex-wrap">
        <Link href={`/student/subject/${subjectId}`} className="text-primary hover:text-primary-dark inline-flex items-center gap-2 text-sm font-bold transition-colors">
          ← Back to {subject.name}
        </Link>
        <div className="flex items-center gap-6">
          <div className="text-sm font-bold text-gray-700">
            Question <span className="text-primary text-base font-bold">{currentIndex + 1}</span> of <span className="text-primary text-base font-bold">{questions.length}</span>
          </div>
          <button
            onClick={toggleBookmark}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              isBookmarked
                ? 'bg-primary/10 text-primary border-2 border-primary/30 shadow-sm'
                : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-primary/5 hover:border-primary/30'
            }`}
          >
            <span className="text-lg">{isBookmarked ? '★' : '☆'}</span>
            <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white rounded-xl border border-rose-200 shadow-md hover:shadow-lg transition-all overflow-hidden">
        {/* Content Section */}
        <div className="p-8 md:p-10">
          <div className="space-y-8">
            {/* Case Scenario Section */}
            {currentQuestion.case_scenario && currentQuestion.case_scenario.trim() && (
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 border-l-4 border-primary p-6 rounded-lg space-y-3">
                <h3 className="text-sm uppercase tracking-wider font-bold text-orange-900">Case Scenario</h3>
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
                  {currentQuestion.case_scenario}
                </div>
              </div>
            )}

            {/* Main Question Content (TEXT + DATA TABLES) */}
            {currentQuestion.text && currentQuestion.text.trim() && (
              <div className="space-y-4 border-l-4 border-primary pl-6 py-2">
                {parseQuestionText(currentQuestion.text)}
              </div>
            )}

            {/* Sub-Questions Section (for Descriptive) - RENDERS AFTER TEXT */}
            {Array.isArray(currentQuestion.sub_questions_json) && currentQuestion.sub_questions_json.length > 0 && (
              <div className="space-y-4 pt-8 border-t-4 border-pink-300">
                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="text-2xl">📝</span>
                  <span className="bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
                    Answer the Following Sub-Questions
                  </span>
                </h3>
                
                <div className="grid gap-3">
                  {currentQuestion.sub_questions_json.map((subQ, idx: number) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-br from-pink-50 via-white to-rose-50 border-2 border-pink-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-all"
                    >
                      {/* Sub-Question Header */}
                      <div className="flex items-start gap-3">
                        <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary to-accent text-white rounded-full font-bold flex-shrink-0 text-sm shadow-md">
                          {subQ.label || `${idx + 1}`}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 leading-snug font-semibold text-sm">
                            {subQ.text}
                          </p>
                          
                          {/* Sub-Question Options (if any) */}
                          {Array.isArray(subQ.options) && subQ.options.length > 0 && (
                            <div className="mt-2 p-2 bg-white bg-opacity-70 rounded-md border border-pink-200 space-y-1">
                              <p className="text-xs font-bold text-primary uppercase tracking-wider">Options:</p>
                              <ul className="text-xs text-gray-700 space-y-1">
                                {subQ.options.map((opt, oIdx: number) => (
                                  <li key={oIdx} className="flex items-start gap-2">
                                    <span className="text-primary font-bold flex-shrink-0">•</span>
                                    <span>{typeof opt === 'string' ? opt : JSON.stringify(opt)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MCQ Options Section - ONLY FOR MCQ */}
            {(() => {
              const hasOptions = (currentQuestion.options_json || []).length > 0
              console.log('[QuizPage Render] MCQ Options check:', {
                hasOptions,
                optionsLength: (currentQuestion.options_json || []).length,
                optionsValue: JSON.stringify(currentQuestion.options_json),
              })
              
              if (!hasOptions) {
                console.log('[QuizPage Render] No options detected - will show Descriptive badge')
                return null
              }
              
              return (
                <div className="space-y-5 pt-6 border-t-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-xl">✓</span> Select One Answer
                  </h3>
                  <div className="space-y-3">
                    {(currentQuestion.options_json || []).map((option, index) => {
                      // Handle both string and object option formats
                      let optionText: string
                      if (typeof option === 'string') {
                        optionText = option
                      } else if (typeof option === 'object' && option !== null) {
                        optionText = (option as Record<string, unknown>).text ? String((option as Record<string, unknown>).text) : JSON.stringify(option)
                      } else {
                        optionText = JSON.stringify(option)
                      }
                      
                      const optionLabel = String.fromCharCode(65 + index)
                      const optionValue = `${optionLabel}. ${optionText}`
                      const isSelected = selectedAnswer === optionValue

                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedAnswer(optionValue)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all font-medium ${
                            isSelected
                              ? 'border-primary bg-primary/5 text-primary shadow-md'
                              : 'border-rose-200 bg-white text-gray-800 hover:border-primary hover:bg-primary/5'
                          }`}
                        >
                          <span className="inline-block w-8 font-bold text-primary">{optionLabel}.</span>
                          <span>{optionText}</span>
                        </button>
                      )
                    })}
                  </div>

                  {status && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded-lg text-green-800 font-bold flex items-center gap-2">
                      <span>✓</span>
                      <span>{status}</span>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-rose-100 bg-rose-50 px-8 md:px-10 py-6 flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentIndex === 0}
            className="px-6 py-2.5 rounded-lg border-2 border-rose-200 text-gray-700 font-bold hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>

          {/* Submit Button - Only for MCQ */}
          {(currentQuestion.options_json || []).length > 0 && (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Submit Answer
            </button>
          )}

          {/* Badge for Descriptive - Show marks info */}
          {(currentQuestion.options_json || []).length === 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-lg font-bold text-sm">
              <span>✏️</span>
              <span>Descriptive Question</span>
            </div>
          )}

          <button
            onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
            disabled={currentIndex === questions.length - 1}
            className="px-6 py-2.5 rounded-lg border-2 border-rose-200 text-gray-700 font-bold hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
