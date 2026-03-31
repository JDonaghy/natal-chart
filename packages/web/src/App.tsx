import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { TamaguiProvider } from 'tamagui';
import config from '../tamagui.config';
import { ShareLoader } from './components/ShareLoader';
import { Layout } from './components/Layout';
import { ChartProvider } from './contexts/ChartContext';
import './App.css';

const BirthDataForm = React.lazy(() => import('./components/BirthDataForm').then(m => ({ default: m.BirthDataForm })));
const ChartView = React.lazy(() => import('./components/ChartView').then(m => ({ default: m.ChartView })));
const TransitView = React.lazy(() => import('./components/TransitView').then(m => ({ default: m.TransitView })));
const CompareView = React.lazy(() => import('./components/CompareView').then(m => ({ default: m.CompareView })));
const ReleasingView = React.lazy(() => import('./components/ReleasingView').then(m => ({ default: m.ReleasingView })));

function App() {
  return (
    <TamaguiProvider config={config} disableInjectCSS>
    <Router>
      <ChartProvider>
        <ShareLoader />
        <Layout>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>}>
            <Routes>
              <Route path="/" element={<BirthDataForm />} />
              <Route path="/chart" element={<ChartView />} />
              <Route path="/transits" element={<TransitView />} />
              <Route path="/compare" element={<CompareView />} />
              <Route path="/releasing" element={<ReleasingView />} />
            </Routes>
          </Suspense>
        </Layout>
      </ChartProvider>
    </Router>
    </TamaguiProvider>
  );
}

export default App;
