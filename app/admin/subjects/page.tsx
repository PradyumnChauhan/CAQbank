'use client'

import { useState, useTransition, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import Link from 'next/link'
import {
  loadSubjectsAction,
  createSubjectAction,
  deleteSubjectAction,
  bulkUploadQuestionsAction,
} from '@/app/admin/actions'
import { normalizeQuestionPayload } from '@/lib/question-import'

type SubjectRow = {
  id: string
  code: string
  name: string
  description: string | null
}

type SubjectWithCount = SubjectRow & {
  questionCount: number
}

export default function SubjectsPage() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([])
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')

  // Upload state
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [preview, setPreview] = useState<{
    validCount: number
    invalidCount: number
    byType: Array<{ type: string; count: number }>
  } | null>(null)

  // Server Action transitions
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Load subjects on mount
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const result = await loadSubjectsAction()
        if (result.success && result.data) {
          setSubjects(result.data)
        } else {
          setError(result.error || 'Failed to load subjects')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subjects')
      } finally {
        setIsInitialLoad(false)
      }
    }

    loadSubjects()
  }, [])

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError('You must be signed in')
      return
    }

    if (!name.trim() || !code.trim()) {
      setError('Name and code are required')
      return
    }

    startTransition(async () => {
      setError(null)
      const result = await createSubjectAction(
        user.id,
        name.trim(),
        code.trim().toLowerCase().replace(/\s+/g, '_'),
        description.trim() || undefined
      )

      if (result.success && result.data) {
        setName('')
        setCode('')
        setDescription('')
        setSubjects([...subjects, { ...result.data, questionCount: 0 }])
      } else {
        setError(result.error || 'Failed to create subject')
      }
    })
  }

  const parseJsonAndNormalize = async () => {
    if (!jsonInput.trim()) {
      throw new Error('Paste JSON data in the text box above.')
    }

    try {
      const json = JSON.parse(jsonInput)
      return normalizeQuestionPayload(json)
    } catch (err) {
      throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handlePreview = async () => {
    setUploadStatus('')
    try {
      const { valid, invalidCount } = await parseJsonAndNormalize()
      const counts = valid.reduce<Record<string, number>>((acc, item) => {
        acc[item.q_type] = (acc[item.q_type] || 0) + 1
        return acc
      }, {})

      const byType = Object.entries(counts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)

      setPreview({
        validCount: valid.length,
        invalidCount,
        byType,
      })
    } catch (previewError) {
      setUploadStatus(previewError instanceof Error ? previewError.message : 'Preview failed')
      setPreview(null)
    }
  }

  const handleBulkUpload = async () => {
    if (!user) {
      setUploadStatus('You must be signed in to upload questions.')
      return
    }

    if (!selectedSubjectId) {
      setUploadStatus('Select a subject first.')
      return
    }

    setIsUploading(true)
    setUploadStatus('')

    try {
      const result = await bulkUploadQuestionsAction(user.id, selectedSubjectId, jsonInput, false)
      if (result.success && result.data) {
        setUploadStatus(`✓ Uploaded ${result.data.uploadedCount} questions!`)
        setJsonInput('')
        setPreview(null)
        // Reload subjects
        const subjectsResult = await loadSubjectsAction()
        if (subjectsResult.success && subjectsResult.data) {
          setSubjects(subjectsResult.data)
        }
      } else {
        setUploadStatus(result.error || 'Upload failed')
      }
    } catch (err) {
      setUploadStatus(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!user || !window.confirm(`Delete "${subjectName}"?`)) return

    startTransition(async () => {
      const result = await deleteSubjectAction(user.id, subjectId)
      if (result.success) {
        setSubjects(subjects.filter((s) => s.id !== subjectId))
      } else {
        setError(result.error || 'Failed to delete subject')
      }
    })
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="admin-page-title text-4xl font-bold mb-2">Subjects</h1>
          <p className="admin-page-subtitle">Manage subjects and bulk upload question banks.</p>
        </div>

        {error && (
          <div className="admin-card rounded-lg p-4 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {user && (
          <div className="admin-card rounded-lg p-4">
            <p className="text-sm text-slate-700">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
          </div>
        )}

        <section className="admin-card rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Create Subject</h2>
          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Subject name"
                className="w-full rounded-lg border border-blue-200 px-3 py-2 text-slate-900 placeholder:text-slate-400"
              />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Subject code (e.g. tax)"
                className="w-full rounded-lg border border-blue-200 px-3 py-2 text-slate-900 placeholder:text-slate-400"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-blue-200 px-3 py-2 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="admin-button-primary px-4 py-2 rounded-lg font-medium disabled:opacity-60"
            >
              {isPending ? 'Creating...' : 'Add Subject'}
            </button>
          </form>
        </section>

        <section className="admin-card rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Bulk Upload Questions</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Subject:</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value)
                  setPreview(null)
                  setUploadStatus('')
                }}
                className="w-full rounded-lg border border-blue-200 px-3 py-2 text-slate-900"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Paste JSON Data:</label>
              <textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value)
                  setPreview(null)
                  setUploadStatus('')
                }}
                placeholder="Paste your JSON question data here..."
                className="w-full h-64 rounded-lg border border-blue-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 font-mono text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePreview}
                disabled={!jsonInput.trim()}
                className="admin-button-secondary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                Preview
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={isUploading || !preview}
                className="admin-button-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>

            {uploadStatus && (
              <div className="p-3 rounded-lg bg-blue-50 text-sm text-slate-700">
                {uploadStatus}
              </div>
            )}

            {preview && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">Preview Results:</p>
                <p className="text-sm text-slate-700">
                   Valid: {preview.validCount} |  Invalid: {preview.invalidCount}
                </p>
                <div className="mt-2 space-y-1">
                  {preview.byType.map((type) => (
                    <p key={type.type} className="text-xs text-slate-600">
                      {type.type}: {type.count}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="admin-card rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">All Subjects</h2>
          {isInitialLoad ? (
            <p className="text-sm text-slate-600">Loading subjects...</p>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-slate-600">No subjects created yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-blue-200">
              <table className="w-full">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                      Code
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="border-t border-blue-200">
                      <td className="px-4 py-2 text-sm text-slate-900">{subject.name}</td>
                      <td className="px-4 py-2 text-sm font-mono text-slate-700">{subject.code}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {subject.description || '—'}
                      </td>
                      <td className="px-4 py-2 text-sm flex gap-2">
                        <Link
                          href={`/admin/subjects/${subject.id}/case-studies`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Case Studies
                        </Link>
                        <button
                          onClick={() => handleDeleteSubject(subject.id, subject.name)}
                          disabled={isPending}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
