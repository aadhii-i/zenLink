import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { urlApi } from '../api/urlApi'
import CreateUrlModal from '../components/CreateUrlModal'
import EditUrlModal from '../components/EditUrlModal'
import ConfirmDialog from '../components/ConfirmDialog'
import QrCodeButton from '../components/QrCodeButton'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useCountUp } from '../hooks/useCountUp'

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date created' },
  { value: 'click_count', label: 'Clicks' },
  { value: 'expires_at', label: 'Expiry' },
  { value: 'original_url', label: 'URL' },
]

const STAT_ICONS = {
  total: (
    <path d="M9 12a3 3 0 0 0 4.24 0l3-3a3 3 0 0 0-4.24-4.24l-1 1M15 12a3 3 0 0 0-4.24 0l-3 3a3 3 0 0 0 4.24 4.24l1-1" />
  ),
  active: <path d="M20 6L9 17l-5-5" />,
  inactive: <path d="M18 6L6 18M6 6l12 12" />,
  clicks: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
}

function StatCard({ label, value, icon }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0)
  return (
    <Card hover className="p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          {icon}
        </svg>
        <p className="text-sm">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5 tabular-nums">
        {animated}
      </p>
    </Card>
  )
}

function StatusBadge({ url }) {
  const isExpired = url.expires_at && new Date(url.expires_at) <= new Date()

  if (!url.is_active) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
        Inactive
      </span>
    )
  }
  if (isExpired) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
        Expired
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
      Active
    </span>
  )
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-4 flex items-center gap-4">
          <div className="h-4 w-20 skeleton" />
          <div className="h-4 w-40 skeleton hidden sm:block" />
          <div className="h-4 w-14 skeleton" />
          <div className="h-4 w-10 skeleton ml-auto" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ filtered, onCreate }) {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-950 dark:to-accent-950 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-primary-600 dark:text-primary-400">
          <path
            d="M9 12a3 3 0 0 0 4.24 0l3-3a3 3 0 0 0-4.24-4.24l-1 1M15 12a3 3 0 0 0-4.24 0l-3 3a3 3 0 0 0 4.24 4.24l1-1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-gray-600 dark:text-gray-300 font-medium">
        {filtered ? 'No URLs match your filters.' : "You haven't created any short URLs yet."}
      </p>
      {!filtered && (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create your first short link to see it here.
          </p>
          <Button className="mt-4" onClick={onCreate}>
            + New URL
          </Button>
        </>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | inactive
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUrl, setEditingUrl] = useState(null)
  const [deletingUrl, setDeletingUrl] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await urlApi.getStats()
      setStats(data)
    } catch {
      // Stats are a nice-to-have header — a failure here shouldn't block the list below.
    }
  }, [])

  const fetchUrls = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      }
      if (search) params.search = search
      if (statusFilter !== 'all') params.is_active = statusFilter === 'active'

      const { data } = await urlApi.list(params)
      setItems(data.items)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your URLs.')
    } finally {
      setLoading(false)
    }
  }, [page, sortBy, sortOrder, search, statusFilter])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchUrls()
  }, [fetchUrls])

  const handleCreated = () => {
    setShowCreateModal(false)
    setPage(1)
    fetchUrls()
    fetchStats()
  }

  const handleUpdated = () => {
    setEditingUrl(null)
    fetchUrls()
    fetchStats()
  }

  const handleDelete = async () => {
    if (!deletingUrl) return
    setIsDeleting(true)
    try {
      await urlApi.remove(deletingUrl.id)
      setDeletingUrl(null)
      fetchUrls()
      fetchStats()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete URL.')
      setDeletingUrl(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopy = async (url) => {
    await navigator.clipboard.writeText(url.short_url)
    setCopiedId(url.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isFiltered = Boolean(search) || statusFilter !== 'all'

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 motion-safe:animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My URLs</h1>
        <Button onClick={() => setShowCreateModal(true)} className="flex-shrink-0">
          + New URL
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 motion-safe:animate-fade-in-up [animation-delay:50ms]">
          <StatCard label="Total URLs" value={stats.total_urls} icon={STAT_ICONS.total} />
          <StatCard label="Active" value={stats.active_urls} icon={STAT_ICONS.active} />
          <StatCard label="Inactive" value={stats.inactive_urls} icon={STAT_ICONS.inactive} />
          <StatCard label="Total clicks" value={stats.total_clicks} icon={STAT_ICONS.clicks} />
        </div>
      )}

      <Card className="p-4 mb-4 flex flex-col sm:flex-row gap-3 motion-safe:animate-fade-in-up [animation-delay:100ms]">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by URL or short code..."
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-500 transition-all"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-500 transition-all"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split(':')
            setSortBy(field)
            setSortOrder(order)
            setPage(1)
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-500 transition-all"
        >
          {SORT_OPTIONS.map((option) => (
            <optgroup key={option.value} label={option.label}>
              <option value={`${option.value}:desc`}>{option.label} (newest/highest first)</option>
              <option value={`${option.value}:asc`}>{option.label} (oldest/lowest first)</option>
            </optgroup>
          ))}
        </select>
      </Card>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm motion-safe:animate-fade-in-up">
          {error}
        </div>
      )}

      <Card className="overflow-hidden motion-safe:animate-fade-in-up [animation-delay:150ms]">
        {loading ? (
          <SkeletonRows />
        ) : items.length === 0 ? (
          <EmptyState filtered={isFiltered} onCreate={() => setShowCreateModal(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Short URL</th>
                  <th className="px-4 py-3 font-medium">Destination</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Clicks</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((url) => (
                  <tr
                    key={url.id}
                    className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-3">
                      <a
                        href={url.short_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                      >
                        /{url.short_code}
                      </a>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-gray-600 dark:text-gray-300">
                      {url.original_url}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge url={url} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 tabular-nums">
                      {url.click_count}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {url.expires_at ? new Date(url.expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => handleCopy(url)}>
                          {copiedId === url.id ? (
                            <span className="text-primary-600 dark:text-primary-400 motion-safe:animate-pop-in">
                              Copied!
                            </span>
                          ) : (
                            'Copy'
                          )}
                        </Button>
                        <QrCodeButton value={url.short_url} />
                        <Link
                          to={`/analytics/${url.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Analytics
                        </Link>
                        <Button variant="secondary" size="sm" onClick={() => setEditingUrl(url)}>
                          Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => setDeletingUrl(url)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateUrlModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
      )}

      {editingUrl && (
        <EditUrlModal url={editingUrl} onClose={() => setEditingUrl(null)} onUpdated={handleUpdated} />
      )}

      {deletingUrl && (
        <ConfirmDialog
          title="Delete short URL"
          message={`Delete /${deletingUrl.short_code}? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeletingUrl(null)}
          isLoading={isDeleting}
        />
      )}
    </section>
  )
}
