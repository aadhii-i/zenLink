import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Register from './Register'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }))

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
}

describe('Register password validation', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ register: vi.fn() })
  })

  it('shows the requirement checklist as unmet for a weak password', () => {
    renderRegister()

    // 'weak' is <8 chars, no uppercase, no digit — but does contain a
    // lowercase letter, so exactly 1 of the 4 rules should read as met.
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'weak' } })

    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    expect(screen.getAllByText('✓')).toHaveLength(1)
  })

  it('marks every requirement as met once a password satisfies them all', () => {
    renderRegister()

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password1' } })

    expect(screen.getAllByText('✓')).toHaveLength(4)
  })

  it('shows a mismatch warning when confirm password differs', () => {
    renderRegister()

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Different1' },
    })

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('shows no mismatch warning once passwords match', () => {
    renderRegister()

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Password1' },
    })

    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
  })
})
