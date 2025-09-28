import Link from 'next/link';

export default function AuditPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Blockchain Audit</h1>
            </div>
            <div className="text-sm text-gray-500">
              Polygon Amoy Testnet
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* VC Verification Section */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Verify Credential
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Verify a tourist's verifiable credential against the blockchain anchor
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VC JWT Token
                  </label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none h-32 font-mono text-sm"
                    placeholder="Paste the JWT token here (starts with eyJ...)&#10;&#10;Example:&#10;eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJkaWQ6d2ViOnRvdXJzYWZlLmFwcCIsInN1YiI6ImRpZDp0b3VyaXN0OmFsaWNlIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE5NTYzNTUyMDAsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJUb3VyaXN0SWRlbnRpdHlDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOnRvdXJpc3Q6YWxpY2UiLCJkaXNwbGF5TmFtZSI6IkFsaWNlIFRvdXJpc3QifX19.placeholder_signature_alice"
                  />
                </div>
                
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verify on Blockchain
                </button>
              </div>
            </div>
          </div>

          {/* Verification Result (Example) */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Verification Result
              </h3>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Verification Successful
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>The credential has been successfully verified against the blockchain anchor.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">VC Hash</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Transaction Hash</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <a href="#" className="text-blue-600 hover:text-blue-800 font-mono break-all">
                      0x742d35Cc6633C0532925a3b8D8A4e0A634f3c0DE
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Block Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    #12,345,678
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    2024-01-15 14:30:25 UTC
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Issuer</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    did:web:toursafe.app
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Subject</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    Alice Tourist
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Verifications */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Verifications
              </h3>
              
              <div className="flow-root">
                <ul className="-mb-8">
                  <li>
                    <div className="relative pb-8">
                      <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              VC verification for <span className="font-medium text-gray-900">Alice Tourist</span>
                            </p>
                            <p className="text-xs text-gray-400 font-mono">Hash: e3b0c44...852b855</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time>2 min ago</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  
                  <li>
                    <div className="relative pb-8">
                      <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              VC verification for <span className="font-medium text-gray-900">Bob Explorer</span>
                            </p>
                            <p className="text-xs text-gray-400 font-mono">Hash: a665a45...7a27ae3</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time>5 min ago</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
