import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const { data } = await axios.post('/auth/register', formData);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-apple-surface shadow-2xl">
        <h2 className="text-3xl font-bold text-center mb-2">Create Account</h2>
        <p className="text-center text-apple-gray mb-8">Start planning your group itineraries.</p>
        
        {error && (
          <div className="p-3 mb-6 text-sm text-apple-red bg-red-900/20 border border-apple-red/50 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <input 
              type="text" 
              name="name"
              placeholder="Full Name"
              className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue transition-all"
              onChange={handleChange}
              required 
            />
          </div>

          <div>
            <input 
              type="email" 
              name="email"
              placeholder="Email"
              className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue transition-all"
              onChange={handleChange}
              required 
            />
          </div>
          
          <div>
            <input 
              type="password" 
              name="password"
              placeholder="Password"
              className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue transition-all"
              onChange={handleChange}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-4 mt-2 font-semibold text-white bg-apple-blue rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-8 text-center text-apple-gray">
          Already have an account?{' '}
          <Link to="/login" className="text-apple-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}