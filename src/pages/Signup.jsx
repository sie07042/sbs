import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import GNB from '../components/Gnb'
import Footer from '../components/Footer'
import './Signup.css'

function Signup() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const isValidEmail = (email) => {
    const atIndex = email.indexOf('@')
    const dotIndex = email.lastIndexOf('.')

    return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email) {
      newErrors.email = 'Please enter your email.'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email.'
    }

    if (!formData.password) {
      newErrors.password = 'Please enter your password.'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.'
    }

    if (!formData.username) {
      newErrors.username = 'Please enter your name.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await axios.post('/api/signup', {
        email: formData.email,
        password: formData.password,
        username: formData.username,
      })

      if (response.data.success) {
        alert(response.data.message)
        navigate('/')
      } else {
        alert(response.data.message)
      }
    } catch (error) {
      console.error('Signup error:', error)
      alert('An error occurred during signup. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  return (
    <>
      <div className="signup-page-gnb">
        <GNB />
      </div>
      <Link to="/" className="signup-mobile-home-link">
        HOME
      </Link>

      <div className="signup-container">
        <div className="signup-card">
          <h1>Sign Up</h1>
          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password (min 8 chars)"
                className={errors.password ? 'error' : ''}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className={errors.confirmPassword ? 'error' : ''}
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="form-group">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Name"
                className={errors.username ? 'error' : ''}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="button-group">
              <button type="submit" className="signup-button" disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Create account'}
              </button>
            </div>

            <div className="login-link-container">
              <p>
                Already have an account? <Link to="/login" className="login-link">Login</Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default Signup
