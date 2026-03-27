import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { BirthDataForm } from './components/BirthDataForm';
import { ChartView } from './components/ChartView';
import { Layout } from './components/Layout';
import { ChartProvider } from './contexts/ChartContext';
import './App.css';

function App() {
  return (
    <Router>
      <ChartProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<BirthDataForm />} />
            <Route path="/chart" element={<ChartView />} />
          </Routes>
        </Layout>
      </ChartProvider>
    </Router>
  );
}

export default App;