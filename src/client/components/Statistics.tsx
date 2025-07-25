import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Table,
  Select,
  MenuItem,
  Tooltip,
  Link,
  Container,
  IconButton,
  Stack,
} from '@mui/material'
import { redirect, Link as RouterLink } from 'react-router-dom'
import useStatistics from '../hooks/useStatistics'
import { Statistic } from '../types'
import programme from '../locales/programme.json'
import faculties from '../locales/faculties.json'
import useCurrentUser from '../hooks/useCurrentUser'
import * as xlsx from 'xlsx'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'

const Statistics = () => {
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(4)
  const [selectedFaculty, setFaculties] = useState('H00')
  const { data: statistics, isSuccess } = useStatistics()
  const { t, i18n } = useTranslation()
  const { language } = i18n
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const dataDownloadLink = useRef<HTMLAnchorElement | null>(null)

  if (!isSuccess || isUserLoading) return null

  const namesOf = (codes: string[]) => {
    if (!codes || codes.length === 0) return ''
    const code = codes[0]
    if (!programme[code]) return code
    return codes.map((c) => (programme[c] ? programme[c][language] : c)).join(', ')
  }

  const selectedTerms = Array.from({ length: to - from + 1 }, (_, i) => i + from)

  const byUsage = (a, b) => b.usedTokens - a.usedTokens

  const termWithin = (stat: Statistic) => {
    const terms = stat.terms.map((tr) => tr.id)
    return selectedTerms.some((term) => terms.includes(term))
  }

  const belongsToFaculty = (stat: Statistic) => {
    if (selectedFaculty === 'H00') return true
    return stat.programmes.some((p) => p.startsWith(selectedFaculty.substring(1)))
  }

  const statsToShow = statistics.data.filter(termWithin).filter(belongsToFaculty).sort(byUsage)

  const exportToExcel = (jsonData: any) => {
    const book = xlsx.utils.book_new()
    const sheet = xlsx.utils.json_to_sheet(jsonData)
    xlsx.utils.book_append_sheet(book, sheet, 'Tilastot')
    xlsx.writeFile(book, 'statistics.xlsx')
  }

  const exportToCSV = (jsonData: any) => {
    //const book = xlsx.utils.book_new()
    const sheet = xlsx.utils.json_to_sheet(jsonData)
    const csv = xlsx.utils.sheet_to_csv(sheet, {})

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    if (dataDownloadLink?.current) {
      dataDownloadLink.current.href = url
      dataDownloadLink.current.download = 'data.csv'
      dataDownloadLink.current.click()
    }
  }

  const handleXLSX = () => {
    const mangledStatistics = statsToShow.map((chat) => {
      return {
        Codes: chat.codes.join(', '),
        Course: chat.name[language],
        Terms: chat.terms.map((trm) => trm.label[language]).join(', '),
        Programmes: namesOf(chat.programmes),
        Students: chat.students,
        UsedTokens: chat.usedTokens,
        PromptCount: chat.promptCount,
      }
    })
    exportToCSV(mangledStatistics)
  }

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <Box my={2}>
        <Stack direction="row">
          <div>
            <span style={{ marginRight: 10 }}>{t('stats:timePeriodStart')}</span>

            <Select value={from} onChange={(e) => setFrom(parseInt(e.target.value as string, 10))}>
              {statistics.terms.map((term) => (
                <MenuItem key={term.id} value={term.id}>
                  {term.label[language]}
                </MenuItem>
              ))}
            </Select>

            <span style={{ margin: 10 }}>{t('stats:timePeriodStop')}</span>
            <Select value={to} onChange={(e) => setTo(parseInt(e.target.value as string, 10))}>
              {statistics.terms
                .filter((trm) => trm.id >= from)
                .map((term) => (
                  <MenuItem key={term.id} value={term.id}>
                    {term.label[language]}
                  </MenuItem>
                ))}
            </Select>

            <span style={{ margin: 10 }}>{t('stats:showing')}</span>

            <Select value={selectedFaculty} onChange={(e) => setFaculties(e.target.value as string)}>
              {faculties.map((f) => (
                <MenuItem key={f.code} value={f.code}>
                  {f.name[language]}
                </MenuItem>
              ))}
            </Select>
          </div>
          <a ref={dataDownloadLink} style={{ display: 'none' }} />
          <IconButton
            onClick={() => {
              handleXLSX()
            }}
            sx={{ marginLeft: 'auto' }}
          >
            <CloudDownloadIcon fontSize="large" />
          </IconButton>
        </Stack>

        <TableContainer component={Paper}>
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
                    <b>{t('stats:usageCount')}</b>
                  </Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">
                    <b>{t('stats:promptCount')}</b>
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statsToShow.map((chat) => (
                <TableRow key={chat.id}>
                  <TableCell align="left">
                    <Typography>{chat.codes.join(', ')}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    {user?.isAdmin ? (
                      <Link to={`/courses/${chat.id}`} component={RouterLink}>
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
                    <Typography>{chat.usedTokens}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography>{chat.promptCount}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  )
}

export default Statistics
