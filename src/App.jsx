import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart,
  DoughnutController,
  ArcElement,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Filler,
  RadarController,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'

Chart.register(
  DoughnutController,
  ArcElement,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Filler,
  RadarController,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

const API_BASE = 'https://ws.audioscrobbler.com/2.0/'
const DEFAULT_API_KEY = '790c37d90400163a5a5fe00d6ca32ef0'
const FALLBACK_IMAGE = 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png'
const periodLabel = (period) => {
  if (period === 'overall') return 'Overall'
  if (period === '7day') return '7 Days'
  if (period === '1month') return '1 Month'
  if (period === '3month') return '3 Months'
  if (period === '6month') return '6 Months'
  if (period === '12month') return '1 Year'
  return period
}

const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    const raw = window.localStorage.getItem(key)
    return raw ?? initialValue
  })

  useEffect(() => {
    if (value === null || value === undefined) return
    window.localStorage.setItem(key, value)
  }, [key, value])

  return [value, setValue]
}

const getItemImage = (item) => {
  if (!item || !item.image) return FALLBACK_IMAGE
  return item.image?.[3]?.['#text'] || item.image?.[2]?.['#text'] || item.image?.[1]?.['#text'] || FALLBACK_IMAGE
}

const applyChartTheme = (isDark) => {
  Chart.defaults.color = isDark ? '#e6e6e6' : '#2b2b2b'
  Chart.defaults.font.family = "'Public Sans', sans-serif"
}

const createChart = (ctx, config) => new Chart(ctx, config)
const useChart = () => {
  const chartsRef = useRef([])

  const destroyAll = () => {
    chartsRef.current.forEach((chart) => chart.destroy())
    chartsRef.current = []
  }

  const push = (chart) => {
    chartsRef.current.push(chart)
  }

  useEffect(() => () => destroyAll(), [])

  return { destroyAll, push }
}

export default function App() {
  const [username, setUsername] = useLocalStorage('lastfm_username', '')
  const [inputUsername, setInputUsername] = useState(username)
  const [theme, setTheme] = useLocalStorage('theme', 'light')
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const [notFoundUser, setNotFoundUser] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingMessage, setOnboardingMessage] = useState('Initializing secure session...')
  const [onboardingShown, setOnboardingShown] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [chartsReady, setChartsReady] = useState(false)
  const [devListening, setDevListening] = useState({
    status: 'idle',
    track: null
  })

  const [profile, setProfile] = useState({
    name: 'Loading...',
    username: '@username',
    avatar: FALLBACK_IMAGE,
    totalScrobbles: '0',
    scrobblesPerDay: '0 / day',
    totalArtists: '0',
    totalTracks: '0 tracks',
    memberSince: '-'
  })

  const [statsOverview, setStatsOverview] = useState({
    avgScrobbles: '0',
    totalAlbums: '0',
    topArtistPlays: '0',
    recentStreak: '0',
    totalArtists: '0'
  })

  const [recentTracks, setRecentTracks] = useState([])
  const [topArtists, setTopArtists] = useState([])
  const [topAlbums, setTopAlbums] = useState([])
  const [topTracks, setTopTracks] = useState([])
  const [friends, setFriends] = useState([])
  const [obsessions, setObsessions] = useState([])
  const [genreTags, setGenreTags] = useState([])

  const [extendedStats, setExtendedStats] = useState({
    diversityScore: '0%',
    mostActiveDay: '-',
    mostActiveDayCount: '0 scrobbles',
    avgTrackLength: '0:00',
    nextMilestone: '-',
    milestoneDate: 'Calculating...',
    milestoneProgress: 0
  })

  const [miniTop, setMiniTop] = useState({
    artists: [],
    albums: [],
    tracks: []
  })

  const [collageGrid, setCollageGrid] = useState({
    size: 3,
    period: 'overall',
    items: []
  })
  const [collageReady, setCollageReady] = useState(false)

  const [obsessionsPeriod, setObsessionsPeriod] = useState('7day')
  const [obsessionsLimit, setObsessionsLimit] = useState(20)
  const [topPeriod, setTopPeriod] = useState({
    artists: 'overall',
    albums: 'overall',
    tracks: 'overall'
  })

  const charts = useChart()
  const artistsChartRef = useRef(null)
  const activityChartRef = useRef(null)
  const hourlyChartRef = useRef(null)
  const weeklyChartRef = useRef(null)
  const albumsChartRef = useRef(null)
  const weeklyTracksChartRef = useRef(null)
  const tagsChartRef = useRef(null)
  const chartsLoadingRef = useRef(false)

  const apiKey = DEFAULT_API_KEY

  const emptyProfile = {
    name: 'Loading...',
    username: '@username',
    avatar: FALLBACK_IMAGE,
    totalScrobbles: '0',
    scrobblesPerDay: '0 / day',
    totalArtists: '0',
    totalTracks: '0 tracks',
    memberSince: '-'
  }

  const emptyStatsOverview = {
    avgScrobbles: '0',
    totalAlbums: '0',
    topArtistPlays: '0',
    recentStreak: '0',
    totalArtists: '0'
  }

  const emptyExtendedStats = {
    diversityScore: '0%',
    mostActiveDay: '-',
    mostActiveDayCount: '0 scrobbles',
    avgTrackLength: '0:00',
    nextMilestone: '-',
    milestoneDate: 'Calculating...',
    milestoneProgress: 0
  }

  const resetDashboard = () => {
    setProfile(emptyProfile)
    setStatsOverview(emptyStatsOverview)
    setRecentTracks([])
    setTopArtists([])
    setTopAlbums([])
    setTopTracks([])
    setFriends([])
    setObsessions([])
    setGenreTags([])
    setExtendedStats(emptyExtendedStats)
    setMiniTop({ artists: [], albums: [], tracks: [] })
    setChartsReady(false)
    setDataReady(false)
  }

  const isUserNotFoundError = (err) => {
    if (!err) return false
    if (err.code === 'USER_NOT_FOUND') return true
    const message = String(err.message || '').toLowerCase()
    return message.includes('user not found') || message.includes('invalid user') || message.includes('no user')
  }

  useEffect(() => {
    document.body.setAttribute('data-theme', theme === 'dark' ? 'dark' : '')
  }, [theme])

  useEffect(() => {
    if (username) {
      setInputUsername(username)
      loadAllData(username)
    }
  }, [])

  useEffect(() => {
    if (dataReady && username && activeTab === 'overview') {
      const id = window.setTimeout(() => loadCharts(username), 0)
      return () => window.clearTimeout(id)
    }
    return undefined
  }, [dataReady, theme, username, activeTab])

  useEffect(() => {
    let timer
    if (showOnboarding) {
      const messages = [
        'Initializing secure session...',
        'Collecting your recent plays...',
        'Mapping your top artists...',
        'Indexing albums and tracks...',
        'Analyzing listening patterns...',
        'Building charts and insights...',
        'Finalizing your dashboard...'
      ]
      let index = 0
      timer = setInterval(() => {
        index = (index + 1) % messages.length
        setOnboardingMessage(messages[index])
      }, 1200)
    }
    return () => clearInterval(timer)
  }, [showOnboarding])

  useEffect(() => {
    let timer
    const loadDevNowPlaying = async () => {
      try {
        const data = await fetchLastFM('user.getrecenttracks', { limit: 1 }, 'lendeerts')
        const track = data.recenttracks.track?.[0]
        const isPlaying = Boolean(track?.['@attr']?.nowplaying)
        if (isPlaying) {
          setDevListening({
            status: 'playing',
            track: {
              name: track.name,
              artist: track.artist?.['#text'] || 'Unknown Artist',
              album: track.album?.['#text'] || 'Unknown Album'
            }
          })
        } else {
          setDevListening({
            status: 'idle',
            track: null
          })
        }
      } catch (err) {
        setDevListening({
          status: 'idle',
          track: null
        })
      }
    }

    if (showAbout) {
      loadDevNowPlaying()
      timer = window.setInterval(loadDevNowPlaying, 15000)
    }

    return () => {
      if (timer) window.clearInterval(timer)
    }
  }, [showAbout])

  const fetchLastFM = async (method, params = {}, userOverride) => {
    const url = new URL(API_BASE)
    url.searchParams.append('method', method)
    url.searchParams.append('user', userOverride || username)
    url.searchParams.append('api_key', apiKey)
    url.searchParams.append('format', 'json')

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      throw new Error(data.message || 'API Error')
    }

    return data
  }

  const saveAndLoad = () => {
    const trimmed = inputUsername.trim()
    if (!trimmed) {
      setError('Please enter your Last.fm username!')
      return
    }

    setNotFoundUser('')
    setError('')
    setUsername(trimmed)
    loadAllData(trimmed)
  }

  const showOnboardingOverlay = () => {
    if (onboardingShown) return
    setOnboardingShown(true)
    setShowOnboarding(true)
  }

  const hideOnboardingOverlay = () => setShowOnboarding(false)

  const loadAllData = async (user) => {
    setLoading(true)
    setError('')
    setNotFoundUser('')
    showOnboardingOverlay()

    try {
      await loadUserInfo(user)
      await Promise.all([
        loadRecentTracks(user),
        loadTopArtists(user, topPeriod.artists),
        loadTopAlbums(user, topPeriod.albums),
        loadTopTracks(user, topPeriod.tracks),
        loadFriends(user),
        loadObsessions(user, obsessionsPeriod, obsessionsLimit),
        calculateAverageTrackLength(user)
      ])
      setDataReady(true)
    } catch (err) {
      if (isUserNotFoundError(err)) {
        resetDashboard()
        setNotFoundUser(user)
      } else {
        setError(`Error loading data: ${err.message}`)
      }
    } finally {
      setLoading(false)
      hideOnboardingOverlay()
    }
  }
  const loadUserInfo = async (user) => {
    const data = await fetchLastFM('user.getinfo', {}, user)
    const info = data.user
    if (!info || !info.name) {
      const notFound = new Error('User not found')
      notFound.code = 'USER_NOT_FOUND'
      throw notFound
    }
    const registerDate = new Date(info.registered.unixtime * 1000)
    const daysSince = Math.max(1, Math.floor((Date.now() - registerDate.getTime()) / (1000 * 60 * 60 * 24)))
    const avgDaily = Math.round(parseInt(info.playcount, 10) / daysSince)

    setProfile({
      name: info.realname || info.name,
      username: `@${info.name}`,
      avatar: getItemImage(info),
      totalScrobbles: parseInt(info.playcount, 10).toLocaleString(),
      scrobblesPerDay: `${avgDaily} / day`,
      totalArtists: info.artistcount || '0',
      totalTracks: `${parseInt(info.trackcount || 0, 10).toLocaleString()} tracks`,
      memberSince: registerDate.getFullYear().toString()
    })

    setStatsOverview((prev) => ({
      ...prev,
      avgScrobbles: avgDaily.toLocaleString(),
      recentStreak: daysSince.toLocaleString()
    }))

    const currentScrobbles = parseInt(info.playcount, 10)
    const nextMilestone = Math.ceil((currentScrobbles + 1) / 1000) * 1000
    const remaining = nextMilestone - currentScrobbles
    const daysToMilestone = Math.ceil(remaining / avgDaily)
    const milestoneDate = new Date()
    milestoneDate.setDate(milestoneDate.getDate() + daysToMilestone)

    setExtendedStats((prev) => ({
      ...prev,
      nextMilestone: nextMilestone.toLocaleString(),
      milestoneDate: `Est. ${milestoneDate.toLocaleDateString()} (${daysToMilestone} days)`,
      milestoneProgress: ((currentScrobbles % 1000) / 1000) * 100
    }))
  }

  const loadRecentTracks = async (user) => {
    const data = await fetchLastFM('user.getrecenttracks', { limit: 20 }, user)
    const tracks = data.recenttracks.track || []
    setRecentTracks(tracks)
  }

  const loadTopArtists = async (user, period = 'overall') => {
    const data = await fetchLastFM('user.gettopartists', { period, limit: 50 }, user)
    const artists = data.topartists.artist || []
    setTopArtists(artists)
    setStatsOverview((prev) => ({
      ...prev,
      topArtistPlays: artists[0] ? parseInt(artists[0].playcount, 10).toLocaleString() : '0'
    }))
    setMiniTop((prev) => ({
      ...prev,
      artists: artists.slice(0, 5)
    }))
    setStatsOverview((prev) => ({
      ...prev,
      totalArtists: data.topartists?.['@attr']?.total || prev.totalArtists
    }))
  }

  const loadTopAlbums = async (user, period = 'overall') => {
    const data = await fetchLastFM('user.gettopalbums', { period, limit: 50 }, user)
    const albums = data.topalbums.album || []
    setTopAlbums(albums)
    setMiniTop((prev) => ({
      ...prev,
      albums: albums.slice(0, 5)
    }))
    setStatsOverview((prev) => ({
      ...prev,
      totalAlbums: data.topalbums?.['@attr']?.total || prev.totalAlbums
    }))
  }

  const loadTopTracks = async (user, period = 'overall') => {
    const data = await fetchLastFM('user.gettoptracks', { period, limit: 50 }, user)
    const tracks = data.toptracks.track || []
    setTopTracks(tracks)
    setMiniTop((prev) => ({
      ...prev,
      tracks: tracks.slice(0, 5)
    }))
    setProfile((prev) => ({
      ...prev,
      totalTracks: `${parseInt(data.toptracks?.['@attr']?.total || 0, 10).toLocaleString()} tracks`
    }))
  }


  const loadFriends = async (user) => {
    const data = await fetchLastFM('user.getfriends', { limit: 20 }, user)
    const friendsList = data.friends.user || []

    const detailed = await Promise.all(
      friendsList.slice(0, 12).map(async (friend) => {
        try {
          const info = await fetchLastFM('user.getinfo', {}, friend.name)
          return info.user
        } catch (err) {
          return friend
        }
      })
    )

    setFriends(detailed)
  }

  const loadObsessions = async (user, period = '7day', limit = 20) => {
    const data = await fetchLastFM('user.gettoptracks', { period, limit }, user)
    setObsessions(data.toptracks.track || [])
  }

  const getDailyScrobbles = async (user) => {
    const days = []
    const counts = []
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const promises = []
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const from = Math.floor(new Date(date).setHours(0, 0, 0, 0) / 1000)
      const to = Math.floor(new Date(date).setHours(23, 59, 59, 999) / 1000)
      days.push(date.toLocaleDateString('en-US', { weekday: 'short' }))
      promises.push(fetchLastFM('user.getrecenttracks', { from, to, limit: 1 }, user))
    }

    const results = await Promise.allSettled(promises)
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        counts.push(parseInt(result.value.recenttracks['@attr'].total, 10))
      } else {
        counts.push(0)
      }
    })

    return { labels: days, data: counts }
  }

  const getHourlyStats = async (user) => {
    const data = await fetchLastFM('user.getrecenttracks', { limit: 200 }, user)
    const tracks = data.recenttracks.track || []
    const hours = new Array(24).fill(0)

    tracks.forEach((track) => {
      if (track.date) {
        const date = new Date(track.date.uts * 1000)
        hours[date.getHours()] += 1
      }
    })

    return hours
  }

  const loadCharts = async (user = username) => {
    if (!user) return
    if (chartsLoadingRef.current) return
    chartsLoadingRef.current = true
    setChartsReady(false)

    applyChartTheme(theme === 'dark')
    charts.destroyAll()

    try {
      let artistsData = null
      let weeklyData = null
      let albumsData = null
      let tagsData = null

      try {
        artistsData = await fetchLastFM('user.gettopartists', { period: 'overall', limit: 10 }, user)
      } catch (err) {
        return
      }

      try {
        weeklyData = await fetchLastFM('user.getweeklytrackchart', { limit: 100 }, user)
      } catch (err) {
        weeklyData = { weeklytrackchart: { track: [] } }
      }

      try {
        albumsData = await fetchLastFM('user.gettopalbums', { period: 'overall', limit: 10 }, user)
      } catch (err) {
        albumsData = { topalbums: { album: [] } }
      }

      try {
        tagsData = await fetchLastFM('user.gettoptags', { limit: 10 }, user)
        setGenreTags(tagsData.toptags.tag.slice(0, 8))
      } catch (err) {
        setGenreTags([])
      }

      if (!artistsData?.topartists?.artist?.length) return

      let dailyStats = { labels: [], data: [] }
      let hourlyData = new Array(24).fill(0)
      try {
        dailyStats = await getDailyScrobbles(user)
      } catch (err) {
        dailyStats = { labels: [], data: [] }
      }
      try {
        hourlyData = await getHourlyStats(user)
      } catch (err) {
        hourlyData = new Array(24).fill(0)
      }

      const totalPlays = artistsData.topartists.artist.reduce((sum, a) => sum + parseInt(a.playcount, 10), 0)
      const topArtistPlays = parseInt(artistsData.topartists.artist[0]?.playcount || 0, 10)
      const diversity = Math.round((1 - topArtistPlays / Math.max(totalPlays, 1)) * 100)

      const maxActivity = dailyStats.data.length ? Math.max(...dailyStats.data) : 0
      const maxIndex = dailyStats.data.length ? dailyStats.data.indexOf(maxActivity) : 0

      setExtendedStats((prev) => ({
        ...prev,
        diversityScore: `${diversity}%`,
        mostActiveDay: dailyStats.labels[maxIndex] || '-',
        mostActiveDayCount: `${maxActivity} scrobbles`
      }))

      const artistsCanvas = artistsChartRef.current
      const artistsCtx = artistsCanvas?.getContext('2d')
      if (artistsCtx) {
        const existing = Chart.getChart(artistsCanvas)
        if (existing) existing.destroy()
        charts.push(
          createChart(artistsCtx, {
            type: 'doughnut',
            data: {
              labels: artistsData.topartists.artist.map((a) => a.name),
              datasets: [
                {
                  data: artistsData.topartists.artist.map((a) => parseInt(a.playcount, 10)),
                  backgroundColor: [
                    '#d51007', '#e62117', '#f73227', '#ff4337', '#ff5447',
                    '#ff6557', '#ff7667', '#ff8777', '#ff9887', '#ffa997'
                  ],
                  borderWidth: 0
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    padding: 15,
                    font: { size: 12, weight: '600' }
                  }
                }
              }
            }
          })
        )
      }

      const activityCanvas = activityChartRef.current
      const activityCtx = activityCanvas?.getContext('2d')
      if (activityCtx) {
        const existing = Chart.getChart(activityCanvas)
        if (existing) existing.destroy()
        charts.push(
          createChart(activityCtx, {
            type: 'bar',
            data: {
              labels: dailyStats.labels,
              datasets: [
                {
                  label: 'Scrobbles',
                  data: dailyStats.data,
                  backgroundColor: '#d51007',
                  borderRadius: 6,
                  barThickness: 40
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.08)' } },
                x: { grid: { display: false } }
              }
            }
          })
        )
      }

      const hourlyCanvas = hourlyChartRef.current
      const hourlyCtx = hourlyCanvas?.getContext('2d')
      if (hourlyCtx) {
        const existing = Chart.getChart(hourlyCanvas)
        if (existing) existing.destroy()
        charts.push(
          createChart(hourlyCtx, {
            type: 'line',
            data: {
              labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
              datasets: [
                {
                  label: 'Activity by Hour',
                  data: hourlyData,
                  borderColor: '#d51007',
                  backgroundColor: 'rgba(213, 16, 7, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.08)' } },
                x: { grid: { display: false } }
              }
            }
          })
        )
      }

      const weeklyCanvas = weeklyChartRef.current
      const weeklyCtx = weeklyCanvas?.getContext('2d')
      if (weeklyCtx) {
        const existing = Chart.getChart(weeklyCanvas)
        if (existing) existing.destroy()
        charts.push(
          createChart(weeklyCtx, {
            type: 'radar',
            data: {
              labels: dailyStats.labels,
              datasets: [
                {
                  label: 'Weekly Pattern',
                  data: dailyStats.data,
                  backgroundColor: 'rgba(213, 16, 7, 0.2)',
                  borderColor: '#d51007',
                  pointBackgroundColor: '#d51007'
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: { r: { ticks: { display: false } } }
            }
          })
        )
      }

      const albumsCanvas = albumsChartRef.current
      const albumsCtx = albumsCanvas?.getContext('2d')
      if (albumsCtx) {
        const existing = Chart.getChart(albumsCanvas)
        if (existing) existing.destroy()
        charts.push(
          createChart(albumsCtx, {
            type: 'bar',
            data: {
              labels: albumsData.topalbums.album.map((a) => a.name),
              datasets: [
                {
                  label: 'Plays',
                  data: albumsData.topalbums.album.map((a) => parseInt(a.playcount, 10)),
                  backgroundColor: '#b31217',
                  borderRadius: 6,
                  barThickness: 28
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.08)' } },
                x: { grid: { display: false } }
              }
            }
          })
        )
      }

      const weeklyTracks = weeklyData.weeklytrackchart?.track?.slice(0, 8) || []
      const weeklyTracksCanvas = weeklyTracksChartRef.current
      const weeklyTracksCtx = weeklyTracksCanvas?.getContext('2d')
      if (weeklyTracksCtx) {
        const existing = Chart.getChart(weeklyTracksCanvas)
        if (existing) existing.destroy()
        charts.push(
          createChart(weeklyTracksCtx, {
            type: 'bar',
            data: {
              labels: weeklyTracks.map((t) => t.name),
              datasets: [
                {
                  label: 'Weekly Plays',
                  data: weeklyTracks.map((t) => parseInt(t.playcount, 10)),
                  backgroundColor: '#d51007',
                  borderRadius: 6,
                  barThickness: 28
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.08)' } },
                x: { grid: { display: false } }
              }
            }
          })
        )
      }

      const tagsCanvas = tagsChartRef.current
      const tagsCtx = tagsCanvas?.getContext('2d')
      if (tagsCtx && tagsData?.toptags?.tag) {
        const existing = Chart.getChart(tagsCanvas)
        if (existing) existing.destroy()
        const topTags = tagsData.toptags.tag.slice(0, 8)
        charts.push(
          createChart(tagsCtx, {
            type: 'doughnut',
            data: {
              labels: topTags.map((t) => t.name),
              datasets: [
                {
                  data: topTags.map((t) => parseInt(t.count, 10)),
                  backgroundColor: [
                    '#d51007', '#e62117', '#f73227', '#ff4337',
                    '#ff5447', '#ff6557', '#ff7667', '#ff8777'
                  ],
                  borderWidth: 0
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    padding: 12,
                    font: { size: 11, weight: '600' }
                  }
                }
              }
            }
          })
        )
      }
    } finally {
      chartsLoadingRef.current = false
      setChartsReady(true)
    }
  }
  const calculateAverageTrackLength = async (user) => {
    try {
      const data = await fetchLastFM('user.gettoptracks', { limit: 100, period: 'overall' }, user)
      const tracks = data.toptracks.track || []
      let totalSeconds = 0
      let count = 0

      tracks.forEach((track) => {
        const duration = parseInt(track.duration, 10)
        if (duration > 0) {
          totalSeconds += duration
          count += 1
        }
      })

      if (count > 0) {
        const avgSeconds = totalSeconds / count
        const minutes = Math.floor(avgSeconds / 60)
        const seconds = Math.floor(avgSeconds % 60)
        setExtendedStats((prev) => ({
          ...prev,
          avgTrackLength: `${minutes}:${seconds.toString().padStart(2, '0')}`
        }))
      }
    } catch (err) {
      setExtendedStats((prev) => ({
        ...prev,
        avgTrackLength: '0:00'
      }))
    }
  }

  const updateObsessions = async () => {
    setLoading(true)
    try {
      await loadObsessions(username, obsessionsPeriod, obsessionsLimit)
    } catch (err) {
      setError(`Error loading obsessions: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const updateTopPeriod = async (type, period) => {
    const next = { ...topPeriod, [type]: period }
    setTopPeriod(next)
    setLoading(true)
    try {
      if (type === 'artists') await loadTopArtists(username, period)
      if (type === 'albums') await loadTopAlbums(username, period)
      if (type === 'tracks') await loadTopTracks(username, period)
    } catch (err) {
      setError(`Error loading ${type}: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const generateCollage = async () => {
    const size = collageGrid.size
    const period = collageGrid.period
    const totalItems = size * size

    setLoading(true)
    try {
      const data = await fetchLastFM('user.gettopalbums', { period, limit: totalItems })
      const albums = data.topalbums.album || []
      setCollageGrid((prev) => ({
        ...prev,
        items: albums
      }))
      setCollageReady(true)
    } catch (err) {
      setError(`Error generating collage: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const downloadCollage = async () => {
    const images = collageGrid.items
    if (!images.length) return

    const size = collageGrid.size
    const imageSize = 300
    const canvas = document.createElement('canvas')
    canvas.width = size * imageSize
    canvas.height = size * imageSize
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await Promise.all(
      images.map((item, index) => new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => {
          const col = index % size
          const row = Math.floor(index / size)
          ctx.drawImage(img, col * imageSize, row * imageSize, imageSize, imageSize)
          resolve()
        }
        img.onerror = resolve
        const src = getItemImage(item)
        img.src = src + (src.includes('?') ? '&' : '?') + 't=' + new Date().getTime()
      }))
    )

    const link = document.createElement('a')
    link.download = `lastfm-collage-${username}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const logout = () => setShowLogout(true)
  const confirmLogout = () => {
    window.localStorage.removeItem('lastfm_username')
    setUsername('')
    setInputUsername('')
    setShowLogout(false)
    window.location.reload()
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const timeAgo = (date) => {
    if (!date) return ''
    const seconds = Math.floor((new Date() - date) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    return `${Math.floor(seconds / 86400)} days ago`
  }

  const isAuthed = Boolean(username)

  const topGenres = useMemo(() => genreTags, [genreTags])

  return (
    <div className="app">
      <header>
        <div className="header-top">
          <div className="container">
            <div className="logo-stat">Advanced Statistics Dashboard</div>
          </div>
        </div>
        <div className="header-main">
          <div className="container">
            <div className="header-content">
              <div className="logo">
                <svg><use href="#icon-chart" /></svg>
                <div className="logo-text">Last.fm Stats</div>
              </div>
              <div className="header-actions">
                <button className="about-toggle" onClick={() => setShowAbout(true)}>
                  <svg className="icon-svg"><use href="#icon-user" /></svg>
                  About
                </button>
                <button className="theme-toggle" onClick={toggleTheme}>
                  <svg className="icon-svg" id="themeIcon"><use href={theme === 'dark' ? '#icon-sun' : '#icon-moon'} /></svg>
                  <span id="themeText">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        {notFoundUser ? (
          <div className="notfound-wrapper">
            <div className="notfound-card">
              <div className="notfound-text">
                <div className="error-glitch notfound-glitch" data-text="404">404</div>
                <h2 className="notfound-title">Profile Not Found</h2>
                <p>The Last.fm profile <strong>{notFoundUser}</strong> is invalid or does not exist.</p>
                <p className="notfound-sub">
                  Want to register? Create an account at{' '}
                  <a href="https://www.last.fm/join" target="_blank" rel="noreferrer">last.fm/join</a>.
                </p>
                <div className="notfound-actions">
                  <button className="btn-outline" onClick={logout}>Logout</button>
                </div>
              </div>
              <div className="notfound-image">
                <img src="/404.png" alt="404 illustration" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {!isAuthed && (
              <div id="setupSection" className="setup-wrapper">
                <div className="setup-card">
                  <h2>Connect Your Last.fm Account</h2>
                  <p className="setup-description">
                    Enter your Last.fm username to unlock comprehensive music statistics, charts, and insights about your listening habits.
                  </p>
                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="username">Last.fm Username</label>
                    <input
                      type="text"
                      id="username"
                      placeholder="Enter your username"
                      value={inputUsername}
                      onChange={(event) => setInputUsername(event.target.value)}
                    />
                  </div>
                  <button className="btn-primary" onClick={saveAndLoad}>Load Statistics</button>
                </div>
              </div>
            )}

            {isAuthed && (
              <div id="mainDashboard" className="main-dashboard">
                <div className="profile-section">
                  <div className="profile-content">
                    <img
                      id="userAvatar"
                      className="profile-avatar"
                      src={profile.avatar}
                      alt="User Avatar"
                      onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE }}
                    />
                    <div className="profile-info">
                      <h1 id="profileName" className="profile-name">{profile.name}</h1>
                      <div id="profileUsername" className="profile-username">{profile.username}</div>
                      <div className="profile-stats">
                        <div className="profile-stat">
                          <div id="totalScrobbles" className="profile-stat-number">{profile.totalScrobbles}</div>
                          <div className="profile-stat-label">Total Scrobbles</div>
                          <div id="scrobblesPerDay" className="profile-stat-sub">{profile.scrobblesPerDay}</div>
                        </div>
                        <div className="profile-stat">
                          <div id="totalArtists" className="profile-stat-number">{statsOverview.totalArtists}</div>
                          <div className="profile-stat-label">Artists</div>
                          <div id="totalTracks" className="profile-stat-sub">{profile.totalTracks}</div>
                        </div>
                        <div className="profile-stat">
                          <div id="memberSince" className="profile-stat-number">{profile.memberSince}</div>
                          <div className="profile-stat-label">Member Since</div>
                        </div>
                      </div>
                    </div>
                    <button className="logout-btn" onClick={logout}>Logout</button>
                  </div>
                </div>

                <div className="stats-overview">
                  <div className="stat-box">
                    <svg className="stat-icon"><use href="#icon-music" /></svg>
                    <div id="avgScrobbles" className="stat-value">{statsOverview.avgScrobbles}</div>
                    <div className="stat-label">Avg. Daily Scrobbles</div>
                  </div>
                  <div className="stat-box">
                    <svg className="stat-icon"><use href="#icon-album" /></svg>
                    <div id="totalAlbums" className="stat-value">{statsOverview.totalAlbums}</div>
                    <div className="stat-label">Unique Albums</div>
                  </div>
                  <div className="stat-box">
                    <svg className="stat-icon"><use href="#icon-user" /></svg>
                    <div id="topArtistPlays" className="stat-value">{statsOverview.topArtistPlays}</div>
                    <div className="stat-label">Top Artist Plays</div>
                  </div>
                  <div className="stat-box">
                    <svg className="stat-icon"><use href="#icon-fire" /></svg>
                    <div id="recentStreak" className="stat-value">{statsOverview.recentStreak}</div>
                    <div className="stat-label">Days Active</div>
                  </div>
                </div>

                <div className="nav-tabs">
                  {['overview', 'recent', 'artists', 'albums', 'tracks', 'friends', 'obsessions', 'collage'].map((tab) => (
                    <button
                      key={tab}
                      className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'overview' && 'Overview'}
                      {tab === 'recent' && 'Recent'}
                      {tab === 'artists' && 'Top Artists'}
                      {tab === 'albums' && 'Top Albums'}
                      {tab === 'tracks' && 'Top Tracks'}
                      {tab === 'friends' && 'Friends'}
                      {tab === 'obsessions' && 'Obsessions'}
                      {tab === 'collage' && 'Collage'}
                    </button>
                  ))}
                </div>
                {activeTab === 'overview' && (
                  <section className="content-section active">
                    {!chartsReady && (
                      <div className="charts-loading">
                        <div className="charts-loading-dots">
                          <span />
                          <span />
                          <span />
                        </div>
                        <div>
                          <div className="charts-loading-title">Loading charts</div>
                          <div className="charts-loading-hint">If this takes longer than usual, your browser may be blocking requests.</div>
                        </div>
                      </div>
                    )}
                    <div className="charts-grid">
                  <div className="chart-container">
                    <h3 className="chart-title"><svg><use href="#icon-user" /></svg> Top Artists Distribution</h3>
                    <div className="chart-wrapper"><canvas ref={artistsChartRef} /></div>
                  </div>
                  <div className="chart-container">
                    <h3 className="chart-title"><svg><use href="#icon-chart" /></svg> Listening Activity (7 Days)</h3>
                    <div className="chart-wrapper"><canvas ref={activityChartRef} /></div>
                  </div>
                  <div className="chart-container">
                    <h3 className="chart-title"><svg><use href="#icon-time" /></svg> Hourly Activity (24h)</h3>
                    <div className="chart-wrapper"><canvas ref={hourlyChartRef} /></div>
                  </div>
                  <div className="chart-container">
                    <h3 className="chart-title"><svg><use href="#icon-music" /></svg> Weekly Distribution</h3>
                    <div className="chart-wrapper"><canvas ref={weeklyChartRef} /></div>
                  </div>
                  <div className="chart-container">
                    <h3 className="chart-title"><svg><use href="#icon-album" /></svg> Top Albums (Plays)</h3>
                    <div className="chart-wrapper"><canvas ref={albumsChartRef} /></div>
                  </div>
                  <div className="chart-container">
                    <h3 className="chart-title"><svg><use href="#icon-music" /></svg> Weekly Top Tracks</h3>
                    <div className="chart-wrapper"><canvas ref={weeklyTracksChartRef} /></div>
                  </div>
                  <div className="chart-container">
                    <h3 className="chart-title"><svg><use href="#icon-chart" /></svg> Top Tags Share</h3>
                    <div className="chart-wrapper"><canvas ref={tagsChartRef} /></div>
                  </div>
                </div>

                <div className="extended-stats">
                  <div className="extended-stat-card">
                    <h4>Listening Diversity</h4>
                    <div className="value">{extendedStats.diversityScore}</div>
                    <div className="subtext">Based on artist variety</div>
                  </div>
                  <div className="extended-stat-card">
                    <h4>Most Active Day</h4>
                    <div className="value">{extendedStats.mostActiveDay}</div>
                    <div className="subtext">{extendedStats.mostActiveDayCount}</div>
                  </div>
                  <div className="extended-stat-card">
                    <h4>Average Track Length</h4>
                    <div className="value">{extendedStats.avgTrackLength}</div>
                    <div className="subtext">Estimated from recent tracks</div>
                  </div>
                  <div className="extended-stat-card">
                    <h4>Next Milestone</h4>
                    <div className="value">{extendedStats.nextMilestone}</div>
                    <div className="subtext">{extendedStats.milestoneDate}</div>
                    <div className="milestone-progress">
                      <div className="milestone-bar" style={{ width: `${extendedStats.milestoneProgress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="activity-section">
                  <h3 className="chart-title"><svg><use href="#icon-music" /></svg> Top Genres & Tags</h3>
                  <div className="genre-tags">
                    {topGenres.length === 0 && (
                      <div className="genre-tag">No tags available</div>
                    )}
                    {topGenres.map((tag) => (
                      <div key={tag.name} className="genre-tag">{tag.name}</div>
                    ))}
                  </div>
                </div>

                <div className="insight-grid">
                  <div className="insight-card">
                    <h3 className="insight-title">Top Artists (Top 5)</h3>
                    <div className="mini-list">
                      {miniTop.artists.map((artist, index) => (
                        <div key={artist.name} className="mini-item">
                          <div className="mini-rank">#{index + 1}</div>
                          <div className="mini-name">{artist.name}</div>
                          <div className="mini-metric">{parseInt(artist.playcount, 10).toLocaleString()} plays</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="insight-card">
                    <h3 className="insight-title">Top Albums (Top 5)</h3>
                    <div className="mini-list">
                      {miniTop.albums.map((album, index) => (
                        <div key={`${album.name}-${album.artist.name}`} className="mini-item">
                          <div className="mini-rank">#{index + 1}</div>
                          <div className="mini-name">{album.name}</div>
                          <div className="mini-metric">{parseInt(album.playcount, 10).toLocaleString()} plays</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="insight-card">
                    <h3 className="insight-title">Top Tracks (Top 5)</h3>
                    <div className="mini-list">
                      {miniTop.tracks.map((track, index) => (
                        <div key={`${track.name}-${track.artist.name}`} className="mini-item">
                          <div className="mini-rank">#{index + 1}</div>
                          <div className="mini-name">{track.name}</div>
                          <div className="mini-metric">{parseInt(track.playcount, 10).toLocaleString()} plays</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'recent' && (
              <section className="content-section active">
                <div className="section-header">
                  <h2 className="section-title">Recent Listening History</h2>
                </div>
                <div className="recent-tracks">
                  {recentTracks.map((track) => {
                    const isPlaying = track['@attr'] && track['@attr'].nowplaying
                    const date = track.date ? new Date(track.date.uts * 1000) : null
                    const timestamp = date ? timeAgo(date) : ''
                    return (
                      <div key={`${track.name}-${track.artist['#text']}-${track.date?.uts || Math.random()}`} className={`recent-track ${isPlaying ? 'now-playing' : ''}`}>
                        <img className="item-image" src={getItemImage(track)} alt={track.name} onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE }} />
                        <div className="item-info">
                          <div className="item-name">{track.name}</div>
                          <div className="item-details">{track.artist['#text']} • {track.album['#text'] || 'Unknown Album'}</div>
                        </div>
                        {isPlaying ? (
                          <div className="now-playing-indicator">
                            <div className="now-playing-icon">
                              <span className="bar" />
                              <span className="bar" />
                              <span className="bar" />
                            </div>
                            Now Playing
                          </div>
                        ) : (
                          <div className="track-timestamp">{timestamp}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {activeTab === 'artists' && (
              <section className="content-section active">
                <div className="section-header">
                  <h2 className="section-title">Top Artists</h2>
                  <div className="section-controls">
                    {['overall', '7day', '1month', '3month', '6month', '12month'].map((period) => (
                      <button
                        key={period}
                        className={topPeriod.artists === period ? 'period-btn active' : 'period-btn'}
                        type="button"
                        onClick={() => updateTopPeriod('artists', period)}
                      >
                        {periodLabel(period)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="items-grid">
                  {topArtists.map((artist, index) => (
                    <div key={artist.name} className="item-card">
                      <div className="item-rank">#{index + 1}</div>
                      <img className="item-image" src={getItemImage(artist)} alt={artist.name} onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE }} />
                      <div className="item-info">
                        <div className="item-name">{artist.name}</div>
                        <div className="item-details">{parseInt(artist.playcount, 10).toLocaleString()} scrobbles</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'albums' && (
              <section className="content-section active">
                <div className="section-header">
                  <h2 className="section-title">Top Albums</h2>
                  <div className="section-controls">
                    {['overall', '7day', '1month', '3month', '6month', '12month'].map((period) => (
                      <button
                        key={period}
                        className={topPeriod.albums === period ? 'period-btn active' : 'period-btn'}
                        type="button"
                        onClick={() => updateTopPeriod('albums', period)}
                      >
                        {periodLabel(period)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="items-grid">
                  {topAlbums.map((album, index) => (
                    <div key={`${album.name}-${album.artist.name}`} className="item-card">
                      <div className="item-rank">#{index + 1}</div>
                      <img className="item-image" src={getItemImage(album)} alt={album.name} onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE }} />
                      <div className="item-info">
                        <div className="item-name">{album.name}</div>
                        <div className="item-details">{album.artist.name}</div>
                        <div className="item-plays">{parseInt(album.playcount, 10).toLocaleString()} plays</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'tracks' && (
              <section className="content-section active">
                <div className="section-header">
                  <h2 className="section-title">Top Tracks</h2>
                  <div className="section-controls">
                    {['overall', '7day', '1month', '3month', '6month', '12month'].map((period) => (
                      <button
                        key={period}
                        className={topPeriod.tracks === period ? 'period-btn active' : 'period-btn'}
                        type="button"
                        onClick={() => updateTopPeriod('tracks', period)}
                      >
                        {periodLabel(period)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="items-grid">
                  {topTracks.map((track, index) => (
                    <div key={`${track.name}-${track.artist.name}`} className="item-card">
                      <div className="item-rank">#{index + 1}</div>
                      <img className="item-image" src={getItemImage(track)} alt={track.name} onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE }} />
                      <div className="item-info">
                        <div className="item-name">{track.name}</div>
                        <div className="item-details">{track.artist.name}</div>
                        <div className="item-plays">{parseInt(track.playcount, 10).toLocaleString()} plays</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}


            {activeTab === 'friends' && (
              <section className="content-section active">
                <div className="section-header">
                  <h2 className="section-title">Friends</h2>
                </div>
                <div className="items-grid">
                  {friends.map((friend) => (
                    <div key={friend.name} className="item-card" onClick={() => window.open(friend.url, '_blank')}>
                      <img className="item-image" style={{ borderRadius: '50%' }} src={getItemImage(friend)} alt={friend.name} onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE }} />
                      <div className="item-info">
                        <div className="item-name">{friend.name}</div>
                        <div className="item-details">{friend.realname || ''}</div>
                        <div className="item-plays">{parseInt(friend.playcount || 0, 10).toLocaleString()} scrobbles</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'obsessions' && (
              <section className="content-section active">
                <div className="section-header">
                  <h2 className="section-title">Obsessions ({periodLabel(obsessionsPeriod)})</h2>
                  <div className="section-controls">
                    <label htmlFor="obsessionsPeriod">Period</label>
                    <select id="obsessionsPeriod" value={obsessionsPeriod} onChange={(event) => setObsessionsPeriod(event.target.value)}>
                      <option value="7day">7 Days</option>
                      <option value="1month">1 Month</option>
                      <option value="3month">3 Months</option>
                      <option value="6month">6 Months</option>
                      <option value="12month">1 Year</option>
                      <option value="overall">Overall</option>
                    </select>
                    <label htmlFor="obsessionsLimit">Items</label>
                    <select id="obsessionsLimit" value={obsessionsLimit} onChange={(event) => setObsessionsLimit(parseInt(event.target.value, 10))}>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                    </select>
                    <button onClick={updateObsessions}>Apply</button>
                  </div>
                </div>
                <div className="dense-list">
                  {obsessions.map((track, index) => (
                    <div key={`${track.name}-${track.artist.name}`} className="dense-card">
                      <div className="item-rank">#{index + 1}</div>
                      <img className="item-image" src={getItemImage(track)} alt={track.name} onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE }} />
                      <div className="item-info">
                        <div className="item-name">{track.name}</div>
                        <div className="item-details">{track.artist.name}</div>
                        <div className="dense-meta">{parseInt(track.playcount, 10).toLocaleString()} plays ({periodLabel(obsessionsPeriod)})</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'collage' && (
              <section className="content-section active">
                <div className="section-header">
                  <h2 className="section-title">Album Collage Generator</h2>
                </div>

                <div className="collage-controls">
                  <div className="collage-controls-inner">
                    <label>Grid Size:</label>
                    <select
                      value={collageGrid.size}
                      onChange={(event) => {
                        setCollageGrid((prev) => ({ ...prev, size: parseInt(event.target.value, 10), items: [] }))
                        setCollageReady(false)
                      }}
                    >
                      <option value={3}>3x3 (9 albums)</option>
                      <option value={4}>4x4 (16 albums)</option>
                      <option value={5}>5x5 (25 albums)</option>
                    </select>

                    <label>Time Period:</label>
                    <select
                      value={collageGrid.period}
                      onChange={(event) => {
                        setCollageGrid((prev) => ({ ...prev, period: event.target.value, items: [] }))
                        setCollageReady(false)
                      }}
                    >
                      <option value="overall">Overall</option>
                      <option value="7day">Last 7 Days</option>
                      <option value="1month">Last Month</option>
                      <option value="3month">Last 3 Months</option>
                      <option value="6month">Last 6 Months</option>
                      <option value="12month">Last Year</option>
                    </select>

                    <button className="btn-primary" type="button" onClick={generateCollage}>Generate</button>
                  </div>
                </div>

                {collageReady && collageGrid.items.length > 0 && (
                  <div className="collage-container">
                    <div className={`collage-grid size-${collageGrid.size}x${collageGrid.size}`}>
                      {collageGrid.items.map((album) => (
                      <div
                        key={`${album.name}-${album.artist?.name || album.mbid || 'item'}`}
                        className="collage-item"
                        title={`${album.name} - ${album.artist?.name || ''}`}
                      >
                        <img src={getItemImage(album)} alt={album.name} onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE }} />
                        <div className="collage-caption">{album.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                <div className="collage-actions">
                  {collageGrid.items.length > 0 && (
                    <button className="btn-primary" type="button" onClick={downloadCollage}>Download Image</button>
                  )}
                </div>
              </section>
            )}
              </div>
            )}

            {loading && (
              <div className="loading">
                <div className="spinner" />
                <p className="loading-text">Loading your music statistics...</p>
              </div>
            )}

            {error && (
              <div className="error">
                <h3>Error</h3>
                <p>{error}</p>
              </div>
            )}
          </>
        )}
      </div>

      {showAbout && (
        <div className="about-overlay" onClick={(event) => { if (event.target.classList.contains('about-overlay')) setShowAbout(false) }}>
          <div className="about-modal">
            <button className="about-close" onClick={() => setShowAbout(false)}>Close</button>
            <h2>About This Project</h2>
            <div className="about-hero">
              <div>
                <p><strong>Lade.Fm</strong> is a collaborative Last.fm insights project built by <strong>lastanswtcfswg</strong> and <strong>deussa</strong>. The work is split roughly 60% / 40% across research, implementation, and polish.</p>
                <p><strong>lastanswtcfswg</strong> is the main developer, leading architecture, data pipelines, and UI direction, while <strong>deussa</strong> contributes key features, QA, and improvements.</p>
                <p>Developer personal page: <a href="https://www.lastanswtcf.lol/" target="_blank" rel="noreferrer">https://www.lastanswtcf.lol/</a></p>
              </div>
              <div className="about-panel">
                <h4>Team Activity</h4>
                <div className="about-list">
                  <div className="about-list-item">Main Developer: <strong>lastanswtcfswg</strong></div>
                  <div className="about-list-item">Contributor: <strong>deussa</strong></div>
                </div>
                <div className="about-split">
                  <div className="about-split-row">
                    <div className="about-split-label">lastanswtcfswg</div>
                    <div className="about-split-bar">
                      <div className="about-split-fill" style={{ width: '60%' }} />
                    </div>
                    <div className="about-split-value">60%</div>
                  </div>
                  <div className="about-split-row">
                    <div className="about-split-label">deussa</div>
                    <div className="about-split-bar">
                      <div className="about-split-fill alt" style={{ width: '40%' }} />
                    </div>
                    <div className="about-split-value">40%</div>
                  </div>
                </div>
                <div className="about-note">Percentages reflect overall contribution and are not a competition.</div>
              </div>
              <div className="about-panel">
                <h4>What It Does</h4>
                <div className="about-list">
                  <div className="about-list-item">Real-time charts for daily and hourly listening</div>
                  <div className="about-list-item">Top artists/albums/tracks with period filters</div>
                  <div className="about-list-item">Genre/tag insights and diversity scoring</div>
                  <div className="about-list-item">Collage generator for sharing your top albums</div>
                </div>
              </div>
              <div className="about-panel">
                <h4>Developer Listening</h4>
                {devListening.status === 'playing' ? (
                  <div className="about-list">
                    <div className="about-list-item"><strong>Now Playing:</strong> {devListening.track.name}</div>
                    <div className="about-list-item">{devListening.track.artist} • {devListening.track.album}</div>
                  </div>
                ) : (
                  <div className="about-list">
                    <div className="about-list-item"><strong>Not listening right now.</strong></div>
                    <div className="about-list-item">Check the profile for updates.</div>
                  </div>
                )}
                <div className="about-list" style={{ marginTop: 8 }}>
                  <div className="about-list-item">
                    <a href="https://www.last.fm/user/lendeerts" target="_blank" rel="noreferrer">View Last.fm Profile</a>
                  </div>
                </div>
              </div>
            </div>
            <div className="about-meta">
              <div className="about-chip">Started 2024</div>
              <div className="about-chip">Paused</div>
              <div className="about-chip">Revived 2026</div>
              <div className="about-chip">Now Public</div>
            </div>
            <p>Originally started in 2024, the project was later abandoned and recently revived with a cleaner UI, stronger analytics, and a more professional presentation.</p>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-card">
            <div className="onboarding-title">Preparing Your Music Insights</div>
            <div className="onboarding-subtitle">We are syncing your Last.fm data and building a full dashboard.</div>
            <div className="onboarding-message">{onboardingMessage}</div>
            <div className="onboarding-progress"><div className="onboarding-bar" /></div>
          </div>
        </div>
      )}

      {showLogout && (
        <div className="confirm-overlay" onClick={(event) => { if (event.target.classList.contains('confirm-overlay')) setShowLogout(false) }}>
          <div className="confirm-card">
            <div className="confirm-title">Sign out of this session?</div>
            <div className="confirm-text">Your saved username will be removed from this device. You can sign in again anytime.</div>
            <div className="confirm-actions">
              <button className="btn-outline" onClick={() => setShowLogout(false)}>No, stay</button>
              <button className="btn-danger" onClick={confirmLogout}>Yes, sign out</button>
            </div>
          </div>
        </div>
      )}

      <svg style={{ display: 'none' }}>
        <symbol id="icon-user" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></symbol>
        <symbol id="icon-music" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></symbol>
        <symbol id="icon-album" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></symbol>
        <symbol id="icon-heart" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></symbol>
        <symbol id="icon-time" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></symbol>
        <symbol id="icon-chart" viewBox="0 0 24 24"><path d="M3 3h2v18H3V3zm16 10h2v8h-2v-8zm-6-6h2v14h-2V7zm-6 4h2v10H7V11z"/></symbol>
        <symbol id="icon-fire" viewBox="0 0 24 24"><path d="M13.5 0s.74 2.65-1.42 4.92C10.18 7.02 12 10 12 10s-2.4-1.64-2.4-4.2C9.6 3.7 11.4 1.53 13.5 0zM5 14c0-2.76 2.24-5 5-5 1.4 0 2.67.58 3.58 1.51C14.5 8.39 16.4 7 18.5 7 21.54 7 24 9.46 24 12.5S21.54 18 18.5 18H10c-2.76 0-5-2.24-5-5z"/></symbol>
      </svg>
    </div>
  )
}
