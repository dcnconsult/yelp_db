import { ThemeProvider } from './contexts/ThemeContext';
import { QueryProvider } from './providers/QueryProvider';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Dashboard from './components/Features/Dashboard';

function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <Dashboard />
            </div>
          </main>
          <Footer />
        </div>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default App;
