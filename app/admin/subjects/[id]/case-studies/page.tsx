'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { importCaseStudiesAction, getCaseStudiesAction, deleteCaseStudyAction, type CaseStudy } from '@/app/case-study/actions'

export default function AdminCaseStudiesPage() {
  const params = useParams()
  const subjectId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)

  // Load case studies
  useEffect(() => {
    const loadCaseStudies = async () => {
      try {
        const result = await getCaseStudiesAction(subjectId)
        if (result.success) {
          setCaseStudies(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load case studies')
      } finally {
        setIsLoading(false)
      }
    }

    loadCaseStudies()
  }, [subjectId])

  const handleImportCases = async () => {
    if (!importFile) {
      alert('Please select a JSON file')
      return
    }

    setIsImporting(true)
    try {
      const text = await importFile.text()
      const casesData = JSON.parse(text)

      const result = await importCaseStudiesAction(subjectId, casesData)

      if (result.success) {
        alert(`✓ Imported ${result.data.imported} case studies`)
        setImportFile(null)
        // Reload case studies
        const reloadResult = await getCaseStudiesAction(subjectId)
        if (reloadResult.success) {
          setCaseStudies(reloadResult.data)
        }
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (err) {
      alert(`Error parsing JSON: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm('Are you sure you want to delete this case study?')) return

    try {
      const result = await deleteCaseStudyAction(caseId)
      if (result.success) {
        setCaseStudies(caseStudies.filter(c => c.id !== caseId))
        alert('✓ Case study deleted')
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <Link href="/admin/subjects" className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-2 text-sm font-medium">
        ← Back to Subjects
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Case Studies</h1>

        {/* Import Section */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Import Case Studies</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select JSON File</label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                disabled={isImporting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleImportCases}
              disabled={!importFile || isImporting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Upload a JSON file exported from extract_cases.py with case scenario data.
          </p>
        </div>

        {/* Case Studies List */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Case Studies ({caseStudies.length})
          </h2>

          {isLoading ? (
            <p className="text-gray-600">Loading...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : caseStudies.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium mb-2">No case studies yet</p>
              <p>Import case studies using the form above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {caseStudies.map((cs) => (
                <div
                  key={cs.id}
                  className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Case Scenario {cs.case_number}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{cs.context}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>📚 {cs.estimated_time_minutes} mins</span>
                      <span className={`px-2 py-1 rounded ${
                        cs.difficulty_level === 'easy' ? 'bg-green-100 text-green-700' :
                        cs.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {cs.difficulty_level.toUpperCase()}
                      </span>
                      <span>{cs.published ? '✓ Published' : '⊘ Draft'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleDeleteCase(cs.id)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
