import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { urlApi } from '../api/urlApi'
import CreateUrlModal from '../components/CreateUrlModal'
import EditUrlModal from '../components/EditUrlModal'
import ConfirmDialog from '../components/ConfirmDialog'

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date created' },
  { value: 'click_count', label: 'Clicks' },
  { value: 'expires_at', label: 'Expiry' },
  { value: 'original_url', label: 'URL' },
]

function StatCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
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

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My URLs</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors flex-shrink-0"
        >
          + New URL
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total URLs" value={stats.total_urls} />
          <StatCard label="Active" value={stats.active_urls} />
          <StatCard label="Inactive" value={stats.inactive_urls} />
          <StatCard label="Total clicks" value={stats.total_clicks} />
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by URL or short code..."
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {SORT_OPTIONS.map((option) => (
            <optgroup key={option.value} label={option.label}>
              <option value={`${option.value}:desc`}>{option.label} (newest/highest first)</option>
              <option value={`${option.value}:asc`}>{option.label} (oldest/lowest first)</option>
            </optgroup>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            {search || statusFilter !== 'all'
              ? 'No URLs match your filters.'
              : "You haven't created any short URLs yet."}
          </div>
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
                  <tr key={url.id}>
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
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{url.click_count}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {url.expires_at ? new Date(url.expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCopy(url)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          {copiedId === url.id ? 'Copied!' : 'Copy'}
                        </button>
                        <Link
                          to={`/analytics/${url.id}`}
                          className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Analytics
                        </Link>
                        <button
                          onClick={() => setEditingUrl(url)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingUrl(url)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
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
