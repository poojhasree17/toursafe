import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center items-center mb-6">
            <svg className="h-16 w-16 text-blue-600 mr-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h1 className="text-5xl font-bold text-gray-900">TourSafe</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered smart tourist safety and incident response system with blockchain-verified credentials
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <svg className="h-12 w-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-xl font-semibold mb-2">Real-time GPS Tracking</h3>
            <p className="text-gray-600">
              Continuous location monitoring with geofence alerts for safe zones
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <svg className="h-12 w-12 text-orange-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5C3.41 18.167 4.372 20 5.912 20z" />
            </svg>
            <h3 className="text-xl font-semibold mb-2">AI Anomaly Detection</h3>
            <p className="text-gray-600">
              Intelligent detection of immobility, route deviation, and emergency situations
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <svg className="h-12 w-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-semibold mb-2">Instant Response</h3>
            <p className="text-gray-600">
              Real-time notifications to authorities with blockchain audit trail
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/tourist" className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-md transition-colors w-full sm:w-auto">
            I&apos;m a Tourist
          </Link>
          
          <Link href="/admin" className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md shadow-md transition-colors w-full sm:w-auto">
            Operator Dashboard
          </Link>
        </div>

        {/* Demo Notice */}
        <div className="mt-16 p-6 bg-blue-50 rounded-lg text-center">
          <p className="text-blue-800 font-medium">
            🚀 This is a demo system built for SIH 2025 PS-25002
          </p>
          <p className="text-blue-600 text-sm mt-2">
            Using free tiers: Vercel, Supabase, Render, Polygon Amoy testnet
          </p>
        </div>

        {/* Service Status */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-green-600">AI Service: Online</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-600">Web App: Running</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}