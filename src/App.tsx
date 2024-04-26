import { useState } from 'react';
import { Header } from './Components/Header/Header.jsx';
import { AudioForm } from './Components/Form/Form.jsx';
import './App.css';

function App() {
  const [formCount, setFormCount] = useState(1);

  const incrementFormCount = () => {
    setFormCount(formCount + 1);
  };

  // Dynamically create an array with 'formCount' number of elements
  const forms = Array.from({ length: formCount }, (_, index) => (
    <AudioForm key={index} incrementFormCount={incrementFormCount} />
  ));

  return (
    <div className="whole-wrapper-section">
      <Header />
      <div className="form-section">
        <div className="center-logo-wrapper">
          <img alt="logo" src="/Wendys_logo.jpg" />
        </div>
        <div className="form-section-inner">{forms}</div>
      </div>
    </div>
  );
}

export default App;
