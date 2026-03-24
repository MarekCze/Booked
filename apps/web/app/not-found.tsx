export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">Shop not found</h1>
      <p className="mt-4 text-lg text-gray-600">
        The shop you&apos;re looking for doesn&apos;t exist on ClipBook.
      </p>
      <p className="mt-2 text-gray-500">
        Check the URL and try again.
      </p>
    </main>
  );
}
