import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import {
  Box,
  Checkbox,
  Container,
  FormControlLabel,
  FormGroup,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import type { Statistic } from '@shared/types'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useMatch, useNavigate } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import * as xlsx from 'xlsx'
import useCurrentUser from '../hooks/useCurrentUser'
import useStatistics from '../hooks/useStatistics'
import faculties from '../locales/faculties.json'
import programme from '../locales/programme.json'
import { BlueButton } from './ChatV2/general/Buttons'

/**
 * React-router compatible lazy loaded component for Statistics page
 */

export function Component() {
  const trendSeriesKeys = ['courses', 'students', 'percentage', 'prompts', 'rags'] as const
  type TrendSeriesKey = (typeof trendSeriesKeys)[number]

  const [from, setFrom] = useState<number | null>(null)
  const [to, setTo] = useState<number | null>(null)
  const [selectedFaculty, setFaculties] = useState('H00')
  const [trendSelectionMode, setTrendSelectionMode] = useState<'single' | 'multi'>('multi')
  const [trendSeries, setTrendSeries] = useState({
    courses: true,
    students: true,
    percentage: true,
    prompts: true,
    rags: true,
  })
  const [sortBy, setSortBy] = useState<'usedTokens' | 'usagePercentage' | 'promptCount' | 'ragIndicesCount'>('usedTokens')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const { data: statistics, isSuccess } = useStatistics()
  const { t, i18n } = useTranslation()
  const { language } = i18n
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const navigate = useNavigate()
  const isStatisticsRoot = Boolean(useMatch('/statistics'))
  const isCoursesRoute = Boolean(useMatch('/statistics/courses'))
  const isTrendsRoute = Boolean(useMatch('/statistics/trends'))
  const activeTab: 'courses' | 'trends' = isTrendsRoute ? 'trends' : 'courses'
  const dataDownloadLink = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (isStatisticsRoot && !isCoursesRoute && !isTrendsRoute) {
      navigate('/statistics/courses', { replace: true })
    }
  }, [isStatisticsRoot, isCoursesRoute, isTrendsRoute, navigate])

  useEffect(() => {
    if (isSuccess) {
      const statisticsSortedById = [...statistics.terms].sort((a, b) => a.id - b.id)
      if (statisticsSortedById.length > 0) {
        const fromId = statisticsSortedById[0]
        const toId = statisticsSortedById[statisticsSortedById.length - 1]
        setFrom(fromId.id)
        setTo(toId.id)
      }
      console.log(statisticsSortedById)
    }
  }, [isSuccess])

  useEffect(() => {
    if (trendSelectionMode !== 'single') return

    setTrendSeries((prev) => {
      const firstEnabled = trendSeriesKeys.find((k) => prev[k]) ?? 'courses'
      return trendSeriesKeys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: key === firstEnabled,
        }),
        {} as Record<TrendSeriesKey, boolean>,
      )
    })
  }, [trendSelectionMode])

  if (!isSuccess || isUserLoading) return null

  const namesOf = (codes: string[]) => {
    if (!codes || codes.length === 0) return ''
    const code = codes[0]
    if (!programme[code]) return code
    return codes.map((c) => (programme[c] ? programme[c][language] : c)).join(', ')
  }

  const selectTerms = () => {
    if (!to || !from) {
      return []
    }
    return Array.from({ length: to - from + 1 }, (_, i) => i + from)
  }
  const selectedTerms = selectTerms()

  const usagePercentageNumber = (students: number, enrolled: number) => {
    if (!enrolled) return 0
    return (students / enrolled) * 100
  }

  const sortedStats = (stats: Statistic[]) => {
    const sorted = [...stats]

    sorted.sort((a, b) => {
      const aValue =
        sortBy === 'usedTokens'
          ? a.usedTokens
          : sortBy === 'usagePercentage'
            ? usagePercentageNumber(a.students, a.enrollmentCount)
            : sortBy === 'promptCount'
              ? a.promptCount
              : a.ragIndicesCount
      const bValue =
        sortBy === 'usedTokens'
          ? b.usedTokens
          : sortBy === 'usagePercentage'
            ? usagePercentageNumber(b.students, b.enrollmentCount)
            : sortBy === 'promptCount'
              ? b.promptCount
              : b.ragIndicesCount

      if (aValue === bValue) return 0
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })

    return sorted
  }

  const requestSort = (column: 'usedTokens' | 'usagePercentage' | 'promptCount' | 'ragIndicesCount') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortBy(column)
    setSortDirection('desc')
  }

  const usagePercentage = (students: number, enrolled: number) => {
    return `${usagePercentageNumber(students, enrolled).toFixed(1)}%`
  }

  const toggleTrendSeries = (key: TrendSeriesKey) => {
    setTrendSeries((prev) => {
      if (trendSelectionMode === 'single') {
        return trendSeriesKeys.reduce(
          (acc, currentKey) => ({
            ...acc,
            [currentKey]: currentKey === key,
          }),
          {} as Record<TrendSeriesKey, boolean>,
        )
      }

      const currentlyEnabled = trendSeriesKeys.filter((k) => prev[k]).length
      if (prev[key] && currentlyEnabled === 1) {
        return prev
      }

      return {
        ...prev,
        [key]: !prev[key],
      }
    })
  }

  const termWithin = (stat: Statistic) => {
    const terms = stat.terms.map((tr) => tr.id)
    return selectedTerms.some((term) => terms.includes(term))
  }

  const belongsToFaculty = (stat: Statistic) => {
    if (selectedFaculty === 'H00') return true
    return stat.programmes.some((p) => p.startsWith(selectedFaculty.substring(1)))
  }

  const filteredByFaculty = statistics.data.filter(belongsToFaculty)
  const statsToShow = sortedStats(filteredByFaculty.filter(termWithin))
  const allTermIds = [...statistics.terms].sort((a, b) => a.id - b.id).map((term) => term.id)
  const trendRows = allTermIds.map((termId) => {
    const termStats = filteredByFaculty.filter((stat) => stat.terms.some((term) => term.id === termId))
    const courses = termStats.length
    const students = termStats.reduce((sum, stat) => sum + stat.students, 0)
    const enrolled = termStats.reduce((sum, stat) => sum + stat.enrollmentCount, 0)
    const prompts = termStats.reduce((sum, stat) => sum + stat.promptCount, 0)
    const rags = termStats.reduce((sum, stat) => sum + stat.ragIndicesCount, 0)
    const termLabel = statistics.terms.find((term) => term.id === termId)?.label[language] ?? String(termId)

    return {
      termId,
      termLabel,
      courses,
      students,
      percentage: usagePercentageNumber(students, enrolled),
      prompts,
      rags,
    }
  })
  const trendRowsNewestFirst = [...trendRows].sort((a, b) => b.termId - a.termId)

  const exportToCSV = (jsonData: any) => {
    //const book = xlsx.utils.book_new()
    const sheet = xlsx.utils.json_to_sheet(jsonData)
    const csv = xlsx.utils.sheet_to_csv(sheet, {})

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    if (dataDownloadLink?.current) {
      dataDownloadLink.current.href = url
      const fromTerm = statistics.terms.find((term) => term.id === from)
      const fromTermName = fromTerm?.label[language].replace(/ /g, '_')

      const toTerm = statistics.terms.find((term) => term.id === to)
      const toTermName = toTerm?.label[language].replace(/ /g, '_')

      const filename = 'currechat_from_' + fromTermName + '_to_' + toTermName + '_' + selectedFaculty
      dataDownloadLink.current.download = filename

      dataDownloadLink.current.click()
    }
  }

  const handleXLSX = () => {
    if (activeTab === 'trends') {
      const trendData = trendRows.map((row) => ({
        Term: row.termLabel,
        Courses: row.courses,
        Students: row.students,
        Percentage: `${row.percentage.toFixed(1)}%`,
        PromptCount: row.prompts,
        RagCount: row.rags,
      }))
      exportToCSV(trendData)
      return
    }

    const mangledStatistics = statsToShow.map((chat) => {
      return {
        Codes: chat.codes.join(', '),
        Course: chat.name[language],
        Terms: chat.terms.map((trm) => trm.label[language]).join(', '),
        Programmes: namesOf(chat.programmes),
        Students: chat.students,
        Enrolled: chat.enrollmentCount,
        StudentUsagePercentage: usagePercentage(chat.students, chat.enrollmentCount),
        UsedTokens: chat.usedTokens,
        PromptCount: chat.promptCount,
        RagIndicesCount: chat.ragIndicesCount,
      }
    })
    exportToCSV(mangledStatistics)
  }

  const handleToChange = (e) => {
    // in case of: from: 2026 and to 2024, lets change to into from
    const newVal = parseInt(e.target.value as string, 10)
    if (from && from > newVal) {
      setTo(from)
    } else {
      setTo(newVal)
    }
  }
  const handleFromChange = (e) => {
    const newVal = parseInt(e.target.value as string, 10) // in case of: from: 2026 and to 2024, lets change to into from
    if (to && newVal > to) {
      setTo(newVal)
    }
    setFrom(newVal)
  }

  const readTermFilter = (term) => {
    if (term) {
      return term
    } else {
      return 0
    }
  }
  return (
    <Container sx={{ mt: '6rem', mb: '10rem', position: 'relative' }} maxWidth="xl">
      <Box sx={{ position: 'absolute', top: '-5rem', left: 10 }}>
        <BlueButton onClick={() => navigate('/general')}>Takaisin chattiin</BlueButton>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => navigate(`/statistics/${value}`)}
          sx={{
            px: 1,
            py: 1,
            mb: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: 'background.paper',
            '& .MuiTabs-indicator': {
              display: 'none',
            },
          }}
        >
          <Tab
            value="courses"
            label={t('stats:courseStatsTab')}
            sx={{
              borderRadius: 1.5,
              minHeight: 40,
              '&.Mui-selected': {
                backgroundColor: 'action.selected',
                fontWeight: 700,
              },
            }}
          />
          <Tab
            value="trends"
            label={t('stats:trendsTab')}
            sx={{
              borderRadius: 1.5,
              minHeight: 40,
              '&.Mui-selected': {
                backgroundColor: 'action.selected',
                fontWeight: 700,
              },
            }}
          />
        </Tabs>

        <Stack direction="row">
          <div>
            {activeTab === 'courses' && (
              <>
                <span style={{ marginRight: 10 }}>{t('stats:timePeriodStart')}</span>

                <Select value={from} onChange={handleFromChange}>
                  {statistics.terms.map((term) => (
                    <MenuItem key={term.id} value={term.id}>
                      {term.label[language]}
                    </MenuItem>
                  ))}
                </Select>

                <span style={{ margin: 10 }}>{t('stats:timePeriodStop')}</span>
                <Select value={to} onChange={handleToChange}>
                  {statistics.terms
                    .filter((trm) => trm.id >= readTermFilter(from))
                    .map((term) => (
                      <MenuItem key={term.id} value={term.id}>
                        {term.label[language]}
                      </MenuItem>
                    ))}
                </Select>
              </>
            )}

            <span style={{ margin: 10 }}>{t('stats:showing')}</span>

            <Select value={selectedFaculty} onChange={(e) => setFaculties(e.target.value as string)}>
              {faculties.map((f) => (
                <MenuItem key={f.code} value={f.code}>
                  {f.name[language]}
                </MenuItem>
              ))}
            </Select>
          </div>
          <Stack direction="row" spacing={1} sx={{ marginLeft: 'auto' }}>
            <a ref={dataDownloadLink} style={{ display: 'none' }} />
            <IconButton
              onClick={() => {
                handleXLSX()
              }}
            >
              <CloudDownloadIcon fontSize="large" />
            </IconButton>
          </Stack>
        </Stack>

        <TableContainer component={Paper} sx={{ mt: 2 }}>
          {activeTab === 'courses' ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="left">
                    <Typography variant="h6">
                      <b>{t('stats:courseCodes')}</b>
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6">
                      <b>{t('stats:courseNameInfo')}</b>
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">
                      <b>{t('stats:courseTerms')}</b>
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">
                      <b>{t('stats:programCodes')}</b>
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">
                      <b>{t('stats:studentCount')}</b>
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">
                      <b>{t('stats:enrollmentCount')}</b>
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">
                      <TableSortLabel
                        active={sortBy === 'usagePercentage'}
                        direction={sortBy === 'usagePercentage' ? sortDirection : 'desc'}
                        onClick={() => requestSort('usagePercentage')}
                      >
                        <b>{t('stats:studentEnrollmentPercentage')}</b>
                      </TableSortLabel>
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">
                      <TableSortLabel
                        active={sortBy === 'usedTokens'}
                        direction={sortBy === 'usedTokens' ? sortDirection : 'desc'}
                        onClick={() => requestSort('usedTokens')}
                      >
                        <b>{t('stats:usageCount')}</b>
                      </TableSortLabel>
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">
                      <TableSortLabel
                        active={sortBy === 'promptCount'}
                        direction={sortBy === 'promptCount' ? sortDirection : 'desc'}
                        onClick={() => requestSort('promptCount')}
                      >
                        <b>{t('stats:promptCount')}</b>
                      </TableSortLabel>
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">
                      <TableSortLabel
                        active={sortBy === 'ragIndicesCount'}
                        direction={sortBy === 'ragIndicesCount' ? sortDirection : 'desc'}
                        onClick={() => requestSort('ragIndicesCount')}
                      >
                        <b>{t('stats:rags')}</b>
                      </TableSortLabel>
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <SumRow statsToShow={statsToShow} />

                {statsToShow.map((chat) => (
                  <TableRow key={chat.id}>
                    <TableCell align="left">
                      <Typography>{chat.codes.join(', ')}</Typography>
                    </TableCell>
                    <TableCell align="left">
                      {user?.isAdmin ? (
                        <Link to={`/${chat.id}/course`} component={RouterLink}>
                          <Typography>{chat.name[language]}</Typography>
                        </Link>
                      ) : (
                        <Typography>{chat.name[language]}</Typography>
                      )}
                    </TableCell>
                    <TableCell align="left">
                      <Typography>{chat.terms.map((trm) => trm.label[language]).join(', ')}</Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Tooltip title={namesOf(chat.programmes)}>
                        <Typography>{chat.programmes}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="left">
                      <Typography>{chat.students}</Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography>{chat.enrollmentCount}</Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography>{usagePercentage(chat.students, chat.enrollmentCount)}</Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography>{chat.usedTokens}</Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography>{chat.promptCount}</Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography>{chat.ragIndicesCount}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <>
              <Box sx={{ px: 2, pt: 2 }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} sx={{ mb: 1 }}>
                  <FormGroup row>
                    <FormControlLabel
                      control={<Checkbox checked={trendSeries.courses} onChange={() => toggleTrendSeries('courses')} />}
                      label={t('stats:trendCourses')}
                    />
                    <FormControlLabel
                      control={<Checkbox checked={trendSeries.students} onChange={() => toggleTrendSeries('students')} />}
                      label={t('stats:trendStudentsCheckbox')}
                    />
                    <FormControlLabel
                      control={<Checkbox checked={trendSeries.percentage} onChange={() => toggleTrendSeries('percentage')} />}
                      label={t('stats:trendPercentageCheckbox')}
                    />
                    <FormControlLabel
                      control={<Checkbox checked={trendSeries.prompts} onChange={() => toggleTrendSeries('prompts')} />}
                      label={t('stats:promptCount')}
                    />
                    <FormControlLabel control={<Checkbox checked={trendSeries.rags} onChange={() => toggleTrendSeries('rags')} />} label={t('stats:rags')} />
                  </FormGroup>

                  <Stack direction="row" spacing={2} alignItems="center" sx={{ ml: { lg: 2 } }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('stats:trendSelectionMode')}
                    </Typography>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={trendSelectionMode}
                      onChange={(_, value) => {
                        if (value) setTrendSelectionMode(value)
                      }}
                    >
                      <ToggleButton value="single">{t('stats:trendSelectionSingle')}</ToggleButton>
                      <ToggleButton value="multi">{t('stats:trendSelectionMulti')}</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                </Stack>

                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <LineChart data={trendRows} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="termLabel" />
                      <YAxis yAxisId="count" />
                      <YAxis yAxisId="percentage" orientation="right" tickFormatter={(value) => `${value}%`} />
                      <ChartTooltip
                        formatter={(value, _name, item) => {
                          if (item?.dataKey === 'percentage') return `${Number(value).toFixed(1)}%`
                          return value
                        }}
                      />
                      <Legend />
                      {trendSeries.courses && (
                        <Line yAxisId="count" type="monotone" dataKey="courses" name={t('stats:trendCourses')} stroke="#1565c0" strokeWidth={2} dot={false} />
                      )}
                      {trendSeries.students && (
                        <Line yAxisId="count" type="monotone" dataKey="students" name={t('stats:studentCount')} stroke="#2e7d32" strokeWidth={2} dot={false} />
                      )}
                      {trendSeries.percentage && (
                        <Line
                          yAxisId="percentage"
                          type="monotone"
                          dataKey="percentage"
                          name={t('stats:studentEnrollmentPercentage')}
                          stroke="#ef6c00"
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                      {trendSeries.prompts && (
                        <Line yAxisId="count" type="monotone" dataKey="prompts" name={t('stats:promptCount')} stroke="#6a1b9a" strokeWidth={2} dot={false} />
                      )}
                      {trendSeries.rags && (
                        <Line yAxisId="count" type="monotone" dataKey="rags" name={t('stats:rags')} stroke="#455a64" strokeWidth={2} dot={false} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="left">
                      <Typography variant="h6">
                        <b>{t('stats:trendTerm')}</b>
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography variant="h6">
                        <b>{t('stats:trendCourses')}</b>
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography variant="h6">
                        <b>{t('stats:studentCount')}</b>
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography variant="h6">
                        <Tooltip title={t('stats:studentEnrollmentPercentageTooltip')}>
                          <b>{t('stats:studentEnrollmentPercentage')}</b>
                        </Tooltip>
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography variant="h6">
                        <b>{t('stats:promptCount')}</b>
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography variant="h6">
                        <b>{t('stats:rags')}</b>
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trendRowsNewestFirst.map((row) => (
                    <TableRow key={row.termId}>
                      <TableCell align="left">
                        <Typography>{row.termLabel}</Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography>{row.courses}</Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography>{row.students}</Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography>{`${row.percentage.toFixed(1)}%`}</Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography>{row.prompts}</Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography>{row.rags}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </TableContainer>
      </Box>
    </Container>
  )
}

const SumRow = ({ statsToShow }) => {
  const { t } = useTranslation()
  const columnSum = (column: string) => {
    if (!statsToShow) {
      return 0
    }
    const columnValues = statsToShow.map((chat) => chat[column])
    if (columnValues.length > 0) {
      return columnValues.reduce((a, b) => a + b)
    } else {
      return 0
    }
  }

  const totalStudents = columnSum('students')
  const totalEnrolled = columnSum('enrollmentCount')
  const totalUsagePercentage = totalEnrolled ? `${((totalStudents / totalEnrolled) * 100).toFixed(1)}%` : '0%'

  const statsToShowLength = statsToShow ? statsToShow.length : 0
  const statsMessage = t('stats:sum')
  return (
    <TableRow>
      <TableCell align="left">
        <Typography variant="h6">{statsMessage}</Typography>
      </TableCell>
      <TableCell>
        <Typography variant="h6">{statsToShowLength + ' ' + t('stats:courses')}</Typography>
      </TableCell>
      <TableCell align="left"></TableCell>
      <TableCell align="left"></TableCell>
      <TableCell align="left">
        <Typography variant="h6">{totalStudents}</Typography>
      </TableCell>
      <TableCell align="left">
        <Typography variant="h6">{totalEnrolled}</Typography>
      </TableCell>
      <TableCell align="left">
        <Typography variant="h6">{totalUsagePercentage}</Typography>
      </TableCell>
      <TableCell align="left">
        <Typography variant="h6">{columnSum('usedTokens')}</Typography>
      </TableCell>
      <TableCell align="left">
        <Typography variant="h6">{columnSum('promptCount')}</Typography>
      </TableCell>
      <TableCell align="left">
        <Typography variant="h6">{columnSum('ragIndicesCount')}</Typography>
      </TableCell>
    </TableRow>
  )
}
