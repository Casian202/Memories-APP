import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Lock, User, Eye, EyeOff, Key, Shield, Plus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { adminVerify, createFirstUser, getSetupStatus } from '../services/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requirePasswordChange, setRequirePasswordChange] = useState(false)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminVerified, setAdminVerified] = useState(false)
  const [tempToken, setTempToken] = useState(null)
  const [verifyingAdmin, setVerifyingAdmin] = useState(false)

  // Create user form states
  const [newUsername, setNewUsername] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [confirmUserPassword, setConfirmUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('user')
  const [creatingUser, setCreatingUser] = useState(false)
  const [showNewUserPassword, setShowNewUserPassword] = useState(false)

  const { login, changePassword } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!username || !password) {
      toast.error('Te rog completează toate câmpurile')
      return
    }

    setLoading(true)
    try {
      const user = await login(username, password)

      if (user.force_password_change) {
        setRequirePasswordChange(true)
        toast.success('Te rugăm să schimbi parola')
      } else {
        toast.success('Autentificare reușită!')
        navigate('/dashboard')
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Eroare la autentificare'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      toast.error('Te rugăm completează toate câmpurile')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Parolele nu coincid')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Parola trebuie să aibă minim 8 caractere')
      return
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast.error('Parola trebuie să conțină cel puțin o majusculă')
      return
    }

    if (!/[0-9]/.test(newPassword)) {
      toast.error('Parola trebuie să conțină cel puțin o cifră')
      return
    }

    setLoading(true)
    try {
      await changePassword(password, newPassword)
      toast.success('Parola a fost schimbată cu succes!')
      navigate('/dashboard')
    } catch (error) {
      const message = error.response?.data?.detail || 'Eroare la schimbarea parolei'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreateModal = async () => {
    // Check if setup is already complete
    try {
      const status = await getSetupStatus()
      if (status.user_count >= 2) {
        toast.error('Numărul maxim de utilizatori a fost atins')
        return
      }
      setShowCreateModal(true)
    } catch (error) {
      // If we can't check status, still open the modal
      setShowCreateModal(true)
    }
  }

  const handleAdminVerify = async (e) => {
    e.preventDefault()

    if (!adminPassword) {
      toast.error('Te rog introdu parola de administrator')
      return
    }

    setVerifyingAdmin(true)
    try {
      const response = await adminVerify(adminPassword)
      setTempToken(response.temp_token)
      setAdminVerified(true)
      toast.success('Autentificare de administrator reușită!')
    } catch (error) {
      const message = error.response?.data?.detail || 'Parolă de administrator incorectă'
      toast.error(message)
    } finally {
      setVerifyingAdmin(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()

    if (!newUsername || !newUserPassword || !confirmUserPassword) {
      toast.error('Te rog completează toate câmpurile')
      return
    }

    if (newUserPassword !== confirmUserPassword) {
      toast.error('Parolele nu coincid')
      return
    }

    if (newUserPassword.length < 8) {
      toast.error('Parola trebuie să aibă minim 8 caractere')
      return
    }

    if (!/[A-Z]/.test(newUserPassword)) {
      toast.error('Parola trebuie să conțină cel puțin o majusculă')
      return
    }

    if (!/[0-9]/.test(newUserPassword)) {
      toast.error('Parola trebuie să conțină cel puțin o cifră')
      return
    }

    setCreatingUser(true)
    try {
      await createFirstUser(tempToken, {
        username: newUsername,
        password: newUserPassword,
        role: newUserRole
      })
      toast.success('Utilizator creat cu succes!')
      // Reset and close modal
      handleCloseModal()
      // Auto-fill login form with new user
      setUsername(newUsername)
      setPassword('')
    } catch (error) {
      const message = error.response?.data?.detail || 'Eroare la crearea utilizatorului'
      toast.error(message)
    } finally {
      setCreatingUser(false)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setAdminPassword('')
    setAdminVerified(false)
    setTempToken(null)
    setNewUsername('')
    setNewUserPassword('')
    setConfirmUserPassword('')
    setNewUserRole('user')
  }

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
  }

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4"
          >
            <Heart className="w-10 h-10 text-primary fill-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold font-heading text-gradient">
            Făcută cu inimă pentru noi doi
          </h1>
          <p className="text-gray-500 mt-2">
            {requirePasswordChange ? 'Schimbă parola' : 'Autentificare'}
          </p>
        </div>

        {/* Form */}
        <div className="card">
          {!requirePasswordChange ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Utilizator</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input pl-10"
                    placeholder="Introduceți utilizatorul"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="label">Parolă</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="Introduceți parola"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 -m-1"
                    aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Autentificare'
                )}
              </button>

              {/* Create User Button */}
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="btn btn-secondary w-full justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Creează Utilizator (El/Ea)
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <Key className="w-4 h-4 inline mr-2" />
                  Pentru siguranța contului tău, te rugăm să schimbi parola implicită.
                </p>
              </div>

              <div>
                <label className="label">Parola nouă</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="Minim 8 caractere, o majusculă, o cifră"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 -m-1"
                    aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirmă parola</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="Confirmă parola nouă"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 -m-1"
                    aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Schimbă parola'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          Făcută cu inimă pentru noi doi
        </p>
      </motion.div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={handleCloseModal}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {adminVerified ? 'Creează Utilizator' : 'Configurare Admin'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                  aria-label="Închide"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4">
                {!adminVerified ? (
                  // Admin Verification Form
                  <form onSubmit={handleAdminVerify} className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Introdu parola de administrator pentru a continua.
                    </p>
                    <div>
                      <label className="label">Parolă Admin</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="input pl-10 pr-10"
                          placeholder="Introduceți parola de administrator"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 -m-1"
                          aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={verifyingAdmin}
                      className="btn btn-primary w-full justify-center"
                    >
                      {verifyingAdmin ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Verifică'
                      )}
                    </button>
                  </form>
                ) : (
                  // Create User Form
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                      <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Autentificare de administrator reușită. Puteți crea un utilizator nou.
                      </p>
                    </div>

                    <div>
                      <label className="label">Username</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="input pl-10"
                          placeholder="Introduceți username-ul"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Parolă</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <input
                          type={showNewUserPassword ? 'text' : 'password'}
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="input pl-10 pr-10"
                          placeholder="Minim 8 caractere, o majusculă, o cifră"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 -m-1"
                          aria-label={showNewUserPassword ? 'Ascunde parola' : 'Arată parola'}
                        >
                          {showNewUserPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="label">Confirmare Parolă</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <input
                          type={showNewUserPassword ? 'text' : 'password'}
                          value={confirmUserPassword}
                          onChange={(e) => setConfirmUserPassword(e.target.value)}
                          className="input pl-10"
                          placeholder="Confirmați parola"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Rol</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="input"
                      >
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="btn btn-primary w-full justify-center gap-2"
                    >
                      {creatingUser ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Creează Utilizator
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}