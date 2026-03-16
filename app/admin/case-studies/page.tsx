export default function CaseStudiesPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="admin-page-title text-4xl font-bold mb-2">Case Studies</h1>
        <p className="admin-page-subtitle mb-8">Import and manage case studies</p>
        <div className="admin-card rounded-lg p-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Import from JSON</h2>
          <div className="border-2 border-dashed border-blue-200 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-blue-50">
            <p className="text-slate-600">Paste JSON here or drag & drop</p>
          </div>
        </div>
      </div>
    </div>
  )
}
