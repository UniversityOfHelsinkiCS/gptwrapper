import React, { useState } from 'react'
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
} from '@mui/material'
import useStatistics from '../../hooks/useStatistics'
import { Statistic } from '../../types'
import programme from '../../locales/programme.json'
import faculties from '../../locales/faculties.json'

const Statistics = () => {
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(4)
  const [selectedFaculty, setFaculties] = useState('H00')
  const { statistics, isLoading } = useStatistics()
  const { t, i18n } = useTranslation()
  const { language } = i18n

  if (isLoading) return null

  const namesOf = (codes: string[]) => {
    if (!codes || codes.length === 0) return ''
    const code = codes[0]
    if (!programme[code]) return code
    return codes
      .map((c) => (programme[c] ? programme[c][language] : c))
      .join(', ')
  }

  const selectedTerms = Array.from(
    { length: to - from + 1 },
    (_, i) => i + from
  )

  const byUsage = (a, b) => b.usedTokens - a.usedTokens

  const termWithin = (stat: Statistic) => {
    const terms = stat.terms.map((tr) => tr.id)
    return selectedTerms.some((term) => terms.includes(term))
  }

  const belongsToFaculty = (stat: Statistic) => {
    if (selectedFaculty === 'H00') return true
    return stat.programmes.some((p) =>
      p.startsWith(selectedFaculty.substring(1))
    )
  }

  const statsToShow = statistics.data
    .filter(termWithin)
    .filter(belongsToFaculty)
    .sort(byUsage)

  return (
    <div>
      <Box my={2}>
        <div>
          <span style={{ marginRight: 10 }}>{t('admin:timePeriodStart')}</span>

          <Select
            value={from}
            onChange={(e) => setFrom(parseInt(e.target.value as string, 10))}
          >
            {statistics.terms.map((term) => (
              <MenuItem key={term.id} value={term.id}>
                {term.label[language]}
              </MenuItem>
            ))}
          </Select>

          <span style={{ margin: 10 }}>{t('admin:timePeriodStop')}</span>
          <Select
            value={to}
            onChange={(e) => setTo(parseInt(e.target.value as string, 10))}
          >
            {statistics.terms
              .filter((trm) => trm.id >= from)
              .map((term) => (
                <MenuItem key={term.id} value={term.id}>
                  {term.label[language]}
                </MenuItem>
              ))}
          </Select>

          <span style={{ margin: 10 }}>{t('admin:showing')}</span>

          <Select
            value={selectedFaculty}
            onChange={(e) => setFaculties(e.target.value as string)}
          >
            {faculties.map((f) => (
              <MenuItem key={f.code} value={f.code}>
                {f.name[language]}
              </MenuItem>
            ))}
          </Select>
        </div>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="left">
                  <Typography variant="h6">
                    <b>{t('admin:courseCodes')}</b>
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">
                    <b>{t('admin:courseNameInfo')}</b>
                  </Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">
                    <b>{t('admin:courseTerms')}</b>
                  </Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">
                    <b>{t('admin:programCodes')}</b>
                  </Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">
                    <b>{t('admin:studentCount')}</b>
                  </Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">
                    <b>{t('admin:usageCount')}</b>
                  </Typography>
                </TableCell>
                <TableCell align="left">
                  <Typography variant="h6">
                    <b>{t('admin:promptCount')}</b>
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statsToShow.map((chat) => (
                <TableRow key={chat.id}>
                  <TableCell align="left">
                    <Typography>{chat.codes}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography>{chat.name[language]}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography>
                      {chat.terms.map((trm) => trm.label[language]).join(', ')}
                    </Typography>
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
    </div>
  )
}

export default Statistics
