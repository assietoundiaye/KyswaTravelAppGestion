import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SuiviReservation from './pages/public/SuiviReservation';
import SuiviBillet from './pages/public/SuiviBillet';
import './App.css';

const App = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/suivi/reservation" element={<SuiviReservation />} />
          <Route path="/suivi/billet" element={<SuiviBillet />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
