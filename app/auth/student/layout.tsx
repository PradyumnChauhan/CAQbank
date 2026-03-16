export default function StudentAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4 fixed top-0 left-0">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
