import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { login, getProfile } from '../services/api'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      getProfile()
        .then(response => {
          setUser(response.data.account)
          setLoading(false)
        })
        .catch(() => {
          localStorage.removeItem('token')
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const loginUser = async (identifier, password) => {
    try {
      const response = await login({ identifier, password })
      const { token, account: userData } = response.data
      localStorage.setItem('token', token)
      setUser(userData)
      navigate('/')
    } catch (error) {
      console.error('Lỗi đăng nhập:', error.response?.data || error.message)
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại')
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    toast.success('Đã đăng xuất')
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loginUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)