import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Professional{' '}
          <span className="text-primary-600">PDF Generator</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          Create beautiful A4 PDFs with headers, footers, automatic pagination, and
          multi-page support. Manage your documents securely with JWT authentication.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button className="px-8 py-3 text-base">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button className="px-8 py-3 text-base">Get Started Free</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="px-8 py-3 text-base">
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'A4 Professional Layout', desc: 'Headers, footers, and dynamic page numbers' },
            { title: 'Auto Multi-Page', desc: 'Content wraps and breaks across pages automatically' },
            { title: 'Secure & Cloud', desc: 'JWT auth, MongoDB storage, search & manage records' },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
