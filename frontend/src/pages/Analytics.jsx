import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { analyticsApi } from '../api/analyticsApi'
import { urlApi } from '../api/urlApi'
import DailyClicksChart from '../components/charts/DailyClicksChart'
import BreakdownChart from '../components/charts/BreakdownChart'

const DAYS_OPTIONS = [7, 30, 90]

function Card({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      {title && (
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h2>
      )}
      {children}
    </div>
  )
}

// Handles both the dashboard-wide overview (/analytics) and a single URL's
// detail view (/analytics/:urlId) — same report shape from the API either
// way, so one component covers both instead of duplicating this layout.
export default function Analytics() {
  const { urlId } = useParams()
  const [days, setDays] = useState(30)
  const [report, setReport] = useState(null)
  const [url, setUrl] = useState(null)
  const [topUrls, setTopUrls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (urlId) {
        const [{ data: reportData }, { data: urlData }] = await Promise.all([
          analyticsApi.getUrlAnalytics(urlId, days),
          urlApi.get(urlId),
        ])
        setReport(reportData)
        setUrl(urlData)
      } else {
        const [{ data: reportData }, { data: topUrlsData }] = await Promise.all([
          analyticsApi.getOverview(days),
          analyticsApi.getTopUrls(5),
        ])
        setReport(reportData)
        setTopUrls(topUrlsData)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [urlId, days])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          {urlId && (
            <Link
              to="/analytics"
              className="text-sm text-primary-600 hover:text-primary-700 mb-1 inline-block"
            >
              ← All analytics
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {urlId && url ? `Analytics for /${url.short_code}` : 'Analytics'}
          </h1>
          {urlId && url && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
              {url.original_url}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {DAYS_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setDays(option)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                days === option
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading...</div>
      ) : report ? (
        <div className="space-y-6">
          <Card>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total clicks ({urlId ? 'this URL' : 'all URLs'})
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {report.total_clicks}
            </p>
          </Card>

          <Card title="Clicks over time">
            <DailyClicksChart data={report.daily_clicks} />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Browser">
              <BreakdownChart data={report.browsers} />
            </Card>
            <Card title="Operating System">
              <BreakdownChart data={report.operating_systems} />
            </Card>
            <Card title="Device">
              <BreakdownChart data={report.devices} />
            </Card>
          </div>

          <Card title="Top referrers">
            <BreakdownChart data={report.referrers} />
          </Card>

          {!urlId && topUrls.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-4 pt-4">
                Top URLs
              </h2>
              <table className="w-full text-sm mt-2">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {topUrls.map((topUrl) => (
                    <tr key={topUrl.id}>
                      <td className="px-4 py-3">
                        <Link
                          to={`/analytics/${topUrl.id}`}
                          className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                        >
                          /{topUrl.short_code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {topUrl.original_url}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                        {topUrl.click_count} clicks
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-4 pt-4 pb-2">
              Recent activity
            </h2>
            {report.recent_clicks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 px-4 pb-4">No clicks yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Time</th>
                      <th className="px-4 py-2 font-medium">Browser</th>
                      <th className="px-4 py-2 font-medium">OS</th>
                      <th className="px-4 py-2 font-medium">Device</th>
                      <th className="px-4 py-2 font-medium">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {report.recent_clicks.map((click, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {new Date(click.clicked_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                          {click.browser || 'Unknown'}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                          {click.operating_system || 'Unknown'}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                          {click.device_type || 'Unknown'}
                        </td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {click.referrer || 'Direct'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
