// Mock authentication for development without Supabase
// This will be replaced with real Supabase auth when credentials are added

interface MockUser {
  id: string
  email: string
}

let mockUser: MockUser | null = null

// Store in localStorage for persistence across page refreshes
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('mockUser')
  if (stored) {
    mockUser = JSON.parse(stored)
  }
}

export const mockAuth = {
  signIn: async (email: string, password: string) => {
    // Mock sign in - accept any credentials for now
    mockUser = {
      id: 'mock-user-1',
      email: email,
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('mockUser', JSON.stringify(mockUser))
    }
    return { user: mockUser, error: null }
  },

  signUp: async (email: string, password: string) => {
    // Mock sign up - accept any credentials for now
    mockUser = {
      id: 'mock-user-1',
      email: email,
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('mockUser', JSON.stringify(mockUser))
    }
    return { user: mockUser, error: null }
  },

  signOut: async () => {
    mockUser = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mockUser')
    }
    return { error: null }
  },

  getSession: async () => {
    return {
      data: {
        session: mockUser ? { user: mockUser } : null
      },
      error: null
    }
  },

  getUser: () => mockUser,
}

