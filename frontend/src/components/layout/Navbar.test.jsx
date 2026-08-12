import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../hooks/useAuth'

vi.mock('../../hooks/useTheme', () => ({ useTheme: vi.fn() }))
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    useTheme.mockReturnValue({ theme: 'light', toggleTheme: vi.fn() })
  })

  it('shows Login and Sign up when not authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      logout: vi.fn(),
    })
    renderNavbar()

    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Sign up')).toBeInTheDocument()
  })

  it('shows Dashboard, Analytics, and the user name when authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { full_name: 'Jane Doe', email: 'jane@example.com' },
      logout: vi.fn(),
    })
    renderNavbar()

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Log out')).toBeInTheDocument()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
  })

  it('renders nothing in the auth slot while auth status is loading', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: true, user: null, logout: vi.fn() })
    renderNavbar()

    expect(screen.queryByText('Login')).not.toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})
