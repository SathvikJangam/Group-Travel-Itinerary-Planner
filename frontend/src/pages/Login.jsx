import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // NOTE: Ensure your backend has a /auth/login route that returns a token!
      const { data } = await axios.post('/auth/login', { email, password });
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-apple-surface shadow-2xl">
        <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
        <p className="text-center text-apple-gray mb-8">Sign in to continue your journey.</p>
        
        {error && (
          <div className="p-3 mb-6 text-sm text-apple-red bg-red-900/20 border border-apple-red/50 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input 
              type="email" 
              placeholder="Email"
              className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div>
            <input 
              type="password" 
              placeholder="Password"
              className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-4 mt-2 font-semibold text-white bg-apple-blue rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>

        <p className="mt-8 text-center text-apple-gray">
          Don't have an account?{' '}
          <Link to="/register" className="text-apple-blue hover:underline">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}