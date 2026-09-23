import { useEffect, useState } from 'react';
import Student from './Student.jsx';
import Teacher from './components/teacher/Teacher.jsx';

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.startsWith('#/teacher') ? <Teacher /> : <Student />;
}
