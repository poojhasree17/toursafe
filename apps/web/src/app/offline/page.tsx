'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re offline</h1>
        <p className="text-gray-600 mb-6">
          Don&apos;t worry! TourSafe can still work offline. Your location data will be synced when you reconnect.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}